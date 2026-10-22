<?php

namespace App\Support\Net;

use Closure;
use InvalidArgumentException;

/**
 * SSRF protection for every outgoing request made on behalf of a user (link previews).
 * Rejects: non-http(s), credentials in the URL, odd ports, localhost/internal names, and ANY host that resolves to a
 * private / loopback / link-local / reserved / metadata address. The validated IP is returned so the caller can PIN the
 * connection to it (no DNS rebinding between check and use).
 */
class UrlGuard
{
    /** @param Closure(string):string[]|null $resolver host => list of IPv4 addresses (injectable for tests) */
    public function __construct(private ?Closure $resolver = null) {}

    /** @return array{scheme:string,host:string,port:int,ip:string,literal:bool} @throws InvalidArgumentException */
    public function check(string $url): array
    {
        $p = parse_url(trim($url));
        if ($p === false || empty($p['scheme']) || empty($p['host'])) {
            throw new InvalidArgumentException('Invalid URL.');
        }
        $scheme = strtolower($p['scheme']);
        if (! in_array($scheme, ['http', 'https'], true)) {
            throw new InvalidArgumentException('Only http and https URLs are allowed.');
        }
        if (isset($p['user']) || isset($p['pass'])) {
            throw new InvalidArgumentException('Credentials in URLs are not allowed.');
        }
        $port = $p['port'] ?? ($scheme === 'https' ? 443 : 80);
        if (! in_array($port, [80, 443, 8080, 8443], true)) {
            throw new InvalidArgumentException('Port not allowed.');
        }

        $host = strtolower(trim($p['host'], '[]'));
        if ($host === 'localhost' || preg_match('/\.(local|localhost|internal|intranet|lan|home|corp|localdomain)$/', $host)) {
            throw new InvalidArgumentException('Host not allowed.');
        }

        if (filter_var($host, FILTER_VALIDATE_IP)) {
            if (! self::isPublicIp($host)) {
                throw new InvalidArgumentException('Host not allowed.');
            }

            return ['scheme' => $scheme, 'host' => $host, 'port' => $port, 'ip' => $host, 'literal' => true];
        }

        // Numeric tricks that some resolvers accept (e.g. 2130706433, 0x7f.1, 0177.0.0.1) are not valid hostnames here.
        if (preg_match('/^[0-9.x]+$/i', $host) || ! preg_match('/^(?=.{1,253}$)([a-z0-9\p{L}]([a-z0-9\p{L}-]{0,61}[a-z0-9\p{L}])?\.)+[a-z\p{L}]{2,63}$/iu', $host)) {
            throw new InvalidArgumentException('Host not allowed.');
        }

        $ips = ($this->resolver ?? fn (string $h) => (array) gethostbynamel($h))($host);
        if ($ips === [] || $ips === [false]) {
            throw new InvalidArgumentException('Host could not be resolved.');
        }
        foreach ($ips as $ip) {                       // every record must be public (a single private one rejects the host)
            if (! self::isPublicIp($ip)) {
                throw new InvalidArgumentException('Host not allowed.');
            }
        }

        return ['scheme' => $scheme, 'host' => $host, 'port' => $port, 'ip' => $ips[0], 'literal' => false];
    }

    public static function isPublicIp(string $ip): bool
    {
        $bin = @inet_pton($ip);
        if ($bin === false) {
            return false;
        }

        if (strlen($bin) === 16) {                                       // IPv6
            // IPv4-mapped (::ffff:a.b.c.d) -> judge the embedded IPv4 address
            if (substr($bin, 0, 12) === "\0\0\0\0\0\0\0\0\0\0\xff\xff") {
                return self::isPublicIp(inet_ntop(substr($bin, 12)));
            }
            foreach (['64:ff9b::/96', '100::/64', '2001:db8::/32', '2002::/16', '2001::/32', 'fc00::/7', 'fe80::/10', 'ff00::/8', '::/128', '::1/128'] as $cidr) {
                if (self::inCidr($bin, $cidr)) {
                    return false;
                }
            }

            return (bool) filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6 | FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE);
        }

        foreach (['0.0.0.0/8', '10.0.0.0/8', '100.64.0.0/10', '127.0.0.0/8', '169.254.0.0/16', '172.16.0.0/12', '192.0.0.0/24', '192.0.2.0/24', '192.168.0.0/16', '198.18.0.0/15', '198.51.100.0/24', '203.0.113.0/24', '224.0.0.0/4', '240.0.0.0/4'] as $cidr) {
            if (self::inCidr($bin, $cidr)) {
                return false;
            }
        }

        return true;
    }

    private static function inCidr(string $bin, string $cidr): bool
    {
        [$net, $bits] = explode('/', $cidr);
        $netBin = inet_pton($net);
        if (strlen($netBin) !== strlen($bin)) {
            return false;
        }
        $bits = (int) $bits;
        $bytes = intdiv($bits, 8);
        if ($bytes > 0 && substr($bin, 0, $bytes) !== substr($netBin, 0, $bytes)) {
            return false;
        }
        $rest = $bits % 8;
        if ($rest === 0) {
            return true;
        }
        $mask = (0xFF << (8 - $rest)) & 0xFF;

        return (ord($bin[$bytes]) & $mask) === (ord($netBin[$bytes]) & $mask);
    }
}
