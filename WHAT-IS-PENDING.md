# What Is Pending

This note is the quick restart file for unfinished work after the completed Phase 11–24 roadmap work.
For the full handoff, architecture, stack, merged-vs-local status, and restart instructions, read `RESTART-GUIDE.md` first.

## In Progress

- No phase is currently mid-implementation.
- **Immediate next build:** OCR worker endpoint/service for production use with `OCR_PROVIDER=worker`
- **Next product phase:** Phase 34 — Final Save Flow + Dashboard Integration
- **Then:** Phase 35 — Upload Reliability, Retry, and Reprocessing
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
- polish reviewed upload save flow end-to-end
- ensure dashboard/detail redirects and post-save UX are clean
- preserve media path, raw text, structured JSON, confidence, and item metadata consistently

### Phase 35 — Upload Reliability, Retry, and Reprocessing
- add upload/OCR/draft/save processing states
- enable retries and reprocessing for failed OCR/parsing
- expose failure visibility in an operator/admin surface

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
