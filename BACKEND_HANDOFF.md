# BounD — Backend Reference

> อัปเดตล่าสุด: มี backend จริงแล้ว ไม่ใช่ mock mode อีกต่อไป เอกสารนี้เดิมเป็น handoff doc
> สำหรับสร้าง backend ตั้งแต่ศูนย์ ตอนนี้ backend สร้างเสร็จและ deploy ใช้งานจริงแล้ว
> จึงเปลี่ยนเป็นเอกสารอ้างอิง API/schema ที่มีอยู่จริงแทน

## สถาปัตยกรรมปัจจุบัน

- **Backend:** Node.js + Express 5 อยู่ที่ `server/` — deploy บน [Render](https://render.com)
- **Database:** [Turso](https://turso.tech) (libSQL/SQLite บนคลาวด์) ผ่าน `server/db.js`
  ใช้ `@libsql/client` — โค้ดตัวเดียวกันรันได้ทั้ง local (ไฟล์ SQLite ธรรมดา) และ production (Turso)
  สลับด้วย env var `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN`
- **Frontend:** เรียก backend ผ่าน `src/api.js` โดย `CONFIG.apiBaseUrl` (`src/config.js`)
  ค่า `CONFIG.isMockMode` ยังมีอยู่เป็นทางเลือก (fallback เป็น IndexedDB) แต่ **production ใช้ backend จริงเสมอ** (`isMockMode: false`)

ดูขั้นตอน deploy แบบละเอียดที่ [`DEPLOYMENT.md`](./DEPLOYMENT.md) และเรื่องระบบ login ที่ [`AUTH_SETUP.md`](./AUTH_SETUP.md)

## Authentication

ทุก endpoint ของ transactions/profile ต้อง login ก่อน (เช็คผ่าน httpOnly cookie ที่ตั้งตอน login — ดู `AUTH_SETUP.md`)

| Endpoint | Method | หมายเหตุ |
|----------|--------|---------|
| `/v1/auth/register` | POST | สมัครสมาชิกด้วย email/password |
| `/v1/auth/login` | POST | login ด้วย email/password |
| `/v1/auth/google` | POST | login ด้วย Google ID token |
| `/v1/auth/refresh` | POST | ขอ access token ใหม่จาก refresh token |
| `/v1/auth/me` | GET | ดึงข้อมูล user ปัจจุบันจาก session |
| `/v1/auth/logout` | POST | ออกจากระบบ, เพิกถอน refresh token |

## Transaction Endpoints

### 1. Get All Transactions
- **Endpoint:** `GET /v1/transactions`
- **Auth:** ต้อง login — คืนเฉพาะรายการของ user นั้น (`WHERE userId = ?`)

### 2. Create Transaction
- **Endpoint:** `POST /v1/transactions`
- **Content-Type:** `application/json` หรือ `multipart/form-data` (ถ้ามีไฟล์แนบ `receipt`)
- ไฟล์แนบเก็บที่ `server/uploads/` (จำกัด 5MB, เฉพาะไฟล์รูป) แล้วคืน `receiptUrl`

### 3. Delete Single Transaction
- **Endpoint:** `DELETE /v1/transactions/:id`
- **Response:** `{ "success": true, "deletedID": "..." }`

### 4. Delete Recurring Series
- **Endpoint:** `DELETE /v1/transactions/series/:seriesId`
- **Response:** `{ "success": true, "deletedCount": n }`

## Transaction Data Schema

```json
{
  "id": "1",
  "date": "2026-07-13",
  "amount": 250.50,
  "type": "expense",
  "mainCategory": "variable",
  "subcategory": "food",
  "notes": "Lunch",
  "title": "",
  "seriesId": "series_1234",
  "receiptUrl": "https://bound-api.onrender.com/uploads/..."
}
```

รายการทั้งหมดผูกกับ `userId` เสมอ (ดึงจาก session, ไม่ได้ส่งมาจาก client) — ดู schema เต็มใน `server/db.js`

## User Profile Endpoints

| Endpoint | Method | หมายเหตุ |
|----------|--------|---------|
| `/v1/users/profile` | GET | ข้อมูลโปรไฟล์ + `promptpayId` + `qrCodeUrl` |
| `/v1/users/profile` | PUT | อัปเดต `promptpayId` |
| `/v1/users/qrcode` | POST | อัปโหลดรูป QR Code (multipart) |

## Admin Endpoints (ใช้โดย `admin-app` เท่านั้น)

`GET /v1/admin/users`, `GET /v1/admin/stats` — ต้องมี role `admin` หรือ header `x-admin-key` ตรงกับ `ADMIN_KEY` ใน `.env`

## Categories

หมวดหมู่ custom ยังเก็บใน `localStorage` ฝั่ง frontend (key: `financeCategories`) — ยังไม่ได้ทำ endpoint สำหรับ sync ข้ามอุปกรณ์ (เป็นงานที่ยังไม่ได้ทำ ถ้าต้องการให้เพิ่ม `GET/PUT /v1/categories` แล้วอัปเดต `Bookshelf.jsx`)

## Data Export (Excel/PDF)

ยังทำงานฝั่ง frontend ล้วน (`xlsx`, `jspdf`) ไม่ต้องมี backend endpoint เพิ่ม — ดึงข้อมูลจาก `GET /v1/transactions` ที่มีอยู่แล้วมาสร้างไฟล์ในเบราว์เซอร์โดยตรง
