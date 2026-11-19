import React, { useState } from 'react';
import { Check, Coins, Footprints, Lock, ShoppingBag, Sparkles, Trophy } from 'lucide-react';
import { soundFx } from '../lib/soundFx.ts';
import {
  CRYSTAL_PALETTE,
  CRYSTAL_SKINS,
  MARKET_MISSIONS,
  POWERUP_INFO,
} from '../shared/boardData.ts';
import {
  CrystalColor,
  getBootsBonusMps,
  getRoundsCompleted,
  MarketMission,
  PowerupType,
  UserProfile,
} from '../shared/gameTypes.ts';
import { CrystalToken } from './CrystalToken.tsx';

interface VaultViewProps {
  profile: UserProfile;
  equippedSkin: string;
  onEquipSkin: (skinId: string) => void;
  onUpdateLoadout: (updates: { displayName?: string; crystalColor?: CrystalColor }) => Promise<void>;
  onBuyPowerup: (powerup: PowerupType) => Promise<void>;
  onPurchaseMission: (mission: MarketMission) => Promise<void>;
}

export const VaultView: React.FC<VaultViewProps> = ({
  profile,
  equippedSkin,
  onEquipSkin,
  onUpdateLoadout,
  onBuyPowerup,
  onPurchaseMission,
}) => {
  const [nameInput, setNameInput] = useState(profile.displayName);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const roundsCompleted = getRoundsCompleted(profile.highestCampaignLevel);
  const speedUpgradeLevel = profile.speedUpgradeLevel ?? 0;
  const totalBootsBonus = getBootsBonusMps(roundsCompleted, speedUpgradeLevel);
  const purchasedMissions = profile.purchasedMissions ?? [];

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) return;
    setBusy(true);
    try {
      await onUpdateLoadout({ displayName: nameInput.trim() });
      setStatusMessage('Runner profile saved.');
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : 'Unable to save.');
    } finally {
      setBusy(false);
    }
  };

  const handleBuy = async (powerup: PowerupType) => {
    setBusy(true);
    setStatusMessage(null);
    try {
      await onBuyPowerup(powerup);
      soundFx.playCoin();
      setStatusMessage(`Purchased +1 ${POWERUP_INFO[powerup].name}.`);
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : 'Purchase failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleBuyMission = async (mission: MarketMission) => {
    setBusy(true);
    setStatusMessage(null);
    try {
      await onPurchaseMission(mission);
      soundFx.playVictory();
      setStatusMessage(`Completed "${mission.title}" — Speed & Rank boosted!`);
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : 'Mission purchase failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="space-y-1">
          <p className="text-xs text-amber-400 font-medium">
            Loadout &amp; Armory · Level {profile.level} · +{totalBootsBonus.toFixed(1)} m/s Sprint Bonus
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">
            Crystal Vault &amp; Market
          </h1>
          <p className="text-sm text-slate-400">
            Spend track Gold Coins on Tactical Perks, Market Speed Upgrades, and Rank Contracts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-[#131B2E] border border-slate-800 rounded-lg px-3.5 py-2.5">
            <Footprints className="w-4 h-4 text-cyan-400" />
            <span className="font-mono-tabular text-sm font-bold text-cyan-300">
              +{totalBootsBonus.toFixed(1)} m/s
            </span>
          </div>
          <div className="flex items-center gap-2 bg-[#131B2E] border border-slate-800 rounded-lg px-4 py-2.5">
            <Coins className="w-4 h-4 text-amber-400" />
            <span className="font-mono-tabular text-base font-bold text-amber-400">
              {profile.coins} Gold
            </span>
          </div>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3 rounded-lg border border-slate-700 bg-[#131B2E] text-xs text-slate-200">
          {statusMessage}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 5 Cols: Identity, Crystal Color & Skins */}
        <div className="lg:col-span-5 space-y-5">
          <div className="rounded-xl border border-slate-800 bg-[#131B2E] p-5 space-y-5">
            <div className="flex items-center gap-4">
              <CrystalToken color={profile.crystalColor} skinId={equippedSkin} size="lg" isTurn />
              <div>
                <h2 className="font-display text-lg font-bold text-white">
                  {profile.displayName}
                </h2>
                <p className="text-xs text-slate-400 font-mono-tabular">
                  {profile.xp} Total XP · Level {profile.level} · Market Speed Lv {speedUpgradeLevel}/10
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveName} className="space-y-2">
              <label className="block text-xs font-medium text-slate-300">
                Runner Handle
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  maxLength={32}
                  className="flex-1 min-h-[44px] px-3 py-2 text-sm bg-[#0B101B] border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-amber-400"
                />
                <button
                  type="submit"
                  disabled={busy}
                  className="min-h-[44px] px-4 py-2 text-sm font-semibold bg-amber-500 text-slate-950 rounded-lg hover:bg-amber-400 transition-colors whitespace-nowrap"
                >
                  Save
                </button>
              </div>
            </form>

            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-300">Signature Crystal Color</p>
              <div className="grid grid-cols-2 gap-2.5">
                {(Object.keys(CRYSTAL_PALETTE) as CrystalColor[]).map((colorKey) => {
                  const pal = CRYSTAL_PALETTE[colorKey];
                  const active = profile.crystalColor === colorKey;
                  return (
                    <button
                      key={colorKey}
                      type="button"
                      disabled={busy}
                      onClick={() => onUpdateLoadout({ crystalColor: colorKey })}
                      className={`min-h-[48px] px-3 py-2 rounded-lg border flex items-center gap-2.5 transition-colors ${
                        active
                          ? 'border-amber-400 bg-amber-500/10 text-white'
                          : 'border-slate-800 bg-[#0B101B] text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      <CrystalToken color={colorKey} size="sm" />
                      <span className="text-xs font-semibold">{pal.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Unlockable Skins */}
          <div className="rounded-xl border border-slate-800 bg-[#131B2E] p-5 space-y-3">
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Crystal Aura Skins
            </h3>
            <div className="space-y-2">
              {CRYSTAL_SKINS.map((skin) => {
                const unlocked = profile.unlockedSkins.includes(skin.id);
                const equipped = equippedSkin === skin.id;
                return (
                  <div
                    key={skin.id}
                    className="p-3 rounded-lg border border-slate-800 bg-[#0B101B] flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <CrystalToken color={profile.crystalColor} skinId={skin.id} size="sm" isTurn />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-100 truncate">
                          {skin.name}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">
                          {unlocked ? skin.description : skin.unlockRequirement}
                        </p>
                      </div>
                    </div>
                    {unlocked ? (
                      <button
                        type="button"
                        onClick={() => onEquipSkin(skin.id)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap ${
                          equipped
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                        }`}
                      >
                        {equipped ? (
                          <span className="inline-flex items-center gap-1">
                            <Check className="w-3 h-3" /> Equipped
                          </span>
                        ) : (
                          'Equip'
                        )}
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 shrink-0">
                        <Lock className="w-3 h-3" /> Locked
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right 7 Cols: Tactical Perks Shop + Speed & Rank Market Missions */}
        <div className="lg:col-span-7 space-y-6">
          <div className="rounded-xl border border-slate-800 bg-[#131B2E] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-amber-400" />
                Tactical Perks Market
              </h2>
              <span className="text-xs text-slate-400">
                Activate mid-race via touch or keys 1–4
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(Object.keys(POWERUP_INFO) as PowerupType[]).map((key) => {
                const item = POWERUP_INFO[key];
                const owned = profile.powerupInventory[key] ?? 0;
                const canAfford = profile.coins >= item.cost;

                return (
                  <div
                    key={key}
                    className="p-4 rounded-xl border border-slate-800 bg-[#0B101B] flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-slate-100">
                          {item.name}
                        </h3>
                        <span className="font-mono-tabular text-xs font-semibold text-emerald-400">
                          Owned: {owned}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {item.shortDesc}
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={busy || !canAfford}
                      onClick={() => handleBuy(key)}
                      className={`min-h-[44px] w-full px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
                        canAfford
                          ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      Buy +1 ({item.cost} Gold)
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Market Upgrade Missions (Speed & Rank Contracts) */}
          <div className="rounded-xl border border-slate-800 bg-[#131B2E] p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-cyan-400" />
                Speed &amp; Rank Market Missions
              </h2>
              <span className="font-mono-tabular text-xs text-cyan-300">
                Training Tier {speedUpgradeLevel}/10 (+{(speedUpgradeLevel * 2.5).toFixed(1)} m/s)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {MARKET_MISSIONS.map((mission) => {
                const completed = purchasedMissions.includes(mission.id);
                const canAfford = profile.coins >= mission.costGold;

                return (
                  <div
                    key={mission.id}
                    className={`p-4 rounded-xl border flex flex-col justify-between space-y-3 ${
                      completed
                        ? 'border-emerald-500/40 bg-emerald-950/20'
                        : 'border-slate-800 bg-[#0B101B]'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-semibold text-slate-100">
                          {mission.title}
                        </h3>
                        <span className="font-mono-tabular text-xs font-bold text-cyan-300 shrink-0">
                          +{(mission.speedBoostLevels * 2.5).toFixed(1)} m/s
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {mission.description}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono-tabular text-emerald-300 pt-1">
                        <span>+{mission.xpGain} XP</span>
                        <span>·</span>
                        <span>+{mission.ratingGain} RP</span>
                      </div>
                    </div>

                    {completed ? (
                      <div className="min-h-[44px] w-full px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-500/20 text-emerald-300 inline-flex items-center justify-center gap-1.5">
                        <Check className="w-4 h-4" />
                        Mission Completed
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={busy || !canAfford}
                        onClick={() => handleBuyMission(mission)}
                        className={`min-h-[44px] w-full px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
                          canAfford
                            ? 'bg-cyan-400 text-slate-950 hover:bg-cyan-300'
                            : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        Buy Mission ({mission.costGold} Gold)
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
