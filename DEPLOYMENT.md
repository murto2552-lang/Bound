# BounD — Deployment Guide (ทำให้คนอื่นเข้าใช้ได้จริง)

สถาปัตยกรรม production:
- **Frontend** → GitHub Pages (static) ที่ `https://murto2552-lang.github.io/Bound/`
- **Backend** → Render (Node web service) ที่ `https://<ชื่อ>.onrender.com`
- **Database** → Turso (SQLite-compatible cloud, ฟรี) — ข้อมูลไม่หายตอน backend restart

ทำตามลำดับ 1 → 5 ครับ

---

## 1) สร้าง Database บน Turso

1. เข้า https://turso.tech → Sign up ด้วย GitHub
2. สร้าง database ใหม่ (เลือก region สิงคโปร์ `aws-ap-southeast-1` จะใกล้ไทยสุด)
3. เปิดหน้า database → คัดลอก 2 ค่า:
   - **Database URL** (ขึ้นต้นด้วย `libsql://...`)
   - **Auth token** (กด Create Token) — เป็นความลับ อย่าเปิดเผย
4. เก็บทั้งสองค่าไว้ใช้ในขั้นที่ 2

> ถ้าถนัด CLI: `turso db create bound` แล้ว `turso db show bound --url` และ `turso db tokens create bound`

---

## 2) Deploy Backend บน Render

1. เข้า https://render.com → Sign up ด้วย GitHub → อนุญาตให้เข้าถึง repo `Bound`
2. **New +** → **Web Service** → เลือก repo `murto2552-lang/Bound`
3. ตั้งค่า:
   - **Name:** `bound-api` (จะได้ URL `https://bound-api.onrender.com`)
   - **Root Directory:** `server`
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free
4. กด **Advanced → Add Environment Variable** ใส่ทีละตัว (ค่า secret เอามาจาก `server/.env` ในเครื่อง แต่ **สร้างใหม่สำหรับ production**):

   | Key | Value |
   |-----|-------|
   | `NODE_ENV` | `production` |
   | `CLIENT_ORIGINS` | `https://murto2552-lang.github.io` |
   | `JWT_ACCESS_SECRET` | (สุ่มใหม่ 64+ ตัว) |
   | `JWT_REFRESH_SECRET` | (สุ่มใหม่ 64+ ตัว อีกอัน) |
   | `ACCESS_TOKEN_TTL` | `15m` |
   | `REFRESH_TOKEN_TTL` | `7d` |
   | `ADMIN_KEY` | (สุ่มใหม่) |
   | `GOOGLE_CLIENT_ID` | `407980925071-...apps.googleusercontent.com` |
   | `TURSO_DATABASE_URL` | (libsql URL จากขั้นที่ 1) |
   | `TURSO_AUTH_TOKEN` | (auth token จากขั้นที่ 1) |

   > สุ่ม secret: รันในเครื่อง `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

5. กด **Create Web Service** → รอ deploy เสร็จ → จดURL เช่น `https://bound-api.onrender.com`

> หมายเหตุ Render Free: ถ้าไม่มีคนเข้า ~15 นาที เซิร์ฟเวอร์จะ "หลับ" ครั้งแรกที่เข้าใหม่จะช้า ~30 วิ (ปกติของ free tier)

---

## 3) เพิ่ม production origin ใน Google Cloud Console

1. เข้า https://console.cloud.google.com → เลือก project `BounD` → **Google Auth Platform → Clients**
2. เปิด `BounD Web Client` → ที่ **Authorized JavaScript origins** กด **Add URI** ใส่:
   ```
   https://murto2552-lang.github.io
   ```
3. **Save** (มีผลภายในไม่กี่นาที)

---

## 4) ตั้งค่า GitHub Actions (frontend build)

Frontend build บน GitHub ต้องรู้ค่า 2 ตัวนี้:

1. ไปที่ repo บน GitHub → **Settings → Secrets and variables → Actions → Variables** → **New repository variable**
2. เพิ่ม 2 ตัว (เป็น **Variables** ไม่ใช่ Secrets ก็ได้ เพราะไม่ใช่ความลับ):

   | Name | Value |
   |------|-------|
   | `VITE_API_BASE_URL` | `https://bound-api.onrender.com/v1` |
   | `VITE_GOOGLE_CLIENT_ID` | `407980925071-...apps.googleusercontent.com` |

3. ไปที่ **Settings → Pages** → ให้ Source เป็น **GitHub Actions** (ถ้ายังไม่ได้ตั้ง)

---

## 5) Deploy frontend

Push อะไรก็ได้เข้า `main` (หรือไป **Actions → Deploy to GitHub Pages → Run workflow**) เพื่อให้ build ใหม่ด้วยค่าที่ตั้งไว้

เสร็จแล้วเข้า `https://murto2552-lang.github.io/Bound/`:
- ปุ่ม "ดำเนินการต่อโดยใช้ Google" จะขึ้น
- login/สมัคร/บันทึกรายการ เชื่อม backend จริงบน Render + เก็บข้อมูลใน Turso

---

## ⚠️ ข้อจำกัดเรื่อง test users (Google)

ตอนนี้ OAuth app อยู่ในโหมด **Testing** → มีแค่คนที่อยู่ใน **Test users** (ใน Google Auth Platform → Audience) เท่านั้นที่ login ด้วย Google ได้ (สูงสุด 100 คน)

ถ้าจะให้ใครก็ได้ login ด้วย Google ต้องกด **Publish app** แล้วผ่านการ verify ของ Google (ใช้เวลาหลายวัน) — สำหรับเดโม่/แข่ง แนะนำใช้โหมด Testing + เพิ่มอีเมลกรรมการเป็น test user จะเร็วกว่า
(ผู้ใช้ยังสมัคร/login ด้วย email+password ปกติได้ทุกคน ไม่ติดข้อจำกัดนี้)
