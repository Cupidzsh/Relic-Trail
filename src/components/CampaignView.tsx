import React, { useEffect, useState } from 'react';
import {
  Award,
  CheckCircle2,
  Clock,
  Globe,
  Heart,
  Lock,
  Play,
  RotateCcw,
  Target,
  Trophy,
} from 'lucide-react';
import {
  REALM_IMAGES,
  REALM_IMAGE_TITLES,
  TOURNAMENT_GRAPHICS,
} from '../lib/realmAssets.ts';
import { soundFx } from '../lib/soundFx.ts';
import { subscribeRoundTournamentStandings } from '../services/progressionService.ts';
import {
  CRYSTAL_PALETTE,
  getRoundLevels,
  getRoundMilestoneReward,
  REALMS,
} from '../shared/boardData.ts';
import {
  CampaignLevel,
  computeRoundRank,
  getActiveGlobalTournamentSchedule,
  getRoundsCompleted,
  RealmId,
  RoundTournamentEntry,
  UserProfile,
} from '../shared/gameTypes.ts';
import { CrystalToken } from './CrystalToken.tsx';
import { ModalDialog } from './ModalDialog.tsx';

interface CampaignViewProps {
  profile: UserProfile;
  currentUid: string | null;
  selectedRealm: RealmId;
  onSelectRealm: (realm: RealmId) => void;
  onLaunchCampaignLevel: (level: CampaignLevel, realm: RealmId) => void;
  onSignIn: () => void;
}

function formatRemaining(ms: number): string {
  const totalMins = Math.max(0, Math.floor(ms / 60000));
  const days = Math.floor(totalMins / (60 * 24));
  const hours = Math.floor((totalMins % (60 * 24)) / 60);
  const mins = totalMins % 60;
  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  return `${hours}h ${mins}m`;
}

