import React, { useEffect, useState } from 'react';
import {
  Award,
  CheckCircle2,
  Clock,
  FastForward,
  Footprints,
  Globe,
  Lock,
  LogIn,
  Play,
  Plus,
  Rocket,
  RotateCcw,
  Shield,
  Trophy,
  Users,
} from 'lucide-react';
import { soundFx } from '../lib/soundFx.ts';
import {
  getRoundLevels,
  REALMS,
} from '../shared/boardData.ts';
import {
  CampaignLevel,
  ChatMessage,
  computeRoundRank,
  DEFAULT_RACE_DISTANCE,
  GameMode,
  getActiveGlobalTournamentSchedule,
  getBootsBonusMps,
  getRoundsCompleted,
  LeaderboardEntry,
  MAX_RACE_DISTANCE,
  MIN_RACE_DISTANCE,
  RealmId,
  ROUND_RANK_TIERS,
  UserProfile,
} from '../shared/gameTypes.ts';
import { ChatPanel } from './ChatPanel.tsx';
import { CrystalToken } from './CrystalToken.tsx';
import { ModalDialog } from './ModalDialog.tsx';

interface OpenRoomSummary {
  roomId: string;
  roomCode: string;
  realm: RealmId;
  mode: GameMode;
  targetDistance?: number;
  playerCount: number;
  hostName: string;
}

interface DashboardViewProps {
  clientId: string;
  profile: UserProfile;
  equippedSkin: string;
  leaderboardEntry: LeaderboardEntry | null;
  selectedRealm: RealmId;
  selectedDistance: number;
  globalMessages: ChatMessage[];
  onSelectRealm: (realm: RealmId) => void;
  onSelectDistance: (distance: number) => void;
  onLaunchCampaignLevel: (level: CampaignLevel, realm: RealmId) => void;
  onOpenTournamentLobby: () => void;
  onOpenLeaderboard: () => void;
  onCreateRoom: (
    realm: RealmId,
    mode: GameMode,
    autoStartWithRivals: boolean,
    targetCount?: number,
    targetDistance?: number,
  ) => void;
  onJoinRoomCode: (code: string) => void;
  onSendGlobalChat: (text: string) => void;
}

