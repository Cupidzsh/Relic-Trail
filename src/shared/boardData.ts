import {
  CampaignLevel,
  CrystalColor,
  CrystalSkin,
  MarketMission,
  PickupKind,
  PowerupType,
  RaceLane,
  RealmDefinition,
  RealmId,
  TournamentTaskType,
  TrackPickup,
  VisualVariant,
} from './gameTypes.ts';

export const CRYSTAL_PALETTE: Record<
  CrystalColor,
  { name: string; hex: string; lightHex: string; darkHex: string; textClass: string; bgClass: string }
> = {
  ruby: {
    name: 'Ruby',
    hex: '#EF4444',
    lightHex: '#FCA5A5',
    darkHex: '#991B1B',
    textClass: 'text-red-400',
    bgClass: 'bg-red-500',
  },
  sapphire: {
    name: 'Sapphire',
    hex: '#3B82F6',
    lightHex: '#93C5FD',
    darkHex: '#1E40AF',
    textClass: 'text-blue-400',
    bgClass: 'bg-blue-500',
  },
  emerald: {
    name: 'Emerald',
    hex: '#10B981',
    lightHex: '#6EE7B7',
    darkHex: '#065F46',
    textClass: 'text-emerald-400',
    bgClass: 'bg-emerald-500',
  },
  topaz: {
    name: 'Topaz',
    hex: '#F59E0B',
    lightHex: '#FCD34D',
    darkHex: '#92400E',
    textClass: 'text-amber-400',
    bgClass: 'bg-amber-500',
  },
};

export const POWERUP_INFO: Record<
  PowerupType,
  { name: string; shortDesc: string; cost: number }
> = {
  leap: {
    name: 'Phase Leap',
    shortDesc: 'Hurdle cleanly over red hazards for 4.2 seconds.',
    cost: 60,
  },
  swap: {
    name: 'Slipstream Swap',
    shortDesc: 'Swap track distance with the unshielded runner ahead of you.',
    cost: 90,
  },
  boost: {
    name: 'Jetpack Thruster',
    shortDesc: 'Ignites a forward jetpack dash and top sprint speed for 3.5 seconds.',
    cost: 80,
  },
  shield: {
    name: 'Aegis Shield',
    shortDesc: 'Blocks the next red hazard hit or rival swap.',
    cost: 75,
  },
};

export const MARKET_MISSIONS: MarketMission[] = [
  {
    id: 'mission_stride_1',
    title: 'Turbo Stride Drill I',
    description: 'Upgrade leg cadence (+2.5 m/s permanent sprint speed) and earn +120 XP & +25 Season RP.',
    costGold: 120,
    speedBoostLevels: 1,
    xpGain: 120,
    ratingGain: 25,
    bonusPerks: { leap: 1 },
  },
  {
    id: 'mission_rank_vanguard',
    title: 'Vanguard Qualifier Contract',
    description: 'Complete qualifier sprint drill: +2.5 m/s permanent speed, +45 Season RP, +220 XP, +1 Shield & +1 Jetpack.',
    costGold: 220,
    speedBoostLevels: 1,
    xpGain: 220,
    ratingGain: 45,
    bonusPerks: { shield: 1, boost: 1 },
  },
  {
    id: 'mission_skyrail_overdrive',
    title: 'Skyrail Overdrive Mastery',
    description: 'Master high-velocity rail running: +5.0 m/s permanent speed, +70 Season RP, +350 XP, +2 Phase Leaps.',
    costGold: 380,
    speedBoostLevels: 2,
    xpGain: 350,
    ratingGain: 70,
    bonusPerks: { leap: 2, swap: 1 },
  },
  {
    id: 'mission_apex_crown',
    title: 'Apex Champion Sponsorship',
    description: 'Elite runner rank contract: +5.0 m/s permanent speed, +110 Season RP, +500 XP, +2 Shields & +2 Jetpacks.',
    costGold: 550,
    speedBoostLevels: 2,
    xpGain: 500,
    ratingGain: 110,
    bonusPerks: { shield: 2, boost: 2 },
  },
];

