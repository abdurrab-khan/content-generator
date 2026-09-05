# Content Generator

AI-powered content generation platform. **Current app:** `podcast-clips` — paste a
YouTube podcast URL, an AI agent (Deepseek via LangChain/LangGraph) finds the viral
moments, and FFmpeg cuts them into ready-to-post short clips.

## Architecture

```
POST /api/projects {url}
   │  (sync) create project → fetch details (yt-dlp) → 201 / 404
   ▼  (async, BullMQ on Redis)
 ┌──────────────────────────┬───────────────────────────────┐
 │ transcript queue         │ video-download queue          │
 │ subtitles (.vtt)         │ high-quality mp4              │
 │ → chunk ~9 min (+30s     │                               │
 │   overlap)               │                               │
 │ → BullMQ flow: N parallel│                               │
 │   `analyze-chunk` jobs   │                               │
 │   (LangChain agent +     │                               │
 │    tools → CLIPS rows)   │                               │
 │ → parent job: merge +    │                               │
 │   dedupe                 │                               │
 └──────────────────────────┴───────────────────────────────┘
                 both tracks done? → cron sweep (every 2 min)
                 → clip-cutting queue → FFmpeg → VIDEOS rows
```

## Stack

Nest.js 11 (ESM) · Prisma 7 + PostgreSQL · Better Auth · BullMQ + Redis ·
LangChain v1 + LangGraph (`@langchain/deepseek`) · yt-dlp · FFmpeg · zod v4 · Vitest

## Prerequisites

- Node.js ≥ 20, pnpm
- Docker (PostgreSQL + Redis via compose)
- Binaries on PATH: `ffmpeg` (✔ installed) and `yt-dlp`
  (`winget install yt-dlp.yt-dlp`) — or set `YTDLP_PATH`/`FFMPEG_PATH` in `.env`

## Setup

```bash
docker compose up -d          # postgres + redis (repo root)
cd api
cp .env.example .env          # then set DEEPSEEK_API_KEY
pnpm install
pnpm prisma:generate
pnpm prisma:migrate           # creates all tables
pnpm db:seed                  # dev user + "podcast-clips" application
pnpm start:dev
```

API: http://localhost:3000/api · Swagger: http://localhost:3000/api/docs

## Apps in this repo

- `api/` — NestJS backend (pipeline, auth, storage)
- `mobile/` — **ClipForge**, the Expo/React Native Android app (see `mobile/README.md`):
  sign-in/up (better-auth), application switching, project pipeline tracking,
  clips/ready/source tabs, video player, gallery downloads, tap-to-copy metadata.

## Usage

```bash
# sign in (seed user)
curl -X POST http://localhost:3000/api/auth/sign-in/email \
  -H 'Content-Type: application/json' \
  -d '{"email":"dev@example.com","password":"password123"}' -c cookies.txt

# create a project (blocks ~2s for details, then pipeline runs in background)
curl -X POST http://localhost:3000/api/projects \
  -H 'Content-Type: application/json' -b cookies.txt \
  -d '{"url":"https://www.youtube.com/watch?v=VIDEO_ID"}'

# watch progress
curl http://localhost:3000/api/projects/PROJECT_ID -b cookies.txt
# → pipelineState: DETAILS_FETCHED → FETCHING_TRANSCRIPT → TRANSCRIPT_READY
#   → ANALYZING → CLIPS_READY / VIDEO_READY → CUTTING → COMPLETED

curl http://localhost:3000/api/videos -b cookies.txt          # final clips
curl http://localhost:3000/api/videos/VIDEO_ID/stream -b cookies.txt -O
```

## Podcast discovery

Find trending / all-time popular podcast episodes on YouTube without pasting
URLs by hand. Each `Application` has a `language` (`ENGLISH` | `HINDI`) that
picks a curated podcaster catalog (Joe Rogan, Diary of a CEO, Lex Fridman… /
Raj Shamani, Nikhil Kamath, Prakhar Gupta… — see
`api/src/modules/discovery/podcasters.catalog.ts`).

