import {
  generateRaceTrackPickups,
  getTournamentLevelConfig,
  POWERUP_INFO,
  REALMS,
} from './boardData.ts';
import {
  CrystalColor,
  DEFAULT_RACE_DISTANCE,
  GameMode,
  MatchLogEntry,
  MatchPlayer,
  MatchState,
  MAX_RACE_DISTANCE,
  MIN_RACE_DISTANCE,
  PlayerPowerups,
  PowerupType,
  RaceLane,
  RealmId,
  STANDARD_MULTIPLAYER_SPEED,
  TournamentTask,
  TrackPickup,
} from './gameTypes.ts';

const COLORS_ORDER: CrystalColor[] = ['ruby', 'sapphire', 'emerald', 'topaz'];
const BOT_NAMES = ['Kaelen', 'Lyra', 'Vorn', 'Seris'];
export const PRE_RACE_COUNTDOWN_MS = 3500;

function uidFragment(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function addLog(
  state: MatchState,
  player: MatchPlayer,
  message: string,
  tone: MatchLogEntry['tone'],
): void {
  const entry: MatchLogEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: Date.now(),
    playerId: player.id,
    playerName: player.name,
    crystalColor: player.crystalColor,
    message,
    tone,
  };
  state.logs = [entry, ...state.logs].slice(0, 30);
}

function clampDistance(raw?: number): number {
  const num = Number(raw || DEFAULT_RACE_DISTANCE);
  if (!Number.isFinite(num)) return DEFAULT_RACE_DISTANCE;
  return Math.min(MAX_RACE_DISTANCE, Math.max(MIN_RACE_DISTANCE, Math.round(num / 100) * 100));
}

function getRaceConfig(state: Pick<MatchState, 'mode' | 'campaignLevel' | 'targetDistance'>): {
  baseSpeed: number;
  hazardDensity: number;
  perkPowerMultiplier: number;
  targetDistance: number;
  perkSizePx: number;
  task?: TournamentTask;
  rulesSummary: string;
} {
  if (state.mode === 'campaign') {
    const cfg = getTournamentLevelConfig(state.campaignLevel);
    return {
      baseSpeed: cfg.baseSpeed,
      hazardDensity: cfg.hazardDensity,
      perkPowerMultiplier: cfg.perkPowerMultiplier,
      targetDistance: cfg.targetDistance,
      perkSizePx: cfg.perkSizePx,
      task: cfg.task,
      rulesSummary: cfg.rulesSummary,
    };
  }
  const dist = clampDistance(state.targetDistance);
  return {
    baseSpeed: STANDARD_MULTIPLAYER_SPEED,
    hazardDensity: 1.0,
    perkPowerMultiplier: 1.0,
    targetDistance: dist,
    perkSizePx: 42,
    rulesSummary: `First runner to ${dist.toLocaleString()}m wins · Steer (Left/Right), Jump (Space), & trigger Perks (1–4) mid-run · Collect Gold Coins on the rails!`,
  };
}

export function getPlayerTaskProgress(player: MatchPlayer, task?: TournamentTask): number {
  if (!task) return Math.round(player.distance);
  switch (task.type) {
    case 'collect_boosts':
      return player.boostsCollected;
    case 'collect_hearts':
      return player.heartsCollected;
    case 'collect_caches':
      return player.cachesCollected;
    case 'collect_perks':
      return player.perksCollected;
    case 'clear_obstacles':
      return player.obstaclesCleared;
    case 'distance_sprint':
    default:
      return Math.round(player.distance);
  }
}

