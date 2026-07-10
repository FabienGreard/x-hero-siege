import { HERO_DEFINITIONS } from "../shared/game-data";
import type { HeroId, HeroStatsSnapshot } from "../shared/protocol";

export const HERO_LEVEL_MAX_HP_GAIN = 8;

const UNCLAIMED_HERO_STATS: HeroStatsSnapshot = {
  maxHp: 100,
  moveSpeed: 0,
  basicDamage: 0,
  basicAttackInterval: 1,
  abilityPower: 1,
  cooldownRecovery: 1,
};

export function deriveHeroStats(heroId: HeroId | null, level: number): HeroStatsSnapshot {
  if (!heroId) return { ...UNCLAIMED_HERO_STATS };

  const definition = HERO_DEFINITIONS[heroId];
  const completedLevels = Math.max(0, Math.floor(level) - 1);
  return {
    maxHp: definition.maxHp + completedLevels * HERO_LEVEL_MAX_HP_GAIN,
    moveSpeed: definition.speed,
    basicDamage: definition.basicDamage,
    basicAttackInterval: definition.basicCooldown,
    abilityPower: 1,
    cooldownRecovery: 1,
  };
}
