import { describe, expect, test } from "bun:test";
import { goldFromUnits, goldRewardShareUnits } from "../src/server/economy";
import { HERO_IDS } from "../src/shared/game-data";
import { GameWorld } from "../src/server/game";

function readyParty(game: GameWorld, count: number): void {
  for (let index = 0; index < count; index += 1) {
    const playerId = `p${index + 1}`;
    expect(game.addPlayer(playerId, `Hero ${index + 1}`).ok).toBe(true);
    expect(game.claimHero(playerId, HERO_IDS[index]!).ok).toBe(true);
    expect(game.setReady(playerId, true).ok).toBe(true);
  }
  expect(game.startGame("p1").ok).toBe(true);
}

function advance(game: GameWorld, seconds: number): void {
  for (let elapsed = 0; elapsed < seconds; elapsed += 1 / 30) game.update(1 / 30);
}

describe("authoritative run economy", () => {
  test("three-player fractional shares accumulate to exact whole-gold thresholds", () => {
    let walletUnits = 0;
    for (let reward = 0; reward < 3; reward += 1) walletUnits += goldRewardShareUnits(35, 3);
    expect(goldFromUnits(walletUnits)).toBe(35);
  });

  for (const playerCount of [1, 2, 3, 4]) {
    test(`${playerCount} player${playerCount === 1 ? "" : "s"} receive party-normalized personal gold without a last-hit advantage`, () => {
      const game = new GameWorld({ accelerated: true, random: () => 0.5 });
      readyParty(game, playerCount);
      expect(game.debugAdvance().ok).toBe(true);

      game.damageGatebreaker(10_000);
      const rewarded = game.getSnapshot();
      const expectedShare = 35 / playerCount;
      expect(rewarded.players.reduce((total, player) => total + player.gold, 0)).toBeCloseTo(35);
      for (const player of rewarded.players) expect(player.gold).toBeCloseTo(expectedShare);
      expect(rewarded.players.find((player) => player.id === "p1")!.kills).toBe(1);
      expect(rewarded.players.filter((player) => player.id !== "p1").every((player) => player.kills === 0)).toBe(true);

      const feedback = rewarded.pickups.find((pickup) => pickup.kind === "rift_shard");
      expect(feedback?.value).toBe(35);
      const balances = rewarded.players.map((player) => player.gold);
      game.players.get("p1")!.position = { ...feedback!.position };
      game.update(1 / 30);
      expect(game.getSnapshot().pickups.some((pickup) => pickup.id === feedback!.id)).toBe(true);
      advance(game, 6.1);
      expect(game.getSnapshot().players.map((player) => player.gold)).toEqual(balances);
      expect(game.getSnapshot().pickups).toHaveLength(0);
    });
  }

  test("personal gold resets when the party begins another run", () => {
    const game = new GameWorld({ accelerated: true, random: () => 0.5 });
    readyParty(game, 1);
    expect(game.debugAdvance().ok).toBe(true);
    game.damageGatebreaker(10_000);
    expect(game.getSnapshot().players[0]!.gold).toBe(35);

    advance(game, 3.1);
    expect(game.getSnapshot().phase).toBe("push");
    game.damageRiftHeart(10_000);
    expect(game.resetRun("p1").ok).toBe(true);
    expect(game.setReady("p1", true).ok).toBe(true);
    expect(game.startGame("p1").ok).toBe(true);
    expect(game.getSnapshot().players[0]!.gold).toBe(0);
  });
});