export function createMatchState(params: {
  roomId: string;
  roomCode: string;
  mode: GameMode;
  realm: RealmId;
  campaignLevel?: number;
  targetDistance?: number;
  hostPlayer: {
    id: string;
    name: string;
    crystalColor: CrystalColor;
    skinId: string;
    bootsBonusMps?: number;
    startingPowerups?: Partial<PlayerPowerups>;
  };
}): MatchState {
  const levelNum = params.campaignLevel ?? 1;
  const cfg = getRaceConfig({
    mode: params.mode,
    campaignLevel: levelNum,
    targetDistance: params.targetDistance ?? DEFAULT_RACE_DISTANCE,
  });

  const pickups = generateRaceTrackPickups(
    params.realm,
    cfg.targetDistance,
    cfg.hazardDensity,
    cfg.task?.type,
  );

  const bootsBonusMps = Math.max(0, Math.min(50, Number(params.hostPlayer.bootsBonusMps || 0)));

  const host: MatchPlayer = {
    id: params.hostPlayer.id,
    name: params.hostPlayer.name,
    crystalColor: params.hostPlayer.crystalColor,
    skinId: params.hostPlayer.skinId || 'classic_facet',
    distance: 0,
    lane: 1,
    speed: Number((cfg.baseSpeed + bootsBonusMps).toFixed(1)),
    bootsBonusMps,
    lives: 3,
    maxLives: 3,
    boostTicks: 0,
    slowTicks: 0,
    reverseTicks: 0,
    leapTicks: 0,
    jumpTicks: 0,
    hasShield: false,
    powerups: {
      leap: Math.max(0, Math.min(99, params.hostPlayer.startingPowerups?.leap ?? 1)),
      swap: Math.max(0, Math.min(99, params.hostPlayer.startingPowerups?.swap ?? 1)),
      boost: Math.max(0, Math.min(99, params.hostPlayer.startingPowerups?.boost ?? 1)),
      shield: Math.max(0, Math.min(99, params.hostPlayer.startingPowerups?.shield ?? 1)),
    },
    powerupsUsed: { leap: 0, swap: 0, boost: 0, shield: 0 },
    powerupsGained: { leap: 0, swap: 0, boost: 0, shield: 0 },
    isBot: false,
    connected: true,
    perksCollected: 0,
    boostsCollected: 0,
    heartsCollected: 0,
    cachesCollected: 0,
    obstaclesCleared: 0,
    coinsCollected: 0,
    hazardsHit: 0,
    swapsMade: 0,
    finishTimeMs: null,
  };

  return {
    roomId: params.roomId,
    roomCode: params.roomCode,
    mode: params.mode,
    realm: params.realm,
    campaignLevel: levelNum,
    targetDistance: cfg.targetDistance,
    perkSizePx: cfg.perkSizePx,
    task: cfg.task,
    rulesSummary: cfg.rulesSummary,
    outcomeReason: undefined,
    status: 'waiting',
    countdownMs: 0,
    hostId: host.id,
    players: [host],
    pickups,
    elapsedMs: 0,
    speedMultiplier: 1.0,
    winnerId: null,
    logs: [
      {
        id: `init-${Date.now()}`,
        timestamp: Date.now(),
        playerId: host.id,
        playerName: host.name,
        crystalColor: host.crystalColor,
        message: `Created ${REALMS[params.realm].name} ${cfg.targetDistance}m room ${params.roomCode}.`,
        tone: 'neutral',
      },
    ],
    createdAt: Date.now(),
  };
}

export function addHumanPlayerToMatch(
  state: MatchState,
  player: {
    id: string;
    name: string;
    crystalColor?: CrystalColor;
    skinId?: string;
    bootsBonusMps?: number;
    startingPowerups?: Partial<PlayerPowerups>;
  },
): { ok: boolean; error?: string } {
  if (state.status !== 'waiting') {
    return { ok: false, error: 'Race has already started.' };
  }
  const existing = state.players.find((p) => p.id === player.id);
  if (existing) {
    existing.connected = true;
    existing.name = player.name;
    return { ok: true };
  }
  if (state.players.length >= 4) {
    return { ok: false, error: 'Race grid is full (max 4 runners).' };
  }

  const usedColors = new Set(state.players.map((p) => p.crystalColor));
  const assignedColor =
    player.crystalColor && !usedColors.has(player.crystalColor)
      ? player.crystalColor
      : COLORS_ORDER.find((c) => !usedColors.has(c)) ?? 'topaz';

  const cfg = getRaceConfig(state);
  const bootsBonusMps = Math.max(0, Math.min(50, Number(player.bootsBonusMps || 0)));
  const laneOrder: RaceLane[] = [1, 0, 2, 1];
  const joined: MatchPlayer = {
    id: player.id,
    name: player.name,
    crystalColor: assignedColor,
    skinId: player.skinId || 'classic_facet',
    distance: 0,
    lane: laneOrder[state.players.length % laneOrder.length],
    speed: Number((cfg.baseSpeed + bootsBonusMps).toFixed(1)),
    bootsBonusMps,
    lives: 3,
    maxLives: 3,
    boostTicks: 0,
    slowTicks: 0,
    reverseTicks: 0,
    leapTicks: 0,
    jumpTicks: 0,
    hasShield: false,
    powerups: {
      leap: Math.max(0, Math.min(99, player.startingPowerups?.leap ?? 1)),
      swap: Math.max(0, Math.min(99, player.startingPowerups?.swap ?? 1)),
      boost: Math.max(0, Math.min(99, player.startingPowerups?.boost ?? 1)),
      shield: Math.max(0, Math.min(99, player.startingPowerups?.shield ?? 1)),
    },
    powerupsUsed: { leap: 0, swap: 0, boost: 0, shield: 0 },
    powerupsGained: { leap: 0, swap: 0, boost: 0, shield: 0 },
    isBot: false,
    connected: true,
    perksCollected: 0,
    boostsCollected: 0,
    heartsCollected: 0,
    cachesCollected: 0,
    obstaclesCleared: 0,
    coinsCollected: 0,
    hazardsHit: 0,
    swapsMade: 0,
    finishTimeMs: null,
  };

  state.players.push(joined);
  addLog(state, joined, `${joined.name} joined the starting line (${assignedColor} runner).`, 'neutral');
  return { ok: true };
}

