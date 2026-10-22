<?php

namespace Tests\Unit;

use App\Services\TwoFactor;
use PHPUnit\Framework\TestCase;

class TwoFactorTest extends TestCase
{
    public function test_matches_rfc_6238_vector(): void
    {
        // RFC 6238 appendix B: secret "12345678901234567890", T=59 => 94287082 (8 digits) => 287082 with 6 digits.
        $secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
        $this->assertSame('287082', (new TwoFactor)->code($secret, 59));
        $this->assertSame('081804', (new TwoFactor)->code($secret, 1111111109));
    }

    public function test_verify_accepts_current_code_and_rejects_garbage(): void
    {
        $tf = new TwoFactor;
        $secret = $tf->generateSecret();
        $this->assertMatchesRegularExpression('/^[A-Z2-7]{32}$/', $secret);
        $this->assertTrue($tf->verify($secret, $tf->code($secret)));
        $this->assertFalse($tf->verify($secret, '000000') && $tf->code($secret) !== '000000');
        $this->assertFalse($tf->verify($secret, 'abcdef'));
    }
}
