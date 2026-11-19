import {
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import { db, handleFirestoreError, OperationType } from '../lib/firebase.ts';
import {
  getRoundMilestoneReward,
  getTournamentLevelConfig,
  POWERUP_INFO,
} from '../shared/boardData.ts';
import {
  computeLevelFromXp,
  computeRoundRank,
  computeTierFromRating,
  CrystalColor,
  CURRENT_SEASON_ID,
  GameMode,
  getActiveGlobalTournamentSchedule,
  getRoundsCompleted,
  LeaderboardEntry,
  MarketMission,
  MatchRecord,
  PlayerPowerups,
  PowerupType,
  RealmId,
  RoundTournamentEntry,
  UserProfile,
} from '../shared/gameTypes.ts';

function sanitizeDisplayName(raw: string | null | undefined): string {
  const cleaned = (raw || 'Explorer').trim().replace(/\s+/g, ' ').slice(0, 32);
  return cleaned.length > 0 ? cleaned : 'Explorer';
}

export function createDefaultGuestProfile(name = 'Guest Runner'): UserProfile {
  return {
    uid: 'guest-local',
    displayName: sanitizeDisplayName(name),
    crystalColor: 'ruby',
    xp: 0,
    level: 1,
    coins: 150,
    highestCampaignLevel: 1,
    unlockedRealms: ['jungle', 'desert', 'dragon', 'neon'],
    unlockedSkins: ['classic_facet'],
    powerupInventory: {
      leap: 2,
      swap: 1,
      boost: 1,
      shield: 1,
    },
    speedUpgradeLevel: 0,
  };
}

export async function ensureUserProfile(user: User): Promise<UserProfile> {
  const userPath = `users/${user.uid}`;
  const userRef = doc(db, 'users', user.uid);
  try {
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }

    const displayName = sanitizeDisplayName(user.displayName || user.email?.split('@')[0]);
    const initialProfile: UserProfile = {
      uid: user.uid,
      displayName,
      crystalColor: 'ruby',
      xp: 0,
      level: 1,
      coins: 200,
      highestCampaignLevel: 1,
      unlockedRealms: ['jungle', 'desert', 'dragon', 'neon'],
      unlockedSkins: ['classic_facet'],
      powerupInventory: { leap: 2, swap: 1, boost: 1, shield: 1 },
      speedUpgradeLevel: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const initialLeaderboard: LeaderboardEntry = {
      uid: user.uid,
      displayName,
      crystalColor: 'ruby',
      rating: 1000,
      tier: computeTierFromRating(1000),
      wins: 0,
      gamesPlayed: 0,
      level: 1,
      roundsCompleted: 0,
      playerRank: computeRoundRank(0).title,
      seasonId: CURRENT_SEASON_ID,
      updatedAt: serverTimestamp(),
    };

    const batch = writeBatch(db);
    batch.set(userRef, initialProfile);
    batch.set(doc(db, 'leaderboard', user.uid), initialLeaderboard);
    await batch.commit();
    return initialProfile;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, userPath);
  }
}

export function subscribeUserProfile(
  uid: string,
  onChange: (profile: UserProfile | null) => void,
  onError?: (err: Error) => void,
): () => void {
  const userPath = `users/${uid}`;
  return onSnapshot(
    doc(db, 'users', uid),
    (snap) => {
      onChange(snap.exists() ? (snap.data() as UserProfile) : null);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, userPath);
      } catch (err) {
        onError?.(err as Error);
      }
    },
  );
}

export function subscribeMatchHistory(
  uid: string,
  onChange: (records: MatchRecord[]) => void,
  onError?: (err: Error) => void,
): () => void {
  const path = `users/${uid}/matches`;
  const q = query(
    collection(db, 'users', uid, 'matches'),
    where('uid', '==', uid),
    limit(25),
  );
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => d.data() as MatchRecord);
      items.sort((a, b) => {
        const at = (a.createdAt as { toMillis?: () => number } | undefined)?.toMillis?.() ?? 0;
        const bt = (b.createdAt as { toMillis?: () => number } | undefined)?.toMillis?.() ?? 0;
        return bt - at;
      });
      onChange(items.slice(0, 15));
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (err) {
        onError?.(err as Error);
      }
    },
  );
}

