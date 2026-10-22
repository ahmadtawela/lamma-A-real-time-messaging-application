<?php

namespace Tests;

use App\Models\Setting;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        // Never open sockets from tests; events are still dispatched and can be asserted with Event::fake().
        config(['broadcasting.default' => 'null', 'queue.default' => 'sync', 'cache.default' => 'array']);

        // Ensure default settings exist for tests
        foreach (Setting::DEFAULTS as $key => $value) {
            Setting::firstOrCreate(['key' => $key], ['value' => $value]);
        }
    }
}
