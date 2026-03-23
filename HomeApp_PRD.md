# HomeApp PRD

_Last updated: 2026-03-22_

## 1. Executive Summary

HomeApp is a web-based receipt, shopping, and household purchase intelligence application.

It is designed to help a user:
- upload receipts
- extract and normalize receipt data
- review and correct parsed purchase information
- store receipts and line items in a structured database
- query receipt history
- generate shopping recommendations and shopping plans
- track store/merchant behavior
- monitor data quality
- export data and operational activity

HomeApp is currently built as a **Next.js application** intended to run on **Vercel**, with **Neon PostgreSQL** as the system of record and **Vercel Blob** as the durable media layer for uploaded receipts.

The product has already moved beyond a simple dashboard. It now contains an end-to-end receipt workflow in the app, with the primary remaining production gap being **OCR execution for Vercel-hosted deployments**, which is planned to run through a separate OCR worker.

---

## 2. Product Vision

### Core vision
HomeApp should become a single place to manage household purchase intelligence.

That means combining:
- receipt ingestion
- line-item history
- shopping plan workflows
- merchant/store memory
- data quality review
- export/backup
- automation visibility

### Long-term user value
The user should be able to:
1. upload a receipt from the web
2. automatically extract text
3. review and correct the structured result
4. save it cleanly into the ledger
5. later search, analyze, export, and act on the data

The product should reduce manual tracking while keeping enough review and correction capability that the data stays trustworthy.

---

## 3. Primary Product Areas

### 3.1 Receipt Intake
This is the front door of the system.

It includes:
- receipt upload UI
- media storage
- OCR extraction
- structured draft building
- review before save

### 3.2 Receipt Ledger
This is the durable store of normalized purchase data.

It includes:
- receipt records
- receipt line items
- raw OCR text
- structured parse metadata
- confidence and warning signals

### 3.3 Quality Review
This helps detect bad or suspicious data.

It includes:
- admin-quality page
- parser confidence signals
- low-confidence receipt visibility
- unresolved quantity and suspicious-import review paths

### 3.4 Shopping Intelligence
This uses receipt history to drive future decisions.

It includes:
- shopping recommendations
- shopping plan generation
- merchant-aware preference logic
- store profiles and store intelligence

### 3.5 Portability and Operations
This makes the app usable beyond one-off browsing.

It includes:
- export and backup flows
- automation/sync event visibility
- operator surfaces for admin use

---

## 4. Current User-Facing Features

## 4.1 Receipt features
- receipt dashboards
- receipt detail pages
- receipt query/search pages
- receipt item editing/correction tools
- parser quality visualization
- upload page
- OCR step
- structured draft review and save flow

## 4.2 Shopping features
- shopping plan page
- shopping recommendation actions
- recommendation ignore flows
- merchant/store-aware recommendation context

## 4.3 Store intelligence features
- store profile editing
- store type and merchant metadata
- merchant reliability/default-priority style hints
- merchant-aware recommendation ranking

## 4.4 Admin/ops features
- admin-quality dashboard
- export page
- automation page
- operational event visibility

---

## 5. Technology Stack

## 5.1 Frontend / application framework
- **Next.js 16.1.7**
- **React 19.2.3**
- **App Router** architecture

## 5.2 Backend / runtime
- Next.js server routes
- TypeScript-based server logic
- Node.js runtime

## 5.3 Database
- **Neon PostgreSQL**
- **Drizzle ORM**
- schema-first TypeScript database model

## 5.4 Validation and typing
- **Zod** for request/payload validation
- **TypeScript** throughout app and server logic

## 5.5 Styling/UI
- **Tailwind CSS v4**
- custom component shells and section-card layout system

## 5.6 Media storage
- **Vercel Blob** for production durable upload storage
- local disk fallback for development

## 5.7 OCR tools
### Development/local OCR
- `tesseract`
- `pdftotext` from `poppler`

### Production OCR direction
- authenticated OCR worker
- app-side OCR provider abstraction already merged

---

## 6. Hosting Architecture

## 6.1 Current intended deployment model
- **Vercel** → web app and app routes
- **Neon** → database
- **Vercel Blob** → receipt file storage
- **OCR worker** → production OCR execution outside Vercel

## 6.2 Why this split exists
### Vercel is good at
- UI hosting
- web routes
- app/serverless workflows
- integration with Blob

### Neon is good at
- structured relational receipt data
- queryable line-item history
- durable app state

