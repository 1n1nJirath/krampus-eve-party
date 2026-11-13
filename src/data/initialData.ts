import {
  ChronoSubRound,
  EightDoorsSubRound,
  KrampusGameState,
  QuestionPreset,
  RoundConfig,
  Team,
  TeamId,
} from '../types/game';

export const TEAM_ORDER: TeamId[] = ['team1', 'team2', 'team3', 'team4'];

export function getActiveTeamIds(teams: Record<TeamId, Team>): TeamId[] {
  const reg = TEAM_ORDER.filter((tid) => teams[tid]?.isRegistered);
  return reg.length >= 2 ? reg : [...TEAM_ORDER];
}

export function computeChronoRankings(teams: Record<TeamId, Team>): {
  ordered: TeamId[];
  quotas: Partial<Record<TeamId, number>>;
  shields: Partial<Record<TeamId, number>>;
} {
  const active = getActiveTeamIds(teams);
  const ordered = [...active].sort(
    (a, b) => (teams[b]?.coins ?? 0) - (teams[a]?.coins ?? 0)
  );
  const quotas: Partial<Record<TeamId, number>> = {};
  const shields: Partial<Record<TeamId, number>> = {};
  ordered.forEach((tid, idx) => {
    if (idx === 0) {
      quotas[tid] = 1;
      shields[tid] = 1;
    } else if (idx === 1) {
      quotas[tid] = 1;
      shields[tid] = 1;
    } else if (idx === 2) {
      quotas[tid] = 2;
      shields[tid] = 0;
    } else {
      quotas[tid] = 3;
      shields[tid] = 0;
    }
  });
  return { ordered, quotas, shields };
}

export function getChronoTrapsReceived(round: RoundConfig, targetTid: TeamId): number {
  const placed = round.chronoTrapsPlaced || {};
  let total = 0;
  for (const fromTid of TEAM_ORDER) {
    total += placed[fromTid]?.[targetTid] ?? 0;
  }
  return total;
}

export function getChronoNetTraps(round: RoundConfig, targetTid: TeamId): number {
  const received = getChronoTrapsReceived(round, targetTid);
  const shield = round.chronoShields?.[targetTid] ?? 0;
  return Math.max(0, received - shield);
}

export function getChronoSliderStep(netTraps: number): 1 | 5 | 10 {
  if (netTraps >= 2) return 10;
  if (netTraps === 1) return 5;
  return 1;
}

export function scoreChronoTeam(
  round: RoundConfig,
  tid: TeamId,
  guessedYear: number,
  maxDiffAmongSubmitted: number
): { diff: number; delta: number; label: string; netTraps: number } {
  const subRound: ChronoSubRound = round.chronoSubRound || 'CHRONO_SUB1_CLASSIC';
  const diff = Math.abs(guessedYear - round.targetYear);
  const isFarthest = maxDiffAmongSubmitted > 0 && diff === maxDiffAmongSubmitted;

  if (subRound === 'CHRONO_SUB3_FAST_FINGER') {
    if (diff === 0) {
      return { diff, delta: 1000, label: '🎯 ตรงเป๊ะ! แจ็กพอต +1,000 ฿', netTraps: 0 };
    }
    if (diff <= 2) {
      return { diff, delta: 400, label: `✨ ห่าง ${diff} ปี (+400 ฿)`, netTraps: 0 };
    }
    const penalty = Math.min(1500, diff * 150);
    return {
      diff,
      delta: -penalty,
      label: `💥 โดนกงล้อบดขยี้! ห่าง ${diff} ปี (-${penalty.toLocaleString()} ฿)`,
      netTraps: 0,
    };
  }

  const netTraps = subRound === 'CHRONO_SUB2_TRAP' ? getChronoNetTraps(round, tid) : 0;
  const hasTrapBonus = subRound === 'CHRONO_SUB2_TRAP' && netTraps >= 1;

  if (diff === 0) {
    const reward = hasTrapBonus ? 1200 : 600;
    return {
      diff,
      delta: reward,
      label: hasTrapBonus
        ? `🔥 TRAP BREAKER x2! ตรงเป๊ะ (+1,200 ฿)`
        : '🎯 ตรงเป๊ะ! (+600 ฿)',
      netTraps,
    };
  }
  if (diff <= 3 && !isFarthest) {
    const reward = hasTrapBonus ? 600 : 300;
    return {
      diff,
      delta: reward,
      label: hasTrapBonus
        ? `⚡ TRAP BREAKER x2! ห่าง ${diff} ปี (+600 ฿)`
        : `✨ ห่าง ${diff} ปี (+300 ฿)`,
      netTraps,
    };
  }
  if (diff <= 3 && isFarthest) {
    // Edge case: all teams within 1-3 years, team farthest still pays -50/year
    const penalty = Math.min(1000, diff * 50);
    return {
      diff,
      delta: -penalty,
      label: `💀 ห่างสุดของข้อ (${diff} ปี) โดนทับ (-${penalty.toLocaleString()} ฿)`,
      netTraps,
    };
  }
  if (diff >= 8 || isFarthest) {
    const penalty = Math.min(1000, diff * 50);
    return {
      diff,
      delta: -penalty,
      label: `${isFarthest ? '💀 ห่างสุดของข้อ' : '💥 ห่าง ≥8 ปี'} (${diff} ปี) (-${penalty.toLocaleString()} ฿)`,
      netTraps,
    };
  }
  return {
    diff,
    delta: 0,
    label: `🛡️ รอดตัว! ห่าง ${diff} ปี (0 ฿)`,
    netTraps,
  };
}

