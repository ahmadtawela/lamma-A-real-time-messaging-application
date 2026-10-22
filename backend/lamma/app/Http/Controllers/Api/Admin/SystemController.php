<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Setting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SystemController extends Controller
{
    public function logs(): JsonResponse
    {
        return response()->json(['data' => ActivityLog::latest('id')->limit(100)->get(['id', 'level', 'message', 'created_at'])]);
    }

    public function settings(): JsonResponse
    {
        return response()->json(['data' => Setting::all_()]);
    }

    public function updateSettings(Request $request): JsonResponse
    {
        $data = $request->validate([
            'registration_open' => ['sometimes', 'boolean'], 'require_email_verification' => ['sometimes', 'boolean'],
            'maintenance_mode' => ['sometimes', 'boolean'], 'max_upload_mb' => ['sometimes', 'integer', 'min:1', 'max:200'],
        ]);
        foreach ($data as $key => $value) {
            Setting::put($key, $value);
        }
        ActivityLog::record('System settings changed', 'info', $request->user()->id, array_keys($data));

        return response()->json(['data' => Setting::all_()]);
    }
}
