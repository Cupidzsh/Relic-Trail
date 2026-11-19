import React from 'react';
import { CRYSTAL_PALETTE, CRYSTAL_SKINS } from '../shared/boardData.ts';
import { CrystalColor } from '../shared/gameTypes.ts';

interface CrystalTokenProps {
  color: CrystalColor;
  skinId?: string;
  size?: 'sm' | 'md' | 'lg';
  hasShield?: boolean;
  isTurn?: boolean;
}

export const CrystalToken: React.FC<CrystalTokenProps> = ({
  color,
  skinId = 'classic_facet',
  size = 'md',
  hasShield = false,
  isTurn = false,
}) => {
  const palette = CRYSTAL_PALETTE[color];
  const skin = CRYSTAL_SKINS.find((s) => s.id === skinId) ?? CRYSTAL_SKINS[0];
  const dim = size === 'sm' ? 20 : size === 'lg' ? 34 : 26;

  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-full transition-transform duration-200 ${
        isTurn ? 'scale-110' : ''
      }`}
      style={{ width: dim + 6, height: dim + 6 }}
    >
      {hasShield && (
        <span
          className="absolute inset-0 rounded-full border-2 border-sky-300/90 shadow-[0_0_8px_rgba(125,211,252,0.7)]"
          aria-label="Aegis Shield active"
        />
      )}
      {isTurn && (
        <span
          className={`absolute -inset-0.5 rounded-full ring-2 ${skin.ringStyle}`}
          aria-hidden="true"
        />
      )}
      <svg
        width={dim}
        height={dim}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-md"
      >
        <polygon
          points="16,2 27,11 22,29 10,29 5,11"
          fill={palette.hex}
          stroke="#0F172A"
          strokeWidth="1.5"
        />
        <polygon points="16,2 27,11 16,15" fill={palette.lightHex} fillOpacity="0.7" />
        <polygon points="16,2 5,11 16,15" fill={palette.lightHex} fillOpacity="0.4" />
        <polygon points="16,15 27,11 22,29" fill={palette.darkHex} fillOpacity="0.55" />
        <polygon points="16,15 5,11 10,29" fill={palette.darkHex} fillOpacity="0.35" />
        <polygon points="16,15 22,29 10,29" fill={palette.darkHex} fillOpacity="0.7" />
        <polygon points="16,6 21,11 16,14 11,11" fill="#FFFFFF" fillOpacity="0.45" />
      </svg>
    </div>
  );
};
