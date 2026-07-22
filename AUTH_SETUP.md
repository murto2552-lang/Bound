# BounD — Authentication & Security Setup

ระบบล็อกอินถูกเขียนใหม่ให้ปลอดภัยขึ้น และรองรับการเข้าสู่ระบบด้วย Google

## สิ่งที่เปลี่ยนไป (สรุป)

| เดิม | ใหม่ |
|------|------|
| JWT เก็บใน `localStorage` (โดน XSS ขโมยได้) | JWT เก็บใน **httpOnly cookie** (JS อ่านไม่ได้) |
| Access token อายุ 7 วัน ไม่มีวิธี revoke | Access token 15 นาที + **refresh token** หมุนได้/เพิกถอนได้ (เก็บ hash ใน DB) |
| Secret hardcode ในโค้ด | ย้ายไป `.env` ทั้งหมด |
| Admin key คงที่ในโค้ด | อ่านจาก `.env` + เทียบแบบ constant-time / role-based |
| ไม่มี rate limit | `express-rate-limit` ที่ `/v1/auth/*` |
| error บอกว่า "ไม่พบผู้ใช้" (เดา email ได้) | error กลาง ๆ "Invalid email or password" |
| ไม่มี validation | ตรวจ input ด้วย `zod`, bcrypt rounds 12 |
| CORS เปิดทุก origin, ไม่มี security headers | จำกัด origin + `helmet` |
| ไม่มี Google login | รองรับ **Sign in with Google** |
| `db.js` `DROP TABLE transactions` ทุกครั้งที่รัน (ข้อมูลหาย!) | ตัดออก ใช้ migration ที่ปลอดภัย |

## การรันโปรเจค

### 1. Backend
```bash
cd server
npm install
# ไฟล์ .env ถูกสร้างไว้แล้ว (มี secret สุ่มให้) — ดู .env.example เป็นตัวอย่าง
npm start        # หรือ: node server.js
```
> ⚠️ ไฟล์ `server/.env` และ `server/finance.db` ถูกใส่ `.gitignore` แล้ว — **อย่า commit ขึ้น git**

### 2. Frontend
```bash
# ที่ root ของโปรเจค
npm install
cp .env.example .env   # แล้วใส่ค่า (โดยเฉพาะ VITE_GOOGLE_CLIENT_ID)
npm run dev
```

## ตั้งค่า Google Login (ต้องทำเองใน Google Cloud Console)

ผมสร้างโค้ดฝั่ง frontend/backend ไว้ครบแล้ว เหลือแค่คุณไปขอ **OAuth Client ID** มาใส่ `.env`

1. เข้า https://console.cloud.google.com/ แล้ว **สร้าง Project** ใหม่ (หรือเลือกอันเดิม)
2. ไปที่ **APIs & Services → OAuth consent screen**
   - เลือก **External**, กรอกชื่อแอป (BounD), email
   - เพิ่มตัวเองใน **Test users** (ตอนยังไม่ publish)
3. ไปที่ **APIs & Services → Credentials → Create Credentials → OAuth client ID**
   - Application type: **Web application**
   - **Authorized JavaScript origins** ใส่:
     - `http://localhost:5173`
     - (ตอน deploy จริงใส่ domain ของ frontend ด้วย เช่น `https://bound.example.com`)
   - **Authorized redirect URIs**: ไม่ต้องใส่ก็ได้ (เราใช้แบบ ID token ไม่ใช้ redirect)
4. กด Create → คัดลอก **Client ID** (รูปแบบ `xxxxx.apps.googleusercontent.com`)
5. เอา Client ID ไปใส่ **2 ที่**:
   - `server/.env` → `GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com`
   - root `.env` → `VITE_GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com`
6. รีสตาร์ท backend + frontend → ปุ่ม Google จะขึ้นมาเอง

## หมายเหตุตอน Deploy จริง (production)

- ตั้ง `NODE_ENV=production` — cookie จะเป็น `Secure` + `SameSite=None` (ต้องรันบน **HTTPS**)
- ตั้ง `CLIENT_ORIGINS` เป็น domain ของ frontend จริง
- **หมุน (rotate) secret ใหม่ทั้งหมด** ใน production (ของใน `.env` ตอนนี้ใช้สำหรับ dev)
- `finance.db` ต้องอยู่บน persistent volume (ถ้าโฮสต์ที่ filesystem หายเมื่อ restart เช่น บาง PaaS ให้ย้ายไป Postgres — db layer แยกไว้ที่ `server/db.js` แล้ว)

## สิ่งที่ยังทำเพิ่มได้ (ถ้ามีเวลา)
- ยืนยันอีเมล (email verification) / ลืมรหัสผ่าน (reset password)
- ลบ refresh token ที่หมดอายุออกจาก DB เป็นระยะ (cron)
- CSRF token เสริม (ตอนนี้กันด้วย SameSite cookie + CORS origin allowlist)
