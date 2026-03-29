# Smart Receipts Development

> For a long-gap restart, deployment architecture, tech stack, and merged-vs-local state summary, read `RESTART-GUIDE.md` first.

## Current Truth (read this first)

### Production direction
- **Frontend/runtime:** Vercel
- **Database:** Neon PostgreSQL
- **Durable media target:** Vercel Blob
- **Current dev OCR tools:** local `tesseract` + `pdftotext`

### Merged to `main`
- Phase 11–33 are complete and merged.
- That includes upload UI, Blob-backed storage, OCR extraction, structured draft review, save flow, and app-side OCR provider abstraction.

### Local work in progress
- OCR worker service implementation is now in progress locally on branch `phase-34-ocr-worker-service`.
- Hybrid receipt-processing plan is now documented in `HYBRID_RECEIPT_PROCESSING_PLAN.md`.

### Immediate next priorities
1. finish and validate the OCR worker endpoint/service locally
2. deploy/configure the OCR worker
3. set Vercel to `OCR_PROVIDER=worker`
4. continue Phase 34 final save-flow/dashboard polish
5. continue Phase 35 retry/reprocessing hardening
6. implement provider selection + explicit OpenAI fallback consent
7. implement receipt-only OpenAI fallback processing

### What to read next
- `RESTART-GUIDE.md` → complete handoff
- `WHAT-IS-PENDING.md` → short next-step tracker
- the rest of this file → historical phase log / archive

---

## Historical Phase Log

## Phase 1 — Project Bootstrap

Status: Completed, reviewed, and approved by Tony for git push.

Objective:
Build the initial Smart Receipts application shell in `HomeApp` using Next.js App Router, with a polished homepage and working route structure for future receipt, query, shopping, and Home Assistant features.

What was built:
- Next.js App Router application scaffold in `HomeApp`
- Tailwind CSS v4 setup
- Homepage for **Smart Receipts**
- Route shells for:
  - Dashboard
  - Receipt Query
  - Shopping Plan
  - HomeAssistant
  - Ideas Log
- Shared shell/card components for consistent page structure
- `Development.md` introduced for phased tracking

Visual decisions finalized in Phase 1:
- No sidebar
- No navigation arrows for routing
- No glassmorphism
- Warm harvest-style palette applied after review iterations
- Brighter overall presentation with lighter surfaces and sharper contrast

Validation completed:
- `npm install` ✅
- `npm run dev` ✅
- `npm run lint` ✅
- Local app verified at `http://localhost:3001`

Implementation notes:
- Existing legacy SQLite file `service_status.db` remains untouched for migration/reference in later phases
- PostgreSQL, Drizzle schema, and ingestion APIs are intentionally deferred to Phase 2+
- During development, stale CSS persisted from the running Next dev server; clearing `.next` and restarting resolved theme token mismatch

Next phase preview:
- Phase 2 will establish the PostgreSQL schema, Drizzle ORM setup, and database test path for receipts, receipt items, store profiles, and shopping tables

## Phase 2 — PostgreSQL Database Setup

Status: Completed in code; documentation updated after verification.

Objective:
Establish the PostgreSQL foundation for Smart Receipts using Drizzle ORM, including receipt, store, and shopping workflow tables with the indexing needed for receipt lookup, analytics, and future shopping intelligence flows.

What was built:
- `db/schema.ts`
- `db/client.ts`
- `drizzle.config.ts`
- PostgreSQL table definitions for:
  - `receipts`
  - `receipt_items`
  - `store_profiles`
  - `shopping_lists`
  - `shopping_plan_items`
  - `purchase_history`
  - `shopping_sync_events`
  - `shopping_recommendation_ignores`
- Required indexes for:
  - receipt date lookups
  - store + receipt date queries
  - receipt item receipt linkage
  - normalized item name queries
  - purchase history time-based lookups
  - shopping sync event list lookups
- Unique protection for `shopping_recommendation_ignores.normalized_name`
- `db:test` script wiring in `package.json`
- Homepage cleanup and route-card simplification after review iterations
- New top navigation treatment using existing app colors only, with these labels:
  - Dashboard
  - Receipt Queries
  - Shopping
  - Home Assistant
  - Ideas
- Subpage return path via a separate `Home` button outside the 5-value nav set

Validation completed:
- Database schema files present and wired for PostgreSQL/Drizzle ✅
- Shopping-related indexes and unique index verified in schema/log output ✅
- Local app configuration still aligned to `http://localhost:3001` ✅

Implementation notes:
- Phase 2 is complete in the codebase even though this document previously said "in progress"
- This phase establishes the data model only; receipt ingestion API work remains Phase 3
- Existing route shells and dashboard pages may exist ahead of prompt order, but Phase tracking should continue using the prompt as the canonical milestone list

Next phase preview:
- Phase 3 will implement the receipt ingestion API at `POST /api/receipts` and return `{ ok: true, receipt_id }`

## Phase 3 — Receipt Ingestion API

Status: Completed locally and verified.

Objective:
Implement the first receipt write path with a `POST /api/receipts` endpoint that can create a receipt row in PostgreSQL and return the inserted record id.

What was built:
- `app/api/receipts/route.ts`
- `POST /api/receipts` endpoint
- Empty-body-safe request parsing so the prompt's bare curl example works
- Zod validation for optional receipt payload fields
- Insert flow into the `receipts` table
- JSON response in the required shape:
  - `{ ok: true, receipt_id }`

Validation completed:
- `curl -X POST http://localhost:3001/api/receipts` ✅
- Response returned `ok: true` with a created `receipt_id` ✅
- `npm run lint` ✅

Implementation notes:
- The endpoint currently supports both an empty body and a structured JSON payload
- Validation errors return `400` with issue details
- Unexpected errors return `500` with an error message
- This phase establishes the first live receipt insert path; richer ingestion/receipt detail workflows remain for later phases

Next phase preview:
- Phase 4 will build `/service-dashboard/receipts` with high-level receipt stats such as count, total spend, total tax, and distinct stores

## Phase 4 — Receipt Dashboard

Status: Completed locally and ready for branch push.

Objective:
Build the receipt dashboard at `/service-dashboard/receipts` with high-level KPIs backed by PostgreSQL instead of placeholder values.

What was built:
- Live dashboard query for:
  - receipt count
  - total spend
  - total tax
  - distinct stores
- Empty-state-safe rendering when the database has no receipt rows
- Simplified dashboard layout after review by removing the extra right-side status card
- KPI cards now use the full content width

Validation completed:
- `npm run lint` ✅
- `/service-dashboard/receipts` loads locally at `http://localhost:3001` ✅
- KPI cards render with live aggregate values or a clean zero-state ✅

Implementation notes:
- Aggregates are queried directly from PostgreSQL at page render time
- Currency values are formatted in USD for the current dashboard view
- This phase focuses only on the high-level KPI summary required by the prompt; deeper receipt drill-down comes later

