export type TeamId = 'team1' | 'team2' | 'team3' | 'team4';

export type GameStage =
  | 'LOBBY'
  | 'WORLD_MAP'
  | 'POLL_MINE' // Game 1: The 8 Doors of Krampus (8 ประตูวัดใจครามปุส)
  | 'TIMEJINX'
  | 'QUIXORT'
  | 'TRIVIA_MURDER'
  | 'FINALE';

export type InputMode =
  | 'MODE_A_CHOICE' // Multiple Choice (4 to 8 choices: A - H)
  | 'MODE_B_YEAR'   // Number / Year Input (Numpad + ms Timestamp + Abs Diff)
  | 'MODE_C_BUZZER' // Buzzer / Reaction (Instant ms Queue 1-4)
  | 'MODE_D_SECRET'; // Wagering / Secret Number 1-10 / Quixort Bet / Cursed Finger

export type ModeDSubType =
  | 'UNIQUE_NUMBER_1_10' // Lowest or Highest Unique Number 1-10 (Trivia Murder Party)
  | 'COIN_WAGER'         // Secret Holy Coin Wager / Dark Auction
  | 'QUIXORT_BET'        // Bet Coins + Predict PASS or FAIL on Active Team
  | 'CURSED_CHALICE';    // Secretly pick 1 of 4 Cursed Vessels / Finger Trap

/**
 * Sub-round phases for Game 1: "The 8 Doors of Krampus (8 ประตูวัดใจครามปุส)"
 * - SUB1_SURVIVAL: ด่านย่อยที่ 1 เปิดทางรอด (หาอันดับ 1-3: ถูก +300🪙, ผิด -1🛡️)
 * - SUB2_AUCTION: ด่านย่อยที่ 2 (Phase 1) ประมูลชิงสิทธิ์เปิดประตู (บิดทีละ 50🪙, ล็อกผู้ชนะรอบ 2.1 ในรอบ 2.2)
 * - SUB2_DOOR_AND_BET: ด่านย่อยที่ 2 (Phase 2) ผู้ชนะประมูลเลือกประตู 1 บาน + อีก 3 ทีมแทงข้าง (รอด/พัง)
 * - SUB3_POLARITY: ด่านย่อยที่ 3 วัดใจขั้วตรงข้าม (เลือก 2 ประตู: อันดับ #1 และ อันดับ #8)
 */
export type EightDoorsSubRound =
  | 'SUB1_SURVIVAL'
  | 'SUB2_AUCTION'
  | 'SUB2_DOOR_AND_BET'
  | 'SUB3_POLARITY';

export type RoundStatus = 'IDLE' | 'ACTIVE' | 'LOCKED' | 'REVEALED';

export interface Team {
  id: TeamId;
  number: 1 | 2 | 3 | 4;
  name: string;
  motto: string;
  color: string;             // hex or tailwind accent identifier
  icon: string;              // emoji/symbol
  coins: number;             // Holy Coins / Elf Gold (starts at 1,000)
  shields: number;           // เกราะเด็กดี (Nice Shields, starts at 3, 0 = Naughty List)
  candles: number;           // Legacy alias kept in sync with shields
  isInKillingFloor: boolean; // Trivia Murder Party penalty state
  isRegistered?: boolean;    // Sub-GM registration status for Lobby
}

export interface ChoiceOption {
  key: string;         // 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H'
  label: string;       // Option text
  rank?: number;       // 8 Doors rank (1 = #1 most popular ... 8 = #8 least popular)
  votes?: number;      // Optional survey percentage or vote count
  isCorrect?: boolean; // Whether choosing this is correct / safe
  isTrap?: boolean;    // Whether choosing this triggers Krampus penalty
  isOpened?: boolean;  // For The 8 Doors of Krampus: whether this door is revealed on the persistent board
}

export interface RoundConfig {
  id: string;
  presetId?: string;
  gameStage: GameStage;
  inputMode: InputMode;
  modeDSubType?: ModeDSubType;

