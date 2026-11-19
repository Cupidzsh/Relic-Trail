import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeftRight,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Coins,
  FastForward,
  Flag,
  Heart,
  HelpCircle,
  Shield,
  ShieldAlert,
  Sparkles,
  Zap,
} from 'lucide-react';
import { REALM_IMAGES } from '../lib/realmAssets.ts';
import { soundFx } from '../lib/soundFx.ts';
import { CRYSTAL_PALETTE, POWERUP_INFO, REALMS } from '../shared/boardData.ts';
import { getPlayerTaskProgress } from '../shared/gameEngine.ts';
import {
  MatchPlayer,
  MatchState,
  PickupKind,
  PlayerPowerups,
  PowerupActionNotice,
  PowerupType,
  RaceLane,
  RealmId,
  TournamentTask,
  TrackPickup,
  VisualVariant,
} from '../shared/gameTypes.ts';
import { HumanRunner } from './HumanRunner.tsx';

interface RaceTrackProps {
  realm: RealmId;
  players: MatchPlayer[];
  pickups: TrackPickup[];
  myPlayerId: string;
  targetDistance: number;
  perkSizePx: number;
  elapsedMs: number;
  speedMultiplier: number;
  status: MatchState['status'];
  countdownMs?: number;
  isPlaying: boolean;
  task?: TournamentTask;
  onChangeLane: (lane: RaceLane) => void;
  onJump: () => void;
  onUsePowerup: (powerup: PowerupType, targetPlayerId?: string) => void;
  onOpenSwapPicker: () => void;
}

