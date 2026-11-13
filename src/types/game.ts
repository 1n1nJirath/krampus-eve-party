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

export type ChronoSubRound =
  | 'CHRONO_SUB1_CLASSIC'
  | 'CHRONO_SUB2_TRAP'
  | 'CHRONO_SUB3_FAST_FINGER';

export type YearUnit = 'AD' | 'BE';

export type ToyFactoryPhase =
  | 'TOPIC_SELECT'
  | 'PREP_10S'
  | 'ACTION'
  | 'SHUFFLE_BUFFER_10S'
  | 'REVEAL_JUDGE';

// ==========================================
// Game 4: THE LAST MAN STANDING (ลานประหารคริสต์มาส)
// ==========================================
export type LastManPhase =
  | 'KRAMPUS_TWIST'
  | 'PART1_TRIVIA'
  | 'PART1_TRIVIA_REVEAL'
  | 'PART1_MISERY_PULL'
  | 'PART1_BLACK_MARKET'
  | 'PART1_MINIGAME'
  | 'PART1_MINIGAME_REVEAL'
  | 'PART1_GREED_TAX'
  | 'PART2_CLUE'
  | 'PART2_QUESTION'
  | 'PART2_REVEAL'
  | 'CHAMPION';

export type LastManShopItemId =
  | 'CURSE_BOX'
  | 'SNIPER_SHOT'
  | 'MIRROR_SHIELD'
  | 'HELL_CHAINS'
  | 'EXECUTIONER_BRIBE'
  | 'REVIVE_POTION'
  | 'JETPACK';

export type LastManCurseId =
  | 'BLIND_GM'
  | 'MUTE_TEAM'
  | 'FOREHEAD_PHONE'
  | 'PA_THONG_KO'
  | 'FREEZE_STATUE';

export interface LastManPart1Question {
  id: string;
  questionText: string;
  imageUrl?: string;
  choices: Array<{ key: 'A' | 'B' | 'C' | 'D'; label: string }>;
  correctKey: 'A' | 'B' | 'C' | 'D';
}

export interface LastManPart2Question {
  id: string;
  clueText: string;
  imageUrl?: string;
  questionText: string;
  choices: Array<{ key: 'A' | 'B' | 'C'; label: string }>;
  correctKey: 'A' | 'B' | 'C';
  durationSeconds: number;
}

export interface LastManTeamState {
  hearts: number;          // 4 max (3 if cursed from Game 3)
  isGhost: boolean;        // true when hearts <= 0
  inKillingFloor: boolean; // true when dropped to Killing Floor
  mirrorShield: boolean;   // active for current round
  activeCurse: LastManCurseId | null;
  jetpacks: number;        // inventory for Part 2 (+3 steps)
  step: number;            // 0..25 in Part 2
}

export interface LastManKillFeedEntry {
  id: string;
  timestamp: number;
  icon: string;
  message: string;
}

export interface LastManStandingState {
  phase: LastManPhase;
  part1Round: number; // 1..4
  part2QuestionIndex: number; // 0-based
  krampusStep: number; // starts 0, +1.5 per Part 2 question
  winnerTeamId: TeamId | null;
  miseryPullTeamId: TeamId | null;
  miseryEndsAt: number | null;
  roundStock: Record<LastManShopItemId, number>;
  gameStock: {
    HELL_CHAINS: number;
    JETPACK: number;
  };
  killFeed: LastManKillFeedEntry[];
  // Minigame state (Part 1)
  poisonedChalices: number[]; // 1..4
  chalicePicks: Partial<Record<TeamId, number>>;
  splitStealPicks: Partial<Record<TeamId, 'SPLIT' | 'STEAL'>>;
  dareVotes: Partial<Record<TeamId, 'SPARE' | 'EXECUTE'>>;
  krampusDiceRoll: number | null;
  teamDiceRolls: Partial<Record<TeamId, number>>;
  greedTaxReport: Array<{ teamId: TeamId; before: number; after: number; lost: number }>;
  teamStates: Record<TeamId, LastManTeamState>;
  part2StartSteps?: Partial<Record<TeamId, number>>;
}

export interface ToyFactoryItem {
  id: string;
  label: string;
  realValue: string;
  isMystery?: boolean;
  mysteryClue?: string;
}

export interface ToyFactoryDataset {
  id: string;
  title: string;
  direction: string;
  items: ToyFactoryItem[];
}

export interface ToyFactoryAssignment {
  memberName: string;
  itemId: string;
  label: string;
  realValue: string;
  isMystery: boolean;
  mysteryClue?: string;
  changedOnShuffle?: boolean;
}

export interface ToyFactoryRevealSlot {
  index: number;
  itemId: string;
  holderName: string;
  label: string;
  realValue: string;
  isMystery: boolean;
  mysteryClue?: string;
  revealed: boolean;
  verdict?: 'CORRECT' | 'WRONG';
}

export interface ToyFactoryState {
  roundIndex: number; // 1..4
  pairings: Array<{ sortingTeamId: TeamId; holdingTeamId: TeamId }>;
  usedDatasetIds: string[];
  selectedDatasetId: string | null;
  phase: ToyFactoryPhase;
  prepEndsAt: number | null;
  bufferEndsAt: number | null;
  assignments: ToyFactoryAssignment[];
  shuffleUsedByTeams: TeamId[];
  shuffleUsedThisRound: boolean;
  revealSlots: ToyFactoryRevealSlot[];
  mysterySpotlightActive?: boolean;
}

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
  roster?: string[];         // 4-10 member nicknames for Game 3 (Toy Factory Chaos)
  toyFactoryCurse?: boolean; // Curse from Game 3: -1 heart in Game 4
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
  targetYear: number;       // For Mode B (THE CHRONO CRUSH)
  yearUnit?: YearUnit;      // 'AD' (ค.ศ.) or 'BE' (พ.ศ.)
  yearMin?: number;         // Min Year bound for slider / board
  yearMax?: number;         // Max Year bound for slider / board
  chronoSubRound?: ChronoSubRound;
  chronoPhase?: 'TRAP_PLACEMENT' | 'YEAR_GUESS';
  chronoTrapsPlaced?: Partial<Record<TeamId, Partial<Record<TeamId, number>>>>;
  chronoShields?: Partial<Record<TeamId, number>>;
  chronoQuotas?: Partial<Record<TeamId, number>>;
  chronoFastFingerClaims?: Record<string, TeamId>;
  toyFactory?: ToyFactoryState;
  lastMan?: LastManStandingState;
  yearPenaltyPerDiff: number; // Coins lost per 1 year off (e.g. 50 or 150)
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
  yearUnit?: YearUnit;
  yearMin?: number;
  yearMax?: number;
  chronoSubRound?: ChronoSubRound;
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
  toyFactoryDatasets?: ToyFactoryDataset[];
  lastManPart1Questions?: LastManPart1Question[];
  lastManPart2Questions?: LastManPart2Question[];
}
