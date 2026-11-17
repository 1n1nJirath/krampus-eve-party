import {
  BLACK_MARKET_ITEMS,
  createInitialLastManState,
  CURSE_CATALOG,
  DEFAULT_LAST_MAN_PART1_QUESTIONS,
  DEFAULT_LAST_MAN_PART2_QUESTIONS,
  getActiveTeamIds,
  TEAM_ORDER,
} from '../data/initialData';
import {
  KrampusGameState,
  LastManCurseId,
  LastManShopItemId,
  TeamId,
} from '../types/game';

export function pushLmsFeed(next: KrampusGameState, now: number, icon: string, message: string) {
  const lms = next.round.lastMan;
  if (!lms) return;
  lms.killFeed = [
    {
      id: `kf-${now}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: now,
      icon,
      message,
    },
    ...(lms.killFeed || []),
  ].slice(0, 20);
}

export function applyLmsSoulSacrifice(next: KrampusGameState, teamId: TeamId, now: number): boolean {
  const lms = next.round.lastMan;
  const ts = lms?.teamStates?.[teamId];
  const team = next.teams[teamId];
  if (!lms || !ts || !team || ts.isGhost || ts.hearts <= 1 || !lms.phase.startsWith('PART1_')) {
    return false;
  }
  ts.hearts -= 1;
  team.coins += 500;
  pushLmsFeed(next, now, '💔', `${team.icon} ${team.name} ขายวิญญาณ -1 ❤️ แลกเงินสด +500 ฿!`);
  return true;
}

export function applyLmsMiseryPull(
  next: KrampusGameState,
  teamId: TeamId,
  targetTeamId: TeamId,
  now: number
): boolean {
  const lms = next.round.lastMan;
  const targetTs = lms?.teamStates?.[targetTeamId];
  const targetTeam = next.teams[targetTeamId];
  const actorTeam = next.teams[teamId];
  if (
    !lms ||
    lms.phase !== 'PART1_MISERY_PULL' ||
    lms.miseryPullTeamId !== teamId ||
    !targetTs ||
    targetTs.isGhost ||
    targetTs.inKillingFloor
  ) {
    return false;
  }
  targetTs.inKillingFloor = true;
  targetTeam.isInKillingFloor = true;
  lms.phase = 'PART1_BLACK_MARKET';
  lms.miseryPullTeamId = null;
  lms.miseryEndsAt = null;
  next.round.status = 'ACTIVE';
  next.round.durationSeconds = 25;
  next.round.timerStartedAt = now;
  next.round.timerRemainingMs = null;
  pushLmsFeed(
    next,
    now,
    '🪝',
    `${actorTeam.icon} ${actorTeam.name} ลาก ${targetTeam.icon} ${targetTeam.name} ตกลงลานประหารด้วยกัน!`
  );
  return true;
}

export function applyLmsBuyItem(
  next: KrampusGameState,
  teamId: TeamId,
  itemId: LastManShopItemId,
  targetTeamId: TeamId | undefined,
  now: number
): boolean {
  const lms = next.round.lastMan;
  const buyerTs = lms?.teamStates?.[teamId];
  const buyerTeam = next.teams[teamId];
  const meta = BLACK_MARKET_ITEMS.find((m) => m.id === itemId);
  if (
    !lms ||
    lms.phase !== 'PART1_BLACK_MARKET' ||
    next.round.status !== 'ACTIVE' ||
    !buyerTs ||
    !buyerTeam ||
    buyerTs.isGhost ||
    buyerTs.hearts <= 0 ||
    !meta ||
    buyerTeam.coins < meta.price ||
    (lms.roundStock[itemId] || 0) <= 0
  ) {
    return false;
  }

  const curseKeys = Object.keys(CURSE_CATALOG) as LastManCurseId[];
  let ok = false;
  let icon = meta.icon;
  let msg = '';

  if (itemId === 'CURSE_BOX' && targetTeamId) {
    const tTs = lms.teamStates[targetTeamId];
    const tTeam = next.teams[targetTeamId];
    if (tTs && !tTs.isGhost && tTs.inKillingFloor) {
      ok = true;
      const curse = curseKeys[Math.floor(Math.random() * curseKeys.length)];
      const curseMeta = CURSE_CATALOG[curse];
      if (tTs.mirrorShield) {
        tTs.mirrorShield = false;
        buyerTs.activeCurse = curse;
        icon = '🪞';
        msg = `${tTeam.icon} ${tTeam.name} กางโล่กระจกสะท้อนกล่องคำสาป! ${buyerTeam.icon} ${buyerTeam.name} โดน ${curseMeta.icon} ${curseMeta.name} แทน!`;
      } else {
        tTs.activeCurse = curse;
        msg = `${buyerTeam.icon} ${buyerTeam.name} ส่งกล่องคำสาปใส่ ${tTeam.icon} ${tTeam.name} -> ติด ${curseMeta.icon} ${curseMeta.name}!`;
      }
    }
  } else if (itemId === 'SNIPER_SHOT' && targetTeamId && targetTeamId !== teamId) {
    const tTs = lms.teamStates[targetTeamId];
    const tTeam = next.teams[targetTeamId];
    if (tTs && !tTs.isGhost) {
      ok = true;
      if (tTs.mirrorShield) {
        tTs.mirrorShield = false;
        buyerTs.hearts = Math.max(0, buyerTs.hearts - 1);
        if (buyerTs.hearts <= 0) buyerTs.isGhost = true;
        icon = '🪞';
        msg = `${tTeam.icon} ${tTeam.name} สะท้อนกระสุน! ${buyerTeam.icon} ${buyerTeam.name} โดนยิงเอง -1 ❤️!`;
      } else {
        tTs.hearts = Math.max(0, tTs.hearts - 1);
        if (tTs.hearts <= 0) tTs.isGhost = true;
        msg = `${buyerTeam.icon} ${buyerTeam.name} จ้างมือปืนยิง ${tTeam.icon} ${tTeam.name} (-1 ❤️)${
          tTs.isGhost ? ' 💀 กลายเป็นวิญญาณ!' : ''
        }`;
      }
    }
  } else if (itemId === 'MIRROR_SHIELD' && !buyerTs.mirrorShield) {
    ok = true;
    buyerTs.mirrorShield = true;
    msg = `${buyerTeam.icon} ${buyerTeam.name} กางโล่กระจกสะท้อนรอบนี้!`;
  } else if (itemId === 'HELL_CHAINS' && lms.gameStock.HELL_CHAINS > 0) {
    ok = true;
    lms.gameStock.HELL_CHAINS -= 1;
    TEAM_ORDER.forEach((tid) => {
      const s = lms.teamStates[tid];
      if (!s.isGhost && !s.inKillingFloor) {
        s.inKillingFloor = true;
        next.teams[tid].isInKillingFloor = true;
      }
    });
    msg = `${buyerTeam.icon} ${buyerTeam.name} ใช้โซ่ตรวนลากทุกทีมลงนรกยกแก๊ง!!`;
  } else if (itemId === 'EXECUTIONER_BRIBE' && buyerTs.inKillingFloor) {
    ok = true;
    buyerTs.inKillingFloor = false;
    buyerTeam.isInKillingFloor = false;
    msg = `${buyerTeam.icon} ${buyerTeam.name} ยัดสินบนเพชฌฆาตหนีขึ้นโซนปลอดภัย!`;
  } else if (itemId === 'REVIVE_POTION' && buyerTs.hearts < 4) {
    ok = true;
    buyerTs.hearts = Math.min(4, buyerTs.hearts + 1);
    msg = `${buyerTeam.icon} ${buyerTeam.name} ดื่มยาชุบชีวิต (+1 ❤️ -> ${buyerTs.hearts} ดวง)`;
  } else if (itemId === 'JETPACK' && lms.gameStock.JETPACK > 0) {
    ok = true;
    lms.gameStock.JETPACK -= 1;
    buyerTs.jetpacks += 1;
    msg = `${buyerTeam.icon} ${buyerTeam.name} ซื้อพลุไอพ่นหนีตายเก็บเข้ากระเป๋า!`;
  }

  if (!ok) return false;
  buyerTeam.coins -= meta.price;
  lms.roundStock[itemId] -= 1;
  pushLmsFeed(next, now, icon, msg);
  return true;
}

export function applyLmsMinigameAction(
  next: KrampusGameState,
  teamId: TeamId,
  payload: {
    subType: string;
    chalices?: number[];
    chalice?: number;
    choice?: 'SPLIT' | 'STEAL';
    vote?: 'SPARE' | 'EXECUTE';
  }
): boolean {
  const lms = next.round.lastMan;
  if (!lms || lms.phase !== 'PART1_MINIGAME') return false;
  if (payload.subType === 'POISON_SET' && Array.isArray(payload.chalices)) {
    const nextSet = new Set(lms.poisonedChalices || []);
    payload.chalices.forEach((c) => {
      if (nextSet.size < 2 && c >= 1 && c <= 4) nextSet.add(c);
    });
    lms.poisonedChalices = Array.from(nextSet);
  } else if (payload.subType === 'CHALICE_PICK') {
    lms.chalicePicks = { ...lms.chalicePicks, [teamId]: Number(payload.chalice) };
  } else if (payload.subType === 'SPLIT_STEAL' && payload.choice) {
    lms.splitStealPicks = { ...lms.splitStealPicks, [teamId]: payload.choice };
  } else if (payload.subType === 'DARE_VOTE' && payload.vote) {
    lms.dareVotes = { ...lms.dareVotes, [teamId]: payload.vote };
  } else if (payload.subType === 'DEATH_DICE') {
    if (!lms.teamDiceRolls[teamId]) {
      lms.teamDiceRolls = {
        ...lms.teamDiceRolls,
        [teamId]: Math.floor(Math.random() * 6) + 1,
      };
    }
  }
  return true;
}

export function resolveGhostPossessions(next: KrampusGameState, now: number) {
  const lms = next.round.lastMan;
  if (!lms) return;
  const active = getActiveTeamIds(next.teams);
  for (const ghostId of active) {
    const gState = lms.teamStates[ghostId];
    if (!gState.isGhost) continue;
    const victimId = active
      .filter((tid) => !lms.teamStates[tid].isGhost && gState.step >= lms.teamStates[tid].step)
      .sort((a, b) => lms.teamStates[a].step - lms.teamStates[b].step)[0];
    if (victimId) {
      const vState = lms.teamStates[victimId];
      const ghostStep = gState.step;
      const victimStep = vState.step;
      gState.isGhost = false;
      gState.hearts = Math.max(1, vState.hearts);
      gState.step = Math.max(ghostStep, victimStep);
      vState.isGhost = true;
      vState.hearts = 0;
      vState.step = Math.min(ghostStep, victimStep);
      vState.jetpacks = 0;
      pushLmsFeed(
        next,
        now,
        '👻',
        `วิญญาณ ${next.teams[ghostId].icon} ${next.teams[ghostId].name} พุ่งเข้าสิงร่าง ${next.teams[victimId].icon} ${next.teams[victimId].name} สลับชีวิตสำเร็จ!!`
      );
    }
  }
}

export function applyLmsUseJetpack(next: KrampusGameState, teamId: TeamId, now: number): boolean {
  const lms = next.round.lastMan;
  const ts = lms?.teamStates?.[teamId];
  const team = next.teams[teamId];
  if (
    !lms ||
    !ts ||
    ts.isGhost ||
    ts.jetpacks <= 0 ||
    (lms.phase !== 'PART2_CLUE' && lms.phase !== 'PART2_QUESTION' && lms.phase !== 'PART2_REVEAL')
  ) {
    return false;
  }
  ts.jetpacks -= 1;
  ts.step = Math.min(25, ts.step + 3);
  pushLmsFeed(
    next,
    now,
    '🚀',
    `${team.icon} ${team.name} จุดพลุไอพ่นพุ่งข้าม +3 ขั้น (ถึงขั้น ${ts.step})!`
  );
  if (ts.step >= 25 && !lms.winnerTeamId) {
    lms.winnerTeamId = teamId;
    lms.phase = 'CHAMPION';
  }
  return true;
}

export function applyLmsPart1TriviaReveal(next: KrampusGameState, now: number): boolean {
  const lms = next.round.lastMan;
  if (!lms) return false;
  const p1List = next.lastManPart1Questions || DEFAULT_LAST_MAN_PART1_QUESTIONS;
  const q = p1List[(lms.part1Round - 1) % p1List.length];
  const active = getActiveTeamIds(next.teams);
  const livingTeams = active.filter((tid) => !lms.teamStates[tid].isGhost);
  const correctLiving = livingTeams.filter(
    (tid) => String(next.submissions[tid]?.value || '') === q.correctKey
  );
  const wrongLiving = livingTeams.filter(
    (tid) => String(next.submissions[tid]?.value || '') !== q.correctKey
  );

  const soleSurvivor = correctLiving.length === 1;
  const reward = soleSurvivor ? 500 : 250;

  correctLiving.forEach((tid) => {
    next.teams[tid].coins += reward;
  });
  wrongLiving.forEach((tid) => {
    lms.teamStates[tid].inKillingFloor = true;
    next.teams[tid].isInKillingFloor = true;
  });

  const safeLiving = livingTeams.filter((tid) => !lms.teamStates[tid].inKillingFloor);
  if (wrongLiving.length === 1 && safeLiving.length >= 1) {
    lms.phase = 'PART1_MISERY_PULL';
    lms.miseryPullTeamId = wrongLiving[0];
    lms.miseryEndsAt = now + 10000;
    pushLmsFeed(
      next,
      now,
      '😈',
      `${next.teams[wrongLiving[0]].icon} ${next.teams[wrongLiving[0]].name} ตอบผิดทีมเดียว! มีสิทธิ์ลากเพื่อนตกนรก 1 ทีม (10 วิ)!`
    );
  } else {
    lms.phase = 'PART1_TRIVIA_REVEAL';
  }

  if (soleSurvivor) {
    pushLmsFeed(
      next,
      now,
      '👑',
      `${next.teams[correctLiving[0]].icon} ${next.teams[correctLiving[0]].name} รอดคนเดียวทั้งห้อง! รับโบนัส x2 (+500 ฿)`
    );
  }

  next.round.status = 'REVEALED';
  next.round.timerStartedAt = null;
  next.round.timerRemainingMs = 0;
  next.round.rewardsApplied = true;
  return true;
}

export function applyLmsGreedTax(next: KrampusGameState, now: number): boolean {
  const lms = next.round.lastMan;
  if (!lms) return false;
  const report: Array<{ teamId: TeamId; before: number; after: number; lost: number }> = [];
  TEAM_ORDER.forEach((tid) => {
    const before = next.teams[tid].coins;
    if (before > 1000) {
      const lost = Math.floor(before / 2);
      const after = before - lost;
      next.teams[tid].coins = after;
      report.push({ teamId: tid, before, after, lost });
    }
  });
  lms.greedTaxReport = report;
  lms.phase = 'PART1_GREED_TAX';
  next.round.title = 'ภาษีคนงกของ Krampus!';
  next.round.subtitle = 'ทีมที่มีเงินเกิน 1,000 ฿ ถูกหักเงินครึ่งหนึ่งทันที!';
  pushLmsFeed(
    next,
    now,
    '💸',
    report.length > 0
      ? `Krampus เก็บภาษีคนงก! ${report.map((r) => `${next.teams[r.teamId].name} -${r.lost} ฿`).join(', ')}`
      : 'ไม่มีทีมไหนถือเงินเกิน 1,000 ฿ — รอดภาษีคนงกทั้งหมด!'
  );
  return true;
}

export function applyLmsStartPart2Escape(next: KrampusGameState, now: number): boolean {
  const lms = next.round.lastMan || createInitialLastManState(next.teams);
  const active = getActiveTeamIds(next.teams);
  const allGhosts = active.every((tid) => lms.teamStates[tid].isGhost || lms.teamStates[tid].hearts <= 0);
  const startSteps: Partial<Record<TeamId, number>> = {};

  active.forEach((tid) => {
    const ts = lms.teamStates[tid];
    ts.inKillingFloor = false;
    ts.activeCurse = null;
    ts.mirrorShield = false;
    next.teams[tid].isInKillingFloor = false;
    if (allGhosts) {
      ts.isGhost = false;
      ts.hearts = 1;
      ts.step = 0;
    } else if (ts.isGhost || ts.hearts <= 0) {
      ts.isGhost = true;
      ts.hearts = 0;
      ts.step = 0;
    } else {
      const headStart = Math.min(3, Math.floor(next.teams[tid].coins / 400));
      ts.step = headStart;
    }
    startSteps[tid] = ts.step;
    next.teams[tid].coins = 0;
  });

  const p2List =
    next.lastManPart2Questions && next.lastManPart2Questions.length > 0
      ? next.lastManPart2Questions
      : DEFAULT_LAST_MAN_PART2_QUESTIONS;
  const q = p2List[0];

  lms.phase = 'PART2_CLUE';
  lms.part2QuestionIndex = 0;
  lms.krampusStep = 0;
  lms.winnerTeamId = null;
  lms.part2StartSteps = startSteps;
  next.round.lastMan = lms;
  next.submissions = {};
  next.round = {
    ...next.round,
    id: `lms-p2-q0-${now}`,
    inputMode: 'MODE_A_CHOICE',
    title: 'ช่วงที่ 2 • บันไดหนีตาย 25 ขั้น (The Final Escape)',
    subtitle: 'ขั้นตอนที่ 1: อ่านเบาะแสตั้งต้นก่อนเปิดคำถาม!',
    questionText: q.clueText,
    choiceCount: 3,
    choices: q.choices.map((c) => ({
      key: c.key,
      label: c.label,
      isCorrect: c.key === q.correctKey,
    })),
    correctChoices: [q.correctKey],
    durationSeconds: q.durationSeconds || 60,
    timerStartedAt: null,
    timerRemainingMs: null,
    status: 'IDLE',
    rewardsApplied: false,
    lastMan: lms,
  };
  return true;
}

export function applyLmsPart2Reveal(next: KrampusGameState, now: number): boolean {
  const lms = next.round.lastMan;
  if (!lms) return false;
  const p2List = next.lastManPart2Questions || DEFAULT_LAST_MAN_PART2_QUESTIONS;
  const q = p2List[lms.part2QuestionIndex % p2List.length];
  const active = getActiveTeamIds(next.teams);

  const correctTeams = active
    .filter((tid) => String(next.submissions[tid]?.value || '') === q.correctKey)
    .sort(
      (a, b) =>
        (next.submissions[a]?.submittedAt || Infinity) -
        (next.submissions[b]?.submittedAt || Infinity)
    );

  active.forEach((tid) => {
    const ts = lms.teamStates[tid];
    const sub = next.submissions[tid];
    const cRank = correctTeams.indexOf(tid);
    let delta = 0;
    if (cRank === 0) delta = 3;
    else if (cRank === 1) delta = 2;
    else if (cRank >= 2) delta = 1;
    else if (!sub) delta = -1;
    else delta = 0;

    let nextStep = Math.max(0, ts.step + delta);
    if (ts.isGhost) {
      nextStep = Math.min(24.5, nextStep);
    } else {
      nextStep = Math.min(25, nextStep);
    }
    ts.step = nextStep;
  });

  resolveGhostPossessions(next, now);

  lms.krampusStep = Math.min(25, lms.krampusStep + 1.5);
  active.forEach((tid) => {
    const ts = lms.teamStates[tid];
    if (!ts.isGhost && ts.step < 25 && lms.krampusStep >= ts.step) {
      ts.isGhost = true;
      ts.hearts = 0;
      ts.jetpacks = 0;
      pushLmsFeed(
        next,
        now,
        '💀',
        `Krampus ไล่ทัน ${next.teams[tid].icon} ${next.teams[tid].name} ที่ขั้น ${ts.step}! กลายเป็นวิญญาณทันที!`
      );
    }
    if (ts.isGhost && lms.krampusStep >= ts.step) {
      ts.step = Math.min(24.5, lms.krampusStep + 1);
    }
  });

  const champion = active
    .filter((tid) => !lms.teamStates[tid].isGhost && lms.teamStates[tid].step >= 25)
    .sort((a, b) => (next.submissions[a]?.submittedAt || 0) - (next.submissions[b]?.submittedAt || 0))[0];

  if (champion) {
    lms.winnerTeamId = champion;
    lms.phase = 'CHAMPION';
    pushLmsFeed(
      next,
      now,
      '🏆',
      `${next.teams[champion].icon} ${next.teams[champion].name} วิ่งทะลุประตูขั้นที่ 25 คว้าแชมป์ THE KRAMPUS EVE!!`
    );
  } else {
    lms.phase = 'PART2_REVEAL';
  }

  next.round.status = 'REVEALED';
  next.round.timerStartedAt = null;
  next.round.timerRemainingMs = 0;
  return true;
}
