# Smart Receipts Development

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
