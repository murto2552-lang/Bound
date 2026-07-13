---
name: Transaction Data Manager
description: Explains how financial data is stored and manipulated in the BounD app. Activate this skill when adding new data fields or migrating the database.
---

# Transaction Data Manager

This document outlines how BounD manages its state and storage.

## 1. Storage Mechanism
- All data is currently stored in the browser's `localStorage` via the `api.js` file.
- The primary key for the transaction array is `financeTransactions`.
- Categories are stored under `financeCategories`.

## 2. Transaction Schema
Each transaction object contains:
- `id`: Unique identifier (string).
- `date`: Format 'YYYY-MM-DD'.
- `amount`: Float/Number.
- `type`: 'income' or 'expense'.
- `mainCategory`: e.g., 'variable', 'fixed', 'debt' (for expenses) or 'income'.
- `subcategory`: e.g., 'food', 'rent', or a custom key like 'custom_12345'.
- `notes`: String description.
- `seriesId`: (Optional) String linking recurring transactions together.
- `title`: (Optional) Title for recurring transactions.

## 3. Modifying the Schema
If you need to add a new field (e.g., `receiptImage` or `isPaid`), you MUST ensure backwards compatibility. 
When loading data in `api.js` or `Bookshelf.jsx`, provide a fallback (e.g., `tx.isPaid || false`) so that older transactions don't crash the app.
