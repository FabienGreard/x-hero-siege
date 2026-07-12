import { describe, expect, test } from "bun:test";
import {
  ARMORY_REFORGE_NET_COST,
  ARMORY_WARE_PRICE,
  VENDOR_DEFINITIONS,
} from "../src/shared/armory-data";
import type { EquipmentSlots, Vec2 } from "../src/shared/protocol";
import { goldToUnits } from "../src/server/economy";
import { GameWorld } from "../src/server/game";
import { progressDefenderMastery } from "./support/normal-solo-controller";

const DT = 1 / 60;
const MIDPOINT_CHECK_SECONDS = 85;
const PACING_WINDOW_END_SECONDS = 120;
const THREE_WARE_GOLD = 3 * ARMORY_WARE_PRICE;

interface EconomyPacingResult {
  goldAtMidpoint: number;
  firstWareAffordableElapsed: number;
  threeWaresAffordableElapsed: number;
}

function normalize(vector: Vec2): Vec2 {
  const magnitude = Math.hypot(vector.x, vector.z) || 1;
  return { x: vector.x / magnitude, z: vector.z / magnitude };
}

function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

function runNormalDefenseBudget(seed: number): EconomyPacingResult {
  let randomState = seed >>> 0;
  const random = () => {
    randomState = (Math.imul(randomState, 1_664_525) + 1_013_904_223) >>> 0;
    return randomState / 2 ** 32;
  };

  const game = new GameWorld({ accelerated: false, random });
  const playerId = "pacing-warden";
  let sequence = 0;
  let elapsed = 0;
  let goldAtMidpoint: number | null = null;
  let firstWareAffordableElapsed: number | null = null;
  let threeWaresAffordableElapsed: number | null = null;

  expect(game.addPlayer(playerId, "Pacing Warden").ok).toBe(true);
  expect(game.setReady(playerId, true).ok).toBe(true);
  expect(game.startGame(playerId).ok).toBe(true);
  expect(game.handleMessage(playerId, { type: "buy_weapon", arsenalId: "citadel_arsenal", weaponId: "greatsword" }).ok).toBe(true);
  progressDefenderMastery(game, playerId);
  while (game.phase === "arming") game.update(DT);

  while (elapsed <= PACING_WINDOW_END_SECONDS) {
    const snapshot = game.getSnapshot();
    const player = snapshot.players[0]!;
    progressDefenderMastery(game, playerId);

    if (goldAtMidpoint === null && elapsed >= MIDPOINT_CHECK_SECONDS) {
      goldAtMidpoint = player.gold;
    }
    if (firstWareAffordableElapsed === null && player.gold >= ARMORY_WARE_PRICE) firstWareAffordableElapsed = elapsed;
    if (threeWaresAffordableElapsed === null && player.gold >= THREE_WARE_GOLD) threeWaresAffordableElapsed = elapsed;

    const target = [...snapshot.enemies].sort((left, right) => right.position.z - left.position.z)[0];
    let aim: Vec2 = { x: 0, z: -1 };
    let move = aim;
    let targetDistance = Number.POSITIVE_INFINITY;

    if (target) {
      aim = normalize({
        x: target.position.x - player.position.x,
        z: target.position.z - player.position.z,
      });
      targetDistance = distance(target.position, player.position);
      move = targetDistance > 4.3
        ? aim
        : targetDistance < 2.5
          ? { x: -aim.x, z: -aim.z }
          : { x: 0, z: 0 };

      for (const slot of ["ability2", "ability1"] as const) {
        if (player.cooldowns[slot] <= 0 && targetDistance < 16 && game.handleMessage(playerId, { type: "cast", slot }).ok) break;
      }
    }

    game.handleMessage(playerId, {
      type: "input",
      seq: ++sequence,
      move,
      aim,
      attacking: targetDistance <= 7,
    });
    game.update(DT);
    elapsed += DT;
  }

  if (goldAtMidpoint === null) throw new Error(`Seed ${seed} never reached the midpoint check.`);
  if (firstWareAffordableElapsed === null) throw new Error(`Seed ${seed} never funded its first 60-gold ware.`);
  if (threeWaresAffordableElapsed === null) throw new Error(`Seed ${seed} never banked three 60-gold wares within 120 seconds.`);
  return { goldAtMidpoint, firstWareAffordableElapsed, threeWaresAffordableElapsed };
}

describe("normal-timing economy pacing", () => {
  test("100 Defender defenses fund one 60-gold choice early but only three wares late", () => {
    const results = Array.from({ length: 100 }, (_, index) => runNormalDefenseBudget(index + 1));

    expect(results.every((result) => result.goldAtMidpoint < THREE_WARE_GOLD)).toBe(true);
    expect(results.every((result) => result.firstWareAffordableElapsed <= 45)).toBe(true);
    expect(results.every((result) => result.threeWaresAffordableElapsed >= 90)).toBe(true);
    expect(results.every((result) => result.threeWaresAffordableElapsed <= 120)).toBe(true);
  }, { timeout: 20_000 });

  test("a full build needs one fresh 30-gold earning window before replacement", () => {
    const game = new GameWorld();
    const playerId = "replacement-warden";
    expect(game.addPlayer(playerId, "Replacement Warden").ok).toBe(true);
    expect(game.setReady(playerId, true).ok).toBe(true);
  expect(game.startGame(playerId).ok).toBe(true);
  expect(game.handleMessage(playerId, { type: "buy_weapon", arsenalId: "citadel_arsenal", weaponId: "greatsword" }).ok).toBe(true);
  while (game.phase === "arming") game.update(DT);

    const player = game.players.get(playerId)!;
    const fullBuild: EquipmentSlots = [
      "runebound_focus",
      "runebound_focus",
      "runebound_focus",
      "runebound_focus",
      "runebound_focus",
      "runebound_focus",
    ];
    player.equipment = [...fullBuild] as EquipmentSlots;
    player.position = { ...VENDOR_DEFINITIONS.ironbound_forge.position };
    player.goldUnits = goldToUnits(ARMORY_REFORGE_NET_COST) - 1;
    game.takePendingEvents();

    const replacement = () => game.handleMessage(playerId, {
      type: "replace_item",
      vendorId: "ironbound_forge",
      itemId: "tempered_edge",
      slotIndex: 0,
      expectedItemId: "runebound_focus",
    });

    expect(replacement().code).toBe("INSUFFICIENT_GOLD");
    expect(game.getSnapshot().players[0]!.equipment).toEqual(fullBuild);
    expect(game.takePendingEvents().filter((event) => event.kind === "item_purchased")).toHaveLength(0);

    player.goldUnits += 1;
    expect(replacement().ok).toBe(true);
    const replaced = game.getSnapshot().players[0]!;
    expect(replaced.gold).toBe(0);
    expect(replaced.equipment).toEqual([
      "tempered_edge",
      "runebound_focus",
      "runebound_focus",
      "runebound_focus",
      "runebound_focus",
      "runebound_focus",
    ]);
  });
});
