# What Is Pending

This note is the quick restart file for unfinished work after the completed Phase 11–24 roadmap work.

## In Progress

- Phase 29 — Receipt Upload UI Foundation is the active next phase.
- Phase 28 — Automation / Integrations Follow-through is complete and merged to `main`.
- Phase 27 — Store Intelligence + Merchant Profiles is complete and merged to `main`.
- Phase 25 — Export Granularity + Scheduled Backup UX is complete and merged to `main`.
- Phase 26 — Receipt Ingestion / Parser Confidence v2 is complete and merged to `main`.
- A new upload/OCR roadmap is now active after completing the previous Phase 23–28 follow-on roadmap.
- Per workflow: update docs before starting, update docs again after completion, test locally before branching, then push and ask before merge.

## Completed already
- Original Phase 11–22 roadmap: complete and merged to `main`
- Phase 23 — Admin Navigation + Discoverability: complete and merged to `main`
- Phase 24 — Recommendation Actions + Workflow Loop Closure: complete and merged to `main`
- Phase 25 — Export Granularity + Scheduled Backup UX: complete and merged to `main`
- Phase 26 — Receipt Ingestion / Parser Confidence v2: complete and merged to `main`
- Phase 27 — Store Intelligence + Merchant Profiles: complete and merged to `main`
- Phase 28 — Automation / Integrations Follow-through: complete and merged to `main`

## Pending Next

### Phase 30 — OCR Extraction Pipeline
- OCR processing after upload
- raw OCR text capture and storage
- OCR metadata and error handling
- image and PDF support

### Phase 31 — Structured Receipt Parsing + Review Screen
- parse OCR text into structured receipt draft
- show warnings and confidence
- review/correct screen before final save

### Phase 32 — Final Save Flow + Dashboard Integration
- save reviewed upload into existing receipt pipeline
- redirect into receipt detail/dashboard flows
- preserve media path, raw text, structured JSON, and items

### Phase 33 — Upload Reliability, Retry, and Reprocessing
- retry/reprocess failed OCR or parsing runs
- processing state visibility
- admin/operator visibility into failed uploads

## Working rule for future phases
- Do the work locally first.
- Run local validation before branching.
- Then create the phase branch, push it, update docs, and ask Tony before merging to `main`.
e 33 — Upload Reliability, Retry, and Reprocessing
- retry/reprocess failed OCR or parsing runs
- processing state visibility
- admin/operator visibility into failed uploads

## Working rule for future phases
- Do the work locally first.
- Run local validation before branching.
- Then create the phase branch, push it, update docs, and ask Tony before merging to `main`.