```bash
# podcaster catalog for the app's language
curl "http://localhost:3000/api/discovery/podcasters?applicationId=APP_ID" -b cookies.txt

# trending (recent, ranked by views) or popular (all-time most viewed)
curl "http://localhost:3000/api/discovery/podcasts?applicationId=APP_ID&mode=popular&limit=12" -b cookies.txt
# → items: { sourceVideoId, url, title, thumbnail, channelName,
#            podcasterName, durationSeconds, viewCount, likeCount, publishedAt }

# act on a suggestion
curl -X POST http://localhost:3000/api/discovery/podcasts/use -b cookies.txt \
  -H 'Content-Type: application/json' -d '{"applicationId":"APP_ID","url":"https://www.youtube.com/watch?v=..."}'
curl -X POST http://localhost:3000/api/discovery/podcasts/not-interested -b cookies.txt \
  -H 'Content-Type: application/json' -d '{"applicationId":"APP_ID","sourceVideoId":"...","url":"...","title":"..."}'
```

**Never-show-again cache:** suggestions are computed live (flat yt-dlp
searches, hydrated for stats) and are never stored. A `DiscoveredPodcast` row
appears only when you act on a video — `USED` (a project was created from it,
whether via discovery or a manually pasted URL) or `NOT_INTERESTED` — and both
states permanently exclude the video from future results. Videos that already
have a project are excluded too, even with no cache row.


## The system prompt

`api/src/modules/agent/prompts/viral-clips.system.md` — replace the placeholder with
your own prompt. **Keep the contract** documented in the file's header comment
(absolute `[HH:MM:SS]` timestamps, `save_clip` tool, max 5 clips/chunk). In dev the
file is hot-reloaded on every agent run.

## Project layout (api/src)

```
config/        zod-validated env (fail-fast at boot)
database/      global PrismaService (driver adapter, pg)
auth.ts        better-auth instance → /api/auth/*
common/        filters (uniform error envelope + Prisma mapping),
               interceptors (logging, {data,meta} envelope), zod pipe, utils
health/        /api/health — db, redis, yt-dlp & ffmpeg binaries
modules/
  users/  applications/  projects/  clips/  videos/  raw-videos/
  sources/     VideoSourceProvider interface + registry; youtube provider (yt-dlp)
  transcripts/ vtt parsing + ~9min overlapping chunking
  agent/       model factory (Deepseek), prompt loader, per-run bound tools,
               createAgent (LangGraph) service
  media/       ffmpeg cut/probe (execa)
  storage/     storage interface + local-disk impl (S3 later)
jobs/          BullMQ queues, pipeline orchestrator, processors, cutting cron
```

## Extension points (future ideas)

- **New video source** (Twitch, upload): implement `VideoSourceProvider`, register
  it in `SourcesModule` — nothing else changes.
- **New content idea**: new `Application` row; the pipeline is app-agnostic.
- **New LLM**: change `ChatModelFactory`.
- **Captions/effects/music**: add steps in `clip-cutting.processor` / new queues —
  `FfmpegService` is ready for more args.
- **S3**: implement `IStorageService`, rebind in `StorageModule`.

## Scripts

| command | what |
| --- | --- |
| `pnpm start:dev` | dev server (watch) |
| `pnpm build` / `start:prod` | build / run dist |
| `pnpm test` | vitest unit tests |
| `pnpm prisma:migrate` / `prisma:deploy` | dev / prod migrations |
| `pnpm db:seed` | dev user + default application |

## Known limitations (v1)

- English subtitles only (`en.*`); videos without subs fail with a clear error
  (Whisper fallback is a planned extension point).
- YouTube auto-captions have rolling-text artifacts; the parser collapses exact
  adjacent duplicates — analysis quality depends on caption quality.
- Storage is local disk; rotate/delete old projects yourself for now.