Next phase preview:
- Phase 5 will build the receipt detail page with metadata, items, image, raw OCR, structured JSON, and store profile controls

## Phase 5 — Receipt Detail Page

Status: Completed locally and ready for branch push.

Objective:
Build a usable receipt detail page with receipt metadata, item rows, image handling, raw OCR, structured JSON, and store profile controls.

What was built:
- Dynamic receipt detail route at `/service-dashboard/receipts/[id]`
- Metadata display for a single receipt record
- Receipt items table
- Receipt image preview/path panel
- Raw OCR section
- Structured JSON section
- `POST /api/store-profile` endpoint
- Store type selector UI with save support
- Dashboard usability improvement: recent receipts list with clickable `View receipt` links
- Detail-page back navigation to return to the receipt dashboard

Validation completed:
- `http://localhost:3001/service-dashboard/receipts/1` loads ✅
- `POST /api/store-profile` verified ✅
- Dashboard receipt links open detail pages ✅
- `npm run lint` ✅

Implementation notes:
- Detail pages currently depend on existing receipt ids in PostgreSQL
- Image preview renders for HTTP/HTTPS/root-relative paths and falls back to a stored path note otherwise
- The dashboard now exposes recent receipt links so Phase 5 is actually usable without manual URL editing

Next phase preview:
- Phase 6 will add currency conversion and INR display toggling

## Phase 6 — Currency Conversion

Status: Completed locally and ready for branch push.

Objective:
Add a USD/INR display toggle with local preference persistence so receipt totals can be viewed in INR without changing the underlying stored currency values.

What was built:
- Shared currency utility in `lib/currency.ts`
- Client-side currency preference state with localStorage persistence
- Reusable USD/INR toggle component
- Reusable currency amount display component
- Toggle integrated into the receipt dashboard and receipt detail page
- INR conversion applied to dashboard totals, recent receipt totals, receipt totals, and receipt item amounts

Validation completed:
- Dashboard loads locally ✅
- Receipt detail page loads locally ✅
- `npm run lint` ✅
- Currency preference persists via localStorage ✅

Implementation notes:
- Phase 6 currently converts USD values to INR for presentation only; stored database values remain unchanged
- The toggle defaults to USD and remembers the last selected mode in localStorage
- Existing non-USD values continue to render in their original currency

Next phase preview:
- Phase 7 will build the receipt query page with quick filters and manual date formats

## Phase 7 — Receipt Query Page

Status: Completed locally and ready for branch push.

Objective:
Build a usable receipt query page with quick filters and manual date-format searches so receipt lookup does not depend on raw SQL or manual URL guessing.

What was built:
- Working `/service-dashboard/receipt-query` page
- Quick filters for:
  - Last 10
  - Today
  - This month
  - This year
  - Costco
  - Amazon
  - Walmart
- Manual input support for:
  - `YYYY-MM-DD`
  - `YYYY-MM`
  - `YYYY`
- Query result table with clickable `View receipt` links
- Currency toggle support in query results
- Query validation feedback for invalid manual date formats

Validation completed:
- `http://localhost:3001/service-dashboard/receipt-query?preset=last-10` loads ✅
- Quick filters return results locally ✅
- Manual date parsing works for the supported formats ✅
- `npm run lint` ✅

Implementation notes:
- Query results currently order by receipt date and fallback to created time when needed
- Manual entry is intentionally restricted to the prompt’s supported date formats
- Merchant quick filters use store-name matching for Costco, Amazon, and Walmart

Next phase preview:
- Phase 8 will build shopping integration via `POST /api/receipt-item/action`

## Phase 8 — Shopping Integration

Status: Completed locally and ready for branch push.

Objective:
Add receipt-item actions that can feed a shopping workflow by normalizing item names, ensuring shopping lists exist, merging duplicates, and inserting new shopping plan items when needed.

What was built:
- `POST /api/receipt-item/action`
- Supported actions:
  - `buy_again`
  - `running_low`
  - `watch`
- Item-name normalization utility in `lib/normalize-item.ts`
- Automatic open-list creation for shopping actions
- Duplicate merge behavior using normalized item names within the same shopping list
- New shopping plan item insertion when no matching item exists
- Receipt detail UI action buttons for each receipt item row
- Button polish pass so action labels stay on one line and all three action buttons share the same size

Validation completed:
- End-to-end `buy_again` action test succeeded ✅
- Repeating the same action merged into the existing shopping plan item ✅
- Receipt detail page shows working action buttons ✅
- `npm run lint` ✅

Implementation notes:
- Current action-to-list mapping is:
  - `buy_again` → `Buy Again`
  - `running_low` → `Running Low`
  - `watch` → `Watch`
- Item quantities merge when both the existing shopping entry and the incoming receipt item contain quantity values
- Phase 8 currently focuses on the receipt-detail integration path; richer shopping-plan management remains for later phases

Next phase preview:
- Phase 9 will add duplicate purchase detection with a 14-day window and conflict handling

## Phase 9 — Duplicate Purchase Detection

Status: Completed locally and ready for branch push.

Objective:
Protect shopping actions from re-adding items that were purchased too recently by checking a 14-day window and returning a conflict that requires explicit confirmation.

What was built:
- 14-day duplicate purchase detection in `POST /api/receipt-item/action`
- `409 Conflict` response for recently purchased items
- Force-confirm path so a second explicit action can still proceed
- Receipt-item action UI updated to surface the duplicate-purchase confirmation state inline
- Action area layout refinements after review:
  - no secondary confirmation box
  - centered success state text
  - action text styled as floating controls without button background or border
  - items table tightened to avoid wrapping headers and horizontal scrolling

Validation completed:
- Initial duplicate purchase action returns `409` ✅
- Confirmed repeat action succeeds ✅
- `npm run lint` ✅
- UI confirmation state verified locally on receipt detail page ✅

Implementation notes:
- Duplicate detection currently checks recent purchase history by matching normalized item names against receipt items from the last 14 days
- Conflict responses include recent purchase metadata for future richer confirmation UX
- Confirmation currently happens via a second click on the highlighted action label

Next phase preview:
- Phase 10 will build the CLI receipt query tool

## Phase 10 — CLI Query Tool

Status: Completed locally and ready for branch push.

Objective:
Provide a scriptable CLI path for querying receipts by recent count, day, month, year, or store without relying on the web UI.

What was built:
- `scripts/receipt_query.ts`
- Supported commands:
  - `last 10`
  - `day YYYY-MM-DD`
  - `month YYYY-MM`
  - `year YYYY`
  - `store Costco`
- `--json` output mode
- Plain text output mode
- Input validation for supported date formats
- Quiet dotenv loading so CLI output stays clean

Validation completed:
- `npx tsx scripts/receipt_query.ts last 10 --json` ✅
- CLI returns receipt rows from PostgreSQL ✅
- `npm run lint` ✅

Implementation notes:
- The CLI uses the same PostgreSQL data source as the web application
- Store queries currently use store-name matching
- Date queries operate on receipt dates, with output falling back to created time where needed for display