export const DOOR_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'] as const;

export function getSuggestedSafeRange(
  choiceCount: number,
  subRound?: EightDoorsSubRound
): { min: number; max: number } {
  const isLargeBoard = choiceCount >= 10;
  if (subRound === 'SUB2_AUCTION' || subRound === 'SUB2_DOOR_AND_BET') {
    return isLargeBoard ? { min: 3, max: 6 } : { min: 2, max: 4 };
  }
  return isLargeBoard ? { min: 1, max: 4 } : { min: 1, max: 3 };
}

export const INITIAL_TEAMS: Record<TeamId, Team> = {
  team1: {
    id: 'team1',
    number: 1,
    name: 'House Crimson (อัศวินโล่ชาด)',
    motto: 'เกราะศักดิ์สิทธิ์พิชิตเงามืด',
    color: '#ef4444', // Crimson Red
    icon: '🛡️',
    coins: 1000,
    shields: 3,
    candles: 3,
    isInKillingFloor: false,
    isRegistered: false,
  },
  team2: {
    id: 'team2',
    number: 2,
    name: 'House Emerald (ผู้พิทักษ์สนดำ)',
    motto: 'คมหนามมรกตสะกดอสูร',
    color: '#10b981', // Emerald Green
    icon: '🎄',
    coins: 1000,
    shields: 3,
    candles: 3,
    isInKillingFloor: false,
    isRegistered: false,
  },
  team3: {
    id: 'team3',
    number: 3,
    name: 'House Aurum (ภาคีเหรียญทอง)',
    motto: 'มั่งคั่งรอดพ้นคำสาปครามปุส',
    color: '#eab308', // Holy Gold
    icon: '🪙',
    coins: 1000,
    shields: 3,
    candles: 3,
    isInKillingFloor: false,
    isRegistered: false,
  },
  team4: {
    id: 'team4',
    number: 4,
    name: 'House Frostbite (ทายาทเหมันต์ทมิฬ)',
    motto: 'เยือกแข็งดั่งพายุหิมะคืนวันเพ็ญ',
    color: '#38bdf8', // Ice Blue
    icon: '❄️',
    coins: 1000,
    shields: 3,
    candles: 3,
    isInKillingFloor: false,
    isRegistered: false,
  },
};

