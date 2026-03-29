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
- add upload/OCR/draft/save processing states
- enable retries and reprocessing for failed OCR/parsing
- expose failure visibility in an operator/admin surface

### Phase 36 — Provider Selection + Explicit OpenAI Consent Flow
- add provider-selection rules that prefer local/worker processing first
- detect unavailable/failed non-OpenAI processing cleanly
- present explicit user consent UI before any OpenAI fallback is used
- record per-attempt or per-receipt consent state for auditability
- do not silently fail over to OpenAI

### Phase 37 — OpenAI Receipt Processing Fallback
- add a receipt-only backend route for OpenAI-assisted processing
- support schema-validated receipt extraction from uploaded file or OCR text
- keep review/correction before DB save
- limit model usage to receipt-processing scope only
- wire OpenAI fallback into the upload flow only after explicit user approval

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
