# Lamma API — Laravel backend

PHP / Laravel (11 or 12) · MySQL · Sanctum (SPA cookie auth) · Reverb + Echo (WebSockets) · queues.
This folder is an **overlay**: the Lamma code that goes on top of a fresh Laravel project (so you always get the official, up-to-date skeleton).

> **Status, honestly:** every PHP file was syntax-checked (`php -l`, PHP 8.3). Verified by running them in plain PHP: the 2FA/TOTP code (RFC 6238 vectors), the SSRF guard (42 address/URL cases), the Open Graph parser and the FULLTEXT query builder (74 checks, all passing).
> I could **not** run Laravel itself in my environment (Composer/Packagist is blocked there), so the migrations, the API and the test-suite
> in `tests/` have **not been executed yet**. Run `php artisan test` first — if something fails, send me the output and I'll fix it.

## 1) Requirements
| Tool | Version |
|---|---|
| PHP | 8.2+ with extensions: `mbstring, xml, curl, pdo_mysql, fileinfo, gd or imagick` (for image validation) |
| Composer | 2.x |
| MySQL | 8+ (or MariaDB 10.6+) — create an empty database named `lamma` |
| Node.js | 18+ (only because `install:broadcasting` may offer to install JS packages — answer "no") |

Windows: Laragon or XAMPP + Composer works; run the commands below in Git Bash, or follow the manual steps.

## 2) Install (automatic)
```bash
bash setup.sh            # creates ../lamma-api-app, installs Sanctum + Reverb, copies this code, migrates and seeds
```

### …or manually
```bash
composer create-project laravel/laravel lamma-api-app
cd lamma-api-app
php artisan install:api                      # Sanctum
php artisan install:broadcasting --reverb    # Reverb + Echo, generates REVERB_* keys
# copy from this folder into the project (overwrite when asked): app/ bootstrap/ config/ database/ routes/ tests/
# append .env.additions to .env  (then remove the duplicated keys, e.g. DB_*, SESSION_DRIVER)
php artisan key:generate
php artisan migrate:fresh --seed
php artisan storage:link
```
Packages used: only `laravel/sanctum` and `laravel/reverb` (both installed by the commands above). **No other Composer package is required.**

## 3) Run (3 terminals)
```bash
php artisan serve                  # http://localhost:8000
php artisan reverb:start --debug   # WebSockets :8080
php artisan queue:work             # broadcasts + notifications  (or QUEUE_CONNECTION=sync in .env for development)
php artisan schedule:work          # optional: prunes expired statuses / orphan uploads
```
Seed accounts: **admin@lamma.test / password** (admin) + 20 random users (all `password`).
Emails (verification / reset) go to `storage/logs/laravel.log` while `MAIL_MAILER=log`.

