# หมุดหมาย (Mudmai) — Handoff Document

> **Status:** Phase 6 AI Smart Nudge **implemented**. PDPA notice + consent, and post-MVP bug/security hardening, are in the folder.  
> **Project path:** `/Users/bombamkb/Documents/Project/journey-resolution`  
> **Last updated:** 2026-08-14  
> **Audience:** Next coding agent / engineer picking up the build  
> **Business / survival analysis:** [`BUSINESS-HANDOFF.md`](./BUSINESS-HANDOFF.md) — do not use this engineering handoff as the source of pricing or go-to-market facts.

---

## 1. One-liner

A **gamified New Year resolution planner** that turns last-year reflection into a freeform vision board, SMART quarterly goals, flexible daily todos, cadence reminders, and an AI companion that recalls what healed you — so resolutions survive past January.

---

## 2. Locked product decisions (source of truth)

| Topic | Decision |
|--------|----------|
| Name / brand | **หมุดหมาย (Mudmai)** (formerly Journey Resolution) |
| Platform | **Web first** (Next.js), then mobile later |
| Language | **TH / EN** switchable at runtime |
| Auth & data | Account + **cloud sync** (not local-only) |
| Notifications | **In-app inbox always** + **LINE OA push** (Messaging API) as the primary mobile channel when linked; browser notifications optional. No LINE Notify. |

| Year cycle | **Calendar year only** (Jan 1 – Dec 31) |
| Design tone | **Gamified**, vivid colors, purple OK, **emoji pillar accents** |
| Vision board | **Freeform canvas**: drag/drop, images, drawing/scribble (per original app-spec) |
| Goals | **SMART full** + milestones + progress % |
| Todo ↔ Goal | **Optional link** — user chooses per todo: link to a goal, or keep as plain todo |
| Reviews | **Monthly + Quarterly** both required in MVP |
| Killing features (MVP) | **Both:** (A) Reminder cadence + (B) AI Smart Nudge |

### Explicitly later (not MVP)

- Native iOS/Android (Expo)
- Email server push
- Multi-year deep archive analytics beyond the active year

---

## 3. Six life pillars (fixed schema)

All goals, ratings, retrospectives, and metrics map to exactly one:

1. `CAREER` — การงาน (accent: Royal Blue `#2563EB`)
2. `PERSONAL` — ชีวิตส่วนตัว (Purple `#8B5CF6`)
3. `FINANCE` — การเงิน (Emerald `#10B981`)
4. `RELATIONSHIPS` — ความสัมพันธ์ (Pink `#EC4899`)
5. `MENTAL_HEALTH` — สุขภาพจิต (Cyan `#06B6D4`)
6. `PHYSICAL_HEALTH` — สุขภาพกาย (Orange `#F97316`)

UI palette base (from spec, gamified):

- Background: `#F8FAFC`
- Cards: `#FFFFFF`
- Text primary: `#0F172A`
- Text secondary: `#64748B`

---

## 4. Yearly user loop

1. **Onboard / Reflect** — past-year prompts + 1–5 ratings + next-year expectations  
2. **Vision** — freeform canvas vision board  
3. **Quarter plan** — SMART goals + milestones per Q1–Q4  
4. **Execute** — daily todos (+ optional goal link), reminders  
5. **Monthly review** — loved / stop / continue + 6 ratings  
6. **Quarterly review** — goal scorecard + replan next quarter  
7. **Year close** — rolls into next year’s reflection  

---

## 5. MVP feature modules

### Module 1 — Deep onboarding & year reflection

Multi-step wizard (required fields):

1. `lastYearStory` — Tell me about your last year  
2. `happiestMoment` — Happiest period/moment last year  
3. `keyLearnings` — What you learned about yourself  
4. `healingThings` — What healed you (**critical for AI nudge**)  
5. Ratings 1–5 for all 6 pillars  
6. `expectationsNextYear` — What you expect this year  

### Module 2 — Freeform vision board

- Infinite/bounded canvas  
- Nodes: **TEXT**, **IMAGE**, **DRAWING**  
- Drag, drop, scale, rotate, zIndex  
- Pillar tag + filter (highlight/dim by pillar)  
- Persist canvas JSON; optional PNG export  

### Module 3 — Quarterly SMART goals

Per goal:

- title, description/why  
- specific outcome  
- measurable `targetValue` + `unit` + `currentValue`  
- deadline within quarter  
- `status`: NOT_STARTED | IN_PROGRESS | COMPLETED | ABANDONED  
- `year`, `quarter` (1–4), `pillar`  
- **milestones[]**: title, dueDate, isDone, order  
- progress% = `currentValue / targetValue * 100` (guard divide-by-zero)

