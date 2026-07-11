import { describe, expect, test } from "bun:test";
import {
  ABILITY_IMPACT_DEFINITIONS,
  deriveAbilityImpactReadout,
  scaleAbilityMagnitude,
  type AbilityImpactMetricId,
} from "../src/shared/ability-impact";
import { CINDER_WALL_DURATION_SECONDS } from "../src/shared/cinder-wall";
import { HERO_DEFINITIONS, HERO_IDS } from "../src/shared/game-data";
import {
  SPLITBOLT_FORK_COUNT,
  SPLITBOLT_FORK_PIERCE,
  SPLITBOLT_SEED_PIERCE,
} from "../src/shared/splitbolt";
import type { AbilitySlot, EquipmentSlots } from "../src/shared/protocol";
import { GameWorld } from "../src/server/game";

const SLOTS = ["ability1", "ability2", "ability3", "ultimate"] as const satisfies readonly AbilitySlot[];
const ARCANE_BUILD: EquipmentSlots = [
  "runebound_focus",
  "quickening_sigil",
  null,
  null,
  null,
  null,
];

describe("canonical champion ability impact", () => {
  test("the Ashcaller readout connects Focus and Quickening to learned casts exactly", () => {
    const flameRing = deriveAbilityImpactReadout("ashcaller", "ability1", 2, 1.15, 1.15);
    const fallingStar = deriveAbilityImpactReadout("ashcaller", "ability3", 3, 1.15, 1.15);
    expect(flameRing).toMatchObject({
      name: "Flame Ring",
      rank: 2,
      learned: true,
      cooldown: 6 / 1.15,
      metrics: [{ id: "primary", label: "DAMAGE", value: 54 * 1.25 * 1.15 }],
    });
    expect(fallingStar).toMatchObject({
      name: "Falling Star",
      rank: 3,
      learned: true,
      cooldown: 12 / 1.15,
      metrics: [{ id: "primary", label: "DAMAGE", value: 105 * 1.5 * 1.15 }],
    });
  });

  test("Cinder Wall names its persistent once-per-target contract canonically", () => {
    expect(deriveAbilityImpactReadout("ashcaller", "ability2", 2, 1.15, 1.15)).toMatchObject({
      name: "Cinder Wall",
      rank: 2,
      learned: true,
      cooldown: 9 / 1.15,
      metrics: [{
        id: "primary",
        label: "DAMAGE / TARGET",
        value: 42 * 1.25 * 1.15,
      }],
      behavior: {
        id: "cinder_wall",
        compactLabel: `${CINDER_WALL_DURATION_SECONDS}S WALL · ONCE/TARGET`,
        accessibleDescription: `Burns for ${CINDER_WALL_DURATION_SECONDS} seconds and damages each target at most once per cast`,
      },
    });
    expect(
      deriveAbilityImpactReadout("ashcaller", "ability2", 0, 1, 1),
    ).not.toHaveProperty("behavior");
  });

  test("Splitbolt names its first-kill fork and non-recursive contact budget canonically", () => {
    expect(deriveAbilityImpactReadout("riftstalker", "ability2", 2, 1.15, 1.15)).toMatchObject({
      name: "Splitbolt",
      rank: 2,
      learned: true,
      cooldown: 7 / 1.15,
      metrics: [{
        id: "primary",
        label: "BOLT DAMAGE",
        value: ABILITY_IMPACT_DEFINITIONS.riftstalker.ability2.primary.base * 1.25 * 1.15,
      }],
      behavior: {
        id: "splitbolt",
        compactLabel: `${SPLITBOLT_SEED_PIERCE} PIERCE · KILL → ${SPLITBOLT_FORK_COUNT}×${SPLITBOLT_FORK_PIERCE}`,
        accessibleDescription: `The seed can hit up to ${SPLITBOLT_SEED_PIERCE} targets; its first kill creates ${SPLITBOLT_FORK_COUNT} forks that can each hit ${SPLITBOLT_FORK_PIERCE} targets and cannot split again`,
      },
    });
    expect(
      deriveAbilityImpactReadout("riftstalker", "ability2", 0, 1, 1),
    ).not.toHaveProperty("behavior");
  });

  test("unlearned casts remain truthful instead of presenting rank-one power as current", () => {
    expect(deriveAbilityImpactReadout("gravebinder", "ability2", 0, 2.05, 2.05)).toEqual({
      slot: "ability2",
      name: "Bone Ward",
      rank: 0,
      learned: false,
      cooldown: 10 / 2.05,
      metrics: [],
    });
  });

  test("all sixteen casts share their authoritative magnitude and cooldown with the readout", () => {
    for (const heroId of HERO_IDS) {
      const game = new GameWorld();
      expect(game.addPlayer("p1", "Impact Hero").ok).toBe(true);
      expect(game.claimHero("p1", heroId).ok).toBe(true);
      expect(game.setReady("p1", true).ok).toBe(true);
      expect(game.startGame("p1").ok).toBe(true);
      const player = game.players.get("p1")!;
      player.equipment = [...ARCANE_BUILD];
      const internals = game as unknown as {
        abilityMagnitude(
          source: typeof player,
          slot: AbilitySlot,
          rank: number,
          metricId?: AbilityImpactMetricId,
        ): number;
      };

      for (const slot of SLOTS) {
        for (let rank = 1; rank <= HERO_DEFINITIONS[heroId].abilities[slot].maxRank; rank += 1) {
          player.abilityRanks[slot] = rank;
          player.cooldowns[slot] = 0;
          player.action = null;
          const stats = game.getSnapshot().players[0]!.stats;
          const readout = deriveAbilityImpactReadout(
            heroId,
            slot,
            rank,
            stats.abilityPower,
            stats.cooldownRecovery,
          );
          expect(readout.metrics.length).toBe(
            ABILITY_IMPACT_DEFINITIONS[heroId][slot].secondary ? 2 : 1,
          );
          for (const metric of readout.metrics) {
            expect(internals.abilityMagnitude(player, slot, rank, metric.id)).toBeCloseTo(metric.value);
          }
          expect(game.handleMessage("p1", { type: "cast", slot }).ok).toBe(true);
          expect(player.cooldowns[slot]).toBeCloseTo(readout.cooldown);
        }
      }
    }
  });

  test("rank and Skill Power scaling stay explicit and bounded", () => {
    expect(scaleAbilityMagnitude(100, 1, 1)).toBe(100);
    expect(scaleAbilityMagnitude(100, 2, 1.15)).toBeCloseTo(143.75);
    expect(scaleAbilityMagnitude(100, 3, 2.05)).toBeCloseTo(307.5);
  });
});