### Blob is good at
- durable uploaded file storage
- production-safe receipt media storage

### OCR worker is needed because
- Vercel does not reliably provide local OCR binaries like `tesseract`
- production OCR should not depend on Vercel-local binary execution

---

## 7. Database Architecture

The database schema is centered around receipts, receipt items, shopping flows, and merchant/store behavior.

## 7.1 `receipts`
Stores receipt-level information:
- source channel/message metadata
- image/media path
- store name
- receipt date/time
- subtotal/tax/total
- notes
- raw OCR text
- structured JSON metadata
- timestamps

## 7.2 `receipt_items`
Stores line-item information for each receipt:
- receipt linkage
- line number
- description
- quantity
- unit price
- line total
- metadata JSON

## 7.3 `store_profiles`
Stores merchant/store-level metadata:
- store name
- store type
- notes / profile metadata
- updated timestamp

## 7.4 `shopping_lists`
Stores shopping list headers:
- list name
- status
- store hint
- budget hint
- notes
- planned date
- timestamps

## 7.5 `shopping_plan_items`
Stores planned shopping items:
- list linkage
- item name
- normalized name
- category
- expected qty/unit/price/line total
- preferred store
- priority
- status
- notes
- timestamps

## 7.6 `purchase_history`
Stores normalized purchase history for repeat-item intelligence.

## 7.7 `shopping_sync_events`
Stores operational or automation event history.

## 7.8 `shopping_recommendation_ignores`
Stores ignored recommendation rules by normalized item name.

---

## 8. Application Structure

## 8.1 Main app pages
Under `app/` the app includes, among others:
- homepage
- receipts dashboard
- receipt query page
- items page
- shopping plan page
- admin-quality page
- export page
- automation page
- upload page

## 8.2 API routes
Current important routes include:
- `/api/receipts`
- `/api/export`
- `/api/store-profile`
- `/api/receipt-media/upload`
- `/api/receipt-media/ocr`
- `/api/receipt-media/draft`
- shopping recommendation/action routes

## 8.3 Shared domain helpers
Important helper modules include:
- `lib/receipt-draft.ts`
- `lib/receipt-parse-quality.ts`
- `lib/receipt-media.ts`
- `lib/store-profile.ts`
- `lib/shopping-automation.ts`
- `lib/ocr-provider.ts`

---

## 9. Receipt Pipeline Architecture

This is the most important subsystem in the product right now.

## 9.1 Phase 29 — Upload UI Foundation
Completed.

What it added:
- upload page in the web UI
- support for image/PDF upload
- validation and user feedback
- file storage plumbing

## 9.2 Phase 30 — OCR Extraction Pipeline
Completed.

What it added:
- OCR endpoint
- local OCR handling for images and PDFs
- raw OCR text output in the UI

## 9.3 Phase 31 — Structured Draft and Review
Completed.

What it added:
- OCR text → structured draft parser
- editable review UI
- save reviewed result into receipt ledger

## 9.4 Phase 32 — Blob-backed Upload Storage
Completed.

What it added:
- Vercel Blob support for uploaded media
- local fallback for development
- storage mode visibility in upload UI/API

## 9.5 Phase 33 — OCR Provider Abstraction
Completed app-side.

What it added:
- provider layer for OCR
- env-based provider selection
- local OCR path for development
- remote worker path for production

## 9.6 Remaining receipt pipeline gap
The remaining missing production piece is:
- the **OCR worker service** itself

Without that worker, Vercel can host the app and Blob can store files, but production OCR still has no execution engine outside Vercel.

---

## 10. How Receipt Processing Works Today

## 10.1 Intended flow
1. user opens `/service-dashboard/upload`
2. uploads a receipt image or PDF
3. file is stored (Blob in production, local fallback in dev)
4. user clicks **Run OCR**
5. OCR route extracts raw text
6. user clicks **Build draft**
7. app builds structured draft from OCR text
8. user reviews/edits draft
9. user clicks **Save reviewed receipt**
10. app stores final structured receipt in Neon

## 10.2 Receipt save payload
When saving, the app preserves:
- media path
- raw text
- structured JSON
- warnings
- quality flags
- confidence
- item metadata

That means later features can reuse not only the final structured result, but also the OCR and parsing trail.

---

## 11. Merchant and Shopping Intelligence

## 11.1 Merchant/store profiles
Store profiles allow the app to remember merchant-level context.