function renderVariantIcon(variant: VisualVariant, kind: PickupKind): React.ReactNode {
  if (kind === 'coin' || variant === 'gold_coin') {
    return (
      <div className="animate-coin-spin w-full h-full flex items-center justify-center">
        <svg viewBox="0 0 32 32" className="w-6 h-6">
          <circle cx="16" cy="16" r="11" fill="#F59E0B" stroke="#FEF08A" strokeWidth="2.2" />
          <circle cx="16" cy="16" r="7" fill="#D97706" />
          <polygon points="16,10 19,16 16,22 13,16" fill="#FEF08A" />
        </svg>
      </div>
    );
  }

  switch (variant) {
    // JUNGLE
    case 'bridge_boost':
      return (
        <svg viewBox="0 0 32 32" className="w-6 h-6">
          <rect x="3" y="15" width="26" height="5" rx="1.5" fill="#A16207" stroke="#6EE7B7" strokeWidth="1.4" />
          <line x1="9" y1="15" x2="9" y2="20" stroke="#451A03" strokeWidth="2" />
          <line x1="16" y1="15" x2="16" y2="20" stroke="#451A03" strokeWidth="2" />
          <line x1="23" y1="15" x2="23" y2="20" stroke="#451A03" strokeWidth="2" />
          <path d="M3 10 Q16 17 29 10" fill="none" stroke="#A7F3D0" strokeWidth="1.6" />
        </svg>
      );
    case 'forest_pit':
      return (
        <svg viewBox="0 0 32 32" className="w-6 h-6">
          <ellipse cx="16" cy="19" rx="12" ry="6.5" fill="#090D16" stroke="#FCA5A5" strokeWidth="1.6" />
          <path d="M8 19 L12 13 L16 19 L20 12 L24 19" fill="none" stroke="#EF4444" strokeWidth="1.6" />
        </svg>
      );
    case 'waterfall_heart':
    case 'waterfall_riptide': {
      const blue = kind === 'heart';
      return (
        <svg viewBox="0 0 32 32" className="w-6 h-6">
          <rect
            x="7"
            y="4"
            width="18"
            height="19"
            rx="3"
            fill={blue ? '#0284C7' : '#DC2626'}
            fillOpacity="0.45"
            stroke={blue ? '#7DD3FC' : '#FCA5A5'}
            strokeWidth="1.4"
          />
          <path
            d="M12 6 V21 M16 6 V22 M20 6 V20"
            stroke={blue ? '#E0F2FE' : '#FEE2E2'}
            strokeWidth="2"
            strokeLinecap="round"
          />
          <ellipse cx="16" cy="24" rx="11" ry="3" fill={blue ? '#38BDF8' : '#F87171'} fillOpacity="0.6" />
        </svg>
      );
    }
    case 'jungle_serpent':
    case 'sand_serpent':
      return (
        <svg viewBox="0 0 32 32" className="w-6 h-6">
          <path d="M5 24 C10 11, 17 25, 22 13 C24 8, 28 10, 28 14" fill="none" stroke="#FCA5A5" strokeWidth="3.4" strokeLinecap="round" />
          <circle cx="27" cy="12" r="2.2" fill="#FFFFFF" />
        </svg>
      );
    // DESERT
    case 'pyramid_boost':
      return (
        <svg viewBox="0 0 32 32" className="w-6 h-6">
          <polygon points="16,4 28,26 4,26" fill="#10B981" fillOpacity="0.45" stroke="#A7F3D0" strokeWidth="1.6" />
          <polygon points="16,4 20,11 12,11" fill="#6EE7B7" />
        </svg>
      );
    case 'scorpion':
      return (
        <svg viewBox="0 0 32 32" className="w-6 h-6">
          <ellipse cx="15" cy="19" rx="6.5" ry="4" fill="#DC2626" stroke="#FECACA" strokeWidth="1.3" />
          <path d="M21 17 C27 14, 27 7, 21 6" fill="none" stroke="#FCA5A5" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="21" cy="6" r="1.8" fill="#FDE047" />
          <path d="M9 17 L5 13 M9 21 L5 24" stroke="#FECACA" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    case 'mummy':
      return (
        <svg viewBox="0 0 32 32" className="w-6 h-6">
          <circle cx="16" cy="10" r="4.8" fill="#E2E8F0" stroke="#FCA5A5" strokeWidth="1.3" />
          <rect x="11" y="15" width="10" height="11" rx="3" fill="#CBD5E1" stroke="#FCA5A5" strokeWidth="1.3" />
          <line x1="12" y1="9" x2="20" y2="10" stroke="#64748B" strokeWidth="1.4" />
          <line x1="11" y1="19" x2="21" y2="18" stroke="#64748B" strokeWidth="1.4" />
          <circle cx="14.5" cy="9.5" r="1" fill="#EF4444" />
          <circle cx="17.5" cy="9.5" r="1" fill="#EF4444" />
        </svg>
      );
    case 'quicksand':
      return (
        <svg viewBox="0 0 32 32" className="w-6 h-6">
          <ellipse cx="16" cy="16" rx="11" ry="6" fill="none" stroke="#FCA5A5" strokeWidth="1.8" />
          <ellipse cx="16" cy="16" rx="6" ry="3" fill="none" stroke="#F87171" strokeWidth="1.6" />
          <circle cx="16" cy="16" r="2" fill="#EF4444" />
        </svg>
      );
    // DRAGON
    case 'dragon_egg':
      return (
        <svg viewBox="0 0 32 32" className="w-6 h-6">
          <ellipse cx="16" cy="16" rx="8" ry="11" fill="#059669" stroke="#A7F3D0" strokeWidth="1.6" />
          <path d="M11 12 L16 16 L21 12 M10 20 L16 23 L22 20" fill="none" stroke="#D1FAE5" strokeWidth="1.4" />
        </svg>
      );
    case 'lava_fissure':
    case 'fire_jet':
      return (
        <svg viewBox="0 0 32 32" className="w-6 h-6">
          <path d="M16 4 C21 10, 23 15, 21 22 C19 26, 13 26, 11 22 C9 16, 12 10, 16 4 Z" fill="#EF4444" stroke="#FDE047" strokeWidth="1.4" />
          <path d="M16 11 C19 15, 19 20, 16 23 C13 20, 13 15, 16 11 Z" fill="#F59E0B" />
        </svg>
      );
    case 'swooping_dragon':
      return (
        <svg viewBox="0 0 32 32" className="w-6 h-6">
          <path d="M4 13 L12 15 L16 7 L20 15 L28 11 L21 22 L16 19 L11 22 Z" fill="#DC2626" stroke="#FECACA" strokeWidth="1.3" />
          <circle cx="16" cy="15" r="2" fill="#FDE047" />
        </svg>
      );
    // HYPERION SKYFALL
    case 'patrol_drone':
      return (
        <svg viewBox="0 0 32 32" className="w-6 h-6">
          <line x1="5" y1="9" x2="12" y2="9" stroke="#CBD5E1" strokeWidth="2" />
          <line x1="20" y1="9" x2="27" y2="9" stroke="#CBD5E1" strokeWidth="2" />
          <ellipse cx="16" cy="16" rx="7.5" ry="5" fill="#1E293B" stroke="#FCA5A5" strokeWidth="1.6" />
          <circle cx="16" cy="16" r="2.4" fill="#EF4444" />
        </svg>
      );
    case 'road_bump':
      return (
        <svg viewBox="0 0 32 32" className="w-6 h-6">
          <path d="M4 23 Q16 8 28 23 Z" fill="#B91C1C" stroke="#FECACA" strokeWidth="1.5" />
          <line x1="10" y1="21" x2="14" y2="16" stroke="#FDE047" strokeWidth="1.8" />
          <line x1="18" y1="21" x2="22" y2="16" stroke="#FDE047" strokeWidth="1.8" />
        </svg>
      );
    case 'skyway_boost':
    case 'maglev_wind':
    case 'canopy_wind':
    case 'sand_wind':
    case 'thermal_wind':
      return (
        <svg viewBox="0 0 32 32" className="w-6 h-6">
          <path d="M8 21 L16 14 L24 21 M8 14 L16 7 L24 14" fill="none" stroke="#6EE7B7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'oasis_heart':
    case 'ember_heart':
    case 'nano_heart':
      return <Heart className="w-5 h-5 text-sky-300 fill-sky-400" />;
    case 'jungle_cache':
    case 'scarab_cache':
    case 'hoard_cache':
    case 'drone_cache':
      return (
        <div className="relative flex items-center justify-center w-full h-full">
          <Zap className="w-5 h-5 text-amber-300 fill-emerald-300" />
          <Sparkles className="w-3 h-3 text-emerald-200 absolute -top-0.5 -right-0.5" />
        </div>
      );
    case 'mystery_relic':
      return <HelpCircle className="w-5 h-5 text-indigo-200" />;
    default:
      return kind === 'heart' ? (
        <Heart className="w-5 h-5 text-sky-300 fill-sky-400" />
      ) : kind === 'turbo' || kind === 'tailwind' || kind === 'nitro_cache' ? (
        <Zap className="w-5 h-5 text-emerald-300" />
      ) : (
        <span className="w-3 h-3 rounded-full bg-red-400" />
      );
  }
}

function getThemeTrackStyle(realm: RealmId): {
  roadSurface: string;
  shoulderColor: string;
  sleeperColor: string;
} {
  switch (realm) {
    case 'jungle':
      return {
        roadSurface: 'bg-gradient-to-t from-[#19281D] via-[#121E16] to-[#080E12]',
        shoulderColor: 'border-emerald-700/70',
        sleeperColor: 'rgba(255, 255, 255, 0.055)',
      };
    case 'desert':
      return {
        roadSurface: 'bg-gradient-to-t from-[#312414] via-[#22190D] to-[#0B0F17]',
        shoulderColor: 'border-amber-600/65',
        sleeperColor: 'rgba(255, 240, 200, 0.06)',
      };
    case 'dragon':
      return {
        roadSurface: 'bg-gradient-to-t from-[#2B1212] via-[#1C0D0D] to-[#090B12]',
        shoulderColor: 'border-red-700/70',
        sleeperColor: 'rgba(255, 220, 220, 0.055)',
      };
    case 'neon':
      return {
        roadSurface: 'bg-gradient-to-t from-[#0D1A30] via-[#091224] to-[#060A14]',
        shoulderColor: 'border-cyan-500/65',
        sleeperColor: 'rgba(207, 250, 254, 0.055)',
      };
  }
}

export const RaceTrack: React.FC<RaceTrackProps> = ({
  realm,
  players,
  pickups,
  myPlayerId,
  targetDistance,
  perkSizePx,
  elapsedMs,
  speedMultiplier,
  status,
  countdownMs = 0,
  isPlaying,
  task,
  onChangeLane,
  onJump,
  onUsePowerup,
  onOpenSwapPicker,
}) => {
  const realmInfo = REALMS[realm];
  const themeStyle = getThemeTrackStyle(realm);
  const me = players.find((p) => p.id === myPlayerId) ?? players[0];
  const myDistance = me?.distance ?? 0;
  const mySpeed = me?.speed ?? 48;
  const mySteps100m = Math.floor(myDistance / 100);
  const elapsedSec = elapsedMs / 1000;
  const mySpeedMult = 1 + Math.min(2.2, elapsedSec * 0.022 + mySteps100m * 0.07);
  const next100mMilestone = (mySteps100m + 1) * 100;
  const taskProgress = me && task ? getPlayerTaskProgress(me, task) : 0;

  // Track subtle lane-bank tilt when player changes lanes
  const prevLaneRef = useRef<RaceLane>(me?.lane ?? 1);
  const [laneTilt, setLaneTilt] = useState<-1 | 0 | 1>(0);

  // Track visible floating power-up action notice & per-button count deltas (-1 / +N)
  const [activeNotice, setActiveNotice] = useState<PowerupActionNotice | null>(null);
  const [deltaFlash, setDeltaFlash] = useState<Partial<Record<PowerupType, number>>>({});
  const prevPowerupsRef = useRef<PlayerPowerups | null>(me ? { ...me.powerups } : null);
  const prevCountdownDigitRef = useRef<number | null>(null);
  const prevStatusRef = useRef<MatchState['status']>(status);

  const isCountdown = status === 'countdown';
  const countdownDigit = isCountdown
    ? Math.max(1, Math.min(3, Math.ceil((countdownMs || 1) / 1000)))
    : 0;

  useEffect(() => {
    if (status === 'countdown') {
      if (prevCountdownDigitRef.current !== countdownDigit) {
        prevCountdownDigitRef.current = countdownDigit;
        soundFx.playCountdownBeep(false);
      }
    } else {
      if (prevStatusRef.current === 'countdown' && status === 'playing') {
        soundFx.playCountdownBeep(true);
      }
      prevCountdownDigitRef.current = null;
    }
    prevStatusRef.current = status;
  }, [status, countdownDigit]);

  useEffect(() => {
    if (!me) return;
    if (me.lane !== prevLaneRef.current) {
      const dir: -1 | 1 = me.lane < prevLaneRef.current ? -1 : 1;
      prevLaneRef.current = me.lane;
      setLaneTilt(dir);
      const t = window.setTimeout(() => setLaneTilt(0), 180);
      return () => clearTimeout(t);
    }
  }, [me?.lane]);

  useEffect(() => {
    const notice = me?.lastPowerupNotice;
    if (!notice) return;
    setActiveNotice(notice);
    const t = window.setTimeout(() => {
      setActiveNotice((curr) => (curr?.id === notice.id ? null : curr));
    }, 2800);
    return () => clearTimeout(t);
  }, [me?.lastPowerupNotice?.id]);

  useEffect(() => {
    if (!me) {
      prevPowerupsRef.current = null;
      return;
    }
    const prev = prevPowerupsRef.current;
    if (!prev) {
      prevPowerupsRef.current = { ...me.powerups };
      return;
    }
    const keys: PowerupType[] = ['leap', 'swap', 'boost', 'shield'];
    const diffs: Partial<Record<PowerupType, number>> = {};
    let changed = false;
    for (const k of keys) {
      const d = me.powerups[k] - prev[k];
      if (d !== 0) {
        diffs[k] = d;
        changed = true;
      }
    }
    prevPowerupsRef.current = { ...me.powerups };
    if (changed) {
      setDeltaFlash((curr) => ({ ...curr, ...diffs }));
      const t = window.setTimeout(() => {
        setDeltaFlash((curr) => {
          const next = { ...curr };
          for (const k of Object.keys(diffs) as PowerupType[]) {
            if (next[k] === diffs[k]) delete next[k];
          }
          return next;
        });
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [me?.powerups.leap, me?.powerups.swap, me?.powerups.boost, me?.powerups.shield]);

  // Close-in Subway Surfers / Temple Run action camera (210m corridor depth)
  const windowDepth = 210;
  const cameraStart = Math.max(0, (me?.distance ?? 0) - 24);
  const cameraEnd = cameraStart + windowDepth;

  const visiblePickups = pickups.filter(
    (pk) =>
      pk.distance >= cameraStart &&
      pk.distance <= cameraEnd &&
      !(pk.consumedBy ?? []).includes(myPlayerId),
  );

  const visibleRacers = players.filter(
    (p) => p.distance >= cameraStart - 16 && p.distance <= cameraEnd + 16,
  );

  const lanes: { id: RaceLane; label: string }[] = [
    { id: 0, label: 'Left' },
    { id: 1, label: 'Center' },
    { id: 2, label: 'Right' },
  ];

  // Distance horizon markers every 100m
  const markers: number[] = [];
  for (let m = 100; m <= targetDistance; m += 100) {
    if (m >= cameraStart && m <= cameraEnd) {
      markers.push(m);
    }
  }

  // Touch swipe tracking (Swipe Left/Right = steer, Swipe Up = Jump/Vault)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current || !me) return;
    const touch = e.changedTouches[0];
    if (!touch) return;
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    touchStartRef.current = null;

    if (deltaY < -28 && Math.abs(deltaY) > Math.abs(deltaX)) {
      if (isPlaying) {
        soundFx.playJump();
        onJump();
      }
      return;
    }

    if (!isPlaying && !isCountdown) return;
    if (Math.abs(deltaX) < 22) return;
    if (deltaX < 0 && me.lane > 0) {
      onChangeLane((me.lane - 1) as RaceLane);
    } else if (deltaX > 0 && me.lane < 2) {
      onChangeLane((me.lane + 1) as RaceLane);
    }
  };

  // Fast scrolling track ties duration scaled by runner speed
  const railScrollMs = Math.max(70, Math.min(240, Math.round(11500 / Math.max(25, mySpeed))));

  const perkButtons: {
    key: PowerupType;
    hotkey: string;
    shortLabel: string;
    icon: React.ReactNode;
    active: boolean;
  }[] = [
    {
      key: 'leap',
      hotkey: '1',
      shortLabel: 'Phase Leap',
      icon: <FastForward className="w-4 h-4 text-emerald-400" />,
      active: Boolean(me && me.leapTicks > 0),
    },
    {
      key: 'swap',
      hotkey: '2',
      shortLabel: 'Swap',
      icon: <ArrowLeftRight className="w-4 h-4 text-amber-400" />,
      active: false,
    },
    {
      key: 'boost',
      hotkey: '3',
      shortLabel: 'Jetpack',
      icon: <Zap className="w-4 h-4 text-cyan-400" />,
      active: Boolean(me && me.boostTicks > 0),
    },
    {
      key: 'shield',
      hotkey: '4',
      shortLabel: 'Shield',
      icon: <Shield className="w-4 h-4 text-sky-400" />,
      active: Boolean(me?.hasShield),
    },
  ];

  return (
    <div className="rounded-xl border border-slate-800 bg-[#111827] overflow-hidden">
      {/* Circuit Minimap & Live Telemetry Header */}
      <div className="px-4 py-3 border-b border-slate-800 bg-[#0D1322] space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-display text-base sm:text-lg font-bold text-slate-100">
              {realmInfo.name} · {targetDistance.toLocaleString()}m
            </h3>
            <p className="text-xs text-slate-400">
              Gold Coins = Shop Currency · Green = Boost · Blue = +Life · Red = Obstacle (Jump or Dodge!)
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs font-mono-tabular">
            <span className="text-cyan-300 font-semibold" title="Speed surges continuously and +7% every 100m">
              {mySpeed.toFixed(1)} m/s · {(me ? mySpeedMult : speedMultiplier).toFixed(2)}x (Surge @{next100mMilestone}m)
            </span>
            <span className="text-slate-300">{(elapsedMs / 1000).toFixed(1)}s</span>
            {me && (
              <span className="text-amber-400 font-semibold">
                {Math.round(me.distance)}m / {targetDistance}m
              </span>
            )}
          </div>
        </div>

        {/* Full-Track Minimap Bar */}
        <div className="relative h-7 rounded-lg bg-[#080C15] border border-slate-800 px-2 flex items-center">
          <div className="w-full h-1 bg-slate-800 rounded-full relative">
            <Flag className="w-3.5 h-3.5 text-amber-400 absolute right-0 -top-2.5" />
            {players.map((p) => {
              const pct = Math.min(98, Math.max(0, (p.distance / targetDistance) * 100));
              const pal = CRYSTAL_PALETTE[p.crystalColor];
              return (
                <div
                  key={p.id}
                  className="absolute -top-2 -translate-x-1/2 transition-all duration-100"
                  style={{ left: `${pct}%` }}
                  title={`${p.name}: ${Math.round(p.distance)}m`}
                >
                  <span
                    className={`block w-3 h-3 rounded-full border border-slate-950 ${pal.bgClass} ${
                      p.id === myPlayerId ? 'ring-2 ring-white scale-125' : ''
                    }`}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Realistic Horizon Backdrop Strip */}
      <div className="relative h-24 sm:h-28 overflow-hidden border-b border-slate-800">
        <img
          src={REALM_IMAGES[realm]}
          alt={realmInfo.name}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover opacity-90"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-[#0B101B]" />
        <div className="absolute bottom-2 left-4 right-4 flex items-center justify-between text-xs text-slate-200">
          <span className="font-medium drop-shadow truncate">{realmInfo.subtitle}</span>
          <span className="font-mono-tabular text-amber-300 drop-shadow shrink-0 ml-2">
            {Math.max(0, Math.round(targetDistance - (me?.distance ?? 0)))}m left
          </span>
        </div>
      </div>

      {/* Subway Surfers / Temple Run 3-Rail Perspective Corridor */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={`relative h-[370px] sm:h-[430px] select-none overflow-hidden touch-none ${themeStyle.roadSurface}`}
        style={{ perspective: '540px' }}
      >
        {/* Perspective Ground Corridor with Subtle Scrolling Cross-Sleepers */}
        <div
          className="absolute inset-x-0 -top-10 bottom-0 origin-bottom pointer-events-none"
          style={{ transform: 'rotateX(22deg) scaleX(1.06)' }}
        >
          <div
            className={`absolute inset-0 ${isPlaying ? 'animate-rail-scroll' : ''}`}
            style={
              {
                backgroundImage: `repeating-linear-gradient(to bottom, transparent 0px, transparent 38px, ${themeStyle.sleeperColor} 38px, ${themeStyle.sleeperColor} 46px)`,
                backgroundSize: '100% 46px',
                '--rail-ms': `${railScrollMs}ms`,
              } as React.CSSProperties
            }
          />
        </div>

        {/* Subtle horizon haze scrim */}
        <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-[#080D18]/90 to-transparent pointer-events-none z-0" />

        {/* Pre-Race Preparation Countdown Overlay (3 - 2 - 1 - Get Ready) */}
        {isCountdown && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#080D18]/55 backdrop-blur-[2px] pointer-events-none px-4">
            <div className="rounded-2xl border border-amber-400/60 bg-[#0B101B]/95 px-6 py-5 text-center shadow-2xl max-w-sm w-full space-y-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-amber-300">
                Get Ready
              </p>
              <p className="font-display font-mono-tabular text-5xl sm:text-6xl font-bold text-white leading-none">
                {countdownDigit}
              </p>
              <p className="text-xs text-slate-300 leading-relaxed">
                {task ? `Mission: ${task.title}` : `First to ${targetDistance.toLocaleString()}m wins`}
              </p>
              <p className="text-[11px] text-amber-200/90">
                Swipe or tap Left / Right to pick your starting lane
              </p>
            </div>
          </div>
        )}

        {/* Live Floating Power-Up Used / Picked Up / Saved Callout */}
        {activeNotice && !isCountdown && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 pointer-events-none max-w-[92%]">
            <div
              className={`px-3.5 py-1.5 rounded-xl border shadow-lg backdrop-blur-sm flex items-center gap-2 text-xs font-semibold whitespace-nowrap ${
                activeNotice.action === 'used'
                  ? 'bg-amber-950/90 border-amber-400 text-amber-100'
                  : activeNotice.action === 'saved'
                    ? 'bg-sky-950/90 border-sky-400 text-sky-100'
                    : 'bg-emerald-950/90 border-emerald-400 text-emerald-100'
              }`}
            >
              <span
                className={`font-mono-tabular px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                  activeNotice.action === 'used'
                    ? 'bg-amber-400 text-slate-950'
                    : activeNotice.action === 'saved'
                      ? 'bg-sky-400 text-slate-950'
                      : 'bg-emerald-400 text-slate-950'
                }`}
              >
                {activeNotice.action === 'used'
                  ? `USED ${activeNotice.delta}`
                  : activeNotice.action === 'saved'
                    ? 'SAVED'
                    : `+${activeNotice.delta} GAINED`}
              </span>
              <span className="truncate">{activeNotice.message}</span>
            </div>
          </div>
        )}

        {/* Horizontal Distance Grid Lines & Finish Banner */}
        <div className="absolute inset-0 pointer-events-none z-0">
          {markers.map((m) => {
            const bottomPct = ((m - cameraStart) / windowDepth) * 100;
            const isFinish = m === targetDistance;
            return (
              <div
                key={m}
                className={`absolute left-0 right-0 border-t ${
                  isFinish
                    ? 'border-amber-400 border-t-4'
                    : 'border-slate-300/15 border-dashed'
                }`}
                style={{ bottom: `${bottomPct}%` }}
              >
                <span
                  className={`ml-2 mt-0.5 inline-block font-mono-tabular text-[10px] font-semibold ${
                    isFinish ? 'text-amber-300' : 'text-slate-400/80'
                  }`}
                >
                  {isFinish ? 'FINISH ARCH' : `${m}m`}
                </span>
              </div>
            );
          })}
        </div>

        {/* 3 Clear Interactive Lanes (Left | Center | Right) */}
        <div
          className={`relative z-10 grid grid-cols-3 h-full divide-x-2 divide-dashed divide-slate-200/45 border-x-4 ${themeStyle.shoulderColor}`}
        >
          {lanes.map((laneObj) => {
            const isMyLane = me?.lane === laneObj.id;
            const lanePickups = visiblePickups.filter((pk) => pk.lane === laneObj.id);
            const laneRacers = visibleRacers.filter((p) => p.lane === laneObj.id);
            const baseLaneShade = laneObj.id === 1 ? 'bg-white/[0.025]' : 'bg-black/20';

            return (
              <div
                key={laneObj.id}
                onClick={() => onChangeLane(laneObj.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    onChangeLane(laneObj.id);
                  }
                }}
                className={`relative h-full cursor-pointer transition-colors ${
                  isMyLane
                    ? 'bg-amber-400/[0.09] ring-1 ring-inset ring-amber-400/35'
                    : `${baseLaneShade} hover:bg-white/[0.04]`
                }`}
              >
                <span
                  className={`absolute top-2 left-1/2 -translate-x-1/2 text-[10px] font-semibold tracking-wide pointer-events-none whitespace-nowrap ${
                    isMyLane ? 'text-amber-300' : 'text-slate-400/80'
                  }`}
                >
                  {laneObj.label}
                  {isMyLane ? ' · YOU' : ''}
                </span>

                {/* Perspective-Scaled Color-Coded Icons (Coins, Boosts, Life, Hazards) */}
                {lanePickups.map((pk) => {
                  const bottomPct = ((pk.distance - cameraStart) / windowDepth) * 100;
                  const depthRatio = Math.max(0, Math.min(1, 1 - bottomPct / 100));
                  const perspectiveScale = 0.54 + 0.56 * depthRatio;

                  const isCoin = pk.kind === 'coin';
                  const isCache = pk.kind === 'nitro_cache';
                  const colorClasses = isCoin
                    ? 'bg-amber-950/90 border-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.6)] rounded-full'
                    : isCache
                      ? 'bg-gradient-to-br from-emerald-900 to-amber-900/95 border-amber-300 shadow-[0_0_16px_rgba(52,211,153,0.7)] rounded-xl'
                      : pk.kind === 'mystery'
                        ? 'bg-indigo-950/95 border-indigo-400 shadow-[0_0_12px_rgba(129,140,248,0.45)] rounded-full'
                        : !pk.isBeneficial
                          ? 'bg-red-950/95 border-red-400 shadow-[0_0_14px_rgba(248,113,113,0.6)] rounded-full'
                          : pk.kind === 'heart'
                            ? 'bg-sky-950/95 border-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.55)] rounded-full'
                            : 'bg-emerald-950/95 border-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.5)] rounded-full';

                  const iconDim = isCoin ? 30 : isCache ? Math.max(38, perkSizePx) : pk.isBeneficial ? perkSizePx : 42;

                  return (
                    <div
                      key={pk.id}
                      title={pk.label}
                      className={`absolute left-1/2 border-2 flex items-center justify-center pointer-events-none transition-[bottom] duration-75 ease-linear ${colorClasses}`}
                      style={{
                        bottom: `${bottomPct}%`,
                        width: iconDim,
                        height: iconDim,
                        transform: `translate(-50%, 50%) scale(${perspectiveScale.toFixed(2)})`,
                      }}
                    >
                      {renderVariantIcon(pk.visualVariant, pk.kind)}
                    </div>
                  );
                })}

                {/* Articulated Human Sprinters in this Lane */}
                {laneRacers.map((racer) => {
                  const bottomPct = Math.min(
                    90,
                    Math.max(10, ((racer.distance - cameraStart) / windowDepth) * 100),
                  );
                  const depthRatio = Math.max(0, Math.min(1, 1 - bottomPct / 100));
                  const racerScale = racer.id === myPlayerId ? 1 : 0.72 + 0.32 * depthRatio;
                  const isMe = racer.id === myPlayerId;

                  return (
                    <div
                      key={racer.id}
                      className="absolute left-1/2 flex flex-col items-center pointer-events-none transition-[bottom] duration-75 ease-linear z-20"
                      style={{
                        bottom: `${bottomPct}%`,
                        transform: `translate(-50%, 50%) scale(${racerScale.toFixed(2)})`,
                      }}
                    >
                      <div className="relative">
                        <HumanRunner
                          color={racer.crystalColor}
                          isMe={isMe}
                          speed={racer.speed}
                          laneTilt={isMe ? laneTilt : 0}
                          isJumping={racer.jumpTicks > 0}
                          isBoosting={racer.boostTicks > 0}
                          isLeaping={racer.leapTicks > 0}
                          isSlowed={racer.slowTicks > 0 || racer.reverseTicks > 0}
                          hasShield={racer.hasShield}
                        />
                        {racer.leapTicks > 0 && (
                          <Sparkles className="w-3.5 h-3.5 text-emerald-300 absolute -top-1 -right-1" />
                        )}
                      </div>
                      <span
                        className={`-mt-1 text-[10px] font-semibold px-1.5 py-0.5 rounded whitespace-nowrap ${
                          isMe
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-slate-900/90 text-slate-200 border border-slate-700'
                        }`}
                      >
                        {isMe ? 'YOU' : racer.name.split(' ')[0]}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Integrated Bottom Driver HUD: Status + Jump/Steer Controls + Instant Perk Activation */}
      {me && (
        <div className="px-4 py-3 border-t border-slate-800 bg-[#0D1322] space-y-3">
          {/* Row 1: Lives, Coins, Obstacles Cleared, Speed, Active Effects */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <div className="flex items-center gap-1" aria-label={`Lives: ${me.lives} of ${me.maxLives}`}>
                <span className="text-slate-400 mr-1">Lives</span>
                {Array.from({ length: me.maxLives }).map((_, i) => (
                  <Heart
                    key={i}
                    className={`w-4 h-4 ${
                      i < me.lives ? 'text-sky-400 fill-sky-400' : 'text-slate-700'
                    }`}
                  />
                ))}
              </div>

              <div className="inline-flex items-center gap-1.5 font-mono-tabular text-amber-300 font-semibold">
                <Coins className="w-4 h-4 text-amber-400" />
                <span>{me.coinsCollected} Coins (+{me.coinsCollected * 10}g)</span>
              </div>

              <div className="inline-flex items-center gap-1.5 font-mono-tabular text-emerald-300">
                <ShieldAlert className="w-4 h-4 text-emerald-400" />
                <span>
                  Cleared: {me.obstaclesCleared}
                  {task?.type === 'clear_obstacles' ? `/${task.targetCount}` : ''}
                </span>
              </div>

              {task && task.type !== 'clear_obstacles' && (
                <div className="font-mono-tabular text-slate-200">
                  Goal: <span className="text-emerald-400 font-bold">{Math.min(taskProgress, task.targetCount)}/{task.targetCount}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs">
              {me.hasShield && (
                <span className="inline-flex items-center gap-1 text-sky-300 font-medium">
                  <Shield className="w-3.5 h-3.5" /> Shield
                </span>
              )}
              {me.jumpTicks > 0 && (
                <span className="text-amber-300 font-medium">Jumping</span>
              )}
              {me.leapTicks > 0 && (
                <span className="text-emerald-300 font-medium">Phase Leap</span>
              )}
              {me.boostTicks > 0 && (
                <span className="text-cyan-300 font-medium">Jetpack</span>
              )}
              {me.slowTicks > 0 && (
                <span className="text-red-400 font-medium">Slowed</span>
              )}
              {me.reverseTicks > 0 && (
                <span className="text-red-400 font-medium">Pushed Back</span>
              )}
            </div>
          </div>

          {/* Row 2: Steer Left / Jump / Steer Right + Instant Mid-Game Perk Activation Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={(!isPlaying && !isCountdown) || me.lane === 0}
                onClick={() => onChangeLane((Math.max(0, me.lane - 1)) as RaceLane)}
                className="min-h-[44px] px-3.5 py-2 rounded-lg border border-slate-700 bg-slate-800 text-slate-100 hover:bg-slate-700 disabled:opacity-40 inline-flex items-center gap-1 text-xs font-semibold transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Left
              </button>
              <button
                type="button"
                disabled={!isPlaying || me.jumpTicks > 0}
                onClick={() => {
                  soundFx.playJump();
                  onJump();
                }}
                title="Jump / Vault over red hazards (Space / Up Arrow / Swipe Up)"
                className="min-h-[44px] px-4 py-2 rounded-lg bg-amber-500 text-slate-950 hover:bg-amber-400 disabled:opacity-50 inline-flex items-center gap-1.5 text-xs font-bold transition-colors"
              >
                <ArrowUp className="w-4 h-4" />
                Jump
              </button>
              <button
                type="button"
                disabled={(!isPlaying && !isCountdown) || me.lane === 2}
                onClick={() => onChangeLane((Math.min(2, me.lane + 1)) as RaceLane)}
                className="min-h-[44px] px-3.5 py-2 rounded-lg border border-slate-700 bg-slate-800 text-slate-100 hover:bg-slate-700 disabled:opacity-40 inline-flex items-center gap-1 text-xs font-semibold transition-colors"
              >
                Right
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Instant Mid-Race Perk Activation Buttons (Keys 1-4 or Tap) */}
            <div className="flex flex-wrap items-center gap-1.5">
              {perkButtons.map(({ key, hotkey, shortLabel, icon, active }) => {
                const count = me.powerups[key];
                const disabled = !isPlaying || count <= 0 || active;
                const delta = deltaFlash[key];
                return (
                  <button
                    key={key}
                    type="button"
                    disabled={disabled}
                    title={`${POWERUP_INFO[key].name} [${hotkey}]: ${POWERUP_INFO[key].shortDesc}`}
                    onClick={() => {
                      if (key === 'swap') {
                        onOpenSwapPicker();
                      } else {
                        soundFx.playPowerup();
                        onUsePowerup(key);
                      }
                    }}
                    className={`relative min-h-[44px] px-2.5 py-1.5 rounded-lg border text-xs font-semibold inline-flex items-center gap-1.5 transition-colors ${
                      active
                        ? 'border-amber-400 bg-amber-500/20 text-amber-200'
                        : disabled
                          ? 'border-slate-800 bg-[#080C15] text-slate-500 cursor-not-allowed'
                          : 'border-slate-700 bg-[#0B101B] text-slate-100 hover:border-amber-400'
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
                    {icon}
                    <span>{shortLabel}</span>
                    <span
                      className={`font-mono-tabular text-[11px] ${
                        count === 0 && !active ? 'text-slate-500' : 'text-amber-300'
                      }`}
                    >
                      {active ? `ACTIVE (${count})` : `x${count}`}
                    </span>
                    <span className="hidden sm:inline font-mono-tabular text-[10px] text-slate-500">
                      [{hotkey}]
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