Phase summary:
- Core phased build from Phase 1 through Phase 10 is now implemented

## Phase Execution Workflow

For every phase from Phase 11 onward:
- Create or confirm a dedicated branch for that phase.
- Complete the scoped work for that phase only.
- Commit the changes with a phase-specific commit message.
- Push the branch to git.
- Update `Development.md` with what was completed and how it was validated.
- Always provide Tony explicit local testing steps with enough detail to reproduce the phase locally.
- If Tony says the phase looks good, then explicitly ask whether to merge the phase branch into `main`.
- After merge, report what is now completed and what the next phase is before proceeding.

## Post-Phase UX Adjustments — Dashboard Recent Receipts

Status: Completed locally and ready for branch push.

Objective:
Align the `/service-dashboard/receipts` Recent receipts section with the Receipt Queries experience so the list behaves consistently across phones, tablets, and wider desktop layouts.

What changed:
- Dashboard Recent receipts now uses the same responsive pattern as Receipt Queries:
  - mobile renders compact stacked cards
  - `md` and larger screens render a table
- Desktop row styling preserves the soft row background without the white separator artifacts seen in prior iterations
- Mobile cards were updated to match the two-line Receipt Queries layout instead of a custom three-line variant
- Dashboard Recent receipts ordering now uses `receiptDate DESC` with `createdAt DESC` as a fallback instead of relying only on import time

Validation completed:
- Mobile and desktop layouts now follow the same visual pattern as Receipt Queries ✅
- Recent receipts are sorted by receipt date with stable fallback ordering ✅
- `npm run lint` pending branch validation

## Phase 11 — Production Build Readiness

Status: Completed locally and ready for branch push.

Objective:
Make the app production-build clean so Vercel deployment work is blocked by real infrastructure choices rather than preventable TypeScript/build failures.

What was built:
- Fixed production-only typed-route issues surfaced by Next.js build enforcement
- Updated route typing in:
  - `app/page.tsx`
  - `app/service-dashboard/receipt-query/page.tsx`
  - `components/top-nav.tsx`
- Fixed shopping list creation typing in `app/api/receipt-item/action/route.ts` so production TypeScript checks pass cleanly
- Preserved the earlier Costco quantity inference and recent receipts UI updates while making the code production-build safe
- Documented the per-phase workflow in `Development.md` for all future phases

Validation completed:
- `npm run build` ✅
- `npm run lint` ✅
- Production build completes with static/dynamic routes generated successfully ✅

Implementation notes:
- Phase 11 focused on code-level production readiness only, not infrastructure provisioning
- The app is now build-clean for Vercel-style deployment, but production hosting still needs database configuration and durable receipt-media storage decisions

Next phase preview:
- Phase 12 will connect the app to Vercel and a production database for a real hosted URL

## Phase 12 — Vercel Deployment + Production Database

Status: Completed with first hosted deployment live.

Objective:
Connect the app to Vercel and production-ready database settings so it can be reached on a real hosted URL instead of localhost.

What was built:
- Created branch `phase-12-vercel-deployment-production-db`
- Verified live PostgreSQL connectivity with `npm run db:test`
- Added `.env.example` documenting the required `DATABASE_URL`
- Added `VERCEL_DEPLOYMENT.md` with deployment steps, required settings, and current production caveats
- Guided initial Vercel project creation and GitHub import flow
- Configured production environment variables in Vercel using the existing PostgreSQL connection string
- Completed first hosted deployment at `https://home-app-bice.vercel.app/`

Validation completed:
- Hosted homepage loads ✅
- Hosted `/service-dashboard/receipts` loads with live receipt metrics and rows ✅
- Hosted `/service-dashboard/receipt-query` loads with live query results ✅
- Hosted `/service-dashboard/items` loads with live consolidated item data ✅
- Local `npm run db:test` passed against PostgreSQL ✅

Implementation notes:
- The app is now accessible on a real Vercel URL and reading from PostgreSQL successfully
- `vercel` CLI was not required because the project was created through the Vercel UI
- Receipt media that depends on local `/Users/...` file paths remains a production caveat and should be addressed in Phase 13

Next phase preview:
- Phase 13 will move receipt media to durable hosted storage so images/PDFs work reliably on the deployed app

## Phase 13 — Durable Receipt Media Storage

Status: Completed and verified on hosted preview.

Objective:
Move receipt media out of local `/Users/...` file-path storage and into durable hosted storage that works on the deployed Vercel app without exposing receipts publicly.

What was built:
- Created branch `phase-13-durable-receipt-media-storage`
- Added Vercel Blob SDK dependency
- Added `lib/receipt-media.ts` to centralize receipt media URL handling
- Updated receipt detail rendering to route Vercel Blob receipt media through `/api/receipt-media/[id]`
- Updated `/api/receipt-media/[id]` to support private Vercel Blob fetches server-side while preserving local-file fallback
- Added `scripts/migrate-receipt-media-to-blob.ts`
- Added npm script `media:migrate:blob`
- Switched migration uploads to `access: private`
- Added `BLOB_READ_WRITE_TOKEN` to Vercel/private Blob workflow documentation
- Ran receipt media migration successfully, rewriting stored local file references to private Vercel Blob URLs

Validation completed:
- `npm run build` ✅
- `npm run lint` ✅
- Hosted Vercel preview deployment successfully loaded receipt media for `/service-dashboard/receipts/2` ✅
- Private Blob media is now served through the app route instead of relying on public receipt URLs ✅

Implementation notes:
- Receipt media remains private in Vercel Blob storage
- Browsers do not need direct blob credentials because the server route mediates access
- Existing local-path receipts were migrated to private hosted Blob URLs

Next phase preview:
- Phase 14 will improve receipt parsing quality rules, especially quantity inference and duplicate-line handling for stores such as Costco

## Current status after Phase 14

Completed:
- Phase 11 — Production Build Readiness
- Phase 12 — Vercel Deployment + Production Database
- Phase 13 — Durable Receipt Media Storage
- Phase 14 — Receipt Parsing Quality Rules

Pending next:
- Phase 15 — Item Ledger Accuracy Upgrade
- Phase 16 — Receipt Edit / Correction Tools
- Phase 17 — Receipt Ingestion Improvements
- Phase 18 — Search, Filters, and Query UX Upgrade
- Phase 19 — Shopping Workflow v2
- Phase 20 — Purchase Intelligence + Recommendations
- Phase 21 — Admin / Data Quality Dashboard
- Phase 22 — Export / Backup / Portability

## Phase 14 — Receipt Parsing Quality Rules

Status: Completed and verified locally.

Objective:
Improve receipt parsing quality rules, especially quantity inference, duplicate-line handling, and merchant-specific behavior for stores such as Costco.

