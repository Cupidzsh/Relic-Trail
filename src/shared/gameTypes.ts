export type RealmId = 'jungle' | 'desert' | 'dragon' | 'neon';
export type CrystalColor = 'ruby' | 'sapphire' | 'emerald' | 'topaz';
export type PowerupType = 'leap' | 'swap' | 'boost' | 'shield';
export type GameMode = 'ranked' | 'custom' | 'campaign';
export type RaceLane = 0 | 1 | 2; // 0 = Left, 1 = Center, 2 = Right

export const MIN_RACE_DISTANCE = 1000;
export const MAX_RACE_DISTANCE = 10000;
export const DEFAULT_RACE_DISTANCE = 4000;
export const STANDARD_MULTIPLAYER_SPEED = 48;

export type PickupKind =
  | 'coin'         // Gold Coin: Currency picked up on the track
  | 'turbo'        // Green: Advancement surge
  | 'tailwind'     // Green: Sustained speed boost
  | 'nitro_cache'  // Green: Grants tactical power-up charge(s)
  | 'heart'        // Blue: Life-enhancing (+1 life / shield)
  | 'life_drain'   // Red: Limits life (-1 life & slow)
  | 'reverse'      // Red: Reverse push backward
  | 'serpent'      // Red: Heavy ambush drag-back
  | 'stasis'       // Red: Slow / stun
  | 'mystery';     // Gamble crate

export type VisualVariant =
  | 'gold_coin'
  | 'bridge_boost'
  | 'waterfall_heart'
  | 'canopy_wind'
  | 'jungle_cache'
  | 'forest_pit'
  | 'waterfall_riptide'
  | 'jungle_serpent'
  | 'vine_snare'
  | 'pyramid_boost'
  | 'oasis_heart'
  | 'sand_wind'
  | 'scarab_cache'
  | 'scorpion'
  | 'mummy'
  | 'quicksand'
  | 'sand_serpent'
  | 'dragon_egg'
  | 'ember_heart'
  | 'thermal_wind'
  | 'hoard_cache'
  | 'lava_fissure'
  | 'fire_jet'
  | 'swooping_dragon'
  | 'obsidian_stasis'
  | 'skyway_boost'
  | 'nano_heart'
  | 'maglev_wind'
  | 'drone_cache'
  | 'patrol_drone'
  | 'road_bump'
  | 'emp_lock'
  | 'skyfall_drop'
  | 'mystery_relic';

export interface TrackPickup {
  id: string;
  distance: number;
  lane: RaceLane;
  kind: PickupKind;
  visualVariant: VisualVariant;
  isBeneficial: boolean;
  label: string;
  consumedBy?: string[];
  passedBy?: string[];
}

export interface RealmDefinition {
  id: RealmId;
  name: string;
  subtitle: string;
  problemTitle: string;
  problemSummary: string;
  perkTitle: string;
  perkSummary: string;
  accentHex: string;
  boardTintClass: string;
}

export type TournamentTaskType =
  | 'collect_boosts'
  | 'collect_hearts'
  | 'collect_caches'
  | 'collect_perks'
  | 'clear_obstacles'
  | 'distance_sprint';

export interface TournamentTask {
  type: TournamentTaskType;
  targetCount: number;
  title: string;
  description: string;
}

export interface CampaignLevel {
  level: number;
  title: string;
  imageCaption: string;
  rulesSummary: string;
  task: TournamentTask;
  targetDistance: number;
  baseSpeed: number;
  hazardDensity: number;
  perkSizePx: number;
  perkPowerMultiplier: number;
  rivalCount: number;
  hazardIntensity: 'Cadet' | 'Standard' | 'Elevated' | 'Severe' | 'Apex';
  rewardXp: number;
  rewardGold: number;
  unlockReward: string;
  unlockSkinId?: string;
}

export interface CrystalSkin {
  id: string;
  name: string;
  description: string;
  unlockRequirement: string;
  ringStyle: string;
}

export interface PlayerPowerups {
  leap: number;
  swap: number;
  boost: number;
  shield: number;
}

export interface PowerupActionNotice {
  id: string;
  powerup?: PowerupType;
  action: 'used' | 'picked_up' | 'saved' | 'won';
  delta: number;
  remaining: number;
  message: string;
  timestamp: number;
}

