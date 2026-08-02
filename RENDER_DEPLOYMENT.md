# คู่มือการนำ BounD ขึ้นระบบ Render (All-In-One Deployment)

ตอนนี้โปรเจกต์ **BounD** ได้รับการตั้งค่าให้รันได้ทั้ง Frontend และ Backend ภายใต้บริการเดียวบน **Render** เรียบร้อยแล้ว

## โครงสร้างการทำงาน
```
Render Web Service (bound-api)
├── ขั้นตอน Build: npm install → vite build → cd server && npm install
├── หน้าเว็บ (React):  https://bound-api.onrender.com/
└── API (Express):    https://bound-api.onrender.com/v1/...
```

---

## 🚀 ขั้นตอนการตั้งค่าบน Render

### 1. เปิด Web Service ที่มีอยู่แล้ว (bound-api)
เข้าไปที่ [Render Dashboard](https://dashboard.render.com/) แล้วเลือกโปรเจกต์ `bound-api` ที่มีอยู่ได้เลยครับ (ไม่ต้องสร้างใหม่)

### 2. อัปเดต Build Command และ Start Command
ไปที่แท็บ **Settings** แล้วแก้ไขค่าดังนี้:

| ฟิลด์ | ค่าที่ต้องตั้ง |
|---|---|
| **Build Command** | `npm install --include=dev && npm run build && cd server && npm install` |
| **Start Command** | `node server/server.js` |
| **Root Directory** | *(ว่างเปล่า หรือ `.`)* |

### 3. ตรวจสอบ Environment Variables
ไปที่แท็บ **Environment** แล้วตรวจสอบว่ามีตัวแปรครบทุกตัวนี้:

| Name | ค่าที่ต้องใส่ |
|---|---|
| `NODE_ENV` | `production` |
| `ACCESS_TOKEN_TTL` | `15m` |
| `REFRESH_TOKEN_TTL` | `7d` |
| `JWT_ACCESS_SECRET` | *(ค่าเดิมจาก Render)* |
| `JWT_REFRESH_SECRET` | *(ค่าเดิมจาก Render)* |
| `ADMIN_KEY` | *(ค่าเดิมจาก Render)* |
| `GOOGLE_CLIENT_ID` | `407980925071-f3q5gdp5br5td1inhc6sr7ch98k2ba9v.apps.googleusercontent.com` |
| `TURSO_DATABASE_URL` | `libsql://bound-supanat-dev.aws-ap-northeast-1.turso.io` |
| `TURSO_AUTH_TOKEN` | *(ค่าเดิมจาก Render)* |
| `CLIENT_ORIGINS` | `https://bound-api.onrender.com` *(URL ของ Render นี่แหละ)* |

> ⚠️ **สำคัญ**: ค่า `CLIENT_ORIGINS` ต้องเปลี่ยนเป็น URL ของ Render ใหม่นี้ด้วย เพราะตอนนี้ Frontend และ Backend อยู่ใน Domain เดียวกันแล้ว

### 4. กด Manual Deploy
หลังจากอัปเดต Build Command เสร็จแล้ว ไปที่แท็บ **Deploys** แล้วกดปุ่ม **Deploy latest commit** ให้ Render ทำการ Build ใหม่โดยใช้โค้ดล่าสุดจาก GitHub

---

## ⚙️ ระบบอัปเดตอัตโนมัติ (CI/CD)

หลังจากตั้งค่าครั้งแรกเสร็จแล้ว ทุกครั้งที่มีการ **Push โค้ดใหม่** ขึ้น GitHub กิ่ง `main`:
1. Render จะตรวจจับเห็นการอัปเดตทันที
2. ระบบจะ Build ใหม่ (ลง npm → build React → start server) ให้โดยอัตโนมัติ
3. เว็บไซต์เวอร์ชันใหม่จะพร้อมใช้งานภายใน 2-3 นาที

---

## ⚠️ ข้อจำกัด Free Tier ของ Render
Render แบบฟรี (Free Instance) จะเข้าสู่โหมด **"หลับ" (Sleep)** หากไม่มีใครใช้งานนาน 15 นาที
ส่งผลให้:
- การโหลดเว็บครั้งแรกหลังจากที่ระบบหลับ อาจใช้เวลาประมาณ **30-60 วินาที**
- รูปภาพที่อัปโหลด (QR Code / ใบเสร็จ) จะ**หายไป**เมื่อระบบ Restart ตัวเอง (Ephemeral Storage)