What was built:
- Centralized inferred quantity logic in `lib/receipt-item-quantity.ts`
- Added explicit inference sources: `explicit`, `duplicate_lines`, `costco_default`, and `unresolved`
- Improved duplicate-line counting so repeated normalized item descriptions can infer quantity when explicit quantity is missing
- Preserved and centralized Costco fallback behavior so missing Costco quantities default consistently
- Updated `app/api/receipt-item/action/route.ts` so shopping actions use the same inferred quantity rules as the receipt detail page
- Updated `app/service-dashboard/receipts/[id]/page.tsx` to surface better parse-quality reporting and show quantity inference markers in the item list

Validation completed:
- `npm run lint` ✅
- `npm run build` ✅
- Local receipt pages loaded successfully on port 3001 ✅
- Local verification confirmed Costco-style missing quantities render with the new fallback labeling ✅

Implementation notes:
- Quantity inference is now centralized instead of split between display-time and action-time logic
- Duplicate-line inference uses normalized item descriptions and ignores clearly non-item negative line totals
- Receipt detail parse quality now distinguishes unresolved quantities from duplicate-inferred and Costco-defaulted quantities

Next phase preview:
- Phase 15 will improve item ledger accuracy so inferred quantities and normalized item grouping flow through more of the app

## Current status after Phase 15

Completed:
- Phase 11 — Production Build Readiness
- Phase 12 — Vercel Deployment + Production Database
- Phase 13 — Durable Receipt Media Storage
- Phase 14 — Receipt Parsing Quality Rules
- Phase 15 — Item Ledger Accuracy Upgrade

Pending next:
- Phase 16 — Receipt Edit / Correction Tools
- Phase 17 — Receipt Ingestion Improvements
- Phase 18 — Search, Filters, and Query UX Upgrade
- Phase 19 — Shopping Workflow v2
- Phase 20 — Purchase Intelligence + Recommendations
- Phase 21 — Admin / Data Quality Dashboard
- Phase 22 — Export / Backup / Portability

## Phase 15 — Item Ledger Accuracy Upgrade

Status: Completed and verified locally.

Objective:
Make the Items Ledger more trustworthy by flowing inferred quantities and stronger item normalization into the consolidated item view.

What was built:
- Reworked `app/service-dashboard/items/page.tsx` to stop relying on the older raw SQL aggregation path
- Applied `normalizeItemName()` to ledger grouping so similar item names consolidate more consistently
- Applied Phase 14 inferred quantity rules per receipt before building ledger rows
- Carried quantity-source metadata into the ledger so latest quantities can reflect `duplicate_lines` and `costco_default` inference
- Updated ledger rendering to show inferred quantity markers such as `(dup)` and `(default)`
- Kept latest purchase, latest receipt link, and unit-price summaries aligned with the smarter grouped item rows

Validation completed:
- `npm run lint` ✅
- `npm run build` ✅
- Local `/service-dashboard/items` loaded successfully ✅
- Local verification confirmed inferred quantity markers now appear in the Items Ledger ✅

Implementation notes:
- The ledger now uses the same quantity-inference rules as receipt detail and shopping actions instead of raw quantity alone
- Grouping is now driven by normalized item names rather than only literal lowercase descriptions
- This phase improves trust in latest quantity display without changing the underlying raw receipt rows in the database

Next phase preview:
- Phase 16 will add receipt edit and correction tools so parser mistakes can be fixed from the UI instead of living forever in silent embarrassment

## Current status after Phase 16

Completed:
- Phase 11 — Production Build Readiness
- Phase 12 — Vercel Deployment + Production Database
- Phase 13 — Durable Receipt Media Storage
- Phase 14 — Receipt Parsing Quality Rules
- Phase 15 — Item Ledger Accuracy Upgrade
- Phase 16 — Receipt Edit / Correction Tools

Pending next:
- Phase 17 — Receipt Ingestion Improvements
- Phase 18 — Search, Filters, and Query UX Upgrade
- Phase 19 — Shopping Workflow v2
- Phase 20 — Purchase Intelligence + Recommendations
- Phase 21 — Admin / Data Quality Dashboard
- Phase 22 — Export / Backup / Portability

## Phase 16 — Receipt Edit / Correction Tools

Status: Completed and verified locally.

Objective:
Add direct correction tools to the receipt detail experience so bad parser output can be fixed from the UI without database surgery.

What was built:
- Added `app/api/receipts/[id]/route.ts` for receipt metadata updates
- Added `app/api/receipt-items/[id]/route.ts` for line-item updates
- Added `components/receipt-metadata-editor.tsx` for editing receipt-level fields
- Added `components/receipt-item-editor.tsx` for editing line-item fields
- Integrated both editors into `app/service-dashboard/receipts/[id]/page.tsx`
- Enabled editable correction flow for receipt metadata, item descriptions, quantities, unit prices, and line totals

Validation completed:
- `npm run lint` ✅
- `npm run build` ✅
- Local receipt detail page loaded successfully ✅
- Local verification confirmed `Edit receipt` and `Edit item` controls render on receipt detail pages ✅
- Manual local check confirmed the first edit flow looks good ✅

Implementation notes:
- Receipt detail is no longer read-only for common correction tasks
- Metadata edits and line-item edits are handled through separate focused PATCH routes
- The first correction flow is intentionally pragmatic and UI-driven rather than overengineered

Next phase preview:
- Phase 17 will improve receipt ingestion so better validation and richer structured payload handling reduce the need for corrections upstream

## Current status after Phase 17

Completed:
- Phase 11 — Production Build Readiness
- Phase 12 — Vercel Deployment + Production Database
- Phase 13 — Durable Receipt Media Storage
- Phase 14 — Receipt Parsing Quality Rules
- Phase 15 — Item Ledger Accuracy Upgrade
- Phase 16 — Receipt Edit / Correction Tools
- Phase 17 — Receipt Ingestion Improvements

Pending next:
- Phase 18 — Search, Filters, and Query UX Upgrade
- Phase 19 — Shopping Workflow v2
- Phase 20 — Purchase Intelligence + Recommendations
- Phase 21 — Admin / Data Quality Dashboard
- Phase 22 — Export / Backup / Portability

## Phase 17 — Receipt Ingestion Improvements

Status: Completed and verified locally.

Objective:
Improve receipt ingestion so richer structured payloads can be validated and saved cleanly, reducing malformed data entering the system.

What was built:
- Upgraded `app/api/receipts/route.ts` to accept an optional structured `items` array
- Added payload validation for ingested line items including description, line number, quantity, unit price, line total, and item metadata
- Inserted `receipt_items` alongside the parent receipt within the same transaction
- Derived and returned ingested item count from actual payload items instead of trusting loose external assumptions
- Preserved existing receipt-level payload support such as structured JSON, OCR text, and metadata fields

Validation completed:
- `npm run lint` ✅
- `npm run build` ✅
- Local API ingestion test succeeded, creating and linking receipt + item rows correctly ✅
- Validation test data was removed after verification so the local DB was left clean ✅
- Manual local review confirmed the ingestion upgrade looks good ✅

