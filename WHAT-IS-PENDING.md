# What Is Pending

This note is the quick restart file for unfinished work after the completed Phase 11–24 roadmap work.
For the full handoff, architecture, stack, merged-vs-local status, and restart instructions, read `RESTART-GUIDE.md` first.

## In Progress

- No phase is currently mid-implementation.
- Phase 33 — OCR Abstraction + Remote Worker Path is completed locally and ready for branch/push/merge review.
- **Next product phase after Phase 33:** Phase 34 — Final Save Flow + Dashboard Integration
- **Then:** Phase 35 — Upload Reliability, Retry, and Reprocessing
- Phase 31 — Structured Receipt Parsing + Review Screen is complete and merged to `main`.
- Phase 32 — Blob-backed Upload Storage for Vercel is complete and merged to `main`.
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

## Pending Next

### Phase 33 — OCR Abstraction + Remote Worker Path
- move production OCR execution off the Vercel runtime
- keep local OCR available for development
- use env-configured provider selection (`local` vs `worker`)
- call an authenticated OCR worker from Vercel in production
- preserve Blob-backed file handling for private receipt uploads

### Phase 34 — Final Save Flow + Dashboard Integration
- polish reviewed upload save flow end-to-end
- ensure dashboard/detail redirects and post-save UX are clean
- preserve media path, raw text, structured JSON, confidence, and item metadata consistently

### Phase 35 — Upload Reliability, Retry, and Reprocessing
- add upload/OCR/draft/save processing states
- enable retries and reprocessing for failed OCR/parsing
- expose failure visibility in an operator/admin surface

## Working rule for future phases
- Do the work locally first.
- Run local validation before branching.
- Then create the phase branch, push it, update docs, and ask Tony before merging to `main`.
tion before branching.
- Then create the phase branch, push it, update docs, and ask Tony before merging to `main`.
