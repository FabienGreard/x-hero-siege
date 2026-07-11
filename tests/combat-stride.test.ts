import { describe, expect, test } from "bun:test";
import {
  ARMORY_WARE_PRICE,
  FLEETSTEP_COMBAT_STRIDE_RETENTION,
  VENDOR_DEFINITIONS,
  deriveItemEvolutionProgress,
} from "../src/shared/armory-data";
import {
  ACTION_RECOVERY_MOVE_RETENTION,
  actionMoveRetention,
} from "../src/shared/combat-movement";
import { HERO_DEFINITIONS, HERO_IDS } from "../src/shared/game-data";
import { deriveHeroStats } from "../src/shared/hero-stats";
import { derivePrimaryImpactReadout } from "../src/shared/primary-impact";
import type {
  ActionPhase,
  ActionSnapshot,
  EquipmentSlots,
  HeroId,
  ItemId,
} from "../src/shared/protocol";
import { goldToUnits } from "../src/server/economy";
import { GameWorld } from "../src/server/game";

function equipmentOf(itemId: ItemId, count: number): EquipmentSlots {
  return Array.from({ length: 6 }, (_, index) => index < count ? itemId : null) as EquipmentSlots;
}

function action(kind: ActionSnapshot["kind"], phase: ActionPhase): ActionSnapshot {
  return {
    kind,
    phase,
    remaining: 1,
    duration: 1,
    direction: { x: 1, z: 0 },
  };
}

function readyHero(game: GameWorld, heroId: HeroId, playerId = "p1"): void {
  expect(game.addPlayer(playerId, `Stride ${heroId}`).ok).toBe(true);
  expect(game.claimHero(playerId, heroId).ok).toBe(true);
  expect(game.setReady(playerId, true).ok).toBe(true);
}