export const CRYSTAL_SKINS: CrystalSkin[] = [
  {
    id: 'classic_facet',
    name: 'Classic Facet',
    description: 'Precision-cut expedition runner core.',
    unlockRequirement: 'Starter Issue',
    ringStyle: 'ring-white/30',
  },
  {
    id: 'prismatic_halo',
    name: 'Canopy Prism',
    description: 'Vine-etched jade refraction ring.',
    unlockRequirement: 'Clear Tournament Level 3',
    ringStyle: 'ring-emerald-300',
  },
  {
    id: 'sunstone_core',
    name: 'Sunstone Core',
    description: 'Solar-forged desert relic flare.',
    unlockRequirement: 'Clear Tournament Level 6',
    ringStyle: 'ring-amber-300',
  },
  {
    id: 'ember_crown',
    name: 'Ember Crown',
    description: 'Obsidian-rimmed molten dragon aura.',
    unlockRequirement: 'Clear Tournament Level 9',
    ringStyle: 'ring-orange-400',
  },
  {
    id: 'quantum_prism',
    name: 'Quantum Prism',
    description: 'Skyfall polarized lattice aura.',
    unlockRequirement: 'Clear Tournament Level 12',
    ringStyle: 'ring-cyan-300',
  },
];

// All 4 themes carry identical baseline difficulty; difficulty is governed by Level & Route Distance
export const REALMS: Record<RealmId, RealmDefinition> = {
  jungle: {
    id: 'jungle',
    name: 'Jade Canopy Ruins',
    subtitle: 'Dense rainforest trails, waterfalls, suspension bridges & deep ravine pits',
    problemTitle: 'Forest Pits & Viper Traps',
    problemSummary: 'Dodge deep pits, waterfall riptides, and jungle vipers across the trail.',
    perkTitle: 'Bridge Surges & Mist Springs',
    perkSummary: 'Wooden rope bridges boost forward; waterfall springs restore lives.',
    accentHex: '#10B981',
    boardTintClass: 'from-emerald-950/80 to-slate-950',
  },
  desert: {
    id: 'desert',
    name: 'Sunken Scarab Dunes',
    subtitle: 'Sunlit sand dunes, ancient pyramids, prowling scorpions & tomb mummies',
    problemTitle: 'Scorpions, Mummies & Quicksand',
    problemSummary: 'Avoid scorpion stings, mummy curses, and reverse quicksand traps.',
    perkTitle: 'Pyramid Shrines & Oases',
    perkSummary: 'Sacred pyramids propel you forward while desert oases restore lives.',
    accentHex: '#F59E0B',
    boardTintClass: 'from-amber-950/75 to-slate-950',
  },
  dragon: {
    id: 'dragon',
    name: 'Obsidian Dragon Vault',
    subtitle: 'Volcanic mountains, molten lava rivers, fire vents, dragon eggs & dragons',
    problemTitle: 'Lava Rivers, Fire & Dragons',
    problemSummary: 'Evade molten fissures, fire blasts, and swooping dragons.',
    perkTitle: 'Dragon Eggs & Ember Hearts',
    perkSummary: 'Collect Dragon Eggs for forward surges and Ember Hearts for life recovery.',
    accentHex: '#EF4444',
    boardTintClass: 'from-red-950/75 to-slate-950',
  },
  neon: {
    id: 'neon',
    name: 'Hyperion Skyfall',
    subtitle: 'Futuristic road networks, skyscrapers, patrol drones & cyber road bumps',
    problemTitle: 'Patrol Drones & Road Bumps',
    problemSummary: 'Weave past security drones, laser speed bumps, and EMP locks.',
    perkTitle: 'Skyway Hyper-Lanes & Nano Repair',
    perkSummary: 'Hit Maglev boost pads and Nano Repair kits to maintain peak velocity.',
    accentHex: '#06B6D4',
    boardTintClass: 'from-cyan-950/75 to-slate-950',
  },
};

