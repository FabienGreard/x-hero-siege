import { describe, expect, test } from "bun:test";
import {
  ARMORY_REFORGE_NET_COST,
  ARMORY_WARE_PRICE,
  ITEM_IDS,
  ITEM_ATTUNEMENT_THRESHOLD,
  VENDOR_DEFINITIONS,
  deriveAttunementProgress,
  dominantEquipmentStack,
  effectiveStackCopies,
  equipmentCopyCount,
  isStackAttuned,
  summarizeEquipment,
} from "../src/shared/armory-data";
import { HERO_IDS } from "../src/shared/game-data";
import type {
  EquipmentSlotIndex,
  EquipmentSlots,
  HeroId,
  ItemId,
  VendorId,
} from "../src/shared/protocol";
import { goldToUnits } from "../src/server/economy";
import { GameWorld } from "../src/server/game";
import { deriveHeroStats } from "../src/shared/hero-stats";

const ITEM_VENDORS = {
  tempered_edge: "ironbound_forge",
  fleetstep_greaves: "ironbound_forge",
  runebound_focus: "veilglass_reliquary",
  quickening_sigil: "veilglass_reliquary",
  gateward_plate: "ironbound_forge",
} as const satisfies Record<ItemId, VendorId>;

function equipmentOf(itemId: ItemId, count: number): EquipmentSlots {
  return Array.from({ length: 6 }, (_, index) => index < count ? itemId : null) as EquipmentSlots;
}

function readyParty(game: GameWorld, heroIds: HeroId[]): void {
  for (const [index, heroId] of heroIds.entries()) {
    const playerId = `p${index + 1}`;
    expect(game.addPlayer(playerId, `Hero ${index + 1}`).ok).toBe(true);
    expect(game.claimHero(playerId, heroId).ok).toBe(true);
    expect(game.setReady(playerId, true).ok).toBe(true);
  }
  expect(game.startGame("p1").ok).toBe(true);
}

function readyHero(game: GameWorld, heroId: HeroId): void {
  readyParty(game, [heroId]);
}

function placeAt(game: GameWorld, vendorId: VendorId, playerId = "p1"): void {
  game.players.get(playerId)!.position = { ...VENDOR_DEFINITIONS[vendorId].position };
}

function fund(game: GameWorld, gold: number, playerId = "p1"): void {
  game.players.get(playerId)!.goldUnits = goldToUnits(gold);
}

function buy(game: GameWorld, vendorId: VendorId, itemId: ItemId, playerId = "p1") {
  return game.handleMessage(playerId, { type: "buy_item", vendorId, itemId });
}

function replace(
  game: GameWorld,
  vendorId: VendorId,
  itemId: ItemId,
  slotIndex: EquipmentSlotIndex,
  expectedItemId: ItemId,
  playerId = "p1",
) {
  return game.handleMessage(playerId, {
    type: "replace_item",
    vendorId,
    itemId,
    slotIndex,
    expectedItemId,
  });
}

function advance(game: GameWorld, seconds: number): void {
  for (let elapsed = 0; elapsed < seconds; elapsed += 0.05) game.update(0.05);
}

function expectNumbers(actual: number[], expected: number[]): void {
  expect(actual).toHaveLength(expected.length);
  for (const [index, value] of actual.entries()) expect(value).toBeCloseTo(expected[index]!);
}