  // Game 1: THE DOORS OF DOOM state
  eightDoorsSubRound?: EightDoorsSubRound;
  auctionIteration?: 1 | 2;               // รอบประมูล 2.1 หรือ 2.2
  subRound2LockedTeamId?: TeamId | null;  // ทีมที่ชนะประมูลรอบ 2.1 (ถูกล็อกในรอบ 2.2)
  auctionWinnerTeamId?: TeamId | null;    // ทีมที่ชนะการประมูลในรอบปัจจุบัน
  auctionWinningBid?: number;             // ยอดบิดที่ชนะประมูลในรอบปัจจุบัน
  lastOpenedDoorKey?: string | null;      // ประตูที่ทีมชนะประมูลเพิ่งเลือกในด่านย่อยที่ 2
  safeRankMin?: number;                   // อันดับต่ำสุดของโซนปลอดภัย (Auto-suggest & editable)
  safeRankMax?: number;                   // อันดับสูงสุดของโซนปลอดภัย (Auto-suggest & editable)
  snakeDraftOrder?: TeamId[];             // ลำดับคิว Snake Draft (ด่านย่อยที่ 1)
  snakeDraftIndex?: number;               // index คิวปัจจุบันใน snakeDraftOrder
  snakeDraftPicks?: Array<{
    teamId: TeamId;
    doorKey: string;
    rank: number;
    isSafe: boolean;
  }>;
  cowardFreePick?: boolean;               // true เมื่อประมูล 0 ฿ (Coward's Tax): เปิดฟรีแต่ไม่ได้เงินรางวัล

  title: string;
  subtitle: string;
  questionText: string;
  choiceCount: number; // 4 to 12
  choices: ChoiceOption[];
  correctChoices: string[]; // Keys like ['A', 'C']
  trapChoices: string[];    // Keys that deduct coins/shields
  targetYear: number;       // For Mode B (Timejinx)
  yearPenaltyPerDiff: number; // Coins lost per 1 year off (e.g. 15)
  yearFastestBonus: number;   // Bonus coins for closest/fastest
  activeTeamId?: TeamId;      // For Quixort live action team on stage
  quixortRule?: string;       // e.g. "เรียงจากเกิดก่อน -> เกิดหลัง"
  quixortItems?: string[];    // Items to sort
  uniqueRule?: 'LOWEST' | 'HIGHEST'; // For Mode D Unique Number 1-10
  wagerMultiplier?: number;   // e.g. 2x payout on win
  rewardCoins: number;        // Default reward for correct choice
  penaltyCoins: number;       // Default penalty for wrong choice
  durationSeconds: number;
  timerStartedAt: number | null;
  timerRemainingMs: number | null; // Used when paused or locked
  status: RoundStatus;
  rewardsApplied: boolean;
}

export interface TeamSubmission {
  teamId: TeamId;
  value: string | number;
  secondaryValue?: string; // e.g. 'PASS'|'FAIL' for Quixort, 'SAFE'|'FAIL' for Sub2 Side Bet, or Rank #8 door key for Sub3
  submittedAt: number;
  elapsedMs: number;
  locked: boolean;
}

export interface BuzzerEntry {
  teamId: TeamId;
  pressedAt: number;
  deltaMs: number;           // ms after #1 team
  elapsedFromStartMs: number;
  rank: number;              // 1, 2, 3, 4
}

export interface CoinTransaction {
  id: string;
  timestamp: number;
  teamId: TeamId | 'ALL';
  delta: number;
  reason: string;
  prevBalances: Record<TeamId, number>;
  prevShields?: Record<TeamId, number>;
}

export interface QuestionPreset {
  id: string;
  gameStage: GameStage;
  inputMode: InputMode;
  modeDSubType?: ModeDSubType;
  eightDoorsSubRound?: EightDoorsSubRound;
  title: string;
  subtitle: string;
  questionText: string;
  choiceCount?: number;
  choices?: ChoiceOption[];
  correctChoices?: string[];
  trapChoices?: string[];
  targetYear?: number;
  yearPenaltyPerDiff?: number;
  yearFastestBonus?: number;
  activeTeamId?: TeamId;
  quixortRule?: string;
  quixortItems?: string[];
  uniqueRule?: 'LOWEST' | 'HIGHEST';
  safeRankMin?: number;
  safeRankMax?: number;
  rewardCoins?: number;
  penaltyCoins?: number;
  durationSeconds: number;
}

export interface KrampusGameState {
  version: number;
  serverTimestamp: number;
  roomCode: string;
  roomLocked?: boolean;
  soundEnabled: boolean;
  showLeaderboardOverlay: boolean;
  showQrOverlay?: boolean;
  krampusAlertMessage: string | null;
  teams: Record<TeamId, Team>;
  round: RoundConfig;
  submissions: Partial<Record<TeamId, TeamSubmission>>;
  buzzerQueue: BuzzerEntry[];
  transactions: CoinTransaction[];
  presets: QuestionPreset[];
}