// Single-Player Tournament Levels 1-12:
// Higher levels = faster speed, more obstacles, longer track, smaller perk icons, MORE ADVANCED perks!
export const CAMPAIGN_LEVELS: CampaignLevel[] = [
  {
    level: 1,
    title: 'Trial 01 · Boost Qualifier',
    imageCaption: 'Boost Trial Artwork · Sprint across green speed pads to qualify',
    rulesSummary: '3 Lives Limit (0 = Restart) · Collect 5 green boosts before 1,600m · Grab Gold Coins on the rails.',
    task: {
      type: 'collect_boosts',
      targetCount: 5,
      title: 'Pick Up 5 Boosts',
      description: 'Collect 5 green boost perks before the 1,600m mark without losing all 3 lives.',
    },
    targetDistance: 1600,
    baseSpeed: 38,
    hazardDensity: 0.78,
    perkSizePx: 46,
    perkPowerMultiplier: 1.0,
    rivalCount: 1,
    hazardIntensity: 'Cadet',
    rewardXp: 110,
    rewardGold: 90,
    unlockReward: 'Unlocks Level 2 · Standard Perks',
  },
  {
    level: 2,
    title: 'Trial 02 · Distance Dash',
    imageCaption: 'Finish Arch Sprint · Beat your rival across the 2,000m finish line',
    rulesSummary: '3 Lives Limit · Cross the 2,000m finish arch in 1st place · Jump (Space) or steer around red traps.',
    task: {
      type: 'distance_sprint',
      targetCount: 2000,
      title: 'Cover 2,000m Trail',
      description: 'Cross the 2,000m finish line first while keeping at least 1 life remaining.',
    },
    targetDistance: 2000,
    baseSpeed: 42,
    hazardDensity: 0.88,
    perkSizePx: 44,
    perkPowerMultiplier: 1.1,
    rivalCount: 1,
    hazardIntensity: 'Cadet',
    rewardXp: 140,
    rewardGold: 110,
    unlockReward: 'Unlocks Level 3 · +10% Perk Surge',
  },
  {
    level: 3,
    title: 'Trial 03 · Lifeline Springs',
    imageCaption: 'Lifeline Trial Artwork · Dodge red traps and claim blue life springs',
    rulesSummary: '3 Lives Limit · Collect 3 blue life icons before 2,400m · Speed increases +7% every 100m.',
    task: {
      type: 'collect_hearts',
      targetCount: 3,
      title: 'Gather 3 Life Springs',
      description: 'Pick up 3 blue life-enhancing icons along the 2,400m circuit.',
    },
    targetDistance: 2400,
    baseSpeed: 45,
    hazardDensity: 0.96,
    perkSizePx: 43,
    perkPowerMultiplier: 1.2,
    rivalCount: 2,
    hazardIntensity: 'Standard',
    rewardXp: 180,
    rewardGold: 140,
    unlockReward: 'Unlocks Canopy Prism Skin',
    unlockSkinId: 'prismatic_halo',
  },
  {
    level: 4,
    title: 'Trial 04 · Obstacle Gauntlet',
    imageCaption: 'Obstacle Hurdle Trial · Weave or jump past 12 red obstacles to qualify',
    rulesSummary: '3 Lives Limit · Dodge or Jump (Space) cleanly past 12 red obstacles before 2,800m.',
    task: {
      type: 'clear_obstacles',
      targetCount: 12,
      title: 'Clear 12 Obstacles',
      description: 'Pass or vault cleanly over 12 red obstacles before reaching 2,800m without losing all 3 lives.',
    },
    targetDistance: 2800,
    baseSpeed: 48,
    hazardDensity: 1.08,
    perkSizePx: 41,
    perkPowerMultiplier: 1.35,
    rivalCount: 2,
    hazardIntensity: 'Standard',
    rewardXp: 220,
    rewardGold: 175,
    unlockReward: 'Advanced Boosts (+35% surge)',
  },
  {
    level: 5,
    title: 'Trial 05 · Relic Vault Run',
    imageCaption: 'Relic Cache Artwork · Recover 3 crystal supply caches along the trail',
    rulesSummary: '3 Lives Limit · Collect 3 green Relic Caches to earn live power-ups before 3,200m.',
    task: {
      type: 'collect_caches',
      targetCount: 3,
      title: 'Secure 3 Relic Caches',
      description: 'Collect 3 emerald power-up cache icons along the 3,200m gauntlet.',
    },
    targetDistance: 3200,
    baseSpeed: 50,
    hazardDensity: 1.15,
    perkSizePx: 40,
    perkPowerMultiplier: 1.45,
    rivalCount: 2,
    hazardIntensity: 'Elevated',
    rewardXp: 250,
    rewardGold: 195,
    unlockReward: 'Heart Perks also grant brief Leap',
  },
  {
    level: 6,
    title: 'Trial 06 · Endurance Mile',
    imageCaption: 'Finish Arch Sprint · Outrun 3 crystal rivals to the 3,600m gate',
    rulesSummary: '3 Lives Limit · Beat all 3 rivals to 3,600m · Trigger Jetpack (3) or Swap (2) anytime mid-race.',
    task: {
      type: 'distance_sprint',
      targetCount: 3600,
      title: 'Finish 3,600m Sprint',
      description: 'Cross the 3,600m finish line in 1st place without exhausting your 3 lives.',
    },
    targetDistance: 3600,
    baseSpeed: 53,
    hazardDensity: 1.24,
    perkSizePx: 38,
    perkPowerMultiplier: 1.55,
    rivalCount: 3,
    hazardIntensity: 'Elevated',
    rewardXp: 300,
    rewardGold: 230,
    unlockReward: 'Unlocks Sunstone Core Skin',
    unlockSkinId: 'sunstone_core',
  },
  {
    level: 7,
    title: 'Trial 07 · High Velocity Sweep',
    imageCaption: 'Relic Sweep Artwork · Collect 10 green or blue perks at high speed',
    rulesSummary: '3 Lives Limit · Gather 10 green boosts or blue life icons before 4,000m.',
    task: {
      type: 'collect_perks',
      targetCount: 10,
      title: 'Collect 10 Perks',
      description: 'Gather 10 beneficial icons (green boosts or blue hearts) before 4,000m.',
    },
    targetDistance: 4000,
    baseSpeed: 56,
    hazardDensity: 1.32,
    perkSizePx: 37,
    perkPowerMultiplier: 1.7,
    rivalCount: 3,
    hazardIntensity: 'Severe',
    rewardXp: 340,
    rewardGold: 265,
    unlockReward: 'Advanced Turbo (+70% surge)',
  },
  {
    level: 8,
    title: 'Trial 08 · Precision Hurdles',
    imageCaption: 'Obstacle Qualification · Pass 18 red hazards at overdrive pace',
    rulesSummary: '3 Lives Limit · Dodge or vault past 18 red hazards before 4,400m to qualify.',
    task: {
      type: 'clear_obstacles',
      targetCount: 18,
      title: 'Clear 18 Obstacles',
      description: 'Pass cleanly through 18 red obstacles along the 4,400m trail without losing all 3 lives.',
    },
    targetDistance: 4400,
    baseSpeed: 58,
    hazardDensity: 1.4,
    perkSizePx: 36,
    perkPowerMultiplier: 1.8,
    rivalCount: 3,
    hazardIntensity: 'Severe',
    rewardXp: 390,
    rewardGold: 305,
    unlockReward: 'Power-Up Caches grant +2 charges',
  },
  {
    level: 9,
    title: 'Trial 09 · Hazard Storm',
    imageCaption: 'Lifeline Trial Artwork · Claim 4 blue life icons amid severe red hazards',
    rulesSummary: '3 Lives Limit · Collect 4 blue life springs before 4,800m · Use Phase Leap (1) & Shield (4).',
    task: {
      type: 'collect_hearts',
      targetCount: 4,
      title: 'Gather 4 Life Cores',
      description: 'Secure 4 blue life icons before finishing 4,800m without hitting 0 lives.',
    },
    targetDistance: 4800,
    baseSpeed: 61,
    hazardDensity: 1.48,
    perkSizePx: 35,
    perkPowerMultiplier: 1.9,
    rivalCount: 3,
    hazardIntensity: 'Severe',
    rewardXp: 440,
    rewardGold: 350,
    unlockReward: 'Unlocks Ember Crown Skin',
    unlockSkinId: 'ember_crown',
  },
  {
    level: 10,
    title: 'Trial 10 · Round 1 Qualifier Finale',
    imageCaption: 'Round 1 Qualifier · Clear 22 obstacles to unlock Round 2 & Facet Pathfinder Rank',
    rulesSummary: 'Round 1 Finale · 3 Lives Limit · Clear 22 obstacles before 5,200m to qualify for Round 2!',
    task: {
      type: 'clear_obstacles',
      targetCount: 22,
      title: 'Pass 22 Obstacles to Qualify',
      description: 'Dodge or vault cleanly past 22 red obstacles before 5,200m to complete Round 1 and unlock Round 2 perks.',
    },
    targetDistance: 5200,
    baseSpeed: 64,
    hazardDensity: 1.56,
    perkSizePx: 34,
    perkPowerMultiplier: 2.0,
    rivalCount: 3,
    hazardIntensity: 'Apex',
    rewardXp: 520,
    rewardGold: 430,
    unlockReward: 'Completes Round 1 · Unlocks Facet Pathfinder Rank + Swift Boots I + Shields & Jetpacks',
  },
  {
    level: 11,
    title: 'Trial 11 · Apex Perk Hunt',
    imageCaption: 'Relic Sweep Artwork · Collect 14 small 33px perks across 5,600m',
    rulesSummary: '3 Lives Limit · Collect 14 small 33px green/blue perks before 5,600m.',
    task: {
      type: 'collect_perks',
      targetCount: 14,
      title: 'Collect 14 Perks',
      description: 'Pick up 14 beneficial icons across the 5,600m Round 2 opener.',
    },
    targetDistance: 5600,
    baseSpeed: 66,
    hazardDensity: 1.64,
    perkSizePx: 33,
    perkPowerMultiplier: 2.1,
    rivalCount: 3,
    hazardIntensity: 'Apex',
    rewardXp: 570,
    rewardGold: 480,
    unlockReward: 'Master Relic Drops (+2 charges + Shield)',
  },
  {
    level: 12,
    title: 'Trial 12 · Quantum Sprint',
    imageCaption: 'Finish Arch Sprint · Outrace 3 rivals across the 6,000m Quantum circuit',
    rulesSummary: '3 Lives Limit · Finish 1st at 6,000m while surviving dense apex obstacles.',
    task: {
      type: 'distance_sprint',
      targetCount: 6000,
      title: 'Conquer 6,000m Sprint',
      description: 'Win the 6,000m Round 2 endurance race with your 3-life limit intact.',
    },
    targetDistance: 6000,
    baseSpeed: 69,
    hazardDensity: 1.72,
    perkSizePx: 32,
    perkPowerMultiplier: 2.25,
    rivalCount: 3,
    hazardIntensity: 'Apex',
    rewardXp: 700,
    rewardGold: 620,
    unlockReward: 'Unlocks Quantum Prism Skin',
    unlockSkinId: 'quantum_prism',
  },
];

