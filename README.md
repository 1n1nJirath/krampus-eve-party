# 👹 THE KRAMPUS EVE — Realtime Party Game Web App

ระบบเว็บแอปพลิเคชัน Realtime Party Game สไตล์ Jackbox Games สำหรับกิจกรรมค่ายมหาวิทยาลัยธีม **Dark Christmas (เอาชีวิตรอดจาก Krampus)** รองรับผู้เล่น 4 ทีม พร้อมระบบจัดการเหรียญศักดิ์สิทธิ์ (Holy Coins), เทียนศักดิ์สิทธิ์ (Holy Candles) และการซิงก์ข้อมูลระดับมิลลิวินาที (`< 50ms`)

---

## 🔗 โครงสร้างหน้าจอใช้งาน (Routes)

1. **หน้า Portal หลัก (`/`)** — ศูนย์รวมลิงก์เข้าใช้งานทุกหน้าจอ และปุ่มเปิด QR Code
2. **หน้าจอขึ้น Projector (`/display`)** — สำหรับเปิดเต็มจอบนจอใหญ่ให้ผู้เล่นทั้งห้องดู (แสดงโจทย์, เวลาถอยหลัง, สถานะทีมที่ส่งแล้ว, เฉลยคำตอบ และตาราง Leaderboard)
3. **หน้าแผงควบคุม GM ใหญ่ (`/admin`)** — สำหรับ GM ใหญ่ควบคุมเกมส่วนตัว (เลือกโจทย์จากคลัง, เปิดโหมดฟรีสไตล์ A/B/C/D, แอบดูคำตอบที่ส่งมาก่อนเฉลย, กดเฉลย และบวก/ลบเหรียญทั้ง 4 ทีม)
4. **หน้าจอมือถือ GM ประจำทีม (`/play` หรือ `/play?team=1` ถึง `4`)** — สำหรับสมาร์ตโฟนของ GM ประจำทีมทั้ง 4 ทีม

---

## 🎮 รองรับ 4 โหมดเกมหลัก (4 Jackbox-Inspired Modes)

- **Mode A: Multiple Choice (`4` ถึง `8` ตัวเลือก A–H)** — รองรับ *The Poll Mine* และ *Trivia Murder Party*
- **Mode B: Number / Year Input (Numpad + Timestamp `ms`)** — รองรับ *Timejinx* คำนวณผลต่างปี (`Absolute Difference`) และจัดลำดับความเร็วอัตโนมัติ
- **Mode C: Buzzer / Reaction (ปุ่มแย่งสิทธิ์ความเร็ว)** — จัดคิวอันดับ 1, 2, 3, 4 ทันทีตาม Timestamp ระดับมิลลิวินาที
- **Mode D: Wagering / Secret Number** — รองรับ *Lowest Unique Number (1–10)*, *Secret Coin Wager*, *Quixort Pass/Fail Betting* และ *Cursed Gift Box*

---

## 🚀 วิธีรันใช้งาน

```bash
npm install
npm run dev
```
จากนั้นเปิดเบราว์เซอร์ที่ `http://localhost:5173`