Implementation notes:
- Ingestion now supports richer structured payloads instead of only a thin receipt-row insert path
- Receipt and line-item creation now happen atomically in one transaction
- This phase improves upstream data quality so fewer parser mistakes need manual correction later

Next phase preview:
- Phase 18 will improve search, filters, and query UX so receipt lookup becomes more practical and less dependent on preset views

## Current status after Phase 18

Completed:
- Phase 11 — Production Build Readiness
- Phase 12 — Vercel Deployment + Production Database
- Phase 13 — Durable Receipt Media Storage
- Phase 14 — Receipt Parsing Quality Rules
- Phase 15 — Item Ledger Accuracy Upgrade
- Phase 16 — Receipt Edit / Correction Tools
- Phase 17 — Receipt Ingestion Improvements
- Phase 18 — Search, Filters, and Query UX Upgrade

Pending next:
- Phase 19 — Shopping Workflow v2
- Phase 20 — Purchase Intelligence + Recommendations
- Phase 21 — Admin / Data Quality Dashboard
- Phase 22 — Export / Backup / Portability

## Phase 18 — Search, Filters, and Query UX Upgrade

Status: Completed and verified locally.

Objective:
Improve receipt lookup so querying by date, store, item text, and totals becomes more practical than relying on preset-only views.

What was built:
- Reworked `app/service-dashboard/receipt-query/page.tsx` into a richer advanced query surface
- Added date filter input with support for `YYYY-MM-DD`, `YYYY-MM`, and `YYYY`
- Added store text filter
- Added item text filter that searches through `receipt_items`
- Added min-total and max-total filters
- Added clearer combined query labeling and a clear-query action
- Preserved sortable result views while making the query form more useful for real lookup tasks

Validation completed:
- `npm run lint` ✅
- `npm run build` ✅
- Manual local review confirmed the upgraded query experience looks good ✅

Implementation notes:
- Item-text search now works through receipt-item existence checks instead of only receipt-level fields
- The query page now supports combined filters in a single flow instead of splitting “quick” and “manual” into a narrower experience
- This phase focused on practical retrieval UX, not analytics or recommendations yet

Next phase preview:
- Phase 19 will improve shopping workflow ergonomics so planning items, buy-again actions, and duplicate handling feel more like a system and less like a bucket

## Current status after Phase 19

Completed:
- Phase 11 — Production Build Readiness
- Phase 12 — Vercel Deployment + Production Database
- Phase 13 — Durable Receipt Media Storage
- Phase 14 — Receipt Parsing Quality Rules
- Phase 15 — Item Ledger Accuracy Upgrade
- Phase 16 — Receipt Edit / Correction Tools
- Phase 17 — Receipt Ingestion Improvements
- Phase 18 — Search, Filters, and Query UX Upgrade
- Phase 19 — Shopping Workflow v2

Pending next:
- Phase 20 — Purchase Intelligence + Recommendations
- Phase 21 — Admin / Data Quality Dashboard
- Phase 22 — Export / Backup / Portability

## Phase 19 — Shopping Workflow v2

Status: Completed and verified locally.

Objective:
Turn the shopping workflow into a more usable planning surface so list items can be reviewed and adjusted instead of just accumulated.

What was built:
- Added `app/api/shopping-plan-items/[id]/route.ts` for shopping-plan item updates
- Added `components/shopping-plan-item-editor.tsx` for editing item-level planning fields
- Reworked `app/service-dashboard/shopping-plan/page.tsx` to show actual shopping lists and planned items instead of placeholder content
- Surfaced editable planning controls for expected quantity, priority, status, preferred store, and notes
- Improved the shopping page so merged planning items are visible in a coherent workflow surface rather than hidden behind receipt-action side effects

Validation completed:
- `npm run lint` ✅
- `npm run build` ✅
- Manual local review confirmed the upgraded shopping workflow looks good ✅

Implementation notes:
- Shopping Plan is now a real data-backed workflow page, not a roadmap placeholder
- This phase focused on plan usability and editability rather than recommendation intelligence
- The workflow is now in a much better position for later purchase-intelligence features to build on top

Next phase preview:
- Phase 20 will add purchase intelligence and recommendations so the app can suggest buy-again patterns and surface more useful planning signals automatically

## Current status after Phase 20

Completed:
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

Pending next:
- Phase 21 — Admin / Data Quality Dashboard
- Phase 22 — Export / Backup / Portability

## Phase 20 — Purchase Intelligence + Recommendations

Status: Completed and verified locally.

Objective:
Add the first real purchase-intelligence layer so the app can surface useful recommendation candidates based on repeated buying behavior.

What was built:
- Added `app/api/shopping-recommendations/ignore/route.ts` for ignoring recommendation candidates
- Added `components/shopping-recommendation-actions.tsx` to let recommendation candidates be ignored from the UI
- Reworked `app/service-dashboard/shopping-plan/page.tsx` to surface recommendation candidates based on repeated purchase patterns
- Excluded already planned items from recommendation candidates
- Excluded ignored recommendation candidates from the surfaced list
- Added recommendation context including purchase count, likely store, last purchased date, and average line total

Validation completed:
- `npm run build` ✅
- Initial lint warning was fixed before packaging ✅
- Manual local review confirmed the recommendation layer looks good ✅

Implementation notes:
- Phase 20 adds the first practical recommendation surface rather than just storing data structures for future use
- Recommendation candidates are intentionally conservative and based on repeated purchases, not speculative heuristics
- The shopping workflow now has a usable bridge between receipt history and future purchase suggestions

Next phase preview:
- Phase 21 will add an admin/data-quality dashboard so bad receipts, missing quantities, broken media, and suspicious totals can be surfaced systematically

## Current status after Phase 21

Completed:
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

Pending next:
- Phase 22 — Export / Backup / Portability

## Phase 21 — Admin / Data Quality Dashboard

Status: Completed and verified locally.

Objective:
Create a centralized admin surface for spotting receipt data problems such as totals mismatches, unresolved quantities, missing media, and empty item sets.

What was built:
- Added `app/service-dashboard/admin-quality/page.tsx`
- Centralized receipt-audit checks into one dashboard view
- Surfaced overview counts for totals mismatch, unresolved quantities, missing media, and missing items
- Added grouped issue sections with direct links back to affected receipt detail pages
- Reused centralized quantity-inference logic so unresolved quantity reporting matches the rest of the app

Validation completed:
- `npm run build` ✅
- Initial lint warning was fixed during implementation ✅
- Local route test confirmed `/service-dashboard/admin-quality` renders successfully ✅
- Manual local review confirmed the dashboard looks good ✅

Implementation notes:
- Phase 21 consolidates quality signals that were previously scattered across individual receipt pages
- The dashboard is designed for triage and cleanup, not deep analytics yet
- This gives the app a practical quality-control surface before export/portability work in the final phase

