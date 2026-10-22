# Lamma (لمّة) — Web client

Bilingual (Arabic RTL / English LTR) real-time messaging front-end. **React (JavaScript + JSX) · Vite · Tailwind CSS.**
Runs on an **in-memory mock backend** out of the box, and talks to the Laravel API (see the `lamma-api` project) with one switch.

## 1) Install & run
Needs **Node.js 18.18+** (20 LTS recommended).
```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # production build → dist/
npm run check:i18n   # lists t('…') keys missing from src/locales (needs python3)
```
Packages (all in `package.json`): `react`, `react-dom`, `react-router-dom@6`, `zustand`, `axios`, `laravel-echo`, `pusher-js`, `lucide-react`; dev: `vite`, `@vitejs/plugin-react`, `tailwindcss@3`, `postcss`, `autoprefixer`.

**Mock mode login:** any email + password `password` · email containing `2fa` → code `123456` (recovery `recovery-1234`) · `/verify-device` code `654321` · the mock user is an admin (`/admin`).
Calls in mock mode: *Calls → Simulate incoming call*, or call anyone from a chat (your own camera is looped back as the "remote" video; user #9 answers "busy").

## 2) Use the real Laravel backend
Copy `.env.example` → `.env`:
```
VITE_USE_MOCKS=false
VITE_API_URL=http://localhost:8000
VITE_REVERB_APP_KEY=<REVERB_APP_KEY from Laravel>   VITE_REVERB_HOST=localhost   VITE_REVERB_PORT=8080   VITE_REVERB_SCHEME=http
```
Open the app on `http://localhost:5173` and the API on `http://localhost:8000` (both `localhost`, same site → Sanctum cookies work). Nothing in `features/*/components|pages|store` changes.

## 3) Folder structure (feature-sliced, one alias `@` → `src`)
```
src/
├── main.jsx                 entry (providers + router)
├── app/                     composition root: App, AppRoutes, guards, layout/AppLayout, hooks (realtime bootstrap, API toasts), pages/NotFound
├── shared/                  reusable, feature-agnostic code
│   ├── ui/                  design-system primitives (Button, Input, Modal, Menu, Toggle, Avatar, Logo …)
│   ├── components/          LanguageSwitcher, ThemeSwitcher
│   ├── context/             Language / Theme / Toast providers
│   ├── i18n/                config, translate (plurals, interpolation), Intl formatters
│   ├── hooks/ lib/ api/ models/ store/    useApiForm, useAsync … · ApiError, apiEvents · axios client · JSDoc models · modal/UI state
├── features/                one folder per product area, each with the same sub-folders when needed:
│   │                        components/ · pages/ · hooks/ · store/ · services/ · lib/
│   ├── auth  users  chat  groups  contacts  status  calls  notifications  search  profile  settings  admin
│   └── calls/webrtc/        PeerSession (real RTCPeerConnection) · LoopbackSession (mock) · createSession()
├── realtime/                realtimeService (the only API React uses) + drivers/echoDriver | mockDriver
├── mocks/                   in-memory Laravel stand-in (data + axios adapter + routes)
├── locales/{ar,en}/*.json   all UI text
└── config/env.js
```
Rules: features may use `shared/` and other features' **services/stores**, `shared/` never imports a feature, only `services/` talk HTTP, only `realtime/` talks WebSockets.

## 4) What's new in this version
- **WebRTC calls** (`features/calls`): signalling over the API + Reverb (`CallIncoming/Answered/Ice/Ended`), trickle ICE with queueing, STUN/TURN from `GET /api/calls/ice-servers`, mute, camera on/off, **switch camera**, **screen sharing**, 60 s ring timeout, busy handling, permission errors, incoming call restored after reconnect (`/calls/pending`).
- **Link previews** from the server (`/api/link-preview`) with a domain-chip fallback.
- **Multipart uploads** for profile/group avatars and image/video statuses.
- **Server-side** privacy settings, starred messages, e-mail verification via the link in the e-mail, `Accept-Language` on every request (the API answers in Arabic/English).
- Clean feature-based folders with `@/` imports (114 files moved, imports rewritten automatically).

## 5) Honest limits
- Built and bundled, and the service layer (including call signalling, previews, stars) was exercised against the mock backend in Node, but **not opened in a real browser here**; WebRTC needs two real browsers/devices to verify — test a call between two profiles (or two machines) once the Laravel API is running.
- *Speaker* toggles remote audio on/off (browsers can't switch earpiece/speaker); group calls aren't supported (1-to-1 only).
- Calls on HTTPS or `localhost` only (browsers block camera/microphone otherwise). Behind strict NATs you need a TURN server (see the API README).
- The `/verify-device` screen has no backend yet. Lists use pagination + infinite scroll (no windowed virtualization).
