import React, { useState } from 'react';
import { BookOpen, Play, Eye, EyeOff, Sparkles, Coins, AlertTriangle } from 'lucide-react';
import { RoundConfig } from '../types/game';
import { SafeActionButton } from './SafeActionButton';

export type PhaseBriefingKey =
  | 'POLL_MINE:SUB1_SURVIVAL'
  | 'POLL_MINE:SUB2_SNAKE_DRAFT'
  | 'POLL_MINE:SUB3_POLARITY'
  | 'TIMEJINX:CHRONO_SUB1_CLASSIC'
  | 'TIMEJINX:CHRONO_SUB2_TRAP'
  | 'TIMEJINX:CHRONO_SUB3_FAST_FINGER'
  | 'QUIXORT:MAIN'
  | 'TRIVIA_MURDER:PART1'
  | 'TRIVIA_MURDER:PART2';

interface PhaseBriefingSpec {
  gameBadge: string;
  title: string;
  subtitle: string;
  artImage: string;
  rules: string[];
  rewards: string;
  penalties: string;
  demoTitle: string;
  demoPrompt: string;
  demoChoices: string[];
  demoAnswer: string;
}

const BRIEFING_DATA: Record<PhaseBriefingKey, PhaseBriefingSpec> = {
  'POLL_MINE:SUB1_SURVIVAL': {
    gameBadge: 'เกมที่ 1 • ด่านย่อยที่ 1/3',
    title: 'Survival Snake Draft (1-2-3-4-4-3-2-1)',
    subtitle: 'ทายผลโพลมหาชน 8 ประตู — ตามล่า 3 อันดับยอดนิยม (#1 – #3)',
    artImage: '/art/manor-interior.png',
    rules: [
      'แต่ละทีมผลัดกันเปิดประตูทีมละ 2 บาน ตามลำดับงูเลื้อย: 1 ➔ 2 ➔ 3 ➔ 4 ➔ 4 ➔ 3 ➔ 2 ➔ 1',
      'เป้าหมาย: เปิดประตูให้ตรงกับอันดับยอดนิยม #1, #2 หรือ #3',
      'ด่านจะจบทันทีเมื่อเปิดครบทั้ง 3 บานปลอดภัย หรือเปิดครบทุกกลุ่ม',
    ],
    rewards: 'เปิดถูกบานปลอดภัย รับ +300 ฿ ทันที (ต่อบาน)',
    penalties: 'เปิดผิดโดนหัก -1 เกราะเด็กดี 🛡️ (ต่ำสุด 0) • หากเกราะเป็น 0 บังคับซื้อเกราะ -500 ฿ ได้คืน 2 เกราะ • เปิดครบ 8 ไม่เจอเลย -200 ฿',
    demoTitle: 'ตัวอย่างข้อ Demo: "ของขวัญวันคริสต์มาสที่คนไทยไม่อยากได้ที่สุด?"',
    demoPrompt: 'สมมติมีประตู A–H ลองทายดูว่า 3 อันดับแรกที่คนตอบเยอะสุดคือข้อไหน?',
    demoChoices: ['A. คุกกี้กล่องแดง', 'B. แก้วน้ำ/มัก', 'C. ผ้าขนหนู', 'D. ปฏิทินตั้งโต๊ะ'],
    demoAnswer: 'เฉลย Demo: อันดับ #1 คุกกี้กล่องแดง, #2 ผ้าขนหนู, #3 แก้วน้ำ — เปิดถูกปุ๊บรับ +300 ฿!',
  },
  'POLL_MINE:SUB2_SNAKE_DRAFT': {
    gameBadge: 'เกมที่ 1 • ด่านย่อยที่ 2/3',
    title: 'Snake Draft 2 (4-3-2-1-1-2-3-4)',
    subtitle: 'พลิกลำดับงูเลื้อย — ตามล่าอันดับกลาง (#2, #3, #4)',
    artImage: '/art/manor-interior.png',
    rules: [
      'คราวนี้ลำดับกลับด้าน! ทีม 4 เริ่มก่อน: 4 ➔ 3 ➔ 2 ➔ 1 ➔ 1 ➔ 2 ➔ 3 ➔ 4',
      'ระวัง! อันดับ #1 ไม่ใช่คำตอบที่ปลอดภัยในรอบนี้ เป้าหมายคืออันดับ #2, #3 และ #4 เท่านั้น',
      'ด่านจะจบทันทีเมื่อเปิดประตูอันดับ #2, #3, #4 ครบหมดแล้ว',
    ],
    rewards: 'เปิดถูกอันดับ #2, #3 หรือ #4 รับ +300 ฿',
    penalties: 'เปิดผิด (รวมถึงเปิดโดน #1!) โดนหัก -1 🛡️ • เกราะหมด 0 บังคับ Bailout -500 ฿ ได้ +2 🛡️ • เปิดครบ 8 ไม่เจอ -200 ฿',
    demoTitle: 'ตัวอย่างข้อ Demo: "เมนูยอดฮิตในงานปาร์ตี้คริสต์มาส?"',
    demoPrompt: 'ถ้า #1 คือ "ไก่งวง/ไก่ย่าง" รอบนี้เปิดเจอ #1 จะถือว่าผิด! ต้องเล็ง #2–#4 เช่น:',
    demoChoices: ['#1 ไก่ย่าง (❌ กับดัก!)', '#2 พิซซ่า (✅ +300 ฿)', '#3 เค้กขอนไม้ (✅ +300 ฿)', '#4 หมูกระทะ (✅ +300 ฿)'],
    demoAnswer: 'เฉลย Demo: ต้องกะจังหวะเลือก "ยอดนิยมรองลงมา" อย่าเผลอจิ้มอันดับ #1!',
  },
  'POLL_MINE:SUB3_POLARITY': {
    gameBadge: 'เกมที่ 1 • ด่านย่อยที่ 3/3',
    title: 'Polarity (#1 & #8) • เก้าอี้ 12 ตัวหน้ากระดาน',
    subtitle: 'ทายสองขั้วตรงข้ามพร้อมกัน: ยอดนิยมอันดับ #1 และ บ๊วยสุดอันดับ #8',
    artImage: '/art/manor-interior.png',
    rules: [
      'เก้าอี้ 12 ตัววางหน้ากระดาน! ทีมไหนมั่นใจวิ่งมานั่งเก้าอี้ก่อนได้เลย (1 ที่นั่ง/กลุ่ม ห้ามซ้ำ)',
      'ทุกทีมแอบเลือกประตู 2 บานพร้อมกันบนมือถือ: บานที่ 1 = อันดับยอดนิยม #1 และ บานที่ 2 = อันดับบ๊วย #8',
      'เปิดเฉลยพร้อมกันทุกทีมหลังหมดเวลา!',
    ],
    rewards: 'ทายถูก 1 อันดับ รับ +300 ฿ • ทายถูกทั้ง 2 อันดับ (#1 และ #8) รับโบนัสใหญ่ +700 ฿!',
    penalties: 'ไม่มีหักเกราะในรอบวัดใจ — แต่ถ้าพลาดทั้งคู่จะชวดเงินก้อนโตก่อนเข้าเกมที่ 2!',
    demoTitle: 'ตัวอย่างข้อ Demo: "สิ่งที่คนมักทำเป็นอันดับแรกเมื่อตื่นเช้าวันคริสต์มาส?"',
    demoPrompt: 'ต้องเลือกทั้ง "สิ่งที่คนทำเยอะสุด (#1)" และ "สิ่งที่คนทำน้อยสุด (#8)"',
    demoChoices: ['#1 เปิดดูของขวัญใต้ต้นสน', '#8 ออกไปวิ่งมาราธอน 5 โล'],
    demoAnswer: 'เฉลย Demo: ถ้าทายถูกแค่ #1 ได้ +300 ฿ แต่ถ้าถูกทั้ง #1 และ #8 รับเต็มๆ +700 ฿!',
  },
  'TIMEJINX:CHRONO_SUB1_CLASSIC': {
    gameBadge: 'เกมที่ 2 • ด่านย่อยที่ 1/3',
    title: 'Classic Chrono (กงล้อกาลเวลา)',
    subtitle: 'เลื่อน Slider ทายปี ค.ศ. / พ.ศ. อย่างอิสระ (ทีละ 1 ปี)',
    artImage: '/art/winter-forest.png',
    rules: [
      'ทุกทีมเลื่อน Slider บนมือถือเพื่อทายปีของเหตุการณ์ให้ใกล้เคียงที่สุด (Step ทีละ 1 ปี)',
      'คำนวณคะแนนจากความคลาดเคลื่อน (Absolute Difference) เทียบกับปีเฉลย',
      'ระวัง: ทีมที่ทายห่างจากความจริงที่สุดของข้อนั้น อาจชวดคะแนนปลอบใจ!',
    ],
    rewards: 'ตรงเป๊ะ +600 ฿ • ห่าง ±1 ปี +300 ฿ • ห่าง ±2 ปี 0 ฿ (รอดตัว)',
    penalties: 'ห่างตั้งแต่ 3 ปีขึ้นไป: โดนหัก -100 ฿ ต่อปีที่ห่าง (หักสูงสุด -1,000 ฿)',
    demoTitle: 'ตัวอย่างข้อ Demo: "ภาพยนตร์ Home Alone ภาคแรกเข้าฉายในปี ค.ศ. ใด?"',
    demoPrompt: 'ลองเล็งปีในช่วง 1985 – 1995 ดูครับ:',
    demoChoices: ['ถ้าตอบ 1990 ➔ ตรงเป๊ะ (+600 ฿)', 'ถ้าตอบ 1989 / 1991 ➔ ±1 ปี (+300 ฿)', 'ถ้าตอบ 1988 / 1992 ➔ ±2 ปี (0 ฿)', 'ถ้าตอบ 1985 ➔ ห่าง 5 ปี (-500 ฿)'],
    demoAnswer: 'เฉลย Demo: ปี ค.ศ. 1990! ยิ่งห่างยิ่งโดนหักหนัก สูงสุด -1,000 ฿ ต่อข้อ!',
  },
  'TIMEJINX:CHRONO_SUB2_TRAP': {
    gameBadge: 'เกมที่ 2 • ด่านย่อยที่ 2/3',
    title: 'Trap Placement (วางกับดักกาลเวลา)',
    subtitle: 'ทีมรวยได้โควตาวางกับดักป่วน Slider คู่แข่ง — แต่ถ้าฝ่าสำเร็จรับคูณ 2!',
    artImage: '/art/winter-forest.png',
    rules: [
      'ช่วงวางกับดัก: เรียงอันดับความรวย (3 / 2 / 1 / 0 ชิ้น) เลือกวางกับดักใส่คู่แข่ง (ห้ามวางใส่ตัวเอง)',
      'ผลของกับดักบนมือถือ: โดน 1 อัน = เลือกได้เฉพาะเลขคู่/คี่ • โดน 2 อัน = บีบสเต็ปทีละ 5 ปี • โดน 3 อัน = บีบทีละ 10 ปี!',
      'โควตา Trap Breaker: ทีมที่โดนกับดัก ≥1 อัน หากทายตรงเป๊ะหรือ ±1 ปี ได้รางวัล x2!',
    ],
    rewards: 'ปกติตรงเป๊ะ +600 ฿ / ±1 ปี +300 ฿ • ติดกับดักแล้วฝ่าได้ (Trap Breaker): x2 (+1,200 ฿ / +600 ฿)!',
    penalties: '±2 ปี 0 ฿ • ห่าง ≥3 ปี หัก -100 ฿/ปี (สูงสุด -1,000 ฿) — การบีบสเต็ป 10 ปีอาจทำคู่แข่งหลุดเป้าได้ง่ายๆ!',
    demoTitle: 'ตัวอย่างข้อ Demo: ผลของกับดัก 3 ระดับ',
    demoPrompt: 'สมมติปีเฉลยคือ ค.ศ. 2004 และทีม A โดนคู่แข่งรุมวางกับดักใส่ 2 อัน:',
    demoChoices: ['สเต็ปของทีม A จะถูกบังคับเลื่อนทีละ 5 ปี (เช่น 2000, 2005, 2010)', 'ทีม A เลือก 2005 (ห่างแค่ ±1 ปี!)', 'เข้าเงื่อนไข Trap Breaker x2!'],
    demoAnswer: 'เฉลย Demo: จากปกติ +300 ฿ ทีม A ได้เบิ้ลเป็น +600 ฿ ทันที! (ถ้าโดนแกล้งแล้วยังแม่น = รวยเละ)',
  },
  'TIMEJINX:CHRONO_SUB3_FAST_FINGER': {
    gameBadge: 'เกมที่ 2 • ด่านย่อยที่ 3/3',
    title: 'Fast Finger Year (แย่งกดปี Realtime)',
    subtitle: 'ช่วงปีแคบ 8–12 ปี • ใครกดปีไหนก่อน ปีนั้นล็อกให้ทีมนั้นทันที!',
    artImage: '/art/winter-forest.png',
    rules: [
      'ระบบ First-Come-First-Served: บนหน้าจอจะมีปุ่มปีเรียงกัน (เช่น 2012 – 2021)',
      '1 ปีกดจองได้แค่ 1 ทีมเท่านั้น! ใครนิ้วไวกดชิงปีที่ใช่ได้ก่อน เอาไปเลย',
      'เตรียมเก้าอี้/นิ้วให้พร้อม ห้ามลังเลเด็ดขาด!',
    ],
    rewards: 'ตรงเป๊ะ +1,000 ฿ • ห่างไม่เกิน ≤2 ปี (กรณีปีตรงโดนแย่งไปแล้ว) รับ +400 ฿!',
    penalties: 'ถ้ามัวแต่ลังเลจนปีใกล้เคียงโดนแย่งหมด อาจหลุดเกิน 2 ปีและชวดเงินรางวัลก้อนใหญ่!',
    demoTitle: 'ตัวอย่างข้อ Demo: "เกม Among Us ระเบิดความนิยมทั่วโลกปี ค.ศ. ใด?"',
    demoPrompt: 'กระดานปี: [2015] [2016] [2017] [2018] [2019] [2020] [2021] [2022]',
    demoChoices: ['ทีม 1 กด [2020] ก่อนใครเพื่อน ➔ ล็อก 2020 ให้ทีม 1 (+1,000 ฿)!', 'ทีม 2 กด [2019] หรือ [2021] ทันเวลา ➔ ห่าง ≤2 ปี (+400 ฿)'],
    demoAnswer: 'เฉลย Demo: ปี 2020 (+1,000 ฿) — ถ้าโดนแย่งปีแม่น ให้รีบคว้าปีข้างๆ (±1, ±2) เพื่อเอา +400 ฿!',
  },
  'QUIXORT:MAIN': {
    gameBadge: 'เกมที่ 3 • ด่านสายพานของเล่นผีสิง',
    title: 'THE TOY FACTORY CHAOS',
    subtitle: 'ทีมเรียง (Sorting) ปะทะ ทีมถือการ์ด (Holding) + ป่วนสลับตำแหน่ง!',
    artImage: '/art/manor-snowy.png',
    rules: [
      'จับคู่ 2 ทีมลงสนาม: "ทีมถือการ์ด" ยืนเรียงแถวถือไอเทมคนละชิ้น • "ทีมเรียง" เป็นคนสั่งให้สลับตำแหน่งให้ถูกเงื่อนไข',
      'จะมี 1 ชิ้นเป็น Mystery Item (?) ที่ไม่เห็นตัวเลขจริง ต้องใช้คำใบ้เทียบเอา!',
      'ทีมผู้ชม (Spectator) มีสิทธิ์กด "Sabotage Shuffle" ได้ทีมละ 1 ครั้ง/เกม (ก่อน 15 วิสุดท้าย) เพื่อแช่แข็งและสลับตำแหน่งมั่ว!',
    ],
    rewards: 'เรียงถูกทั้งหมด 0 ผิดพลาด: ทีมเรียงรับ +800 ฿ • ทีมถือรับ +300 ฿!',
    penalties: 'ผิด ≥1 ตำแหน่ง: หักทีมเรียง -100 ฿ ต่อจุดที่ผิด + โดนคำสาป Toy Factory Curse (เริ่มเกม 4 ด้วย 3 หัวใจแทน 4 ❤️)!',
    demoTitle: 'ตัวอย่างข้อ Demo: "เรียงความสูงแลนด์มาร์กไทยจาก เตี้ยสุด ➔ สูงสุด"',
    demoPrompt: 'สมาชิก 4 คนถือป้าย: [อนุสาวรีย์ฯ 49 ม.] [ใบหยก 2 (304 ม.)] [เสาชิงช้า 21 ม.] [วัดอรุณ 81 ม.]',
    demoChoices: ['1. เสาชิงช้า (21 ม.)', '2. อนุสาวรีย์ชัยฯ (49 ม.)', '3. พระปรางค์วัดอรุณฯ (81 ม.)', '4. ตึกใบหยก 2 (? คำใบ้: 250–310 ม.)'],
    demoAnswer: 'เฉลย Demo: เรียง 1-2-3-4 ถูกครบ 0 ผิดพลาด = ทีมเรียง +800 ฿, ทีมถือ +300 ฿ และรอดคำสาป!',
  },
  'TRIVIA_MURDER:PART1': {
    gameBadge: 'เกมที่ 4 • ช่วงที่ 1/2',
    title: 'THE LAST MAN STANDING • Black Market & Killing Floor',
    subtitle: 'ตอบคำถามเอาชีวิตรอด — ตอบผิดตกสู่ลานประหาร และช็อปปิ้งตลาดมืด!',
    artImage: '/art/manor-exterior.png',
    rules: [
      'ตอบคำถาม Trivia เอาชีวิตรอด: ตอบผิดถูกส่งลง "ลานประหาร (Killing Floor)" เพื่อเล่นมินิเกมเสี่ยงเสียหัวใจ!',
      'Misery Loves Company: ถ้ามีทีมเดียวที่ตอบผิด สามารถเลือก "ลากเพื่อน" ตกนรกไปด้วยกัน 1 ทีม!',
      'ตลาดมืด (Black Market): ซื้อไอเทมป่วน/ป้องกันแบบ First-Come-First-Served หรือทำ Soul Sacrifice (-1 ❤️ แลก +500 ฿)',
      'คำเตือน: ก่อนเข้าช่วงที่ 2 Krampus จะเก็บ "ภาษีคนงก (Greed Tax)" หัก 50% จากทีมที่ถือเงินเกิน 1,000 ฿!',
    ],
    rewards: 'ตอบถูก +250 ฿ (ถ้ารอดคนเดียว Sole Survivor รับ x2 = +500 ฿!) • เงินที่เหลือแปลงเป็นแต้มต่อบันได (400 ฿ = +1 ขั้น, สูงสุด +3 ขั้น)',
    penalties: 'เสียหัวใจครบ 4 ดวง (หรือ 3 ดวงถ้าติดคำสาปเกม 3) = กลายเป็นวิญญาณ (Ghost) ห้ามซื้อของในตลาดมืด!',
    demoTitle: 'ตัวอย่างข้อ Demo: กลยุทธ์ช่วง Black Market & Greed Tax',
    demoPrompt: 'สมมติก่อนจบช่วงที่ 1 ทีมคุณมีเงิน 1,600 ฿ — ควรทำอย่างไรดี?',
    demoChoices: ['ถ้าเก็บไว้ 1,600 ฿ ➔ โดน Greed Tax หักครึ่ง เหลือ 800 ฿ (ได้แค่ +2 ขั้น)', 'ถ้ารีบซื้อ Jetpack (200 ฿) + Mirror Shield (150 ฿) + Sniper (150 ฿) ➔ เหลือ 1,100 ฿ ➔ โดนภาษีเหลือ 550 ฿ แต่ได้ไอเทมครบมือ!'],
    demoAnswer: 'เฉลย Demo: อย่ากอดเงินสดไว้เกิน 1,000 ฿! รีบใช้ซื้อ Jetpack/ไอเทมในตลาดมืดก่อนโดน Krampus ยึดครึ่งหนึ่ง!',
  },
  'TRIVIA_MURDER:PART2': {
    gameBadge: 'เกมที่ 4 • ช่วงที่ 2/2 (FINAL)',
    title: 'THE 25-STEP ESCAPE (บันไดหนีตาย 25 ขั้น)',
    subtitle: 'วิ่งหนี Krampus ขึ้นสู่ประตูทางออก 25 ขั้น — แม้เป็นผีก็สิงร่างพลิกเกมได้!',
    artImage: '/art/manor-exterior.png',
    rules: [
      'ตั้งต้นตาม Head-start จากเงินที่เหลือ (0 ถึง +3 ขั้น) ส่วนวิญญาณเริ่มที่ขั้น 0',
      'ตอบคำถาม 3 ตัวเลือกบนหน้าจอ: ยิ่งตอบถูกและเร็ว ยิ่งก้าวไกล (+3 / +2 / +1 ขั้น) ถ้าไม่ตอบถอย -1 ขั้น!',
      'Ghost Possession: ถ้าวิญญาณวิ่งตามทันหรือแซงคนเป็นได้ จะสิงร่างสลับสถานะคืนชีพเป็นคนเป็นทันที!',
      'Krampus Pursuit: Krampus ไล่ตาม +1.5 ขั้นทุกข้อ! ถ้าตามคนเป็นทัน = กลายเป็นวิญญาณทันที! (ใช้ Jetpack พุ่ง +3 ขั้นได้)',
    ],
    rewards: 'ทีมที่เป็น "มนุษย์" และไปถึงเส้นชัยขั้นที่ 25 ได้สำเร็จ = ผู้ชนะเลิศแห่ง THE KRAMPUS EVE!',
    penalties: 'วิญญาณไม่สามารถเข้าเส้นชัยที่ขั้น 25 ได้ (ตันที่ 24.5) — ต้องสิงร่างคนเป็นให้ได้ก่อนถึงเส้นชัย!',
    demoTitle: 'ตัวอย่างจังหวะพลิกเกม Demo: Ghost Possession',
    demoPrompt: 'ทีม A (คนเป็น) อยู่ขั้นที่ 12, ทีม B (ผี) อยู่ขั้นที่ 10',
    demoChoices: ['ทีม B ตอบถูกเร็วที่สุด (+3 ขั้น ➔ ขั้น 13) แซงทีม A (ขั้น 12)', 'เกิด Ghost Possession! ทีม B คืนชีพเป็นมนุษย์ทันที ➔ ทีม A กลายเป็นผีแทน!'],
    demoAnswer: 'เฉลย Demo: อย่ายอมแพ้แม้หัวใจหมด! วิญญาณยังพลิกกลับมาชนะได้จนถึงวินาทีสุดท้าย!',
  },
};

