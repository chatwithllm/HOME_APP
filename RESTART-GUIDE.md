# HomeApp Restart Guide

_Last updated: 2026-03-22_

This file is the practical restart document for HomeApp.

If work stops now and resumes months or a year later, this should be the first file to read.
It is meant to answer, clearly:
- what the app is
- what stack it uses
- what is already finished
- what is running only as local work vs merged to `main`
- what is still pending
- how receipt upload/OCR currently works
- what must change for Vercel compatibility
- how to restart development without re-learning the whole project the hard way

---

## 1. What HomeApp is

HomeApp is a receipt and shopping workflow application.

It currently includes:
- receipt storage and receipt item storage
- receipt detail and query flows
- shopping recommendations and shopping plan flows
- store/merchant profile support
- admin-quality review surfaces
- export/backup support
- automation/sync event visibility
- browser-based receipt upload, OCR, structured draft review, and save flow

The long-term goal is an end-to-end flow:
1. upload receipt
2. OCR extract text
3. build structured draft
4. review/correct
5. save into receipts ledger
6. use downstream dashboards, quality review, shopping recommendations, and exports

---

## 2. Current architecture

### Core runtime stack
- **Frontend / app runtime:** Next.js App Router
- **Hosting target:** Vercel
- **Database:** Neon PostgreSQL
- **ORM:** Drizzle ORM
- **Validation:** Zod
- **Language:** TypeScript
- **UI:** React 19 + Next 16
- **Styling:** Tailwind CSS v4

### Current infrastructure split
- **Vercel** hosts the web UI and app routes
- **Neon** stores structured application data
- **Vercel Blob** is the intended durable storage for uploaded receipt files in production
- **Local disk** still exists as a development fallback when Blob is not configured
- **Local OCR binaries** currently power OCR in development:
  - `tesseract`
  - `pdftotext` (from `poppler`)
- **Remote OCR worker** is now the intended production OCR direction for Vercel, but is not built yet

### Important deployment reality
The app is now far enough along that the product flow exists, but the production-safe Vercel OCR architecture is still unfinished.
That means:
- upload on Vercel can be Blob-backed already
- private Blob access for OCR is handled in code
- Vercel still cannot run local OCR binaries like `tesseract`
- production OCR must move to an authenticated worker/API path

---

## 3. Technologies currently in use

### Application dependencies
From `package.json`:
- `next`
- `react`
- `react-dom`
- `drizzle-orm`
- `pg`
- `zod`
- `dotenv`
- `@vercel/blob`

### Development dependencies
- `typescript`
- `tsx`
- `eslint`
- `eslint-config-next`
- `drizzle-kit`
- `@types/node`
- `@types/react`
- `@types/react-dom`
- `@types/pg`
- `tailwindcss`
- `@tailwindcss/postcss`

### External/local tools currently used during development
- `tesseract` 5.5.2
- `pdftotext` 26.03.0
- `ffmpeg` available on host
- Homebrew available on host

### Hosting / data / storage ecosystem
- **Vercel** for deployment target
- **Neon** for PostgreSQL database
- **Vercel Blob** for durable media storage target

---

## 4. Environment/config assumptions

### Known environment variables
- `DATABASE_URL`
- `BLOB_READ_WRITE_TOKEN`
- `OCR_PROVIDER`
- `OCR_WORKER_URL`
- `OCR_WORKER_TOKEN`

### Important behavior
- If `BLOB_READ_WRITE_TOKEN` is configured, receipt upload prefers **Blob** storage.
- If it is not configured, local development falls back to writing under local upload paths.
- `OCR_PROVIDER=local` uses local binaries (`tesseract` / `pdftotext`).
- `OCR_PROVIDER=worker` calls a remote authenticated OCR worker.
- On Vercel, the intended production direction is `OCR_PROVIDER=worker`.

### Local OCR dependency assumption
For local OCR to work in development, the host must have:
- `tesseract`
- `pdftotext`

These were installed on the current development machine via Homebrew.

---

## 5. What is completed and merged to main