describe("canonical four-copy item attunement", () => {
  test("every armory surface derives the same commitment progress from zero through six copies", () => {
    expect(Array.from({ length: 7 }, (_, count) => deriveAttunementProgress(count))).toEqual([
      {
        copyCount: 0,
        effectiveCount: 0,
        state: "unowned",
        visualLabel: null,
        accessibleDescription: "Attunes at 4 matching copies; the fourth copy contributes twice its normal effect.",
      },
      {
        copyCount: 1,
        effectiveCount: 1,
        state: "building",
        visualLabel: "ATTUNEMENT 1/4",
        accessibleDescription: "Attunement 1 of 4. At four matching copies, the fourth copy contributes twice its normal effect.",
      },
      {
        copyCount: 2,
        effectiveCount: 2,
        state: "building",
        visualLabel: "ATTUNEMENT 2/4",
        accessibleDescription: "Attunement 2 of 4. At four matching copies, the fourth copy contributes twice its normal effect.",
      },
      {
        copyCount: 3,
        effectiveCount: 3,
        state: "next",
        visualLabel: "NEXT ATTUNES",
        accessibleDescription: "Attunement 3 of 4. The next matching copy Attunes this stack and contributes twice its normal effect.",
      },
      {
        copyCount: 4,
        effectiveCount: 5,
        state: "attuned",
        visualLabel: "ATTUNED",
        accessibleDescription: "Attuned: the fourth copy contributes twice its normal effect, so 4 equipped copies count as 5 copies.",
      },
      {
        copyCount: 5,
        effectiveCount: 6,
        state: "attuned",
        visualLabel: "ATTUNED",
        accessibleDescription: "Attuned: the fourth copy contributes twice its normal effect, so 5 equipped copies count as 6 copies.",
      },
      {
        copyCount: 6,
        effectiveCount: 7,
        state: "attuned",
        visualLabel: "ATTUNED",
        accessibleDescription: "Attuned: the fourth copy contributes twice its normal effect, so 6 equipped copies count as 7 copies.",
      },
    ]);
    expect(deriveAttunementProgress(Number.NaN)).toEqual(deriveAttunementProgress(0));
    expect(deriveAttunementProgress(2.9)).toEqual(deriveAttunementProgress(2));
    expect(deriveAttunementProgress(-1)).toEqual(deriveAttunementProgress(0));
  });

  test("every hero and ware uses raw copies through three and exactly one bonus copy from four through six", () => {
    expect(ITEM_ATTUNEMENT_THRESHOLD).toBe(4);
    expect(Array.from({ length: 7 }, (_, count) => effectiveStackCopies(count))).toEqual([0, 1, 2, 3, 5, 6, 7]);
    expect(Array.from({ length: 7 }, (_, count) => isStackAttuned(count))).toEqual([
      false,
      false,
      false,
      false,
      true,
      true,
      true,
    ]);

    for (const heroId of HERO_IDS) {
      const baseline = deriveHeroStats(heroId, 1);
      for (const itemId of ITEM_IDS) {
        for (let count = 0; count <= 6; count += 1) {
          const equipment = equipmentOf(itemId, count);
          const effectiveCount = effectiveStackCopies(count);
          const stats = deriveHeroStats(heroId, 1, equipment);
          expect(equipmentCopyCount(equipment, itemId)).toBe(count);
          expect(stats.basicDamage).toBeCloseTo(
            baseline.basicDamage * (1 + (itemId === "tempered_edge" ? 0.2 * effectiveCount : 0)),
          );
          expect(stats.moveSpeed).toBeCloseTo(
            baseline.moveSpeed * (1 + (itemId === "fleetstep_greaves" ? 0.1 * effectiveCount : 0)),
          );
          expect(stats.abilityPower).toBeCloseTo(
            1 + (itemId === "runebound_focus" ? 0.15 * effectiveCount : 0),
          );
          expect(stats.cooldownRecovery).toBeCloseTo(
            1 + (itemId === "quickening_sigil" ? 0.15 * effectiveCount : 0),
          );
          expect(stats.maxHp).toBe(
            baseline.maxHp + (itemId === "gateward_plate" ? 15 * effectiveCount : 0),
          );
          expect(stats.basicAttackInterval).toBe(baseline.basicAttackInterval);
          const stack = summarizeEquipment(equipment)[0];
          if (count === 0) {
            expect(stack).toBeUndefined();
          } else {
            expect(stack).toMatchObject({
              itemId,
              count,
              effectiveCount,
              attuned: count >= ITEM_ATTUNEMENT_THRESHOLD,
            });
          }
        }
      }
    }
  });

  test("six unrestricted slots can attune at most one raw stack and preserve first-slot dominance below four", () => {
    let multipleAttunements = 0;
    let attunedDominanceMismatches = 0;
    let attunedBuilds = 0;
    for (let encoded = 0; encoded < ITEM_IDS.length ** 6; encoded += 1) {
      let cursor = encoded;
      const equipment = Array.from({ length: 6 }, () => {
        const itemId = ITEM_IDS[cursor % ITEM_IDS.length]!;
        cursor = Math.floor(cursor / ITEM_IDS.length);
        return itemId;
      }) as EquipmentSlots;
      const attunedStacks = summarizeEquipment(equipment).filter((stack) => stack.attuned);
      if (attunedStacks.length > 1) multipleAttunements += 1;
      if (attunedStacks.length === 1) {
        attunedBuilds += 1;
        if (dominantEquipmentStack(equipment)?.itemId !== attunedStacks[0]!.itemId) {
          attunedDominanceMismatches += 1;
        }
      }
    }

    expect(multipleAttunements).toBe(0);
    expect(attunedDominanceMismatches).toBe(0);
    expect(attunedBuilds).toBe(1325);
    expect(dominantEquipmentStack([
      "runebound_focus",
      "tempered_edge",
      "runebound_focus",
      "tempered_edge",
      "runebound_focus",
      "tempered_edge",
    ])).toEqual({ itemId: "runebound_focus", count: 3, attuned: false });
    expect(dominantEquipmentStack([
      "tempered_edge",
      "tempered_edge",
      "tempered_edge",
      "tempered_edge",
      "runebound_focus",
      "runebound_focus",
    ])).toEqual({ itemId: "tempered_edge", count: 4, attuned: true });
  });

  test("ordinary purchases attune only the fourth Edge and fifth and sixth copies resume normal increments", () => {
    const game = new GameWorld();
    readyHero(game, "warden");
    placeAt(game, "ironbound_forge");
    fund(game, 6 * ARMORY_WARE_PRICE);
    game.takePendingEvents();

    const basicDamage: number[] = [];
    for (let count = 1; count <= 6; count += 1) {
      expect(buy(game, "ironbound_forge", "tempered_edge").ok).toBe(true);
      basicDamage.push(game.getSnapshot().players[0]!.stats.basicDamage);
    }

    expectNumbers(basicDamage, [36, 42, 48, 60, 66, 72]);
    const player = game.getSnapshot().players[0]!;
    expect(player.gold).toBe(0);
    expect(player.equipment).toEqual(equipmentOf("tempered_edge", 6));
    expect(summarizeEquipment(player.equipment)).toEqual([{
      itemId: "tempered_edge",
      count: 6,
      effectiveCount: 7,
      attuned: true,
      totalEffectLabel: "+140% Basic Damage",
    }]);
    expect(game.takePendingEvents().filter((event) => event.kind === "item_purchased")).toHaveLength(6);
  });

  test("every ware emits one authoritative gained transition only on its fourth ordinary purchase", () => {
    for (const itemId of ITEM_IDS) {
      const game = new GameWorld();
      const vendorId = ITEM_VENDORS[itemId];
      readyHero(game, "warden");
      placeAt(game, vendorId);
      fund(game, 6 * ARMORY_WARE_PRICE);
      game.takePendingEvents();

      for (let count = 1; count <= 6; count += 1) {
        expect(buy(game, vendorId, itemId).ok).toBe(true);
      }

      const events = game.takePendingEvents().filter((event) => event.kind === "item_purchased");
      expect(events).toHaveLength(6);
      expect(events.map((event) => event.attunementTransition ?? null)).toEqual([
        null,
        null,
        null,
        { itemId, change: "gained", fromCount: 3, toCount: 4 },
        null,
        null,
      ]);
    }
  });

  test("full-build replacements gain and lose Attunement atomically without changing six-slot freedom", () => {
    const game = new GameWorld();
    readyHero(game, "warden");
    const initial: EquipmentSlots = [
      "tempered_edge",
      "tempered_edge",
      "tempered_edge",
      "fleetstep_greaves",
      "runebound_focus",
      "quickening_sigil",
    ];
    game.players.get("p1")!.equipment = [...initial] as EquipmentSlots;
    fund(game, 2 * ARMORY_REFORGE_NET_COST);
    game.takePendingEvents();

    placeAt(game, "ironbound_forge");
    expect(replace(game, "ironbound_forge", "tempered_edge", 4, "runebound_focus").ok).toBe(true);
    let player = game.getSnapshot().players[0]!;
    expect(player.equipment).toEqual([
      "tempered_edge",
      "tempered_edge",
      "tempered_edge",
      "fleetstep_greaves",
      "tempered_edge",
      "quickening_sigil",
    ]);
    expect(player.equipment).toHaveLength(6);
    expect(player.stats.basicDamage).toBeCloseTo(60);
    expect(player.stats.abilityPower).toBe(1);
    expect(dominantEquipmentStack(player.equipment)).toEqual({ itemId: "tempered_edge", count: 4, attuned: true });
    const gainedEvents = game.takePendingEvents().filter((event) => event.kind === "item_purchased");
    expect(gainedEvents).toHaveLength(1);
    expect(gainedEvents[0]!.attunementTransition).toEqual({
      itemId: "tempered_edge",
      change: "gained",
      fromCount: 3,
      toCount: 4,
    });

    placeAt(game, "veilglass_reliquary");
    expect(replace(game, "veilglass_reliquary", "runebound_focus", 0, "tempered_edge").ok).toBe(true);
    player = game.getSnapshot().players[0]!;
    expect(player.equipment).toHaveLength(6);
    expect(player.stats.basicDamage).toBeCloseTo(48);
    expect(player.stats.abilityPower).toBeCloseTo(1.15);
    expect(dominantEquipmentStack(player.equipment)).toEqual({ itemId: "tempered_edge", count: 3, attuned: false });
    expect(player.gold).toBe(0);
    const lostEvents = game.takePendingEvents().filter((event) => event.kind === "item_purchased");
    expect(lostEvents).toHaveLength(1);
    expect(lostEvents[0]!.attunementTransition).toEqual({
      itemId: "tempered_edge",
      change: "lost",
      fromCount: 4,
      toCount: 3,
    });
  });

  test("replacing a fifth copy leaves the outgoing four-copy stack Attuned without a transition", () => {
    const game = new GameWorld();
    readyHero(game, "warden");
    game.players.get("p1")!.equipment = [
      "tempered_edge",
      "tempered_edge",
      "tempered_edge",
      "tempered_edge",
      "tempered_edge",
      "runebound_focus",
    ];
    fund(game, ARMORY_WARE_PRICE);
    placeAt(game, "veilglass_reliquary");
    game.takePendingEvents();

    expect(replace(game, "veilglass_reliquary", "quickening_sigil", 4, "tempered_edge").ok).toBe(true);

    const player = game.getSnapshot().players[0]!;
    expect(dominantEquipmentStack(player.equipment)).toEqual({ itemId: "tempered_edge", count: 4, attuned: true });
    const events = game.takePendingEvents().filter((event) => event.kind === "item_purchased");
    expect(events).toHaveLength(1);
    expect(events[0]!.attunementTransition).toBeUndefined();
  });

  test("crossing four Sigils preserves active cooldown progress in both directions without touching LMB or action timing", () => {
    const game = new GameWorld();
    readyHero(game, "warden");
    const state = game.players.get("p1")!;
    state.equipment = [
      "quickening_sigil",
      "quickening_sigil",
      "quickening_sigil",
      "tempered_edge",
      "fleetstep_greaves",
      null,
    ];
    fund(game, 2 * ARMORY_WARE_PRICE);
    placeAt(game, "veilglass_reliquary");
    const remaining = { ability1: 2, ability2: 4, ability3: 6, ultimate: 10 } as const;
    Object.assign(state.cooldowns, remaining);
    state.cooldowns.basic = 0.37;
    state.action = {
      kind: "ability2",
      phase: "windup",
      remaining: 0.19,
      duration: 0.26,
      direction: { x: 0, z: -1 },
    };
    const actionBefore = structuredClone(state.action);

    expect(buy(game, "veilglass_reliquary", "quickening_sigil").ok).toBe(true);
    expect(game.getSnapshot().players[0]!.stats.cooldownRecovery).toBeCloseTo(1.75);
    for (const [slot, value] of Object.entries(remaining)) {
      expect(state.cooldowns[slot as keyof typeof remaining]).toBeCloseTo(value * 1.45 / 1.75);
    }
    expect(state.cooldowns.basic).toBe(0.37);
    expect(state.action).toEqual(actionBefore);

    placeAt(game, "ironbound_forge");
    expect(replace(game, "ironbound_forge", "tempered_edge", 0, "quickening_sigil").ok).toBe(true);
    expect(game.getSnapshot().players[0]!.stats.cooldownRecovery).toBeCloseTo(1.45);
    for (const [slot, value] of Object.entries(remaining)) {
      expect(state.cooldowns[slot as keyof typeof remaining]).toBeCloseTo(value);
    }
    expect(state.cooldowns.basic).toBe(0.37);
    expect(state.action).toEqual(actionBefore);
  });

  test("crossing four Focuses preserves created Splitbolts, Falling Stars, and Wraiths while new attacks use Attuned power", () => {
    const focusThresholdBuild: EquipmentSlots = [
      "runebound_focus",
      "runebound_focus",
      "runebound_focus",
      "tempered_edge",
      "fleetstep_greaves",
      null,
    ];

    const projectileGame = new GameWorld();
    readyHero(projectileGame, "riftstalker");
    projectileGame.players.get("p1")!.equipment = [...focusThresholdBuild] as EquipmentSlots;
    fund(projectileGame, ARMORY_WARE_PRICE);
    placeAt(projectileGame, "veilglass_reliquary");
    expect(projectileGame.levelAbility("p1", "ability2").ok).toBe(true);
    expect(projectileGame.handleMessage("p1", { type: "cast", slot: "ability2" }).ok).toBe(true);
    advance(projectileGame, 0.4);
    const projectileInternal = projectileGame as unknown as { projectiles: Map<string, { damage: number; kind: string }> };
    const splitbolts = () => [...projectileInternal.projectiles.values()]
      .filter((projectile) => projectile.kind === "splitbolt")
      .map((projectile) => projectile.damage);
    expectNumbers(splitbolts(), [68.15]);
    expect(buy(projectileGame, "veilglass_reliquary", "runebound_focus").ok).toBe(true);
    expectNumbers(splitbolts(), [68.15]);
    const projectilePlayer = projectileGame.players.get("p1")!;
    projectilePlayer.cooldowns.ability2 = 0;
    projectilePlayer.action = null;
    expect(projectileGame.handleMessage("p1", { type: "cast", slot: "ability2" }).ok).toBe(true);
    advance(projectileGame, 0.4);
    expectNumbers(splitbolts(), [68.15, 82.25]);

    const delayedGame = new GameWorld();
    readyHero(delayedGame, "ashcaller");
    delayedGame.players.get("p1")!.equipment = [...focusThresholdBuild] as EquipmentSlots;
    fund(delayedGame, ARMORY_WARE_PRICE);
    placeAt(delayedGame, "veilglass_reliquary");
    expect(delayedGame.levelAbility("p1", "ability3").ok).toBe(true);
    expect(delayedGame.handleMessage("p1", { type: "cast", slot: "ability3" }).ok).toBe(true);
    advance(delayedGame, 0.4);
    const delayedInternal = delayedGame as unknown as { delayed: Array<{ damage: number }> };
    expectNumbers(delayedInternal.delayed.map((strike) => strike.damage), [152.25]);
    expect(buy(delayedGame, "veilglass_reliquary", "runebound_focus").ok).toBe(true);
    expectNumbers(delayedInternal.delayed.map((strike) => strike.damage), [152.25]);
    const delayedPlayer = delayedGame.players.get("p1")!;
    delayedPlayer.cooldowns.ability3 = 0;
    delayedPlayer.action = null;
    expect(delayedGame.handleMessage("p1", { type: "cast", slot: "ability3" }).ok).toBe(true);
    advance(delayedGame, 0.4);
    expectNumbers(delayedInternal.delayed.map((strike) => strike.damage), [152.25, 183.75]);

    const summonGame = new GameWorld();
    readyHero(summonGame, "gravebinder");
    summonGame.players.get("p1")!.equipment = [...focusThresholdBuild] as EquipmentSlots;
    fund(summonGame, ARMORY_WARE_PRICE);
    placeAt(summonGame, "veilglass_reliquary");
    expect(summonGame.levelAbility("p1", "ability3").ok).toBe(true);
    expect(summonGame.handleMessage("p1", { type: "cast", slot: "ability3" }).ok).toBe(true);
    advance(summonGame, 0.4);
    const summonInternal = summonGame as unknown as { summons: Map<string, { damage: number }> };
    expectNumbers([...summonInternal.summons.values()].map((summon) => summon.damage), [34.8, 34.8, 34.8]);
    expect(buy(summonGame, "veilglass_reliquary", "runebound_focus").ok).toBe(true);
    expectNumbers([...summonInternal.summons.values()].map((summon) => summon.damage), [34.8, 34.8, 34.8]);
    const summonPlayer = summonGame.players.get("p1")!;
    summonPlayer.cooldowns.ability3 = 0;
    summonPlayer.action = null;
    expect(summonGame.handleMessage("p1", { type: "cast", slot: "ability3" }).ok).toBe(true);
    advance(summonGame, 0.4);
    expectNumbers([...summonInternal.summons.values()].map((summon) => summon.damage), [34.8, 34.8, 42, 42, 42]);
  });

  test("Attuned Edge and Greaves change real basic impact and fixed-tick displacement", () => {
    function riftBasicDamage(edgeCount: number): number {
      const game = new GameWorld({ accelerated: true, timings: { pushDuration: 180 }, random: () => 0.5, enemyCap: 1 });
      readyHero(game, "warden");
      game.players.get("p1")!.equipment = equipmentOf("tempered_edge", edgeCount);
      expect(game.debugAdvance().ok).toBe(true);
      expect(game.debugAdvance().ok).toBe(true);
      const rift = game.getSnapshot().riftHeart;
      game.players.get("p1")!.position = { x: rift.position.x, z: rift.position.z + 5 };
      const before = rift.hp;
      expect(game.handleMessage("p1", {
        type: "input",
        seq: 1,
        move: { x: 0, z: 0 },
        aim: { x: 0, z: -1 },
        attacking: true,
      }).ok).toBe(true);
      for (let step = 0; step < 15; step += 1) game.update(1 / 60);
      return before - game.getSnapshot().riftHeart.hp;
    }

    function displacement(greavesCount: number): number {
      const game = new GameWorld({ timings: { defenseDuration: 180 } });
      readyHero(game, "warden");
      const player = game.players.get("p1")!;
      player.equipment = equipmentOf("fleetstep_greaves", greavesCount);
      const start = player.position.x;
      expect(game.handleMessage("p1", {
        type: "input",
        seq: 1,
        move: { x: 1, z: 0 },
        aim: { x: 1, z: 0 },
        attacking: false,
      }).ok).toBe(true);
      game.update(0.1);
      return game.getSnapshot().players[0]!.position.x - start;
    }

    expect(riftBasicDamage(3)).toBeCloseTo(48);
    expect(riftBasicDamage(4)).toBeCloseTo(60);
    expect(displacement(3)).toBeCloseTo(1.365);
    expect(displacement(4)).toBeCloseTo(1.575);
  });

  test("Attunement remains personal through revival and every raw slot resets with the run", () => {
    const game = new GameWorld();
    readyParty(game, ["warden", "riftstalker"]);
    placeAt(game, "ironbound_forge", "p1");
    fund(game, 4 * ARMORY_WARE_PRICE, "p1");
    for (let copy = 0; copy < 4; copy += 1) {
      expect(buy(game, "ironbound_forge", "tempered_edge", "p1").ok).toBe(true);
    }

    let snapshot = game.getSnapshot();
    let buyer = snapshot.players.find((player) => player.id === "p1")!;
    let ally = snapshot.players.find((player) => player.id === "p2")!;
    expect(buyer.stats.basicDamage).toBeCloseTo(60);
    expect(dominantEquipmentStack(buyer.equipment)).toEqual({ itemId: "tempered_edge", count: 4, attuned: true });
    expect(ally.equipment).toEqual([null, null, null, null, null, null]);
    expect(ally.stats.basicDamage).toBe(19);

    const buyerState = game.players.get("p1")!;
    buyerState.hp = 0;
    buyerState.downedFor = 0.05;
    game.update(0.1);
    buyer = game.getSnapshot().players.find((player) => player.id === "p1")!;
    expect(buyer.downed).toBe(false);
    expect(buyer.stats.basicDamage).toBeCloseTo(60);
    expect(dominantEquipmentStack(buyer.equipment)).toEqual({ itemId: "tempered_edge", count: 4, attuned: true });

    game.damageNexus(10_000);
    expect(game.resetRun("p1").ok).toBe(true);
    snapshot = game.getSnapshot();
    buyer = snapshot.players.find((player) => player.id === "p1")!;
    ally = snapshot.players.find((player) => player.id === "p2")!;
    expect(buyer.equipment).toEqual([null, null, null, null, null, null]);
    expect(ally.equipment).toEqual([null, null, null, null, null, null]);
    expect(buyer.stats).toEqual(deriveHeroStats("warden", 1));
    expect(ally.stats).toEqual(deriveHeroStats("riftstalker", 1));
  });
});
