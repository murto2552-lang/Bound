# BounD — Smart Finance Manager

เว็บแอปจัดการการเงินส่วนตัว บันทึกรายรับ-รายจ่าย ดูภาพรวมการเงินผ่านกราฟ จัดการรายการที่เกิดซ้ำ
สร้าง QR Code รับเงิน (PromptPay) และมีผู้ช่วย AI ให้คำแนะนำด้านการเงิน

**เว็บใช้งานจริง:** https://murto2552-lang.github.io/Bound/

## ฟีเจอร์

- **Bookshelf** — สรุปยอดเงินคงเหลือ/รายรับ/รายจ่าย พร้อมกราฟวงกลม เส้น และแท่ง
- **Calendar** — ดูรายการธุรกรรมแบบปฏิทิน
- **Assistant** — ผู้ช่วย AI แนะนำเรื่องการเงิน
- **Receive** — สร้าง/แสดง QR Code รับเงิน (PromptPay)
- **Profile** — ตั้งค่าบัญชี, PromptPay ID, อัปโหลด QR Code
- **Login** ด้วย email/password หรือ Google
- **Export** ข้อมูลเป็น Excel/PDF (ทำงานฝั่งเบราว์เซอร์ ไม่ต้องมี backend)
- **admin-app** — dashboard แยกต่างหากดูสถิติผู้ใช้/ธุรกรรมรวม (สำหรับทีมพัฒนา)

## สถาปัตยกรรม

```
Frontend (React + Vite)  →  Backend (Express)  →  Database (Turso / SQLite)
GitHub Pages                Render                  libSQL cloud
```

| ส่วน | เทคโนโลยี | อยู่ที่ |
|------|-----------|--------|
| Frontend | React 19, Vite, Tailwind CSS v4, framer-motion | root, deploy บน GitHub Pages |
| Backend | Node.js, Express 5 | `server/`, deploy บน Render |
| Database | SQLite (dev) / Turso libSQL (production) | `server/db.js` |
| Auth | httpOnly cookie, JWT access + refresh token, Google Sign-In | `server/authRoutes.js`, `src/context/AuthContext.jsx` |

รายละเอียด API ทั้งหมด: [`BACKEND_HANDOFF.md`](./BACKEND_HANDOFF.md)
ระบบ login/security: [`AUTH_SETUP.md`](./AUTH_SETUP.md)
วิธี deploy ขึ้น production: [`DEPLOYMENT.md`](./DEPLOYMENT.md)

## เริ่มพัฒนา (Local Development)

### 1. Backend

```bash
cd server
npm install
cp .env.example .env   # ใส่ค่า secret ของตัวเอง (ดูวิธีสุ่มใน AUTH_SETUP.md)
npm start
```
ไม่ต้องตั้ง `TURSO_DATABASE_URL`/`TURSO_AUTH_TOKEN` ตอน dev ก็ได้ — จะ fallback ไปใช้ไฟล์ SQLite ธรรมดา (`server/finance.db`) อัตโนมัติ

### 2. Frontend

```bash
npm install
cp .env.example .env   # ใส่ VITE_GOOGLE_CLIENT_ID ถ้าต้องการทดสอบ Google login
npm run dev
```
เปิด http://localhost:5173/Bound/

### Scripts อื่นๆ

```bash
npm run build     # build production (dist/)
npm run preview   # preview build ที่ทำไว้
npm run lint      # oxlint
```

## Deploy

Push เข้า `main` → GitHub Actions build frontend อัตโนมัติขึ้น GitHub Pages
Backend/database ต้องตั้งค่าแยกครั้งแรกตาม [`DEPLOYMENT.md`](./DEPLOYMENT.md) (Render + Turso)

## กติกาการพัฒนา

- ห้าม push ตรงเข้า `main` — สร้าง feature branch แล้วเปิด Pull Request (ดู [`.agents/AGENTS.md`](./.agents/AGENTS.md))
- ห้าม commit secret/`.env` ขึ้น git
- ใช้ `HashRouter` เท่านั้น (ไม่ใช่ `BrowserRouter`) เพื่อไม่ให้ 404 บน GitHub Pages