export function fillBotsAndStart(state: MatchState, targetCount = 4): void {
  const desired = Math.min(4, Math.max(2, targetCount));
  let botIdx = 0;
  const laneOrder: RaceLane[] = [0, 2, 1, 0];
  const cfg = getRaceConfig(state);

  while (state.players.length < desired) {
    const usedColors = new Set(state.players.map((p) => p.crystalColor));
    const color = COLORS_ORDER.find((c) => !usedColors.has(c)) ?? 'topaz';
    const botName = `${BOT_NAMES[botIdx % BOT_NAMES.length]} (Rival)`;
    botIdx += 1;
    state.players.push({
      id: `bot-${uidFragment()}`,
      name: botName,
      crystalColor: color,
      skinId: 'classic_facet',
      distance: 0,
      lane: laneOrder[state.players.length % laneOrder.length],
      speed: cfg.baseSpeed,
      bootsBonusMps: 0,
      lives: 3,
      maxLives: 3,
      boostTicks: 0,
      slowTicks: 0,
      reverseTicks: 0,
      leapTicks: 0,
      jumpTicks: 0,
      hasShield: false,
      powerups: {
        leap: 1,
        swap: 0,
        boost: 1,
        shield: 1,
      },
      powerupsUsed: { leap: 0, swap: 0, boost: 0, shield: 0 },
      powerupsGained: { leap: 0, swap: 0, boost: 0, shield: 0 },
      isBot: true,
      connected: true,
      perksCollected: 0,
      boostsCollected: 0,
      heartsCollected: 0,
      cachesCollected: 0,
      obstaclesCleared: 0,
      coinsCollected: 0,
      hazardsHit: 0,
      swapsMade: 0,
      finishTimeMs: null,
      botSteerCooldownTicks: 8 + Math.floor(Math.random() * 6),
    });
  }

  state.status = 'countdown';
  state.countdownMs = PRE_RACE_COUNTDOWN_MS;
  state.elapsedMs = 0;
  state.speedMultiplier = 1.0;
  addLog(
    state,
    state.players[0],
    `Get ready! ${REALMS[state.realm].name} ${state.targetDistance.toLocaleString()}m race begins in 3 seconds — pick your lane!`,
    'perk',
  );
}

export function setRacerLane(
  state: MatchState,
  playerId: string,
  lane: RaceLane,
): { ok: boolean } {
  if (state.status !== 'playing' && state.status !== 'countdown') return { ok: false };
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return { ok: false };
  if (lane !== 0 && lane !== 1 && lane !== 2) return { ok: false };
  player.lane = lane;
  return { ok: true };
}

export function jumpRacerAction(
  state: MatchState,
  playerId: string,
): { ok: boolean } {
  if (state.status !== 'playing') return { ok: false };
  const player = state.players.find((p) => p.id === playerId);
  if (!player || player.jumpTicks > 0) return { ok: false };
  player.jumpTicks = 12; // ~0.6s airborne vault over hazards
  return { ok: true };
}