### Completed and merged
- Phase 11 — Production Build Readiness
- Phase 12 — Vercel Deployment + Production Database
- Phase 13 — Durable Receipt Media Storage
- Phase 14 — Receipt Parsing Quality Rules
- Phase 15 — Item Ledger Accuracy Upgrade
- Phase 16 — Receipt Edit / Correction Tools
- Phase 17 — Receipt Ingestion Improvements
- Phase 18 — Search, Filters, and Query UX Upgrade
- Phase 19 — Shopping Workflow v2
- Phase 20 — Purchase Intelligence + Recommendations
- Phase 21 — Admin / Data Quality Dashboard
- Phase 22 — Export / Backup / Portability
- Phase 23 — Admin Navigation + Discoverability
- Phase 24 — Recommendation Actions + Workflow Loop Closure
- Phase 25 — Export Granularity + Scheduled Backup UX
- Phase 26 — Receipt Ingestion / Parser Confidence v2
- Phase 27 — Store Intelligence + Merchant Profiles
- Phase 28 — Automation / Integrations Follow-through
- Phase 29 — Receipt Upload UI Foundation
- Phase 30 — OCR Extraction Pipeline
- Phase 31 — Structured Receipt Parsing + Review Screen
- Phase 32 — Blob-backed Upload Storage for Vercel

### What that means in plain English
Merged `main` already has:
- upload page
- upload endpoint
- OCR endpoint
- Blob-backed upload support when configured
- structured draft builder and review/save flow
- receipt dashboards and query pages
- receipt detail and edit/correction tooling
- parser confidence storage
- export/admin-quality/automation surfaces
- shopping recommendations and merchant profile logic

---

## 6. What is currently in progress locally and not wrapped up yet

### Phase 33 — OCR Abstraction + Remote Worker Path
Local implementation exists for:
- OCR provider abstraction in `lib/ocr-provider.ts`
- env-based provider selection (`local` vs `worker`)
- local OCR path retained for development
- private Blob-aware OCR retrieval retained for local mode
- app-side worker call path added for production mode
- `.env.example` updated with OCR worker configuration
- local validation already passing

### Important status note
Phase 33 is complete locally and ready to be wrapped/branched/pushed, but is not yet merged to `main` at the stop point captured by this guide.

---

## 7. Current pending roadmap

### Phase 33 — OCR Abstraction + Remote Worker Path
Goal:
- move production OCR execution off the Vercel runtime
- keep local OCR available for development
- use env-configured provider selection (`local` vs `worker`)
- call an authenticated OCR worker from Vercel in production
- preserve Blob-backed file handling for private receipt uploads

### Phase 34 — Final Save Flow + Dashboard Integration
Goal:
- make reviewed upload save flow fully polished and integrated
- redirect into receipt detail/dashboard naturally
- preserve media path, raw text, structured JSON, and item metadata

### Phase 35 — Upload Reliability, Retry, and Reprocessing
Goal:
- processing states
- retry/reprocess failed OCR/parsing
- operator visibility into failures

---

## 8. Current receipt-processing flow

### What works on merged `main`
1. user opens `/service-dashboard/upload`
2. uploads receipt file
3. app stores the file
4. user runs OCR
5. app shows raw OCR text
6. draft builder transforms OCR text into structured draft
7. user reviews/corrects draft
8. reviewed payload is saved via `/api/receipts`

### Current production blocker on Vercel
- private Blob access is handled
- but local OCR binaries like `tesseract` are not available on Vercel
- therefore production OCR must move to `OCR_PROVIDER=worker`

### What is merged vs local
- upload is merged
- OCR route is merged
- draft review/save is merged
- Blob-backed upload storage is merged
- OCR provider abstraction is local WIP at this stop point

---

## 9. Vercel-specific constraints

### What is fine on Vercel
- UI pages
- app routes
- Neon-backed structured data
- upload to Blob
- draft and save flow logic

### What is not production-safe yet
- local OCR binary execution on Vercel (`tesseract`, `pdftotext`)

### Target production architecture for Vercel
Recommended split:
- **Vercel**: app/UI/routes
- **Neon**: structured receipt data, line items, metadata, workflow state
- **Blob**: uploaded receipt files
- **OCR worker**: raw text extraction in production

### Recommended low-cost production direction
To minimize recurring cost:
- keep Vercel for UI
- keep Neon for DB
- use Blob for file storage
- run an authenticated OCR worker on a VM/VPS/local always-on machine

---

## 10. Important files to know

### Core docs
- `Development.md` — phase-by-phase implementation history
- `WHAT-IS-PENDING.md` — quick restart note and next steps
- `RESTART-GUIDE.md` — this file; use as the high-level handoff guide

### Upload/OCR flow files
- `app/api/receipt-media/upload/route.ts`
- `app/api/receipt-media/ocr/route.ts`
- `app/api/receipt-media/draft/route.ts`
- `app/service-dashboard/upload/page.tsx`
- `components/receipt-upload-form.tsx`
- `lib/receipt-draft.ts`
- `lib/receipt-media.ts`
- `lib/ocr-provider.ts` *(local WIP at stop point)*

