import { CINDER_WALL_DURATION_SECONDS } from "./cinder-wall";
import { HERO_DEFINITIONS } from "./game-data";
import {
  SPLITBOLT_FORK_COUNT,
  SPLITBOLT_FORK_PIERCE,
  SPLITBOLT_SEED_PIERCE,
} from "./splitbolt";
import type { AbilitySlot, HeroId } from "./protocol";

export type AbilityImpactMetricId = "primary" | "secondary";

export interface AbilityImpactMetricDefinition {
  base: number;
  label: string;
}

export interface AbilityImpactDefinition {
  primary: AbilityImpactMetricDefinition;
  secondary?: AbilityImpactMetricDefinition;
}

export interface AbilityImpactMetric {
  id: AbilityImpactMetricId;
  label: string;
  value: number;
}

export interface AbilityImpactReadout {
  slot: AbilitySlot;
  name: string;
  rank: number;
  learned: boolean;
  cooldown: number;
  metrics: AbilityImpactMetric[];
  behavior?: {
    id: "cinder_wall" | "splitbolt";
    compactLabel: string;
    accessibleDescription: string;
  };
}

/**
 * Canonical cast magnitudes shared by server resolution and the Hero Stats
 * readout. Labels describe the exact per-target value, not total pack output.
 */
export const ABILITY_IMPACT_DEFINITIONS: Record<HeroId, Record<AbilitySlot, AbilityImpactDefinition>> = {
  defender: {
    ability1: { primary: { base: 0, label: "EQUIPPED SKILL" } },
    ability2: { primary: { base: 0, label: "EQUIPPED SKILL" } },
    ability3: { primary: { base: 0, label: "EQUIPPED SKILL" } },
    ultimate: { primary: { base: 0, label: "EQUIPPED MASTERY" } },
  },
};

export function scaleAbilityMagnitude(base: number, rank: number, abilityPower: number): number {
  const safeRank = Math.max(1, Math.floor(rank));
  const safePower = Number.isFinite(abilityPower) ? Math.max(0, abilityPower) : 0;
  return base * (1 + (safeRank - 1) * 0.25) * safePower;
}

export function deriveAbilityImpactReadout(
  heroId: HeroId,
  slot: AbilitySlot,
  rank: number,
  abilityPower: number,
  cooldownRecovery: number,
): AbilityImpactReadout {
  const ability = HERO_DEFINITIONS[heroId].abilities[slot];
  const definition = ABILITY_IMPACT_DEFINITIONS[heroId][slot];
  const safeRank = Math.max(0, Math.floor(rank));
  const learned = safeRank > 0;
  const safeRecovery = Number.isFinite(cooldownRecovery) && cooldownRecovery > 0
    ? cooldownRecovery
    : 1;
  const metrics = learned
    ? (["primary", "secondary"] as const)
        .flatMap((id) => {
          const metric = definition[id];
          return metric
            ? [{
                id,
                label: metric.label,
                value: scaleAbilityMagnitude(metric.base, safeRank, abilityPower),
              }]
            : [];
        })
    : [];
  const behavior = undefined;
  return {
    slot,
    name: ability.name,
    rank: safeRank,
    learned,
    cooldown: ability.cooldown / safeRecovery,
    metrics,
    ...(behavior ? { behavior } : {}),
  };
}