export const DEFAULT_PRESETS: QuestionPreset[] = [
  // ==========================================
  // GAME 1: THE DOORS OF DOOM
  // ==========================================
  {
    id: 'pm-1',
    gameStage: 'POLL_MINE',
    inputMode: 'MODE_A_CHOICE',
    eightDoorsSubRound: 'SUB1_SURVIVAL',
    title: 'THE DOORS OF DOOM • ด่านย่อยที่ 1 (Snake Draft)',
    subtitle: 'เปิดทางรอดแบบสลับคิว (ทีมละ 2 บาน) — หาประตูโซนปลอดภัย (+300 ฿/บาน, ถูกทั้ง 2 บานรับ +800 ฿ / พลาด -1 🛡️)',
    questionText: 'ข้ออ้างยอดฮิตที่เด็กมหาลัยใช้ "โดดเรียนคาบเช้า" มากที่สุดคืออะไร?',
    choiceCount: 8,
    choices: [
      { key: 'A', label: 'ท้องเสีย / อาหารเป็นพิษกะทันหัน', rank: 2, votes: 24, isCorrect: true },
      { key: 'B', label: 'เข้าใจผิดว่าอาจารย์ยกคลาส', rank: 6, votes: 5, isCorrect: false, isTrap: true },
      { key: 'C', label: 'นาฬิกาปลุกไม่ดัง / ปิดปลุกแล้วหลับต่อ', rank: 1, votes: 31, isCorrect: true },
      { key: 'D', label: 'รถติดวินมอเตอร์ไซค์คิวยาวมาก', rank: 5, votes: 7, isCorrect: false, isTrap: true },
      { key: 'E', label: 'ฝนตกหนัก น้ำท่วมหอ ออกไม่ได้', rank: 3, votes: 16, isCorrect: true },
      { key: 'F', label: 'แมวที่หอป่วยต้องพาไปหาหมอ', rank: 8, votes: 2, isCorrect: false, isTrap: true },
      { key: 'G', label: 'ปั่นโปรเจกต์วิชาอื่นโต้รุ่งจนสลบ', rank: 4, votes: 11, isCorrect: false, isTrap: true },
      { key: 'H', label: 'ปวดหัวไมเกรนกำเริบ', rank: 7, votes: 4, isCorrect: false, isTrap: true },
    ],
    correctChoices: ['A', 'C', 'E'],
    trapChoices: ['B', 'D', 'F', 'G', 'H'],
    rewardCoins: 300,
    penaltyCoins: 0,
    durationSeconds: 45,
  },
  {
    id: 'pm-2',
    gameStage: 'POLL_MINE',
    inputMode: 'MODE_A_CHOICE',
    eightDoorsSubRound: 'SUB2_AUCTION',
    title: 'THE DOORS OF DOOM • ด่านย่อยที่ 2 (ประมูล & แทงข้าง)',
    subtitle: 'ประมูลสิทธิ์เปิดประตูโซนปลอดภัย (+700 ฿ / พลาด -1 🛡️) • ทีมอื่นแทงข้าง (+200 ฿ / ผิด -100 ฿)',
    questionText: 'เมนูสิ้นคิดเวลาเงินใกล้หมดตอนสิ้นเดือนของเด็กหอคืออะไร?',
    choiceCount: 8,
    choices: [
      { key: 'A', label: 'ขนมปังปอนด์ทาแยม / นมข้นหวาน', rank: 4, votes: 11, isCorrect: false, isTrap: true },
      { key: 'B', label: 'บะหมี่กึ่งสำเร็จรูป (มาม่า/ไวไว) ต้มใส่ไข่', rank: 1, votes: 34, isCorrect: true },
      { key: 'C', label: 'ปลากระป๋องราดข้าวสวยร้อนๆ', rank: 7, votes: 3, isCorrect: false, isTrap: true },
      { key: 'D', label: 'ข้าวกะเพราหมูสับไข่ดาวร้านตามสั่ง', rank: 2, votes: 22, isCorrect: true },
      { key: 'E', label: 'ไปเนียนกินฟรีห้องเพื่อนข้างๆ', rank: 8, votes: 2, isCorrect: false, isTrap: true },
      { key: 'F', label: 'ข้าวสวยคลุกน้ำพริก / แม็กกี้ / น้ำปลา', rank: 3, votes: 14, isCorrect: true },
      { key: 'G', label: 'โจ๊กซอง / ข้าวต้มกุ๊ยหน้าปากซอย', rank: 6, votes: 5, isCorrect: false, isTrap: true },
      { key: 'H', label: 'ข้าวปั้น / แซนด์วิชป้ายเหลืองลดราคาเซเว่น', rank: 5, votes: 9, isCorrect: false, isTrap: true },
    ],
    correctChoices: ['B', 'D', 'F'],
    trapChoices: ['A', 'C', 'E', 'G', 'H'],
    rewardCoins: 300,
    penaltyCoins: 0,
    durationSeconds: 45,
  },
  {
    id: 'pm-3',
    gameStage: 'POLL_MINE',
    inputMode: 'MODE_A_CHOICE',
    eightDoorsSubRound: 'SUB3_POLARITY',
    title: 'THE DOORS OF DOOM • ด่านย่อยที่ 3 (วัดใจขั้วตรงข้าม)',
    subtitle: 'เลือก 2 บานพร้อมกัน: อันดับ #1 และอันดับสุดท้าย (#N) — ถูก 1 (+400 ฿), ถูก 2 (+1,000 ฿), ผิดหมด (-2 🛡️ & -300 ฿)',
    questionText: 'ของขวัญจับฉลากคริสต์มาส/ปีใหม่ที่เด็กมหาลัย "กุมขมับไม่อยากได้มากที่สุด" คืออะไร?',
    choiceCount: 8,
    choices: [
      { key: 'A', label: 'คุกกี้กล่องแดงในตำนาน', rank: 1, votes: 33, isCorrect: true },
      { key: 'B', label: 'แก้วน้ำเซรามิก / แก้วกาแฟสกรีนลาย', rank: 3, votes: 17, isCorrect: true },
      { key: 'C', label: 'กรอบรูปตั้งโต๊ะ', rank: 6, votes: 6, isCorrect: false, isTrap: true },
      { key: 'D', label: 'ผ้าขนหนูผืนเล็กพับเป็นรูปหมี', rank: 2, votes: 21, isCorrect: true },
      { key: 'E', label: 'ปฏิทินตั้งโต๊ะปีหน้า', rank: 8, votes: 2, isCorrect: false, isTrap: true },
      { key: 'F', label: 'กระปุกออมสินพลาสติก', rank: 5, votes: 8, isCorrect: false, isTrap: true },
      { key: 'G', label: 'ยาดม / ยาหม่องชุดสุขภาพผู้สูงวัย', rank: 4, votes: 10, isCorrect: false, isTrap: true },
      { key: 'H', label: 'ตุ๊กตาหมีตัวจิ๋วติดพวงกุญแจ', rank: 7, votes: 3, isCorrect: false, isTrap: true },
    ],
    correctChoices: ['A', 'B', 'D'],
    trapChoices: ['C', 'E', 'F', 'G', 'H'],
    rewardCoins: 300,
    penaltyCoins: 0,
    durationSeconds: 45,
  },

  // ==========================================
  // GAME 2: TIMEJINX (กงล้อกาลเวลาของครามปุส)
  // ==========================================
  // GAME 2: THE CHRONO CRUSH (กงล้อกาลเวลาของครามปุส) — 3 Sub-Rounds x 3 = 9 ข้อ
  // ==========================================
  {
    id: 'tj-1',
    gameStage: 'TIMEJINX',
    inputMode: 'MODE_B_YEAR',
    chronoSubRound: 'CHRONO_SUB1_CLASSIC',
    yearUnit: 'AD',
    yearMin: 1990,
    yearMax: 2026,
    title: 'THE CHRONO CRUSH • ด่านย่อยที่ 1 (ข้อ 1/3)',
    subtitle: 'หยุดเข็มนาฬิกา (Classic Timeline): เลื่อนแถบปี ค.ศ. ทีละ 1 ปี — ตรงเป๊ะ +600 ฿ | ห่าง 1-3 ปี +300 ฿ | ห่าง ≥8 ปี/ห่างสุด -50 ฿/ปี',
    questionText: 'เพลง "คุกกี้เสี่ยงทาย (Koisuru Fortune Cookie)" ของ BNK48 ปล่อย MV ครั้งแรกในปี ค.ศ. ใด?',
    targetYear: 2017,
    yearPenaltyPerDiff: 50,
    yearFastestBonus: 0,
    rewardCoins: 600,
    penaltyCoins: 50,
    durationSeconds: 30,
  },
  {
    id: 'tj-2',
    gameStage: 'TIMEJINX',
    inputMode: 'MODE_B_YEAR',
    chronoSubRound: 'CHRONO_SUB1_CLASSIC',
    yearUnit: 'BE',
    yearMin: 2530,
    yearMax: 2569,
    title: 'THE CHRONO CRUSH • ด่านย่อยที่ 1 (ข้อ 2/3)',
    subtitle: 'หยุดเข็มนาฬิกา (Classic Timeline): เลื่อนแถบปี พ.ศ. ทีละ 1 ปี — ตรงเป๊ะ +600 ฿ | ห่าง 1-3 ปี +300 ฿ | ห่าง ≥8 ปี/ห่างสุด -50 ฿/ปี',
    questionText: 'รถไฟฟ้า BTS สายสุขุมวิท (หมอชิต – อ่อนนุช) เปิดให้บริการวันแรกในประเทศไทยในปี พ.ศ. ใด?',
    targetYear: 2542,
    yearPenaltyPerDiff: 50,
    yearFastestBonus: 0,
    rewardCoins: 600,
    penaltyCoins: 50,
    durationSeconds: 30,
  },
  {
    id: 'tj-3',
    gameStage: 'TIMEJINX',
    inputMode: 'MODE_B_YEAR',
    chronoSubRound: 'CHRONO_SUB1_CLASSIC',
    yearUnit: 'AD',
    yearMin: 1990,
    yearMax: 2026,
    title: 'THE CHRONO CRUSH • ด่านย่อยที่ 1 (ข้อ 3/3)',
    subtitle: 'หยุดเข็มนาฬิกา (Classic Timeline): เลื่อนแถบปี ค.ศ. ทีละ 1 ปี — ตรงเป๊ะ +600 ฿ | ห่าง 1-3 ปี +300 ฿ | ห่าง ≥8 ปี/ห่างสุด -50 ฿/ปี',
    questionText: 'เพลง "กังนัมสไตล์ (Gangnam Style - PSY)" กลายเป็นไวรัลทะลุพันล้านวิวครั้งแรกในปี ค.ศ. ใด?',
    targetYear: 2012,
    yearPenaltyPerDiff: 50,
    yearFastestBonus: 0,
    rewardCoins: 600,
    penaltyCoins: 50,
    durationSeconds: 30,
  },
  {
    id: 'tj-4',
    gameStage: 'TIMEJINX',
    inputMode: 'MODE_B_YEAR',
    chronoSubRound: 'CHRONO_SUB2_TRAP',
    yearUnit: 'AD',
    yearMin: 1980,
    yearMax: 2026,
    title: 'THE CHRONO CRUSH • ด่านย่อยที่ 2 (ข้อ 4/9)',
    subtitle: 'วางกับดักเวลา (Time Trap): วางกับดักลดความละเอียดแถบปี (5 ปี / 10 ปี) • ฝ่ากับดักสำเร็จรับรางวัล x2!',
    questionText: 'iPhone รุ่นแรกของโลกถูกเปิดตัวโดย Steve Jobs บนเวที Macworld ในปี ค.ศ. ใด?',
    targetYear: 2007,
    yearPenaltyPerDiff: 50,
    yearFastestBonus: 0,
    rewardCoins: 600,
    penaltyCoins: 50,
    durationSeconds: 35,
  },
  {
    id: 'tj-5',
    gameStage: 'TIMEJINX',
    inputMode: 'MODE_B_YEAR',
    chronoSubRound: 'CHRONO_SUB2_TRAP',
    yearUnit: 'BE',
    yearMin: 2520,
    yearMax: 2569,
    title: 'THE CHRONO CRUSH • ด่านย่อยที่ 2 (ข้อ 5/9)',
    subtitle: 'วางกับดักเวลา (Time Trap): วางกับดักลดความละเอียดแถบปี (5 ปี / 10 ปี) • ฝ่ากับดักสำเร็จรับรางวัล x2!',
    questionText: 'ภาพยนตร์ไทย "พี่มาก..พระโขนง" ทำรายได้ถล่มทลายทะลุพันล้านบาทเข้าฉายในปี พ.ศ. ใด?',
    targetYear: 2556,
    yearPenaltyPerDiff: 50,
    yearFastestBonus: 0,
    rewardCoins: 600,
    penaltyCoins: 50,
    durationSeconds: 35,
  },
  {
    id: 'tj-6',
    gameStage: 'TIMEJINX',
    inputMode: 'MODE_B_YEAR',
    chronoSubRound: 'CHRONO_SUB2_TRAP',
    yearUnit: 'AD',
    yearMin: 1985,
    yearMax: 2026,
    title: 'THE CHRONO CRUSH • ด่านย่อยที่ 2 (ข้อ 6/9)',
    subtitle: 'วางกับดักเวลา (Time Trap): วางกับดักลดความละเอียดแถบปี (5 ปี / 10 ปี) • ฝ่ากับดักสำเร็จรับรางวัล x2!',
    questionText: 'แพลตฟอร์ม YouTube ถูกก่อตั้งขึ้นและอัปโหลดคลิปแรก "Me at the zoo" ในปี ค.ศ. ใด?',
    targetYear: 2005,
    yearPenaltyPerDiff: 50,
    yearFastestBonus: 0,
    rewardCoins: 600,
    penaltyCoins: 50,
    durationSeconds: 35,
  },
  {
    id: 'tj-7',
    gameStage: 'TIMEJINX',
    inputMode: 'MODE_B_YEAR',
    chronoSubRound: 'CHRONO_SUB3_FAST_FINGER',
    yearUnit: 'AD',
    yearMin: 2012,
    yearMax: 2021,
    title: 'THE CHRONO CRUSH • ด่านย่อยที่ 3 (ข้อ 7/9)',
    subtitle: 'สงครามแย่งปี (Fast Finger Year): แย่งกดล็อกปีก่อนใคร (1 ปีต่อ 1 ทีม) — ตรงเป๊ะ +1,000 ฿ | ห่าง 1-2 ปี +400 ฿ | ห่าง ≥3 ปี -150 ฿/ปี',
    questionText: 'ซีรีส์ "Squid Game (สควิดเกม เล่นลุ้นตาย)" ซีซั่นแรก ฉายทาง Netflix ปี ค.ศ. ใด?',
    targetYear: 2021,
    yearPenaltyPerDiff: 150,
    yearFastestBonus: 0,
    rewardCoins: 1000,
    penaltyCoins: 150,
    durationSeconds: 20,
  },
  {
    id: 'tj-8',
    gameStage: 'TIMEJINX',
    inputMode: 'MODE_B_YEAR',
    chronoSubRound: 'CHRONO_SUB3_FAST_FINGER',
    yearUnit: 'BE',
    yearMin: 2557,
    yearMax: 2566,
    title: 'THE CHRONO CRUSH • ด่านย่อยที่ 3 (ข้อ 8/9)',
    subtitle: 'สงครามแย่งปี (Fast Finger Year): แย่งกดล็อกปีก่อนใคร (1 ปีต่อ 1 ทีม) — ตรงเป๊ะ +1,000 ฿ | ห่าง 1-2 ปี +400 ฿ | ห่าง ≥3 ปี -150 ฿/ปี',
    questionText: 'ละคร "บุพเพสันนิวาส" สร้างปรากฏการณ์ออเจ้าทั่วไทย ออกอากาศครั้งแรกในปี พ.ศ. ใด?',
    targetYear: 2561,
    yearPenaltyPerDiff: 150,
    yearFastestBonus: 0,
    rewardCoins: 1000,
    penaltyCoins: 150,
    durationSeconds: 20,
  },
  {
    id: 'tj-9',
    gameStage: 'TIMEJINX',
    inputMode: 'MODE_B_YEAR',
    chronoSubRound: 'CHRONO_SUB3_FAST_FINGER',
    yearUnit: 'AD',
    yearMin: 2015,
    yearMax: 2024,
    title: 'THE CHRONO CRUSH • ด่านย่อยที่ 3 (ข้อ 9/9)',
    subtitle: 'สงครามแย่งปี (Fast Finger Year): แย่งกดล็อกปีก่อนใคร (1 ปีต่อ 1 ทีม) — ตรงเป๊ะ +1,000 ฿ | ห่าง 1-2 ปี +400 ฿ | ห่าง ≥3 ปี -150 ฿/ปี',
    questionText: 'เกม "Among Us" ระเบิดความนิยมทั่วโลกในช่วงล็อกดาวน์ปี ค.ศ. ใด?',
    targetYear: 2020,
    yearPenaltyPerDiff: 150,
    yearFastestBonus: 0,
    rewardCoins: 1000,
    penaltyCoins: 150,
    durationSeconds: 20,
  },

  // ==========================================
  // GAME 3: QUIXORT (สายพานคัดแยกของเล่นผีสิง)
  // ==========================================
  {
    id: 'qx-1',
    gameStage: 'QUIXORT',
    inputMode: 'MODE_D_SECRET',
    modeDSubType: 'QUIXORT_BET',
    title: 'ด่านที่ 3: สายพานคัดแยกของเล่นผีสิง (รอบวางเดิมพัน)',
    subtitle: 'ทีมที่ไม่ได้ลงสนาม: ลงเงินเดิมพันและทายว่าทีมในสนามจะเรียงลำดับ "สำเร็จ (PASS)" หรือ "ล้มเหลว (FAIL)"!',
    questionText: 'ภารกิจจัดเรียงลำดับ Live Action ภายใน 60 วินาที: เรียงความสูงตึก/แลนด์มาร์กจาก เตี้ยสุด ไป สูงสุด!',
    activeTeamId: 'team1',
    quixortRule: 'เรียงจาก ความสูงน้อยสุด ➔ ความสูงมากสุด (ภายใน 60 วินาที)',
    quixortItems: [
      '1. อนุสาวรีย์ชัยสมรภูมิ (49 ม.)',
      '2. เสาชิงช้า (21 ม.)',
      '3. ตึกใบหยก 2 (304 ม.)',
      '4. ตึกมหานคร (314 ม.)',
      '5. หอคอยบรรหาร-แจ่มใส (123 ม.)',
      '6. พระปรางค์วัดอรุณฯ (81 ม.)',
    ],
    rewardCoins: 200,
    penaltyCoins: 100,
    durationSeconds: 60,
  },
  {
    id: 'qx-buzzer',
    gameStage: 'QUIXORT',
    inputMode: 'MODE_C_BUZZER',
    title: 'ด่านที่ 3: ศึกชิงกระดิ่งสายพานนรก (Speed Buzzer)',
    subtitle: 'เตรียมนิ้วให้พร้อม! ทีมที่กดกระดิ่งได้เร็วที่สุดระดับมิลลิวินาทีจะได้สิทธิ์เลือกโจทย์หรือขโมยเหรียญ!',
    questionText: 'เมื่อสัญญาณไฟสีทองสว่างขึ้น กดปุ่มกระดิ่งยักษ์กลางจอมือถือทันที!',
    rewardCoins: 150,
    penaltyCoins: 100,
    durationSeconds: 15,
  },

  // ==========================================
  // GAME 4: TRIVIA MURDER PARTY (ลานประหารของครามปุส)
  // ==========================================
  {
    id: 'tmp-1',
    gameStage: 'TRIVIA_MURDER',
    inputMode: 'MODE_A_CHOICE',
    title: 'ด่านที่ 4: ลานประหารของครามปุส (คำถามชี้ชะตา 1)',
    subtitle: 'ตอบถูกได้ +250 เหรียญ! ตอบผิดต้องส่งตัวแทนลงสู่ "ลานประหาร (Killing Floor)"!',
    questionText: 'ตามตำนานยุโรปดั้งเดิม "ครามปุส (Krampus)" จะออกล่าเด็กดื้อในคืนวันที่เท่าไหร่ (Krampusnacht)?',
    choiceCount: 4,
    choices: [
      { key: 'A', label: 'คืนวันที่ 5 ธันวาคม (ก่อนวันนักบุญนิโคลัส)', isCorrect: true },
      { key: 'B', label: 'คืนวันที่ 24 ธันวาคม (Christmas Eve)', isCorrect: false, isTrap: true },
      { key: 'C', label: 'คืนวันที่ 13 ธันวาคม (ศุกร์ 13 เหมันต์)', isCorrect: false, isTrap: true },
      { key: 'D', label: 'คืนวันที่ 31 ธันวาคม (คืนส่งท้ายปี)', isCorrect: false, isTrap: true },
    ],
    correctChoices: ['A'],
    trapChoices: ['B', 'C', 'D'],
    rewardCoins: 250,
    penaltyCoins: 150,
    durationSeconds: 30,
  },
  {
    id: 'tmp-2',
    gameStage: 'TRIVIA_MURDER',
    inputMode: 'MODE_A_CHOICE',
    title: 'ด่านที่ 4: ลานประหารของครามปุส (คำถามชี้ชะตา 2)',
    subtitle: 'คำถามจิตวิทยาเอาชีวิตรอด — ตอบผิดตกสู่ลานประหารทันที!',
    questionText: 'สัตว์ชนิดใดที่มี "หัวใจ 3 ดวง" และ "เลือดสีน้ำเงิน"?',
    choiceCount: 4,
    choices: [
      { key: 'A', label: 'แมงดาทะเล (Horseshoe Crab)', isCorrect: false, isTrap: true },
      { key: 'B', label: 'หมึกยักษ์ (Octopus)', isCorrect: true },
      { key: 'C', label: 'ปลาไหลไฟฟ้า (Electric Eel)', isCorrect: false, isTrap: true },
      { key: 'D', label: 'ตุ่นปากเป็ด (Platypus)', isCorrect: false, isTrap: true },
    ],
    correctChoices: ['B'],
    trapChoices: ['A', 'C', 'D'],
    rewardCoins: 250,
    penaltyCoins: 150,
    durationSeconds: 25,
  },
  {
    id: 'tmp-minigame-unique',
    gameStage: 'TRIVIA_MURDER',
    inputMode: 'MODE_D_SECRET',
    modeDSubType: 'UNIQUE_NUMBER_1_10',
    title: 'มินิเกมลานประหาร: ตัวเลขคนบาปที่ไม่ซ้ำ (Lowest Unique Number)',
    subtitle: 'เลือกเลขลับ 1 ถึง 10! ทีมที่เลือก "เลขน้อยที่สุดโดยไม่ซ้ำกับทีมอื่นเลย" จะชนะรางวัลใหญ่ ถ้าเลือกเลขชนกัน = โดนลงทัณฑ์!',
    questionText: 'จงเลือกตัวเลขลับ 1 - 10 (ห้ามซ้ำกับทีมอื่น และต้องน้อยที่สุด!)',
    uniqueRule: 'LOWEST',
    rewardCoins: 400,
    penaltyCoins: 200,
    durationSeconds: 30,
  },
  {
    id: 'tmp-minigame-wager',
    gameStage: 'TRIVIA_MURDER',
    inputMode: 'MODE_D_SECRET',
    modeDSubType: 'COIN_WAGER',
    title: 'มินิเกมลานประหาร: ประมูลส่วยเลือดครามปุส (Secret Bribe Auction)',
    subtitle: 'กรอกจำนวนเหรียญศักดิ์สิทธิ์ที่ยอมจ่ายเป็นส่วยลับ! ทีมที่จ่ายสูงสุดจะได้สิทธิ์รอดตายและยึดส่วยของทีมที่จ่ายน้อยสุด!',
    questionText: 'ใส่จำนวนเหรียญเดิมพันลับของคุณ (ซ่อนไว้จนกว่าจะกด Reveal All)',
    rewardCoins: 500,
    penaltyCoins: 0,
    durationSeconds: 35,
  },
  {
    id: 'tmp-minigame-chalice',
    gameStage: 'TRIVIA_MURDER',
    inputMode: 'MODE_D_SECRET',
    modeDSubType: 'CURSED_CHALICE',
    title: 'มินิเกมลานประหาร: กล่องของขวัญต้องสาป & มีดตัดนิ้ว',
    subtitle: 'เลือก 1 ใน 4 กล่องลับของครามปุส — มีทั้งกล่องทองคำคูณสอง และกล่องกับดักตัดนิ้ว!',
    questionText: 'จงเลือกกล่องลับ 1 ใบ (ซ่อนคำตอบจนกว่าจะเปิดพร้อมกัน)',
    choiceCount: 4,
    choices: [
      { key: '1', label: 'กล่องกำมะหยี่สีเลือด (#1)', isCorrect: true },
      { key: '2', label: 'หีบเหล็กโซ่ตรวน (#2)', isCorrect: false, isTrap: true },
      { key: '3', label: 'ถุงกระสอบครามปุส (#3)', isCorrect: true },
      { key: '4', label: 'กล่องดนตรีไขลานทอง (#4)', isCorrect: false, isTrap: true },
    ],
    correctChoices: ['1', '3'],
    trapChoices: ['2', '4'],
    rewardCoins: 300,
    penaltyCoins: 250,
    durationSeconds: 25,
  },
];

