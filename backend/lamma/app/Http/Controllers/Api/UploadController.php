<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\AttachmentResource;
use App\Models\Attachment;
use App\Models\Setting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class UploadController extends Controller
{
    /** POST /api/upload (multipart `file`) -> attachment record. Attach it to a message by sending its id to POST /api/messages. */
    public function store(Request $request): JsonResponse
    {
        $maxKb = min(config('lamma.max_upload_kb'), (int) Setting::get('max_upload_mb') * 1024);
        $request->validate(['file' => ['required', 'file', 'max:'.$maxKb]]);

        $file = $request->file('file');
        $ext = strtolower($file->getClientOriginalExtension());
        if (in_array($ext, config('lamma.blocked_extensions'), true)) {
            throw ValidationException::withMessages(['file' => [__('This file type is not allowed.')]]);
        }

        $safeExt = $file->guessExtension() ?: ($ext ?: 'bin');
        $path = $file->storeAs('attachments/'.$request->user()->id, Str::uuid().'.'.$safeExt, 'public');   // random name: no path tricks, no overwrites

        $attachment = Attachment::create([
            'user_id' => $request->user()->id, 'disk' => 'public', 'path' => $path,
            'name' => Str::limit(basename(str_replace('\\', '/', $file->getClientOriginalName())), 120, ''),
            'mime' => $file->getMimeType() ?: 'application/octet-stream', 'size' => $file->getSize(),
        ]);

        return response()->json(['data' => (new AttachmentResource($attachment))->resolve($request)], 201);
    }
}
