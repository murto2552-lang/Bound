# คู่มือการนำ BounD ขึ้นระบบ Vercel (All-In-One Deployment)

ตอนนี้โปรเจกต์ **BounD** ได้รับการตั้งค่าให้รันได้ทั้ง Frontend และ Backend ภายในระบบ **Vercel** เรียบร้อยแล้ว (All-In-One) ช่วยให้เว็บโหลดไวมาก (ไม่มีปัญหาเซิร์ฟเวอร์หลับ) และแก้ปัญหาล็อกอินหลุดบน Safari/iOS ได้ 100%

## 🚀 ขั้นตอนการ Deploy ขี้น Vercel

### 1. เชื่อมต่อ GitHub กับ Vercel
1. เข้าไปที่เว็บ [Vercel](https://vercel.com/) และเข้าสู่ระบบด้วยบัญชี GitHub ของคุณ
2. กดปุ่ม **Add New...** -> **Project**
3. ในหมวด Import Git Repository ให้เลือกโปรเจกต์ `Bound` จาก GitHub ของคุณ
4. กดปุ่ม **Import**

### 2. กำหนดการตั้งค่าในหน้า Configure Project
- **Framework Preset**: Vercel จะตรวจจับว่าเป็น **Vite** ให้อัตโนมัติ (ปล่อยไว้ตามนั้น)
- **Root Directory**: `Bound` (กรณีที่โค้ดอยู่ในโฟลเดอร์ Bound แต่ถ้าโค้ดทั้งหมดอยู่ที่ Root เลยให้ปล่อยว่างไว้)
- ข้ามส่วน Build and Output Settings ไปก่อน

### 3. ใส่ Environment Variables
กดขยายส่วน **Environment Variables** และก๊อปปี้ค่าจากในไฟล์ `server/.env` ของคุณมาใส่ทีละบรรทัด (สำคัญมาก ถ้าไม่ใส่ระบบจะไม่ทำงาน):

| Name | Value |
|------|-------|
| `NODE_ENV` | `production` |
| `TURSO_DATABASE_URL` | `libsql://...` (ได้จากขั้นตอนสร้าง Turso DB) |
| `TURSO_AUTH_TOKEN` | (Token จาก Turso) |
| `JWT_ACCESS_SECRET` | (ข้อความสุ่มยาวๆ สำหรัย Access Token) |
| `JWT_REFRESH_SECRET` | (ข้อความสุ่มยาวๆ สำหรัย Refresh Token) |
| `ACCESS_TOKEN_TTL` | `15m` |
| `REFRESH_TOKEN_TTL` | `7d` |
| `ADMIN_KEY` | (รหัสผ่านของ Admin) |
| `VITE_GOOGLE_CLIENT_ID` | `xxxxx.apps.googleusercontent.com` (จาก Google Console) |
| `GOOGLE_CLIENT_ID` | `xxxxx.apps.googleusercontent.com` (ใส่ค่าเดียวกับด้านบน) |

> ⚠️ **คำเตือน**: ตอน Deploy บน Vercel ค่า URL Frontend (CLIENT_ORIGINS) และ API_BASE_URL ไม่จำเป็นต้องตั้งแล้ว เพราะระบบจะใช้งานโดเมนเดียวกันโดยอัตโนมัติ

### 4. กด Deploy
- กดปุ่ม **Deploy** แล้วรอให้ Vercel ทำงานประมาณ 1-2 นาที
- เมื่อสำเร็จ คุณจะได้ URL จริงมาใช้งาน เช่น `https://bound-finance.vercel.app`

---

## ⚙️ ระบบอัปเดตอัตโนมัติ (CI/CD)

หลังจากขั้นตอนนี้ ทุกครั้งที่คุณหรือทีมงานทำการ **Push โค้ดใหม่** ขึ้น GitHub กิ่ง `main`:
1. Vercel จะตรวจจับเห็นการอัปเดตทันที
2. ระบบจะสั่ง Build หน้าเว็บใหม่ และอัปเดต Serverless API ให้
3. เว็บไซต์เวอร์ชันใหม่จะพร้อมใช้งานภายใน 1 นาที โดยไม่ต้องเข้ามาหน้า Dashboard ของ Vercel เลย!

---

## 📌 หมายเหตุสำคัญเรื่องระบบอัปโหลดไฟล์ (QR Code & ใบเสร็จ)
บนสถาปัตยกรรม Serverless ของ Vercel **ไม่รองรับการเขียนไฟล์ลงดิสก์อย่างถาวร** (Ephemeral Storage)
ปัจจุบันระบบได้ตั้งให้บันทึกไฟล์อัปโหลดชั่วคราวในโฟลเดอร์ `/tmp` เพื่อไม่ให้เกิด Error
แต่ถ้าหน้าเว็บหลับหรือรีเซ็ต รูปใบเสร็จหรือ QR Code ที่อัปโหลดไว้อาจจะ **หายไป** 

หากในอนาคตต้องการเก็บรูปอย่างจริงจัง แนะนำให้แก้ไข API อัปโหลดไปใช้บริการฝากไฟล์ฟรี เช่น **Vercel Blob**, **AWS S3**, หรือ **Cloudinary** แทนครับ
