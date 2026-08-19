# ClipForge — mobile app

Expo (SDK 57) + React Native Android client for the **content-generator API**
(`../api`). Paste a YouTube podcast link, the AI pipeline finds viral moments,
cuts them, and the app lets you watch, copy metadata and save clips to your
gallery.

## Stack

Expo Router (file-based routing) · TypeScript · NativeWind v4 (Tailwind) ·
TanStack Query (server state + pipeline polling) · Zustand (client state) ·
better-auth bearer-token sessions in `expo-secure-store` · expo-video ·
expo-media-library · expo-clipboard · Reanimated

## Run it

```bash
# 1. start the backend first (see ../README.md)
docker compose up -d && cd ../api && pnpm start:dev

# 2. run the app
cd ../mobile
cp .env.example .env        # optional — see API URL notes below
npm install
npm run start               # then press "a" (emulator) or scan QR (Expo Go)
```

Dev credentials after `pnpm db:seed` in `../api`: `dev@example.com` / `password123`.

## API URL resolution

`src/config/env.ts` picks the API base URL in this order:

1. `EXPO_PUBLIC_API_URL` from `.env` (e.g. `http://192.168.1.10:3000/api`)
2. The Expo dev-server host IP (physical device on the same Wi-Fi "just works")
3. `http://10.0.2.2:3000/api` for the Android emulator
4. `http://localhost:3000/api` fallback

## Auth

Email/password via better-auth. The API's `bearer()` plugin returns the
session token in the `set-auth-token` response header; the app stores it in
the Android Keystore (`expo-secure-store`) and sends
`Authorization: Bearer <token>` on every request — including video streaming
and downloads, which is why no cookie handling is needed.

## Architecture (loosely coupled, feature-based)

```
app/                  expo-router routes only — no logic lives here
  (auth)/             sign-in, sign-up
  (app)/              guarded group: home, bin, project/[id], player/[id] (modal)
src/
  config/env.ts       API URL resolution
  api/                pure-TS transport: http.ts (envelope + bearer + errors),
                      types.ts (mirrors prisma models), endpoints/*
  session/            token storage + SessionProvider (sign-in/up/out, boot)
  queries/            TanStack Query hooks per resource (polling included)
  store/              zustand: selected application (persisted), toast queue
  theme/              design tokens (colors, gradients, radii, fonts)
  lib/                clipboard, download-to-gallery, formatters, status meta
  components/
    ui/               primitives: Button, Card, Input, Badge, Sheet, Skeleton,
                      ToastHost, SegmentedTabs, MediaActions, CopyableText…
    auth/ · applications/ · projects/ · clips/ · videos/ · raw-videos/ · player/
```

Swapping anything later: the API layer is framework-free (replace fetch with
ky/axios freely), the session module hides better-auth behind 4 functions,
and every screen composes small feature components.

## Feature map

- **Sign in / sign up** — better-auth email+password, session restore on boot
- **Applications** — first-run creation flow, header pill switcher, persisted
  selection; projects are filtered per application client-side
- **Home** — YouTube link input (compact) or centered hero when empty;
  active projects list with live pipeline badges (polls while processing);
  bin shortcut with count
- **Bin** — soft-deleted projects; **restore** back to home via
  `POST /api/projects/:id/restore`, or **delete forever** (DB row + every
  stored file) via `DELETE /api/projects/:id/permanent` — both bin-only,
  both confirmed with a dialog
- **Project detail** — 6-stage pipeline progress, error banner on failure,
  tabs: **Clips** (virality score, hook, time range) · **Ready** (final videos)
  · **Source** (raw download)
- **Player** — fullscreen expo-video modal with audio + native controls,
  authenticated streaming
- **Downloads** — save clips/videos/source to the gallery with progress
- **Tap-to-copy** — titles, descriptions, hooks, tags, source link, errors

## Scripts

| command | what |
| --- | --- |
| `npm run start` | Expo dev server |
| `npm run android` | open on connected Android emulator/device |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run export:android` | production bundle (validates the whole pipeline) |
