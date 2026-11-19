import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeftRight,
  ArrowRight,
  Award,
  Copy,
  FastForward,
  Heart,
  Home,
  LogIn,
  LogOut,
  Music,
  Play,
  Plus,
  RotateCcw,
  Shield,
  Sparkles,
  Target,
  Trophy,
  Users,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import {
  REALM_IMAGES,
  REALM_IMAGE_TITLES,
  TOURNAMENT_GRAPHICS,
} from '../lib/realmAssets.ts';
import { soundFx } from '../lib/soundFx.ts';
import {
  CRYSTAL_PALETTE,
  getTournamentLevelConfig,
  POWERUP_INFO,
  REALMS,
} from '../shared/boardData.ts';
import { getPlayerTaskProgress } from '../shared/gameEngine.ts';
import {
  CampaignLevel,
  ChatMessage,
  DEFAULT_RACE_DISTANCE,
  GameMode,
  MatchState,
  MAX_RACE_DISTANCE,
  MIN_RACE_DISTANCE,
  PlayerPowerups,
  PowerupType,
  RaceLane,
  RealmId,
  STANDARD_MULTIPLAYER_SPEED,
  UserProfile,
} from '../shared/gameTypes.ts';
import { ChatPanel } from './ChatPanel.tsx';
import { CrystalToken } from './CrystalToken.tsx';
import { ModalDialog } from './ModalDialog.tsx';
import { RaceTrack } from './RaceTrack.tsx';

interface OpenRoomSummary {
  roomId: string;
  roomCode: string;
  realm: RealmId;
  mode: GameMode;
  targetDistance?: number;
  playerCount: number;
  hostName: string;
}

interface ArenaViewProps {
  clientId: string;
  profile: UserProfile;
  equippedSkin: string;
  matchState: MatchState | null;
  inQueue: boolean;
  queueCount: number;
  selectedRealm: RealmId;
  selectedDistance: number;
  onSelectRealm: (realm: RealmId) => void;
  onSelectDistance: (distance: number) => void;
  onJoinQueue: (realm: RealmId, mode: GameMode, targetDistance: number) => void;
  onLeaveQueue: () => void;
  onCreateRoom: (
    realm: RealmId,
    mode: GameMode,
    autoStartWithRivals: boolean,
    targetCount?: number,
    targetDistance?: number,
  ) => void;
  onJoinRoomCode: (code: string) => void;
  onLeaveRoom: (goToTournamentLobby?: boolean) => void;
  onStartRoom: (fillWithBots: boolean, targetCount?: number) => void;
  onChangeLane: (lane: RaceLane) => void;
  onJump: () => void;
  onUsePowerup: (powerup: PowerupType, targetPlayerId?: string) => void;
  onRematch: () => void;
  onLaunchCampaignLevel: (level: CampaignLevel, realm: RealmId) => void;
  roomMessages: ChatMessage[];
  onSendRoomChat: (text: string) => void;
  lastRewardSummary: {
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
  } | null;
  onClearRewardSummary: () => void;
  musicEnabled?: boolean;
  sfxEnabled?: boolean;
  onOpenAudioModal?: () => void;
}

