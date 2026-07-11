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
  warden: {
    ability1: { primary: { base: 58, label: "DAMAGE" } },
    ability2: { primary: { base: 72, label: "DAMAGE" } },
    ability3: {
      primary: { base: 38, label: "DAMAGE" },
      secondary: { base: 30, label: "BARRIER" },
    },
    ultimate: { primary: { base: 145, label: "DAMAGE" } },
  },
  riftstalker: {
    ability1: { primary: { base: 44, label: "ARROW DAMAGE" } },
    ability2: { primary: { base: 47, label: "BOLT DAMAGE" } },
    ability3: { primary: { base: 28, label: "DAMAGE" } },
    ultimate: { primary: { base: 48, label: "ARROW DAMAGE" } },
  },
  ashcaller: {
    ability1: { primary: { base: 54, label: "DAMAGE" } },
    ability2: { primary: { base: 42, label: "DAMAGE / TARGET" } },
    ability3: { primary: { base: 105, label: "DAMAGE" } },
    ultimate: { primary: { base: 155, label: "DAMAGE" } },
  },
  gravebinder: {
    ability1: {
      primary: { base: 67, label: "DAMAGE" },
      secondary: { base: 7, label: "HEAL / HIT" },
    },
    ability2: { primary: { base: 75, label: "BARRIER" } },
    ability3: { primary: { base: 24, label: "WRAITH DAMAGE" } },
    ultimate: { primary: { base: 125, label: "DAMAGE" } },
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
  const behavior = !learned || slot !== "ability2"
    ? undefined
    : heroId === "ashcaller"
      ? {
          id: "cinder_wall" as const,
          compactLabel: `${CINDER_WALL_DURATION_SECONDS}S WALL · ONCE/TARGET`,
          accessibleDescription: `Burns for ${CINDER_WALL_DURATION_SECONDS} seconds and damages each target at most once per cast`,
        }
      : heroId === "riftstalker"
        ? {
            id: "splitbolt" as const,
            compactLabel: `${SPLITBOLT_SEED_PIERCE} PIERCE · KILL → ${SPLITBOLT_FORK_COUNT}×${SPLITBOLT_FORK_PIERCE}`,
            accessibleDescription: `The seed can hit up to ${SPLITBOLT_SEED_PIERCE} targets; its first kill creates ${SPLITBOLT_FORK_COUNT} forks that can each hit ${SPLITBOLT_FORK_PIERCE} targets and cannot split again`,
          }
        : undefined;
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
