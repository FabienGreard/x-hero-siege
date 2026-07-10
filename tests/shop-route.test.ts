import { describe, expect, test } from "bun:test";
import { VENDOR_DEFINITIONS } from "../src/shared/armory-data";
import { WORLD_LAYOUT } from "../src/shared/game-data";
import type { ClientMessage, EquipmentSlots, Vec2 } from "../src/shared/protocol";
import { GameWorld } from "../src/server/game";

const NORTH_GATE = WORLD_LAYOUT.gates.north;
const RELIQUARY = VENDOR_DEFINITIONS.veilglass_reliquary;

interface RouteResult {
  departureGateHp: number;
  departureGold: number;
  nearestThreatDistance: number;
  routeTime: number;
  returnGateHp: number;
  returnNexusHp: number;
  returnPlayerHp: number;
  departurePlayerHp: number;
  returnGold: number;
  downed: boolean;
  equipment: EquipmentSlots;
}

function normalize(vector: Vec2): Vec2 {
  const magnitude = Math.hypot(vector.x, vector.z) || 1;
  return { x: vector.x / magnitude, z: vector.z / magnitude };
}

function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

function runNormalReliquaryRoute(seed: number): RouteResult {
  let randomState = seed >>> 0;
  const random = () => {
    randomState = (Math.imul(randomState, 1_664_525) + 1_013_904_223) >>> 0;
    return randomState / 2 ** 32;
  };

  const game = new GameWorld({ accelerated: false, random });
  const playerId = "route-player";
  let sequence = 0;
  let elapsed = 0;
  const send = (message: ClientMessage) => game.handleMessage(playerId, message);
  const tick = (move: Vec2, aim: Vec2, attacking: boolean) => {
    send({ type: "input", seq: ++sequence, move, aim, attacking });
    game.update(1 / 60);
    elapsed += 1 / 60;
  };

  game.addPlayer(playerId, "Route Warden");
  send({ type: "claim_hero", heroId: "warden" });
  send({ type: "set_ready", ready: true });
  send({ type: "start" });
  send({ type: "level_ability", slot: "ability2" });

  let departure: {
    gateHp: number;
    gold: number;
    playerHp: number;
    nearestThreatDistance: number;
  } | null = null;

  while (elapsed < 65) {
    const snapshot = game.getSnapshot();
    const player = snapshot.players[0]!;
    const northEnemies = snapshot.enemies.filter((enemy) => enemy.lane === "north");
    const nearestGateThreat = [...northEnemies].sort(
      (a, b) => distance(a.position, NORTH_GATE) - distance(b.position, NORTH_GATE),
    )[0];
    const nearestThreatDistance = nearestGateThreat
      ? distance(nearestGateThreat.position, NORTH_GATE)
      : Number.POSITIVE_INFINITY;

    if (player.gold >= 24 && nearestThreatDistance >= 35 && snapshot.gates[0]!.hp === 260) {
      departure = {
        gateHp: snapshot.gates[0]!.hp,
        gold: player.gold,
        playerHp: player.hp,
        nearestThreatDistance,
      };
      break;
    }

    const target = [...northEnemies].sort((a, b) => b.position.z - a.position.z)[0];
    let aim = { x: 0, z: -1 };
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
        send({ type: "cast", slot: "ability2" });
      }
    }

    if (player.skillPoints > 0) send({ type: "level_ability", slot: "ability2" });
    // Empty basic swings lock movement, so only attack within the real cleave envelope.
    tick(move, aim, targetDistance <= 7);
  }

  if (!departure) throw new Error(`Seed ${seed} never created a safe Reliquary window.`);

  const routeStart = elapsed;
  while (elapsed - routeStart < 30) {
    const player = game.getSnapshot().players[0]!;
    const vendorDistance = distance(player.position, RELIQUARY.position);
    if (vendorDistance <= RELIQUARY.interactionRadius - 0.2) break;
    const direction = normalize({
      x: RELIQUARY.position.x - player.position.x,
      z: RELIQUARY.position.z - player.position.z,
    });
    tick(direction, direction, false);
  }
  const arrivedAtVendor = game.getSnapshot().players[0]!;
  if (distance(arrivedAtVendor.position, RELIQUARY.position) > RELIQUARY.interactionRadius - 0.2) {
    throw new Error(`Seed ${seed} could not reach the Reliquary within 30 seconds.`);
  }

  const purchase = send({
    type: "buy_item",
    vendorId: "veilglass_reliquary",
    itemId: "runebound_focus",
  });
  if (!purchase.ok) throw new Error(`Seed ${seed} purchase failed: ${purchase.code}`);

  while (elapsed - routeStart < 30) {
    const player = game.getSnapshot().players[0]!;
    if (distance(player.position, NORTH_GATE) <= 1) break;
    const direction = normalize({
      x: NORTH_GATE.x - player.position.x,
      z: NORTH_GATE.z - player.position.z,
    });
    tick(direction, direction, false);
  }

  const returned = game.getSnapshot();
  const player = returned.players[0]!;
  if (distance(player.position, NORTH_GATE) > 1) {
    throw new Error(`Seed ${seed} could not return to North within 30 seconds.`);
  }
  return {
    departureGateHp: departure.gateHp,
    departureGold: departure.gold,
    nearestThreatDistance: departure.nearestThreatDistance,
    routeTime: elapsed - routeStart,
    returnGateHp: returned.gates[0]!.hp,
    returnNexusHp: returned.nexus.hp,
    returnPlayerHp: player.hp,
    departurePlayerHp: departure.playerHp,
    returnGold: player.gold,
    downed: player.downed,
    equipment: player.equipment,
  };
}

describe("normal-timing local shop route", () => {
  test("100 Warden routes preserve a useful solo defense margin", () => {
    const results = Array.from({ length: 100 }, (_, index) => runNormalReliquaryRoute(index + 1));
    const gateHealth = results.map((result) => result.returnGateHp);
    const averageGateHealth = gateHealth.reduce((sum, value) => sum + value, 0) / gateHealth.length;

    expect(results.every((result) => result.departureGateHp === 260)).toBe(true);
    expect(results.every((result) => result.nearestThreatDistance >= 35)).toBe(true);
    expect(results.every((result) => result.routeTime <= 10)).toBe(true);
    expect(Math.min(...gateHealth)).toBeGreaterThanOrEqual(176);
    expect(averageGateHealth).toBeGreaterThanOrEqual(218);
    expect(results.every((result) => result.returnNexusHp === 800)).toBe(true);
    expect(results.every((result) => !result.downed)).toBe(true);
    expect(results.every((result) => result.returnPlayerHp - result.departurePlayerHp >= -7)).toBe(true);
    expect(results.every((result) => result.returnGold === result.departureGold - 24)).toBe(true);
    expect(results.every((result) => result.equipment[0] === "runebound_focus")).toBe(true);
  });
});