export function getTournamentLevelConfig(level: number): CampaignLevel {
  const safeLevel = Math.max(1, Math.floor(level));
  const preset = CAMPAIGN_LEVELS.find((l) => l.level === safeLevel);
  if (preset) return preset;

  const round = Math.ceil(safeLevel / 10);
  const stageInRound = ((safeLevel - 1) % 10) + 1;
  const isRoundFinale = stageInRound === 10;

  const taskCycle: TournamentTaskType[] = [
    'collect_boosts',
    'clear_obstacles',
    'distance_sprint',
    'collect_hearts',
    'collect_caches',
    'collect_perks',
  ];
  const taskType = isRoundFinale
    ? 'clear_obstacles'
    : taskCycle[(safeLevel - 1) % taskCycle.length];

  const targetDistance = Math.min(10000, 1800 + stageInRound * 360 + (round - 1) * 750);
  const baseSpeed = Math.min(96, Math.round(40 + safeLevel * 2.1));
  const hazardDensity = Number(Math.min(2.4, 0.85 + safeLevel * 0.065).toFixed(2));
  const perkSizePx = Math.max(28, Math.round(45 - Math.min(17, safeLevel * 0.85)));
  const perkPowerMultiplier = Number((1.0 + safeLevel * 0.095).toFixed(2));

  let task: CampaignLevel['task'];
  let imageCaption: string;
  let rulesSummary: string;

  if (taskType === 'clear_obstacles') {
    const count = Math.min(36, 12 + safeLevel);
    task = {
      type: 'clear_obstacles',
      targetCount: count,
      title: isRoundFinale ? `Pass ${count} Obstacles to Qualify` : `Clear ${count} Obstacles`,
      description: isRoundFinale
        ? `Dodge or vault past ${count} red obstacles before ${targetDistance.toLocaleString()}m to qualify for Round ${round + 1}!`
        : `Pass cleanly through ${count} red obstacles before reaching ${targetDistance.toLocaleString()}m.`,
    };
    imageCaption = isRoundFinale
      ? `Round ${round} Qualifier · Pass ${count} obstacles to unlock Round ${round + 1}`
      : `Round ${round} Hurdle Trial · Pass ${count} hazards at ${baseSpeed} m/s`;
    rulesSummary = `3 Lives Limit · Dodge or Jump (Space) past ${count} red obstacles before ${targetDistance.toLocaleString()}m.`;
  } else if (taskType === 'collect_boosts') {
    const count = Math.min(18, 5 + Math.floor(safeLevel / 2));
    task = {
      type: 'collect_boosts',
      targetCount: count,
      title: `Pick Up ${count} Boosts`,
      description: `Collect ${count} green boost icons across ${targetDistance.toLocaleString()}m with 3 lives.`,
    };
    imageCaption = `Round ${round} Velocity Trial · Hit ${count} high-speed green boosts`;
    rulesSummary = `3 Lives Limit · Collect ${count} green boost pads before ${targetDistance.toLocaleString()}m.`;
  } else if (taskType === 'collect_hearts') {
    const count = Math.min(8, 3 + Math.floor(safeLevel / 4));
    task = {
      type: 'collect_hearts',
      targetCount: count,
      title: `Gather ${count} Life Cores`,
      description: `Collect ${count} blue life icons along the ${targetDistance.toLocaleString()}m gauntlet.`,
    };
    imageCaption = `Round ${round} Lifeline Trial · Secure ${count} blue life springs`;
    rulesSummary = `3 Lives Limit · Gather ${count} blue life icons before ${targetDistance.toLocaleString()}m.`;
  } else if (taskType === 'collect_caches') {
    const count = Math.min(8, 3 + Math.floor(safeLevel / 4));
    task = {
      type: 'collect_caches',
      targetCount: count,
      title: `Secure ${count} Relic Caches`,
      description: `Claim ${count} green cache icons before reaching ${targetDistance.toLocaleString()}m.`,
    };
    imageCaption = `Round ${round} Relic Hunt · Recover ${count} supply caches`;
    rulesSummary = `3 Lives Limit · Secure ${count} emerald cache icons before ${targetDistance.toLocaleString()}m.`;
  } else if (taskType === 'collect_perks') {
    const count = Math.min(24, 8 + Math.floor(safeLevel * 0.55));
    task = {
      type: 'collect_perks',
      targetCount: count,
      title: `Collect ${count} Perks`,
      description: `Pick up ${count} beneficial green or blue icons before ${targetDistance.toLocaleString()}m.`,
    };
    imageCaption = `Round ${round} Perk Sweep · Thread ${perkSizePx}px icons at ${baseSpeed} m/s`;
    rulesSummary = `3 Lives Limit · Collect ${count} green or blue perks before ${targetDistance.toLocaleString()}m.`;
  } else {
    task = {
      type: 'distance_sprint',
      targetCount: targetDistance,
      title: `Conquer ${targetDistance.toLocaleString()}m`,
      description: `Outrun 3 rivals across ${targetDistance.toLocaleString()}m with your 3-life limit intact.`,
    };
    imageCaption = `Round ${round} Sprint · Beat 3 rivals to the ${targetDistance.toLocaleString()}m gate`;
    rulesSummary = `3 Lives Limit · Cross ${targetDistance.toLocaleString()}m in 1st place · Speed surges +7% every 100m.`;
  }

  return {
    level: safeLevel,
    title: isRoundFinale
      ? `Trial ${safeLevel} · Round ${round} Qualifier`
      : `Trial ${safeLevel} · Round ${round} Stage ${stageInRound}`,
    imageCaption,
    rulesSummary,
    task,
    targetDistance,
    baseSpeed,
    hazardDensity,
    perkSizePx,
    perkPowerMultiplier,
    rivalCount: 3,
    hazardIntensity: safeLevel >= 16 ? 'Apex' : 'Severe',
    rewardXp: Math.min(1900, 120 + safeLevel * 45),
    rewardGold: Math.min(4500, 100 + safeLevel * 40),
    unlockReward: isRoundFinale
      ? `Completes Round ${round} · Grants Rank Upgrade, Swift Boots +2.5 m/s, +2 Shields & +2 Jetpacks`
      : `Unlocks Level ${safeLevel + 1} · ${perkPowerMultiplier.toFixed(2)}x Perk Power`,
  };
}