export interface MatchPlayer {
  id: string;
  name: string;
  crystalColor: CrystalColor;
  skinId: string;
  distance: number;
  lane: RaceLane;
  speed: number;
  bootsBonusMps: number;
  lives: number;
  maxLives: number;
  boostTicks: number;
  slowTicks: number;
  reverseTicks: number;
  leapTicks: number;
  jumpTicks: number;
  hasShield: boolean;
  powerups: PlayerPowerups;
  powerupsUsed: PlayerPowerups;
  powerupsGained: PlayerPowerups;
  lastPowerupNotice?: PowerupActionNotice;
  isBot: boolean;
  connected: boolean;
  perksCollected: number;
  boostsCollected: number;
  heartsCollected: number;
  cachesCollected: number;
  obstaclesCleared: number;
  coinsCollected: number;
  hazardsHit: number;
  swapsMade: number;
  finishTimeMs: number | null;
  botSteerCooldownTicks?: number;
}

export interface MatchLogEntry {
  id: string;
  timestamp: number;
  playerId: string;
  playerName: string;
  crystalColor: CrystalColor;
  message: string;
  tone: 'neutral' | 'hazard' | 'perk' | 'powerup' | 'victory';
}

export interface ChatMessage {
  id: string;
  channel: 'global' | string;
  senderId: string;
  senderName: string;
  crystalColor: CrystalColor;
  playerRank: string;
  text: string;
  timestamp: number;
}

export interface MatchState {
  roomId: string;
  roomCode: string;
  mode: GameMode;
  realm: RealmId;
  campaignLevel: number;
  targetDistance: number;
  perkSizePx: number;
  task?: TournamentTask;
  rulesSummary?: string;
  outcomeReason?: string;
  status: 'waiting' | 'countdown' | 'playing' | 'finished';
  countdownMs?: number;
  hostId: string;
  players: MatchPlayer[];
  pickups: TrackPickup[];
  elapsedMs: number;
  speedMultiplier: number;
  winnerId: string | null;
  logs: MatchLogEntry[];
  createdAt: number;
}

