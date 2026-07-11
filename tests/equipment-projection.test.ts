import { describe, expect, test } from "bun:test";
import {
  ARMORY_WARE_PRICE,
  VENDOR_DEFINITIONS,
  createEmptyEquipment,
  dominantEquipmentItem,
  legalEquipmentReplacementSlots,
  projectEquipmentChange,
  summarizeEquipment,
} from "../src/shared/armory-data";
import { HERO_IDS } from "../src/shared/game-data";
import { deriveHeroStats } from "../src/shared/hero-stats";
import type { EquipmentSlots, ItemId, VendorId } from "../src/shared/protocol";
import { goldToUnits } from "../src/server/economy";
import { GameWorld } from "../src/server/game";

const ITEM_IDS = [
  "tempered_edge",
  "fleetstep_greaves",
  "runebound_focus",
  "quickening_sigil",
] as const satisfies readonly ItemId[];

const ITEM_VENDOR: Record<ItemId, VendorId> = {
  tempered_edge: "ironbound_forge",
  fleetstep_greaves: "ironbound_forge",
  runebound_focus: "veilglass_reliquary",
  quickening_sigil: "veilglass_reliquary",
};

describe("canonical equipment projections", () => {
  test("replacement targets exist only for full occupied slots that would change", () => {
    expect(legalEquipmentReplacementSlots(createEmptyEquipment(), "tempered_edge")).toEqual([]);
    for (const itemId of ITEM_IDS) {
      const sixMatching = Array.from({ length: 6 }, () => itemId) as EquipmentSlots;
      expect(legalEquipmentReplacementSlots(sixMatching, itemId)).toEqual([]);
      const fiveMatching = [...sixMatching] as EquipmentSlots;
      fiveMatching[5] = itemId === "tempered_edge" ? "fleetstep_greaves" : "tempered_edge";
      expect(legalEquipmentReplacementSlots(fiveMatching, itemId)).toEqual([5]);
    }
  });

  test("normal purchases take the first empty unrestricted slot without mutating the current build", () => {
    const equipment: EquipmentSlots = [
      "tempered_edge",
      null,
      "runebound_focus",
      null,
      null,
      null,
    ];
    const projection = projectEquipmentChange(equipment, "fleetstep_greaves");

    expect(projection).toEqual({
      equipment: [
        "tempered_edge",
        "fleetstep_greaves",
        "runebound_focus",
        null,
        null,
        null,
      ],
      slotIndex: 1,
      replacedItemId: null,
    });
    expect(equipment).toEqual([
      "tempered_edge",
      null,
      "runebound_focus",
      null,
      null,
      null,
    ]);
  });

  test("a normal first-empty projection exactly matches the authoritative purchase", () => {
    const equipment: EquipmentSlots = [
      "tempered_edge",
      null,
      "runebound_focus",
      null,
      null,
      null,
    ];
    const projection = projectEquipmentChange(equipment, "fleetstep_greaves");
    expect(projection).not.toBeNull();

    const game = new GameWorld();
    expect(game.addPlayer("p1", "Preview Hero").ok).toBe(true);
    expect(game.claimHero("p1", "warden").ok).toBe(true);
    expect(game.setReady("p1", true).ok).toBe(true);
    expect(game.startGame("p1").ok).toBe(true);
    const player = game.players.get("p1")!;
    player.equipment = [...equipment] as EquipmentSlots;
    player.goldUnits = goldToUnits(ARMORY_WARE_PRICE);
    player.position = { ...VENDOR_DEFINITIONS.ironbound_forge.position };
    const result = game.handleMessage("p1", {
      type: "buy_item",
      vendorId: "ironbound_forge",
      itemId: "fleetstep_greaves",
    });
    expect(result.ok).toBe(true);

    const snapshot = game.getSnapshot();
    const authoritative = snapshot.players[0]!;
    expect(authoritative.equipment).toEqual(projection!.equipment);
    expect(authoritative.stats).toEqual(deriveHeroStats("warden", 1, projection!.equipment));
    expect(authoritative.gold).toBe(0);
    expect(snapshot.events.find((event) => event.kind === "item_purchased")).toMatchObject({
      itemId: "fleetstep_greaves",
      slotIndex: 1,
      playerId: "p1",
      vendorId: "ironbound_forge",
    });
  });

  test("only a legal occupied cross-item slot produces a full-build projection", () => {
    const full: EquipmentSlots = [
      "runebound_focus",
      "tempered_edge",
      "runebound_focus",
      "fleetstep_greaves",
      "quickening_sigil",
      "tempered_edge",
    ];
    expect(projectEquipmentChange(full, "tempered_edge")).toBeNull();
    expect(projectEquipmentChange(full, "runebound_focus", 0)).toBeNull();
    expect(projectEquipmentChange(createEmptyEquipment(), "tempered_edge", 0)).toBeNull();

    const projection = projectEquipmentChange(full, "tempered_edge", 0);
    expect(projection?.equipment).toEqual([
      "tempered_edge",
      "tempered_edge",
      "runebound_focus",
      "fleetstep_greaves",
      "quickening_sigil",
      "tempered_edge",
    ]);
    expect(projection?.replacedItemId).toBe("runebound_focus");
    expect(dominantEquipmentItem(full)).toBe("runebound_focus");
    expect(dominantEquipmentItem(projection!.equipment)).toBe("tempered_edge");
    expect(summarizeEquipment(projection!.equipment).map(({ itemId, count }) => [itemId, count])).toEqual([
      ["tempered_edge", 3],
      ["runebound_focus", 1],
      ["fleetstep_greaves", 1],
      ["quickening_sigil", 1],
    ]);

    const currentStats = deriveHeroStats("warden", 1, full);
    const projectedStats = deriveHeroStats("warden", 1, projection!.equipment);
    expect(currentStats.basicDamage).toBeCloseTo(42);
    expect(projectedStats.basicDamage).toBeCloseTo(48);
    expect(currentStats.abilityPower).toBeCloseTo(1.3);
    expect(projectedStats.abilityPower).toBeCloseTo(1.15);
  });

  test("every legal projected reforge exactly matches the authoritative server result", () => {
    for (const heroId of HERO_IDS) {
      for (const level of [1, 4]) {
        for (const outgoingItemId of ITEM_IDS) {
          for (const incomingItemId of ITEM_IDS) {
            if (incomingItemId === outgoingItemId) continue;
            const equipment: EquipmentSlots = [
              outgoingItemId,
              "tempered_edge",
              "fleetstep_greaves",
              "runebound_focus",
              "quickening_sigil",
              incomingItemId,
            ];
            const projection = projectEquipmentChange(equipment, incomingItemId, 0);
            expect(projection).not.toBeNull();

            const game = new GameWorld();
            expect(game.addPlayer("p1", "Preview Hero").ok).toBe(true);
            expect(game.claimHero("p1", heroId).ok).toBe(true);
            expect(game.setReady("p1", true).ok).toBe(true);
            expect(game.startGame("p1").ok).toBe(true);
            const player = game.players.get("p1")!;
            player.level = level;
            player.equipment = [...equipment] as EquipmentSlots;
            player.goldUnits = goldToUnits(ARMORY_WARE_PRICE);
            const vendorId = ITEM_VENDOR[incomingItemId];
            player.position = { ...VENDOR_DEFINITIONS[vendorId].position };

            const projectedStats = deriveHeroStats(heroId, level, projection!.equipment);
            const projectedStacks = summarizeEquipment(projection!.equipment);
            const projectedSignature = dominantEquipmentItem(projection!.equipment);
            const result = game.handleMessage("p1", {
              type: "replace_item",
              vendorId,
              itemId: incomingItemId,
              slotIndex: 0,
              expectedItemId: outgoingItemId,
            });
            expect(result.ok).toBe(true);

            const authoritative = game.getSnapshot().players[0]!;
            expect(authoritative.equipment).toEqual(projection!.equipment);
            expect(authoritative.stats).toEqual(projectedStats);
            expect(summarizeEquipment(authoritative.equipment)).toEqual(projectedStacks);
            expect(dominantEquipmentItem(authoritative.equipment)).toBe(projectedSignature);
            expect(authoritative.gold).toBe(0);
          }
        }
      }
    }
  });
});
