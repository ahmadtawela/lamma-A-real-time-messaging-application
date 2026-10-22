<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Message;
use App\Models\Report;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ReportController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $me = $request->user();
        $data = $request->validate([
            'message_id' => ['nullable', 'integer'], 'user_id' => ['nullable', 'integer', 'exists:users,id'],
            'reason' => ['required', Rule::in(['spam', 'abuse', 'harassment', 'inappropriate', 'other'])],
        ]);
        $reported = $data['user_id'] ?? null;
        if (! empty($data['message_id'])) {
            $message = Message::withTrashed()->visibleTo($me)->findOrFail($data['message_id']);     // can only report what you can see
            $reported = $message->sender_id;
        }
        abort_if(! $reported && empty($data['message_id']), 422, __('Nothing to report.'));
        abort_if($reported === $me->id, 422, __('You cannot report yourself.'));

        $report = Report::create(['reporter_id' => $me->id, 'reported_user_id' => $reported, 'message_id' => $data['message_id'] ?? null, 'reason' => $data['reason']]);
        ActivityLog::record('Report created', 'warning', $me->id, ['report_id' => $report->id]);

        return response()->json(['data' => $report], 201);
    }
}