export interface MarketMission {
  id: string;
  title: string;
  description: string;
  costGold: number;
  speedBoostLevels: number;
  xpGain: number;
  ratingGain: number;
  bonusPerks?: Partial<PlayerPowerups>;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  crystalColor: CrystalColor;
  xp: number;
  level: number;
  coins: number;
  highestCampaignLevel: number;
  unlockedRealms: RealmId[];
  unlockedSkins: string[];
  powerupInventory: PlayerPowerups;
  speedUpgradeLevel?: number;
  purchasedMissions?: string[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type SeasonalTier =
  | 'Bronze Crystal'
  | 'Silver Facet'
  | 'Gold Relic'
  | 'Emerald Paragon'
  | 'Obsidian Grandmaster';

export interface LeaderboardEntry {
  uid: string;
  displayName: string;
  crystalColor: CrystalColor;
  rating: number;
  tier: SeasonalTier;
  wins: number;
  gamesPlayed: number;
  level: number;
  roundsCompleted?: number;
  playerRank?: string;
  seasonId: string;
  updatedAt?: unknown;
}

export interface MatchRecord {
  matchId: string;
  uid: string;
  realm: RealmId;
  mode: GameMode;
  placement: number;
  ratingDelta: number;
  xpEarned: number;
  coinsEarned: number;
  createdAt?: unknown;
}

export interface RoundTournamentEntry {
  entryId: string;
  uid: string;
  displayName: string;
  crystalColor: CrystalColor;
  roundNumber: number;
  stagesCleared: number;
  completedRound: boolean;
  totalClearTimeMs: number;
  tournamentWindowId: string;
  updatedAt?: unknown;
}

export interface GlobalTournamentSchedule {
  windowId: string;
  title: string;
  startsAtMs: number;
  endsAtMs: number;
  remainingMs: number;
}

export function getActiveGlobalTournamentSchedule(nowMs = Date.now()): GlobalTournamentSchedule {
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const cycleIndex = Math.floor(nowMs / weekMs);
  const startsAtMs = cycleIndex * weekMs;
  const endsAtMs = startsAtMs + weekMs;
  return {
    windowId: `world-cup-${cycleIndex}`,
    title: `World Round Cup #${(cycleIndex % 100) + 1}`,
    startsAtMs,
    endsAtMs,
    remainingMs: Math.max(0, endsAtMs - nowMs),
  };
}

export interface RoundRankInfo {
  roundsRequired: number;
  title: string;
  badgeCode: string;
  bootsBonusMps: number;
  perksSummary: string;
}

export const ROUND_RANK_TIERS: RoundRankInfo[] = [
  {
    roundsRequired: 0,
    title: 'Trail Initiate',
    badgeCode: 'R0',
    bootsBonusMps: 0,
    perksSummary: 'Starter Kit · Clear Round 1 (Lv 1–10) to unlock Swift Boots & Jetpack Pack',
  },
  {
    roundsRequired: 1,
    title: 'Facet Pathfinder',
    badgeCode: 'R1',
    bootsBonusMps: 2.5,
    perksSummary: 'Swift Boots I (+2.5 m/s) · +2 Aegis Shields · +2 Jetpacks · +2 Phase Leaps',
  },
  {
    roundsRequired: 2,
    title: 'Relic Vanguard',
    badgeCode: 'R2',
    bootsBonusMps: 5.0,
    perksSummary: 'Swift Boots II (+5.0 m/s) · +2 Aegis Shields · +2 Jetpacks · +2 Phase Leaps',
  },
  {
    roundsRequired: 3,
    title: 'Crystal Strider',
    badgeCode: 'R3',
    bootsBonusMps: 7.5,
    perksSummary: 'Swift Boots III (+7.5 m/s) · +2 Aegis Shields · +2 Jetpacks · +2 Phase Leaps',
  },
  {
    roundsRequired: 4,
    title: 'Prism Warden',
    badgeCode: 'R4',
    bootsBonusMps: 10.0,
    perksSummary: 'Swift Boots IV (+10.0 m/s) · +2 Aegis Shields · +2 Jetpacks · +2 Phase Leaps',
  },
  {
    roundsRequired: 5,
    title: 'Apex Conqueror',
    badgeCode: 'R5',
    bootsBonusMps: 12.5,
    perksSummary: 'Swift Boots V (+12.5 m/s) · +2 Aegis Shields · +2 Jetpacks · +2 Phase Leaps',
  },
  {
    roundsRequired: 6,
    title: 'Eternal Sovereign',
    badgeCode: 'R6+',
    bootsBonusMps: 15.0,
    perksSummary: 'Swift Boots Max (+15+ m/s) · Infinite Round Ascendancy',
  },
];

export function getRoundsCompleted(highestCampaignLevel: number): number {
  return Math.floor(Math.max(0, highestCampaignLevel - 1) / 10);
}

export function getBootsBonusMps(roundsCompleted: number, speedUpgradeLevel = 0): number {
  const roundBonus = Math.min(25, Math.max(0, roundsCompleted) * 2.5);
  const marketBonus = Math.min(25, Math.max(0, speedUpgradeLevel) * 2.5);
  return roundBonus + marketBonus;
}

function toRoman(num: number): string {
  const table: [number, string][] = [
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I'],
  ];
  let rem = Math.max(1, num);
  let out = '';
  for (const [val, sym] of table) {
    while (rem >= val) {
      out += sym;
      rem -= val;
    }
  }
  return out;
}

export function computeRoundRank(roundsCompleted: number): RoundRankInfo {
  const safeRounds = Math.max(0, Math.floor(roundsCompleted));
  if (safeRounds < ROUND_RANK_TIERS.length) {
    return ROUND_RANK_TIERS[safeRounds];
  }
  const tierNum = safeRounds - 5;
  return {
    roundsRequired: safeRounds,
    title: tierNum <= 1 ? 'Eternal Sovereign' : `Eternal Sovereign ${toRoman(tierNum)}`,
    badgeCode: `R${safeRounds}`,
    bootsBonusMps: getBootsBonusMps(safeRounds),
    perksSummary: `Swift Boots +${getBootsBonusMps(safeRounds).toFixed(1)} m/s · Infinite Round Mastery`,
  };
}

export const CURRENT_SEASON_ID = 'season-4';
export const CURRENT_SEASON_NAME = 'Season 4 · Serpent & Skyrail';

export function computeTierFromRating(rating: number): SeasonalTier {
  if (rating >= 2200) return 'Obsidian Grandmaster';
  if (rating >= 1800) return 'Emerald Paragon';
  if (rating >= 1400) return 'Gold Relic';
  if (rating >= 1000) return 'Silver Facet';
  return 'Bronze Crystal';
}

export function computeLevelFromXp(xp: number): number {
  return Math.min(50, Math.floor(Math.sqrt(xp / 100)) + 1);
}
