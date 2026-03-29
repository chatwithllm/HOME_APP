# Hybrid Receipt Processing Plan

_Last updated: 2026-03-29_

This note captures the revised receipt-processing direction for HomeApp.

## Goal

Support **both** receipt-processing paths:

1. **Primary local/worker path**
   - prefer local OCR in local development
   - prefer remote OCR worker in web/production environments
   - keep costs near zero when local/worker OCR is available

2. **OpenAI-assisted fallback path**
   - if the primary local/worker path is unavailable or fails, the app may offer OpenAI processing
   - OpenAI processing must **not** run silently
   - the user must explicitly approve using OpenAI before the receipt is sent for model processing

## Required product behavior

### Default processing rule
- Local development: use `OCR_PROVIDER=local` when available.
- Web/production: use `OCR_PROVIDER=worker` when available.
- If the configured non-OpenAI processing path is unavailable or fails, do **not** silently auto-send the receipt to OpenAI.
- Instead, surface a clear user choice explaining:
  - local/worker processing is currently unavailable or failed
  - OpenAI fallback is available
  - receipt data will be sent to OpenAI for processing if approved
  - the user must explicitly confirm before proceeding

### OpenAI consent rule
Before any receipt file or OCR text is sent to OpenAI:
- show a clear consent action in the UI
- require an explicit user confirmation per receipt or per processing attempt
- record that consent in the upload/review flow state for auditability
- do not default the consent toggle to on

### OpenAI usage scope rule
OpenAI fallback is allowed only for receipt-processing operations:
- OCR and/or receipt field extraction
- item extraction
- confidence / warning generation

OpenAI fallback must not be used as a general-purpose assistant inside HomeApp.

### Data integrity rule
Even when OpenAI is used:
- model output must be validated through strict schema validation
- users must still be able to review/correct before final save
- DB writes must still go through controlled app routes only

## Recommended implementation split

### Path A — Local/worker-first
1. user uploads receipt
2. app stores file
3. app attempts configured local/worker receipt processing
4. if successful, continue to review and save flow

### Path B — OpenAI fallback with explicit consent
1. local/worker processing is unavailable or fails
2. UI explains failure and offers OpenAI fallback
3. user explicitly approves OpenAI processing
4. app sends file or OCR text to OpenAI using a receipt-only backend route
5. model returns structured receipt JSON
6. app validates schema
7. user reviews/corrects
8. app saves receipt

## Environment/config direction

### Existing / continuing env
- `OCR_PROVIDER`
- `OCR_WORKER_URL`
- `OCR_WORKER_TOKEN`

### New planned env
- `OPENAI_API_KEY`
- `OPENAI_RECEIPT_MODEL`
- optional feature flag such as `OPENAI_RECEIPT_FALLBACK_ENABLED`

## Near-term roadmap impact

The roadmap should now distinguish:
- production OCR worker completion
- final save-flow/dashboard polish
- upload reliability/reprocessing
- OpenAI fallback implementation
- explicit consent UX and auditability
- provider-selection/failure-routing rules

## Important product principle

**If local/worker processing is available, use it first. If not, ask the user before using OpenAI. Never silently fail over to OpenAI.**
