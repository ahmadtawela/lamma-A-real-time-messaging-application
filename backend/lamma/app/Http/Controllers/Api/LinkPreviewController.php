<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\LinkPreviewService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use InvalidArgumentException;

class LinkPreviewController extends Controller
{
    /** GET /api/link-preview?url= → {data:{url,domain,title,description,image,site_name}} | {data:null} when the page has no preview. */
    public function show(Request $request, LinkPreviewService $service): JsonResponse
    {
        $data = $request->validate(['url' => ['required', 'string', 'max:2048']]);

        try {
            return response()->json(['data' => $service->preview($data['url'])]);
        } catch (InvalidArgumentException) {
            throw ValidationException::withMessages(['url' => [__('The link is not allowed.')]]);
        }
    }
}