export function getRoundLevels(roundNumber: number): CampaignLevel[] {
  const safeRound = Math.max(1, Math.floor(roundNumber));
  const startLevel = (safeRound - 1) * 10 + 1;
  const levels: CampaignLevel[] = [];
  for (let i = 0; i < 10; i++) {
    levels.push(getTournamentLevelConfig(startLevel + i));
  }
  return levels;
}

export function getRoundMilestoneReward(completedRound: number): {
  completedRound: number;
  shieldGain: number;
  jetpackGain: number;
  leapGain: number;
  swapGain: number;
  bootsBonusMps: number;
  summary: string;
} {
  const safeRound = Math.max(1, Math.floor(completedRound));
  const bootsBonusMps = Math.min(25, safeRound * 2.5);
  return {
    completedRound: safeRound,
    shieldGain: 2,
    jetpackGain: 2,
    leapGain: 2,
    swapGain: 1,
    bootsBonusMps,
    summary: `Swift Boots +${bootsBonusMps.toFixed(1)} m/s, +2 Aegis Shields, +2 Jetpacks, +2 Phase Leaps, +1 Swap`,
  };
}

interface RealmPickupSpec {
  kind: PickupKind;
  variant: VisualVariant;
  label: string;
  isBeneficial: boolean;
}

const REALM_PERKS: Record<RealmId, RealmPickupSpec[]> = {
  jungle: [
    { kind: 'turbo', variant: 'bridge_boost', label: 'Rope Bridge Surge', isBeneficial: true },
    { kind: 'heart', variant: 'waterfall_heart', label: 'Waterfall Life Spring', isBeneficial: true },
    { kind: 'tailwind', variant: 'canopy_wind', label: 'Canopy Gale Boost', isBeneficial: true },
    { kind: 'nitro_cache', variant: 'jungle_cache', label: 'Jungle Relic Cache', isBeneficial: true },
  ],
  desert: [
    { kind: 'turbo', variant: 'pyramid_boost', label: 'Pyramid Surge', isBeneficial: true },
    { kind: 'heart', variant: 'oasis_heart', label: 'Oasis Life Spring', isBeneficial: true },
    { kind: 'tailwind', variant: 'sand_wind', label: 'Solar Wind Boost', isBeneficial: true },
    { kind: 'nitro_cache', variant: 'scarab_cache', label: 'Scarab Relic Cache', isBeneficial: true },
  ],
  dragon: [
    { kind: 'turbo', variant: 'dragon_egg', label: 'Dragon Egg Surge', isBeneficial: true },
    { kind: 'heart', variant: 'ember_heart', label: 'Ember Life Core', isBeneficial: true },
    { kind: 'tailwind', variant: 'thermal_wind', label: 'Thermal Lift Boost', isBeneficial: true },
    { kind: 'nitro_cache', variant: 'hoard_cache', label: 'Dragon Hoard Cache', isBeneficial: true },
  ],
  neon: [
    { kind: 'turbo', variant: 'skyway_boost', label: 'Skyway Hyper-Pad', isBeneficial: true },
    { kind: 'heart', variant: 'nano_heart', label: 'Nano Life Repair', isBeneficial: true },
    { kind: 'tailwind', variant: 'maglev_wind', label: 'Maglev Slipstream', isBeneficial: true },
    { kind: 'nitro_cache', variant: 'drone_cache', label: 'Supply Pod Cache', isBeneficial: true },
  ],
};

