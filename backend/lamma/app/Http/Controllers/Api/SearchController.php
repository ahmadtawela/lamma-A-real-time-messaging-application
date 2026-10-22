<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attachment;
use App\Models\Message;
use App\Models\User;
use App\Support\FullText;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class SearchController extends Controller
{
    /** GET /api/search?q=&type=all|messages|users|groups|files|media|links — only inside conversations the user belongs to. */
    public function index(Request $request)
    {
        $data = $request->validate(['q' => ['required', 'string', 'min:2', 'max:100'], 'type' => ['nullable', 'in:all,messages,users,groups,files,media,links']]);
        $me = $request->user();
        $term = $data['q'];
        $type = $data['type'] ?? 'all';
        $want = fn (string $t) => $type === 'all' || $type === $t;
        $out = collect();

        if ($want('users')) {
            FullText::whereAny(User::where('id', '!=', $me->id)->whereNull('blocked_at'), ['users.name', 'users.username'], $term)->limit(10)->get()
                ->each(fn ($u) => $out->push(['type' => 'users', 'id' => $u->id, 'title' => $u->name, 'snippet' => '@'.$u->username, 'user_id' => $u->id]));
        }
        if ($want('groups')) {
            FullText::where($me->conversations()->where('conversations.type', 'group'), 'conversations.name', $term)->limit(10)->get()
                ->each(fn ($g) => $out->push(['type' => 'groups', 'id' => $g->id, 'title' => $g->name, 'snippet' => $g->description, 'conversation_id' => $g->id]));
        }

        $title = fn ($c) => $c->name ?? $c->users->firstWhere('id', '!=', $me->id)?->name ?? '';
        $row = fn (string $t, $m, string $text, array $extra = []) => array_merge(['type' => $t, 'id' => $m->id, 'title' => Str::limit($text, 80), 'snippet' => Str::limit($text, 160), 'created_at' => $m->created_at?->toIso8601String(), 'conversation_id' => $m->conversation_id, 'conversation_title' => $title($m->conversation)], $extra);

        if ($want('messages') || $want('links')) {
            FullText::where(Message::visibleTo($me)->with('conversation.users:id,name')->where('messages.type', '!=', 'system'), 'messages.body', $term)
                ->when($type === 'links', fn ($b) => $b->where('body', 'like', '%http%'))->latest('id')->limit(30)->get()
                ->each(fn ($m) => $out->push($row($type === 'links' ? 'links' : 'messages', $m, $m->body)));
        }
        if ($want('files') || $want('media')) {
            FullText::where(Attachment::whereHas('message', fn ($b) => $b->visibleTo($me))->with('message.conversation.users:id,name'), 'attachments.name', $term)
                ->when($type === 'media', fn ($b) => $b->where('mime', 'like', 'image/%'), fn ($b) => $type === 'files' ? $b->where('mime', 'not like', 'image/%') : $b)
                ->latest('id')->limit(30)->get()
                ->each(fn ($a) => $out->push($row(str_starts_with($a->mime, 'image/') ? 'media' : 'files', $a->message, $a->name, str_starts_with($a->mime, 'image/') ? ['thumb' => $a->url] : [])));
        }

        return response()->json(['data' => $out->take(60)->values()]);
    }
}
