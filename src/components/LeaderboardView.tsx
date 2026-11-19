import React, { useEffect, useState } from 'react';
import { Award, Clock, Globe, Play, Shield, Trophy } from 'lucide-react';
import { subscribeRoundTournamentStandings } from '../services/progressionService.ts';
import { CRYSTAL_PALETTE, REALMS } from '../shared/boardData.ts';
import {
  computeRoundRank,
  computeTierFromRating,
  CURRENT_SEASON_NAME,
  getActiveGlobalTournamentSchedule,
  LeaderboardEntry,
  MatchRecord,
  ROUND_RANK_TIERS,
  RoundTournamentEntry,
  SeasonalTier,
} from '../shared/gameTypes.ts';
import { CrystalToken } from './CrystalToken.tsx';

interface LeaderboardViewProps {
  entries: LeaderboardEntry[];
  matchHistory: MatchRecord[];
  currentUid: string | null;
  isSignedIn: boolean;
  onSignIn: () => void;
  onOpenTournamentLobby?: () => void;
}

const TIERS: { name: SeasonalTier; minRp: number; reward: string }[] = [
  { name: 'Bronze Crystal', minRp: 0, reward: '100 End-of-Season Gold' },
  { name: 'Silver Facet', minRp: 1000, reward: '250 Gold + 1 Leap Pack' },
  { name: 'Gold Relic', minRp: 1400, reward: '500 Gold + 2 Swap Charges' },
  { name: 'Emerald Paragon', minRp: 1800, reward: '900 Gold + Paragon Emblem' },
  { name: 'Obsidian Grandmaster', minRp: 2200, reward: '1,500 Gold + Grandmaster Aura' },
];

