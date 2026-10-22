<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\ActivityLog;
use App\Models\Message;
use App\Models\User;
use App\Support\Sql;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class UserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $q = trim((string) $request->validate(['q' => ['nullable', 'string', 'max:80']])['q'] ?? '');
        $users = User::withCount(['conversations as conversations_count'])
            ->when($q !== '', fn ($b) => $b->where(fn ($w) => $w->where('name', 'like', Sql::like($q))->orWhere('email', 'like', Sql::like($q))->orWhere('username', 'like', Sql::like($q))))
            ->orderBy('name')->limit(200)->get();
        $counts = Message::whereIn('sender_id', $users->pluck('id'))->selectRaw('sender_id, COUNT(*) c')->groupBy('sender_id')->pluck('c', 'sender_id');

        return response()->json(['data' => $users->map(fn ($u) => array_merge((new UserResource($u))->resolve($request), ['is_blocked' => $u->isBlocked(), 'messages_count' => (int) ($counts[$u->id] ?? 0)]))->values()]);
    }

    public function activity(int $id): JsonResponse
    {
        $user = User::findOrFail($id);
        $rows = Message::where('sender_id', $user->id)->latest('id')->limit(8)->get(['id', 'type', 'created_at'])
            ->map(fn ($m) => ['id' => $m->id, 'at' => $m->created_at?->toIso8601String(), 'action' => 'message:'.$m->type]);

        return response()->json(['data' => $rows]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $data = $request->validate(['is_blocked' => ['required', 'boolean']]);
        $user = User::findOrFail($id);
        abort_if($user->id === $request->user()->id, 403, __('You cannot block yourself.'));
        abort_if($user->is_admin, 403, __('Admins cannot be blocked from here.'));

        $user->forceFill(['blocked_at' => $data['is_blocked'] ? now() : null])->save();
        if ($data['is_blocked']) {
            DB::table('sessions')->where('user_id', $user->id)->delete();        // kick active sessions
        }
        ActivityLog::record($data['is_blocked'] ? 'User blocked' : 'User unblocked', 'warning', $request->user()->id, ['target' => $user->id]);

        return response()->json(['data' => array_merge((new UserResource($user))->resolve($request), ['is_blocked' => $user->isBlocked()])]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $user = User::findOrFail($id);
        abort_if($user->id === $request->user()->id, 403, __('You cannot delete yourself.'));
        abort_if($user->is_admin, 403, __('Admins cannot be deleted from here.'));
        ActivityLog::record('User deleted', 'warning', $request->user()->id, ['target' => $user->id, 'email' => $user->email]);
        $user->delete();

        return response()->json(null, 204);
    }
}
