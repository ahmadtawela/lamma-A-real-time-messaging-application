<?php

namespace App\Services;

use App\Support\Net\OpenGraphParser;
use App\Support\Net\UrlGuard;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use InvalidArgumentException;
use Throwable;

/**
 * Fetches a page ON THE SERVER and returns a safe preview. The browser never contacts third-party pages itself.
 * Defences: UrlGuard (SSRF), DNS pinning (CURLOPT_RESOLVE), manual redirects re-validated at every hop (max 3),
 * short timeouts, a 512 KB body cap, text/html only, cached for 24h (failures 10 min).
 */
class LinkPreviewService
{
    private const MAX_BYTES = 524288;
    private const MAX_REDIRECTS = 3;

    public function __construct(private UrlGuard $guard) {}

    /** @return array{url:string,domain:string,title:?string,description:?string,image:?string,site_name:?string}|null @throws InvalidArgumentException when the URL itself is not allowed */
    public function preview(string $url): ?array
    {
        $this->guard->check($url);                                    // reject bad input before touching the cache/network
        $key = 'link-preview.'.sha1($url);

        $cached = Cache::get($key, '__miss__');
        if ($cached !== '__miss__') {
            return $cached;
        }

        try {
            $result = $this->fetch($url);
        } catch (InvalidArgumentException $e) {
            throw $e;
        } catch (Throwable) {
            $result = null;
        }
        Cache::put($key, $result, $result ? now()->addDay() : now()->addMinutes(10));

        return $result;
    }

    private function fetch(string $url): ?array
    {
        for ($hop = 0; $hop <= self::MAX_REDIRECTS; $hop++) {
            $target = $this->guard->check($url);                      // re-validated on EVERY hop (redirect-to-internal attack)
            $options = ['allow_redirects' => false, 'timeout' => 5, 'connect_timeout' => 3, 'stream' => true, 'http_errors' => false];
            if (! $target['literal'] && defined('CURLOPT_RESOLVE')) {
                $options['curl'] = [CURLOPT_RESOLVE => ["{$target['host']}:{$target['port']}:{$target['ip']}"]];   // connect to the IP we validated
            }

            $response = Http::withOptions($options)
                ->withHeaders(['User-Agent' => 'LammaLinkPreview/1.0 (+'.config('app.url').')', 'Accept' => 'text/html,application/xhtml+xml'])
                ->get($url);

            if (in_array($response->status(), [301, 302, 303, 307, 308], true)) {
                $location = $response->header('Location');
                if (! $location) {
                    return null;
                }
                $url = $this->absolute($location, $url);
                continue;
            }
            if (! $response->successful()) {
                return null;
            }
            $type = strtolower($response->header('Content-Type'));
            if (! str_contains($type, 'text/html') && ! str_contains($type, 'application/xhtml')) {
                return null;
            }

            $html = $this->readLimited($response->toPsrResponse()->getBody());
            $html = $this->toUtf8($html, $type);
            $og = OpenGraphParser::parse($html, $url);
            if ($og['title'] === null && $og['description'] === null && $og['image'] === null) {
                return null;
            }

            return ['url' => $url, 'domain' => preg_replace('/^www\./', '', parse_url($url, PHP_URL_HOST) ?: ''), ...$og];
        }

        return null;                                                   // too many redirects
    }

    private function readLimited($stream): string
    {
        $buffer = '';
        while (! $stream->eof() && strlen($buffer) < self::MAX_BYTES) {
            $chunk = $stream->read(min(16384, self::MAX_BYTES - strlen($buffer)));
            if ($chunk === '') {
                break;
            }
            $buffer .= $chunk;
        }

        return $buffer;
    }

    private function toUtf8(string $html, string $contentType): string
    {
        $charset = null;
        if (preg_match('/charset=([\w-]+)/i', $contentType, $m) || preg_match('/<meta[^>]+charset=["\']?([\w-]+)/i', substr($html, 0, 4096), $m)) {
            $charset = strtolower($m[1]);
        }
        if ($charset && $charset !== 'utf-8' && $charset !== 'utf8') {
            try {
                return mb_convert_encoding($html, 'UTF-8', $charset);
            } catch (Throwable) {
                // fall through with the raw bytes
            }
        }

        return $html;
    }

    private function absolute(string $location, string $base): string
    {
        if (preg_match('#^https?://#i', $location)) {
            return $location;
        }
        $b = parse_url($base);
        $origin = $b['scheme'].'://'.$b['host'].(isset($b['port']) ? ':'.$b['port'] : '');

        return str_starts_with($location, '/') ? $origin.$location : $origin.rtrim(dirname($b['path'] ?? '/'), '/').'/'.$location;
    }
}