export function createRoundFromPreset(preset: QuestionPreset): RoundConfig {
  const count = preset.choiceCount || (preset.gameStage === 'POLL_MINE' ? 8 : 4);
  const subRound = preset.eightDoorsSubRound || 'SUB1_SURVIVAL';
  const suggested = getSuggestedSafeRange(count, subRound);
  const safeMin = preset.safeRankMin ?? suggested.min;
  const safeMax = preset.safeRankMax ?? suggested.max;
  const choices =
    preset.choices && preset.choices.length > 0
      ? preset.choices.map((c, idx) => ({
          ...c,
          rank: c.rank ?? idx + 1,
          isOpened: false,
        }))
      : DOOR_LABELS.slice(0, count).map((key, idx) => {
          const rank = idx + 1;
          const isSafe = rank >= safeMin && rank <= safeMax;
          return {
            key,
            label: `ตัวเลือก ${key}`,
            rank,
            isCorrect: isSafe,
            isTrap: !isSafe,
            isOpened: false,
          };
        });

  return {
    id: `round-${Date.now()}`,
    presetId: preset.id,
    gameStage: preset.gameStage,
    inputMode: preset.inputMode,
    modeDSubType: preset.modeDSubType || 'UNIQUE_NUMBER_1_10',
    eightDoorsSubRound: subRound,
    auctionIteration: 1,
    subRound2LockedTeamId: null,
    auctionWinnerTeamId: null,
    auctionWinningBid: 0,
    lastOpenedDoorKey: null,
    safeRankMin: safeMin,
    safeRankMax: safeMax,
    snakeDraftOrder: [],
    snakeDraftIndex: 0,
    snakeDraftPicks: [],
    cowardFreePick: false,
    title: preset.title,
    subtitle: preset.subtitle,
    questionText: preset.questionText,
    choiceCount: count,
    choices,
    correctChoices: preset.correctChoices || ['A'],
    trapChoices: preset.trapChoices || [],
    targetYear: preset.targetYear ?? 2020,
    yearUnit: preset.yearUnit ?? 'AD',
    yearMin: preset.yearMin ?? (preset.yearUnit === 'BE' ? 2520 : 1980),
    yearMax: preset.yearMax ?? (preset.yearUnit === 'BE' ? 2569 : 2026),
    chronoSubRound: preset.chronoSubRound ?? 'CHRONO_SUB1_CLASSIC',
    chronoPhase: preset.chronoSubRound === 'CHRONO_SUB2_TRAP' ? 'TRAP_PLACEMENT' : 'YEAR_GUESS',
    chronoTrapsPlaced: {},
    chronoShields: {},
    chronoQuotas: {},
    chronoFastFingerClaims: {},
    yearPenaltyPerDiff: preset.yearPenaltyPerDiff ?? 50,
    yearFastestBonus: preset.yearFastestBonus ?? 200,
    activeTeamId: preset.activeTeamId || 'team1',
    quixortRule: preset.quixortRule || 'เรียงลำดับให้ถูกต้องภายในเวลาที่กำหนด',
    quixortItems: preset.quixortItems || [],
    uniqueRule: preset.uniqueRule || 'LOWEST',
    wagerMultiplier: 2,
    rewardCoins: preset.rewardCoins ?? 300,
    penaltyCoins: preset.penaltyCoins ?? 150,
    durationSeconds: preset.durationSeconds || 30,
    timerStartedAt: null,
    timerRemainingMs: (preset.durationSeconds || 30) * 1000,
    status: 'IDLE',
    rewardsApplied: false,
  };
}

export const INITIAL_GAME_STATE: KrampusGameState = {
  version: 1,
  serverTimestamp: Date.now(),
  roomCode: 'KRAMPUS',
  roomLocked: false,
  soundEnabled: true,
  showLeaderboardOverlay: false,
  showQrOverlay: false,
  krampusAlertMessage: null,
  teams: INITIAL_TEAMS,
  round: {
    ...createRoundFromPreset(DEFAULT_PRESETS[0]),
    gameStage: 'LOBBY',
    title: 'THE KRAMPUS EVE - มหากาพย์การเอาชีวิตรอดในคืนคริสต์มาสอีฟ',
    subtitle: 'รอ Sub-GM ประจำกลุ่มลงทะเบียนเข้าสู่คฤหาสน์ครามปุส...',
  },
  submissions: {},
  buzzerQueue: [],
  transactions: [],
  presets: DEFAULT_PRESETS,
};