export const ArenaView: React.FC<ArenaViewProps> = ({
  clientId,
  profile,
  equippedSkin,
  matchState,
  inQueue,
  queueCount,
  selectedRealm,
  selectedDistance,
  onSelectRealm,
  onSelectDistance,
  onJoinQueue,
  onLeaveQueue,
  onCreateRoom,
  onJoinRoomCode,
  onLeaveRoom,
  onStartRoom,
  onChangeLane,
  onJump,
  onUsePowerup,
  onRematch,
  onLaunchCampaignLevel,
  roomMessages,
  onSendRoomChat,
  lastRewardSummary,
  onClearRewardSummary,
  musicEnabled = true,
  sfxEnabled = true,
  onOpenAudioModal,
}) => {
  const [playMode, setPlayMode] = useState<'tournament' | 'instant' | 'multiplayer'>('instant');
  const [selectedTourneyLevel, setSelectedTourneyLevel] = useState<number>(
    profile.highestCampaignLevel,
  );
  const [joinCode, setJoinCode] = useState('');
  const [openRooms, setOpenRooms] = useState<OpenRoomSummary[]>([]);
  const [swapPickerOpen, setSwapPickerOpen] = useState(false);
  const [resultsDismissed, setResultsDismissed] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [dockDeltaFlash, setDockDeltaFlash] = useState<Partial<Record<PowerupType, number>>>({});
  const prevDockPowerupsRef = useRef<PlayerPowerups | null>(null);

  useEffect(() => {
    setSelectedTourneyLevel((prev) =>
      prev > profile.highestCampaignLevel ? profile.highestCampaignLevel : prev,
    );
  }, [profile.highestCampaignLevel]);

  useEffect(() => {
    if (matchState?.status === 'playing' || matchState?.status === 'countdown' || !matchState) {
      setResultsDismissed(false);
    }
  }, [matchState?.roomId, matchState?.status]);

  const myPlayer = matchState?.players.find((p) => p.id === clientId);

  useEffect(() => {
    if (!myPlayer) {
      prevDockPowerupsRef.current = null;
      return;
    }
    const prev = prevDockPowerupsRef.current;
    if (!prev) {
      prevDockPowerupsRef.current = { ...myPlayer.powerups };
      return;
    }
    const keys: PowerupType[] = ['leap', 'swap', 'boost', 'shield'];
    const diffs: Partial<Record<PowerupType, number>> = {};
    let changed = false;
    for (const k of keys) {
      const d = myPlayer.powerups[k] - prev[k];
      if (d !== 0) {
        diffs[k] = d;
        changed = true;
      }
    }
    prevDockPowerupsRef.current = { ...myPlayer.powerups };
    if (changed) {
      setDockDeltaFlash((curr) => ({ ...curr, ...diffs }));
      const t = window.setTimeout(() => {
        setDockDeltaFlash((curr) => {
          const next = { ...curr };
          for (const k of Object.keys(diffs) as PowerupType[]) {
            if (next[k] === diffs[k]) delete next[k];
          }
          return next;
        });
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [
    myPlayer?.id,
    myPlayer?.powerups.leap,
    myPlayer?.powerups.swap,
    myPlayer?.powerups.boost,
    myPlayer?.powerups.shield,
  ]);

  // Keyboard steering (A/D, Arrows during countdown & playing), Jump & Live Perks (1-4) during active race
  useEffect(() => {
    if (
      !matchState ||
      (matchState.status !== 'playing' && matchState.status !== 'countdown') ||
      !myPlayer
    ) {
      return;
    }
    const isActiveRace = matchState.status === 'playing';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        const next = Math.max(0, myPlayer.lane - 1) as RaceLane;
        if (next !== myPlayer.lane) onChangeLane(next);
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        const next = Math.min(2, myPlayer.lane + 1) as RaceLane;
        if (next !== myPlayer.lane) onChangeLane(next);
      } else if (isActiveRace && (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W')) {
        e.preventDefault();
        if (myPlayer.jumpTicks === 0) {
          soundFx.playJump();
          onJump();
        }
      } else if (isActiveRace && e.key === '1') {
        if (myPlayer.powerups.leap > 0 && myPlayer.leapTicks === 0) {
          soundFx.playPowerup();
          onUsePowerup('leap');
        }
      } else if (isActiveRace && e.key === '2') {
        if (myPlayer.powerups.swap > 0) {
          setSwapPickerOpen(true);
        }
      } else if (isActiveRace && e.key === '3') {
        if (myPlayer.powerups.boost > 0 && myPlayer.boostTicks === 0) {
          soundFx.playPowerup();
          onUsePowerup('boost');
        }
      } else if (isActiveRace && e.key === '4') {
        if (myPlayer.powerups.shield > 0 && !myPlayer.hasShield) {
          soundFx.playPowerup();
          onUsePowerup('shield');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [matchState, myPlayer, onChangeLane, onJump, onUsePowerup]);

  // Poll open waiting rooms when in lobby
  useEffect(() => {
    if (matchState) return;
    let cancelled = false;
    const fetchRooms = async () => {
      try {
        const res = await fetch('/api/rooms');
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && Array.isArray(data.rooms)) {
          setOpenRooms(data.rooms);
        }
      } catch {
        // Ignore transient network errors
      }
    };
    fetchRooms();
    const timer = setInterval(fetchRooms, 4000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [matchState]);

  const soundOff = !musicEnabled && !sfxEnabled;

  const handleCopyCode = (code: string) => {
    navigator.clipboard?.writeText(code).catch(() => {});
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 1800);
  };

  // --- STATE 1: WAITING ROOM LOBBY ---
  if (matchState && matchState.status === 'waiting') {
    const isHost = matchState.hostId === clientId;
    const realmInfo = REALMS[matchState.realm];

    return (
      <section className="max-w-4xl mx-auto space-y-6">
        <div className="rounded-xl border border-slate-800 bg-[#131B2E] overflow-hidden">
          <div className="relative h-36 sm:h-44">
            <img
              src={REALM_IMAGES[matchState.realm]}
              alt={realmInfo.name}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#131B2E] via-[#131B2E]/65 to-transparent" />
            <div className="absolute bottom-4 left-5 right-5 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs text-amber-300 font-medium font-mono-tabular">
                  {matchState.mode.toUpperCase()} CIRCUIT · {matchState.targetDistance.toLocaleString()}m ROUTE
                </p>
                <h2 className="font-display text-2xl font-bold text-white">
                  {realmInfo.name}
                </h2>
              </div>
              <div className="flex items-center gap-2 bg-[#0B101B]/90 border border-slate-700 rounded-lg px-3 py-2">
                <span className="text-xs text-slate-400">Room Code</span>
                <span className="font-mono-tabular text-base font-bold text-amber-400 tracking-wider">
                  {matchState.roomCode}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyCode(matchState.roomCode)}
                  className="p-1 text-slate-300 hover:text-white transition-colors"
                  title="Copy room code"
                >
                  <Copy className="w-4 h-4" />
                </button>
                {copiedCode && <span className="text-xs text-emerald-400">Copied</span>}
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="text-sm text-slate-300">
                Share the room code with friends to race live head-to-head, or fill empty starting grid slots with rival bots.
              </div>
              <button
                type="button"
                onClick={() => onLeaveRoom(false)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-300 border border-slate-700 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
              >
                <LogOut className="w-3.5 h-3.5" />
                Leave Grid
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[0, 1, 2, 3].map((slotIdx) => {
                const player = matchState.players[slotIdx];
                if (!player) {
                  return (
                    <div
                      key={slotIdx}
                      className="rounded-lg border border-dashed border-slate-700 bg-[#0B101B]/50 p-4 flex flex-col items-center justify-center text-center min-h-[108px]"
                    >
                      <Users className="w-5 h-5 text-slate-600 mb-1.5" />
                      <span className="text-xs text-slate-500">Open Starting Slot</span>
                    </div>
                  );
                }
                const palette = CRYSTAL_PALETTE[player.crystalColor];
                return (
                  <div
                    key={player.id}
                    className="rounded-lg border border-slate-700/80 bg-[#0B101B]/80 p-4 flex items-center gap-3 min-h-[108px]"
                  >
                    <CrystalToken color={player.crystalColor} skinId={player.skinId} size="lg" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-100 truncate">
                        {player.name}
                      </p>
                      <p className={`text-xs ${palette.textClass}`}>
                        {palette.name} Racer
                        {player.id === matchState.hostId ? ' · Host' : ''}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {isHost ? (
              <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-800">
                {matchState.players.length >= 2 && (
                  <button
                    type="button"
                    onClick={() => onStartRoom(false)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[44px] text-sm font-semibold bg-amber-500 text-slate-950 rounded-lg hover:bg-amber-400 transition-colors whitespace-nowrap shrink-0"
                  >
                    <Play className="w-4 h-4" />
                    Start Race ({matchState.players.length} Racers)
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onStartRoom(true, 4)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[44px] text-sm font-semibold bg-slate-800 text-slate-100 border border-slate-700 rounded-lg hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0"
                >
                  <Users className="w-4 h-4 text-amber-400" />
                  Fill Grid & Start (4 Racers)
                </button>
              </div>
            ) : (
              <p className="text-sm text-slate-400">
                Waiting for the host to launch the race...
              </p>
            )}
          </div>
        </div>

        <ChatPanel
          title={`Room ${matchState.roomCode} Chat`}
          subtitle="Coordinate distance, strategies, and start timing with runners in this lobby"
          messages={roomMessages}
          currentUserId={clientId}
          placeholder="Message racers in this room..."
          compact
          onSendMessage={onSendRoomChat}
        />
      </section>
    );
  }

  // --- STATE 2: PRE-RACE COUNTDOWN, ACTIVE RACING, OR FINISHED ---
  if (
    matchState &&
    (matchState.status === 'countdown' ||
      matchState.status === 'playing' ||
      matchState.status === 'finished')
  ) {
    const sortedStandings = [...matchState.players].sort((a, b) => b.distance - a.distance);
    const myRank = sortedStandings.findIndex((p) => p.id === clientId) + 1;
    const winner = matchState.winnerId
      ? matchState.players.find((p) => p.id === matchState.winnerId)
      : null;
    const rivalsForSwap = matchState.players
      .filter((p) => p.id !== clientId)
      .sort((a, b) => b.distance - a.distance);

    const powerupButtons: {
      key: PowerupType;
      icon: React.ReactNode;
      active: boolean;
    }[] = [
      {
        key: 'leap',
        icon: <FastForward className="w-4 h-4 text-emerald-400" />,
        active: Boolean(myPlayer && myPlayer.leapTicks > 0),
      },
      {
        key: 'swap',
        icon: <ArrowLeftRight className="w-4 h-4 text-amber-400" />,
        active: false,
      },
      {
        key: 'boost',
        icon: <Zap className="w-4 h-4 text-cyan-400" />,
        active: Boolean(myPlayer && myPlayer.boostTicks > 0),
      },
      {
        key: 'shield',
        icon: <Shield className="w-4 h-4 text-sky-400" />,
        active: Boolean(myPlayer?.hasShield),
      },
    ];

    const taskProgress = myPlayer && matchState.task
      ? getPlayerTaskProgress(myPlayer, matchState.task)
      : Math.round(myPlayer?.distance ?? 0);
    const taskTarget = matchState.task?.targetCount ?? matchState.targetDistance;
    const missionPct = Math.min(100, Math.round((taskProgress / Math.max(1, taskTarget)) * 100));

    return (
      <section className="space-y-4">
        {/* Top Race Bar with Prominent Level Rules & Live Mission Strip */}
        <div className="rounded-xl border border-slate-800 bg-[#131B2E] overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm">
              <span className="font-semibold text-slate-100">
                {REALMS[matchState.realm].name}
              </span>
              <span className="text-slate-500" aria-hidden="true">·</span>
              <span className="font-mono-tabular text-slate-300">
                {matchState.mode === 'campaign'
                  ? `Tournament Lv ${matchState.campaignLevel}`
                  : `${matchState.targetDistance.toLocaleString()}m`}
              </span>
              <span className="text-slate-500" aria-hidden="true">·</span>
              <span className="text-slate-400">
                Room <span className="font-mono-tabular text-slate-200">{matchState.roomCode}</span>
              </span>
              <span className="text-slate-500" aria-hidden="true">·</span>
              <span className="font-mono-tabular text-amber-400 font-semibold">
                Pos #{myRank > 0 ? myRank : 1} / {matchState.players.length}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {matchState.status === 'finished' && resultsDismissed && (
                <button
                  type="button"
                  onClick={() => setResultsDismissed(false)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] text-xs font-semibold bg-amber-500 text-slate-950 rounded-xl hover:bg-amber-400 transition-colors whitespace-nowrap shrink-0"
                >
                  <Trophy className="w-4 h-4" />
                  Results
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  if (onOpenAudioModal) {
                    onOpenAudioModal();
                  } else {
                    soundFx.muted = !soundFx.muted;
                  }
                }}
                className="px-3 py-2 min-h-[44px] min-w-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 text-xs font-medium text-slate-200 hover:border-amber-400 transition-colors"
                title="Audio & Theme Music"
                aria-label="Audio & Theme Music"
              >
                {soundOff ? (
                  <VolumeX className="w-4 h-4 text-slate-400" />
                ) : (
                  <Music className="w-4 h-4 text-amber-400" />
                )}
                <span className="hidden sm:inline">{musicEnabled ? 'Music ON' : 'Music OFF'}</span>
              </button>
              <button
                type="button"
                onClick={() => onLeaveRoom(matchState.mode === 'campaign')}
                className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] text-xs font-medium text-slate-300 border border-slate-700 rounded-xl hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
              >
                <LogOut className="w-4 h-4" />
                Exit
              </button>
            </div>
          </div>

          {/* Sticky Mission & Rules Sub-Bar */}
          <div className="px-4 py-2.5 border-t border-slate-800 bg-[#0A0F1B] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
            <div className="flex items-start sm:items-center gap-2.5 min-w-0 flex-1">
              <Target className="w-4 h-4 text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
              <div className="min-w-0 space-y-1 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-amber-300">
                    Mission: {matchState.task ? matchState.task.title : `First to ${matchState.targetDistance.toLocaleString()}m`}
                  </span>
                  <span className="font-mono-tabular font-bold text-emerald-400">
                    {Math.min(taskProgress, taskTarget)} / {taskTarget}
                    {!matchState.task || matchState.task.type === 'distance_sprint' ? 'm' : ''}
                  </span>
                </div>
                {matchState.rulesSummary && (
                  <p className="text-[11px] text-slate-300 leading-snug">
                    Rules: {matchState.rulesSummary}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="w-28 h-2 rounded-full bg-slate-800 overflow-hidden hidden md:block">
                <div
                  className="h-full bg-emerald-400 transition-all duration-150"
                  style={{ width: `${missionPct}%` }}
                />
              </div>
              {myPlayer && (
                <span className="font-mono-tabular text-amber-300 font-semibold">
                  +{myPlayer.coinsCollected * 10}g Coins
                </span>
              )}
              {myPlayer && (
                <span className="font-mono-tabular text-rose-300 font-semibold">
                  Lives {myPlayer.lives}/{myPlayer.maxLives}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Main 2-Column Split: 3-Lane Race Track + Tactical Power-Up & Telemetry Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <div className="lg:col-span-8 space-y-3">
            <RaceTrack
              realm={matchState.realm}
              players={matchState.players}
              pickups={matchState.pickups}
              myPlayerId={clientId}
              targetDistance={matchState.targetDistance}
              perkSizePx={matchState.perkSizePx}
              elapsedMs={matchState.elapsedMs}
              speedMultiplier={matchState.speedMultiplier}
              status={matchState.status}
              countdownMs={matchState.countdownMs}
              isPlaying={matchState.status === 'playing'}
              task={matchState.task}
              onChangeLane={onChangeLane}
              onJump={onJump}
              onUsePowerup={onUsePowerup}
              onOpenSwapPicker={() => setSwapPickerOpen(true)}
            />
            <p className="text-xs text-slate-400 px-1">
              Controls: Swipe Left / Right or A / D to steer · Swipe Up or Space / W to Jump over red hazards · Press 1–4 or tap buttons below track to trigger Perks mid-race.
            </p>
          </div>

          <div className="lg:col-span-4 space-y-4">
            {/* Tactical Power-Ups Dock */}
            {myPlayer && (
              <div className="rounded-xl border border-slate-800 bg-[#131B2E] p-4 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-200">Tactical Power-Ups</span>
                  <span className="text-slate-400">Live Activation</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {powerupButtons.map(({ key, icon, active }) => {
                    const count = myPlayer.powerups[key];
                    const disabled =
                      matchState.status !== 'playing' || count <= 0 || active;
                    const delta = dockDeltaFlash[key];
                    return (
                      <button
                        key={key}
                        type="button"
                        disabled={disabled}
                        title={POWERUP_INFO[key].shortDesc}
                        onClick={() => {
                          if (key === 'swap') {
                            setSwapPickerOpen(true);
                          } else {
                            soundFx.playPowerup();
                            onUsePowerup(key);
                          }
                        }}
                        className={`relative min-h-[46px] px-3 py-2 rounded-lg border text-left transition-colors flex items-center justify-between gap-2 ${
                          active
                            ? 'border-amber-400 bg-amber-500/15 text-amber-200'
                            : disabled
                              ? 'border-slate-800 bg-[#0B101B]/50 text-slate-500 cursor-not-allowed'
                              : 'border-slate-700 bg-[#0B101B] text-slate-200 hover:border-amber-400'
                        }`}
                      >
                        {delta !== undefined && delta !== 0 && (
                          <span
                            className={`absolute -top-2 -right-1.5 px-1.5 py-0.5 rounded font-mono-tabular text-[10px] font-bold shadow ${
                              delta < 0
                                ? 'bg-rose-500 text-white'
                                : 'bg-emerald-400 text-slate-950'
                            }`}
                          >
                            {delta > 0 ? `+${delta}` : `${delta} USED`}
                          </span>
                        )}
                        <div className="flex items-center gap-2 min-w-0">
                          {icon}
                          <span className="text-xs font-medium truncate">
                            {POWERUP_INFO[key].name}
                          </span>
                        </div>
                        <span
                          className={`font-mono-tabular text-xs font-semibold shrink-0 ${
                            count === 0 && !active ? 'text-slate-500' : 'text-slate-300'
                          }`}
                        >
                          {active ? `ON (${count})` : `x${count}`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Live Race Standings */}
            <div className="rounded-xl border border-slate-800 bg-[#131B2E] p-4 space-y-3">
              <h4 className="text-xs font-semibold text-slate-300 tracking-wide">
                Live Race Standings
              </h4>
              <div className="space-y-2">
                {sortedStandings.map((p, idx) => {
                  const palette = CRYSTAL_PALETTE[p.crystalColor];
                  const progress = Math.min(
                    100,
                    Math.round((p.distance / Math.max(1, matchState.targetDistance)) * 100),
                  );
                  return (
                    <div
                      key={p.id}
                      className={`p-2.5 rounded-lg border ${
                        p.id === clientId
                          ? 'border-amber-500/40 bg-[#0B101B]'
                          : 'border-slate-800/80 bg-[#0B101B]/50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-mono-tabular text-xs font-bold text-slate-400">
                            #{idx + 1}
                          </span>
                          <CrystalToken
                            color={p.crystalColor}
                            skinId={p.skinId}
                            size="sm"
                            hasShield={p.hasShield}
                          />
                          <span className="text-xs font-medium text-slate-100 truncate">
                            {p.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="inline-flex items-center gap-0.5 text-[11px] font-mono-tabular text-rose-400">
                            <Heart className="w-3 h-3 fill-rose-500 text-rose-500" />
                            {p.lives}
                          </span>
                          <span className="font-mono-tabular text-xs text-slate-300">
                            {Math.round(p.distance)}m
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full ${palette.bgClass} transition-all duration-150`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Live Race Event Feed */}
            <div className="rounded-xl border border-slate-800 bg-[#131B2E] p-4 space-y-2.5">
              <h4 className="text-xs font-semibold text-slate-300">Race Telemetry Feed</h4>
              <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
                {matchState.logs.map((entry) => {
                  const toneColor =
                    entry.tone === 'hazard'
                      ? 'text-rose-300'
                      : entry.tone === 'perk'
                        ? 'text-emerald-300'
                        : entry.tone === 'powerup'
                          ? 'text-sky-300'
                          : entry.tone === 'victory'
                            ? 'text-amber-300 font-semibold'
                            : 'text-slate-300';
                  return (
                    <div
                      key={entry.id}
                      className="text-xs leading-relaxed pb-2 border-b border-slate-800/70 last:border-b-0"
                    >
                      <span className={toneColor}>{entry.message}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Live Room Chatroom in Multiplayer Races */}
            {matchState.mode !== 'campaign' && (
              <ChatPanel
                title={`Room ${matchState.roomCode} Chat`}
                messages={roomMessages}
                currentUserId={clientId}
                placeholder="Chat with room racers..."
                compact
                onSendMessage={onSendRoomChat}
              />
            )}
          </div>
        </div>

        {/* Slipstream Swap Target Pop-Up */}
        <ModalDialog
          open={swapPickerOpen}
          title="Slipstream Swap Target"
          subtitle="Pick a rival racer to swap track distance with immediately"
          icon={<ArrowLeftRight className="w-5 h-5 text-amber-400" />}
          onClose={() => setSwapPickerOpen(false)}
        >
          <div className="space-y-2.5">
            {rivalsForSwap.map((rival) => (
              <button
                key={rival.id}
                type="button"
                onClick={() => {
                  setSwapPickerOpen(false);
                  soundFx.playPowerup();
                  onUsePowerup('swap', rival.id);
                }}
                className="w-full min-h-[52px] p-3 rounded-xl border border-slate-700 bg-[#0B101B] text-slate-100 hover:border-amber-400 flex items-center justify-between text-left transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <CrystalToken color={rival.crystalColor} size="sm" hasShield={rival.hasShield} />
                  <div>
                    <p className="text-sm font-medium">{rival.name}</p>
                    <p className="text-xs text-slate-400">
                      {rival.hasShield ? 'Aegis Hull active (blocks swap)' : 'Targetable'}
                    </p>
                  </div>
                </div>
                <span className="font-mono-tabular text-xs font-semibold text-amber-400">
                  {Math.round(rival.distance)}m
                </span>
              </button>
            ))}
          </div>
        </ModalDialog>

        {/* Victory / Tournament Failure Results Pop-Up (with Close X, Next Level, Replay, Lobby) */}
        {(() => {
          const isTournamentLoss =
            matchState.mode === 'campaign' && matchState.winnerId !== clientId;
          const didWin = matchState.winnerId === clientId;
          const modalTitle = isTournamentLoss
            ? myPlayer?.lives === 0
              ? 'Out of Lives — Restart Level'
              : 'Mission Incomplete'
            : winner
              ? `${winner.name} Wins!`
              : 'Match Complete';
          const modalSubtitle = isTournamentLoss
            ? `Tournament Level ${matchState.campaignLevel} Failed`
            : didWin
              ? matchState.mode === 'campaign'
                ? `Tournament Level ${matchState.campaignLevel} Cleared`
                : '1st Place Finish'
              : 'Race Complete';

          return (
            <ModalDialog
              open={matchState.status === 'finished' && !resultsDismissed}
              title={modalTitle}
              subtitle={modalSubtitle}
              accentBorderClass={isTournamentLoss ? 'border-rose-500/50' : 'border-amber-500/40'}
              icon={
                isTournamentLoss ? (
                  <AlertTriangle className="w-5 h-5 text-rose-400" />
                ) : (
                  <Trophy className="w-5 h-5 text-amber-400" />
                )
              }
              onClose={() => setResultsDismissed(true)}
            >
              <div className="space-y-4">
                {matchState.outcomeReason && (
                  <p
                    className={`text-xs leading-relaxed p-3 rounded-xl border ${
                      isTournamentLoss
                        ? 'bg-rose-950/40 border-rose-500/30 text-rose-200'
                        : 'bg-[#0B101B] border-slate-800 text-slate-300'
                    }`}
                  >
                    {matchState.outcomeReason}
                  </p>
                )}

                {lastRewardSummary && (!isTournamentLoss || lastRewardSummary.coinsEarned > 0) && (
                  <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-[#0B101B] border border-slate-800 text-center">
                    <div>
                      <p className="text-[11px] text-slate-400">XP Earned</p>
                      <p className="font-mono-tabular text-base font-bold text-emerald-400">
                        +{lastRewardSummary.xpEarned}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-400">Relic Gold</p>
                      <p className="font-mono-tabular text-base font-bold text-amber-400">
                        +{lastRewardSummary.coinsEarned}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-400">Season RP</p>
                      <p
                        className={`font-mono-tabular text-base font-bold ${
                          lastRewardSummary.ratingDelta >= 0
                            ? 'text-sky-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {lastRewardSummary.ratingDelta >= 0
                          ? `+${lastRewardSummary.ratingDelta}`
                          : lastRewardSummary.ratingDelta}
                      </p>
                    </div>
                  </div>
                )}

                {lastRewardSummary?.unlockedSkin && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-xs text-emerald-200">
                    <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Unlocked new Crystal Skin reward! Equip it in your Vault.</span>
                  </div>
                )}

                {lastRewardSummary?.roundCompletedUnlocked && (
                  <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-400/50 text-xs space-y-1">
                    <div className="flex items-center gap-2 font-semibold text-amber-300">
                      <Award className="w-4 h-4 shrink-0" />
                      <span>
                        Round {lastRewardSummary.roundCompletedUnlocked} Cleared · Rank Unlocked:{' '}
                        {lastRewardSummary.unlockedRankTitle}
                      </span>
                    </div>
                    <p className="text-slate-200">
                      Round Perks Awarded: {lastRewardSummary.roundPerksSummary}
                    </p>
                  </div>
                )}

                {lastRewardSummary && (lastRewardSummary.finalPowerups || myPlayer) && (() => {
                  const usedMap = lastRewardSummary.powerupsUsed ?? myPlayer?.powerupsUsed;
                  const gainedMap = lastRewardSummary.powerupsGained ?? myPlayer?.powerupsGained;
                  const stock = lastRewardSummary.finalPowerups ?? myPlayer?.powerups;
                  if (!stock) return null;
                  const totalUsed = usedMap
                    ? usedMap.leap + usedMap.swap + usedMap.boost + usedMap.shield
                    : 0;
                  const totalGained = gainedMap
                    ? gainedMap.leap + gainedMap.swap + gainedMap.boost + gainedMap.shield
                    : 0;
                  return (
                    <div className="p-3 rounded-xl bg-[#0B101B] border border-slate-800 space-y-2 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-semibold text-slate-200">Power-Up Stock &amp; Drops</span>
                        <div className="flex items-center gap-3 font-mono-tabular">
                          <span className="text-rose-300">Used: -{totalUsed}</span>
                          <span className="text-emerald-300">Picked Up: +{totalGained}</span>
                        </div>
                      </div>
                      {lastRewardSummary.wonBonusPowerup && (
                        <p className="text-[11px] text-amber-300 font-medium">
                          Victory Drop: +1 {POWERUP_INFO[lastRewardSummary.wonBonusPowerup].name} added to inventory!
                        </p>
                      )}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1">
                        {(['leap', 'swap', 'boost', 'shield'] as PowerupType[]).map((k) => (
                          <div
                            key={k}
                            className="px-2 py-1.5 rounded-lg bg-[#111827] border border-slate-800 flex items-center justify-between gap-1"
                          >
                            <span className="text-[11px] text-slate-300 truncate">
                              {POWERUP_INFO[k].name.split(' ')[0]}
                            </span>
                            <span className="font-mono-tabular font-bold text-amber-300">
                              x{stock[k]}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                <div className="space-y-1.5 text-xs text-slate-300">
                  {sortedStandings.map((p, idx) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between py-1.5 border-b border-slate-800/80 last:border-b-0"
                    >
                      <span>
                        #{idx + 1} · {p.name}
                      </span>
                      <span className="font-mono-tabular text-slate-400">
                        {Math.round(p.distance)}m · {p.perksCollected} perks · {p.lives}/{p.maxLives} lives
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  {matchState.mode === 'campaign' && didWin && (
                    <button
                      type="button"
                      onClick={() => {
                        const nextCfg = getTournamentLevelConfig(matchState.campaignLevel + 1);
                        onClearRewardSummary();
                        onLaunchCampaignLevel(nextCfg, matchState.realm);
                      }}
                      className="w-full min-h-[46px] px-4 py-2.5 text-sm font-semibold bg-emerald-500 text-slate-950 rounded-xl hover:bg-emerald-400 transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap"
                    >
                      <span>Next Level (Lv {matchState.campaignLevel + 1})</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}

                  {matchState.hostId === clientId && (
                    <button
                      type="button"
                      onClick={() => {
                        onClearRewardSummary();
                        onRematch();
                      }}
                      className="flex-1 min-h-[44px] px-4 py-2.5 text-sm font-semibold bg-amber-500 text-slate-950 rounded-xl hover:bg-amber-400 transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap"
                    >
                      <RotateCcw className="w-4 h-4" />
                      {isTournamentLoss ? 'Restart' : 'Replay'}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      onClearRewardSummary();
                      onLeaveRoom(matchState.mode === 'campaign');
                    }}
                    className="flex-1 min-h-[44px] px-4 py-2.5 text-sm font-medium bg-slate-800 text-slate-200 border border-slate-700 rounded-xl hover:bg-slate-700 transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap"
                  >
                    <Home className="w-4 h-4" />
                    Lobby
                  </button>
                </div>
              </div>
            </ModalDialog>
          );
        })()}
      </section>
    );
  }

  // --- STATE 3: REALM SELECTOR & POINT-OF-PLAY LAUNCHER ---
  const activeRealm = REALMS[selectedRealm];
  const distancePresets = [1000, 2500, 4000, 7000, 10000];
  const clampedDistance = Math.min(
    MAX_RACE_DISTANCE,
    Math.max(MIN_RACE_DISTANCE, selectedDistance || DEFAULT_RACE_DISTANCE),
  );
  const activeTourneyCfg = getTournamentLevelConfig(selectedTourneyLevel);
  const activeTourneyGraphic = TOURNAMENT_GRAPHICS[activeTourneyCfg.task.type];
  const tourneyDropdownLevels = Array.from(
    { length: Math.max(10, profile.highestCampaignLevel + 2) },
    (_, i) => getTournamentLevelConfig(i + 1),
  );

  return (
    <section className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-7 relative rounded-xl border border-slate-800 overflow-hidden min-h-[300px] flex flex-col justify-end">
          <img
            src={REALM_IMAGES[selectedRealm]}
            alt={activeRealm.name}
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B101B] via-[#0B101B]/60 to-transparent" />
          <div className="relative z-10 p-6 space-y-2 max-w-xl">
            <p className="text-xs font-medium text-amber-300 font-mono-tabular">
              Equal Theme Difficulty · Progressive Acceleration Over Time &amp; Every 100m
            </p>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white text-balance">
              {activeRealm.name}
            </h1>
            <p className="text-sm text-slate-200 leading-relaxed">
              {activeRealm.subtitle}
            </p>
            <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-[#0B101B]/85 border border-slate-800">
                <p className="font-semibold text-rose-300">{activeRealm.problemTitle}</p>
                <p className="text-slate-300 mt-0.5">{activeRealm.problemSummary}</p>
              </div>
              <div className="p-3 rounded-lg bg-[#0B101B]/85 border border-slate-800">
                <p className="font-semibold text-emerald-300">{activeRealm.perkTitle}</p>
                <p className="text-slate-300 mt-0.5">{activeRealm.perkSummary}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Point-of-Play 3-Mode Selector */}
        <div className="lg:col-span-5 rounded-xl border border-slate-800 bg-[#131B2E] p-5 sm:p-6 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CrystalToken color={profile.crystalColor} skinId={equippedSkin} size="md" />
                <div>
                  <p className="text-sm font-semibold text-slate-100">{profile.displayName}</p>
                  <p className="text-xs text-slate-400 font-mono-tabular">
                    Level {profile.level} · {profile.coins} Gold
                  </p>
                </div>
              </div>
              <span className="text-[11px] text-slate-400">Choose Play Mode</span>
            </div>

            {/* Distinct 3-Way Mode Switch at Point of Play */}
            <div className="grid grid-cols-3 gap-1 p-1 bg-[#0B101B] rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => setPlayMode('tournament')}
                className={`px-2 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap truncate ${
                  playMode === 'tournament'
                    ? 'bg-amber-500 text-slate-950 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Single Tournament
              </button>
              <button
                type="button"
                onClick={() => setPlayMode('instant')}
                className={`px-2 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap truncate ${
                  playMode === 'instant'
                    ? 'bg-amber-500 text-slate-950 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Instant 4-Crystal
              </button>
              <button
                type="button"
                onClick={() => setPlayMode('multiplayer')}
                className={`px-2 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap truncate ${
                  playMode === 'multiplayer'
                    ? 'bg-amber-500 text-slate-950 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Multiplayer Room
              </button>
            </div>

            {playMode === 'tournament' && (
              <div className="space-y-3">
                {/* Level Picker for Unlocked Tournament Stages */}
                <div className="flex items-center justify-between gap-2 text-xs">
                  <label htmlFor="tourney-level-select" className="font-medium text-slate-300">
                    Tournament Stage
                  </label>
                  <select
                    id="tourney-level-select"
                    value={selectedTourneyLevel}
                    onChange={(e) => setSelectedTourneyLevel(Number(e.target.value))}
                    className="bg-[#0B101B] border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-slate-100 font-mono-tabular focus:outline-none focus:border-amber-400"
                  >
                    {tourneyDropdownLevels.map((lvl) => (
                      <option
                        key={lvl.level}
                        value={lvl.level}
                        disabled={lvl.level > profile.highestCampaignLevel}
                      >
                        Lv {lvl.level}: {lvl.task.title}
                        {lvl.level > profile.highestCampaignLevel ? ' (Locked)' : lvl.level < profile.highestCampaignLevel ? ' (Cleared)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Graphical Tournament Preview + Explicit Underlying Image Title */}
                <div className="rounded-lg border border-slate-800 bg-[#0B101B] overflow-hidden">
                  <div className="h-28 bg-slate-900 overflow-hidden">
                    <img
                      src={activeTourneyGraphic.src}
                      alt={activeTourneyCfg.imageCaption}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="px-3 py-2 border-t border-slate-800 space-y-1">
                    <p className="text-[11px] font-medium text-amber-300">
                      {activeTourneyCfg.imageCaption}
                    </p>
                    <div className="flex items-center justify-between text-xs pt-0.5">
                      <span className="inline-flex items-center gap-1 font-semibold text-emerald-300">
                        <Target className="w-3.5 h-3.5" />
                        {activeTourneyCfg.task.title}
                      </span>
                      <span className="font-mono-tabular text-rose-300">
                        3 Lives Limit
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      {activeTourneyCfg.rulesSummary}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onLaunchCampaignLevel(activeTourneyCfg, selectedRealm)}
                  className="w-full min-h-[48px] px-4 py-3 text-sm font-semibold bg-amber-500 text-slate-950 rounded-lg hover:bg-amber-400 transition-colors flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  Start Level {activeTourneyCfg.level} Tournament ({activeTourneyCfg.targetDistance.toLocaleString()}m)
                </button>
              </div>
            )}

            {playMode === 'instant' && (
              <div className="space-y-3">
                <div className="p-3.5 rounded-lg bg-[#0B101B] border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <label htmlFor="instant-distance-slider" className="font-medium text-slate-300">
                      Instant Race Route Distance
                    </label>
                    <span className="font-mono-tabular font-bold text-amber-400">
                      {clampedDistance.toLocaleString()}m
                    </span>
                  </div>
                  <input
                    id="instant-distance-slider"
                    type="range"
                    min={MIN_RACE_DISTANCE}
                    max={MAX_RACE_DISTANCE}
                    step={500}
                    value={clampedDistance}
                    onChange={(e) => onSelectDistance(Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    {distancePresets.map((dist) => (
                      <button
                        key={dist}
                        type="button"
                        onClick={() => onSelectDistance(dist)}
                        className={`px-2 py-1 text-[11px] font-mono-tabular rounded border transition-colors ${
                          clampedDistance === dist
                            ? 'border-amber-400 bg-amber-500/15 text-amber-300 font-semibold'
                            : 'border-slate-800 bg-[#131B2E] text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {dist >= 1000 ? `${dist / 1000}km` : `${dist}m`}
                      </button>
                    ))}
                  </div>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  Jump immediately into a 4-crystal sprint in {activeRealm.name}. Base pace starts at {STANDARD_MULTIPLAYER_SPEED} m/s and accelerates continuously + every 100m!
                </p>

                <button
                  type="button"
                  onClick={() => onCreateRoom(selectedRealm, 'ranked', true, 4, clampedDistance)}
                  className="w-full min-h-[48px] px-4 py-3 text-sm font-semibold bg-amber-500 text-slate-950 rounded-lg hover:bg-amber-400 transition-colors flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  Start Instant 4-Crystal Race ({clampedDistance.toLocaleString()}m)
                </button>
              </div>
            )}

            {playMode === 'multiplayer' && (
              <div className="space-y-3">
                <div className="p-3.5 rounded-lg bg-[#0B101B] border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <label htmlFor="mp-distance-slider" className="font-medium text-slate-300">
                      Multiplayer Route Distance
                    </label>
                    <span className="font-mono-tabular font-bold text-amber-400">
                      {clampedDistance.toLocaleString()}m
                    </span>
                  </div>
                  <input
                    id="mp-distance-slider"
                    type="range"
                    min={MIN_RACE_DISTANCE}
                    max={MAX_RACE_DISTANCE}
                    step={500}
                    value={clampedDistance}
                    onChange={(e) => onSelectDistance(Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    {distancePresets.map((dist) => (
                      <button
                        key={dist}
                        type="button"
                        onClick={() => onSelectDistance(dist)}
                        className={`px-2 py-1 text-[11px] font-mono-tabular rounded border transition-colors ${
                          clampedDistance === dist
                            ? 'border-amber-400 bg-amber-500/15 text-amber-300 font-semibold'
                            : 'border-slate-800 bg-[#131B2E] text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {dist >= 1000 ? `${dist / 1000}km` : `${dist}m`}
                      </button>
                    ))}
                  </div>
                </div>

                {inQueue ? (
                  <div className="p-3.5 rounded-lg border border-amber-500/40 bg-amber-500/10 space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-amber-300">
                        Matching live racers ({clampedDistance.toLocaleString()}m)...
                      </span>
                      <span className="font-mono-tabular text-slate-300">
                        {queueCount} in queue
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={onLeaveQueue}
                      className="w-full min-h-[40px] px-3 py-2 text-xs font-medium border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800 transition-colors"
                    >
                      Cancel Queue
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => onJoinQueue(selectedRealm, 'ranked', clampedDistance)}
                      className="min-h-[44px] px-3 py-2.5 text-xs font-semibold bg-amber-500 text-slate-950 rounded-lg hover:bg-amber-400 transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
                    >
                      <Users className="w-4 h-4" />
                      Ranked Queue
                    </button>
                    <button
                      type="button"
                      onClick={() => onCreateRoom(selectedRealm, 'custom', false, 4, clampedDistance)}
                      className="min-h-[44px] px-3 py-2.5 text-xs font-semibold bg-[#0B101B] text-slate-100 border border-slate-700 rounded-lg hover:border-amber-400 transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
                    >
                      <Plus className="w-4 h-4 text-amber-400" />
                      Create Invite Room
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    maxLength={8}
                    placeholder="Enter 6-char room code"
                    className="flex-1 min-h-[44px] px-3 py-2 text-sm font-mono-tabular bg-[#0B101B] border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="button"
                    disabled={!joinCode.trim()}
                    onClick={() => onJoinRoomCode(joinCode)}
                    className="min-h-[44px] px-4 py-2 text-sm font-semibold bg-slate-800 text-slate-100 border border-slate-700 rounded-lg hover:bg-slate-700 disabled:opacity-50 transition-colors inline-flex items-center gap-1.5"
                  >
                    <LogIn className="w-4 h-4 text-amber-400" />
                    Enter
                  </button>
                </div>

                {openRooms.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-slate-800">
                    <p className="text-xs font-medium text-slate-400">Open Lobbies</p>
                    <div className="space-y-1.5 max-h-28 overflow-y-auto">
                      {openRooms.map((r) => (
                        <button
                          key={r.roomId}
                          type="button"
                          onClick={() => onJoinRoomCode(r.roomCode)}
                          className="w-full px-3 py-2 rounded-lg bg-[#0B101B] border border-slate-800 hover:border-amber-400/60 flex items-center justify-between text-xs transition-colors"
                        >
                          <span className="text-slate-200 truncate">
                            {r.hostName} · {REALMS[r.realm].name} · {(r.targetDistance ?? DEFAULT_RACE_DISTANCE).toLocaleString()}m
                          </span>
                          <span className="font-mono-tabular text-amber-400 shrink-0 ml-2">
                            {r.roomCode} · {r.playerCount}/4
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <p className="text-[11px] text-slate-500 border-t border-slate-800 pt-3">
            Green = boost · Blue = +1 life · Red = hazard · Speed rises continuously &amp; at every 100m!
          </p>
        </div>
      </div>

      {/* 4 Realm Selector Grid with Underlying Descriptive Titles */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-slate-100">
            Select Racing Theme
          </h2>
          <span className="text-xs text-slate-400">
            4 equal-difficulty themes · Unique visual worlds
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {(Object.keys(REALMS) as RealmId[]).map((realmId) => {
            const info = REALMS[realmId];
            const isSelected = selectedRealm === realmId;
            return (
              <button
                key={realmId}
                type="button"
                onClick={() => onSelectRealm(realmId)}
                className={`group rounded-xl border overflow-hidden text-left transition-all duration-150 ${
                  isSelected
                    ? 'border-amber-400 bg-[#182238]'
                    : 'border-slate-800 bg-[#131B2E] hover:border-slate-600'
                }`}
              >
                <div className="relative aspect-[16/9] bg-slate-900 overflow-hidden">
                  <img
                    src={REALM_IMAGES[realmId]}
                    alt={info.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-200"
                  />
                </div>
                <div className="p-4 border-t border-slate-800/80 space-y-1.5">
                  <h3 className="font-display text-base font-bold text-slate-100 truncate">
                    {info.name}
                  </h3>
                  <p className="text-xs text-amber-300/90 line-clamp-2">
                    {REALM_IMAGE_TITLES[realmId]}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};