const REALM_HAZARDS: Record<RealmId, RealmPickupSpec[]> = {
  jungle: [
    { kind: 'life_drain', variant: 'forest_pit', label: 'Deep Forest Pit', isBeneficial: false },
    { kind: 'reverse', variant: 'waterfall_riptide', label: 'Waterfall Riptide', isBeneficial: false },
    { kind: 'serpent', variant: 'jungle_serpent', label: 'Jungle Viper Ambush', isBeneficial: false },
    { kind: 'stasis', variant: 'vine_snare', label: 'Thorn Vine Snare', isBeneficial: false },
  ],
  desert: [
    { kind: 'life_drain', variant: 'scorpion', label: 'Desert Scorpion', isBeneficial: false },
    { kind: 'reverse', variant: 'quicksand', label: 'Quicksand Vortex', isBeneficial: false },
    { kind: 'stasis', variant: 'mummy', label: 'Tomb Mummy Curse', isBeneficial: false },
    { kind: 'serpent', variant: 'sand_serpent', label: 'Sand Wyrm Ambush', isBeneficial: false },
  ],
  dragon: [
    { kind: 'life_drain', variant: 'lava_fissure', label: 'Molten Lava Pit', isBeneficial: false },
    { kind: 'reverse', variant: 'fire_jet', label: 'Fire Vent Blast', isBeneficial: false },
    { kind: 'serpent', variant: 'swooping_dragon', label: 'Swooping Dragon', isBeneficial: false },
    { kind: 'stasis', variant: 'obsidian_stasis', label: 'Obsidian Ash Lock', isBeneficial: false },
  ],
  neon: [
    { kind: 'life_drain', variant: 'patrol_drone', label: 'Patrol Drone Zap', isBeneficial: false },
    { kind: 'reverse', variant: 'road_bump', label: 'Cyber Road Bump', isBeneficial: false },
    { kind: 'stasis', variant: 'emp_lock', label: 'EMP Grid Lock', isBeneficial: false },
    { kind: 'serpent', variant: 'skyfall_drop', label: 'Skyfall Breach', isBeneficial: false },
  ],
};

