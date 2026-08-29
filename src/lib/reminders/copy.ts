import type { ReminderCadence } from "@prisma/client";

export const REMINDER_HREF: Record<ReminderCadence, string> = {
  DAILY: "/todos",
  WEEKLY: "/home",
  MONTHLY: "/reviews/monthly",
  QUARTERLY: "/reviews/quarterly",
};

export const REMINDER_COPY: Record<
  "th" | "en",
  Record<ReminderCadence, { title: string; body: string }>
> = {
  th: {
    DAILY: {
      title: "งานวันนี้ยังรออยู่",
      body: "เปิด Today แล้วปิดงานเล็ก ๆ สักข้อ — ก้าวเล็ก ๆ ก็ยังเดินทาง",
    },
    WEEKLY: {
      title: "สรุปสัปดาห์นี้",
      body: "อะไรเวิร์ก อะไรฝืด และโฟกัสสัปดาห์หน้าคืออะไร",
    },
    MONTHLY: {
      title: "ถึงเวลารีวิวเดือนนี้",
      body: "สิ่งที่รัก / สิ่งที่เลิก / สิ่งที่ต่อ — แล้วให้คะแนน 6 เสาหลัก",
    },
    QUARTERLY: {
      title: "ปิดไตรมาสนี้",
      body: "ดูสกอร์การ์ดเป้า SMART แล้ววางแผนไตรมาสถัดไป",
    },
  },
  en: {
    DAILY: {
      title: "Today’s todos are waiting",
      body: "Open Today and close one small task — small steps still count.",
    },
    WEEKLY: {
      title: "This week in review",
      body: "What worked, what frictioned, and what’s next week’s focus?",
    },
    MONTHLY: {
      title: "Time for your monthly review",
      body: "Loved / stop / continue — then rate the six pillars.",
    },
    QUARTERLY: {
      title: "Close this quarter",
      body: "Score your SMART goals, then sketch the next quarter.",
    },
  },
};
