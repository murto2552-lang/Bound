# BounD Project: Backend Integration Handoff
**Target Audience:** Backend Developer / Antigravity AI (Backend Agent)

## 📌 Context
You are tasked with building the backend for **BounD**, a Smart Finance Manager web application. The frontend is fully built using React, Vite, and Tailwind CSS. Currently, the frontend operates in a "Mock Mode" (offline) using IndexedDB and LocalStorage. Your goal is to build a RESTful API and connect the frontend to it.

## ⚙️ Frontend Architecture
All API calls from the frontend are centralized in `src/api.js`. The frontend uses a configuration flag `CONFIG.isMockMode` in `src/config.js`.

**Your Final Integration Step:**
Once your backend API is ready, you must update `src/config.js`:
```javascript
const CONFIG = {
  isMockMode: false, // Change this to false
  apiBaseUrl: 'http://localhost:3000/v1' // Update to your backend URL
};
```

## 🔌 Required API Endpoints

### 1. Get All Transactions
- **Endpoint:** `GET /transactions`
- **Response:** Array of transaction objects (see Schema below).

### 2. Create Transaction
- **Endpoint:** `POST /transactions`
- **Content-Type:** 
  - `application/json` (Standard request)
  - `multipart/form-data` (If a `receipt` file is attached)
- **Request Payload:** See Schema below. 
- **AI Instruction:** You MUST handle file uploads for the `receipt` field. Save the image to cloud storage (e.g., S3 or local static folder) and return a `receiptUrl` in the response object.

### 3. Delete Single Transaction
- **Endpoint:** `DELETE /transactions/:id`
- **Response:** `{ "success": true }`

### 4. Delete Recurring Series
- **Endpoint:** `DELETE /transactions/series/:seriesId`
- **Behavior:** Delete ALL transactions in the database that share the given `seriesId`.
- **Response:** `{ "success": true }`

## 📦 Transaction Data Schema (JSON)
The backend database must support the following structure for a transaction:

```json
{
  "id": "1",                     // Unique Identifier (String or Integer)
  "date": "2026-07-13",          // Format: YYYY-MM-DD
  "amount": 250.50,              // Float / Decimal
  "type": "expense",             // Enum: 'income', 'expense'
  "mainCategory": "variable",    // Enum: 'variable', 'fixed', 'debt' (for expense) OR 'income'
  "subcategory": "food",         // String (e.g., 'food', 'rent', or custom IDs)
  "notes": "Lunch",              // String
  "title": "",                   // String (Used for naming recurring series)
  "seriesId": "series_1234",     // String (Nullable, links recurring transactions)
  "receiptUrl": "https://..."    // String (Nullable, URL to the uploaded receipt image)
}
```

## 🔐 Additional Tasks for Backend AI
1. **CORS:** Ensure your backend enables CORS to allow requests from the frontend development server and the deployed frontend domain.
2. **Categories (Optional but recommended):** Currently, custom categories are stored in the frontend's `localStorage` (key: `financeCategories`). If you implement user authentication, you should also create endpoints (`GET /categories`, `PUT /categories`) to persist categories in the backend, and update the frontend `Bookshelf.jsx` to fetch them.
6. **Authentication:** The app currently has no login system. If you implement JWT/Session Auth, you MUST update the `fetch` calls in `src/api.js` to include the Authorization headers.

## 📄 Notes on Existing Features
- **Data Export (Excel/PDF):** The frontend already includes a fully functional client-side Export feature (using `xlsx` and `jspdf`). When a user clicks export, it generates the file directly in the browser. **No backend API is required for this feature.** The backend simply needs to ensure the `GET /transactions` endpoint returns the data reliably.
