import {
  deriveEquipmentModifiers,
} from "./armory-data";
import { HERO_DEFINITIONS } from "./game-data";
import type { HeroId, HeroStatsSnapshot, ItemId } from "./protocol";
import { PRACTICE_WEAPON, WEAPON_DEFINITIONS, type EquippedWeaponId } from "./weapon-data";

export const HERO_LEVEL_MAX_HP_GAIN = 8;

const UNCLAIMED_HERO_STATS: HeroStatsSnapshot = {
  maxHp: 100,
  moveSpeed: 0,
  basicMoveRetention: 0,
  basicDamage: 0,
  basicAttackInterval: 1,
  abilityPower: 1,
  cooldownRecovery: 1,
};

/** Keeps equipment-driven Max Health changes from healing or damaging by percentage. */
export function projectHealthAtPreservedRatio(
  currentHp: number,
  currentMaxHp: number,
  projectedMaxHp: number,
): number {
  if (!Number.isFinite(projectedMaxHp) || projectedMaxHp <= 0) return 0;
  if (!Number.isFinite(currentHp) || !Number.isFinite(currentMaxHp) || currentMaxHp <= 0) return 0;
  const ratio = Math.max(0, Math.min(1, currentHp / currentMaxHp));
  return ratio * projectedMaxHp;
}

/** Canonical Hero Stats projection shared by server authority and read-only previews. */
export function deriveHeroStats(
  heroId: HeroId | null,
  level: number,
  equipment: ReadonlyArray<ItemId | null> = [],
  weaponId: EquippedWeaponId = "practice",
): HeroStatsSnapshot {
  if (!heroId) return { ...UNCLAIMED_HERO_STATS };

  const definition = HERO_DEFINITIONS[heroId];
  const completedLevels = Math.max(0, Math.floor(level) - 1);
  const modifiers = deriveEquipmentModifiers(equipment);
  const weapon = weaponId === "practice" ? PRACTICE_WEAPON : WEAPON_DEFINITIONS[weaponId];
  return {
    maxHp: definition.maxHp + completedLevels * HERO_LEVEL_MAX_HP_GAIN + modifiers.maxHealthFlat,
    moveSpeed: definition.speed * (1 + modifiers.moveSpeedPercent),
    basicMoveRetention: 0,
    basicDamage: weapon.basicDamage * (1 + modifiers.basicDamagePercent),
    basicAttackInterval: weapon.basicCooldown,
    abilityPower: 1 + modifiers.abilityPowerPercent,
    cooldownRecovery: 1 + modifiers.cooldownRecoveryPercent,
  };
}
