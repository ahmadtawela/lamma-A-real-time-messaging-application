<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Report;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ReportController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(['data' => Report::latest()->limit(200)->get()]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $data = $request->validate(['status' => ['required', Rule::in(['open', 'resolved', 'dismissed'])]]);
        $report = Report::findOrFail($id);
        $report->update($data);

        return response()->json(['data' => $report]);
    }
}
