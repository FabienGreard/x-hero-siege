import { ITEM_DEFINITIONS } from "../shared/armory-data";
import { HERO_DEFINITIONS } from "../shared/game-data";
import type { HeroId, HeroStatsSnapshot, ItemId } from "../shared/protocol";

export const HERO_LEVEL_MAX_HP_GAIN = 8;

const UNCLAIMED_HERO_STATS: HeroStatsSnapshot = {
  maxHp: 100,
  moveSpeed: 0,
  basicDamage: 0,
  basicAttackInterval: 1,
  abilityPower: 1,
  cooldownRecovery: 1,
};

export function deriveHeroStats(
  heroId: HeroId | null,
  level: number,
  equipment: ReadonlyArray<ItemId | null> = [],
): HeroStatsSnapshot {
  if (!heroId) return { ...UNCLAIMED_HERO_STATS };

  const definition = HERO_DEFINITIONS[heroId];
  const completedLevels = Math.max(0, Math.floor(level) - 1);
  let basicDamagePercent = 0;
  let moveSpeedPercent = 0;
  let abilityPowerPercent = 0;
  let cooldownRecoveryPercent = 0;
  for (const itemId of equipment) {
    if (!itemId) continue;
    const item = ITEM_DEFINITIONS[itemId];
    basicDamagePercent += item.basicDamagePercent;
    moveSpeedPercent += item.moveSpeedPercent;
    abilityPowerPercent += item.abilityPowerPercent;
    cooldownRecoveryPercent += item.cooldownRecoveryPercent;
  }
  return {
    maxHp: definition.maxHp + completedLevels * HERO_LEVEL_MAX_HP_GAIN,
    moveSpeed: definition.speed * (1 + moveSpeedPercent),
    basicDamage: definition.basicDamage * (1 + basicDamagePercent),
    basicAttackInterval: definition.basicCooldown,
    abilityPower: 1 + abilityPowerPercent,
    cooldownRecovery: 1 + cooldownRecoveryPercent,
  };
}
