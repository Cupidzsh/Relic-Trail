import React from 'react';
import { Check, Music, Volume2, VolumeX } from 'lucide-react';
import { soundFx, ThemeTrack } from '../lib/soundFx.ts';
import { ModalDialog } from './ModalDialog.tsx';

interface AudioSettingsModalProps {
  open: boolean;
  musicEnabled: boolean;
  musicVolume: number;
  sfxEnabled: boolean;
  activeTrack: ThemeTrack;
  onToggleMusic: (enabled: boolean) => void;
  onChangeMusicVolume: (volume: number) => void;
  onToggleSfx: (enabled: boolean) => void;
  onClose: () => void;
}

export const AudioSettingsModal: React.FC<AudioSettingsModalProps> = ({
  open,
  musicEnabled,
  musicVolume,
  sfxEnabled,
  activeTrack,
  onToggleMusic,
  onChangeMusicVolume,
  onToggleSfx,
  onClose,
}) => {
  const volumePct = Math.round(musicVolume * 100);

  return (
    <ModalDialog
      open={open}
      title="Audio & Theme Music"
      subtitle="Play with or without theme music & interactive icon bloops"
      icon={<Music className="w-5 h-5 text-amber-400" />}
      onClose={onClose}
    >
      <div className="space-y-4">
        <div className="p-3.5 rounded-xl border border-slate-800 bg-[#0B101B] space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Music
                className={`w-5 h-5 shrink-0 ${musicEnabled ? 'text-amber-400' : 'text-slate-500'}`}
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-100">Theme Music</p>
                <p className="text-[11px] text-slate-400 truncate">
                  {activeTrack === 'race'
                    ? 'Now Playing: Relic Rush Overdrive (Race Theme)'
                    : 'Now Playing: Relic Quest Anthem (Lobby Theme)'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                soundFx.playBloop(2);
                onToggleMusic(!musicEnabled);
              }}
              className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                musicEnabled
                  ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                  : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
              }`}
            >
              {musicEnabled ? 'Music ON' : 'Music OFF'}
            </button>
          </div>

          <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="music-volume-slider" className="text-slate-300 font-medium">
                Music Volume
              </label>
              <span className="font-mono-tabular font-semibold text-amber-400">
                {volumePct}%
              </span>
            </div>
            <input
              id="music-volume-slider"
              type="range"
              min={0}
              max={100}
              step={5}
              value={volumePct}
              disabled={!musicEnabled}
              onChange={(e) => onChangeMusicVolume(Number(e.target.value) / 100)}
              className="w-full h-2.5 accent-amber-500 cursor-pointer disabled:opacity-40"
            />
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-800 bg-[#0B101B] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {sfxEnabled ? (
              <Volume2 className="w-5 h-5 text-sky-400 shrink-0" />
            ) : (
              <VolumeX className="w-5 h-5 text-slate-500 shrink-0" />
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-100">Icon Bloops &amp; Race SFX</p>
              <p className="text-[11px] text-slate-400">
                Interactive bloop taps, boost chimes, hazards &amp; victory fanfares
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              onToggleSfx(!sfxEnabled);
              if (!sfxEnabled) {
                setTimeout(() => soundFx.playBloop(3), 10);
              }
            }}
            className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              sfxEnabled
                ? 'bg-sky-500 text-slate-950 hover:bg-sky-400'
                : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
            }`}
          >
            {sfxEnabled ? 'SFX ON' : 'SFX OFF'}
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full min-h-[46px] px-4 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-semibold text-sm hover:bg-amber-400 transition-colors inline-flex items-center justify-center gap-2"
        >
          <Check className="w-4 h-4" />
          Done
        </button>
      </div>
    </ModalDialog>
  );
};
