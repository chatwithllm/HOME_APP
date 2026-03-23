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
- upload/OCR/draft review work in progress for browser-based receipt intake

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
- **Vercel** is intended to host the web UI and app routes
- **Neon** stores structured application data
- **Vercel Blob** is the intended durable storage for uploaded receipt files in production
- **Local disk** still exists as a development fallback when Blob is not configured
- **Local OCR binaries** currently power OCR in development:
  - `tesseract`
  - `pdftotext` (from `poppler`)

### Important deployment reality
The app is moving toward a **Vercel + Neon** production shape.
That means:
- local-disk-only upload paths are not production-safe
- local OCR binaries running inside Vercel are not the final production answer
- durable upload storage should be Blob-backed
- OCR should eventually be abstracted away from the Vercel runtime

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

### Important behavior
- If `BLOB_READ_WRITE_TOKEN` is configured, receipt upload should prefer **Blob** storage.
- If it is not configured, local development falls back to writing under local upload paths.

### Local OCR dependency assumption
For local OCR to work in development, the host must have:
- `tesseract`
- `pdftotext`

These were installed on the current development machine via Homebrew.

---

## 5. What is completed and merged to main

The older roadmap through Phase 28 is already merged.

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

### What that means in plain English
Merged `main` already has:
- upload page
- upload endpoint
- OCR endpoint
- receipt dashboards and query pages
- receipt detail and edit/correction tooling
- parser confidence storage
- export/admin-quality/automation surfaces
- shopping recommendations and merchant profile logic

---

## 6. What is currently in progress locally and not wrapped up yet

At the moment of writing this guide, there is **local in-progress work** for:

### Phase 31 — Structured Receipt Parsing + Review Screen
Local implementation exists for:
- raw OCR text → structured draft parsing
- draft review UI on upload page
- correction before save
- saving reviewed receipts into `/api/receipts`
- local validation already passing
- wrapped on branch `phase-31-structured-receipt-parsing-review-screen`, awaiting merge decision

### Also locally in progress
A **Phase 32 — Blob-backed Upload Storage for Vercel** change exists locally:
- upload route prefers **Vercel Blob** when `BLOB_READ_WRITE_TOKEN` exists
- otherwise falls back to local storage
- upload UI displays `storage: blob|local`
- local validation already passing
- wrapped on branch `phase-32-blob-backed-upload-storage-for-vercel`, awaiting merge decision

### Also locally in progress
A **Phase 33 — OCR Abstraction + Remote Worker Path** change exists locally:
- OCR route accepts either local file paths or remote Blob URLs
- remote Blob files are downloaded to a temp file before OCR
- local OCR remains available for development
- local validation already passing

### Important status note
These local changes were **not formally wrapped up** at the time of this guide.
That means:
- docs may not yet fully reflect them in the phase history files
- they may be sitting as local modifications on `main`
- they should be reviewed, tested again, then wrapped up properly before merge

If restarting later, treat these as **local WIP**, not guaranteed merged state.

---

## 7. Current pending roadmap

### Phase 31 — Structured Receipt Parsing + Review Screen
Goal:
- parse OCR text into structured receipt draft
- show warnings/confidence
- review/correct before save

### Phase 32 — Blob-backed Upload Storage for Vercel
Goal:
- replace local-disk-first upload storage with Vercel-compatible durable Blob storage while keeping local fallback for development

### Phase 33 — OCR Abstraction + Remote Worker Path
Goal:
- separate OCR execution from the Vercel runtime so production OCR can run through a worker or API

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

### What works now conceptually
1. user opens `/service-dashboard/upload`
2. uploads receipt file
3. app stores the file
4. user runs OCR
5. app shows raw OCR text
6. draft builder can transform OCR text into structured draft
7. user reviews/corrects draft
8. reviewed payload is saved via `/api/receipts`

### What is merged vs local
- upload is merged
- OCR is merged
- draft review/save is local WIP at the time of this guide

---

## 9. Vercel-specific constraints

### What is fine on Vercel
- UI pages
- app routes
- Neon-backed structured data
- review and save flows conceptually

### What is not ideal on Vercel as local-only implementation
- local disk as durable media storage
- local OCR binaries as the long-term production OCR engine

### Target production architecture for Vercel
Recommended split:
- **Vercel**: app/UI/routes
- **Neon**: structured receipt data, line items, metadata, workflow state
- **Blob**: uploaded receipt files
- **OCR worker or OCR API**: raw text extraction

### Recommended low-cost production direction
To minimize recurring cost:
- keep Vercel for UI
- keep Neon for DB
- use Blob for file storage
- use a low-cost/self-hosted OCR worker on a VM/VPS/local always-on box

---

## 10. Important files to know

### Core docs
- `Development.md` — phase-by-phase implementation history
- `WHAT-IS-PENDING.md` — quick restart note and next steps
- `RESTART-GUIDE.md` — this file; use as the high-level handoff guide

### Upload/OCR flow files
- `app/api/receipt-media/upload/route.ts`
- `app/api/receipt-media/ocr/route.ts`
- `app/api/receipt-media/draft/route.ts` _(local WIP at time of writing)_
- `app/service-dashboard/upload/page.tsx`
- `components/receipt-upload-form.tsx`
- `lib/receipt-draft.ts` _(local WIP at time of writing)_
- `lib/receipt-media.ts`

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

This matters because local WIP may still exist for:
- Phase 31 draft review/save
- Blob storage adaptation

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
Pick one:
- finish Phase 31 local WIP and wrap it up properly
- continue Vercel compatibility work
- start OCR worker abstraction work
- productionize upload/retry/job-state handling

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

### Merged state is not yet fully Vercel-safe for OCR end-to-end
Even though upload and OCR features exist, the fully production-safe Vercel-compatible architecture still needs finishing.

### The biggest unresolved production concerns
- durable production media storage path should be Blob-backed consistently
- OCR should not rely forever on local binaries in a Vercel runtime
- job/retry/reprocessing state should become explicit in Neon

### The biggest local WIP risk
If resuming later, do not assume all current local changes were wrapped properly.
Check git status first.

---

## 14. Recommended next move if restarting cold

If coming back much later with no fresh context, the safest next move is:

### Option A — finish current local WIP cleanly
- inspect local modifications
- test them
- document them
- branch/push/merge in order

### Option B — if local WIP is stale or suspect
- copy or branch it aside
- reset to clean `main`
- restart Phase 31 or Blob adaptation intentionally

### Practical recommendation
If the current local Phase 31 work still passes tests and behaves correctly, finish that first.
Then continue the Vercel compatibility path in a disciplined way.

---

## 15. One-line summary

**HomeApp is a Next.js + Vercel + Neon receipt/shopping app with upload and OCR already built, draft review/save in local progress, and the main remaining architecture work centered on making the receipt pipeline fully Vercel-compatible via Blob-backed storage and a production-safe OCR execution path.**
