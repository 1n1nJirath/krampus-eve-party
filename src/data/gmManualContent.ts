export interface ManualChecklistItem {
  id: string;
  label: string;
  detail: string;
}

export interface ManualStepItem {
  step: string;
  badgeColor: 'neutral' | 'emerald' | 'amber' | 'sky' | 'rose';
  action: string;
  detail: string;
}

export interface ManualSection {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  summary: string;
  steps: ManualStepItem[];
  tips?: string[];
}

export interface TroubleshootingItem {
  id: string;
  symptom: string;
  solution: string;
}

export const PRE_SHOW_CHECKLIST: ManualChecklistItem[] = [
  {
    id: 'pre-display',
    label: 'เปิดจอ Projector (/display) เต็มจอ & เช็กเสียง',
    detail: 'กดปุ่ม "↗ /display" แถบบน ลากไปจอใหญ่ กดปุ่ม Fullscreen มุมขวาบน และเปิดเสียงเอฟเฟกต์',
  },
  {
    id: 'pre-sync',
    label: 'ตรวจสอบป้ายสถานะ Sync มุมซ้ายบน',
    detail: 'ควรขึ้นสีเขียว Local Realtime (<30ms) หากต่อ Wi-Fi เดียวกัน หรือ Supabase Cloud หากใช้ข้ามเครือข่าย',
  },
  {
    id: 'pre-qr',
    label: 'แจก QR Code ให้ Sub-GM ทั้ง 4 ทีม (ห้ามขึ้นจอใหญ่)',
    detail: 'กดปุ่ม "QR" บนแถบเครื่องมือ แล้วให้ตัวแทนทีมสแกน /play?team=1..4 เพื่อป้องกันผู้เล่นคนอื่นแอบกด',
  },
  {
    id: 'pre-roster',
    label: 'ตรวจรายชื่อสมาชิกกลุ่ม (สำหรับเกมที่ 3: Toy Factory)',
    detail: 'เช็กหรือพิมพ์รายชื่อสมาชิกคั่นด้วยลูกน้ำใน ⚙️ Editor / Settings ➔ ทีม & สมาชิก',
  },
  {
    id: 'pre-standby',
    label: 'ยืนยันสถานะจอเป็น 🟡 STANDBY ก่อนเริ่มเล่าเรื่อง',
    detail: 'สังเกตแถบมอนิเตอร์ด้านขวาต้องขึ้น STANDBY เพื่อมั่นใจว่าผู้เล่นยังไม่เห็นโจทย์ก่อน Host กดเริ่ม',
  },
];

