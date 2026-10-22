<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Attachment;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\Report;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class StatsController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $from = now()->subDays(6)->startOfDay();
        $perDay = Message::where('created_at', '>=', $from)->selectRaw('DATE(created_at) as d, COUNT(*) as c')->groupBy('d')->pluck('c', 'd');
        $series = collect(range(0, 6))->map(fn ($i) => (int) ($perDay[$from->copy()->addDays($i)->toDateString()] ?? 0))->all();

        return response()->json(['data' => [
            'total_users' => User::count(),
            'active_users' => User::where('last_seen_at', '>=', now()->subDay())->count(),
            'messages' => Message::count(),
            'groups' => Conversation::where('type', 'group')->count(),
            'reports_open' => Report::where('status', 'open')->count(),
            'storage_used_gb' => round(Attachment::sum('size') / 1e9, 2),
            'storage_total_gb' => (float) env('LAMMA_STORAGE_TOTAL_GB', 500),
            'messages_per_day' => $series,
        ]]);
    }
}
