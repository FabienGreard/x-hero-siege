import {
  effectiveStackCopies,
  ITEM_DEFINITIONS,
} from "./armory-data";
import { HERO_DEFINITIONS } from "./game-data";
import type { HeroId, HeroStatsSnapshot, ItemId } from "./protocol";

export const HERO_LEVEL_MAX_HP_GAIN = 8;

const UNCLAIMED_HERO_STATS: HeroStatsSnapshot = {
  maxHp: 100,
  moveSpeed: 0,
  basicDamage: 0,
  basicAttackInterval: 1,
  abilityPower: 1,
  cooldownRecovery: 1,
};

/** Canonical Hero Stats projection shared by server authority and read-only previews. */
export function deriveHeroStats(
  heroId: HeroId | null,
  level: number,
  equipment: ReadonlyArray<ItemId | null> = [],
): HeroStatsSnapshot {
  if (!heroId) return { ...UNCLAIMED_HERO_STATS };

  const definition = HERO_DEFINITIONS[heroId];
  const completedLevels = Math.max(0, Math.floor(level) - 1);
  let edgeCount = 0;
  let greavesCount = 0;
  let focusCount = 0;
  let sigilCount = 0;
  for (const itemId of equipment) {
    if (!itemId) continue;
    if (itemId === "tempered_edge") edgeCount += 1;
    else if (itemId === "fleetstep_greaves") greavesCount += 1;
    else if (itemId === "runebound_focus") focusCount += 1;
    else sigilCount += 1;
  }
  const basicDamagePercent =
    effectiveStackCopies(edgeCount) * ITEM_DEFINITIONS.tempered_edge.basicDamagePercent;
  const moveSpeedPercent =
    effectiveStackCopies(greavesCount) * ITEM_DEFINITIONS.fleetstep_greaves.moveSpeedPercent;
  const abilityPowerPercent =
    effectiveStackCopies(focusCount) * ITEM_DEFINITIONS.runebound_focus.abilityPowerPercent;
  const cooldownRecoveryPercent =
    effectiveStackCopies(sigilCount) * ITEM_DEFINITIONS.quickening_sigil.cooldownRecoveryPercent;
  return {
    maxHp: definition.maxHp + completedLevels * HERO_LEVEL_MAX_HP_GAIN,
    moveSpeed: definition.speed * (1 + moveSpeedPercent),
    basicDamage: definition.basicDamage * (1 + basicDamagePercent),
    basicAttackInterval: definition.basicCooldown,
    abilityPower: 1 + abilityPowerPercent,
    cooldownRecovery: 1 + cooldownRecoveryPercent,
  };
}