function formatCountdown(ms: number): string {
  const totalMins = Math.max(0, Math.floor(ms / 60000));
  const days = Math.floor(totalMins / (60 * 24));
  const hours = Math.floor((totalMins % (60 * 24)) / 60);
  const mins = totalMins % 60;
  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  return `${hours}h ${mins}m`;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({
  entries,
  matchHistory,
  currentUid,
  isSignedIn,
  onSignIn,
  onOpenTournamentLobby,
}) => {
  const myEntry = currentUid ? entries.find((e) => e.uid === currentUid) : null;
  const maxRoundTab = Math.max(4, (myEntry?.roundsCompleted ?? 0) + 1);
  const [selectedRound, setSelectedRound] = useState(1);
  const [roundEntries, setRoundEntries] = useState<RoundTournamentEntry[]>([]);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const t = window.setInterval(() => setNowMs(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const unsub = subscribeRoundTournamentStandings(
      selectedRound,
      (list) => setRoundEntries(list),
      (err) => console.warn('Round standings subscription error:', err.message),
    );
    return () => unsub();
  }, [selectedRound]);

  const schedule = getActiveGlobalTournamentSchedule(nowMs);
  const roundTabs = Array.from({ length: maxRoundTab }, (_, i) => i + 1);
  const roundChampion = roundEntries.find((r) => r.completedRound);

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="space-y-1">
          <p className="text-xs text-amber-400 font-medium">{CURRENT_SEASON_NAME}</p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">
            Global Seasonal Rankings &amp; Round Cups
          </h1>
          <p className="text-sm text-slate-400">
            Compete in global Round Tournaments and ranked multiplayer races to climb seasonal tiers and claim Relic rewards.
          </p>
        </div>

        {!isSignedIn && (
          <button
            type="button"
            onClick={onSignIn}
            className="min-h-[44px] px-4 py-2 text-sm font-semibold bg-amber-500 text-slate-950 rounded-xl hover:bg-amber-400 transition-colors whitespace-nowrap"
          >
            Sign In to Claim Rank
          </button>
        )}
      </div>

      {/* Scheduled Global Round Tournaments Bracket Panel */}
      <div className="rounded-xl border border-amber-500/30 bg-[#131B2E] p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-400/40 flex items-center justify-center shrink-0">
              <Globe className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="font-display text-base sm:text-lg font-bold text-white">
                {schedule.title} · First-to-Finish Round Cups
              </h2>
              <p className="text-xs text-slate-400">
                Players worldwide race solo in their own space; each Round crowns the first player to clear all 10 stages.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#0B101B] border border-slate-800 text-xs font-mono-tabular text-cyan-300">
              <Clock className="w-3.5 h-3.5" />
              Cycle ends in {formatCountdown(schedule.remainingMs)}
            </span>
            {onOpenTournamentLobby && (
              <button
                type="button"
                onClick={onOpenTournamentLobby}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-semibold hover:bg-amber-400 transition-colors inline-flex items-center gap-1.5 whitespace-nowrap"
              >
                <Play className="w-4 h-4" />
                Play Tournament
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {roundTabs.map((rNum) => {
            const active = selectedRound === rNum;
            return (
              <button
                key={rNum}
                type="button"
                onClick={() => setSelectedRound(rNum)}
                className={`min-h-[40px] px-3.5 py-1.5 rounded-xl border text-xs font-semibold transition-colors ${
                  active
                    ? 'border-amber-400 bg-amber-500 text-slate-950'
                    : 'border-slate-700 bg-[#0B101B] text-slate-300 hover:border-amber-400/60'
                }`}
              >
                Round {rNum} (Lv {(rNum - 1) * 10 + 1}–{rNum * 10})
              </button>
            );
          })}
        </div>

        {roundChampion && (
          <div className="px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-400/40 text-xs text-amber-200 flex flex-wrap items-center justify-between gap-2">
            <span className="font-semibold flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              Round {selectedRound} First-to-Finish Leader: {roundChampion.displayName}
            </span>
            <span className="font-mono-tabular text-amber-300">
              10/10 Stages · {(roundChampion.totalClearTimeMs / 1000).toFixed(1)}s Total
            </span>
          </div>
        )}

        {roundEntries.length === 0 ? (
          <div className="p-5 rounded-xl border border-slate-800 bg-[#0B101B] text-center text-xs text-slate-400">
            No global finishers or challengers recorded yet in Round {selectedRound}. Clear any stage in Round {selectedRound} while signed in to take #1!
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {roundEntries.slice(0, 9).map((entry, idx) => {
              const pal = CRYSTAL_PALETTE[entry.crystalColor] ?? CRYSTAL_PALETTE.ruby;
              const isSelf = currentUid === entry.uid;
              return (
                <div
                  key={entry.entryId}
                  className={`p-3 rounded-xl border flex items-center justify-between gap-2 text-xs ${
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
                        {entry.completedRound ? 'Finished Round!' : `${entry.stagesCleared}/10 Stages`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right font-mono-tabular shrink-0">
                    <p className="font-bold text-emerald-400">
                      {entry.completedRound ? 'CHAMP' : `${entry.stagesCleared}/10`}
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Global Rankings Table */}
        <div className="lg:col-span-8 rounded-xl border border-slate-800 bg-[#131B2E] overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              Top Ranked Runners
            </h2>
            <span className="text-xs text-slate-400 font-mono-tabular">
              {entries.length} ranked
            </span>
          </div>

          {entries.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-400">
              No seasonal ranked matches recorded yet. Sign in and finish a Ranked match or Tournament stage to claim #1!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-xs text-slate-400">
                    <th className="py-3 px-4 font-medium">Rank</th>
                    <th className="py-3 px-4 font-medium">Runner</th>
                    <th className="py-3 px-4 font-medium">Round Rank</th>
                    <th className="py-3 px-4 font-medium">Season Tier</th>
                    <th className="py-3 px-4 font-medium text-right">Wins</th>
                    <th className="py-3 px-4 font-medium text-right">Rating</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70 text-sm">
                  {entries.map((entry, idx) => {
                    const isSelf = currentUid === entry.uid;
                    const palette = CRYSTAL_PALETTE[entry.crystalColor] ?? CRYSTAL_PALETTE.ruby;
                    const winRate =
                      entry.gamesPlayed > 0
                        ? Math.round((entry.wins / entry.gamesPlayed) * 100)
                        : 0;
                    const roundTitle =
                      entry.playerRank || computeRoundRank(entry.roundsCompleted ?? 0).title;
                    return (
                      <tr
                        key={entry.uid}
                        className={isSelf ? 'bg-amber-500/10' : 'hover:bg-slate-800/35'}
                      >
                        <td className="py-3 px-4 font-mono-tabular font-bold text-slate-300">
                          #{idx + 1}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <CrystalToken color={entry.crystalColor} size="sm" />
                            <div>
                              <p className="font-medium text-slate-100">
                                {entry.displayName}
                                {isSelf ? ' (You)' : ''}
                              </p>
                              <p className={`text-[11px] ${palette.textClass}`}>
                                {palette.name} Crystal · Lv {entry.level}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-xs">
                          <p className="font-semibold text-amber-300">{roundTitle}</p>
                          <p className="text-[11px] text-slate-400 font-mono-tabular">
                            {entry.roundsCompleted ?? 0} Rounds
                          </p>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-300">
                          {entry.tier || computeTierFromRating(entry.rating)}
                        </td>
                        <td className="py-3 px-4 font-mono-tabular text-right text-slate-300">
                          {entry.wins}/{entry.gamesPlayed} ({winRate}%)
                        </td>
                        <td className="py-3 px-4 font-mono-tabular text-right font-bold text-amber-400">
                          {entry.rating} RP
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Column: Tiers & Personal Match History */}
        <div className="lg:col-span-4 space-y-5">
          {myEntry && (
            <div className="rounded-xl border border-amber-500/30 bg-[#131B2E] p-5 space-y-2">
              <p className="text-xs text-amber-300 font-medium">Your Standing</p>
              <div className="flex items-baseline justify-between">
                <h3 className="font-display text-xl font-bold text-white">
                  {myEntry.tier}
                </h3>
                <span className="font-mono-tabular text-lg font-bold text-amber-400">
                  {myEntry.rating} RP
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono-tabular">
                {myEntry.wins} Wins · {myEntry.gamesPlayed} Matches Played
              </p>
            </div>
          )}

          <div className="rounded-xl border border-slate-800 bg-[#131B2E] p-5 space-y-3">
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              Tournament Round Ranks
            </h3>
            <div className="space-y-2 text-xs">
              {ROUND_RANK_TIERS.map((r) => (
                <div
                  key={r.title}
                  className="flex items-center justify-between py-1.5 border-b border-slate-800/80 last:border-b-0 gap-2"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-200 truncate">
                      {r.badgeCode} · {r.title}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">{r.perksSummary}</p>
                  </div>
                  <span className="font-mono-tabular text-emerald-400 shrink-0">
                    {r.roundsRequired === 0 ? 'Start' : `${r.roundsRequired} Rnd${r.roundsRequired > 1 ? 's' : ''}`}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-[#131B2E] p-5 space-y-3">
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              Seasonal Tiers
            </h3>
            <div className="space-y-2.5 text-xs">
              {TIERS.map((tier) => (
                <div
                  key={tier.name}
                  className="flex items-center justify-between py-2 border-b border-slate-800/80 last:border-b-0"
                >
                  <div>
                    <p className="font-semibold text-slate-200">{tier.name}</p>
                    <p className="text-slate-400">{tier.reward}</p>
                  </div>
                  <span className="font-mono-tabular text-amber-400 shrink-0">
                    {tier.minRp}+ RP
                  </span>
                </div>
              ))}
            </div>
          </div>

          {isSignedIn && (
            <div className="rounded-xl border border-slate-800 bg-[#131B2E] p-5 space-y-3">
              <h3 className="text-sm font-semibold text-slate-100">Recent Matches</h3>
              {matchHistory.length === 0 ? (
                <p className="text-xs text-slate-400">
                  Finish a match to record your trail history.
                </p>
              ) : (
                <div className="space-y-2 text-xs">
                  {matchHistory.slice(0, 8).map((m) => (
                    <div
                      key={m.matchId}
                      className="flex items-center justify-between py-1.5 border-b border-slate-800/70 last:border-b-0"
                    >
                      <div>
                        <p className="font-medium text-slate-200">
                          {REALMS[m.realm]?.name ?? m.realm}
                        </p>
                        <p className="text-slate-400">
                          #{m.placement} Place · {m.mode}
                        </p>
                      </div>
                      <span
                        className={`font-mono-tabular font-semibold ${
                          m.ratingDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {m.ratingDelta >= 0 ? `+${m.ratingDelta}` : m.ratingDelta} RP
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