### Module 4 — Daily todos

- CRUD by date (Today / Yesterday / Upcoming)  
- `goalId` **optional** — user may attach to one QuarterlyGoal or leave unlinked  
- Optional pillar display (inherit from linked goal when present)  
- Unlinked todos still count toward completion stats for reminders / AI slump  

### Module 5A — Killing feature: Reminder cadence

| Cadence | Trigger idea | Action |
|---------|--------------|--------|
| Daily | User-chosen time (e.g. 21:00) | Open Today / complete todos |
| Weekly | e.g. Sunday evening | Win / friction / next-week focus |
| Monthly | Last day of month | Open monthly review |
| Quarterly | Last week of Q | Open quarterly review |

Delivery: in-app reminder inbox always; LINE Official Account push when the user has connected LINE and opted in to private reminders; browser `Notification` API optional. Server cron (`/api/cron/reminders`) is required so reminders fire when the web app is closed.

### Module 5B — Killing feature: AI Smart Nudge

Context-aware companion using onboarding recall.

**Scenario A — Low score**  
Condition: Monthly review `ratingMental <= 2` OR `ratingCareer <= 2`  
Use: `healingThings`, `happiestMoment`  
Tone: warm, non-judgmental, &lt; ~60 words, locale-aware (TH or EN)

**Scenario B — Slump**  
Condition: todo completion rate &lt; 30% over last 7 days  
Use: `expectationsNextYear`  
Tone: caring mentor, brief, no guilt

Log every nudge in `AiNudgeLog`; show cards on Home/Dashboard.

### Module 6 — Reviews

**Monthly**

- `whatILovedMost`, `whatToStop`, `whatToContinue`  
- 1–5 ratings × 6 pillars  
- Unique per `(userId, year, month)`  
- Trend charts (radar or multi-line)

**Quarterly**

- Goal scorecard for the quarter  
- Narrative + adjust next quarter plan  
- 6 pillar ratings  
- Unique per `(userId, year, quarter)`

### Also in MVP

- Auth (sign up / sign in / session)  
- Home / Today dashboard  
- Month calendar  
- Year dashboard (area scores over time)  
- Settings: language, reminder prefs, export  

---

## 6. Suggested screen map

1. Welcome / Auth (+ language toggle)  
2. Year Intro  
3. Last-Year Reflection (wizard)  
4. Next-Year Expectation  
5. Vision Board (canvas)  
6. Quarterly Planning (SMART + milestones)  
7. Home / Today  
8. Daily Todo detail  
9. Month Calendar  
10. Reminders Center  
11. Monthly Review  
12. Quarterly Review  
13. Year Dashboard  
14. Settings  

---

## 7. Data model notes (extend original Prisma spec)

Original spec path (reference only): `/Users/bombamkb/Downloads/app-spec.md`  
Keep pillars, reflection, vision items, goals, todos, monthly review, AI nudge log — **plus**:

| Entity | Must include |
|--------|----------------|
| `User` | email, name, `preferredLocale` (`th` \| `en`), reminder prefs, `pdpaConsentAt`, `pdpaConsentVersion`, optional `LineAccount` |
| `PastYearReflection` | story, happiest, learnings, healingThings, expectations, 6 ratings |
| `VisionBoardItem` | pillar, type IMAGE\|TEXT\|DRAWING, geometry, content/url |
| `QuarterlyGoal` | SMART fields, status, target/current/unit, year, quarter, pillar |
| `Milestone` | goalId, title, dueDate, isDone, order |
| `DailyTodo` | date, title, isCompleted, **optional goalId**, optional pillar |
| `MonthlyReview` | loved/stop/continue + 6 ratings + unique(user, year, month) |
| `QuarterlyReview` | year, quarter, narratives, goal outcomes, 6 ratings |
| Reminder prefs / logs | cadence, schedule, lastSent, channel |
| `AiNudgeLog` | triggerReason, nudgeText, contextUsed, isRead |

---

## 8. Recommended tech (web-first)

| Layer | Choice |
|-------|--------|
| App | Next.js (App Router) + TypeScript |
| i18n | next-intl (TH/EN) |
| State | Zustand and/or React Query as needed |
| Auth + DB | Supabase Auth + Postgres (+ RLS) |
| ORM | Prisma **or** Supabase client — pick one and stay consistent |
| Vision canvas | tldraw / fabric-style canvas library |
| AI | OpenAI or Claude API for nudges |
| Storage | Supabase Storage for vision images |
| PWA | Make installable / mobile-web friendly for later native path |

---

## 9. Implementation phases