Next phase preview:
- Phase 22 will add export, backup, and portability tools so receipt data is easier to move, inspect, and preserve outside the app

## Current status after Phase 22

Completed:
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

Pending next:
- None in the original Phase 11–22 roadmap. Future work should be planned as a fresh follow-on roadmap.

## Phase 22 — Export / Backup / Portability

Status: Completed and verified locally.

Objective:
Add practical export and backup paths so receipt data can be downloaded, inspected, and preserved outside the app without direct database access.

What was built:
- Added `app/api/export/route.ts`
- Added `app/service-dashboard/export/page.tsx`
- Added practical export support for full-dataset JSON downloads
- Added flat CSV export support for spreadsheet and analysis workflows
- Linked the admin-quality surface to the export/backup page for easier admin-side discoverability

Validation completed:
- `npm run build` ✅
- Local route test confirmed `/service-dashboard/export` renders successfully ✅
- Local route test confirmed `/api/export?format=json` returns export data successfully ✅
- Local route test confirmed `/api/export?format=csv` returns CSV successfully ✅
- Lint warnings encountered during implementation were fixed before packaging ✅

Implementation notes:
- Phase 22 adds practical portability without requiring direct DB access or ad hoc scripts
- The first export pass focuses on whole-dataset JSON and CSV, which are enough for backup, migration, and inspection
- Navigation discoverability for admin/export pages is still a follow-on UX improvement rather than part of this completed phase

Next roadmap note:
- Future work can start from admin discoverability/navigation polish and any deeper export granularity or backup automation needs

# Follow-on roadmap after Phase 22

This section is the next starting point after the original Phase 11–22 roadmap. It is intentionally written before implementation so future work does not depend on chat history survival.

## Recommended execution order
1. Phase 23 — Admin Navigation + Discoverability
2. Phase 24 — Recommendation Actions + Workflow Loop Closure
3. Phase 25 — Export Granularity + Scheduled Backup UX
4. Phase 26 — Receipt Ingestion / Parser Confidence v2
5. Phase 27 — Store Intelligence + Merchant Profiles
6. Phase 28 — Automation / Integrations Follow-through

## Phase 23 — Admin Navigation + Discoverability

Goal:
Make admin-only surfaces discoverable from the app without relying on direct URLs.

Planned work:
- add navigation entry points for `Admin Quality` and `Export & Backup`
- decide whether these live under a dedicated `Admin` nav item or a compact tools/admin area
- keep normal user-facing navigation clean while making operational pages easy to find
- optionally add a small landing panel that links to admin tools from the dashboard

Completion looks like:
- admin-quality and export pages are reachable through normal in-app navigation
- users no longer need memorized URLs for operational pages

## Phase 24 — Recommendation Actions + Workflow Loop Closure

Goal:
Turn recommendations into actionable planning steps instead of read-only suggestions.

Planned work:
- add `Add to plan` / `Add to Buy Again` behavior directly from recommendation cards
- support dismiss/ignore with clearer state handling
- avoid duplicate recommendation → plan spam when an item is already planned
- preserve source context so recommendations feel traceable, not magical

Completion looks like:
- recommendation cards can directly feed the shopping workflow
- the recommendation layer becomes operational instead of advisory-only

## Phase 25 — Export Granularity + Scheduled Backup UX

Goal:
Make export/backup more flexible than one full dump for all cases.

Planned work:
- add filtered export options (date range, store, receipt subset, maybe items-only)
- consider downloadable backup bundles or snapshots
- add lightweight backup instructions/workflow text in the UI
- optionally add a script or admin route for repeatable local backup tasks

Completion looks like:
- export is useful for selective analysis, not just full-dataset extraction
- backup feels like a supported workflow rather than a lucky side effect of the API

## Phase 26 — Receipt Ingestion / Parser Confidence v2

Goal:
Reduce downstream cleanup by making upstream ingestion smarter and more explainable.

Planned work:
- track parser-confidence or quality hints per receipt/item
- improve ingestion handling for partial/uncertain structured payloads
- surface clearer reasons for unresolved quantity / suspicious parse results
- reduce how often manual correction is needed after import

Completion looks like:
- low-confidence receipts are easier to identify immediately
- ingestion quality improves before data lands in the main workflow surfaces

## Phase 27 — Store Intelligence + Merchant Profiles

Goal:
Make store-level behavior more useful across shopping, analytics, and cleanup.

Planned work:
- enrich store profiles beyond just store type
- support merchant-specific notes/rules/preferences where helpful
- improve preferred-store behavior for recommendations and shopping plans
- surface store-level patterns in the UI more clearly

Completion looks like:
- the app behaves more intelligently across merchants instead of treating every store as identical with different fonts

## Phase 28 — Automation / Integrations Follow-through

Goal:
Turn the internal workflows into something that can integrate or automate reliably.

Planned work:
- expand shopping sync/event usage where appropriate
- improve export/use paths for other systems
- consider notification or assistant-facing hooks for recommendations / quality alerts / backups
- make recurring operational tasks less manual

Completion looks like:
- the app becomes easier to plug into broader workflows instead of remaining a self-contained island

## Current status after Phase 25

Completed:
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

Pending next:
- Phase 27 — Store Intelligence + Merchant Profiles
- Phase 28 — Automation / Integrations Follow-through

## Phase 23 — Admin Navigation + Discoverability

Status: Completed and verified locally.

Objective:
Make admin surfaces discoverable from the app without relying on direct URLs.

What was built:
- Updated `components/top-nav.tsx`
- Added `Admin` to the top navigation
- Made `Admin Quality` reachable through normal in-app navigation instead of memorized URLs
- Kept the existing direct path between admin-quality and export/backup surfaces intact

Validation completed:
- `npm run lint` ✅
- `npm run build` ✅
- Manual local review confirmed the navigation update looks good ✅

Implementation notes:
- Phase 23 focused on discoverability rather than introducing a heavier admin menu system
- Admin surfaces are now meaningfully easier to find without cluttering the rest of the app too aggressively
- Export remains reachable through Admin Quality until a more formal admin navigation structure is warranted

## Phase 24 — Recommendation Actions + Workflow Loop Closure

Status: Completed and verified locally.

Objective:
Turn recommendation cards into actionable workflow inputs instead of read-only suggestions.

What was built:
- Added `app/api/shopping-recommendations/plan/route.ts`
- Updated `components/shopping-recommendation-actions.tsx` so recommendations can be added directly into the shopping workflow
- Added duplicate-safe handling so already-planned items do not create duplicate plan entries
- Wired recommendation quantity through to the created shopping-plan item
- Updated recommendation cards to show suggested quantity before adding to plan

Validation completed:
- `npm run lint` ✅
- `npm run build` ✅
- Manual local review confirmed recommendation cards can add to plan cleanly ✅
- Manual local review confirmed quantity now carries through into Buy Again items ✅

Implementation notes:
- Phase 24 closes the loop between recommendation insight and shopping-plan execution
- The recommendation layer is now operational rather than merely advisory
- The next best follow-on is improving export flexibility and backup UX