export const CampaignView: React.FC<CampaignViewProps> = ({
  profile,
  currentUid,
  selectedRealm,
  onSelectRealm,
  onLaunchCampaignLevel,
  onSignIn,
}) => {
  const activeRealm = REALMS[selectedRealm];
  const roundsCompleted = getRoundsCompleted(profile.highestCampaignLevel);
  const currentRound = roundsCompleted + 1;
  const [selectedRound, setSelectedRound] = useState<number>(currentRound);
  const [roundStandings, setRoundStandings] = useState<RoundTournamentEntry[]>([]);
  const [briefingLevel, setBriefingLevel] = useState<CampaignLevel | null>(null);
  const [standingsModalOpen, setStandingsModalOpen] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    setSelectedRound(currentRound);
  }, [currentRound]);

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const unsub = subscribeRoundTournamentStandings(
      selectedRound,
      (entries) => setRoundStandings(entries),
      (err) => console.warn('Round tournament standings error:', err.message),
    );
    return () => unsub();
  }, [selectedRound]);

  const schedule = getActiveGlobalTournamentSchedule(nowMs);
  const visibleRounds = Array.from({ length: currentRound + 1 }, (_, i) => i + 1);
  const roundLevels = getRoundLevels(selectedRound);
  const roundStart = (selectedRound - 1) * 10 + 1;
  const roundEnd = selectedRound * 10;
  const targetRankForRound = computeRoundRank(selectedRound);
  const roundMilestone = getRoundMilestoneReward(selectedRound);
  const isRoundCleared = selectedRound <= roundsCompleted;
  const roundChampion = roundStandings.find((e) => e.completedRound);

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="space-y-1">
          <p className="text-xs text-amber-400 font-medium">
            Global Scheduled Tournaments · 10 Levels Per Round · 3-Life Limit
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">
            Tournament Level Lobby
          </h1>
          <p className="text-sm text-slate-400 max-w-2xl">
            Play solo in your own space to race against players worldwide. Each Round crowns the first player to finish all 10 stages and boosts your Global Leaderboard rank!
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 text-xs sm:text-sm bg-[#131B2E] border border-slate-800 rounded-xl px-3.5 py-2.5">
            <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-slate-300">{computeRoundRank(roundsCompleted).title}</span>
            <span className="text-slate-600" aria-hidden="true">·</span>
            <span className="font-mono-tabular font-bold text-amber-400">
              Lv {profile.highestCampaignLevel}
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              soundFx.playBloop(1);
              setStandingsModalOpen(true);
            }}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-semibold text-xs hover:bg-amber-400 transition-colors inline-flex items-center gap-2 whitespace-nowrap"
          >
            <Globe className="w-4 h-4" />
            Round {selectedRound} Cup Standings
          </button>
        </div>
      </div>

      {/* Scheduled Global Round Tournament Strip */}
      <div className="rounded-xl border border-amber-500/30 bg-[#131B2E] p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-amber-500/15 border border-amber-400/40 flex items-center justify-center shrink-0">
            <Globe className="w-5 h-5 text-amber-400" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-amber-300 flex items-center gap-2">
              <span>{schedule.title} · Round {selectedRound} Bracket</span>
            </p>
            <p className="text-xs text-slate-300 truncate">
              {roundChampion
                ? `First to Finish Round ${selectedRound}: ${roundChampion.displayName} (${(roundChampion.totalClearTimeMs / 1000).toFixed(1)}s total)`
                : `Race solo to be the 1st player in the world to finish Round ${selectedRound} (Lv ${roundEnd})!`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs shrink-0">
          <span className="inline-flex items-center gap-1.5 font-mono-tabular text-cyan-300 bg-[#0B101B] border border-slate-800 px-3 py-2 rounded-lg">
            <Clock className="w-3.5 h-3.5" />
            Ends in {formatRemaining(schedule.remainingMs)}
          </span>
          {!currentUid && (
            <button
              type="button"
              onClick={onSignIn}
              className="min-h-[40px] px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 hover:bg-slate-700 font-semibold transition-colors"
            >
              Sign In to Rank
            </button>
          )}
        </div>
      </div>

      {/* Round Selector Tabs (Infinite Rounds 1..N+1) */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {visibleRounds.map((roundNum) => {
            const start = (roundNum - 1) * 10 + 1;
            const end = roundNum * 10;
            const cleared = roundNum <= roundsCompleted;
            const locked = roundNum > currentRound;
            const active = selectedRound === roundNum;

            return (
              <button
                key={roundNum}
                type="button"
                onClick={() => {
                  soundFx.playBloop(roundNum);
                  setSelectedRound(roundNum);
                }}
                className={`min-h-[44px] px-4 py-2 rounded-xl border text-xs font-semibold transition-colors inline-flex items-center gap-2 ${
                  active
                    ? 'border-amber-400 bg-amber-500 text-slate-950'
                    : locked
                      ? 'border-slate-800 bg-[#0F1524] text-slate-400 hover:border-slate-700'
                      : 'border-slate-700 bg-[#131B2E] text-slate-200 hover:border-amber-400/60'
                }`}
              >
                {cleared ? (
                  <CheckCircle2 className={`w-4 h-4 ${active ? 'text-slate-950' : 'text-emerald-400'}`} />
                ) : locked ? (
                  <Lock className="w-4 h-4 text-slate-500" />
                ) : null}
                <span>Round {roundNum}</span>
                <span className="font-mono-tabular opacity-80">
                  (Lv {start}–{end})
                </span>
              </button>
            );
          })}
        </div>

        {/* Round Milestone Banner */}
        <div className="rounded-xl border border-slate-800 bg-[#131B2E] px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <Award className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <p className="font-semibold text-slate-100">
                Round {selectedRound} Completion Reward (Clear Level {roundEnd})
              </p>
              <p className="text-slate-400">
                Unlocks Rank <span className="text-amber-300 font-semibold">{targetRankForRound.title}</span> &amp; grants {roundMilestone.summary}
              </p>
            </div>
          </div>
          <span
            className={`font-mono-tabular font-semibold ${
              isRoundCleared ? 'text-emerald-400' : 'text-amber-300'
            }`}
          >
            {isRoundCleared ? 'ROUND CLEARED' : `LEVELS ${roundStart}–${roundEnd}`}
          </span>
        </div>
      </div>

      {/* Theme Selector with Underlying Descriptive Titles */}
      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
          <span className="font-semibold text-slate-200">
            Active Race Theme: {activeRealm.name}
          </span>
          <span>Tap any theme icon to select · Equal difficulty across themes</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {(Object.keys(REALMS) as RealmId[]).map((realmId, rIdx) => {
            const info = REALMS[realmId];
            const isSelected = selectedRealm === realmId;
            return (
              <button
                key={realmId}
                type="button"
                onClick={() => {
                  soundFx.playBloop(rIdx);
                  onSelectRealm(realmId);
                }}
                className={`rounded-xl border overflow-hidden text-left transition-all ${
                  isSelected
                    ? 'border-amber-400 bg-[#182238]'
                    : 'border-slate-800 bg-[#131B2E] hover:border-slate-600'
                }`}
              >
                <div className="relative h-24 bg-slate-900">
                  <img
                    src={REALM_IMAGES[realmId]}
                    alt={info.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="px-3 py-2.5 border-t border-slate-800/80 space-y-0.5">
                  <p className="font-display text-sm font-bold text-slate-100 truncate">
                    {info.name}
                  </p>
                  <p className="text-[11px] text-slate-400 line-clamp-1">
                    {REALM_IMAGE_TITLES[realmId]}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 10 Graphically Represented Tournament Cards for Selected Round */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {roundLevels.map((lvl, idx) => {
          const isUnlocked = lvl.level <= profile.highestCampaignLevel;
          const isCleared = lvl.level < profile.highestCampaignLevel;
          const isNextTarget = lvl.level === profile.highestCampaignLevel;
          const graphic = TOURNAMENT_GRAPHICS[lvl.task.type];

          return (
            <div
              key={lvl.level}
              onClick={() => {
                soundFx.playBloop(idx);
                setBriefingLevel(lvl);
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setBriefingLevel(lvl);
                }
              }}
              className={`rounded-xl border overflow-hidden flex flex-col justify-between transition-colors cursor-pointer ${
                isNextTarget
                  ? 'border-amber-400 bg-[#162038]'
                  : isUnlocked
                    ? 'border-slate-700 bg-[#131B2E] hover:border-amber-400/60'
                    : 'border-slate-800/70 bg-[#0F1524] opacity-75'
              }`}
            >
              <div>
                <div className="relative aspect-[16/10] bg-slate-900 overflow-hidden">
                  <img
                    src={graphic.src}
                    alt={lvl.imageCaption}
                    referrerPolicy="no-referrer"
                    className={`w-full h-full object-cover ${isUnlocked ? '' : 'grayscale opacity-70'}`}
                  />
                </div>

                <div className="px-4 py-2 bg-[#0B101B] border-y border-slate-800 flex items-center justify-between gap-2">
                  <p className="text-[11px] font-medium text-amber-300 truncate">
                    {lvl.imageCaption}
                  </p>
                  {isCleared ? (
                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-semibold shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Completed
                    </span>
                  ) : isNextTarget ? (
                    <span className="text-[11px] text-amber-300 font-semibold shrink-0">
                      Unlocked
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 shrink-0">
                      <Lock className="w-3.5 h-3.5" />
                      Locked
                    </span>
                  )}
                </div>

                <div className="p-4 space-y-2.5">
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-400 font-mono-tabular">
                    <span>Level {lvl.level} · {lvl.hazardIntensity}</span>
                    <span>{activeRealm.name}</span>
                  </div>

                  <h3 className="font-display text-lg font-bold text-slate-100">
                    {lvl.title}
                  </h3>

                  <div className="p-2.5 rounded-lg bg-[#0B101B] border border-slate-800 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-300">
                      <Target className="w-3.5 h-3.5 shrink-0" />
                      <span>Mission: {lvl.task.title}</span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      Rules: {lvl.rulesSummary}
                    </p>
                    <p className="text-[11px] text-rose-300 flex items-center gap-1 pt-0.5">
                      <Heart className="w-3 h-3 fill-rose-500 text-rose-500" />
                      <span>3 Lives Limit — 0 lives ends the run</span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="px-4 pb-4 pt-3 border-t border-slate-800/70 flex items-center justify-between gap-3">
                <div className="text-xs font-mono-tabular text-slate-400">
                  +{lvl.rewardXp} XP · +{lvl.rewardGold} Gold
                </div>
                <button
                  type="button"
                  disabled={!isUnlocked}
                  onClick={(e) => {
                    e.stopPropagation();
                    soundFx.playBloop(2);
                    onLaunchCampaignLevel(lvl, selectedRealm);
                  }}
                  className={`min-h-[44px] px-4 py-2 text-xs font-semibold rounded-xl inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                    isUnlocked
                      ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {isCleared ? (
                    <>
                      <RotateCcw className="w-4 h-4" />
                      Replay
                    </>
                  ) : isUnlocked ? (
                    <>
                      <Play className="w-4 h-4" />
                      Play
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      Locked
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Stage Briefing Pop-Up Box (with Close X, Play / Replay) */}
      <ModalDialog
        open={Boolean(briefingLevel)}
        title={briefingLevel?.title ?? ''}
        subtitle={briefingLevel ? `Level ${briefingLevel.level} · ${activeRealm.name}` : undefined}
        icon={<Target className="w-5 h-5 text-amber-400" />}
        onClose={() => setBriefingLevel(null)}
      >
        {briefingLevel && (
          <div className="space-y-4">
            <div className="rounded-xl overflow-hidden border border-slate-800">
              <img
                src={TOURNAMENT_GRAPHICS[briefingLevel.task.type].src}
                alt={briefingLevel.imageCaption}
                referrerPolicy="no-referrer"
                className="w-full h-36 object-cover"
              />
              <p className="px-3 py-2 text-[11px] font-medium text-amber-300 bg-[#0B101B] border-t border-slate-800">
                {briefingLevel.imageCaption}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#0B101B] border border-slate-800 space-y-2 text-xs">
              <p className="font-semibold text-emerald-300">Mission: {briefingLevel.task.title}</p>
              <p className="text-slate-300 leading-relaxed">{briefingLevel.task.description}</p>
              <p className="text-amber-300/90 leading-relaxed">Rules: {briefingLevel.rulesSummary}</p>
              <div className="grid grid-cols-2 gap-2 pt-1 font-mono-tabular text-slate-400">
                <span>Distance: {briefingLevel.targetDistance.toLocaleString()}m</span>
                <span>Base Speed: {briefingLevel.baseSpeed} m/s</span>
                <span>Perk Size: {briefingLevel.perkSizePx}px</span>
                <span>Reward: +{briefingLevel.rewardGold} Gold</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {briefingLevel.level <= profile.highestCampaignLevel ? (
                <button
                  type="button"
                  onClick={() => {
                    const target = briefingLevel;
                    setBriefingLevel(null);
                    onLaunchCampaignLevel(target, selectedRealm);
                  }}
                  className="flex-1 min-h-[46px] px-4 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-semibold text-sm hover:bg-amber-400 transition-colors inline-flex items-center justify-center gap-2"
                >
                  {briefingLevel.level < profile.highestCampaignLevel ? (
                    <>
                      <RotateCcw className="w-4 h-4" />
                      Replay Level
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      Play Level {briefingLevel.level}
                    </>
                  )}
                </button>
              ) : (
                <div className="flex-1 min-h-[46px] px-4 py-2.5 rounded-xl bg-slate-800 text-slate-400 font-semibold text-xs inline-flex items-center justify-center gap-2">
                  <Lock className="w-4 h-4" />
                  Clear Level {briefingLevel.level - 1} First
                </div>
              )}
            </div>
          </div>
        )}
      </ModalDialog>

      {/* Global Scheduled Round Tournament Standings Pop-Up */}
      <ModalDialog
        open={standingsModalOpen}
        title={`Round ${selectedRound} Global Cup Standings`}
        subtitle={`${schedule.title} · First player to finish Lv ${roundEnd} claims #1`}
        icon={<Globe className="w-5 h-5 text-amber-400" />}
        maxWidthClass="max-w-lg"
        onClose={() => setStandingsModalOpen(false)}
      >
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-[#0B101B] border border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-300">Window closes in</span>
            <span className="font-mono-tabular font-bold text-cyan-300">
              {formatRemaining(schedule.remainingMs)}
            </span>
          </div>

          {roundStandings.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400 rounded-xl border border-slate-800 bg-[#0B101B]">
              No global entries recorded for Round {selectedRound} yet. Complete stages in Round {selectedRound} while signed in to claim #1!
            </div>
          ) : (
            <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
              {roundStandings.map((entry, idx) => {
                const pal = CRYSTAL_PALETTE[entry.crystalColor] ?? CRYSTAL_PALETTE.ruby;
                const isSelf = currentUid === entry.uid;
                return (
                  <div
                    key={entry.entryId}
                    className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                      isSelf
                        ? 'border-amber-400 bg-amber-500/10'
                        : 'border-slate-800 bg-[#0B101B]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="font-mono-tabular font-bold text-amber-300 w-6">
                        #{idx + 1}
                      </span>
                      <CrystalToken color={entry.crystalColor} size="sm" />
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-100 truncate">
                          {entry.displayName}
                          {isSelf ? ' (You)' : ''}
                        </p>
                        <p className={`text-[11px] ${pal.textClass}`}>
                          {entry.completedRound ? '1st Round Finisher!' : `${entry.stagesCleared}/10 stages`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right font-mono-tabular shrink-0">
                      <p className="font-bold text-emerald-400">
                        {entry.completedRound ? 'FINISHED' : `${entry.stagesCleared}/10`}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {(entry.totalClearTimeMs / 1000).toFixed(1)}s
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setStandingsModalOpen(false);
                const nextInRound =
                  roundLevels.find((l) => l.level === profile.highestCampaignLevel) ??
                  roundLevels[0];
                if (nextInRound.level <= profile.highestCampaignLevel) {
                  onLaunchCampaignLevel(nextInRound, selectedRealm);
                }
              }}
              className="flex-1 min-h-[46px] px-4 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-semibold text-sm hover:bg-amber-400 transition-colors inline-flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4" />
              Enter Round {selectedRound} Race
            </button>
          </div>
        </div>
      </ModalDialog>
    </section>
  );
};