export function subscribeGlobalLeaderboard(
  onChange: (entries: LeaderboardEntry[]) => void,
  onError?: (err: Error) => void,
): () => void {
  const path = 'leaderboard';
  const q = query(
    collection(db, 'leaderboard'),
    where('seasonId', '==', CURRENT_SEASON_ID),
    limit(50),
  );
  return onSnapshot(
    q,
    (snap) => {
      const entries = snap.docs.map((d) => d.data() as LeaderboardEntry);
      entries.sort((a, b) => b.rating - a.rating);
      onChange(entries.slice(0, 25));
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (err) {
        onError?.(err as Error);
      }
    },
  );
}

export function subscribeRoundTournamentStandings(
  roundNumber: number,
  onChange: (entries: RoundTournamentEntry[]) => void,
  onError?: (err: Error) => void,
): () => void {
  const safeRound = Math.min(1000, Math.max(1, Math.floor(roundNumber)));
  const path = 'round_entries';
  const q = query(
    collection(db, 'round_entries'),
    where('roundNumber', '==', safeRound),
    limit(100),
  );
  return onSnapshot(
    q,
    (snap) => {
      const entries = snap.docs.map((d) => d.data() as RoundTournamentEntry);
      entries.sort((a, b) => {
        if (a.completedRound !== b.completedRound) {
          return a.completedRound ? -1 : 1;
        }
        if (a.completedRound && b.completedRound) {
          const at = (a.updatedAt as { toMillis?: () => number } | undefined)?.toMillis?.() ?? Number.MAX_SAFE_INTEGER;
          const bt = (b.updatedAt as { toMillis?: () => number } | undefined)?.toMillis?.() ?? Number.MAX_SAFE_INTEGER;
          if (at !== bt) return at - bt; // First to finish wins #1
          return a.totalClearTimeMs - b.totalClearTimeMs;
        }
        if (b.stagesCleared !== a.stagesCleared) {
          return b.stagesCleared - a.stagesCleared;
        }
        return a.totalClearTimeMs - b.totalClearTimeMs;
      });
      onChange(entries.slice(0, 30));
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (err) {
        onError?.(err as Error);
      }
    },
  );
}

export async function updatePlayerLoadout(
  uid: string,
  updates: { displayName?: string; crystalColor?: CrystalColor },
): Promise<void> {
  const userPath = `users/${uid}`;
  try {
    const cleanUpdates: Record<string, unknown> = { updatedAt: serverTimestamp() };
    const lbUpdates: Record<string, unknown> = { updatedAt: serverTimestamp() };

    if (updates.displayName !== undefined) {
      const cleanName = sanitizeDisplayName(updates.displayName);
      cleanUpdates.displayName = cleanName;
      lbUpdates.displayName = cleanName;
    }
    if (updates.crystalColor !== undefined) {
      cleanUpdates.crystalColor = updates.crystalColor;
      lbUpdates.crystalColor = updates.crystalColor;
    }

    const batch = writeBatch(db);
    batch.update(doc(db, 'users', uid), cleanUpdates);
    batch.update(doc(db, 'leaderboard', uid), lbUpdates);
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, userPath);
  }
}

