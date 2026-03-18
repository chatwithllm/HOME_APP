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
- Create a dedicated branch for that phase.
- Complete the scoped work for that phase only.
- Commit the changes with a phase-specific commit message.
- Push the branch to git.
- Update `Development.md` with what was completed and how it was validated.
- Ask Tony whether to merge the phase branch into `main`.
- After merge, ask whether to proceed to the next phase.

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