## 4) Tests
```bash
php artisan test
```
`tests/Feature/AuthTest.php`, `MessagingTest.php` (authorization/IDOR, idempotency, pagination, blocking, uploads…), `CallsTest.php` (signalling, busy, expiry, TURN credentials), `SearchAndLinksTest.php` (search, SSRF, link preview, Arabic messages) and `tests/Unit/TwoFactorTest.php`.
Tests use SQLite in-memory (Laravel's default `phpunit.xml`), so install `pdo_sqlite`.

## 5) Architecture
```
app/
├── Models/            User, Conversation (+pivot), Message, Attachment, Reaction, PollOption/Vote, Contact, Status…, Call, Report, ActivityLog, Setting
├── Http/
│   ├── Controllers/Api/        Auth, Profile, User, Conversation, Message, Upload, Group, Contact, Notification, Status, Call, Search, Report
│   ├── Controllers/Api/Admin/  Stats, User, Group, Report, System
│   ├── Resources/              JSON shapes the React app expects (see docs/API.md)
│   └── Middleware/             EnsureUserIsAdmin, TouchLastSeen (presence), SetLocale
├── Policies/          ConversationPolicy (manage/post), MessagePolicy (update/delete)
├── Services/          ConversationService, ReceiptService (delivered/read), TwoFactor (TOTP), NotifyService
├── Events/            UserBroadcast base + MessageSent/Edited/Deleted/ReactionAdded/Delivered/Read, UserJoinedGroup/LeftGroup
└── Support/Sql.php    LIKE-escaping helper
routes/api.php · routes/channels.php · routes/console.php (scheduler)
database/migrations (users replaces Laravel's default) · factories · seeders
```
Key design decisions
- **Authorization by construction:** conversations/messages are always resolved through the caller's own memberships → outsiders get **404** (no existence leak, no IDOR); roles are checked by policies (**403**).
- **Idempotent sending:** `(sender_id, client_id)` is unique, so the optimistic UI can safely retry.
- **One private chat per pair:** `conversations.private_key = "minId:maxId"` (unique).
- **Per-user state** (pin/mute/archive/draft/last read/cleared-until/hidden) lives on the `conversation_user` pivot; "delete conversation / clear chat" only affects the caller.
- **Receipts:** per-recipient rows + aggregate `delivered_at/read_at` on the message (all recipients) → ✓ / ✓✓ / blue ✓✓; users can disable sending read receipts.
- **Unread counts** are computed in one grouped query per list call.
- **Uploads:** random file names, extension deny-list (php, html, svg, exe…), size from the admin setting, an attachment can only be attached by its uploader and only once; orphan uploads are pruned daily.
- **Security basics:** mass-assignment whitelists (`is_admin`/`blocked_at` not fillable), hashed passwords, encrypted 2FA secret + hashed single-use recovery codes, session regeneration on login, session purge on password reset/admin block, constant-time-ish login (no email enumeration), rate limits (`login` 5/min, `auth-sensitive`, `messages`, `uploads`, `api`), emails only visible to the owner/admin, search limited to your own conversations, LIKE wildcards escaped.
- **Realtime:** every event is broadcast to `private-user.{id}` of each participant (`->toOthers()`); typing = client whispers on `presence-conversation.{id}`; presence "online" = a 2-minute cache flag refreshed on API calls.

## 5b) New in this version

**WebRTC signalling for calls** — `CallController` + `CallService` + events `CallIncoming / CallAnswered / CallIce / CallEnded`.
Flow: caller `POST /api/calls/start {callee_id, kind, sdp}` → callee receives `CallIncoming` (with the offer) → `POST /answer {sdp}` → caller receives `CallAnswered`;
both trickle ICE through `POST /ice` ⇄ `CallIce`; `POST /end | /decline` → `CallEnded`. Media flows peer-to-peer (or via TURN).
Only the two participants can touch a call (404 for others), busy users get `409 {reason:"busy"}`, blocked users `403`, SDP/ICE are validated and size-limited.
Unanswered calls become *missed* after 60 s (`schedule:work` runs `calls:expire` every minute) and the callee gets a notification.
`GET /api/calls/pending` returns a call that is ringing while the app was closed/reconnecting.

TURN (needed for users behind strict NATs/mobile carriers): run coturn with `use-auth-secret` and set `TURN_HOST`, `TURN_PORT`, `TURN_SECRET` in `.env`;
`GET /api/calls/ice-servers` then hands out **time-limited credentials** (HMAC, `TURN_TTL`). Without it only public STUN is used.
**Reverb message size:** SDP offers with video can pass 10 KB. In `config/reverb.php` raise `apps.apps[0].max_message_size` to `65536` (and in `options` for Pusher-compatible limits).

**Link previews** — `GET /api/link-preview?url=` fetches the page *on the server* (`LinkPreviewService`):
`UrlGuard` blocks non-http(s), credentials in URLs, odd ports, localhost/internal names and any host resolving to private/loopback/link-local/metadata/reserved IPv4+IPv6 (incl. mapped/NAT64/6to4);
the validated IP is **pinned** (`CURLOPT_RESOLVE`, no DNS-rebinding), redirects are followed manually and re-validated at each hop (max 3), 5 s timeout, 512 KB cap, `text/html` only, cached 24 h.
Preview images are returned as URLs (the browser loads them with `referrerPolicy=no-referrer`); if you want zero third-party contact, add an image-proxy endpoint.

**FULLTEXT search** — migration `2026_10_06_000002` adds FULLTEXT indexes (messages.body, attachments.name, users name+username, conversations.name) on MySQL/MariaDB.
`App\Support\FullText` builds a safe boolean query with prefix matching (`+launch* +cod*`) and falls back to an escaped `LIKE` when the engine can't answer correctly
(SQLite, words shorter than `innodb_ft_min_token_size`=3, stop-words only). Used by the conversation list search and global search. For CJK content create the indexes `WITH PARSER ngram`.
After changing `innodb_ft_min_token_size` rebuild the indexes (`OPTIMIZE TABLE messages`).

**Arabic server messages** — `lang/ar/{auth,passwords,pagination,validation}.php` (all Laravel 11 rules + field names) and `lang/ar.json` for our own messages.
`SetLocale` picks the user's `locale` (or `Accept-Language` for guests; the React app sends it on every request). 404/403/401 JSON responses never leak model names.
Add a language later by dropping a new `lang/<code>/` folder and adding the code to `SetLocale` / the `locale` validation rule.

## 6) Connect the React app
In the front-end `.env`: `VITE_USE_MOCKS=false`, `VITE_API_URL=http://localhost:8000`, `VITE_REVERB_APP_KEY=<REVERB_APP_KEY>`, host/port/scheme as in Laravel.
Open the app at **`http://localhost:5173`** (same site as the API, otherwise cookies won't flow — use `localhost` for both, not `127.0.0.1` for one of them).

The front-end already contains the adjustments for this API (multipart avatars and status media, privacy settings via `PUT /api/user/preferences`,
server-side stars, e-mail verification through the link, `Accept-Language`, WebRTC calls, link previews).
Still without a backend: the **new-device verification** screen (`/verify-device`) — 2FA and recovery codes are implemented.

## 7) Not done yet / next steps
- Group calls (signalling is 1-to-1; group calls would need an SFU such as LiveKit/mediasoup).
- Device-verification login challenge, push notifications (FCM/APNs/Web Push), message e-mail digests.
- Arabic search normalisation (hamza/ya/ta-marbuta variants and diacritics) — would be done at write time into a normalised column.
- Production hardening: HTTPS, `SESSION_SECURE_COOKIE=true`, Supervisor for `queue:work` + `reverb:start`, Redis for cache/queues, S3 for uploads.