export function getPhaseBriefingKey(round: RoundConfig): PhaseBriefingKey | null {
  if (round.gameStage === 'POLL_MINE') {
    if (round.eightDoorsSubRound === 'SUB2_SNAKE_DRAFT') return 'POLL_MINE:SUB2_SNAKE_DRAFT';
    if (round.eightDoorsSubRound === 'SUB3_POLARITY') return 'POLL_MINE:SUB3_POLARITY';
    return 'POLL_MINE:SUB1_SURVIVAL';
  }
  if (round.gameStage === 'TIMEJINX') {
    if (round.chronoSubRound === 'CHRONO_SUB2_TRAP') return 'TIMEJINX:CHRONO_SUB2_TRAP';
    if (round.chronoSubRound === 'CHRONO_SUB3_FAST_FINGER') return 'TIMEJINX:CHRONO_SUB3_FAST_FINGER';
    return 'TIMEJINX:CHRONO_SUB1_CLASSIC';
  }
  if (round.gameStage === 'QUIXORT') {
    return 'QUIXORT:MAIN';
  }
  if (round.gameStage === 'TRIVIA_MURDER') {
    const p = round.lastMan?.phase;
    if (p === 'PART2_CLUE' || p === 'PART2_QUESTION' || p === 'PART2_REVEAL' || p === 'CHAMPION') {
      return 'TRIVIA_MURDER:PART2';
    }
    return 'TRIVIA_MURDER:PART1';
  }
  return null;
}

