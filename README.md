# หมุดหมาย (Mudmai)

Gamified New Year resolution planner (web-first). Product source of truth: [`HANDOFF.md`](./HANDOFF.md).

## Phase 0–6 (MVP)

- Next.js App Router + TypeScript + Tailwind
- `next-intl` with `/th` and `/en`
- Supabase Auth (email/password) + Prisma schema for MVP entities
- Welcome, login, signup, Home shell, last-year onboarding wizard
- Freeform vision board (`/vision`) with tldraw: text, images, drawing, pillar filter, PNG export
- Quarterly SMART goals (`/goals`) with milestones, progress %, and Q1–Q4 views
- Daily todos (`/todos`, Home today) with optional goal link, plus month calendar (`/calendar`)
- Reminder cadence (`/reminders`, `/settings`) — in-app inbox + LINE OA push when linked + optional browser notifications
- LINE Login (`openid` only) on `/login` and `/signup`; account linking and separate broadcast opt-in in Settings
- Monthly + quarterly reviews (`/reviews`) with radar/trend charts and JSON export
- AI Smart Nudge on Home: low monthly mental/career scores, or todo completion under 30% over 7 days (OpenAI if `OPENAI_API_KEY` is set, otherwise local templates)
- PDPA: `/privacy` notice (TH/EN), consent at signup and `/privacy/consent`, export + delete account in Settings

## Setup

1. Copy env template (never commit secrets):

```bash
cp .env.example .env.local
```

2. Fill `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `DATABASE_URL`, and `DIRECT_URL` from the Supabase project.

3. Create a **public** Storage bucket named `vision-board` (used for vision-board images).

4. Push the Prisma schema (includes RLS deny policies for PostgREST):

```bash
npx prisma migrate dev
```

If an older database already ran [`prisma/rls.sql`](./prisma/rls.sql) by hand, still run the latest migration so `RateLimitBucket` and FORCE RLS exist.

5. Optional: set `OPENAI_API_KEY` in `.env.local` for live AI copy. Optional: `SUPABASE_SERVICE_ROLE_KEY` so account deletion also removes the Auth user and vision-board files. For local demo without Supabase, set `JR_ALLOW_DEMO=true` (never on a public host). LINE Login + Messaging API: fill the `LINE_*` keys in `.env.example` (never LINE Notify). Production cadence push needs `CRON_SECRET` hitting `GET/POST /api/cron/reminders` every 10 minutes.

6. Run the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Locale routes are `/th` and `/en`.

Auth pages work only after Supabase env vars are set. Home, vision, goals, todos, calendar, reviews, reminders, and settings still run in demo mode **in development** if Auth is not configured **and** `JR_ALLOW_DEMO=true`. Production never falls back to demo.
