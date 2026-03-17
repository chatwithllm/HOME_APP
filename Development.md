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
