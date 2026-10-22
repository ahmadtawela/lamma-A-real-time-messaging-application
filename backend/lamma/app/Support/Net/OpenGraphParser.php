<?php

namespace App\Support\Net;

use DOMDocument;
use DOMXPath;

/** Extracts title / description / image / site name from an HTML document (Open Graph, Twitter cards, <title>, meta description). */
class OpenGraphParser
{
    /** @return array{title:?string,description:?string,image:?string,site_name:?string} */
    public static function parse(string $html, string $baseUrl): array
    {
        $out = ['title' => null, 'description' => null, 'image' => null, 'site_name' => null];
        if (trim($html) === '') {
            return $out;
        }

        $prev = libxml_use_internal_errors(true);
        $doc = new DOMDocument;
        // The xml prolog forces UTF-8 interpretation of the (already converted) markup.
        $doc->loadHTML('<?xml encoding="utf-8" ?>'.$html, LIBXML_NONET | LIBXML_NOERROR | LIBXML_NOWARNING);
        libxml_clear_errors();
        libxml_use_internal_errors($prev);
        $xp = new DOMXPath($doc);

        $meta = function (array $keys) use ($xp): ?string {
            foreach ($keys as $key) {
                foreach (['property', 'name'] as $attr) {
                    $n = $xp->query('//meta[translate(@'.$attr.", 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz')='".$key."']/@content");
                    if ($n && $n->length && trim($n->item(0)->nodeValue) !== '') {
                        return trim($n->item(0)->nodeValue);
                    }
                }
            }

            return null;
        };

        $title = $meta(['og:title', 'twitter:title']);
        if ($title === null) {
            $t = $xp->query('//title');
            $title = $t && $t->length ? trim($t->item(0)->textContent) : null;
        }
        $out['title'] = self::clean($title, 160);
        $out['description'] = self::clean($meta(['og:description', 'twitter:description', 'description']), 300);
        $out['site_name'] = self::clean($meta(['og:site_name']), 80);
        $out['image'] = self::absoluteImage($meta(['og:image', 'og:image:url', 'twitter:image']), $baseUrl);

        return $out;
    }

    private static function clean(?string $s, int $max): ?string
    {
        if ($s === null) {
            return null;
        }
        $s = trim(preg_replace('/\s+/u', ' ', html_entity_decode(strip_tags($s), ENT_QUOTES | ENT_HTML5, 'UTF-8')));

        return $s === '' ? null : mb_substr($s, 0, $max);
    }

    /** Only absolute http(s) images; relative ones are resolved against the page URL; data:/javascript: are dropped. */
    private static function absoluteImage(?string $src, string $baseUrl): ?string
    {
        if ($src === null || $src === '') {
            return null;
        }
        $src = trim($src);
        if (str_starts_with($src, '//')) {
            $src = (parse_url($baseUrl, PHP_URL_SCHEME) ?: 'https').':'.$src;
        } elseif (! preg_match('#^[a-z][a-z0-9+.-]*:#i', $src)) {
            $b = parse_url($baseUrl);
            $origin = ($b['scheme'] ?? 'https').'://'.($b['host'] ?? '').(isset($b['port']) ? ':'.$b['port'] : '');
            $src = str_starts_with($src, '/') ? $origin.$src : $origin.rtrim(dirname($b['path'] ?? '/'), '/').'/'.$src;
        }
        if (! preg_match('#^https?://#i', $src) || strlen($src) > 2048) {
            return null;
        }

        return $src;
    }
}
