# แผน LINE Login + การแจ้งเตือน OA

สถานะโค้ดบน `feature/logout-responsive-line-plan` (ยังไม่ผสม `main` / production)

โค้ดหลักมีอยู่แล้ว — งานที่เหลือส่วนใหญ่เป็น **credentials, cron, และตรวจบน OA จริง** ไม่ใช่เขียน OAuth ใหม่

ห้ามใช้ LINE Notify (ปิดบริการแล้ว) ใช้ Official Account + Messaging API เท่านั้น

## สิ่งที่มีในโค้ดแล้ว

### เข้าสู่ระบบด้วย LINE
- ปุ่มบน `/login` และ `/signup` (`openid` เท่านั้น ไม่ขออีเมลจาก LINE)
- `GET /api/line/start?intent=login` → LINE OAuth → `GET /api/line/callback`
- สร้าง Auth user ด้วยอีเมลตัวแทน `line-{userId}@line.invalid` แล้ว mint session ผ่าน service role
- บัญชี LINE-only เลิกเชื่อมไม่ได้ (ยังเข้าด้วย LINE ได้)

### ผูก LINE กับ user ที่ใช้อีเมลอยู่แล้ว
- Settings → เชื่อมกับ LINE → `intent=link` (ต้องมี session)
- ตาราง `LineAccount` (`userId` 1:1, `lineUserId` unique)
- ถ้า LINE นั้นผูกกับคนอื่นแล้ว → `line_taken`
- เลิกเชื่อมได้ถ้าบัญชีมีอีเมลจริง

### การเตือนส่วนตัวในแชท OA
- ผู้ใช้เลือกช่อง `LINE` ใน reminder cadence
- Cron `GET/POST /api/cron/reminders` (`CRON_SECRET`) เรียก `dispatchDueReminders`
- ส่งเมื่อ: ผูกแล้ว + OA ยังส่งถึงได้ (`reachable`) + `reminderOptIn` + Messaging API ตั้งค่าแล้ว
- Inbox ในแอปมีสำเนาเสมอ
- Webhook `POST /api/line/webhook` อัปเดต follow/unfollow และตอบทางลัด
- Consent ข่าวสาร (`broadcastOptIn`) คนละสวิตช์จาก reminder — ยังไม่มี job บรอดแคสต์

ไฟล์หลัก: `src/lib/line/*`, `src/app/api/line/*`, `src/lib/reminders/dispatch.ts`, `src/components/settings/line-connect.tsx`

## แผนให้การแจ้งเตือนเกิดจริง

1. **LINE Developers (provider เดียวกัน)**
   - Messaging API channel + LINE Login channel ผูกกับ OA เดียวกัน
   - Callback: `{APP_URL}/api/line/callback`
   - Webhook: `{APP_URL}/api/line/webhook` (verify signature ด้วย `LINE_MESSAGING_CHANNEL_SECRET`)
   - Scope ในคอนโซล: `openid` (+ friendship ถ้าจะโชว์สถานะเพื่อน)
   - ใส่ env ตาม `.env.example` (`LINE_*`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, `NEXT_PUBLIC_LINE_OA_BASIC_ID`)

2. **Cron ให้ตรงหน้าต่าง 2 ชั่วโมง**
   - Daily due เมื่อนาฬิกาไทยถึงเวลาที่ตั้ง และยังไม่เกิน 120 นาที
   - `vercel.json` ตอนนี้ `0 14 * * *` (21:00 ไทย) เพราะ Vercel Hobby ยิงได้วันละครั้ง — คนที่ตั้ง 08:00 จะไม่โดนหน้าต่างนี้
   - ให้เกิดจริง: Pro (cron ทุก 10 นาทีตาม HANDOFF) หรือตัวจัดตารางภายนอกยิง `/api/cron/reminders` ด้วย `Authorization: Bearer $CRON_SECRET`

3. **Rich menu (ทางลัดในแชท)**
   - `src/lib/line/rich-menu.ts` มีอยู่ ยังไม่มี API/สคริปต์ deploy
   - รันครั้งเดียวหลัง Messaging token พร้อม (today / goals / reviews / home)

4. **ตรวจบนเครื่องจริง**
   - Login ด้วย LINE แล้วเข้าแอป
   - อีเมลเดิมกดเชื่อม LINE ใน Settings แล้วยังเข้าด้วยอีเมลได้
   - เพิ่มเพื่อน OA → `reachable`
   - ตั้งเตือน daily ช่อง LINE ในหน้าต่าง cron → ได้ข้อความ + แถวใน inbox
   - บล็อก OA → หยุดส่ง; ทักใหม่แล้วเชื่อมได้

## แผน Sync user ↔ LINE

| จาก | ไป | ผล |
| --- | --- | --- |
| ยังไม่มีบัญชี | ปุ่ม LINE บน login/signup | สร้าง user + `LineAccount` + session |
| มีอีเมลแล้ว | Settings → เชื่อม LINE | ผูก `lineUserId` กับ `User.id` เดิม |
| เคยผูกแล้ว | ปุ่ม LINE บน login | session ของอีเมลที่ผูกไว้ |

งานที่ยังไม่ทำ (ทำทีหลังบน develop ไม่ใช่ production):
- รวมบัญชีถ้าคนสมัครอีเมลคนละอันกับ LINE ที่เคยสร้าง `line-…@line.invalid`
- แสดงชื่อ/รูปจาก LINE (ตอนนี้ขอแค่ `openid`)
- บรอดแคสต์ข่าวสารตาม `broadcastOptIn` (อย่าผสมกับ reminder)

## ลำดับทำต่อ (หลังยืนยัน credentials)

1. ใส่ env บน preview ของ develop — อย่าใส่ใน production จนกว่าจะเทสผ่าน
2. เปิด webhook + callback บน LINE Developers ชี้ไปที่ preview URL
3. เปลี่ยน cron เป็นทุก 10 นาที หรือตัวจัดตารางภายนอก
4. Deploy rich menu
5. เทสตารางด้านบน แล้วค่อย merge เข้า develop → main