### Receipt intake/save
- `app/api/receipts/route.ts`
- `lib/receipt-parse-quality.ts`

### Merchant/shopping/admin/export/automation
- `app/service-dashboard/receipts/[id]/page.tsx`
- `app/service-dashboard/admin-quality/page.tsx`
- `app/service-dashboard/export/page.tsx`
- `app/service-dashboard/automation/page.tsx`
- `app/service-dashboard/shopping-plan/page.tsx`
- `app/api/shopping-recommendations/plan/route.ts`
- `app/api/shopping-recommendations/ignore/route.ts`
- `app/api/receipt-item/action/route.ts`
- `app/api/store-profile/route.ts`

### Database layer
- `db/schema.ts`
- `db/client.ts`
- `drizzle.config.ts`

### Scripts
- `scripts/db-test.ts`
- `scripts/migrate-receipt-media-to-blob.ts`

---

## 11. How to restart development later

If resuming after a long gap, do this in order:

### Step 1: read docs
Read in this order:
1. `RESTART-GUIDE.md`
2. `WHAT-IS-PENDING.md`
3. relevant latest sections of `Development.md`

### Step 2: check git status
Run:
```bash
cd /Users/assistant/.openclaw/workspace/HomeApp
git status
```

At this stop point, expect local WIP for:
- `lib/ocr-provider.ts`
- `app/api/receipt-media/ocr/route.ts`
- `.env.example`
- doc files that mention Phase 33

### Step 3: confirm environment
Run:
```bash
node -v
npm -v
```
And verify env/config:
```bash
printenv DATABASE_URL
printenv BLOB_READ_WRITE_TOKEN
printenv OCR_PROVIDER
printenv OCR_WORKER_URL
printenv OCR_WORKER_TOKEN
```
Also verify local OCR tooling if developing locally:
```bash
which tesseract
which pdftotext
```

### Step 4: validate app still builds
Run:
```bash
npm run lint
npm run build
npm run db:test
```

### Step 5: run locally
```bash
npm run dev
```
Open:
- `http://localhost:3001/service-dashboard/upload`
- `http://localhost:3001/service-dashboard/receipts`
- `http://localhost:3001/service-dashboard/admin-quality`
- `http://localhost:3001/service-dashboard/export`
- `http://localhost:3001/service-dashboard/automation`
- `http://localhost:3001/service-dashboard/shopping-plan`

### Step 6: decide which track you are continuing
At the stop point captured by this guide, the safest next move is:
1. wrap and merge Phase 33 cleanly
2. build or configure the OCR worker endpoint
3. switch Vercel production to `OCR_PROVIDER=worker`
4. then continue Phase 34/35 hardening

---

## 12. Development workflow rules already established

For every phase:
1. update docs before starting
2. implement locally first
3. run local validation
   - `npm run lint`
   - `npm run build`
   - `npm run db:test`
4. provide explicit local testing steps
5. create branch only after local tests pass
6. push branch
7. update docs after completion
8. use detailed commit message including:
   - local tests completed
   - branch clean
   - docs updated
9. ask before merging to `main`

This workflow is not optional drift; it is the agreed process.

---

## 13. Known gaps / current reality check

### Product flow is largely real now
The app already supports:
- upload
- OCR route
- structured draft review
- save into receipts

### Main production gap
The remaining major production gap is **Vercel-safe OCR execution**.
That is why Phase 33 exists.

### Current Vercel problem that was observed
Progression observed in production:
1. upload to Blob worked
2. OCR initially failed because Blob URL was treated like a local path
3. private Blob read support was then added
4. next failure revealed that Vercel cannot run `tesseract`
5. therefore OCR must move to a worker/API path in production

### Biggest immediate next engineering need
- finish and ship OCR provider abstraction
- build worker endpoint
- configure Vercel to use worker mode

---

## 14. Recommended next move if restarting cold

If coming back much later with no fresh context, the safest next move is:

1. read this file completely
2. inspect current local WIP for Phase 33
3. wrap/commit/branch/push/merge Phase 33 cleanly
4. build the OCR worker implementation next
5. test the full Vercel upload → worker OCR → draft → save flow

---

## 15. One-line summary

**HomeApp is now a real Vercel + Neon receipt/shopping app with upload, Blob-backed storage, OCR route, draft review, and save flow already in place; the main unfinished production task is moving OCR execution off Vercel and onto a worker via the new Phase 33 provider abstraction.**
ished production task is moving OCR execution off Vercel and onto a worker via the new Phase 33 provider abstraction.**
