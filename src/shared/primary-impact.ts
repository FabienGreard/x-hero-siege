import { HERO_DEFINITIONS } from "./game-data";
import type { HeroId, HeroStatsSnapshot } from "./protocol";

export const GRAVEBINDER_BASIC_HEAL_PER_TARGET = 2.5;

export type PrimaryImpactMetric =
  | {
      id: "damage";
      label: "DAMAGE / TARGET";
      value: number;
    }
  | {
      id: "healing";
      label: "HEAL / TARGET";
      value: number;
    };

export interface PrimaryImpactReadout {
  heroId: HeroId;
  name: string;
  metrics: PrimaryImpactMetric[];
  attackInterval: number;
  attacksPerSecond: number;
  moveRetention: number;
  moveSpeedDuringWindupImpact: number;
}

/** Current authoritative primary-attack consequences without projections or pack totals. */
export function derivePrimaryImpactReadout(
  heroId: HeroId,
  stats: HeroStatsSnapshot,
): PrimaryImpactReadout {
  const attackInterval = Number.isFinite(stats.basicAttackInterval) && stats.basicAttackInterval > 0
    ? stats.basicAttackInterval
    : 0;
  const damage = Number.isFinite(stats.basicDamage) ? Math.max(0, stats.basicDamage) : 0;
  const metrics: PrimaryImpactMetric[] = [{
    id: "damage",
    label: "DAMAGE / TARGET",
    value: damage,
  }];
  if (heroId === "gravebinder") {
    metrics.push({
      id: "healing",
      label: "HEAL / TARGET",
      value: GRAVEBINDER_BASIC_HEAL_PER_TARGET,
    });
  }
  const moveRetention = Number.isFinite(stats.basicMoveRetention)
    ? Math.max(0, stats.basicMoveRetention)
    : 0;
  return {
    heroId,
    name: HERO_DEFINITIONS[heroId].basicName,
    metrics,
    attackInterval,
    attacksPerSecond: attackInterval > 0 ? 1 / attackInterval : 0,
    moveRetention,
    moveSpeedDuringWindupImpact: Math.max(0, stats.moveSpeed) * moveRetention,
  };
}
