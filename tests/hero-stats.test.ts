import { describe, expect, test } from "bun:test";
import { GameWorld } from "../src/server/game";
import { deriveHeroStats } from "../src/server/hero-stats";
import type { HeroId } from "../src/shared/protocol";

const BASELINE_STATS: Record<HeroId, {
  maxHp: number;
  moveSpeed: number;
  basicDamage: number;
  basicAttackInterval: number;
}> = {
  warden: { maxHp: 190, moveSpeed: 10.5, basicDamage: 30, basicAttackInterval: 0.52 },
  riftstalker: { maxHp: 125, moveSpeed: 12.5, basicDamage: 19, basicAttackInterval: 0.28 },
  ashcaller: { maxHp: 120, moveSpeed: 10.8, basicDamage: 24, basicAttackInterval: 0.44 },
  gravebinder: { maxHp: 155, moveSpeed: 11.2, basicDamage: 27, basicAttackInterval: 0.5 },
};

describe("authoritative hero stats", () => {
  test("level-one derived stats preserve every hero's verified baseline", () => {
    for (const [heroId, expected] of Object.entries(BASELINE_STATS) as Array<[HeroId, (typeof BASELINE_STATS)[HeroId]]>) {
      expect(deriveHeroStats(heroId, 1)).toEqual({
        ...expected,
        basicMoveRetention: 0,
        abilityPower: 1,
        cooldownRecovery: 1,
      });
    }
  });

  test("level health remains derived while preserving the existing twenty-health level-up reward", () => {
    const game = new GameWorld({ timings: { defenseDuration: 20 } });
    expect(game.addPlayer("p1", "Ada").ok).toBe(true);
    expect(game.claimHero("p1", "warden").ok).toBe(true);
    expect(game.setReady("p1", true).ok).toBe(true);
    expect(game.startGame("p1").ok).toBe(true);

    const state = game.players.get("p1");
    expect(state).toBeDefined();
    state!.hp = 100;

    game.grantExperience("p1", 50);
    let player = game.getSnapshot().players[0]!;
    expect(player.level).toBe(2);
    expect(player.stats.maxHp).toBe(198);
    expect(player.maxHp).toBe(player.stats.maxHp);
    expect(player.hp).toBe(120);

    game.grantExperience("p1", 85);
    player = game.getSnapshot().players[0]!;
    expect(player.level).toBe(3);
    expect(player.stats.maxHp).toBe(206);
    expect(player.maxHp).toBe(player.stats.maxHp);
    expect(player.hp).toBe(140);
  });
});
