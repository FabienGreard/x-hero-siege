import { describe, expect, test } from "bun:test";
import { GameWorld } from "../src/server/game";
import type { EffectSnapshot, Vec2 } from "../src/shared/protocol";
import {
  WRAITH_HOST_MAX_ACTIVE_PER_OWNER,
  WRAITH_HOST_MAX_STRIKES_PER_SUMMON,
  wraithHostSummonCount,
} from "../src/shared/wraith-host";
import { deriveWraithImpactPresentation } from "../src/client/wraith-impact";

interface WraithInternal {
  id: string;
  ownerId: string;
  damage: number;
  strikesRemaining: number;
}

interface WraithHostInternals {
  summons: Map<string, WraithInternal>;
  enemies: Map<string, unknown>;
  effects: Map<string, EffectSnapshot>;
  riftHeart: { hp: number; maxHp: number; active: boolean };
  spawnTimer: number;
  spawnEnemy(lane: "north", kind: "siege", position: Vec2): string | null;
}

function readyGravebinder(game: GameWorld): void {
  expect(game.addPlayer("p1", "Ada").ok).toBe(true);
  expect(game.claimHero("p1", "gravebinder").ok).toBe(true);
  expect(game.setReady("p1", true).ok).toBe(true);
  expect(game.startGame("p1").ok).toBe(true);
}

function advance(game: GameWorld, seconds: number, step = 0.05): void {
  for (let elapsed = 0; elapsed < seconds; elapsed += step) game.update(step);
}

function resetHostCast(game: GameWorld): void {
  const player = game.players.get("p1")!;
  player.cooldowns.ability3 = 0;
  player.action = null;
}

function castHost(game: GameWorld): void {
  expect(game.handleMessage("p1", { type: "cast", slot: "ability3" }).ok).toBe(true);
  advance(game, 0.4);
}

function taggedEffects(game: GameWorld): EffectSnapshot[] {
  return game.getSnapshot().effects.filter((effect) => effect.sourceSummonId);
}

