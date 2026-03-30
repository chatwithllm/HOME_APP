# What Is Pending

This note is the quick restart file for unfinished work after the completed Phase 11–24 roadmap work.
For the full handoff, architecture, stack, merged-vs-local status, and restart instructions, read `RESTART-GUIDE.md` first.

## In Progress

- **Current build in progress:** OCR worker endpoint/service for production use with `OCR_PROVIDER=worker`
- Current working branch target: `phase-34-ocr-worker-service`
- Hybrid direction is now official: prefer local/worker receipt processing first; if unavailable, offer **explicitly user-approved** OpenAI fallback.
- New planning note: `HYBRID_RECEIPT_PROCESSING_PLAN.md`
- **Next product phase after worker:** Phase 34 — Final Save Flow + Dashboard Integration
- **Then:** Phase 35 — Upload Reliability, Retry, and Reprocessing
- **Then:** Phase 36 — Provider Selection + Explicit OpenAI Consent Flow
- **Then:** Phase 37 — OpenAI Receipt Processing Fallback
- Phase 33 — OCR Abstraction + Remote Worker Path is complete and merged to `main`.
- Phase 32 — Blob-backed Upload Storage for Vercel is complete and merged to `main`.
- Phase 31 — Structured Receipt Parsing + Review Screen is complete and merged to `main`.
- Phase 30 — OCR Extraction Pipeline is complete and merged to `main`.
- A new upload/OCR roadmap is active after the completed Phase 23–28 follow-on roadmap.
- Per workflow: update docs before starting, update docs again after completion, test locally before branching, then push and ask before merge.

## Completed already
- Original Phase 11–22 roadmap: complete and merged to `main`
- Phase 23 — Admin Navigation + Discoverability: complete and merged to `main`
- Phase 24 — Recommendation Actions + Workflow Loop Closure: complete and merged to `main`
- Phase 25 — Export Granularity + Scheduled Backup UX: complete and merged to `main`
- Phase 26 — Receipt Ingestion / Parser Confidence v2: complete and merged to `main`
- Phase 27 — Store Intelligence + Merchant Profiles: complete and merged to `main`
- Phase 28 — Automation / Integrations Follow-through: complete and merged to `main`
- Phase 29 — Receipt Upload UI Foundation: complete and merged to `main`
- Phase 30 — OCR Extraction Pipeline: complete and merged to `main`
- Phase 31 — Structured Receipt Parsing + Review Screen: complete and merged to `main`
- Phase 32 — Blob-backed Upload Storage for Vercel: complete and merged to `main`
- Phase 33 — OCR Abstraction + Remote Worker Path: complete and merged to `main`

## Pending Next

### Phase 34 — Final Save Flow + Dashboard Integration
Status: current branch implementation looks good locally; ready for merge decision.

Completed in this branch:
- polished reviewed upload save flow end-to-end with cleaner post-save actions
- improved dashboard/detail handoff after save
- preserved media path, raw text, structured JSON, confidence, processing source/status, and item metadata consistently
- shifted receipt draft parsing toward merchant/layout-aware parsing starting with a Walmart-specific parser plus generic fallback

Remaining polish after merge if desired:
- optional automatic redirect behavior after save instead of action buttons only
- optional receipt-detail/admin-quality display of processing source/status metadata

### Phase 35 — Upload Reliability, Retry, and Reprocessing
Status: first implementation slice looks good locally; ready for merge decision.

Completed in this branch so far:
- added upload/OCR/draft/save processing states in the upload UI
- made stage-level success/failure visible to the user
- improved reset/retry awareness so users can see which stage failed before rerunning it

Still planned in later Phase 35 follow-up if needed:
- stronger reprocessing actions beyond manual reruns
- more operator/admin-facing visibility for failed attempts
- deeper failure/retry surfacing across the broader intake flow

### Phase 36 — Provider Selection + Explicit OpenAI Consent Flow
Status: first implementation slice looks good locally; ready for merge decision.

Completed in this branch so far:
- added provider-selection helpers that keep local/worker first by default
- added explicit OpenAI fallback consent UI after non-OpenAI OCR failure
- prevented silent failover to OpenAI
- improved PDF/OCR failure feedback so empty OCR text no longer makes Build draft fail silently

Still planned in later follow-up if needed:
- actual OpenAI processing route/integration
- deeper consent audit persistence beyond current UI session
- richer failure routing across more than the OCR step

### Phase 37 — OpenAI Receipt Processing Fallback
Status: first implementation slice looks good locally; ready for merge decision.

Completed in this branch so far:
- added a receipt-only OpenAI draft route
- added schema-validated OpenAI receipt extraction from OCR text
- wired approved OpenAI fallback into the upload flow after explicit consent
- preserved review/correction before DB save
- documented OpenAI fallback env configuration

Still possible in later follow-up if needed:
- direct image/PDF-to-OpenAI vision path
- richer consent audit persistence
- deeper model metadata capture in saved receipt records

### Phase 38 — OpenAI Vision Receipt Input + Consent Auditability
Status: first implementation slice looks good locally; ready for merge decision.

Completed in this branch so far:
- added direct image/PDF-to-OpenAI vision fallback route
- upgraded OpenAI receipt helper to support text and vision modes
- improved saved receipt provenance metadata for OpenAI-assisted processing
- improved consent/fallback metadata captured during OpenAI-assisted save flow

Still possible in later follow-up if needed:
- admin/operator surfaces for consent/provenance visibility
- richer run metadata or analytics for model-assisted processing

## Production deployment note
Current `main` is ready for:
- Vercel + Neon
- Blob-backed receipt upload
- app-side OCR provider abstraction

Current `main` is **not yet enough** for production OCR on Vercel until an OCR worker is built and configured via:
- `OCR_PROVIDER=worker`
- `OCR_WORKER_URL=...`
- `OCR_WORKER_TOKEN=...`

## Working rule for future phases
- Do the work locally first.
- Run local validation before branching.
- Then create the phase branch, push it, update docs, and ask Tony before merging to `main`.