function pickBeneficialPerk(
  perks: RealmPickupSpec[],
  taskType?: TournamentTaskType,
): RealmPickupSpec {
  if (taskType === 'collect_boosts' && Math.random() < 0.72) {
    const boosts = perks.filter((p) => p.kind === 'turbo' || p.kind === 'tailwind');
    if (boosts.length > 0) return boosts[Math.floor(Math.random() * boosts.length)];
  }
  if (taskType === 'collect_hearts' && Math.random() < 0.65) {
    const hearts = perks.filter((p) => p.kind === 'heart');
    if (hearts.length > 0) return hearts[Math.floor(Math.random() * hearts.length)];
  }
  if (taskType === 'collect_caches' && Math.random() < 0.65) {
    const caches = perks.filter((p) => p.kind === 'nitro_cache');
    if (caches.length > 0) return caches[Math.floor(Math.random() * caches.length)];
  }
  return perks[Math.floor(Math.random() * perks.length)];
}

/**
 * Generates well-spaced perks and hazards across `targetDistance` (1,000m to 10,000m).
 * Higher `hazardDensity` increases obstacle frequency while keeping lanes cleanly readable.
 */
export function generateRaceTrackPickups(
  realm: RealmId,
  targetDistance: number,
  hazardDensity = 1.0,
  taskType?: TournamentTaskType,
): TrackPickup[] {
  const pickups: TrackPickup[] = [];
  const perks = REALM_PERKS[realm];
  const hazards = REALM_HAZARDS[realm];

  const baseWaveGap = Math.max(120, Math.round(215 / Math.max(0.7, hazardDensity)));
  // Ensure collection tasks have generous perk spawn waves along the track
  const waveGap =
    taskType && taskType !== 'distance_sprint' ? Math.min(baseWaveGap, 130) : baseWaveGap;
  let idx = 0;

  for (let d = 140; d < targetDistance - 100; d += waveGap) {
    const lanes: RaceLane[] = [0, 1, 2];
    for (let i = lanes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [lanes[i], lanes[j]] = [lanes[j], lanes[i]];
    }

    // 1 Right Perk (Green Speed/Cache or Blue Heart) — guarantee periodic Power-Up Cache crates!
    const forceCacheWave = (idx % 6 === 0) && (!taskType || taskType === 'distance_sprint' || taskType === 'clear_obstacles' || taskType === 'collect_caches' || taskType === 'collect_perks');
    const perk = forceCacheWave
      ? (perks.find((p) => p.kind === 'nitro_cache') ?? pickBeneficialPerk(perks, taskType))
      : pickBeneficialPerk(perks, taskType);
    pickups.push({
      id: `pk-${idx++}-${d}`,
      distance: d,
      lane: lanes[0],
      kind: perk.kind,
      visualVariant: perk.variant,
      isBeneficial: true,
      label: perk.label,
      consumedBy: [],
      passedBy: [],
    });

    // Subway Surfers / Temple Run Gold Coin Trail (3 coins lined cleanly along an open lane)
    const coinLane = lanes[0];
    for (let c = 0; c < 3; c++) {
      pickups.push({
        id: `coin-${idx++}-${d + 22 + c * 18}`,
        distance: d + 22 + c * 18,
        lane: coinLane,
        kind: 'coin',
        visualVariant: 'gold_coin',
        isBeneficial: true,
        label: 'Relic Gold Coin',
        consumedBy: [],
        passedBy: [],
      });
    }

    // 1 Red Hazard staggered +58m away
    const haz1 = hazards[Math.floor(Math.random() * hazards.length)];
    pickups.push({
      id: `pk-${idx++}-${d}`,
      distance: d + 58,
      lane: lanes[1],
      kind: haz1.kind,
      visualVariant: haz1.variant,
      isBeneficial: false,
      label: haz1.label,
      consumedBy: [],
      passedBy: [],
    });

    // Extra obstacle (great for obstacle qualification levels) or bonus task item
    if (hazardDensity >= 0.9 || taskType === 'clear_obstacles' || idx % 2 === 0) {
      const spawnExtraTaskPerk =
        taskType &&
        taskType !== 'distance_sprint' &&
        taskType !== 'clear_obstacles' &&
        idx % 3 === 0;
      if (spawnExtraTaskPerk) {
        const extraPerk = pickBeneficialPerk(perks, taskType);
        pickups.push({
          id: `pk-${idx++}-${d}`,
          distance: d - 44,
          lane: lanes[2],
          kind: extraPerk.kind,
          visualVariant: extraPerk.variant,
          isBeneficial: true,
          label: extraPerk.label,
          consumedBy: [],
          passedBy: [],
        });
      } else {
        const useMystery =
          taskType !== 'clear_obstacles' && hazardDensity < 1.35 && Math.random() < 0.18;
        const haz2 = hazards[Math.floor(Math.random() * hazards.length)];
        pickups.push({
          id: `pk-${idx++}-${d}`,
          distance: d - 46,
          lane: lanes[2],
          kind: useMystery ? 'mystery' : haz2.kind,
          visualVariant: useMystery ? 'mystery_relic' : haz2.variant,
          isBeneficial: useMystery,
          label: useMystery ? 'Mystery Relic' : haz2.label,
          consumedBy: [],
          passedBy: [],
        });
      }
    }
  }

  return pickups;
}
