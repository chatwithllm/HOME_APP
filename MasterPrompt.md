## Build a Production Smart Receipts Web Application (Phased Development)

You are building a production-grade web application called **Smart Receipts**.

This is a personal spending intelligence dashboard that stores receipts, extracts items, and integrates them with a shopping planning workflow.

The application must be built incrementally in phases where each phase:

- Implements a coherent vertical feature
- Can be tested locally
- Is committed and pushed to GitHub
- Waits for user confirmation before moving forward

After finishing a phase:
1. Provide manual testing steps
2. Ask the user to verify functionality
3. Once confirmed, continue to the next phase.

---

# Core Technology Stack

Frontend
- Next.js (App Router)
- React
- Tailwind CSS

Backend
- Next.js Server Actions / API Routes

Database
- PostgreSQL

ORM
- Drizzle ORM

Validation
- Zod

Deployment
- Vercel

---

# Database Choice

Use PostgreSQL instead of SQLite.

Reasons:
- Vercel serverless works better with hosted DB
- concurrency safe
- better indexing
- JSON support
- easier analytics queries

Recommended providers:
- Neon
- Supabase
- Railway

---

# Migrating Existing SQLite → PostgreSQL

Step 1 Dump SQLite

sqlite3 receipts.db .dump > receipts.sql

Step 2 Convert SQL

pgloader receipts.db postgresql://user:pass@host/db

This automatically converts:
- SQLite types → PostgreSQL
- indexes
- tables
- data

---

# GitHub Workflow

Branch strategy

main  
dev  
feature/*

Each phase:

git add .  
git commit -m "phase-x: description"  
git push

---

# Project Structure

receipt-ledger/

app/
  page.tsx

  service-dashboard/
      receipts/page.tsx
      receipt-query/page.tsx

  api/
      receipts/route.ts
      receipts/[id]/route.ts
      receipt-item/action/route.ts
      store-profile/route.ts
      ingest-receipt/route.ts

components/
    receipt-table.tsx
    receipt-detail.tsx
    store-heatmap.tsx

db/
    schema.ts
    client.ts

lib/
    currency.ts
    normalize-item.ts
    store-type.ts

scripts/
    receipt_query.ts

drizzle.config.ts

---

# Development Phases

## Phase 1 — Project Bootstrap

Initialize

npx create-next-app receipt-ledger

Install

npm install drizzle-orm pg zod tailwindcss

Homepage should show

Receipt Ledger  
Local-first receipt intelligence system

Navigation

- Dashboard
- Receipt Query
- Shopping Plan
- HomeAssistant
- Ideas Log

Testing

npm run dev

Visit

http://localhost:3001

---

## Phase 2 — PostgreSQL Database Setup

Create tables

receipts  
receipt_items  
store_profiles  

Shopping tables

shopping_lists  
shopping_plan_items  
purchase_history  
shopping_sync_events  
shopping_recommendation_ignores

Indexes

receipt_date  
store_name + receipt_date  
receipt_id  
normalized_item_name  
purchase_time

Test

npm run db:test

Commit

phase-2 database schema

---

## Phase 3 — Receipt Ingestion API

Endpoint

POST /api/receipts

Return

{
  "ok": true,
  "receipt_id": 123
}

Test with curl

curl -X POST localhost:3000/api/receipts

Commit

phase-3 receipt ingestion api

---

## Phase 4 — Receipt Dashboard

/service-dashboard/receipts

Stats

- receipt count
- total spend
- total tax
- distinct stores

Commit

phase-4 receipt dashboard

---

## Phase 5 — Receipt Detail Page

Display

- Metadata
- Items table
- Receipt image
- Raw OCR
- Structured JSON

Store type selector

POST /api/store-profile

Commit

phase-5 receipt detail

---

## Phase 6 — Currency Conversion

Toggle

Show INR

Convert

USD → INR

Store preference

localStorage

Commit

phase-6 currency conversion

---

## Phase 7 — Receipt Query Page

/service-dashboard/receipt-query

Filters

Last 10  
Today  
This month  
This year  
Costco  
Amazon  
Walmart  

Manual

YYYY-MM-DD  
YYYY-MM  
YYYY  

Commit

phase-7 receipt query page

---

## Phase 8 — Shopping Integration

POST /api/receipt-item/action

Actions

buy_again  
running_low  
watch

Behavior

- normalize item name
- ensure list exists
- merge duplicates
- add new item if not present

Commit

phase-8 shopping integration

---

## Phase 9 — Duplicate Purchase Detection

Window

14 days

Return

409 conflict

Commit

phase-9 purchase detection

---

## Phase 10 — CLI Query Tool

scripts/receipt_query.ts

Commands

last 10  
day YYYY-MM-DD  
month YYYY-MM  
year YYYY  
store Costco  

Outputs

text  
JSON

Commit

phase-10 cli query tool

---

# Development Rules

- Implement only one phase at a time
- Provide code + explanation
- Provide testing steps
- Wait for user approval before continuing

---

# Final Product

The finished system should provide:

- receipt storage
- OCR ingestion
- structured receipt parsing
- receipt analytics dashboard
- store profiling
- shopping integration
- duplicate purchase protection
- CLI query tool
- deployable to Vercel


#  Old Database
- Refer to the service_status.db if this is the old database

# Design
- use the /Images/analytics.png for reference UI and colors
- No sidebar
- no Navigation Arrows for routing
- Dont create something Cliche
- no glassmorphism


# GITHUB
- use this repo for github
- https://github.com/chatwithllm/HOME_APP.git
- after every phase completion ask user for git push confirmation

# Docmetation
- Create a Development.md
- update after every phase is successfully completed and pushed to github
- Confirm with user on document update

# Testing
- npm install 
- npm run dev
- these command should be run by system not manyally