export function usePowerupAction(
  state: MatchState,
  playerId: string,
  powerup: PowerupType,
  targetPlayerId?: string,
): { ok: boolean; error?: string } {
  if (state.status !== 'playing') {
    return { ok: false, error: 'Race is not active.' };
  }
  const active = state.players.find((p) => p.id === playerId);
  if (!active) {
    return { ok: false, error: 'Runner not found.' };
  }
  if (active.powerups[powerup] <= 0) {
    return { ok: false, error: `No ${POWERUP_INFO[powerup].name} charges left.` };
  }

  const cfg = getRaceConfig(state);

  if (powerup === 'leap') {
    active.powerups.leap -= 1;
    active.powerupsUsed.leap += 1;
    active.leapTicks = 84; // 4.2s @ 50ms tick
    active.jumpTicks = Math.max(active.jumpTicks, 14);
    active.slowTicks = 0;
    active.reverseTicks = 0;
    active.lastPowerupNotice = {
      id: `pu-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      powerup: 'leap',
      action: 'used',
      delta: -1,
      remaining: active.powerups.leap,
      message: `Used Phase Leap (-1 · ${active.powerups.leap} left)`,
      timestamp: Date.now(),
    };
    addLog(state, active, `${active.name} used Phase Leap (-1 · ${active.powerups.leap} left)!`, 'powerup');
    return { ok: true };
  }

  if (powerup === 'boost') {
    active.powerups.boost -= 1;
    active.powerupsUsed.boost += 1;
    active.boostTicks = 70; // 3.5s @ 50ms tick
    active.jumpTicks = Math.max(active.jumpTicks, 12);
    active.slowTicks = 0;
    active.reverseTicks = 0;
    const dash = Math.round(180 * cfg.perkPowerMultiplier);
    active.distance = Math.min(state.targetDistance - 10, active.distance + dash);
    active.lastPowerupNotice = {
      id: `pu-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      powerup: 'boost',
      action: 'used',
      delta: -1,
      remaining: active.powerups.boost,
      message: `Used Jetpack Thruster (+${dash}m · ${active.powerups.boost} left)`,
      timestamp: Date.now(),
    };
    addLog(state, active, `${active.name} used Jetpack Thruster (+${dash}m · ${active.powerups.boost} left)!`, 'powerup');
    return { ok: true };
  }

  if (powerup === 'shield') {
    if (active.hasShield) return { ok: false, error: 'Aegis Shield is already active.' };
    active.powerups.shield -= 1;
    active.powerupsUsed.shield += 1;
    active.hasShield = true;
    active.slowTicks = 0;
    active.reverseTicks = 0;
    active.lastPowerupNotice = {
      id: `pu-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      powerup: 'shield',
      action: 'used',
      delta: -1,
      remaining: active.powerups.shield,
      message: `Used Aegis Shield (-1 · ${active.powerups.shield} left)`,
      timestamp: Date.now(),
    };
    addLog(state, active, `${active.name} raised Aegis Shield (-1 · ${active.powerups.shield} left).`, 'powerup');
    return { ok: true };
  }

  if (powerup === 'swap') {
    const rivals = state.players
      .filter((p) => p.id !== active.id)
      .sort((a, b) => b.distance - a.distance);
    const target = targetPlayerId
      ? rivals.find((p) => p.id === targetPlayerId)
      : rivals[0];
    if (!target) {
      return { ok: false, error: 'No rival runner to swap with.' };
    }
    active.powerups.swap -= 1;
    active.powerupsUsed.swap += 1;
    if (target.hasShield) {
      target.hasShield = false;
      active.lastPowerupNotice = {
        id: `pu-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        powerup: 'swap',
        action: 'used',
        delta: -1,
        remaining: active.powerups.swap,
        message: `Used Slipstream Swap (-1 · ${active.powerups.swap} left) · Blocked by Shield`,
        timestamp: Date.now(),
      };
      addLog(
        state,
        active,
        `${active.name} used Slipstream Swap (-1 · ${active.powerups.swap} left) on ${target.name}, but their Shield blocked it!`,
        'powerup',
      );
      return { ok: true };
    }
    const oldDist = active.distance;
    active.distance = target.distance;
    target.distance = oldDist;
    active.swapsMade += 1;
    active.lastPowerupNotice = {
      id: `pu-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      powerup: 'swap',
      action: 'used',
      delta: -1,
      remaining: active.powerups.swap,
      message: `Used Slipstream Swap (-1 · ${active.powerups.swap} left)`,
      timestamp: Date.now(),
    };
    addLog(
      state,
      active,
      `${active.name} used Slipstream Swap (-1 · ${active.powerups.swap} left) to overtake ${target.name}!`,
      'powerup',
    );
    return { ok: true };
  }

  return { ok: false, error: 'Unknown power-up.' };
}

function applyPickupEffect(
  state: MatchState,
  player: MatchPlayer,
  pickup: TrackPickup,
  perkPowerMultiplier: number,
): void {
  if (pickup.kind === 'coin') {
    player.coinsCollected += 1;
    if (player.coinsCollected % 5 === 0) {
      addLog(
        state,
        player,
        `${player.name} pocketed ${player.coinsCollected} track Gold Coins (+${player.coinsCollected * 10} Gold)!`,
        'perk',
      );
    }
    return;
  }

  let effectiveKind = pickup.kind;
  if (effectiveKind === 'mystery') {
    effectiveKind = Math.random() < 0.5 ? 'turbo' : Math.random() < 0.5 ? 'life_drain' : 'reverse';
  }

  const isHazard =
    effectiveKind === 'life_drain' ||
    effectiveKind === 'reverse' ||
    effectiveKind === 'serpent' ||
    effectiveKind === 'stasis';

  if (isHazard) {
    if (player.leapTicks > 0 || player.jumpTicks > 0) {
      player.obstaclesCleared += 1;
      pickup.passedBy = pickup.passedBy ?? [];
      if (!pickup.passedBy.includes(player.id)) {
        pickup.passedBy.push(player.id);
      }
      if (player.leapTicks > 0) {
        player.lastPowerupNotice = {
          id: `pu-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          powerup: 'leap',
          action: 'saved',
          delta: 0,
          remaining: player.powerups.leap,
          message: `SAVED! Phase Leap vaulted over ${pickup.label}`,
          timestamp: Date.now(),
        };
      }
      addLog(state, player, `${player.name} vaulted cleanly over ${pickup.label}!`, 'powerup');
      return;
    }
    if (player.hasShield) {
      player.hasShield = false;
      player.obstaclesCleared += 1;
      player.lastPowerupNotice = {
        id: `pu-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        powerup: 'shield',
        action: 'saved',
        delta: 0,
        remaining: player.powerups.shield,
        message: `SAVED! Aegis Shield absorbed ${pickup.label}`,
        timestamp: Date.now(),
      };
      addLog(state, player, `${player.name}'s Aegis Shield blocked ${pickup.label}!`, 'powerup');
      return;
    }

    player.hazardsHit += 1;
    if (effectiveKind === 'life_drain') {
      player.lives = Math.max(0, player.lives - 1);
      player.slowTicks = 28;
      if (player.lives === 0) {
        if (state.mode === 'campaign' && !player.isBot) {
          const rival = state.players.find((pl) => pl.id !== player.id);
          state.status = 'finished';
          state.winnerId = rival?.id ?? 'tournament-eliminated';
          state.outcomeReason = `All ${player.maxLives} lives were exhausted at ${pickup.label}. Restart the level to try again.`;
          addLog(
            state,
            player,
            `${player.name} lost their final life at ${pickup.label} — Tournament failed!`,
            'hazard',
          );
          return;
        }
        player.distance = Math.max(0, player.distance - 300);
        player.lives = player.maxLives;
        addLog(
          state,
          player,
          `${player.name} lost all lives at ${pickup.label} and dropped back to ${Math.round(player.distance)}m!`,
          'hazard',
        );
      } else {
        addLog(
          state,
          player,
          `${player.name} hit ${pickup.label} (-1 Life · ${player.lives}/${player.maxLives} left).`,
          'hazard',
        );
      }
      return;
    }

    if (effectiveKind === 'reverse') {
      player.distance = Math.max(0, player.distance - 150);
      player.reverseTicks = 18;
      addLog(
        state,
        player,
        `${player.name} struck ${pickup.label} and was pushed back -150m!`,
        'hazard',
      );
      return;
    }

    if (effectiveKind === 'serpent') {
      player.lives = Math.max(0, player.lives - 1);
      if (player.lives === 0) {
        if (state.mode === 'campaign' && !player.isBot) {
          const rival = state.players.find((pl) => pl.id !== player.id);
          state.status = 'finished';
          state.winnerId = rival?.id ?? 'tournament-eliminated';
          state.outcomeReason = `All ${player.maxLives} lives were exhausted at ${pickup.label}. Restart the level to try again.`;
          addLog(
            state,
            player,
            `${player.name} lost their final life to ${pickup.label} — Tournament failed!`,
            'hazard',
          );
          return;
        }
        player.distance = 0;
        player.lives = player.maxLives;
        addLog(
          state,
          player,
          `${player.name} hit ${pickup.label} with 0 lives and was sent back to Start (0m)!`,
          'hazard',
        );
      } else {
        player.distance = Math.max(0, player.distance - 240);
        addLog(
          state,
          player,
          `${player.name} hit ${pickup.label}: -1 Life & knocked back -240m!`,
          'hazard',
        );
      }
      return;
    }

    if (effectiveKind === 'stasis') {
      player.slowTicks = 36;
      addLog(
        state,
        player,
        `${player.name} got slowed by ${pickup.label}!`,
        'hazard',
      );
      return;
    }
  }

  // Beneficial Perks (scaled up on higher Tournament levels!)
  player.perksCollected += 1;
  if (effectiveKind === 'turbo') {
    player.boostsCollected += 1;
    const surge = Math.round(115 * perkPowerMultiplier);
    player.distance = Math.min(state.targetDistance, player.distance + surge);
    player.boostTicks = Math.max(player.boostTicks, Math.round(32 * Math.min(1.6, perkPowerMultiplier)));
    if (perkPowerMultiplier >= 2.0) {
      player.hasShield = true;
    }
    addLog(state, player, `${player.name} hit ${pickup.label} (+${surge}m surge)!`, 'perk');
  } else if (effectiveKind === 'tailwind') {
    player.boostsCollected += 1;
    const duration = Math.round(52 * Math.min(1.8, perkPowerMultiplier));
    player.boostTicks = Math.max(player.boostTicks, duration);
    addLog(state, player, `${player.name} rode ${pickup.label} (sprint overdrive)!`, 'perk');
  } else if (effectiveKind === 'heart') {
    player.heartsCollected += 1;
    if (player.lives < player.maxLives) {
      player.lives += 1;
      if (perkPowerMultiplier >= 1.45) {
        player.leapTicks = Math.max(player.leapTicks, 36);
      }
      addLog(
        state,
        player,
        `${player.name} picked up ${pickup.label} (${player.lives}/${player.maxLives} Lives)!`,
        'perk',
      );
    } else {
      player.hasShield = true;
      addLog(
        state,
        player,
        `${player.name} had full Lives — ${pickup.label} granted Aegis Shield!`,
        'perk',
      );
    }
  } else if (effectiveKind === 'nitro_cache') {
    player.cachesCollected += 1;
    const pool: PowerupType[] = ['boost', 'leap', 'shield', 'swap'];
    const depleted = pool.filter((k) => (player.powerups[k] ?? 0) === 0);
    const pickPool = depleted.length > 0 && Math.random() < 0.7 ? depleted : pool;
    const grant = pickPool[Math.floor(Math.random() * pickPool.length)];
    const charges = perkPowerMultiplier >= 1.8 ? 2 : 1;
    player.powerups[grant] = Math.min(99, player.powerups[grant] + charges);
    player.powerupsGained[grant] = (player.powerupsGained[grant] ?? 0) + charges;
    if (perkPowerMultiplier >= 2.1) {
      player.hasShield = true;
    }
    player.lastPowerupNotice = {
      id: `pu-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      powerup: grant,
      action: 'picked_up',
      delta: charges,
      remaining: player.powerups[grant],
      message: `Picked Up +${charges} ${POWERUP_INFO[grant].name} (Now x${player.powerups[grant]})`,
      timestamp: Date.now(),
    };
    addLog(
      state,
      player,
      `${player.name} collected ${pickup.label} (+${charges} ${POWERUP_INFO[grant].name} · Now x${player.powerups[grant]})!`,
      'powerup',
    );
  }
}

function updateBotSteering(state: MatchState, bot: MatchPlayer): void {
  // Realistic human-like reaction cadence (~450–700ms between lane decisions, max 1 lane step)
  const cooldown = bot.botSteerCooldownTicks ?? 0;
  if (cooldown > 0) {
    bot.botSteerCooldownTicks = cooldown - 1;
  } else {
    bot.botSteerCooldownTicks = 9 + Math.floor(Math.random() * 6);
    const ahead = state.pickups.filter(
      (pk) =>
        pk.distance > bot.distance + 8 &&
        pk.distance < bot.distance + 95 &&
        !(pk.consumedBy ?? []).includes(bot.id),
    );

    const laneScores = [0, 0, 0];
    for (const pk of ahead) {
      if (pk.kind === 'coin') {
        laneScores[pk.lane] += 0.8;
      } else if (pk.kind === 'mystery') {
        laneScores[pk.lane] += 0.1;
      } else if (pk.isBeneficial) {
        laneScores[pk.lane] += 1.8;
      } else {
        laneScores[pk.lane] -= 3.2;
      }
    }

    // Immediate hazard in same lane -> attempt realistic jump timing
    const immediateHazard = ahead.find(
      (pk) => pk.lane === bot.lane && !pk.isBeneficial && pk.kind !== 'mystery' && pk.distance < bot.distance + 26,
    );
    if (immediateHazard && bot.jumpTicks === 0 && Math.random() < 0.35) {
      jumpRacerAction(state, bot.id);
    }

    const reactionAccuracy =
      state.mode === 'campaign'
        ? Math.min(0.82, 0.52 + state.campaignLevel * 0.025)
        : 0.72;

    if (Math.random() < reactionAccuracy) {
      let bestLane: RaceLane = bot.lane;
      let bestScore = laneScores[bot.lane];
      ([0, 1, 2] as RaceLane[]).forEach((l) => {
        if (Math.abs(l - bot.lane) <= 1 && laneScores[l] > bestScore) {
          bestScore = laneScores[l];
          bestLane = l;
        }
      });
      bot.lane = bestLane;
    }
  }

  // Fair, infrequent power-up usage matching player limitations
  if (Math.random() < 0.005) {
    const leader = state.players
      .filter((p) => p.id !== bot.id)
      .sort((a, b) => b.distance - a.distance)[0];
    if (bot.powerups.swap > 0 && leader && leader.distance - bot.distance > 420) {
      usePowerupAction(state, bot.id, 'swap', leader.id);
    } else if (bot.powerups.boost > 0 && bot.boostTicks === 0 && bot.distance > 700) {
      usePowerupAction(state, bot.id, 'boost');
    } else if (bot.powerups.shield > 0 && !bot.hasShield) {
      usePowerupAction(state, bot.id, 'shield');
    }
  }
}

export function tickRaceSimulation(state: MatchState, dtMs = 50): boolean {
  if (state.status === 'countdown') {
    state.countdownMs = Math.max(0, (state.countdownMs ?? PRE_RACE_COUNTDOWN_MS) - dtMs);
    if (state.countdownMs <= 0) {
      state.status = 'playing';
      state.countdownMs = 0;
      addLog(
        state,
        state.players[0],
        `GO! Sprint ${state.targetDistance.toLocaleString()}m through ${REALMS[state.realm].name}!`,
        'perk',
      );
    }
    return true;
  }

  if (state.status !== 'playing') return false;
  state.elapsedMs += dtMs;
  const dtSec = dtMs / 1000;
  const elapsedSec = state.elapsedMs / 1000;
  const cfg = getRaceConfig(state);

  // Fast progressive speed: climbs every second (+2.2%/sec) AND jumps at every 100m gate (+7%/100m)
  const leadDistance = state.players.reduce((max, p) => Math.max(max, p.distance), 0);
  const lead100mSteps = Math.floor(leadDistance / 100);
  state.speedMultiplier = Number(
    (1 + Math.min(2.2, elapsedSec * 0.022 + lead100mSteps * 0.07)).toFixed(2),
  );

  for (const p of state.players) {
    if (p.isBot) {
      updateBotSteering(state, p);
    }

    if (p.boostTicks > 0) p.boostTicks -= 1;
    if (p.slowTicks > 0) p.slowTicks -= 1;
    if (p.reverseTicks > 0) p.reverseTicks -= 1;
    if (p.leapTicks > 0) p.leapTicks -= 1;
    if (p.jumpTicks > 0) p.jumpTicks -= 1;

    const steps100m = Math.floor(p.distance / 100);
    const playerSpeedMult = 1 + Math.min(2.2, elapsedSec * 0.022 + steps100m * 0.07);

    // Equal base speed physics for all runners — only earned Swift Boots & live track boosts/penalties differ!
    let currentSpeed = (cfg.baseSpeed + (p.bootsBonusMps || 0)) * playerSpeedMult;
    if (p.boostTicks > 0) currentSpeed *= 1.5;
    if (p.slowTicks > 0) currentSpeed *= 0.45;
    if (p.reverseTicks > 0) currentSpeed *= 0.6;
    p.speed = Number(currentSpeed.toFixed(1));

    const prevDist = p.distance;
    p.distance = Math.min(state.targetDistance, p.distance + currentSpeed * dtSec);

    // Announce 500m adrenaline milestones for human lead runner
    if (!p.isBot && Math.floor(p.distance / 500) > Math.floor(prevDist / 500)) {
      const milestone = Math.floor(p.distance / 500) * 500;
      addLog(
        state,
        p,
        `${p.name} passed ${milestone.toLocaleString()}m — pace surged to ${playerSpeedMult.toFixed(2)}x (${p.speed} m/s)!`,
        'neutral',
      );
    }

    for (const pk of state.pickups) {
      // Track obstacle avoidance / passing for clear_obstacles qualification levels
      if (
        !pk.isBeneficial &&
        pk.kind !== 'mystery' &&
        pk.distance < prevDist &&
        !(pk.consumedBy ?? []).includes(p.id) &&
        !(pk.passedBy ?? []).includes(p.id)
      ) {
        pk.passedBy = pk.passedBy ?? [];
        pk.passedBy.push(p.id);
        p.obstaclesCleared += 1;
      }

      if (pk.lane !== p.lane) continue;
      if (pk.consumedBy && pk.consumedBy.includes(p.id)) continue;
      if (pk.distance >= prevDist - 5 && pk.distance <= p.distance + 8) {
        pk.consumedBy = pk.consumedBy ?? [];
        pk.consumedBy.push(p.id);
        applyPickupEffect(state, p, pk, cfg.perkPowerMultiplier);
        if (state.status !== 'playing') {
          return true;
        }
      }
    }

    // Check collection or obstacle-clearance task win for human player in Single-Player Tournament
    if (
      state.mode === 'campaign' &&
      !p.isBot &&
      state.task &&
      state.task.type !== 'distance_sprint'
    ) {
      const progress = getPlayerTaskProgress(p, state.task);
      if (progress >= state.task.targetCount) {
        p.finishTimeMs = state.elapsedMs;
        state.status = 'finished';
        state.winnerId = p.id;
        state.outcomeReason = `Mission complete: ${state.task.title} (${state.task.targetCount}/${state.task.targetCount})!`;
        addLog(
          state,
          p,
          `${p.name} completed "${state.task.title}" in ${(state.elapsedMs / 1000).toFixed(1)}s to clear Level ${state.campaignLevel}!`,
          'victory',
        );
        return true;
      }
    }

    if (p.distance >= state.targetDistance) {
      p.distance = state.targetDistance;
      p.finishTimeMs = state.elapsedMs;
      state.status = 'finished';

      if (
        state.mode === 'campaign' &&
        state.task &&
        state.task.type !== 'distance_sprint'
      ) {
        if (!p.isBot) {
          const rival = state.players.find((pl) => pl.id !== p.id);
          const got = getPlayerTaskProgress(p, state.task);
          state.winnerId = rival?.id ?? 'task-incomplete';
          state.outcomeReason = `Reached ${state.targetDistance.toLocaleString()}m with ${got}/${state.task.targetCount} progress. Restart to complete "${state.task.title}".`;
          addLog(
            state,
            p,
            `${p.name} reached the end before completing "${state.task.title}" (${got}/${state.task.targetCount}).`,
            'hazard',
          );
        } else {
          state.winnerId = p.id;
          state.outcomeReason = `${p.name} crossed ${state.targetDistance.toLocaleString()}m before you completed "${state.task.title}".`;
          addLog(
            state,
            p,
            `${p.name} reached the finish before you cleared "${state.task.title}"!`,
            'hazard',
          );
        }
        return true;
      }

      state.winnerId = p.id;
      state.outcomeReason = `${p.name} crossed the ${state.targetDistance.toLocaleString()}m finish line in ${(state.elapsedMs / 1000).toFixed(1)}s!`;
      addLog(
        state,
        p,
        `${p.name} crossed the ${state.targetDistance.toLocaleString()}m finish line in ${(state.elapsedMs / 1000).toFixed(1)}s to win!`,
        'victory',
      );
      return true;
    }
  }

  return true;
}

export function resetMatchForRematch(
  state: MatchState,
  hostStartingPowerups?: Partial<PlayerPowerups>,
): void {
  const cfg = getRaceConfig(state);
  state.status = 'countdown';
  state.countdownMs = PRE_RACE_COUNTDOWN_MS;
  state.winnerId = null;
  state.outcomeReason = undefined;
  state.elapsedMs = 0;
  state.speedMultiplier = 1.0;
  state.targetDistance = cfg.targetDistance;
  state.perkSizePx = cfg.perkSizePx;
  state.task = cfg.task;
  state.rulesSummary = cfg.rulesSummary;
  state.pickups = generateRaceTrackPickups(
    state.realm,
    cfg.targetDistance,
    cfg.hazardDensity,
    cfg.task?.type,
  );

  const laneOrder: RaceLane[] = [1, 0, 2, 1];
  state.players.forEach((p, idx) => {
    p.distance = 0;
    p.lane = laneOrder[idx % laneOrder.length];
    p.speed = Number((cfg.baseSpeed + (p.bootsBonusMps || 0)).toFixed(1));
    p.lives = 3;
    p.maxLives = 3;
    p.boostTicks = 0;
    p.slowTicks = 0;
    p.reverseTicks = 0;
    p.leapTicks = 0;
    p.jumpTicks = 0;
    p.hasShield = false;
    p.perksCollected = 0;
    p.boostsCollected = 0;
    p.heartsCollected = 0;
    p.cachesCollected = 0;
    p.obstaclesCleared = 0;
    p.coinsCollected = 0;
    p.hazardsHit = 0;
    p.swapsMade = 0;
    p.finishTimeMs = null;
    p.botSteerCooldownTicks = 8 + Math.floor(Math.random() * 6);
    p.powerupsUsed = { leap: 0, swap: 0, boost: 0, shield: 0 };
    p.powerupsGained = { leap: 0, swap: 0, boost: 0, shield: 0 };
    p.lastPowerupNotice = undefined;
    if (p.id === state.hostId && hostStartingPowerups) {
      p.powerups = {
        leap: Math.max(0, Math.min(99, hostStartingPowerups.leap ?? p.powerups.leap)),
        swap: Math.max(0, Math.min(99, hostStartingPowerups.swap ?? p.powerups.swap)),
        boost: Math.max(0, Math.min(99, hostStartingPowerups.boost ?? p.powerups.boost)),
        shield: Math.max(0, Math.min(99, hostStartingPowerups.shield ?? p.powerups.shield)),
      };
    } else if (p.isBot) {
      p.powerups = { leap: 1, swap: 0, boost: 1, shield: 1 };
    }
  });

  state.logs = [
    {
      id: `rematch-${Date.now()}`,
      timestamp: Date.now(),
      playerId: state.players[0].id,
      playerName: state.players[0].name,
      crystalColor: state.players[0].crystalColor,
      message: `Get ready! Rematch starts in 3 seconds — pick your lane!`,
      tone: 'perk',
    },
  ];
}