## Phase 26 — Receipt Ingestion / Parser Confidence v2

Status: Completed locally and ready for branch push.

Objective:
Reduce downstream cleanup by making upstream ingestion smarter and more explainable, especially when receipt payloads are partial or uncertain.

What was built:
- Added `lib/receipt-parse-quality.ts` to centralize parser metadata, confidence extraction, low-confidence thresholds, and warning parsing
- Upgraded `app/api/receipts/route.ts` to accept parser metadata, confidence maps, overall confidence, warnings, quality flags, and item-level parse metadata
- Preserved item-level parse metadata in `receipt_items.metaJson` so uncertainty is stored instead of discarded
- Added meaningful-payload rejection so obviously empty intake payloads fail cleanly instead of pretending to ingest something useful
- Updated `app/service-dashboard/receipts/[id]/page.tsx` to show parser source/version, overall confidence, warning flags, field-confidence chips, and item-level low-confidence hints
- Updated `app/service-dashboard/admin-quality/page.tsx` to audit low-confidence receipts based on parser warnings, quality flags, weak core-field confidence, and low-confidence item metadata

Validation completed:
- `npm run lint` ✅
- `npm run build` ✅
- `npm run db:test` ✅

Implementation notes:
- Phase 26 intentionally uses existing `structuredJson` and `metaJson` fields instead of adding a schema migration
- Receipt intake is now more honest about uncertainty rather than flattening parser ambiguity into fake certainty
- Admin-quality triage can now distinguish receipts that imported successfully from receipts that imported suspiciously
- The next most natural follow-on remains Phase 25 for export granularity and backup UX, unless roadmap priority changes again on purpose

## Phase 25 — Export Granularity + Scheduled Backup UX

Status: Completed locally and ready for branch push.

Objective:
Make export and backup more flexible than one blunt full-dataset dump by adding useful filters, items-only export modes, and a clearer local backup workflow.

What was built:
- Upgraded `app/api/export/route.ts` to support filtered export by `from`, `to`, `store`, and `receiptIds`
- Added `mode=full|items` so export can return either full receipt envelopes or item-only datasets
- Added filtered JSON and CSV output paths with export filenames that reflect the selected scope
- Updated `app/service-dashboard/export/page.tsx` with a filter form for date range, store, and receipt IDs
- Added export options for full JSON, full CSV, items-only JSON, and items-only CSV
- Added visible filter summary and lightweight local backup guidance with copyable `curl` examples

Validation completed:
- `npm run lint` ✅
- `npm run build` ✅
- `npm run db:test` ✅

Implementation notes:
- Phase 25 keeps the export system simple by extending the existing route instead of introducing a separate backup subsystem
- Items-only mode makes spreadsheet and downstream analysis easier when full receipt wrappers are unnecessary
- Local backup guidance is now explicit enough to be repeatable instead of living as vague tribal knowledge
- The next most natural follow-on is Phase 27 — Store Intelligence + Merchant Profiles

## Phase 27 — Store Intelligence + Merchant Profiles

Status: Completed locally and ready for branch push.

Objective:
Make merchant profiles materially useful across receipt review and shopping recommendations instead of leaving store intelligence trapped at the level of a single coarse store type.

What was built:
- Added `lib/store-profile.ts` to parse and score richer merchant profile metadata stored through `store_profiles.notes`
- Upgraded `app/api/store-profile/route.ts` to accept richer merchant profile inputs including preferred categories, shopping tips, pricing notes, reliability, default priority, and item-specific prefer/avoid hints
- Expanded `components/store-type-selector.tsx` into a fuller merchant profile editor instead of a store-type-only button strip
- Updated `app/service-dashboard/receipts/[id]/page.tsx` to show a richer store profile summary including reliability, default priority, preferred categories, shopping tips, and pricing notes
- Updated `app/service-dashboard/shopping-plan/page.tsx` so recommendation store ranking uses merchant profile intelligence rather than only raw purchase counts
- Surfaced store type, reliability, default priority, and store tips directly in recommendation cards for more store-aware planning behavior

Validation completed:
- `npm run lint` ✅
- `npm run build` ✅
- `npm run db:test` ✅

Implementation notes:
- Phase 27 intentionally avoided a schema migration by encoding richer merchant metadata inside existing profile notes first
- Recommendation ranking now balances purchase frequency with merchant-level prefer/avoid and reliability hints
- Merchant profiles are now visible and editable in a form that can actually influence future shopping behavior instead of serving as decorative metadata
- The next natural follow-on is Phase 28 — Automation / Integrations Follow-through

## Phase 28 — Automation / Integrations Follow-through

Status: Completed locally and ready for branch push.

Objective:
Turn the app’s recommendation, receipt-action, export, and quality surfaces into something that leaves an operational trail instead of acting like work happened by magic.

What was built:
- Added `lib/shopping-automation.ts` to record and summarize shopping automation events
- Added `app/api/automation/summary/route.ts` for operational summary access
- Added `app/service-dashboard/automation/page.tsx` as a new automation/integrations operator surface
- Updated `app/api/shopping-recommendations/plan/route.ts` to record recommendation-plan and recommendation-merge automation events
- Updated `app/api/shopping-recommendations/ignore/route.ts` to record ignore events
- Updated `app/api/receipt-item/action/route.ts` to record create, merge, and duplicate-block automation outcomes
- Updated admin-quality and export pages to link into the new automation dashboard

Validation completed:
- `npm run lint` ✅
- `npm run build` ✅
- `npm run db:test` ✅

Implementation notes:
- Phase 28 uses the existing `shopping_sync_events` table instead of inventing a new automation ledger
- Automation follow-through is now observable from the UI instead of being hidden inside API side effects
- Recommendation actions, receipt-item actions, and ignore paths now leave operational breadcrumbs that can be reviewed later
- The current roadmap is effectively complete after this phase; future work should start as a fresh follow-on roadmap if needed

## Notes for future restart
- The original Phase 11–22 roadmap is complete and merged to `main`.
- Phase 23 is complete and merged to `main`.
- Phase 24 is complete and merged to `main`.
- Phase 25 is complete and merged to `main`.
- Phase 26 is complete and merged to `main`.
- Phase 27 is complete and merged to `main`.
- Phase 28 is complete and merged to `main`.
- Phase 29 is complete and merged to `main`.
- Phase 30 is complete and merged to `main`.
- A new upload/OCR roadmap begins after the completed Phase 23–28 follow-on roadmap.

# New roadmap: Receipt Upload UI + OCR Intake Flow

## Recommended execution order
1. Phase 29 — Receipt Upload UI Foundation
2. Phase 30 — OCR Extraction Pipeline
3. Phase 31 — Structured Receipt Parsing + Review Screen
4. Phase 32 — Final Save Flow + Dashboard Integration
5. Phase 33 — Upload Reliability, Retry, and Reprocessing