export const MANUAL_SECTIONS: ManualSection[] = [
  {
    id: 'FLOW',
    icon: '🚦',
    title: 'กฎเหล็ก 4 ขั้นตอน (STANDBY → LIVE → REVEAL → NEXT)',
    subtitle: 'รหัสสีสากลที่ใช้เหมือนกันทุกเกมใน Control Deck',
    summary:
      'ปุ่มควบคุมรอบเกมเรียงจากซ้ายไปขวา 1→2→3→4 ช่วยลดความสับสนหน้างาน และป้องกันผู้เล่นเห็นโจทย์หรือกดคำตอบก่อนพิธีกรพูดจบ',
    steps: [
      {
        step: '1. Load / Standby',
        badgeColor: 'neutral',
        action: 'เทา (Neutral)',
        detail:
          'โหลดโจทย์ขึ้น Host Preview ด้านซ้ายเท่านั้น จอใหญ่ขึ้นหน้าเตรียมตัว และปุ่ม /play ของผู้เล่นถูกล็อก 100%',
      },
      {
        step: '2. Start / Unlock',
        badgeColor: 'emerald',
        action: 'เขียว (Emerald)',
        detail:
          'ยิงคำถามขึ้นจอ /display เริ่มเดินนาฬิกา และปลดล็อกปุ่มส่งคำตอบบนมือถือทั้ง 4 ทีม',
      },
      {
        step: '3. Lock / Reveal',
        badgeColor: 'amber',
        action: 'ส้ม/ทอง (Amber)',
        detail:
          'กดล็อกคำตอบเมื่อหมดเวลา แล้วกดเฉลยขึ้นจอใหญ่พร้อมคำนวณ ฿ / 🛡️ อัตโนมัติ',
      },
      {
        step: '4. Next Question',
        badgeColor: 'sky',
        action: 'ฟ้า (Sky)',
        detail:
          'เลื่อนไปข้อ/รอบถัดไป และตัดกลับเข้าโหมด 🟡 STANDBY อัตโนมัติทันที ไม่หลุดสปอยล์ข้อใหม่',
      },
    ],
    tips: [
      'การคลิกเปลี่ยนแท็บด้านบน (Lobby, Game 1..4, Finale) เป็นการสลับหน้าจอคุมของ Host เท่านั้น จะไม่ตัดภาพบน /display จนกว่า Host จะกดปุ่มโหลดเกมเข้า Standby',
    ],
  },
  {
    id: 'LOBBY',
    icon: '🏠',
    title: 'ช่วงที่ 0: Lobby & Mansion Gate',
    subtitle: 'ลงทะเบียน Sub-GM 4 ทีม และเปิดตัวเข้าสู่คฤหาสน์',
    summary: 'รอตัวแทนทั้ง 4 กลุ่มสแกน QR ตั้งชื่อทีมและคำขวัญ ก่อนล็อกห้องเพื่อเริ่มปาร์ตี้',
    steps: [
      {
        step: 'Step 1',
        badgeColor: 'neutral',
        action: '🏠 แสดงหน้า Lobby',
        detail: 'เปิดหน้าต้อนรับบนจอใหญ่ให้ผู้เล่นเห็น Avatar และชื่อทีมที่กำลังลงทะเบียนเข้ามา',
      },
      {
        step: 'Step 2',
        badgeColor: 'emerald',
        action: '🏰 ล็อกห้อง & เริ่มเข้าสู่คฤหาสน์ (Start Game)',
        detail: 'เมื่อมีอย่างน้อย 2 ทีมพร้อมลุย กดปุ่มนี้เพื่อล็อกห้องและเปิดแผนที่ Mansion World Map',
      },
      {
        step: 'Step 3',
        badgeColor: 'sky',
        action: 'เลือกเกมที่ 1',
        detail: 'กดการ์ด "เกมที่ 1: 8 Doors" บน World Map หรือสลับไปที่แท็บ [🚪 Game 1: Doors]',
      },
    ],
  },
  {
    id: 'GAME1',
    icon: '🚪',
    title: 'เกมที่ 1: The 8 Doors of Krampus',
    subtitle: '3 ด่านย่อย: Snake Draft 1 ➔ Snake Draft 2 ➔ Polarity (#1 & #8)',
    summary: 'ใช้กระดานประตู 8–12 บานต่อเนื่องกันทั้ง 3 ด่านย่อย รีเซ็ตประตูอัตโนมัติเมื่อขึ้นด่านย่อยใหม่',
    steps: [
      {
        step: 'เตรียมด่าน',
        badgeColor: 'neutral',
        action: '📖 เปิด/ปิด Demo กติกา',
        detail: 'โหลดเกมที่ 1 เข้า Standby เปิดหน้า Demo อธิบายตัวอย่างให้ผู้เล่นเข้าใจก่อนเริ่ม',
      },
      {
        step: 'ด่านย่อย 1 & 2',
        badgeColor: 'emerald',
        action: 'Snake Draft 1 (1→4→1) และ 2 (4→1→4)',
        detail:
          'กด ▶️ เปิดโจทย์ ทีมเลือกประตูตามคิวบนมือถือ (ด่าน 1 หา #1-#3, ด่าน 2 หา #2-#4 ระวัง #1 คือกับดัก!) เกราะหมด 0 🛡️ บังคับจ่าย 500 ฿ ไถ่ +2 🛡️',
      },
      {
        step: 'ด่านย่อย 3',
        badgeColor: 'amber',
        action: 'Polarity (#1 & #8) + เก้าอี้ 12 ตัว',
        detail:
          'ให้ตัวแทนวิ่งชิงเก้าอี้หน้ากระดาน แล้วกด ▶️ เปิดโจทย์ ให้ทุกทีมแอบเลือกคู่ #1 กับ #8 ครบแล้วกดเฉลย (+300 / +700 ฿)',
      },
      {
        step: 'จบเกม 1',
        badgeColor: 'sky',
        action: '⏭️ จบเกมที่ 1 ➔ ไปเกมที่ 2',
        detail: 'บันทึกสถานะ CLEARED บน World Map และเตรียมเกมที่ 2 ในโหมด Standby',
      },
    ],
  },
  {
    id: 'GAME2',
    icon: '⏳',
    title: 'เกมที่ 2: The Chrono Crush',
    subtitle: '9 ข้อแบ่ง 3 ด่านย่อย: Classic ➔ Time Trap ➔ Fast Finger',
    summary: 'ทายปี ค.ศ./พ.ศ. พร้อมระบบกับดักเวลาในด่าน 2 และสงครามแย่งล็อกปีในด่าน 3',
    steps: [
      {
        step: 'ข้อ 1–3 (Classic)',
        badgeColor: 'emerald',
        action: 'Load Standby ➔ Start ➔ Reveal ➔ Next',
        detail: 'เลื่อน Slider ทายปีทีละ 1 ปี (ตรง +600 ฿, ±1 ปี +300 ฿, ±2 ปี 0 ฿, เกินกว่านั้น -100/ปี)',
      },
      {
        step: 'ข้อ 4–6 (Time Trap)',
        badgeColor: 'amber',
        action: 'เล่น 2 จังหวะ: วางกับดัก ➔ ทายปี',
        detail:
          'จังหวะที่ 1 กด ▶️ เริ่มวางกับดัก (3/2/1/0 ลูกตามความรวย) เมื่อวางครบกด 🚀 เปิดแถบเลื่อนทายปี! ฝ่ากับดักทายตรงเป๊ะรับ x2 (+1,200 ฿)',
      },
      {
        step: 'ข้อ 7–9 (Fast Finger)',
        badgeColor: 'sky',
        action: 'แย่งล็อกปีห้ามซ้ำ (20 วิ)',
        detail: 'ใครกดก่อนได้ปีนั้นทันที! ตรง +1,000 ฿ / ห่างไม่เกิน 2 ปี +400 ฿ จบข้อ 9 กดจบเกม ➔ เกม 3',
      },
    ],
  },
  {
    id: 'GAME3',
    icon: '⚙️',
    title: 'เกมที่ 3: The Toy Factory Chaos',
    subtitle: '4 รอบสลับทีมเรียง vs ทีมถือโพย + ปุ่มป่วน SHUFFLE!',
    summary: 'เกมแอ็กชันหน้าเวที ทีมเรียงต้องถามข้อมูลจากสมาชิกทีมถือโพยแล้ววิ่งมายืนเรียงลำดับให้ถูก',
    steps: [
      {
        step: 'เริ่ม & เลือกหัวข้อ',
        badgeColor: 'neutral',
        action: '🎲 สุ่มจับคู่ 4 รอบ ➔ ▶️ ปลดล็อกให้เลือกหัวข้อ',
        detail: 'กดปลดล็อกให้ทีมเรียงเลือก 1 ใน 5 ชุดข้อมูล (หรือ Host กดเลือกแทนได้ทันทีหลังปลดล็อก)',
      },
      {
        step: 'Prep & Action',
        badgeColor: 'emerald',
        action: 'Prep 10 วิ ➔ Action (พร้อมปุ่ม SHUFFLE)',
        detail:
          'ครบ 10 วิแรก กด "เริ่มจับเวลาหลัก!" หากมีทีมผู้ชมกด SHUFFLE เวลาจะหยุดพัก Buffer 10 วิให้เช็กโพยใหม่ แล้วกด "เดินเวลาต่อ"',
      },
      {
        step: 'ตรวจ & คิดเงิน',
        badgeColor: 'amber',
        action: 'เข้าหน้าตรวจ ➔ เปิด ??? ➔ ✓/✗ ➔ 💰 คิดเงิน',
        detail:
          'ตรวจป้ายจากซ้ายไปขวา ถูกหมดทีมเรียง +800 / ทีมถือ +300 ฿ • ผิดหักจุดละ -100 ฿ และทีมถือติดคำสาป (-1 ❤️ เกม 4)',
      },
      {
        step: 'รอบถัดไป',
        badgeColor: 'sky',
        action: '⏭️ ไปรอบถัดไป',
        detail: 'เข้าสู่ Standby ของรอบถัดไปจนครบ 4 รอบ',
      },
    ],
  },
  {
    id: 'GAME4',
    icon: '💀',
    title: 'เกมที่ 4: The Last Man Standing',
    subtitle: 'ช่วงที่ 1 (4 รอบตลาดมืด & ลานประหาร) ➔ ช่วงที่ 2 (บันได 25 ขั้น)',
    summary: 'ใช้แท็บย่อย [Part 1] และ [Part 2] ใน Game 4 Workspace ซึ่งระบบสลับให้ตรงเฟสอัตโนมัติ',
    steps: [
      {
        step: 'เปิดตัวเกม 4',
        badgeColor: 'rose',
        action: '💀 เริ่มเกมที่ 4 (Krampus Twist)',
        detail: 'ประกาศหักมุม: เงินไม่ใช่คะแนนแชมป์ แต่เป็นกระสุนซื้อไอเทมและแต้มต่อ 400 ฿ = +1 ขั้น (สูงสุด +3)',
      },
      {
        step: 'Part 1 (รอบ 1–4)',
        badgeColor: 'emerald',
        action: 'Standby ➔ Trivia (15 วิ) ➔ Reveal/Misery ➔ ตลาดมืด (25 วิ) ➔ มินิเกม',
        detail:
          'หลังจบรอบ 2 ปุ่มถัดไปจะเก็บ "💸 ภาษีคนงก (>1,000 ฿ หัก 50%)" ให้โดยอัตโนมัติ ส่วนรอบ 4 อย่าลืมกด 🎲 Krampus ทอยเต๋าก่อนเฉลยมินิเกม!',
      },
      {
        step: 'Part 2 (บันได 25 ขั้น)',
        badgeColor: 'amber',
        action: 'Clue (Standby) ➔ เปิดคำถาม A/B/C ➔ เฉลย (+Krampus 1.5 ขั้น) ➔ Next',
        detail:
          'อ่านเบาะแสก่อนเปิดคำถาม ทีมตอบถูกไวสุด +3 / +2 / +1 ขั้น • ทีมวิญญาณสิงร่างได้หากแซง • ทีมแรกถึงขั้น 25 ชนะทันที!',
      },
    ],
  },
  {
    id: 'FINALE',
    icon: '🏆',
    title: 'ช่วง Finale & พิธีประกาศผล',
    subtitle: 'มอบรางวัล Nice vs Naughty List',
    summary: 'โชว์ผลผู้ชนะแห่งคฤหาสน์ครามปุสและตารางอันดับสุดท้ายแบบเต็มจอ',
    steps: [
      {
        step: 'Finale',
        badgeColor: 'amber',
        action: '🏆 แสดงหน้า Finale บนจอ /display',
        detail: 'เปิดเอฟเฟกต์พลุและสรุปแชมป์ THE KRAMPUS EVE บนจอใหญ่',
      },
    ],
  },
];