export async function purchasePowerupCharge(
  profile: UserProfile,
  powerup: PowerupType,
): Promise<void> {
  const cost = POWERUP_INFO[powerup].cost;
  if (profile.coins < cost) {
    throw new Error(`Requires ${cost} Gold to purchase ${POWERUP_INFO[powerup].name}.`);
  }
  const currentCount = profile.powerupInventory[powerup] ?? 0;
  if (currentCount >= 99) {
    throw new Error('Inventory limit reached for this power-up.');
  }

  const userPath = `users/${profile.uid}`;
  try {
    await updateDoc(doc(db, 'users', profile.uid), {
      coins: profile.coins - cost,
      powerupInventory: {
        ...profile.powerupInventory,
        [powerup]: currentCount + 1,
      },
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, userPath);
  }
}

export async function purchaseMarketMission(
  profile: UserProfile,
  currentLeaderboard: LeaderboardEntry | null,
  mission: MarketMission,
): Promise<void> {
  if (profile.coins < mission.costGold) {
    throw new Error(`Requires ${mission.costGold} Gold for ${mission.title}.`);
  }
  const existingMissions = profile.purchasedMissions ?? [];
  if (existingMissions.includes(mission.id)) {
    throw new Error(`${mission.title} has already been completed.`);
  }
  if (existingMissions.length >= 20) {
    throw new Error('Market mission archive limit reached.');
  }

  const nextSpeedLevel = Math.min(
    10,
    (profile.speedUpgradeLevel ?? 0) + mission.speedBoostLevels,
  );
  const nextMissions = [...existingMissions, mission.id];
  const nextXp = Math.min(10000000, profile.xp + mission.xpGain);
  const nextLevel = computeLevelFromXp(nextXp);
  const updatedPowerups = { ...profile.powerupInventory };
  if (mission.bonusPerks) {
    (Object.keys(mission.bonusPerks) as PowerupType[]).forEach((k) => {
      const add = mission.bonusPerks?.[k] ?? 0;
      updatedPowerups[k] = Math.min(99, (updatedPowerups[k] ?? 0) + add);
    });
  }

  const baseRating = currentLeaderboard?.rating ?? 1000;
  const newRating = Math.min(10000, Math.max(0, baseRating + mission.ratingGain));
  const newTier = computeTierFromRating(newRating);
  const roundsCompleted = getRoundsCompleted(profile.highestCampaignLevel);
  const playerRank = computeRoundRank(roundsCompleted).title;

  const userPath = `users/${profile.uid}`;
  try {
    const batch = writeBatch(db);
    batch.update(doc(db, 'users', profile.uid), {
      coins: profile.coins - mission.costGold,
      xp: nextXp,
      level: nextLevel,
      speedUpgradeLevel: nextSpeedLevel,
      purchasedMissions: nextMissions,
      powerupInventory: updatedPowerups,
      updatedAt: serverTimestamp(),
    });

    const lbRef = doc(db, 'leaderboard', profile.uid);
    if (currentLeaderboard) {
      batch.update(lbRef, {
        rating: newRating,
        tier: newTier,
        level: nextLevel,
        updatedAt: serverTimestamp(),
      });
    } else {
      batch.set(lbRef, {
        uid: profile.uid,
        displayName: profile.displayName,
        crystalColor: profile.crystalColor,
        rating: newRating,
        tier: newTier,
        wins: 0,
        gamesPlayed: 0,
        level: nextLevel,
        roundsCompleted,
        playerRank,
        seasonId: CURRENT_SEASON_ID,
        updatedAt: serverTimestamp(),
      });
    }

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, userPath);
  }
}

