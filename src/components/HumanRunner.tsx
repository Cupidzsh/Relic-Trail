import React from 'react';
import { CRYSTAL_PALETTE } from '../shared/boardData.ts';
import { CrystalColor } from '../shared/gameTypes.ts';

interface HumanRunnerProps {
  color: CrystalColor;
  isMe?: boolean;
  speed?: number;
  laneTilt?: -1 | 0 | 1;
  isJumping?: boolean;
  isBoosting?: boolean;
  isLeaping?: boolean;
  isSlowed?: boolean;
  hasShield?: boolean;
}

export const HumanRunner: React.FC<HumanRunnerProps> = ({
  color,
  isMe = false,
  speed = 48,
  laneTilt = 0,
  isJumping = false,
  isBoosting = false,
  isLeaping = false,
  isSlowed = false,
  hasShield = false,
}) => {
  const palette = CRYSTAL_PALETTE[color];
  const size = isMe ? 62 : 48;
  const airborne = isJumping || isLeaping;

  // Dynamic stride cadence: faster speeds drive tighter stride intervals
  const strideMs = isSlowed
    ? 440
    : isBoosting
      ? 145
      : Math.max(140, Math.min(300, Math.round(320 - speed * 1.9)));

  const tiltClass =
    laneTilt < 0
      ? '-rotate-12'
      : laneTilt > 0
        ? 'rotate-12'
        : isSlowed
          ? 'rotate-6'
          : '';

  return (
    <div
      className={`relative inline-flex items-center justify-center transition-transform duration-150 ${
        airborne ? '-translate-y-6 scale-115' : isBoosting ? 'scale-105' : ''
      } ${tiltClass}`}
      style={
        {
          width: size + 10,
          height: size + 10,
          '--stride-ms': `${strideMs}ms`,
        } as React.CSSProperties
      }
    >
      {hasShield && (
        <span
          className="absolute inset-0 rounded-full border-2 border-sky-300/90 bg-sky-400/15 shadow-[0_0_16px_rgba(125,211,252,0.75)]"
          aria-label="Aegis Shield active"
        />
      )}

      {isBoosting && (
        <>
          <span
            className="absolute -bottom-1 left-[36%] -translate-x-1/2 w-2.5 h-6 rounded-full bg-gradient-to-b from-amber-300 via-orange-500 to-transparent blur-[1px]"
            aria-hidden="true"
          />
          <span
            className="absolute -bottom-1 left-[64%] -translate-x-1/2 w-2.5 h-6 rounded-full bg-gradient-to-b from-cyan-300 via-amber-400 to-transparent blur-[1px]"
            aria-hidden="true"
          />
        </>
      )}

      {/* Ground shadow shrinks and softens during airborne Jump / Vault */}
      <span
        className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 rounded-full bg-black/60 transition-all duration-150 ${
          airborne ? 'w-5 h-1.5 opacity-35 translate-y-4' : 'w-8 h-2.5 opacity-70'
        }`}
        aria-hidden="true"
      />

      {/* Articulated Multi-Joint 3/4 Dorsal Forward-Sprinting Runner */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 52"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`drop-shadow-[0_5px_6px_rgba(0,0,0,0.85)] ${
          airborne ? '' : 'animate-runner-bob'
        }`}
      >
        {/* Left Leg (Thigh + Articulated Knee/Shin + Running Shoe) */}
        <g className={airborne ? 'rotate-[24deg] origin-[21px_28px]' : 'animate-thigh-a'}>
          <path
            d="M21 28 L19.5 36"
            stroke="#1E293B"
            strokeWidth="4.6"
            strokeLinecap="round"
          />
          <g className={airborne ? 'rotate-[36deg] origin-[19.5px_36px]' : 'animate-shin-a'}>
            <path
              d="M19.5 36 L17.5 44.5"
              stroke="#0F172A"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <ellipse cx="17" cy="46.2" rx="3.2" ry="1.8" fill={palette.lightHex} stroke="#0F172A" strokeWidth="0.8" />
          </g>
        </g>

        {/* Right Leg (Thigh + Articulated Knee/Shin + Running Shoe) */}
        <g className={airborne ? '-rotate-[22deg] origin-[27px_28px]' : 'animate-thigh-b'}>
          <path
            d="M27 28 L28.5 36"
            stroke="#334155"
            strokeWidth="4.6"
            strokeLinecap="round"
          />
          <g className={airborne ? 'rotate-[28deg] origin-[28.5px_36px]' : 'animate-shin-b'}>
            <path
              d="M28.5 36 L30.5 44.5"
              stroke="#1E293B"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <ellipse cx="31" cy="46.2" rx="3.2" ry="1.8" fill={palette.lightHex} stroke="#0F172A" strokeWidth="0.8" />
          </g>
        </g>

        {/* Left Arm (Shoulder + Forearm + Hand) */}
        <g className={airborne ? '-rotate-[38deg] origin-[17px_16px]' : 'animate-upper-arm-a'}>
          <path
            d="M17 16 L13 22"
            stroke={palette.darkHex}
            strokeWidth="3.8"
            strokeLinecap="round"
          />
          <g className={airborne ? '' : 'animate-forearm-a'}>
            <path
              d="M13 22 L12.5 27.5"
              stroke={palette.hex}
              strokeWidth="3.3"
              strokeLinecap="round"
            />
            <circle cx="12.5" cy="28.3" r="2" fill="#F1C7A5" />
          </g>
        </g>

        {/* Right Arm (Shoulder + Forearm + Hand) */}
        <g className={airborne ? 'rotate-[38deg] origin-[31px_16px]' : 'animate-upper-arm-b'}>
          <path
            d="M31 16 L35 22"
            stroke={palette.hex}
            strokeWidth="3.8"
            strokeLinecap="round"
          />
          <g className={airborne ? '' : 'animate-forearm-b'}>
            <path
              d="M35 22 L35.5 27.5"
              stroke={palette.lightHex}
              strokeWidth="3.3"
              strokeLinecap="round"
            />
            <circle cx="35.5" cy="28.3" r="2" fill="#F1C7A5" />
          </g>
        </g>

        {/* Athletic Forward-Leaning Torso & Crystal Jetpack Harness */}
        <path
          d="M16.5 15 C16.5 12.8 31.5 12.8 31.5 15 L29.5 29 C29.5 30.5 18.5 30.5 18.5 29 Z"
          fill={palette.hex}
          stroke="#0F172A"
          strokeWidth="1.2"
        />
        {/* Twin Thruster Pods */}
        <rect x="19" y="17.5" width="3.5" height="9" rx="1.4" fill="#1E293B" stroke="#475569" strokeWidth="0.7" />
        <rect x="25.5" y="17.5" width="3.5" height="9" rx="1.4" fill="#1E293B" stroke="#475569" strokeWidth="0.7" />

        {/* Back Crystal Core Emblem */}
        <polygon
          points="24,16.5 27.5,21.5 24,26.5 20.5,21.5"
          fill={palette.lightHex}
          stroke="#FFFFFF"
          strokeWidth="0.8"
        />

        {/* Runner Head, Hair & Crystal Headband */}
        <circle cx="24" cy="9.2" r="4.8" fill="#E2B99B" stroke="#0F172A" strokeWidth="1" />
        <path d="M19.2 8.8 C19.8 4 28.2 4 28.8 8.8 Z" fill="#1E293B" />
        <rect x="19.3" y="8" width="9.4" height="2" rx="0.9" fill={palette.lightHex} />
      </svg>
    </div>
  );
};
