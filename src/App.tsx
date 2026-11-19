import { useCallback, useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import { Globe, LayoutDashboard, Music, Shield, Trophy, VolumeX, Zap } from 'lucide-react';
import { ArenaView } from './components/ArenaView.tsx';
import { AudioSettingsModal } from './components/AudioSettingsModal.tsx';
import { CampaignView } from './components/CampaignView.tsx';
import { DashboardView } from './components/DashboardView.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { LeaderboardView } from './components/LeaderboardView.tsx';
import { VaultView } from './components/VaultView.tsx';
import { auth, googleProvider, testFirestoreConnection } from './lib/firebase.ts';
import { soundFx, ThemeTrack } from './lib/soundFx.ts';
import {
  createDefaultGuestProfile,
  ensureUserProfile,
  purchaseMarketMission,
  purchasePowerupCharge,
  recordCompletedMatch,
  subscribeGlobalLeaderboard,
  subscribeMatchHistory,
  subscribeUserProfile,
  updatePlayerLoadout,
} from './services/progressionService.ts';
import {
  getRoundMilestoneReward,
  getTournamentLevelConfig,
  POWERUP_INFO,
} from './shared/boardData.ts';
import {
  CampaignLevel,
  ChatMessage,
  computeRoundRank,
  CrystalColor,
  DEFAULT_RACE_DISTANCE,
  GameMode,
  getBootsBonusMps,
  getRoundsCompleted,
  LeaderboardEntry,
  MarketMission,
  MatchRecord,
  MatchState,
  PlayerPowerups,
  PowerupType,
  RealmId,
  UserProfile,
} from './shared/gameTypes.ts';

type AppTab = 'dashboard' | 'arena' | 'campaign' | 'leaderboard' | 'vault';

function getOrCreateGuestId(): string {
  const key = 'relic_trail_client_id';
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;
  const created = `guest-${Math.random().toString(36).slice(2, 10)}`;
  window.localStorage.setItem(key, created);
  return created;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('dashboard');
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const [guestProfile, setGuestProfile] = useState<UserProfile>(() =>
    createDefaultGuestProfile(),
  );
  const [cloudProfile, setCloudProfile] = useState<UserProfile | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [matchHistory, setMatchHistory] = useState<MatchRecord[]>([]);
  const [equippedSkin, setEquippedSkin] = useState<string>('classic_facet');

  const [selectedRealm, setSelectedRealm] = useState<RealmId>('jungle');
  const [selectedDistance, setSelectedDistance] = useState<number>(DEFAULT_RACE_DISTANCE);
  const [matchState, setMatchState] = useState<MatchState | null>(null);
  const [inQueue, setInQueue] = useState(false);
  const [queueCount, setQueueCount] = useState(0);
  const [globalMessages, setGlobalMessages] = useState<ChatMessage[]>([]);
  const [roomMessages, setRoomMessages] = useState<ChatMessage[]>([]);
  const [toastError, setToastError] = useState<string | null>(null);
  const [musicEnabled, setMusicEnabled] = useState<boolean>(() => soundFx.musicEnabled);
  const [musicVolume, setMusicVolume] = useState<number>(() => soundFx.musicVolume);
  const [sfxEnabled, setSfxEnabled] = useState<boolean>(() => soundFx.sfxEnabled);
  const [audioModalOpen, setAudioModalOpen] = useState<boolean>(false);
  const [lastRewardSummary, setLastRewardSummary] = useState<{
    xpEarned: number;
    coinsEarned: number;
    ratingDelta: number;
    won: boolean;
    unlockedSkin?: string;
    roundCompletedUnlocked?: number;
    unlockedRankTitle?: string;
    roundPerksSummary?: string;
    powerupsUsed?: PlayerPowerups;
    powerupsGained?: PlayerPowerups;
    wonBonusPowerup?: PowerupType;
    finalPowerups?: PlayerPowerups;
  } | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const recordedMatchesRef = useRef<Set<string>>(new Set());
  const lastLogIdRef = useRef<string | null>(null);
  const lastCoinCountRef = useRef<number>(0);

  const profile = cloudProfile ?? guestProfile;
  const clientId = firebaseUser?.uid ?? getOrCreateGuestId();
  const roundsCompleted = getRoundsCompleted(profile.highestCampaignLevel);
  const playerRank = computeRoundRank(roundsCompleted);
  const bootsBonusMps = getBootsBonusMps(roundsCompleted, profile.speedUpgradeLevel ?? 0);

  // Keep refs fresh for WebSocket callbacks
  const clientIdRef = useRef(clientId);
  clientIdRef.current = clientId;
  const profileRef = useRef(profile);
  profileRef.current = profile;

  const activeThemeTrack: ThemeTrack =
    matchState?.status === 'playing' || matchState?.status === 'countdown' ? 'race' : 'lobby';

  // Switch between Lobby and In-Game Race Theme Songs automatically
  useEffect(() => {
    soundFx.setThemeTrack(activeThemeTrack);
  }, [activeThemeTrack]);

  // Unlock Web Audio on first gesture & trigger interactive bloop on buttons/icons
  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      soundFx.unlockAudio();
      const target = e.target as HTMLElement | null;
      if (target && target.closest('button, [role="button"], select')) {
        soundFx.playBloop(Math.floor(Math.random() * 4));
      }
    };
    const handleKeyUnlock = () => {
      soundFx.unlockAudio();
    };
    window.addEventListener('pointerdown', handlePointerDown, true);
    window.addEventListener('keydown', handleKeyUnlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown, true);
      window.removeEventListener('keydown', handleKeyUnlock);
    };
  }, []);

  const handleToggleMusic = (enabled: boolean) => {
    soundFx.musicEnabled = enabled;
    setMusicEnabled(enabled);
  };

  const handleChangeMusicVolume = (volume: number) => {
    soundFx.musicVolume = volume;
    setMusicVolume(soundFx.musicVolume);
  };

  const handleToggleSfx = (enabled: boolean) => {
    soundFx.sfxEnabled = enabled;
    setSfxEnabled(enabled);
  };

  // 1. Test Firestore connectivity + subscribe Auth & Public Leaderboard
  useEffect(() => {
    testFirestoreConnection();

    const unsubLeaderboard = subscribeGlobalLeaderboard(
      (entries) => setLeaderboard(entries),
      (err) => console.warn('Leaderboard subscription error:', err.message),
    );

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      setAuthReady(true);
      if (user) {
        try {
          await ensureUserProfile(user);
        } catch (err) {
          console.error('Failed to ensure user profile:', err);
        }
      } else {
        setCloudProfile(null);
        setMatchHistory([]);
      }
    });

    return () => {
      unsubLeaderboard();
      unsubAuth();
    };
  }, []);

  // 2. Subscribe to user's private profile & match history when signed in
  useEffect(() => {
    if (!authReady || !firebaseUser) return;
    const unsubProfile = subscribeUserProfile(
      firebaseUser.uid,
      (p) => setCloudProfile(p),
      (err) => console.warn('Profile subscription error:', err.message),
    );
    const unsubHistory = subscribeMatchHistory(
      firebaseUser.uid,
      (records) => setMatchHistory(records),
      (err) => console.warn('Match history error:', err.message),
    );
    return () => {
      unsubProfile();
      unsubHistory();
    };
  }, [authReady, firebaseUser]);

  // 3. Connect & maintain WebSocket connection for real-time multiplayer
  const sendWs = useCallback((payload: unknown) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    } else {
      setToastError('Connecting to game server — try again in a moment.');
    }
  }, []);

  useEffect(() => {
    let disposed = false;

    const connect = () => {
      if (disposed) return;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            type: 'client:hello',
            clientId: clientIdRef.current,
            name: profileRef.current.displayName,
          }),
        );
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'room:state') {
            setMatchState(msg.state as MatchState);
            setInQueue(false);
            setActiveTab('arena');
          } else if (msg.type === 'matchmaking:matched') {
            setInQueue(false);
            setActiveTab('arena');
          } else if (msg.type === 'queue:status') {
            setInQueue(Boolean(msg.inQueue));
            setQueueCount(Number(msg.queueCount || 0));
          } else if (msg.type === 'room:left') {
            setMatchState(null);
            setRoomMessages([]);
          } else if (msg.type === 'chat:history') {
            const list = Array.isArray(msg.messages) ? (msg.messages as ChatMessage[]) : [];
            if (msg.channel === 'global') {
              setGlobalMessages(list);
            } else {
              setRoomMessages(list);
            }
          } else if (msg.type === 'chat:message' && msg.message) {
            const chatMsg = msg.message as ChatMessage;
            if (chatMsg.channel === 'global') {
              setGlobalMessages((prev) => [...prev, chatMsg].slice(-60));
            } else {
              setRoomMessages((prev) => [...prev, chatMsg].slice(-60));
            }
          } else if (msg.type === 'error') {
            setToastError(String(msg.message || 'Action rejected.'));
          }
        } catch {
          // Ignore malformed frame
        }
      };

      ws.onclose = () => {
        if (!disposed) {
          reconnectTimerRef.current = window.setTimeout(connect, 1500);
        }
      };
    };

    connect();
    return () => {
      disposed = true;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      wsRef.current?.close();
    };
  }, []);

  // Re-identify on WebSocket when user signs in/out
  useEffect(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'client:hello',
          clientId,
          name: profile.displayName,
        }),
      );
    }
  }, [clientId, profile.displayName]);

  // 4. Audio feedback for incoming match log events + coin pickups + Match completion persistence
  useEffect(() => {
    if (!matchState) {
      lastCoinCountRef.current = 0;
      return;
    }
    const myRunner = matchState.players.find((p) => p.id === clientId);
    if (myRunner) {
      if (myRunner.coinsCollected > lastCoinCountRef.current) {
        soundFx.playCoin();
      }
      lastCoinCountRef.current = myRunner.coinsCollected;
    }

    const latest = matchState.logs[0];
    if (latest && latest.id !== lastLogIdRef.current) {
      lastLogIdRef.current = latest.id;
      if (latest.tone === 'hazard') soundFx.playHazard();
      else if (latest.tone === 'perk') soundFx.playPerk();
      else if (latest.tone === 'powerup') soundFx.playPowerup();
      else if (latest.tone === 'victory') soundFx.playVictory();
    }

    if (
      matchState.status === 'finished' &&
      matchState.winnerId &&
      !recordedMatchesRef.current.has(matchState.roomId)
    ) {
      recordedMatchesRef.current.add(matchState.roomId);
      const sorted = [...matchState.players].sort((a, b) => b.distance - a.distance);
      const placementIdx = sorted.findIndex((p) => p.id === clientId);
      const placement = placementIdx >= 0 ? placementIdx + 1 : 4;
      const won = matchState.winnerId === clientId;

      const campaignCfg =
        matchState.mode === 'campaign'
          ? getTournamentLevelConfig(matchState.campaignLevel)
          : null;

      const baseXp =
        matchState.mode === 'campaign' && campaignCfg
          ? campaignCfg.rewardXp
          : Math.round(120 + (matchState.targetDistance / 1000) * 35);
      const baseGold =
        matchState.mode === 'campaign' && campaignCfg
          ? campaignCfg.rewardGold
          : Math.round(90 + (matchState.targetDistance / 1000) * 30);

      const trackCoinsGold = (myRunner?.coinsCollected ?? 0) * 10;
      const isTournamentLoss = matchState.mode === 'campaign' && !won;
      const isRoundFinaleWin = matchState.mode === 'campaign' && won && matchState.campaignLevel % 10 === 0;
      const xpEarned = isTournamentLoss ? 0 : won ? baseXp : Math.round(baseXp * 0.4);
      const rewardGold = isTournamentLoss ? 0 : won ? baseGold : Math.round(baseGold * 0.3);
      const coinsEarned = Math.min(5000, rewardGold + trackCoinsGold);
      const ratingDelta =
        matchState.mode === 'ranked'
          ? won
            ? 35
            : -15
          : isRoundFinaleWin
            ? 55
            : won
              ? 15
              : 0;

      if (firebaseUser && cloudProfile) {
        const myLb = leaderboard.find((e) => e.uid === firebaseUser.uid) ?? null;
        recordCompletedMatch({
          profile: cloudProfile,
          currentLeaderboard: myLb,
          matchId: `${matchState.roomId}-${Math.round(matchState.elapsedMs)}`,
          realm: matchState.realm,
          mode: matchState.mode,
          campaignLevel: matchState.campaignLevel,
          won,
          placement,
          xpEarned,
          coinsEarned,
          matchElapsedMs: matchState.elapsedMs,
          finalMatchPowerups: myRunner?.powerups,
        })
          .then((res) => {
            setLastRewardSummary({
              xpEarned,
              coinsEarned,
              ratingDelta,
              won,
              unlockedSkin: res.unlockedSkin,
              roundCompletedUnlocked: res.roundCompletedUnlocked,
              unlockedRankTitle: res.unlockedRankTitle,
              roundPerksSummary: res.roundPerksSummary,
              powerupsUsed: myRunner?.powerupsUsed,
              powerupsGained: myRunner?.powerupsGained,
              wonBonusPowerup: res.wonBonusPowerup,
              finalPowerups: res.updatedPowerups,
            });
          })
          .catch((err) => {
            console.error('Failed to persist match result:', err);
          });
      } else {
        // Guest fallback progression in local state (infinite rounds!)
        const prev = guestProfile;
        const nextXp = prev.xp + xpEarned;
        const nextLevel = Math.min(50, Math.floor(Math.sqrt(nextXp / 100)) + 1);
        let nextHighest = prev.highestCampaignLevel;
        let roundCompletedUnlocked: number | undefined;
        let unlockedRankTitle: string | undefined;
        let roundPerksSummary: string | undefined;
        const basePowerups = myRunner?.powerups ?? prev.powerupInventory;
        const updatedPowerups: PlayerPowerups = {
          leap: Math.max(0, Math.min(99, Math.floor(basePowerups.leap ?? 0))),
          swap: Math.max(0, Math.min(99, Math.floor(basePowerups.swap ?? 0))),
          boost: Math.max(0, Math.min(99, Math.floor(basePowerups.boost ?? 0))),
          shield: Math.max(0, Math.min(99, Math.floor(basePowerups.shield ?? 0))),
        };
        let wonBonusPowerup: PowerupType | undefined;

        if (
          matchState.mode === 'campaign' &&
          won &&
          matchState.campaignLevel >= prev.highestCampaignLevel &&
          prev.highestCampaignLevel < 10000
        ) {
          nextHighest = Math.min(10000, matchState.campaignLevel + 1);
          if (matchState.campaignLevel % 10 === 0) {
            const completedRound = Math.floor(matchState.campaignLevel / 10);
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

        if (won) {
          const bonusPool: PowerupType[] = ['leap', 'swap', 'boost', 'shield'];
          const picked = bonusPool[Math.floor(Math.random() * bonusPool.length)];
          updatedPowerups[picked] = Math.min(99, (updatedPowerups[picked] ?? 0) + 1);
          wonBonusPowerup = picked;
        }

        const nextSkins = [...prev.unlockedSkins];
        let unlockedSkin: string | undefined;
        if (
          matchState.mode === 'campaign' &&
          won &&
          campaignCfg?.unlockSkinId &&
          !nextSkins.includes(campaignCfg.unlockSkinId)
        ) {
          nextSkins.push(campaignCfg.unlockSkinId);
          unlockedSkin = campaignCfg.unlockSkinId;
        }

        setGuestProfile({
          ...prev,
          xp: nextXp,
          level: nextLevel,
          coins: prev.coins + coinsEarned,
          highestCampaignLevel: nextHighest,
          unlockedSkins: nextSkins,
          powerupInventory: updatedPowerups,
        });
        setLastRewardSummary({
          xpEarned,
          coinsEarned,
          ratingDelta,
          won,
          unlockedSkin,
          roundCompletedUnlocked,
          unlockedRankTitle,
          roundPerksSummary,
          powerupsUsed: myRunner?.powerupsUsed,
          powerupsGained: myRunner?.powerupsGained,
          wonBonusPowerup,
          finalPowerups: updatedPowerups,
        });
      }
    }
  }, [matchState, clientId, firebaseUser, cloudProfile, guestProfile, leaderboard]);

  // Clear toast automatically
  useEffect(() => {
    if (!toastError) return;
    const t = setTimeout(() => setToastError(null), 4000);
    return () => clearTimeout(t);
  }, [toastError]);

  const handleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setToastError(err instanceof Error ? err.message : 'Sign-in cancelled.');
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
  };

  const handleJoinQueue = (
    realm: RealmId,
    mode: GameMode,
    targetDistance = selectedDistance,
  ) => {
    setLastRewardSummary(null);
    sendWs({
      type: 'queue:join',
      realm,
      mode,
      targetDistance,
      name: profile.displayName,
      crystalColor: profile.crystalColor,
      skinId: equippedSkin,
      bootsBonusMps,
      startingPowerups: profile.powerupInventory,
    });
  };

  const handleLeaveQueue = () => {
    sendWs({ type: 'queue:leave' });
  };

  const handleCreateRoom = (
    realm: RealmId,
    mode: GameMode,
    autoStartWithRivals: boolean,
    targetCount = 4,
    campaignLevel = 1,
    targetDistance = selectedDistance,
  ) => {
    setLastRewardSummary(null);
    sendWs({
      type: 'room:create',
      realm,
      mode,
      campaignLevel,
      targetDistance,
      autoStartWithRivals,
      targetCount,
      name: profile.displayName,
      crystalColor: profile.crystalColor,
      skinId: equippedSkin,
      bootsBonusMps,
      startingPowerups: profile.powerupInventory,
    });
  };

  const handleJoinRoomCode = (roomCode: string) => {
    setLastRewardSummary(null);
    sendWs({
      type: 'room:join',
      roomCode,
      name: profile.displayName,
      crystalColor: profile.crystalColor,
      skinId: equippedSkin,
      bootsBonusMps,
      startingPowerups: profile.powerupInventory,
    });
  };

  const handleLeaveRoom = (goToTournamentLobby = false) => {
    setLastRewardSummary(null);
    sendWs({ type: 'room:leave' });
    if (goToTournamentLobby) {
      setActiveTab('campaign');
    }
  };

  const handleSendChat = (channel: 'global' | 'room', text: string) => {
    sendWs({
      type: 'chat:send',
      channel,
      text,
      crystalColor: profile.crystalColor,
      playerRank: playerRank.title,
    });
  };

  const handleStartRoom = (fillWithBots: boolean, targetCount = 4) => {
    sendWs({ type: 'room:start', fillWithBots, targetCount });
  };

  const handleChangeLane = useCallback(
    (lane: 0 | 1 | 2) => {
      sendWs({ type: 'game:lane', lane });
    },
    [sendWs],
  );

  const handleJump = useCallback(() => {
    sendWs({ type: 'game:jump' });
  }, [sendWs]);

  const handleUsePowerup = useCallback(
    (powerup: PowerupType, targetPlayerId?: string) => {
      sendWs({ type: 'game:use_powerup', powerup, targetPlayerId });
    },
    [sendWs],
  );

  const handleRematch = () => {
    if (matchState) {
      recordedMatchesRef.current.delete(matchState.roomId);
    }
    lastCoinCountRef.current = 0;
    sendWs({ type: 'game:rematch', startingPowerups: profile.powerupInventory });
  };

  const handleLaunchCampaignLevel = (lvl: CampaignLevel, realm: RealmId) => {
    setSelectedRealm(realm);
    setActiveTab('arena');
    handleCreateRoom(realm, 'campaign', true, lvl.rivalCount + 1, lvl.level, lvl.targetDistance);
  };

  const handleUpdateLoadout = async (updates: {
    displayName?: string;
    crystalColor?: CrystalColor;
  }) => {
    if (firebaseUser) {
      await updatePlayerLoadout(firebaseUser.uid, updates);
    } else {
      setGuestProfile((prev) => ({
        ...prev,
        displayName: updates.displayName ?? prev.displayName,
        crystalColor: updates.crystalColor ?? prev.crystalColor,
      }));
    }
  };

  const handleBuyPowerup = async (powerup: PowerupType) => {
    if (firebaseUser && cloudProfile) {
      await purchasePowerupCharge(cloudProfile, powerup);
    } else {
      const cost = POWERUP_INFO[powerup].cost;
      setGuestProfile((prev) => {
        if (prev.coins < cost) throw new Error('Insufficient Relic Gold.');
        return {
          ...prev,
          coins: prev.coins - cost,
          powerupInventory: {
            ...prev.powerupInventory,
            [powerup]: (prev.powerupInventory[powerup] ?? 0) + 1,
          },
        };
      });
    }
  };

  const handlePurchaseMission = async (mission: MarketMission) => {
    if (firebaseUser && cloudProfile) {
      await purchaseMarketMission(cloudProfile, myLeaderboardEntry, mission);
    } else {
      setGuestProfile((prev) => {
        if (prev.coins < mission.costGold) {
          throw new Error(`Requires ${mission.costGold} Gold.`);
        }
        const existing = prev.purchasedMissions ?? [];
        if (existing.includes(mission.id)) {
          throw new Error('Mission already completed.');
        }
        const nextXp = prev.xp + mission.xpGain;
        const nextLevel = Math.min(50, Math.floor(Math.sqrt(nextXp / 100)) + 1);
        const updatedPerks = { ...prev.powerupInventory };
        if (mission.bonusPerks) {
          (Object.keys(mission.bonusPerks) as PowerupType[]).forEach((k) => {
            updatedPerks[k] = Math.min(99, (updatedPerks[k] ?? 0) + (mission.bonusPerks?.[k] ?? 0));
          });
        }
        return {
          ...prev,
          coins: prev.coins - mission.costGold,
          xp: nextXp,
          level: nextLevel,
          speedUpgradeLevel: Math.min(10, (prev.speedUpgradeLevel ?? 0) + mission.speedBoostLevels),
          purchasedMissions: [...existing, mission.id],
          powerupInventory: updatedPerks,
        };
      });
    }
  };

  const navItems: { id: AppTab; label: string; icon: typeof LayoutDashboard }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'arena', label: 'Arena', icon: Zap },
    { id: 'campaign', label: 'Tournament', icon: Trophy },
    { id: 'leaderboard', label: 'Leaderboard', icon: Globe },
    { id: 'vault', label: 'Vault', icon: Shield },
  ];

  const myLeaderboardEntry = firebaseUser
    ? leaderboard.find((e) => e.uid === firebaseUser.uid) ?? null
    : null;

  return (
    <ErrorBoundary>
      <div className="min-h-screen flex flex-col bg-[#0B101B] text-slate-100">
        {/* Strict 3-Zone Top Bar */}
        <header className="border-b border-slate-800/90 bg-[#0B101B]/95 backdrop-blur-sm sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4 sm:gap-8">
            {/* Zone 1: Single text element wordmark */}
            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              className="font-display text-lg sm:text-xl font-bold tracking-tight text-white whitespace-nowrap shrink-0 cursor-pointer"
            >
              Relic Trail
            </button>

            {/* Zone 2: 5 concise single-line text nav links with crisp mobile icons */}
            <nav className="flex items-center gap-4 sm:gap-6 overflow-x-auto">
              {navItems.map((item) => {
                const isActive = activeTab === item.id;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    className={`py-1.5 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 border-b-2 inline-flex items-center gap-1.5 ${
                      isActive
                        ? 'text-amber-400 border-amber-400'
                        : 'text-slate-400 border-transparent hover:text-slate-100'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Zone 3: Audio & Sign In/Out */}
            <div className="shrink-0 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAudioModalOpen(true)}
                aria-label="Audio and theme music settings"
                title={musicEnabled ? 'Music ON' : 'Music OFF'}
                className="min-h-[40px] min-w-[40px] px-2.5 py-2 text-xs font-medium text-slate-200 bg-slate-800 border border-slate-700 rounded-lg hover:border-amber-400 transition-colors inline-flex items-center justify-center gap-1.5 shrink-0"
              >
                {!musicEnabled && !sfxEnabled ? (
                  <VolumeX className="w-4 h-4 text-slate-400" />
                ) : (
                  <Music className={`w-4 h-4 ${musicEnabled ? 'text-amber-400' : 'text-slate-400'}`} />
                )}
              </button>
              {firebaseUser ? (
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="min-h-[40px] px-3.5 py-2 text-xs font-medium text-slate-200 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0"
                >
                  Sign Out
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSignIn}
                  className="min-h-[40px] px-3.5 py-2 text-xs font-semibold text-slate-950 bg-amber-500 rounded-lg hover:bg-amber-400 transition-colors whitespace-nowrap shrink-0"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Transient Error Banner */}
        {toastError && (
          <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 pt-3">
            <div className="px-4 py-2.5 rounded-lg border border-rose-500/40 bg-rose-950/60 text-xs text-rose-200 flex items-center justify-between">
              <span>{toastError}</span>
              <button
                type="button"
                onClick={() => setToastError(null)}
                className="text-rose-300 hover:text-white ml-4"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
          {activeTab === 'dashboard' && (
            <DashboardView
              clientId={clientId}
              profile={profile}
              equippedSkin={equippedSkin}
              leaderboardEntry={myLeaderboardEntry}
              selectedRealm={selectedRealm}
              selectedDistance={selectedDistance}
              globalMessages={globalMessages}
              onSelectRealm={setSelectedRealm}
              onSelectDistance={setSelectedDistance}
              onLaunchCampaignLevel={handleLaunchCampaignLevel}
              onOpenTournamentLobby={() => setActiveTab('campaign')}
              onOpenLeaderboard={() => setActiveTab('leaderboard')}
              onCreateRoom={(realm, mode, autoStart, count, dist) =>
                handleCreateRoom(realm, mode, autoStart, count, 1, dist)
              }
              onJoinRoomCode={handleJoinRoomCode}
              onSendGlobalChat={(text) => handleSendChat('global', text)}
            />
          )}

          {activeTab === 'arena' && (
            <ArenaView
              clientId={clientId}
              profile={profile}
              equippedSkin={equippedSkin}
              matchState={matchState}
              inQueue={inQueue}
              queueCount={queueCount}
              selectedRealm={selectedRealm}
              selectedDistance={selectedDistance}
              onSelectRealm={setSelectedRealm}
              onSelectDistance={setSelectedDistance}
              onJoinQueue={handleJoinQueue}
              onLeaveQueue={handleLeaveQueue}
              onCreateRoom={(realm, mode, autoStart, count, dist) =>
                handleCreateRoom(realm, mode, autoStart, count, 1, dist)
              }
              onJoinRoomCode={handleJoinRoomCode}
              onLeaveRoom={handleLeaveRoom}
              onStartRoom={handleStartRoom}
              onChangeLane={handleChangeLane}
              onJump={handleJump}
              onUsePowerup={handleUsePowerup}
              onRematch={handleRematch}
              onLaunchCampaignLevel={handleLaunchCampaignLevel}
              roomMessages={roomMessages}
              onSendRoomChat={(text) => handleSendChat('room', text)}
              lastRewardSummary={lastRewardSummary}
              onClearRewardSummary={() => setLastRewardSummary(null)}
              musicEnabled={musicEnabled}
              sfxEnabled={sfxEnabled}
              onOpenAudioModal={() => setAudioModalOpen(true)}
            />
          )}

          {activeTab === 'campaign' && (
            <CampaignView
              profile={profile}
              currentUid={firebaseUser?.uid ?? null}
              selectedRealm={selectedRealm}
              onSelectRealm={setSelectedRealm}
              onLaunchCampaignLevel={handleLaunchCampaignLevel}
              onSignIn={handleSignIn}
            />
          )}

          {activeTab === 'leaderboard' && (
            <LeaderboardView
              entries={leaderboard}
              matchHistory={matchHistory}
              currentUid={firebaseUser?.uid ?? null}
              isSignedIn={Boolean(firebaseUser)}
              onSignIn={handleSignIn}
              onOpenTournamentLobby={() => setActiveTab('campaign')}
            />
          )}

          {activeTab === 'vault' && (
            <VaultView
              profile={profile}
              equippedSkin={equippedSkin}
              onEquipSkin={setEquippedSkin}
              onUpdateLoadout={handleUpdateLoadout}
              onBuyPowerup={handleBuyPowerup}
              onPurchaseMission={handlePurchaseMission}
            />
          )}
        </main>

        {/* Quiet Footer */}
        <footer className="border-t border-slate-800/70 py-5 mt-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
            <span>Relic Trail · Real-Time Crystal Board Adventure</span>
            <span>Cross-platform Web &amp; Touch Arena · Season 4</span>
          </div>
        </footer>

        <AudioSettingsModal
          open={audioModalOpen}
          musicEnabled={musicEnabled}
          musicVolume={musicVolume}
          sfxEnabled={sfxEnabled}
          activeTrack={activeThemeTrack}
          onToggleMusic={handleToggleMusic}
          onChangeMusicVolume={handleChangeMusicVolume}
          onToggleSfx={handleToggleSfx}
          onClose={() => setAudioModalOpen(false)}
        />
      </div>
    </ErrorBoundary>
  );
}