describe("bounded Wraith Host", () => {
  test("ranks author exactly three, four, and five Wraiths", () => {
    expect(WRAITH_HOST_MAX_STRIKES_PER_SUMMON).toBe(3);
    expect(WRAITH_HOST_MAX_ACTIVE_PER_OWNER).toBe(5);
    expect([0, 1, 2, 3, 4].map(wraithHostSummonCount)).toEqual([0, 3, 4, 5, 5]);
  });

  test("idle Wraiths keep their strikes and overlapping casts evict oldest first", () => {
    let randomCalls = 0;
    const game = new GameWorld({
      timings: { defenseDuration: 200 },
      random: () => {
        randomCalls += 1;
        return 0.5;
      },
    });
    readyGravebinder(game);
    const internal = game as unknown as WraithHostInternals;
    internal.spawnTimer = 1_000;
    internal.enemies.clear();
    expect(game.levelAbility("p1", "ability3").ok).toBe(true);

    castHost(game);
    const firstIds = game.getSnapshot().summons.map((summon) => summon.id);
    expect(firstIds).toHaveLength(3);
    const callsAfterCast = randomCalls;
    let idleEffect = taggedEffects(game).find((effect) => effect.kind === "souls");
    for (let index = 0; index < 100 && !idleEffect; index += 1) {
      game.update(0.01);
      idleEffect = taggedEffects(game).find((effect) => effect.kind === "souls");
    }
    expect(idleEffect?.sourceSummonId).toBeTruthy();
    expect(deriveWraithImpactPresentation(idleEffect!)).toBe("hidden-companion");
    advance(game, 0.8);
    expect([...internal.summons.values()].map((summon) => summon.strikesRemaining)).toEqual([3, 3, 3]);
    expect(randomCalls).toBeGreaterThan(callsAfterCast);

    resetHostCast(game);
    castHost(game);
    const secondIds = game.getSnapshot().summons.map((summon) => summon.id);
    expect(secondIds).toHaveLength(5);
    expect(secondIds).not.toContain(firstIds[0]);
    expect(secondIds).toEqual(expect.arrayContaining(firstIds.slice(1)));
    expect(secondIds.filter((id) => !firstIds.includes(id))).toHaveLength(3);

    const player = game.players.get("p1")!;
    player.abilityRanks.ability3 = 3;
    resetHostCast(game);
    castHost(game);
    const rankThreeIds = game.getSnapshot().summons.map((summon) => summon.id);
    expect(rankThreeIds).toHaveLength(5);
    expect(rankThreeIds.some((id) => secondIds.includes(id))).toBe(false);
  });

  test("one enemy contact keeps two server effects but renders as one compact Wraith hit", () => {
    let randomCalls = 0;
    const game = new GameWorld({
      timings: { defenseDuration: 200 },
      enemyCap: 1,
      random: () => {
        randomCalls += 1;
        return 0.5;
      },
    });
    readyGravebinder(game);
    const internal = game as unknown as WraithHostInternals;
    internal.spawnTimer = 1_000;
    internal.enemies.clear();
    const player = game.players.get("p1")!;
    player.position = { x: 0, z: 0 };
    expect(internal.spawnEnemy("north", "siege", { x: 0, z: -14 })).not.toBeNull();
    expect(game.levelAbility("p1", "ability3").ok).toBe(true);
    castHost(game);
    const callsAfterCast = randomCalls;

    for (let index = 0; index < 200 && taggedEffects(game).length === 0; index += 1) game.update(0.01);
    const contact = taggedEffects(game);
    expect(contact).toHaveLength(2);
    expect(contact.map((effect) => effect.kind)).toEqual(["impact", "wraith_impact"]);
    expect(new Set(contact.map((effect) => effect.sourceSummonId)).size).toBe(1);
    expect(randomCalls - callsAfterCast).toBe(2);
    expect(deriveWraithImpactPresentation(contact[0]!)).toBe("hidden-companion");
    expect(deriveWraithImpactPresentation(contact[1]!)).toBe("compact-impact");
  });

  test("rank totals stop at 216, 360, and 540 damage after three strikes per Wraith", () => {
    const totals: number[] = [];
    for (const rank of [1, 2, 3]) {
      const game = new GameWorld({ timings: { defenseDuration: 200, pushDuration: 200 }, random: () => 0.5 });
      readyGravebinder(game);
      const internal = game as unknown as WraithHostInternals;
      internal.spawnTimer = 1_000;
      internal.enemies.clear();
      game.phase = "push";
      internal.riftHeart.active = true;
      const player = game.players.get("p1")!;
      player.position = { x: 0, z: -140 };
      player.aim = { x: 0, z: -1 };
      player.abilityRanks.ability3 = rank;
      player.skillPoints = 0;
      castHost(game);

      const seenImpactIds = new Set<string>();
      const impactsBySummon = new Map<string, number>();
      const captureImpacts = () => {
        for (const effect of game.getSnapshot().effects) {
          if (effect.kind !== "wraith_impact" || !effect.sourceSummonId || seenImpactIds.has(effect.id)) continue;
          seenImpactIds.add(effect.id);
          impactsBySummon.set(effect.sourceSummonId, (impactsBySummon.get(effect.sourceSummonId) ?? 0) + 1);
        }
      };
      captureImpacts();

      if (rank === 1) {
        for (let index = 0; index < 300 && !taggedEffects(game).some((effect) => effect.kind === "rift_hit"); index += 1) {
          game.update(0.01);
          captureImpacts();
        }
        const firstRiftContact = taggedEffects(game);
        expect(firstRiftContact.map((effect) => effect.kind)).toEqual(["rift_hit", "wraith_impact"]);
        expect(firstRiftContact.every((effect) => effect.sourceSummonId)).toBe(true);
      }

      for (let index = 0; index < 500 && game.getSnapshot().summons.length > 0; index += 1) {
        game.update(0.01);
        captureImpacts();
      }
      totals.push(1_250 - internal.riftHeart.hp);
      expect(game.getSnapshot().summons).toHaveLength(0);
      if (rank === 1) {
        expect([...impactsBySummon.values()].sort()).toEqual([3, 3, 3]);
      }
    }
    expect(totals).toEqual([216, 360, 540]);
  });

  test("only tagged generic companions are hidden", () => {
    expect(deriveWraithImpactPresentation({ kind: "impact" })).toBe("default");
    expect(deriveWraithImpactPresentation({ kind: "rift_hit" })).toBe("default");
    expect(deriveWraithImpactPresentation({ kind: "souls" })).toBe("default");
    expect(deriveWraithImpactPresentation({ kind: "souls", sourceSummonId: "wraith-1" })).toBe("hidden-companion");
    expect(deriveWraithImpactPresentation({ kind: "impact", sourceSummonId: "wraith-1" })).toBe("hidden-companion");
    expect(deriveWraithImpactPresentation({ kind: "rift_hit", sourceSummonId: "wraith-1" })).toBe("hidden-companion");
    expect(deriveWraithImpactPresentation({ kind: "wraith_impact", sourceSummonId: "wraith-1" })).toBe("compact-impact");
  });
});