export const TROUBLESHOOTING_ITEMS: TroubleshootingItem[] = [
  {
    id: 'ts-undo',
    symptom: 'กดเฉลยซ้ำ / ปรับคะแนนผิดทีม / อยากย้อนเงินล่าสุด',
    solution:
      'มองที่การ์ด "Quick Score Adjuster" ด้านล่างของแถบขวา แล้วกดปุ่ม "↩️ Undo" จะคืนยอดเงิน ฿ และเกราะ 🛡️ กลับเป็นก่อนธุรกรรมล่าสุดทันที',
  },
  {
    id: 'ts-disconnect',
    symptom: 'มือถือ Sub-GM เน็ตหลุด แบตหมด หรือเผลอปิดแท็บ',
    solution:
      'ให้ใช้เครื่องเดิมหรือเครื่องใหม่สแกน QR ลิงก์ /play?team=X เพื่อเข้าต่อได้ทันที หรือกดไอคอน "⚡" ที่การ์ดทีมด้านขวาของ Host เพื่อกดส่งคำตอบ/กระดิ่งแทนชั่วคราว',
  },
  {
    id: 'ts-no-answer',
    symptom: 'มีทีมกดไม่ทัน หรือไม่อยากรอเวลาหมดเพื่อเฉลย',
    solution:
      'กดปุ่มสีส้ม "⏸️ ล็อกคำตอบ" ใน Step 3 เพื่อปิดรับคำตอบทันที จากนั้นปุ่มจะเปลี่ยนเป็น "✨ เฉลย & คิดคะแนน" ให้กดต่อได้เลย (หรือกดลิงก์ ⚡ บังคับเฉลย)',
  },
  {
    id: 'ts-broadcast',
    symptom: 'ต้องการส่งข้อความเตือนพิเศษ หรือสั่งลงโทษทีมต้องสาป',
    solution:
      'ใช้กล่อง Quick Broadcast ที่มุมขวาล่างพิมพ์ข้อความยิงขึ้นจอ /display และใน Game 4 หากทีมติดคำสาปทำผิดกติกา กดปุ่ม "-1 ❤️" ที่แถบทีมด้านบนของเกม 4 ได้เลย',
  },
];
