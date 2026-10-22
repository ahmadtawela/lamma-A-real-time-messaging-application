<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Conversation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GroupController extends Controller
{
    public function index(): JsonResponse
    {
        $groups = Conversation::where('type', 'group')->withCount(['users as members', 'messages as messages_count'])->orderBy('name')->get(['id', 'name']);

        return response()->json(['data' => $groups]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $group = Conversation::where('type', 'group')->findOrFail($id);
        ActivityLog::record('Group deleted by admin', 'warning', $request->user()->id, ['group' => $group->name]);
        $group->delete();

        return response()->json(null, 204);
    }
}