| Phase | Deliverable |
|-------|-------------|
| 0 | Scaffold, gamified design tokens, i18n shell, auth |
| 1 | Reflection onboarding + expectations + ratings |
| 2 | Freeform vision board + persistence |
| 3 | SMART goals + milestones + quarterly views |
| 4 | Daily todos (optional goal link) + calendar + dashboard |
| 5 | Reminder engine + monthly/quarterly reviews + charts |
| 6 | AI Smart Nudge triggers + Home cards + polish |

---

## 10. Current engineering status (important)

- Planning and decisions are **finalized** (this doc).  
- **Phase 0 is scaffolded** in this folder (Next.js, i18n, Prisma, auth, Home shell).
- **Phase 1 is implemented:** `/onboarding` multi-step wizard.
- **Phase 2 is implemented:** `/vision` tldraw canvas.
- **Phase 3 is implemented:** `/goals` SMART quarterly goals + milestones + progress% + Q1–Q4 views.
- **Phase 4 is implemented:** daily todos (optional goal link) + Home today dashboard + month calendar.
- **Phase 6 is implemented:** AI Smart Nudge (low mental/career monthly scores + 7-day todo slump) on Home, with `AiNudgeLog` and optional OpenAI.
- **PDPA:** public `/privacy` notice (TH/EN), signup checkbox, `/privacy/consent` gate, Settings export + delete account.
- Next agent should:
  1. `cp .env.example .env.local` and fill Supabase + Postgres URLs
  2. Create a public Storage bucket named `vision-board` (for vision images)
  3. `npx prisma migrate dev --name init` (includes `pdpaConsentAt` / `pdpaConsentVersion` on `User`)
  4. Run `prisma/rls.sql` in the Supabase SQL editor (deny PostgREST `anon` / `authenticated`)
  5. Optional: add `OPENAI_API_KEY` for live model copy (templates work without it)
  6. Optional: `SUPABASE_SERVICE_ROLE_KEY` so Settings → Delete account also removes the Auth user
  7. `npm run dev`  

---

## 11. Decisions that changed during planning (for context)

| Earlier draft | Final lock |
|---------------|------------|
| Calm wellness design | **Gamified** vivid + emoji pillars |
| Reminder-only killing feature | **Reminder + AI Nudge** both in MVP |
| Text-first vision board | **Freeform canvas** (spec) |
| Todos always linked to goals | **Optional** link per todo |
| Expo-first (in Downloads spec) | **Web first** |

---

## 12. How to start (checklist for next agent)

```text
[x] Open folder: /Users/bombamkb/Documents/Project/journey-resolution
[x] git init (if not already a repo)
[x] Create Next.js + TS app
[x] Add next-intl (th/en)
[x] Add Supabase auth + env template (.env.example only; no secrets committed)
[x] Design tokens + pillar color map + emoji labels
[x] Prisma/schema (or Supabase SQL) covering entities in §7
[x] Auth pages + empty Home shell
[x] Then continue Phase 1 onboarding wizard
[x] Phase 2 freeform vision board
[x] Phase 3 SMART quarterly goals + milestones
[x] Phase 4 daily todos (optional goal link) + calendar + Home dashboard
[x] Phase 5 reminder cadence + monthly/quarterly reviews + charts
[x] Phase 6 AI Smart Nudge (low score + 7-day slump) + Home cards + polish
[x] PDPA notice + consent + delete-account; timezone/year, Home nudge TTFB, reminder window, vision nav, upload allowlist
```

Do **not** commit secrets. Do **not** start Expo native in MVP unless product owner changes scope.

---

## 13. Related artifacts

- This handoff: `HANDOFF.md` (canonical for build start)  
- Business handoff (pricing, unit economics, survival questions): `BUSINESS-HANDOFF.md`  
- Earlier detailed PRD/spec (partially superseded): `/Users/bombamkb/Downloads/app-spec.md`  
- Cursor plan canvas (may live under Cursor projects):  
  `~/.cursor/projects/empty-window/canvases/journey-resolution-plan.canvas.tsx`  

**If conflicts:** this `HANDOFF.md` wins over `app-spec.md` and older chat drafts.

---

## 14. Owner confirmation quote

Product owner confirmed before handoff:

1. Name หมุดหมาย (Mudmai); originally planned as Journey Resolution  
2. Start Web first  
3. MVP killing features: both Reminder + AI  
4. Vision board: canvas drag + image + draw  
5. Todo↔Goal: optional user choice  
6. Goals: SMART + milestones + progress %  
7. Quarterly review: yes, clear in MVP  
8. Language: TH/EN  
9. Design: gamified + vivid / purple / emoji pillars  
10. Go-ahead to start was given; folder path later set to Documents path above  

---

*End of handoff. Phase 0–6 (MVP) plus PDPA and post-MVP hardening are in the project folder.*
