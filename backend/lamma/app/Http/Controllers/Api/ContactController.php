<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\Contact;
use App\Models\User;
use App\Services\NotifyService;
use App\Support\PhoneNumber;
use App\Support\Sql;
use Illuminate\Validation\ValidationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ContactController extends Controller
{
    public function index(Request $request)
    {
        $q = trim((string) $request->validate(['q' => ['nullable', 'string', 'max:60']])['q'] ?? '');
        $users = User::query()
            ->whereIn('id', Contact::where('user_id', $request->user()->id)->select('contact_id'))
            ->when($q !== '', fn ($b) => $b->where(fn ($w) => $w->where('name', 'like', Sql::like($q))->orWhere('username', 'like', Sql::like($q))))
            ->orderBy('name')->get();

        return UserResource::collection($users);
    }

    /** POST /api/contacts { user_id } | { email } — unknown emails answer 202 {invited:true} (an invitation mail can be queued here). */
    public function store(Request $request, NotifyService $notify): JsonResponse
    {
        $data = $request->validate([
            'user_id' => ['required_without_all:email,phone', 'integer'],
            'email' => ['required_without_all:user_id,phone', 'email'],
            'phone' => ['required_without_all:user_id,email', 'string', 'max:32'],
        ]);
        $me = $request->user();

        if (isset($data['user_id'])) {
            $target = User::find($data['user_id']);
        } elseif (isset($data['phone'])) {
            $e164 = PhoneNumber::normalize($data['phone']) ?? throw ValidationException::withMessages(['phone' => [__('The phone number is not valid.')]]);
            // Only VERIFIED numbers match, and only people who left "find me by my number" on (default). Unknown/hidden numbers answer 202 like unknown e-mails.
            $target = User::where('phone', $e164)->whereNotNull('phone_verified_at')->first();
            if ($target && $target->setting('phone_discoverable', true) === false) {
                $target = null;
            }
        } else {
            $target = User::where('email', strtolower($data['email']))->first();
        }
        $target = $target && ! $target->isBlocked() ? $target : null;
        if (! $target) {
            return response()->json(['invited' => true], 202);
        }
        abort_if($target->id === $me->id, 422, __('You cannot add yourself.'));
        if (in_array($target->id, $me->blockedByIds(), true)) {
            return response()->json(['invited' => true], 202);   // indistinguishable from an unknown email
        }

        $contact = Contact::firstOrCreate(['user_id' => $me->id, 'contact_id' => $target->id]);
        if ($contact->wasRecentlyCreated) {
            $notify->to($target, 'contact_request', $me->name);
        }

        return response()->json(['data' => (new UserResource($target))->resolve($request)], 201);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        Contact::where('user_id', $request->user()->id)->where('contact_id', $id)->delete();

        return response()->json(null, 204);
    }

    public function block(Request $request, int $id): JsonResponse
    {
        abort_if($id === $request->user()->id, 422);
        User::findOrFail($id);
        Contact::updateOrCreate(['user_id' => $request->user()->id, 'contact_id' => $id], ['blocked_at' => now()]);

        return response()->json(['data' => ['is_blocked' => true]]);
    }

    public function unblock(Request $request, int $id): JsonResponse
    {
        Contact::where('user_id', $request->user()->id)->where('contact_id', $id)->update(['blocked_at' => null]);

        return response()->json(['data' => ['is_blocked' => false]]);
    }
}