These include ideas like:
- store type
- notes
- reliability
- shopping tips
- prefer/avoid item hints
- category preferences
- default priority cues

## 11.2 Shopping recommendations
Recommendations are derived from purchase history and shaped by:
- normalized names
- prior store behavior
- shopping ignore rules
- merchant/store profile metadata

## 11.3 Shopping plan integration
Recommendations can be turned into planned items and synced into the shopping plan flow.

---

## 12. Admin, Export, and Operations

## 12.1 Admin Quality
This page exists to surface suspicious or weak receipt data, including parse-quality signals.

## 12.2 Export
The export flow supports:
- filtered export
- JSON and CSV
- full receipts or items-only modes
- backup/export UX

## 12.3 Automation
Automation and sync event surfaces help show operator-facing workflow state and action outcomes.

---

## 13. Environment Variables and Configuration

The app currently expects or supports:

- `DATABASE_URL`
- `BLOB_READ_WRITE_TOKEN`
- `OCR_PROVIDER`
- `OCR_WORKER_URL`
- `OCR_WORKER_TOKEN`

### Intended production configuration on Vercel
- `DATABASE_URL` → Neon
- `BLOB_READ_WRITE_TOKEN` → Vercel Blob token
- `OCR_PROVIDER=worker`
- `OCR_WORKER_URL` → reachable OCR worker endpoint
- `OCR_WORKER_TOKEN` → shared secret for worker auth

### Intended local development configuration
- `DATABASE_URL` set
- `OCR_PROVIDER=local`
- `BLOB_READ_WRITE_TOKEN` optional depending on Blob testing
- local binaries installed:
  - `tesseract`
  - `pdftotext`

---

## 14. Current Production Readiness

## 14.1 What is production-strong already
- application UI
- receipt dashboards and detail views
- shopping pages
- merchant/store profile flows
- export/admin/automation surfaces
- Neon-backed structured receipt storage
- Blob-backed upload storage
- draft/review/save product flow

## 14.2 What is still missing for production receipt OCR
- OCR worker service implementation
- production worker deployment and auth
- Vercel worker-mode env configuration

## 14.3 Current practical status
In plain English:
- the app is already a real working product
- the main remaining engineering need is to finish the OCR execution architecture for Vercel

---

## 15. Roadmap After Phase 33

## Phase 34 — Final Save Flow + Dashboard Integration
Focus:
- polish post-save UX
- make redirects and dashboard integration cleaner
- make the end-to-end experience feel finished

## Phase 35 — Upload Reliability, Retry, and Reprocessing
Focus:
- processing states
- retries and reprocessing
- operator visibility into failed or partial flows

Potential later track:
- OCR worker deployment and maintenance hardening
- worker observability/logging
- optional premium OCR fallback for difficult receipts

---

## 16. Important Files

### Documentation
- `RESTART-GUIDE.md`
- `WHAT-IS-PENDING.md`
- `Development.md`
- `HomeApp_PRD.md`

### Core receipt pipeline files
- `app/api/receipt-media/upload/route.ts`
- `app/api/receipt-media/ocr/route.ts`
- `app/api/receipt-media/draft/route.ts`
- `components/receipt-upload-form.tsx`
- `app/service-dashboard/upload/page.tsx`
- `lib/ocr-provider.ts`
- `lib/receipt-draft.ts`
- `lib/receipt-parse-quality.ts`
- `app/api/receipts/route.ts`

### Shopping / merchant / operator files
- `app/service-dashboard/shopping-plan/page.tsx`
- `app/api/store-profile/route.ts`
- `app/service-dashboard/admin-quality/page.tsx`
- `app/service-dashboard/export/page.tsx`
- `app/service-dashboard/automation/page.tsx`

### Database
- `db/schema.ts`
- `db/client.ts`
- `drizzle.config.ts`

---

## 17. Recommended Next Move

The next best engineering move is:

1. build the OCR worker service
2. configure Vercel to use worker mode
3. validate deployed end-to-end receipt processing
4. continue Phase 34 polish
5. continue Phase 35 reliability work

---

## 18. One-Sentence Summary

**HomeApp is a Vercel + Neon receipt and shopping intelligence application with upload, Blob-backed storage, OCR routing, draft review, save flow, merchant intelligence, exports, and admin tooling already in place; the only major missing production component is the OCR worker that will let Vercel run receipt processing end-to-end.**