interface PhaseBriefingModalProps {
  phaseKey: PhaseBriefingKey;
  onStartGame: () => void;
}

export const PhaseBriefingModal: React.FC<PhaseBriefingModalProps> = ({
  phaseKey,
  onStartGame,
}) => {
  const [showDemoAnswer, setShowDemoAnswer] = useState(false);
  const spec = BRIEFING_DATA[phaseKey];

  return (
    <div className="fixed inset-0 z-40 bg-[#1a1423]/90 backdrop-blur-md flex items-center justify-center p-4 md:p-6 overflow-y-auto">
      <div className="max-w-5xl w-full rounded-3xl bg-[#EFE2D2] border-4 border-[#352D45] shadow-[0_12px_0_#352D45,0_25px_60px_rgba(0,0,0,0.85)] overflow-hidden text-[#352D45] animate-in fade-in zoom-in-95 duration-200">
        {/* Top Manor Concept Banner */}
        <div className="relative h-36 md:h-44 overflow-hidden border-b-4 border-[#352D45]">
          <img
            src={spec.artImage}
            alt={spec.title}
            className="w-full h-full object-cover"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(90deg, rgba(53,45,69,0.92) 0%, rgba(53,45,69,0.72) 60%, rgba(53,45,69,0.4) 100%)',
            }}
          />
          <div className="absolute inset-0 p-5 md:p-7 flex flex-col justify-center">
            <div className="inline-flex items-center gap-2 self-start px-3.5 py-1 rounded-full bg-[#B94B50] border-2 border-[#EFE2D2] text-[#EFE2D2] font-manor-display text-xs md:text-sm font-bold uppercase tracking-wider mb-2 shadow">
              <BookOpen className="w-4 h-4" />
              <span>{spec.gameBadge}</span>
            </div>
            <h2 className="font-manor-display text-2xl md:text-4xl font-bold text-[#EFE2D2] leading-tight drop-shadow-[0_3px_0_#352D45]">
              {spec.title}
            </h2>
            <p className="text-sm md:text-base font-bold text-[#E5B86C] mt-1">
              {spec.subtitle}
            </p>
          </div>
          <div className="hidden md:flex absolute right-6 bottom-2 items-end gap-2">
            <img src="/art/char-1.png" alt="Char 1" className="h-24 object-contain drop-shadow" />
            <img src="/art/char-2.png" alt="Char 2" className="h-24 object-contain drop-shadow" />
          </div>
        </div>

        {/* Body Content: Rules + Rewards + Interactive Demo */}
        <div className="p-5 md:p-7 grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left: Rules & Economy */}
          <div className="lg:col-span-7 space-y-4">
            <div className="rounded-2xl bg-white/75 border-2 border-[#352D45] p-4 shadow-[0_4px_0_#D8C6B5]">
              <h3 className="font-manor-display text-lg font-bold text-[#352D45] flex items-center gap-2 mb-2.5">
                <Sparkles className="w-5 h-5 text-[#B94B50]" />
                <span>กติกาการเล่นในเฟสนี้</span>
              </h3>
              <ul className="space-y-2 text-sm md:text-base font-semibold text-[#352D45]/95">
                {spec.rules.map((r, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="w-6 h-6 rounded-lg bg-[#352D45] text-[#E5B86C] font-manor-score font-extrabold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-2xl bg-[#536B59]/15 border-2 border-[#536B59] p-3.5">
                <div className="flex items-center gap-1.5 font-manor-display font-bold text-sm text-[#3c5041] mb-1">
                  <Coins className="w-4 h-4" />
                  <span>รางวัล / โบนัส</span>
                </div>
                <p className="text-xs md:text-sm font-bold text-[#352D45] leading-relaxed">
                  {spec.rewards}
                </p>
              </div>
              <div className="rounded-2xl bg-[#B94B50]/15 border-2 border-[#B94B50] p-3.5">
                <div className="flex items-center gap-1.5 font-manor-display font-bold text-sm text-[#8f3439] mb-1">
                  <AlertTriangle className="w-4 h-4" />
                  <span>บทลงโทษ / เงื่อนไขพิเศษ</span>
                </div>
                <p className="text-xs md:text-sm font-bold text-[#352D45] leading-relaxed">
                  {spec.penalties}
                </p>
              </div>
            </div>
          </div>

          {/* Right: Interactive Demo Example */}
          <div className="lg:col-span-5 flex flex-col justify-between rounded-2xl bg-[#352D45] border-[3px] border-[#352D45] p-4 md:p-5 text-[#EFE2D2] shadow-[0_6px_0_#1e1928]">
            <div>
              <div className="inline-block px-3 py-0.5 rounded-lg bg-[#E5B86C] text-[#352D45] font-manor-display text-xs font-extrabold uppercase tracking-wider mb-2">
                ตัวอย่างข้อ DEMO สำหรับซ้อมเข้าใจ
              </div>
              <h4 className="font-manor-display text-base md:text-lg font-bold text-white leading-snug">
                {spec.demoTitle}
              </h4>
              <p className="text-xs md:text-sm text-[#D8C6B5] mt-1.5">
                {spec.demoPrompt}
              </p>

              <div className="mt-3 space-y-1.5">
                {spec.demoChoices.map((c, idx) => (
                  <div
                    key={idx}
                    className="px-3 py-2 rounded-xl bg-[#483e5c] border border-[#D8C6B5]/25 text-xs md:text-sm font-bold text-[#EFE2D2]"
                  >
                    {c}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#D8C6B5]/20 space-y-3">
              <button
                onClick={() => setShowDemoAnswer((v) => !v)}
                className="w-full py-2 px-4 rounded-xl bg-[#77718B] hover:bg-[#8982a0] border-2 border-[#EFE2D2]/40 text-white font-manor-display font-bold text-sm flex items-center justify-center gap-2 transition"
              >
                {showDemoAnswer ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                <span>{showDemoAnswer ? 'ซ่อนเฉลย Demo' : 'กดดูเฉลยตัวอย่าง Demo'}</span>
              </button>

              {showDemoAnswer && (
                <div className="p-3 rounded-xl bg-[#E5B86C] text-[#352D45] font-bold text-xs md:text-sm border-2 border-white animate-in fade-in duration-150">
                  {spec.demoAnswer}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer CTA */}
        <div className="px-5 md:px-7 py-4 bg-[#D8C6B5]/70 border-t-[3px] border-[#352D45] flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs md:text-sm font-bold text-[#352D45]">
            💡 อธิบายกติกาและลองข้อ Demo ให้ครบทุกทีม (เวลายังไม่เดินจนกว่า Host จะกดเริ่มเกม)
          </span>
          <SafeActionButton
            type="button"
            onClick={onStartGame}
            loadingText="กำลังเข้าสู่หน้าเตรียมพร้อม..."
            className="px-6 py-3 rounded-2xl bg-[#536B59] hover:bg-[#435848] border-[3px] border-[#352D45] shadow-[0_5px_0_#352D45] active:translate-y-1 active:shadow-none text-[#EFE2D2] font-manor-display text-lg font-bold flex items-center gap-2.5 transition-all"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>ปิดหน้า Demo ➔ เข้าสู่หน้าเตรียมพร้อม</span>
          </SafeActionButton>
        </div>
      </div>
    </div>
  );
};
