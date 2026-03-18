# Vercel Deployment Guide

## Phase 12 Scope

This app is production-build clean and can be deployed to Vercel once production infrastructure is configured.

## Current deployment status

Ready:
- `npm run build` passes
- `npm run lint` passes
- PostgreSQL connectivity is validated via `npm run db:test`

Still required:
- Vercel project/linking
- Production `DATABASE_URL` in Vercel env vars
- Decision for durable receipt-media hosting outside local `/Users/...` paths

## Required environment variables

### Required
- `DATABASE_URL`

This must point to a PostgreSQL instance reachable from Vercel.

Example:

```env
DATABASE_URL="postgres://USER:PASSWORD@HOST:5432/DBNAME?sslmode=require"
```

## Recommended Vercel settings

- Framework preset: **Next.js**
- Install command: `npm install`
- Build command: `npm run build`
- Output setting: default Next.js output

## Deployment flow

1. Import the GitHub repo into Vercel.
2. Set the root directory to `HomeApp` if importing from the monorepo/workspace root.
3. Add the required environment variable:
   - `DATABASE_URL`
4. Trigger a deployment.
5. Verify these routes load:
   - `/`
   - `/service-dashboard/receipts`
   - `/service-dashboard/receipt-query`
   - `/service-dashboard/items`
6. Verify API/database-backed routes return expected results.

## Receipt media on hosted deployments

Receipt media is now intended to be stored in Vercel Blob.

### Private Blob setup

If you want receipt images/PDFs to remain private:
- create a Vercel Blob store with **Private** access
- add `BLOB_READ_WRITE_TOKEN` to local env and Vercel project env vars
- run the migration script locally:

```bash
npm run media:migrate:blob
```

The app serves private Blob media through `/api/receipt-media/[id]`, so browsers do not need direct blob credentials.

### Why this matters

Local file paths such as `/Users/...` work on the local machine, but they are not durable on Vercel serverless runtimes.
Moving receipt media into private Blob storage keeps the files hosted while avoiding public receipt URLs.

## Quick verification commands

```bash
npm run build
npm run lint
npm run db:test
```

## Suggested next step after Vercel deploy

Phase 13: durable receipt-media storage so receipt image/PDF preview works reliably on the hosted app.
