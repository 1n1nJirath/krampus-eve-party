import {
  ChronoSubRound,
  EightDoorsSubRound,
  KrampusGameState,
  LastManCurseId,
  LastManPart1Question,
  LastManPart2Question,
  LastManShopItemId,
  LastManStandingState,
  LastManTeamState,
  QuestionPreset,
  RoundConfig,
  Team,
  TeamId,
  ToyFactoryDataset,
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

export const DEFAULT_TOY_FACTORY_DATASETS: ToyFactoryDataset[] = [
  {
    id: 'tf-1',
    title: 'ความสูงตึกและแลนด์มาร์กในไทย',
    direction: 'เรียงจาก เตี้ยสุด ➔ สูงสุด (เมตร)',
    items: [
      { id: 'tf1-1', label: 'เสาชิงช้า', realValue: '21 ม.' },
      { id: 'tf1-2', label: 'อนุสาวรีย์ชัยสมรภูมิ', realValue: '49 ม.' },
      { id: 'tf1-3', label: 'พระปรางค์วัดอรุณฯ', realValue: '81 ม.' },
      { id: 'tf1-4', label: 'หอคอยบรรหาร-แจ่มใส', realValue: '123 ม.' },
      {
        id: 'tf1-5',
        label: 'ตึกใบหยก 2',
        realValue: '304 ม.',
        isMystery: true,
        mysteryClue: 'สูงกว่า 250 เมตร แต่ไม่ถึง 310 เมตร',
      },
      { id: 'tf1-6', label: 'ตึกมหานคร', realValue: '314 ม.' },
    ],
  },
  {
    id: 'tf-2',
    title: 'ปีที่เข้าฉายของภาพยนตร์ไทยระดับตำนาน',
    direction: 'เรียงจาก เก่าสุด ➔ ใหม่สุด (พ.ศ.)',
    items: [
      { id: 'tf2-1', label: '2499 อันธพาลครองเมือง', realValue: 'พ.ศ. 2540' },
      { id: 'tf2-2', label: 'นางนาก', realValue: 'พ.ศ. 2542' },
      {
        id: 'tf2-3',
        label: 'แฟนฉัน',
        realValue: 'พ.ศ. 2546',
        isMystery: true,
        mysteryClue: 'เข้าฉายช่วงปี พ.ศ. 2545 – 2548',
      },
      { id: 'tf2-4', label: 'รถไฟฟ้า มาหานะเธอ', realValue: 'พ.ศ. 2552' },
      { id: 'tf2-5', label: 'พี่มาก..พระโขนง', realValue: 'พ.ศ. 2556' },
      { id: 'tf2-6', label: 'ฉลาดเกมส์โกง', realValue: 'พ.ศ. 2560' },
    ],
  },
  {
    id: 'tf-3',
    title: 'ความยาวแม่น้ำสายสำคัญของไทยและโลก',
    direction: 'เรียงจาก สั้นสุด ➔ ยาวสุด (กม.)',
    items: [
      { id: 'tf3-1', label: 'แม่น้ำเจ้าพระยา', realValue: '372 กม.' },
      { id: 'tf3-2', label: 'แม่น้ำปิง', realValue: '658 กม.' },
      { id: 'tf3-3', label: 'แม่น้ำชี', realValue: '765 กม.' },
      {
        id: 'tf3-4',
        label: 'แม่น้ำโขง',
        realValue: '4,350 กม.',
        isMystery: true,
        mysteryClue: 'ยาวมากกว่า 3,000 กม. แต่น้อยกว่า 5,000 กม.',
      },
      { id: 'tf3-5', label: 'แม่น้ำแอมะซอน', realValue: '6,400 กม.' },
      { id: 'tf3-6', label: 'แม่น้ำไนล์', realValue: '6,650 กม.' },
    ],
  },
  {
    id: 'tf-4',
    title: 'ปีเปิดตัวโซเชียลมีเดียและแอปยอดฮิต',
    direction: 'เรียงจาก เก่าสุด ➔ ใหม่สุด (ค.ศ.)',
    items: [
      { id: 'tf4-1', label: 'Facebook', realValue: 'ค.ศ. 2004' },
      { id: 'tf4-2', label: 'YouTube', realValue: 'ค.ศ. 2005' },
      { id: 'tf4-3', label: 'Instagram', realValue: 'ค.ศ. 2010' },
      {
        id: 'tf4-4',
        label: 'LINE',
        realValue: 'ค.ศ. 2011',
        isMystery: true,
        mysteryClue: 'เปิดตัวหลังปี 2010 แต่ก่อนปี 2015',
      },
      { id: 'tf4-5', label: 'TikTok', realValue: 'ค.ศ. 2016' },
      { id: 'tf4-6', label: 'Threads', realValue: 'ค.ศ. 2023' },
    ],
  },
  {
    id: 'tf-5',
    title: 'จำนวนแคลอรีเฉลี่ยของอาหารยอดนิยม (1 จาน/แก้ว)',
    direction: 'เรียงจาก น้อยสุด ➔ มากสุด (kcal)',
    items: [
      { id: 'tf5-1', label: 'อเมริกาโน่เย็นไม่หวาน', realValue: '15 kcal' },
      { id: 'tf5-2', label: 'ส้มตำไทย', realValue: '120 kcal' },
      {
        id: 'tf5-3',
        label: 'ชานมไข่มุกหวานปกติ',
        realValue: '350 kcal',
        isMystery: true,
        mysteryClue: 'อยู่ระหว่าง 300 – 400 kcal',
      },
      { id: 'tf5-4', label: 'ข้าวมันไก่ต้ม', realValue: '585 kcal' },
      { id: 'tf5-5', label: 'ข้าวกะเพราหมูสับไข่ดาว', realValue: '630 kcal' },
      { id: 'tf5-6', label: 'ข้าวขาหมูพิเศษ', realValue: '720 kcal' },
    ],
  },
];

export function buildToyFactoryPairings(
  activeTeams: TeamId[]
): Array<{ sortingTeamId: TeamId; holdingTeamId: TeamId }> {
  const pool = [...activeTeams];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const n = pool.length;
  return pool.map((sortingTeamId, idx) => ({
    sortingTeamId,
    holdingTeamId: pool[(idx + 1) % n],
  }));
}

export interface BlackMarketItemMeta {
  id: LastManShopItemId;
  name: string;
  icon: string;
  price: number;
  maxPerRound: number;
  maxPerGame?: number;
  needsTarget?: 'KILLING_FLOOR' | 'RIVAL_LIVING';
  onlyKillingFloorBuyer?: boolean;
  description: string;
}

export const BLACK_MARKET_ITEMS: BlackMarketItemMeta[] = [
  {
    id: 'CURSE_BOX',
    name: 'กล่องคำสาปป่วน',
    icon: '🎁',
    price: 100,
    maxPerRound: 2,
    needsTarget: 'KILLING_FLOOR',
    description: 'เลือกทีมบนลานประหาร -> สุ่มแปะ 1 ใน 5 คำสาปหน้างานทันที!',
  },
  {
    id: 'SNIPER_SHOT',
    name: 'มือปืนยิงตัดขา',
    icon: '🔫',
    price: 150,
    maxPerRound: 2,
    needsTarget: 'RIVAL_LIVING',
    description: 'เลือกทีมคู่แข่งที่ยังมีชีวิต -> ยิงหักหัวใจทันที -1 ดวง!',
  },
  {
    id: 'MIRROR_SHIELD',
    name: 'โล่กระจกสะท้อน',
    icon: '🪞',
    price: 150,
    maxPerRound: 1,
    description: 'กันมือปืน/คำสาปในรอบนี้ 1 ครั้ง พร้อมสะท้อนกลับใส่คนส่ง! (กันโซ่ตรวนไม่ได้)',
  },
  {
    id: 'HELL_CHAINS',
    name: 'โซ่ตรวนลากลงนรกยกแก๊ง',
    icon: '⛓️',
    price: 200,
    maxPerRound: 1,
    maxPerGame: 2,
    description: 'ลากทุกทีมที่รอดอยู่โซนปลอดภัยลงมาลานประหารพร้อมกันทั้งหมด!',
  },
  {
    id: 'EXECUTIONER_BRIBE',
    name: 'สินบนเพชฌฆาต',
    icon: '💰',
    price: 200,
    maxPerRound: 1,
    onlyKillingFloorBuyer: true,
    description: '(เฉพาะทีมบนลานประหาร) จ่ายเงินหนีกลับขึ้นโซนปลอดภัยทันที!',
  },
  {
    id: 'REVIVE_POTION',
    name: 'ยาชุบชีวิต',
    icon: '🧪',
    price: 250,
    maxPerRound: 1,
    description: 'เติมหัวใจให้ทีมตัวเองทันที +1 ดวง (สูงสุด 4 ดวง)',
  },
  {
    id: 'JETPACK',
    name: 'พลุไอพ่นหนีตาย',
    icon: '🚀',
    price: 200,
    maxPerRound: 2,
    maxPerGame: 2,
    description: 'เก็บเข้ากระเป๋าไว้กดใช้ช่วงที่ 2 เพื่อพุ่งข้าม +3 ขั้นทันที!',
  },
];

export const CURSE_CATALOG: Record<LastManCurseId, { name: string; icon: string; desc: string }> = {
  BLIND_GM: {
    name: 'Sub-GM ตาบอด',
    icon: '🙈',
    desc: 'Sub-GM ต้องหันหลังให้จอมือถือและจอใหญ่ ลูกทีมต้องตะโกนอ่านโจทย์และสั่งซ้าย-ขวาให้กดแทน',
  },
  MUTE_TEAM: {
    name: 'ใบ้กินทั้งกลุ่ม',
    icon: '🤐',
    desc: 'ห้ามคนในทีมพูดออกเสียงแม้แต่คำเดียวตลอดมินิเกม ใช้ได้แค่ภาษามือ (หลุดพูด -1 ❤️)',
  },
  FOREHEAD_PHONE: {
    name: 'มือถือแปะหน้าผาก',
    icon: '📱',
    desc: 'Sub-GM เอามือถือแปะหน้าผากหันจอออกหาลูกทีม ห้ามมองเอง ให้ลูกทีมจับนิ้วจิ้มคำตอบ',
  },
  PA_THONG_KO: {
    name: 'ตัวติดกันเป็นปาท่องโก๋',
    icon: '🔗',
    desc: 'สมาชิกทุกคนในทีม (รวม Sub-GM) ต้องคล้องแขนต่อเป็นแถวเดียวกันห้ามหลุดจนจบมินิเกม',
  },
  FREEZE_STATUE: {
    name: 'หุ่นขี้ผึ้งต้องสาป (Freeze!)',
    icon: '🗿',
    desc: 'เมื่อ Admin กดเสียงเตือน "KRAMPUS มองอยู่!" ทุกคนต้องหยุดนิ่งเป็นรูปปั้น 3 วิ (ขยับ -1 ❤️)',
  },
};

export const DEFAULT_LAST_MAN_PART1_QUESTIONS: LastManPart1Question[] = [
  {
    id: 'lms-p1-1',
    questionText: 'ในตำนานยุโรป Krampus มักออกล่าเด็กดื้อในคืนวันที่เท่าไหร่ของเดือนธันวาคม?',
    choices: [
      { key: 'A', label: '5 ธันวาคม (Krampusnacht)' },
      { key: 'B', label: '24 ธันวาคม (Christmas Eve)' },
      { key: 'C', label: '31 ธันวาคม (New Year Eve)' },
      { key: 'D', label: '13 ธันวาคม (St. Lucia Day)' },
    ],
    correctKey: 'A',
  },
  {
    id: 'lms-p1-2',
    questionText: 'กวางเรนเดียร์ของซานตาคลอสตัวไหนที่มีจมูกสีแดงเรืองแสงเป็นผู้นำขบวน?',
    choices: [
      { key: 'A', label: 'Dasher (แดชเชอร์)' },
      { key: 'B', label: 'Rudolph (รูดอล์ฟ)' },
      { key: 'C', label: 'Blitzen (บลิตเซน)' },
      { key: 'D', label: 'Comet (โคเมต)' },
    ],
    correctKey: 'B',
  },
  {
    id: 'lms-p1-3',
    questionText: 'สีประจำชุดของซานตาคลอสในยุคดั้งเดิมก่อนโฆษณา Coca-Cola มักเป็นสีอะไร?',
    choices: [
      { key: 'A', label: 'สีดำล้วน' },
      { key: 'B', label: 'สีทองและม่วง' },
      { key: 'C', label: 'สีเขียวหรือน้ำตาล' },
      { key: 'D', label: 'สีฟ้าขาว' },
    ],
    correctKey: 'C',
  },
  {
    id: 'lms-p1-4',
    questionText: 'ตามตำนานของ Krampus สิ่งที่มันพกติดตัวไว้ฟาดเด็กดื้อและจับใส่กระสอบคืออะไร?',
    choices: [
      { key: 'A', label: 'กิ่งไม้เบิร์ชและโซ่ตรวน' },
      { key: 'B', label: 'ไม้เท้าแคนดี้เคนยักษ์' },
      { key: 'C', label: 'ถุงเท้ายาวสีแดง' },
      { key: 'D', label: 'กระดิ่งทองคำ' },
    ],
    correctKey: 'A',
  },
];

export const DEFAULT_LAST_MAN_PART2_QUESTIONS: LastManPart2Question[] = [
  {
    id: 'lms-p2-1',
    clueText: 'คำใบ้: สัตว์เลี้ยงลูกด้วยนมขนาดใหญ่ในขั้วโลกเหนือที่มักถูกเข้าใจผิดว่าเป็นญาติกับเพนกวิน',
    questionText: 'ข้อใดเป็นความจริงเกี่ยวกับ "หมีขั้วโลก (Polar Bear)"?',
    choices: [
      { key: 'A', label: 'อาศัยอยู่เฉพาะแถบขั้วโลกเหนือ ไม่เคยเจอกับเพนกวินในธรรมชาติ' },
      { key: 'B', label: 'ขนของมันมีสีขาวทึบและผิวหนังใต้ขนเป็นสีชมพู' },
      { key: 'C', label: 'จำศีลหลับยาวตลอดฤดูหนาวทุกตัวทั้งตัวผู้และตัวเมีย' },
    ],
    correctKey: 'A',
    durationSeconds: 60,
  },
  {
    id: 'lms-p2-2',
    clueText: 'คำใบ้: เพลงคริสต์มาสยอดฮิตที่ชื่อเพลงไม่ได้มีคำว่า Christmas แต่พูดถึงการนั่งรถเลื่อนหิมะ',
    questionText: 'เพลง "Jingle Bells" เดิมทีถูกแต่งขึ้นเพื่อเทศกาลใดในสหรัฐอเมริกา?',
    choices: [
      { key: 'A', label: 'วันฮาโลวีน (Halloween)' },
      { key: 'B', label: 'วันขอบคุณพระเจ้า (Thanksgiving)' },
      { key: 'C', label: 'วันวาเลนไทน์ (Valentine Day)' },
    ],
    correctKey: 'B',
    durationSeconds: 60,
  },
  {
    id: 'lms-p2-3',
    clueText: 'คำใบ้: ประเทศเกาะในมหาสมุทรแปซิฟิกที่มีธรรมเนียมกินไก่ทอด KFC เป็นมื้อหลักวันคริสต์มาส',
    questionText: 'แคมเปญ "Kurisumasu ni wa Kentakkii!" เกิดขึ้นครั้งแรกที่ประเทศใด?',
    choices: [
      { key: 'A', label: 'เกาหลีใต้' },
      { key: 'B', label: 'ฟิลิปปินส์' },
      { key: 'C', label: 'ญี่ปุ่น' },
    ],
    correctKey: 'C',
    durationSeconds: 60,
  },
  {
    id: 'lms-p2-4',
    clueText: 'คำใบ้: ผลไม้สีเขียว-แดงในตำนานคริสต์มาสที่ซ่อนตัวอยู่บนต้นไม้หรือกรอบประตู',
    questionText: 'ตามธรรมเนียมฝรั่ง หากยืนอยู่ใต้ "Mistletoe (มิสเซิลโท)" ต้องทำอะไร?',
    choices: [
      { key: 'A', label: 'จูบกันเพื่อความเป็นสิริมงคล' },
      { key: 'B', label: 'โยนเหรียญข้ามไหล่ซ้าย' },
      { key: 'C', label: 'เป่าเทียนให้ดับในครั้งเดียว' },
    ],
    correctKey: 'A',
    durationSeconds: 60,
  },
  {
    id: 'lms-p2-5',
    clueText: 'คำใบ้: ของหวานรูปทรงไม้เท้าลายขวางแดงขาวที่แจกกันทั่วโลก',
    questionText: 'Candy Cane (ลูกกวาดไม้เท้า) ถูกดัดให้เป็นรูปตัว J เพื่อสื่อถึงอะไร?',
    choices: [
      { key: 'A', label: 'Jingle Bells' },
      { key: 'B', label: 'Jesus และไม้เท้าคนเลี้ยงแกะ' },
      { key: 'C', label: 'January เดือนปีใหม่' },
    ],
    correctKey: 'B',
    durationSeconds: 60,
  },
  {
    id: 'lms-p2-6',
    clueText: 'คำใบ้: ตัวเลขวันในปฏิทินและจำนวนของขวัญในเพลงคริสต์มาสชื่อดัง',
    questionText: 'ในเพลง "The 12 Days of Christmas" ของขวัญในวันที่ 5 คืออะไร?',
    choices: [
      { key: 'A', label: 'Four Calling Birds' },
      { key: 'B', label: 'Six Geese a-Laying' },
      { key: 'C', label: 'Five Golden Rings' },
    ],
    correctKey: 'C',
    durationSeconds: 60,
  },
  {
    id: 'lms-p2-7',
    clueText: 'คำใบ้: ภาพยนตร์คอมเมดี้คริสต์มาสระดับตำนานปี 1990 ที่มีเด็กน้อยวางกับดักโจรในบ้าน',
    questionText: 'เด็กชายตัวเอกในเรื่อง "Home Alone" มีชื่อจริงว่าอะไร?',
    choices: [
      { key: 'A', label: 'Kevin McCallister' },
      { key: 'B', label: 'Charlie Bucket' },
      { key: 'C', label: 'Peter Parker' },
    ],
    correctKey: 'A',
    durationSeconds: 60,
  },
  {
    id: 'lms-p2-8',
    clueText: 'คำใบ้: ของขวัญสุดแสบที่ซานต้ามักใส่ในถุงเท้าของเด็กดื้อแทนของเล่น',
    questionText: 'เด็กดื้อในตำนานจะได้อะไรในถุงเท้าเช้าวันคริสต์มาส?',
    choices: [
      { key: 'A', label: 'ก้อนถ่านหิน (Lump of Coal)' },
      { key: 'B', label: 'หัวหอมดิบ' },
      { key: 'C', label: 'ถุงเท้าขาดๆ' },
    ],
    correctKey: 'A',
    durationSeconds: 60,
  },
];

export function createDefaultLastManRoundStock(): Record<LastManShopItemId, number> {
  return {
    CURSE_BOX: 2,
    SNIPER_SHOT: 2,
    MIRROR_SHIELD: 1,
    HELL_CHAINS: 1,
    EXECUTIONER_BRIBE: 1,
    REVIVE_POTION: 1,
    JETPACK: 2,
  };
}

export function createInitialLastManState(teams: Record<TeamId, Team>): LastManStandingState {
  const teamStates = {} as Record<TeamId, LastManTeamState>;
  TEAM_ORDER.forEach((tid) => {
    const cursed = Boolean(teams[tid]?.toyFactoryCurse);
    const startingHearts = cursed ? 3 : 4;
    teamStates[tid] = {
      hearts: startingHearts,
      isGhost: false,
      inKillingFloor: false,
      mirrorShield: false,
      activeCurse: null,
      jetpacks: 0,
      step: 0,
    };
  });
  return {
    phase: 'KRAMPUS_TWIST',
    part1Round: 1,
    part2QuestionIndex: 0,
    krampusStep: 0,
    winnerTeamId: null,
    miseryPullTeamId: null,
    miseryEndsAt: null,
    roundStock: createDefaultLastManRoundStock(),
    gameStock: {
      HELL_CHAINS: 2,
      JETPACK: 2,
    },
    killFeed: [],
    poisonedChalices: [],
    chalicePicks: {},
    splitStealPicks: {},
    dareVotes: {},
    krampusDiceRoll: null,
    teamDiceRolls: {},
    greedTaxReport: [],
    teamStates,
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
  toyFactoryDatasets: DEFAULT_TOY_FACTORY_DATASETS,
  lastManPart1Questions: DEFAULT_LAST_MAN_PART1_QUESTIONS,
  lastManPart2Questions: DEFAULT_LAST_MAN_PART2_QUESTIONS,
};
