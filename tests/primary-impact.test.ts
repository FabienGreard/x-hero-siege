import { describe, expect, test } from "bun:test";
import {
  effectiveStackCopies,
} from "../src/shared/armory-data";
import { HERO_DEFINITIONS, HERO_IDS } from "../src/shared/game-data";
import {
  GRAVEBINDER_BASIC_HEAL_PER_TARGET,
  derivePrimaryImpactReadout,
} from "../src/shared/primary-impact";
import type {
  EquipmentSlots,
  HeroId,
  ItemId,
  Vec2,
} from "../src/shared/protocol";
import { GameWorld } from "../src/server/game";

const BASELINE_PRIMARY_NAMES: Record<HeroId, string> = {
  warden: "Iron Cleave",
  riftstalker: "Repeater Shot",
  ashcaller: "Ember Lance",
  gravebinder: "Soul Scythe",
};

function equipmentOf(itemId: ItemId, count: number): EquipmentSlots {
  return Array.from({ length: 6 }, (_, index) => index < count ? itemId : null) as EquipmentSlots;
}

function readyHero(game: GameWorld, heroId: HeroId): void {
  expect(game.addPlayer("p1", "Primary Hero").ok).toBe(true);
  expect(game.claimHero("p1", heroId).ok).toBe(true);
  expect(game.setReady("p1", true).ok).toBe(true);
  expect(game.startGame("p1").ok).toBe(true);
}

function actualRiftHeartBasicDamage(heroId: HeroId, edgeCount: number): number {
  const game = new GameWorld({ accelerated: true, timings: { pushDuration: 180 }, enemyCap: 1 });
  readyHero(game, heroId);
  const player = game.players.get("p1")!;
  player.equipment = equipmentOf("tempered_edge", edgeCount);
  expect(game.debugAdvance().ok).toBe(true);
  expect(game.debugAdvance().ok).toBe(true);
  const rift = game.getSnapshot().riftHeart;
  player.position = { x: rift.position.x, z: rift.position.z + 5 };
  const internals = game as unknown as {
    basicAttackImpact(source: typeof player, direction: Vec2): void;
    updateProjectiles(dt: number): void;
  };
  const before = rift.hp;
  internals.basicAttackImpact(player, { x: 0, z: -1 });
  internals.updateProjectiles(0.05);
  return before - game.getSnapshot().riftHeart.hp;
}

