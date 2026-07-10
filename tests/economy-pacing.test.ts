import { describe, expect, test } from "bun:test";
import {
  ARMORY_WARE_PRICE,
  EQUIPMENT_SLOT_COUNT,
  VENDOR_DEFINITIONS,
} from "../src/shared/armory-data";
import type { EquipmentSlots, Vec2 } from "../src/shared/protocol";
import { goldToUnits } from "../src/server/economy";
import { GameWorld } from "../src/server/game";

const DT = 1 / 60;
const MIDPOINT_CHECK_SECONDS = 85;
const PACING_WINDOW_END_SECONDS = 120;
const FULL_BUILD_GOLD = EQUIPMENT_SLOT_COUNT * ARMORY_WARE_PRICE;

interface EconomyPacingResult {
  goldAtMidpoint: number;
  fullBuildAffordableElapsed: number;
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
  let fullBuildAffordableElapsed: number | null = null;

  expect(game.addPlayer(playerId, "Pacing Warden").ok).toBe(true);
  expect(game.claimHero(playerId, "warden").ok).toBe(true);
  expect(game.setReady(playerId, true).ok).toBe(true);
  expect(game.startGame(playerId).ok).toBe(true);
  expect(game.levelAbility(playerId, "ability2").ok).toBe(true);

  while (elapsed <= PACING_WINDOW_END_SECONDS) {
    const snapshot = game.getSnapshot();
    const player = snapshot.players[0]!;

    if (goldAtMidpoint === null && elapsed >= MIDPOINT_CHECK_SECONDS) {
      goldAtMidpoint = player.gold;
    }
    if (fullBuildAffordableElapsed === null && player.gold >= FULL_BUILD_GOLD) {
      fullBuildAffordableElapsed = elapsed;
    }

    if (player.skillPoints > 0) game.levelAbility(playerId, "ability2");

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

      if (player.cooldowns.ability2 <= 0 && targetDistance < 16) {
        game.handleMessage(playerId, { type: "cast", slot: "ability2" });
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
  if (fullBuildAffordableElapsed === null) {
    throw new Error(`Seed ${seed} did not reach six-ware purchasing power within 120 seconds.`);
  }
  return { goldAtMidpoint, fullBuildAffordableElapsed };
}

describe("normal-timing economy pacing", () => {
  test("100 Warden defenses leave the build incomplete at 85 seconds and fund six wares from 105 to 120", () => {
    const results = Array.from({ length: 100 }, (_, index) => runNormalDefenseBudget(index + 1));

    expect(results.every((result) => result.goldAtMidpoint < 5 * ARMORY_WARE_PRICE)).toBe(true);
    expect(results.every((result) => result.fullBuildAffordableElapsed >= 105)).toBe(true);
    expect(results.every((result) => result.fullBuildAffordableElapsed <= 120)).toBe(true);
  });

  test("a full build needs one fresh 30-gold earning window before replacement", () => {
    const game = new GameWorld();
    const playerId = "replacement-warden";
    expect(game.addPlayer(playerId, "Replacement Warden").ok).toBe(true);
    expect(game.claimHero(playerId, "warden").ok).toBe(true);
    expect(game.setReady(playerId, true).ok).toBe(true);
    expect(game.startGame(playerId).ok).toBe(true);

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
    player.goldUnits = goldToUnits(ARMORY_WARE_PRICE - 1);
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

    player.goldUnits += goldToUnits(1);
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