function formatCountdown(ms: number): string {
  const totalMins = Math.max(0, Math.floor(ms / 60000));
  const days = Math.floor(totalMins / (60 * 24));
  const hours = Math.floor((totalMins % (60 * 24)) / 60);
  const mins = totalMins % 60;
  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  return `${hours}h ${mins}m`;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  clientId,
  profile,
  equippedSkin,
  leaderboardEntry,
  selectedRealm,
  selectedDistance,
  globalMessages,
  onSelectRealm,
  onSelectDistance,
  onLaunchCampaignLevel,
  onOpenTournamentLobby,
  onOpenLeaderboard,
  onCreateRoom,
  onJoinRoomCode,
  onSendGlobalChat,
}) => {
  const [joinCode, setJoinCode] = useState('');
  const [openRooms, setOpenRooms] = useState<OpenRoomSummary[]>([]);
  const [roomModalOpen, setRoomModalOpen] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const roundsCompleted = getRoundsCompleted(profile.highestCampaignLevel);
  const currentRank = computeRoundRank(roundsCompleted);
  const nextRank = computeRoundRank(roundsCompleted + 1);
  const bootsBonus = getBootsBonusMps(roundsCompleted, profile.speedUpgradeLevel ?? 0);

  const activeRoundNumber = roundsCompleted + 1;
  const activeRoundLevels = getRoundLevels(activeRoundNumber);
  const completedInActiveRound = activeRoundLevels.filter(
    (l) => l.level < profile.highestCampaignLevel,
  ).length;
  const schedule = getActiveGlobalTournamentSchedule(nowMs);

  useEffect(() => {
    const t = window.setInterval(() => setNowMs(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
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
        // Ignore transient network error
      }
    };
    fetchRooms();
    const timer = setInterval(fetchRooms, 4500);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  const clampedDistance = Math.min(
    MAX_RACE_DISTANCE,
    Math.max(MIN_RACE_DISTANCE, selectedDistance || DEFAULT_RACE_DISTANCE),
  );

  return (
    <section className="space-y-6">
      {/* Top Player Identity & Rank Header */}
      <div className="rounded-xl border border-slate-800 bg-[#131B2E] p-5 sm:p-6 flex flex-wrap items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <CrystalToken color={profile.crystalColor} skinId={equippedSkin} size="lg" isTurn />
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-xl sm:text-2xl font-bold text-white">
                {profile.displayName}
              </h1>
              <span className="text-xs font-semibold text-amber-300 font-mono-tabular">
                {currentRank.badgeCode} · {currentRank.title}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono-tabular">
              Player Lv {profile.level} · {profile.xp.toLocaleString()} XP · {profile.coins.toLocaleString()} Gold · Rounds Cleared: {roundsCompleted}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="px-3.5 py-2.5 rounded-lg bg-[#0B101B] border border-slate-800">
            <p className="text-slate-400">Next Unlocked Stage</p>
            <p className="font-mono-tabular text-sm font-bold text-emerald-400">
              Level {profile.highestCampaignLevel} (Round {activeRoundNumber})
            </p>
          </div>
          <div className="px-3.5 py-2.5 rounded-lg bg-[#0B101B] border border-slate-800">
            <p className="text-slate-400">Global Rating</p>
            <p className="font-mono-tabular text-sm font-bold text-amber-400">
              {leaderboardEntry ? `${leaderboardEntry.rating} RP · ${leaderboardEntry.tier}` : '1000 RP · Unranked'}
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenLeaderboard}
            className="min-h-[44px] px-4 py-2 text-xs font-semibold bg-slate-800 text-slate-100 border border-slate-700 rounded-xl hover:bg-slate-700 transition-colors inline-flex items-center gap-2 whitespace-nowrap"
          >
            <Trophy className="w-4 h-4 text-amber-400" />
            Leaderboard
          </button>
        </div>
      </div>

      {/* Scheduled Global Round Cup Status Card */}
      <div className="rounded-xl border border-amber-500/30 bg-[#131B2E] p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-amber-500/15 border border-amber-400/40 flex items-center justify-center shrink-0">
            <Globe className="w-5 h-5 text-amber-400" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-amber-300">
              {schedule.title} · Global Round {activeRoundNumber} Open
            </p>
            <p className="text-xs text-slate-300 truncate">
              Race solo in your own space to finish Round {activeRoundNumber} first and boost your Global Leaderboard standing.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#0B101B] border border-slate-800 text-xs font-mono-tabular text-cyan-300">
            <Clock className="w-3.5 h-3.5" />
            {formatCountdown(schedule.remainingMs)} left
          </span>
          <button
            type="button"
            onClick={() => {
              soundFx.playBloop(1);
              onOpenTournamentLobby();
            }}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-semibold text-xs hover:bg-amber-400 transition-colors inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <Play className="w-4 h-4" />
            Enter Round {activeRoundNumber}
          </button>
        </div>
      </div>

      {/* Main 2-Column Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 7 Cols: Round Progress (10-Level Grid) + Unlocked Round Perks */}
        <div className="lg:col-span-7 space-y-6">
          {/* Active 10-Level Round Roadmap */}
          <div className="rounded-xl border border-slate-800 bg-[#131B2E] p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs text-amber-400 font-medium">
                  Round {activeRoundNumber} Roadmap · Levels {(activeRoundNumber - 1) * 10 + 1}–{activeRoundNumber * 10}
                </p>
                <h2 className="font-display text-lg font-bold text-white">
                  Tournament Progress ({completedInActiveRound}/10 Cleared)
                </h2>
              </div>
              <button
                type="button"
                onClick={onOpenTournamentLobby}
                className="min-h-[44px] px-3.5 py-2 text-xs font-semibold bg-amber-500 text-slate-950 rounded-xl hover:bg-amber-400 transition-colors inline-flex items-center gap-1.5 whitespace-nowrap"
              >
                <LogIn className="w-4 h-4" />
                Open Level Lobby
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {activeRoundLevels.map((lvl) => {
                const isCompleted = lvl.level < profile.highestCampaignLevel;
                const isNext = lvl.level === profile.highestCampaignLevel;
                const isLocked = lvl.level > profile.highestCampaignLevel;

                return (
                  <button
                    key={lvl.level}
                    type="button"
                    disabled={isLocked}
                    onClick={() => onLaunchCampaignLevel(lvl, selectedRealm)}
                    className={`p-3 rounded-xl border text-left transition-colors flex flex-col justify-between min-h-[88px] ${
                      isNext
                        ? 'border-amber-400 bg-amber-500/15 hover:bg-amber-500/20'
                        : isCompleted
                          ? 'border-emerald-500/40 bg-emerald-950/30 hover:border-emerald-400'
                          : 'border-slate-800 bg-[#0B101B]/60 opacity-60 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-mono-tabular text-xs font-bold text-white">
                        Lv {lvl.level}
                      </span>
                      {isCompleted ? (
                        <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
                      ) : isNext ? (
                        <Play className="w-3.5 h-3.5 text-amber-400" />
                      ) : (
                        <Lock className="w-3.5 h-3.5 text-slate-500" />
                      )}
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[11px] font-medium text-slate-200 truncate">
                        {lvl.task.title}
                      </p>
                      <p className="text-[10px] text-slate-400 flex items-center gap-1">
                        {isCompleted ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                            <span>Replay</span>
                          </>
                        ) : isNext ? (
                          'Play Stage'
                        ) : (
                          'Locked'
                        )}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="p-3 rounded-lg bg-[#0B101B] border border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-slate-300">
                Complete Level {activeRoundNumber * 10} to reach{' '}
                <strong className="text-amber-300">{nextRank.title}</strong> and unlock Round {activeRoundNumber + 1} perks!
              </span>
              <span className="font-mono-tabular text-emerald-400">
                +2 Shields · +2 Jetpacks · +2.5 m/s Boots
              </span>
            </div>
          </div>

          {/* Unlocked Round Perks & Rank Ladder */}
          <div className="rounded-xl border border-slate-800 bg-[#131B2E] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-400" />
                Unlocked Round Perks & Inventory
              </h2>
              <span className="text-xs text-slate-400">Active in all races</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-[#0B101B] border border-slate-800 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-300">
                  <Footprints className="w-4 h-4" />
                  Swift Boots
                </div>
                <p className="font-mono-tabular text-base font-bold text-white">
                  +{bootsBonus.toFixed(1)} m/s
                </p>
                <p className="text-[10px] text-slate-400">
                  Tier {roundsCompleted} Passive Speed
                </p>
              </div>

              <div className="p-3 rounded-lg bg-[#0B101B] border border-slate-800 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-300">
                  <Shield className="w-4 h-4" />
                  Aegis Shields
                </div>
                <p className="font-mono-tabular text-base font-bold text-white">
                  x{profile.powerupInventory.shield ?? 0}
                </p>
                <p className="text-[10px] text-slate-400">Blocks hazard hits</p>
              </div>

              <div className="p-3 rounded-lg bg-[#0B101B] border border-slate-800 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-300">
                  <Rocket className="w-4 h-4" />
                  Jetpacks
                </div>
                <p className="font-mono-tabular text-base font-bold text-white">
                  x{profile.powerupInventory.boost ?? 0}
                </p>
                <p className="text-[10px] text-slate-400">Forward jet surge</p>
              </div>

              <div className="p-3 rounded-lg bg-[#0B101B] border border-slate-800 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-300">
                  <FastForward className="w-4 h-4" />
                  Phase Leaps
                </div>
                <p className="font-mono-tabular text-base font-bold text-white">
                  x{profile.powerupInventory.leap ?? 0}
                </p>
                <p className="text-[10px] text-slate-400">Hurdle red traps</p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 space-y-2">
              <p className="text-xs font-semibold text-slate-300">Round Rank Progression</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {ROUND_RANK_TIERS.map((rankTier) => {
                  const unlocked = roundsCompleted >= rankTier.roundsRequired;
                  const isCurrent = currentRank.title === rankTier.title;
                  return (
                    <div
                      key={rankTier.title}
                      className={`px-3 py-2 rounded-lg border flex items-center justify-between gap-2 ${
                        isCurrent
                          ? 'border-amber-400 bg-amber-500/10'
                          : unlocked
                            ? 'border-emerald-500/30 bg-[#0B101B]'
                            : 'border-slate-800/80 bg-[#0B101B]/50 opacity-65'
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-100 truncate">
                          {rankTier.badgeCode} · {rankTier.title}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">
                          {rankTier.roundsRequired === 0
                            ? 'Starter Rank'
                            : `Complete ${rankTier.roundsRequired} Round${rankTier.roundsRequired > 1 ? 's' : ''} (Lv ${rankTier.roundsRequired * 10})`}
                        </p>
                      </div>
                      <span className="font-mono-tabular text-[11px] text-amber-300 shrink-0">
                        +{rankTier.bootsBonusMps.toFixed(1)} m/s
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Right 5 Cols: Create/Join Multiplayer Room + Real-Time Global Chatroom */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-xl border border-slate-800 bg-[#131B2E] p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-400" />
                Multiplayer Room Hub
              </h2>
              <button
                type="button"
                onClick={() => setRoomModalOpen(true)}
                className="min-h-[40px] px-3 py-1.5 rounded-xl border border-slate-700 bg-[#0B101B] text-xs font-semibold text-amber-300 hover:border-amber-400 inline-flex items-center gap-1.5 transition-colors"
              >
                <LogIn className="w-3.5 h-3.5" />
                Room Pop-Up
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Race Theme</label>
                <select
                  value={selectedRealm}
                  onChange={(e) => onSelectRealm(e.target.value as RealmId)}
                  className="w-full min-h-[44px] px-2.5 py-1.5 text-xs bg-[#0B101B] border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-amber-400"
                >
                  {(Object.keys(REALMS) as RealmId[]).map((id) => (
                    <option key={id} value={id}>
                      {REALMS[id].name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Route Distance</label>
                <select
                  value={clampedDistance}
                  onChange={(e) => onSelectDistance(Number(e.target.value))}
                  className="w-full min-h-[44px] px-2.5 py-1.5 text-xs font-mono-tabular bg-[#0B101B] border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-amber-400"
                >
                  {[1000, 2000, 3000, 4000, 6000, 8000, 10000].map((d) => (
                    <option key={d} value={d}>
                      {d.toLocaleString()}m
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onCreateRoom(selectedRealm, 'custom', false, 4, clampedDistance)}
              className="w-full min-h-[46px] px-4 py-2.5 text-xs font-semibold bg-amber-500 text-slate-950 rounded-xl hover:bg-amber-400 transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Invite Room ({REALMS[selectedRealm].name})
            </button>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                maxLength={8}
                placeholder="Enter 6-char room code"
                className="flex-1 min-h-[44px] px-3 py-2 text-xs font-mono-tabular bg-[#0B101B] border border-slate-700 rounded-xl text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
              />
              <button
                type="button"
                disabled={!joinCode.trim()}
                onClick={() => onJoinRoomCode(joinCode)}
                className="min-h-[44px] px-4 py-2 text-xs font-semibold bg-slate-800 text-slate-100 border border-slate-700 rounded-xl hover:bg-slate-700 disabled:opacity-45 transition-colors inline-flex items-center gap-1.5"
              >
                <LogIn className="w-4 h-4 text-amber-400" />
                Enter
              </button>
            </div>

            {openRooms.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-slate-800">
                <p className="text-[11px] font-medium text-slate-400">Active Waiting Rooms</p>
                <div className="space-y-1.5 max-h-28 overflow-y-auto">
                  {openRooms.map((r) => (
                    <button
                      key={r.roomId}
                      type="button"
                      onClick={() => onJoinRoomCode(r.roomCode)}
                      className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-[#0B101B] border border-slate-800 hover:border-amber-400/60 flex items-center justify-between text-xs transition-colors"
                    >
                      <span className="text-slate-200 truncate">
                        {r.hostName} · {REALMS[r.realm].name} · {(r.targetDistance ?? DEFAULT_RACE_DISTANCE).toLocaleString()}m
                      </span>
                      <span className="font-mono-tabular text-amber-400 shrink-0 ml-2 inline-flex items-center gap-1">
                        {r.roomCode} · {r.playerCount}/4
                        <Play className="w-3.5 h-3.5" />
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <ChatPanel
            title="Global Trail Chatroom"
            subtitle="Live runner lounge · Share room codes & challenge rivals"
            messages={globalMessages}
            currentUserId={clientId}
            placeholder="Chat with other runners or share a room code..."
            onSendMessage={onSendGlobalChat}
          />
        </div>
      </div>

      {/* Interactive Room Create / Enter Pop-Up */}
      <ModalDialog
        open={roomModalOpen}
        title="Enter or Create Race Room"
        subtitle="Quick mobile room launcher"
        icon={<Users className="w-5 h-5 text-amber-400" />}
        onClose={() => setRoomModalOpen(false)}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Theme</label>
              <select
                value={selectedRealm}
                onChange={(e) => onSelectRealm(e.target.value as RealmId)}
                className="w-full min-h-[44px] px-2.5 py-1.5 text-xs bg-[#0B101B] border border-slate-700 rounded-xl text-slate-100"
              >
                {(Object.keys(REALMS) as RealmId[]).map((id) => (
                  <option key={id} value={id}>
                    {REALMS[id].name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Distance</label>
              <select
                value={clampedDistance}
                onChange={(e) => onSelectDistance(Number(e.target.value))}
                className="w-full min-h-[44px] px-2.5 py-1.5 text-xs font-mono-tabular bg-[#0B101B] border border-slate-700 rounded-xl text-slate-100"
              >
                {[1000, 2000, 3000, 4000, 6000, 8000, 10000].map((d) => (
                  <option key={d} value={d}>
                    {d.toLocaleString()}m
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setRoomModalOpen(false);
              onCreateRoom(selectedRealm, 'custom', false, 4, clampedDistance);
            }}
            className="w-full min-h-[48px] px-4 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-semibold text-sm hover:bg-amber-400 transition-colors inline-flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4" />
            Create &amp; Enter Room
          </button>

          <div className="pt-2 border-t border-slate-800 space-y-2">
            <label className="block text-xs font-medium text-slate-300">
              Enter Existing Room Code
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                maxLength={8}
                placeholder="ROOM CODE"
                className="flex-1 min-h-[44px] px-3 py-2 text-sm font-mono-tabular bg-[#0B101B] border border-slate-700 rounded-xl text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
              />
              <button
                type="button"
                disabled={!joinCode.trim()}
                onClick={() => {
                  setRoomModalOpen(false);
                  onJoinRoomCode(joinCode);
                }}
                className="min-h-[44px] px-4 py-2 text-xs font-semibold bg-emerald-500 text-slate-950 rounded-xl hover:bg-emerald-400 disabled:opacity-45 transition-colors inline-flex items-center gap-1.5"
              >
                <LogIn className="w-4 h-4" />
                Enter
              </button>
            </div>
          </div>
        </div>
      </ModalDialog>
    </section>
  );
};