describe("Fleetstep Greaves Combat Stride", () => {
  test("the existing fourth-copy Attunement is the only Combat Stride threshold", () => {
    for (const heroId of HERO_IDS) {
      for (let count = 0; count <= 6; count += 1) {
        const stats = deriveHeroStats(heroId, 1, equipmentOf("fleetstep_greaves", count));
        const expectedRetention = count >= 4 ? FLEETSTEP_COMBAT_STRIDE_RETENTION : 0;
        expect(stats.basicMoveRetention).toBe(expectedRetention);
        const impact = derivePrimaryImpactReadout(heroId, stats);
        expect(impact.moveRetention).toBe(expectedRetention);
        expect(impact.moveSpeedDuringWindupImpact).toBeCloseTo(stats.moveSpeed * expectedRetention);
      }

      for (const itemId of ["tempered_edge", "runebound_focus", "quickening_sigil"] as const) {
        expect(deriveHeroStats(heroId, 1, equipmentOf(itemId, 4)).basicMoveRetention).toBe(0);
      }
    }

    expect(deriveItemEvolutionProgress("fleetstep_greaves", 2)).toMatchObject({
      state: "building",
      moveRetention: 0,
      visualLabel: null,
    });
    expect(deriveItemEvolutionProgress("fleetstep_greaves", 3)).toMatchObject({
      state: "next",
      moveRetention: 0,
      visualLabel: "UNLOCKS COMBAT STRIDE",
    });
    expect(deriveItemEvolutionProgress("fleetstep_greaves", 4)).toMatchObject({
      state: "active",
      moveRetention: 0.15,
      visualLabel: "COMBAT STRIDE",
    });
    expect(deriveItemEvolutionProgress("tempered_edge", 6)).toBeNull();
  });

  test("the canonical action matrix preserves idle, recovery, and ability movement rules", () => {
    const locked = deriveHeroStats("warden", 1, equipmentOf("fleetstep_greaves", 3));
    const active = deriveHeroStats("warden", 1, equipmentOf("fleetstep_greaves", 4));

    expect(actionMoveRetention(null, active)).toBe(1);
    expect(actionMoveRetention(action("basic", "idle"), active)).toBe(1);
    for (const stats of [locked, active]) {
      expect(actionMoveRetention(action("basic", "recovery"), stats)).toBe(ACTION_RECOVERY_MOVE_RETENTION);
      for (const kind of ["ability1", "ability2", "ability3", "ultimate"] as const) {
        expect(actionMoveRetention(action(kind, "windup"), stats)).toBe(0);
        expect(actionMoveRetention(action(kind, "active"), stats)).toBe(0);
        expect(actionMoveRetention(action(kind, "recovery"), stats)).toBe(ACTION_RECOVERY_MOVE_RETENTION);
      }
    }
    expect(actionMoveRetention(action("basic", "windup"), locked)).toBe(0);
    expect(actionMoveRetention(action("basic", "active"), locked)).toBe(0);
    expect(actionMoveRetention(action("basic", "windup"), active)).toBe(0.15);
    expect(actionMoveRetention(action("basic", "active"), active)).toBe(0.15);
  });

  test("an unlocked primary uses Combat Stride from its first tick without changing the locked baseline", () => {
    for (const heroId of HERO_IDS) {
      for (let count = 0; count <= 6; count += 1) {
        const game = new GameWorld({ enemyCap: 1 });
        readyHero(game, heroId);
        expect(game.startGame("p1").ok).toBe(true);
        const player = game.players.get("p1")!;
        player.equipment = equipmentOf("fleetstep_greaves", count);
        const startX = player.position.x;
        expect(game.handleMessage("p1", {
          type: "input",
          seq: 1,
          move: { x: 1, z: 0 },
          aim: { x: 1, z: 0 },
          attacking: true,
        }).ok).toBe(true);

        game.update(0.01);
        const snapshot = game.getSnapshot().players[0]!;
        const expectedRetention = count >= 4 ? 0.15 : 0;
        const expectedVelocity = snapshot.stats.moveSpeed * (count >= 4 ? expectedRetention : 1);
        expect(snapshot.action).toMatchObject({ kind: "basic", phase: "windup" });
        expect(snapshot.action!.remaining).toBe(snapshot.action!.duration);
        expect(snapshot.cooldowns.basic).toBe(HERO_DEFINITIONS[heroId].basicCooldown);
        expect(snapshot.velocity.x).toBeCloseTo(expectedVelocity);
        expect(snapshot.position.x - startX).toBeCloseTo(expectedVelocity * 0.01);
      }
    }
  });

  test("real action phases move at 15%, 45%, and 100% without changing attack cadence", () => {
    const game = new GameWorld({ enemyCap: 1 });
    readyHero(game, "warden");
    expect(game.startGame("p1").ok).toBe(true);
    const player = game.players.get("p1")!;
    player.equipment = equipmentOf("fleetstep_greaves", 4);
    player.move = { x: 1, z: 0 };
    player.aim = { x: 1, z: 0 };
    player.attacking = false;
    player.cooldowns.basic = 1;
    const speed = deriveHeroStats("warden", 1, player.equipment).moveSpeed;

    for (const phase of ["windup", "active"] as const) {
      player.action = action("basic", phase);
      game.update(0.05);
      expect(game.getSnapshot().players[0]!.velocity.x).toBeCloseTo(speed * 0.15);
    }
    player.action = action("basic", "recovery");
    game.update(0.05);
    expect(game.getSnapshot().players[0]!.velocity.x).toBeCloseTo(speed * 0.45);
    player.action = null;
    game.update(0.05);
    expect(game.getSnapshot().players[0]!.velocity.x).toBeCloseTo(speed);

    for (const phase of ["windup", "active"] as const) {
      player.action = action("ability2", phase);
      game.update(0.05);
      expect(game.getSnapshot().players[0]!.velocity.x).toBe(0);
    }
    expect(game.getSnapshot().players[0]!.stats.basicAttackInterval).toBe(HERO_DEFINITIONS.warden.basicCooldown);
    expect(game.getSnapshot().players[0]!.stats.basicDamage).toBe(HERO_DEFINITIONS.warden.basicDamage);
  });

  test("a real primary cycle keeps its timings and resolves before active stride movement", () => {
    const game = new GameWorld({ enemyCap: 1 });
    readyHero(game, "warden");
    expect(game.startGame("p1").ok).toBe(true);
    const player = game.players.get("p1")!;
    player.equipment = equipmentOf("fleetstep_greaves", 4);
    player.position = { x: 0, z: 0 };
    expect(game.handleMessage("p1", {
      type: "input",
      seq: 1,
      move: { x: 1, z: 0 },
      aim: { x: 1, z: 0 },
      attacking: true,
    }).ok).toBe(true);

    game.update(0.01);
    const windup = game.getSnapshot().players[0]!;
    expect(windup.action).toMatchObject({ kind: "basic", phase: "windup" });
    expect(windup.action!.duration).toBeCloseTo(HERO_DEFINITIONS.warden.basicCooldown * 0.34);
    expect(windup.action!.remaining).toBe(windup.action!.duration);
    player.attacking = false;

    game.update(0.1);
    const lateWindup = game.getSnapshot().players[0]!;
    expect(lateWindup.action).toMatchObject({ kind: "basic", phase: "windup" });
    const positionBeforeImpact = lateWindup.position.x;
    game.update(lateWindup.action!.remaining);
    const activeSnapshot = game.getSnapshot();
    const active = activeSnapshot.players[0]!;
    expect(active.action).toMatchObject({ kind: "basic", phase: "active", duration: 0.08, remaining: 0.08 });
    expect(active.cooldowns.basic).toBeCloseTo(
      HERO_DEFINITIONS.warden.basicCooldown - windup.action!.duration,
    );
    expect(active.velocity.x).toBeCloseTo(active.stats.moveSpeed * 0.15);
    expect(active.position.x).toBeCloseTo(
      positionBeforeImpact + active.velocity.x * lateWindup.action!.remaining,
    );
    expect(activeSnapshot.effects.find((effect) => effect.kind === "slash")).toMatchObject({
      ownerId: "p1",
      position: { x: positionBeforeImpact + 3.2, z: 0 },
    });

    game.update(active.action!.duration);
    const recovery = game.getSnapshot().players[0]!;
    expect(recovery.action).toMatchObject({
      kind: "basic",
      phase: "recovery",
      duration: HERO_DEFINITIONS.warden.basicCooldown * 0.28,
    });
    expect(recovery.velocity.x).toBeCloseTo(recovery.stats.moveSpeed * ACTION_RECOVERY_MOVE_RETENTION);

    game.update(0.1);
    const lateRecovery = game.getSnapshot().players[0]!;
    expect(lateRecovery.action).toMatchObject({ kind: "basic", phase: "recovery" });
    game.update(lateRecovery.action!.remaining);
    const idle = game.getSnapshot().players[0]!;
    expect(idle.action).toBeNull();
    expect(idle.velocity.x).toBeCloseTo(idle.stats.moveSpeed);
  });

  test("purchase, reforge, ownership, and reset derive the evolution from authoritative slots", () => {
    const game = new GameWorld();
    readyHero(game, "warden", "p1");
    readyHero(game, "riftstalker", "p2");
    expect(game.startGame("p1").ok).toBe(true);
    const buyer = game.players.get("p1")!;
    buyer.position = { ...VENDOR_DEFINITIONS.ironbound_forge.position };
    buyer.equipment = equipmentOf("fleetstep_greaves", 3);
    buyer.goldUnits = goldToUnits(ARMORY_WARE_PRICE);

    expect(game.handleMessage("p1", {
      type: "buy_item",
      vendorId: "ironbound_forge",
      itemId: "fleetstep_greaves",
    }).ok).toBe(true);
    let snapshots = game.getSnapshot().players;
    expect(snapshots.find((player) => player.id === "p1")!.stats.basicMoveRetention).toBe(0.15);
    expect(snapshots.find((player) => player.id === "p2")!.stats.basicMoveRetention).toBe(0);
    expect(game.takePendingEvents().find((event) => event.attunementTransition)?.attunementTransition).toEqual({
      itemId: "fleetstep_greaves",
      change: "gained",
      fromCount: 3,
      toCount: 4,
    });

    buyer.equipment[4] = "tempered_edge";
    buyer.equipment[5] = "runebound_focus";
    buyer.goldUnits = goldToUnits(ARMORY_WARE_PRICE);
    expect(game.handleMessage("p1", {
      type: "replace_item",
      vendorId: "ironbound_forge",
      itemId: "tempered_edge",
      slotIndex: 0,
      expectedItemId: "fleetstep_greaves",
    }).ok).toBe(true);
    expect(game.getSnapshot().players.find((player) => player.id === "p1")!.stats.basicMoveRetention).toBe(0);
    expect(game.takePendingEvents().find((event) => event.attunementTransition)?.attunementTransition).toEqual({
      itemId: "fleetstep_greaves",
      change: "lost",
      fromCount: 4,
      toCount: 3,
    });

    game.reset(false);
    snapshots = game.getSnapshot().players;
    expect(snapshots.every((player) => player.stats.basicMoveRetention === 0)).toBe(true);
    expect(snapshots.every((player) => player.equipment.every((itemId) => itemId === null))).toBe(true);
  });
});
