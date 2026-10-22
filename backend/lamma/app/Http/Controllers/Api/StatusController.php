<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\StatusResource;
use App\Models\Contact;
use App\Models\Status;
use App\Models\StatusReaction;
use App\Models\StatusView;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class StatusController extends Controller
{
    /** Active statuses I'm allowed to see: mine, "everyone", or "contacts" when the author has me as a contact. Blocks hide both ways. */
    public function index(Request $request)
    {
        return StatusResource::collection($this->visibleQuery($request)->with(['views', 'reactions'])->orderBy('created_at')->get());
    }

    private function visibleQuery(Request $request)
    {
        $me = $request->user();
        $blocked = array_merge($me->blockedIds(), $me->blockedByIds());

        return Status::query()->where('expires_at', '>', now())
            ->where(fn ($q) => $q->where('user_id', $me->id)
                ->orWhere(fn ($o) => $o->whereNotIn('user_id', $blocked)->where(fn ($v) => $v->where('privacy', 'everyone')
                    ->orWhereIn('user_id', Contact::where('contact_id', $me->id)->whereNull('blocked_at')->select('user_id')))));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'kind' => ['required', Rule::in(['text', 'image', 'video'])],
            'text' => ['nullable', 'string', 'max:700', 'required_if:kind,text'],
            'color' => ['nullable', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'privacy' => ['nullable', Rule::in(['everyone', 'contacts'])],
            'media' => ['required_unless:kind,text', 'file', 'max:20480', 'mimetypes:image/jpeg,image/png,image/webp,video/mp4,video/webm'],
        ]);

        $status = Status::create([
            'user_id' => $request->user()->id, 'kind' => $data['kind'], 'text' => $data['text'] ?? null, 'color' => $data['color'] ?? '#3D4BF2',
            'privacy' => $data['privacy'] ?? 'contacts', 'expires_at' => now()->addHours(config('lamma.status_ttl_hours')),
            'media_path' => $request->hasFile('media') ? $request->file('media')->store('statuses/'.$request->user()->id, 'public') : null,
        ]);

        return response()->json(['data' => (new StatusResource($status->load(['views', 'reactions'])))->resolve($request)], 201);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $status = Status::where('user_id', $request->user()->id)->findOrFail($id);
        if ($status->media_path) {
            Storage::disk('public')->delete($status->media_path);
        }
        $status->delete();

        return response()->json(null, 204);
    }

    public function view(Request $request, int $id): JsonResponse
    {
        $status = $this->visible($request, $id);
        if ($status->user_id !== $request->user()->id) {
            StatusView::firstOrCreate(['status_id' => $status->id, 'user_id' => $request->user()->id], ['viewed_at' => now()]);
        }

        return response()->json(null, 204);
    }

    public function react(Request $request, int $id): JsonResponse
    {
        $data = $request->validate(['emoji' => ['required', 'string', Rule::in(config('lamma.reactions'))]]);
        $status = $this->visible($request, $id);
        abort_if($status->user_id === $request->user()->id, 422);
        StatusReaction::where(['status_id' => $status->id, 'user_id' => $request->user()->id])->delete();
        StatusReaction::create(['status_id' => $status->id, 'user_id' => $request->user()->id, 'emoji' => $data['emoji']]);

        return response()->json(['data' => (new StatusResource($status->refresh()->load(['views', 'reactions'])))->resolve($request)]);
    }

    private function visible(Request $request, int $id): Status
    {
        // Same visibility rules as the list, so you can't view/react to a status you can't see.
        return $this->visibleQuery($request)->findOrFail($id);
    }
}
