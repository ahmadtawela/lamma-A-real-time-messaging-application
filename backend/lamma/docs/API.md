# Lamma API contract (what the React client calls)

Auth = Sanctum SPA cookie session. Before the first POST call `GET /sanctum/csrf-cookie`.
Errors: `401 {message}` · `403 {message}` · `404 {message}` · `422 {message, errors:{field:[...]}}` · `429` (+`Retry-After`) · `500`.
Success: single → `{data:{...}}`, list → `{data:[...]}`, messages → `{data:[...], meta:{has_more,next_cursor}}`.

| Method | Path | Notes |
|---|---|---|
| POST | /api/register, /api/login, /api/logout | login → `{user}` or `{two_factor:true}` |
| POST | /api/two-factor-challenge | `{code}` or `{code, recovery:true}` |
| POST | /api/forgot-password, /api/reset-password | reset link points to `FRONTEND_URL/reset-password?token&email` |
| GET  | /api/email/verify/{id}/{hash} | signed link from the mail → redirects to the app |
| POST | /api/email/verification-notification | resend |
| GET  | /api/user | `{data:user}` incl. `locale`, `is_admin`, `email_verified_at` |
| PUT  | /api/user, /api/user/preferences, /api/user/password | preferences: `{locale}` and/or `{settings:{...}}` |
| POST | /api/user/avatar | multipart `avatar` |
| POST/POST/DELETE | /api/user/two-factor, /confirm | setup → `{secret, otpauth_url}`; confirm → `{recovery_codes}` (once) |
| POST/POST/DELETE | /api/user/phone · /api/user/phone/verify · /api/user/phone | `{phone:"+905551112233"}` → SMS code · `{code}` → user · remove; 429 on resend within 60 s |
| GET  | /api/users?q= | name/username search (no emails) |
| GET/POST | /api/conversations | `?filter=all|unread|groups|contacts|archived&q=` · POST `{user_id}` |
| GET/PUT/DELETE | /api/conversations/{id} | PUT `{is_pinned,is_muted,is_archived,draft,unread_count}` |
| POST | /api/conversations/{id}/read | marks read |
| GET | /api/conversations/{id}/messages?before=&limit= | cursor pagination |
| DELETE | /api/conversations/{id}/messages | clear for me |
| POST | /api/messages | `{conversation_id, client_id, type, body, reply_to_id, attachments:[{id,duration,waveform}], meta}` (idempotent by `client_id`) |
| PUT/DELETE | /api/messages/{id} | PUT `{body}` or `{pinned}` |
| POST | /api/messages/{id}/read · /reaction `{emoji}` · /vote `{option_id}` · /star | |
| GET | /api/messages/starred | |
| POST | /api/upload | multipart `file` → attachment `{id,name,mime,size,url}` |
| GET/POST | /api/groups | POST `{name,description,user_ids}` |
| GET/PUT/DELETE | /api/groups/{id} | PUT `{name,description,restrict_messaging}` |
| POST | /api/groups/{id}/avatar · /members `{user_ids}` · /admins `{user_id}` | |
| DELETE | /api/groups/{id}/members/{userId} · /admins/{userId} | removing yourself = leave |
| POST | /api/groups/join/{code} | invite link |
| GET/POST | /api/contacts · POST body: `{user_id}` or `{email}` or `{phone}` (E.164, verified numbers only) · DELETE /api/contacts/{id} · POST/DELETE /api/contacts/{id}/block | |
| GET/POST/DELETE | /api/notifications · POST /read-all · POST /{id}/read | |
| GET/POST/DELETE | /api/statuses · POST /{id}/view · /{id}/reaction | image/video: multipart `media` |
| GET | /api/calls | history (finished calls only) |
| GET | /api/calls/ice-servers | `{ice_servers, ttl}` — STUN + short-lived TURN credentials |
| GET | /api/calls/pending | a call ringing for me right now (offer included) or `null` |
| POST | /api/calls/start | `{callee_id, kind, sdp}` → 201 `{id}`; 409 `{reason:'busy'}` |
| POST | /api/calls/{id}/answer · /ice · /decline · /end | `{sdp}` · `{candidate}` · `{reason?}` · — |
| GET | /api/link-preview?url= | `{data:{url,domain,title,description,image,site_name}}` or `{data:null}`; 422 for blocked URLs |
| GET | /api/search?q=&type= | messages, users, groups, files, media, links |
| POST | /api/reports | `{message_id?|user_id?, reason}` |
| GET/PUT/DELETE | /api/admin/stats · users · users/{id}/activity · groups · reports · logs · settings | 403 unless `is_admin` |

## Realtime
Channels: `private-user.{id}` (all events), `private-conversation.{id}`, `presence-conversation.{id}`.
Events (`broadcastAs`): `MessageSent{message}`, `MessageEdited{message}`, `MessageDeleted{message}`, `MessageReactionAdded{message}`,
`MessageDelivered{conversation_id,message_id,delivered_at}`, `MessageRead{conversation_id,message_id,read_at,user_id}`,
`UserJoinedGroup{conversation_id,user_id}`, `UserLeftGroup{conversation_id,user_id}`,
`CallIncoming{call:{id,kind,offer,caller}}`, `CallAnswered{call_id,sdp}`, `CallIce{call_id,candidate}`, `CallEnded{call_id,reason}` (reason: ended|declined|busy|cancelled|missed).
Typing indicators are client whispers on the presence channel (no server code).