describe("canonical current-build primary impact", () => {
  test("all four champions expose their verified primary names and baseline consequences", () => {
    for (const heroId of HERO_IDS) {
      const game = new GameWorld();
      readyHero(game, heroId);
      const stats = game.getSnapshot().players[0]!.stats;
      const readout = derivePrimaryImpactReadout(heroId, stats);
      expect(readout).toMatchObject({
        heroId,
        name: BASELINE_PRIMARY_NAMES[heroId],
        attackInterval: HERO_DEFINITIONS[heroId].basicCooldown,
        attacksPerSecond: 1 / HERO_DEFINITIONS[heroId].basicCooldown,
      });
      expect(readout.metrics[0]).toEqual({
        id: "damage",
        label: "DAMAGE / TARGET",
        value: HERO_DEFINITIONS[heroId].basicDamage,
      });
      expect(readout.name).toBe(HERO_DEFINITIONS[heroId].basicName);
      if (heroId === "gravebinder") {
        expect(readout.metrics[1]).toEqual({
          id: "healing",
          label: "HEAL / TARGET",
          value: GRAVEBINDER_BASIC_HEAL_PER_TARGET,
        });
      } else {
        expect(readout.metrics).toHaveLength(1);
      }
    }
  });

  test("Edge counts zero through six match GameWorld snapshots including the nonlinear fourth copy", () => {
    for (const heroId of HERO_IDS) {
      const game = new GameWorld();
      readyHero(game, heroId);
      const player = game.players.get("p1")!;
      const damages: number[] = [];
      for (let count = 0; count <= 6; count += 1) {
        player.equipment = equipmentOf("tempered_edge", count);
        const stats = game.getSnapshot().players[0]!.stats;
        const readout = derivePrimaryImpactReadout(heroId, stats);
        const expectedDamage = HERO_DEFINITIONS[heroId].basicDamage * (
          1 + effectiveStackCopies(count) * 0.2
        );
        expect(readout.metrics[0]).toEqual({
          id: "damage",
          label: "DAMAGE / TARGET",
          value: stats.basicDamage,
        });
        expect(readout.metrics[0]!.value).toBeCloseTo(expectedDamage);
        expect(readout.attackInterval).toBe(HERO_DEFINITIONS[heroId].basicCooldown);
        damages.push(readout.metrics[0]!.value);
      }
      const base = HERO_DEFINITIONS[heroId].basicDamage;
      expect(damages[3]).toBeCloseTo(base * 1.6);
      expect(damages[4]).toBeCloseTo(base * 2);
    }
  });

  test("Greaves expose only Combat Stride while Focus and Sigil leave the primary unchanged", () => {
    for (const heroId of HERO_IDS) {
      const game = new GameWorld();
      readyHero(game, heroId);
      const player = game.players.get("p1")!;
      const baseline = derivePrimaryImpactReadout(heroId, game.getSnapshot().players[0]!.stats);
      for (const itemId of ["fleetstep_greaves", "runebound_focus", "quickening_sigil"] as const) {
        player.equipment = equipmentOf(itemId, 6);
        const readout = derivePrimaryImpactReadout(heroId, game.getSnapshot().players[0]!.stats);
        expect(readout.metrics).toEqual(baseline.metrics);
        expect(readout.attackInterval).toBe(baseline.attackInterval);
        expect(readout.attacksPerSecond).toBe(baseline.attacksPerSecond);
        if (itemId === "fleetstep_greaves") {
          expect(readout.moveRetention).toBe(0.15);
          expect(readout.moveSpeedDuringWindupImpact).toBeCloseTo(
            game.getSnapshot().players[0]!.stats.moveSpeed * 0.15,
          );
        } else {
          expect(readout.moveRetention).toBe(0);
          expect(readout.moveSpeedDuringWindupImpact).toBe(0);
        }
      }
    }
  });

  test("the readout damage matches a real authoritative one-target basic impact", () => {
    for (const heroId of HERO_IDS) {
      for (const edgeCount of [0, 1, 4]) {
        const game = new GameWorld();
        readyHero(game, heroId);
        game.players.get("p1")!.equipment = equipmentOf("tempered_edge", edgeCount);
        const readout = derivePrimaryImpactReadout(heroId, game.getSnapshot().players[0]!.stats);
        expect(actualRiftHeartBasicDamage(heroId, edgeCount)).toBeCloseTo(readout.metrics[0]!.value);
      }
    }
  });

  test("the shared Gravebinder healing constant matches one real Soul Scythe target", () => {
    const game = new GameWorld({ accelerated: true, enemyCap: 10, random: () => 0.5 });
    readyHero(game, "gravebinder");
    expect(game.debugAdvance().ok).toBe(true);
    const player = game.players.get("p1")!;
    player.position = { x: 0, z: 0 };
    player.hp = 100;
    const internals = game as unknown as {
      enemies: Map<string, { position: Vec2; hp: number; radius: number }>;
      basicAttackImpact(source: typeof player, direction: Vec2): void;
    };
    const target = internals.enemies.values().next().value;
    expect(target).toBeDefined();
    internals.enemies.clear();
    target!.position = { x: 0, z: -3 };
    target!.hp = 10_000;
    internals.enemies.set("primary-target", target!);
    const before = player.hp;
    internals.basicAttackImpact(player, { x: 0, z: -1 });
    expect(player.hp - before).toBe(GRAVEBINDER_BASIC_HEAL_PER_TARGET);
    expect(derivePrimaryImpactReadout("gravebinder", game.getSnapshot().players[0]!.stats).metrics[1]).toEqual({
      id: "healing",
      label: "HEAL / TARGET",
      value: GRAVEBINDER_BASIC_HEAL_PER_TARGET,
    });
  });
});
