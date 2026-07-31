---
name: Transaction Data Manager
description: Explains how financial data is stored and manipulated in the BounD app. Activate this skill when adding new data fields or migrating the database.
---

# Transaction Data Manager

This document outlines how BounD manages its state and storage.

## 1. Storage Mechanism

- **Primary storage is server-side**, not `localStorage`. Transactions live in the
  `transactions` table, managed by `server/db.js` (SQLite locally, [Turso](https://turso.tech)
  libSQL in production) and served via the REST API in `server/server.js`.
- The frontend (`src/api.js`) talks to the backend over `fetch(..., { credentials: 'include' })`
  so the httpOnly session cookie is sent automatically — see `AUTH_SETUP.md`.
- `src/config.js` still exposes `CONFIG.isMockMode`, which falls back to an IndexedDB store
  (`financeDB` / `transactions`) for fully-offline development. **Production always runs with
  `isMockMode: false`** — treat the IndexedDB path as a dev-only fallback, not the source of truth.
- Custom categories are the one thing still client-only: they live in `localStorage` under
  `financeCategories` and are not yet persisted server-side (no `/v1/categories` endpoint exists).

## 2. Transaction Schema

Each transaction row (`server/db.js`) / object contains:
- `id`: Unique identifier (integer, auto-increment; the API returns it as a string).
- `userId`: Owner of the row — always taken from the authenticated session, never from client input.
- `date`: Format 'YYYY-MM-DD'.
- `amount`: Float/Number.
- `type`: 'income' or 'expense'.
- `mainCategory`: e.g., 'variable', 'fixed', 'debt' (for expenses) or 'income'.
- `subcategory`: e.g., 'food', 'rent', or a custom key like 'custom_12345'.
- `notes`: String description.
- `seriesId`: (Optional) String linking recurring transactions together.
- `title`: (Optional) Title for recurring transactions.
- `receiptUrl`: (Optional) URL of an uploaded receipt image, served from `server/uploads/`.

## 3. Modifying the Schema

The schema now lives in the database, so changes go through a migration, not just a frontend
fallback:

1. Add the column in `server/db.js` inside `init()` (the `CREATE TABLE IF NOT EXISTS` block for
   new tables, or an `addColumnIfMissing('transactions', '<col> TEXT')` call for existing ones —
   this project **never uses `DROP TABLE`**, since that previously wiped user data on every restart).
2. Update the relevant routes in `server/server.js` (`GET/POST /v1/transactions`) to read/write
   the new field.
3. On the frontend, still provide a fallback when reading (e.g. `tx.isPaid ?? false`) so rows
   created before the migration don't crash the UI.