export async function recordCompletedMatch(params: {
  profile: UserProfile;
  currentLeaderboard: LeaderboardEntry | null;
  matchId: string;
  realm: RealmId;
  mode: GameMode;
  campaignLevel: number;
  won: boolean;
  placement: number;
  xpEarned: number;
  coinsEarned: number;
  matchElapsedMs?: number;
  finalMatchPowerups?: PlayerPowerups;
}): Promise<{
  newLevel: number;
  newRating: number;
  unlockedSkin?: string;
  roundCompletedUnlocked?: number;
  unlockedRankTitle?: string;
  roundPerksSummary?: string;
  wonBonusPowerup?: PowerupType;
  updatedPowerups: PlayerPowerups;
}> {
  const {
    profile,
    currentLeaderboard,
    matchId,
    realm,
    mode,
    campaignLevel,
    won,
    placement,
    xpEarned,
    coinsEarned,
    matchElapsedMs = 0,
    finalMatchPowerups,
  } = params;
  const safeMatchId = matchId.replace(/[^a-zA-Z0-9_\-]/g, '').slice(0, 64) || `m-${Date.now()}`;
  const clampedXp = Math.min(2000, Math.max(0, Math.round(xpEarned)));
  const clampedCoins = Math.min(5000, Math.max(0, Math.round(coinsEarned)));
  const isRoundFinaleWin = mode === 'campaign' && won && campaignLevel % 10 === 0;
  const ratingDelta =
    mode === 'ranked'
      ? won
        ? 35
        : -15
      : isRoundFinaleWin
        ? 55
        : won
          ? 15
          : 0;

  const newXp = Math.min(10000000, profile.xp + clampedXp);
  const newLevel = computeLevelFromXp(newXp);
  const newCoins = Math.min(10000000, profile.coins + clampedCoins);

  let nextHighestCampaign = profile.highestCampaignLevel;
  const nextSkins = [...profile.unlockedSkins];
  let unlockedSkin: string | undefined;
  let roundCompletedUnlocked: number | undefined;
  let unlockedRankTitle: string | undefined;
  let roundPerksSummary: string | undefined;

  const basePowerups = finalMatchPowerups ?? profile.powerupInventory;
  const updatedPowerups: PlayerPowerups = {
    leap: Math.max(0, Math.min(99, Math.floor(basePowerups.leap ?? 0))),
    swap: Math.max(0, Math.min(99, Math.floor(basePowerups.swap ?? 0))),
    boost: Math.max(0, Math.min(99, Math.floor(basePowerups.boost ?? 0))),
    shield: Math.max(0, Math.min(99, Math.floor(basePowerups.shield ?? 0))),
  };
  let wonBonusPowerup: PowerupType | undefined;

  if (mode === 'campaign' && won) {
    if (campaignLevel >= nextHighestCampaign && nextHighestCampaign < 10000) {
      nextHighestCampaign = Math.min(10000, campaignLevel + 1);
      if (campaignLevel % 10 === 0) {
        const completedRound = Math.floor(campaignLevel / 10);
        const milestone = getRoundMilestoneReward(completedRound);
        updatedPowerups.shield = Math.min(99, (updatedPowerups.shield ?? 0) + milestone.shieldGain);
        updatedPowerups.boost = Math.min(99, (updatedPowerups.boost ?? 0) + milestone.jetpackGain);
        updatedPowerups.leap = Math.min(99, (updatedPowerups.leap ?? 0) + milestone.leapGain);
        updatedPowerups.swap = Math.min(99, (updatedPowerups.swap ?? 0) + milestone.swapGain);
        roundCompletedUnlocked = completedRound;
        unlockedRankTitle = computeRoundRank(completedRound).title;
        roundPerksSummary = milestone.summary;
      }
    }
    const levelInfo = getTournamentLevelConfig(campaignLevel);
    if (levelInfo.unlockSkinId && !nextSkins.includes(levelInfo.unlockSkinId) && nextSkins.length < 20) {
      nextSkins.push(levelInfo.unlockSkinId);
      unlockedSkin = levelInfo.unlockSkinId;
    }
  }

  // Victory bonus power-up drop
  if (won) {
    const bonusPool: PowerupType[] = ['leap', 'swap', 'boost', 'shield'];
    const picked = bonusPool[Math.floor(Math.random() * bonusPool.length)];
    updatedPowerups[picked] = Math.min(99, (updatedPowerups[picked] ?? 0) + 1);
    wonBonusPowerup = picked;
  }

  const roundsCompleted = getRoundsCompleted(nextHighestCampaign);
  const playerRank = computeRoundRank(roundsCompleted).title;

  const baseRating = currentLeaderboard?.rating ?? 1000;
  const newRating = Math.min(10000, Math.max(0, baseRating + ratingDelta));
  const newTier = computeTierFromRating(newRating);
  const newGamesPlayed = Math.min(100000, (currentLeaderboard?.gamesPlayed ?? 0) + 1);
  const newWins = Math.min(newGamesPlayed, (currentLeaderboard?.wins ?? 0) + (won ? 1 : 0));

  const userPath = `users/${profile.uid}`;
  try {
    // Check existing round tournament entry if this was a tournament win
    let roundEntryWrite: {
      ref: ReturnType<typeof doc>;
      isNew: boolean;
      payload: Record<string, unknown>;
    } | null = null;

    if (mode === 'campaign' && won) {
      const roundNum = Math.min(1000, Math.max(1, Math.ceil(campaignLevel / 10)));
      const stageInRound = ((campaignLevel - 1) % 10) + 1;
      const entryId = `${roundNum}_${profile.uid}`.slice(0, 140);
      const entryRef = doc(db, 'round_entries', entryId);
      const existingSnap = await getDoc(entryRef);
      const existingData = existingSnap.exists()
        ? (existingSnap.data() as RoundTournamentEntry)
        : null;
      const schedule = getActiveGlobalTournamentSchedule();
      const sameWindow = existingData?.tournamentWindowId === schedule.windowId;
      const prevStages = sameWindow ? existingData?.stagesCleared ?? 0 : 0;
      const nextStages = Math.min(10, Math.max(prevStages, stageInRound));
      const prevTime = sameWindow ? existingData?.totalClearTimeMs ?? 0 : 0;
      const addedTime = Math.max(1000, Math.round(matchElapsedMs));
      const nextTime = Math.min(36000000, prevTime + addedTime);
      const completedRoundNow = nextStages >= 10;

      roundEntryWrite = {
        ref: entryRef,
        isNew: !existingSnap.exists(),
        payload: existingSnap.exists()
          ? {
              displayName: profile.displayName,
              crystalColor: profile.crystalColor,
              stagesCleared: nextStages,
              completedRound: completedRoundNow,
              totalClearTimeMs: nextTime,
              tournamentWindowId: schedule.windowId,
              updatedAt: serverTimestamp(),
            }
          : {
              entryId,
              uid: profile.uid,
              displayName: profile.displayName,
              crystalColor: profile.crystalColor,
              roundNumber: roundNum,
              stagesCleared: nextStages,
              completedRound: completedRoundNow,
              totalClearTimeMs: nextTime,
              tournamentWindowId: schedule.windowId,
              updatedAt: serverTimestamp(),
            },
      };
    }

    const batch = writeBatch(db);
    batch.update(doc(db, 'users', profile.uid), {
      xp: newXp,
      level: newLevel,
      coins: newCoins,
      highestCampaignLevel: nextHighestCampaign,
      unlockedSkins: nextSkins.slice(0, 20),
      powerupInventory: updatedPowerups,
      updatedAt: serverTimestamp(),
    });

    const lbRef = doc(db, 'leaderboard', profile.uid);
    if (currentLeaderboard) {
      batch.update(lbRef, {
        displayName: profile.displayName,
        crystalColor: profile.crystalColor,
        rating: newRating,
        tier: newTier,
        wins: newWins,
        gamesPlayed: newGamesPlayed,
        level: newLevel,
        roundsCompleted,
        playerRank,
        seasonId: CURRENT_SEASON_ID,
        updatedAt: serverTimestamp(),
      });
    } else {
      batch.set(lbRef, {
        uid: profile.uid,
        displayName: profile.displayName,
        crystalColor: profile.crystalColor,
        rating: newRating,
        tier: newTier,
        wins: newWins,
        gamesPlayed: newGamesPlayed,
        level: newLevel,
        roundsCompleted,
        playerRank,
        seasonId: CURRENT_SEASON_ID,
        updatedAt: serverTimestamp(),
      });
    }

    if (roundEntryWrite) {
      if (roundEntryWrite.isNew) {
        batch.set(roundEntryWrite.ref, roundEntryWrite.payload);
      } else {
        batch.update(roundEntryWrite.ref, roundEntryWrite.payload);
      }
    }

    batch.set(doc(db, 'users', profile.uid, 'matches', safeMatchId), {
      matchId: safeMatchId,
      uid: profile.uid,
      realm,
      mode,
      placement: Math.min(4, Math.max(1, placement)),
      ratingDelta,
      xpEarned: clampedXp,
      coinsEarned: clampedCoins,
      createdAt: serverTimestamp(),
    });

    await batch.commit();
    return {
      newLevel,
      newRating,
      unlockedSkin,
      roundCompletedUnlocked,
      unlockedRankTitle,
      roundPerksSummary,
      wonBonusPowerup,
      updatedPowerups,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, userPath);
  }
}