## Phase 29 — Receipt Upload UI Foundation

Status: Completed locally and ready for branch push.

Goal:
Let the web app accept receipt images and PDFs cleanly so upload becomes a first-class user action rather than an API-only exercise.

What was built:
- Added `app/api/receipt-media/upload/route.ts` to accept supported receipt files and store them locally
- Added `components/receipt-upload-form.tsx` with drag/drop, file-picker, upload state, error handling, and success result display
- Added `app/service-dashboard/upload/page.tsx` as the new web upload entry point
- Added upload validation for supported file types and a 15 MB size limit
- Reused the app’s existing receipt-media storage story by saving uploaded files under a local app-managed `uploads/receipt-media` path
- Updated admin-quality navigation to include a direct link into the upload surface
- Updated `.gitignore` so runtime-uploaded receipt files do not get committed into git like cursed artifacts

Validation completed:
- `npm run lint` ✅
- `npm run build` ✅
- `npm run db:test` ✅
- Manual local review confirmed browser upload works and stores the file to the local upload directory ✅

Implementation notes:
- Phase 29 intentionally stops at media upload/storage and does not pretend to do OCR yet
- The upload flow now provides the front door that later OCR/review phases can plug into cleanly
- Upload storage reuses the existing receipt-media serving approach instead of inventing a second parallel media system
- The next natural follow-on is Phase 30 — OCR Extraction Pipeline

## Phase 30 — OCR Extraction Pipeline

Status: Completed locally and ready for branch push.

Goal:
Turn uploaded media into raw OCR output and parser-ready artifacts.

What was built:
- Added `app/api/receipt-media/ocr/route.ts` to run local OCR against uploaded receipt media
- Added server-side OCR method selection using `pdftotext` for PDFs and `tesseract` for image uploads
- Added path validation so OCR only runs against files inside the managed upload directory
- Updated `components/receipt-upload-form.tsx` to add an explicit **Run OCR** step after upload
- Updated the upload page to display OCR metadata and raw OCR text directly in the UI for debugging and later review-flow work
- Verified and installed the local OCR toolchain (`tesseract` and `poppler/pdftotext`) on the host machine

Validation completed:
- `npm run lint` ✅
- `npm run build` ✅
- `npm run db:test` ✅
- Manual local review confirmed upload → OCR flow works and returns raw text in the UI ✅

Implementation notes:
- Phase 30 deliberately uses a local-first OCR stack to keep recurring OCR cost at zero
- PDFs are handled with `pdftotext` first, which is cheaper and often cleaner than forcing OCR on text-based PDFs
- The UI now separates upload from OCR explicitly, which makes failures easier to debug and keeps the workflow sane
- The next natural follow-on is Phase 31 — Structured Receipt Parsing + Review Screen

## Phase 31 — Structured Receipt Parsing + Review Screen

Status: Completed and merged to `main`.

Goal:
Transform OCR text into structured receipt data and give the user a review step before save.

Implementation summary:
- parse OCR text into store/date/total/items
- attach warnings and confidence signals
- create a review screen for extracted fields and line items
- allow correction before the final save step

Completion looks like:
- uploaded receipts become editable structured drafts
- users can review and fix before saving into the ledger

## Phase 32 — Blob-backed Upload Storage for Vercel

Status: Completed and merged to `main`.

Goal:
Move receipt upload storage to a Vercel-compatible durable media path while keeping local development fallback.

Implementation summary:
- upload storage prefers Blob when configured
- local development still works with app-managed local upload paths
- app-side logic supports Blob-aware OCR/media retrieval

Completion looks like:
- uploaded receipts can be stored durably in production-compatible media storage
- OCR/input flows can resolve Blob-backed media safely

## Phase 33 — OCR Abstraction + Remote Worker Path

Status: Completed and merged to `main`.

Goal:
Decouple OCR execution from the app runtime so production can use a remote worker when Vercel cannot run local OCR binaries.

Implementation summary:
- app-side OCR provider abstraction supports `local` and `worker`
- `OCR_PROVIDER=worker` routes OCR requests to a remote authenticated worker path
- local development keeps using `tesseract` / `pdftotext`

Completion looks like:
- the app is ready to call a worker for production OCR
- the remaining task is the worker service itself, not more app-side provider plumbing

## Current implementation branch — OCR Worker Service + Phase 34 save-flow/parser improvements

Status: Completed locally on branch `phase-34-ocr-worker-service`; ready for merge decision.

Goal:
Provide the missing authenticated OCR service that the already-merged app-side worker path can call in production, while also improving the upload save flow and receipt draft parsing quality.

What was implemented on this branch:
- added a local-first OCR worker server script
- supported authenticated `POST /ocr` requests with `fileUrl` and optional `contentType`
- fetched the remote file, ran `pdftotext` for PDFs or `tesseract` for images, and returned normalized OCR payloads
- documented worker runtime env and local startup usage
- improved post-save navigation in the upload flow
- preserved processing metadata in saved receipt structured JSON
- fixed admin-quality date rendering to avoid hydration mismatch
- shifted receipt draft parsing strategy from one generic heuristic path toward merchant/layout-aware parsing, starting with a Walmart-specific parser plus generic fallback

Validation completed locally:
- `npm run lint` (passes with 2 pre-existing unrelated warnings in `shopping-plan/page.tsx`)
- `npm run build`
- `npm run db:test`
- OCR worker smoke test against sample PDF
- manual local upload → OCR → draft → save validation
- manual local Walmart receipt draft validation after parser changes

Completion looks like:
- HomeApp can accept a receipt in the app and process OCR through the worker path
- Vercel deployment has a realistic production OCR path instead of wishful thinking
- upload/save flow is cleaner locally and Walmart-style parsing is materially more accurate than the earlier generic-only draft parser

## Next roadmap after worker/reliability work

### Phase 36 — Provider Selection + Explicit OpenAI Consent Flow

Goal:
Prefer local/worker processing first, and only offer OpenAI fallback when the primary processing path is unavailable or fails.

Planned work:
- centralize provider selection and failure-routing logic
- keep local/worker as the default primary path
- detect when configured non-OpenAI processing is unavailable or fails
- present explicit user consent UI before OpenAI fallback is allowed
- record consent state for auditability
- never silently fail over to OpenAI

Completion looks like:
- receipt processing stays local/worker-first when possible
- users explicitly approve OpenAI fallback before it is used

### Phase 37 — OpenAI Receipt Processing Fallback

Goal:
Add a receipt-only OpenAI fallback path that can process receipts when local/worker processing is not available.

Planned work:
- add OpenAI-backed receipt processing route(s)
- constrain model usage to receipt-processing scope only
- use strict schema validation for structured output
- preserve review/correction before DB save
- wire fallback into the upload flow only after user approval

Completion looks like:
- HomeApp can still process web receipts when local/worker OCR is unavailable
- OpenAI fallback is controlled, explicit, and schema-validated rather than magical nonsense
