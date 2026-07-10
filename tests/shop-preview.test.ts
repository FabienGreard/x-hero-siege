import { describe, expect, test } from "bun:test";
import {
  formatEquipmentStat,
  formatOrdinaryPurchaseResult,
  projectOrdinaryPurchasePreview,
} from "../src/client/shop-preview";
import {
  ARMORY_WARE_PRICE,
  VENDOR_DEFINITIONS,
} from "../src/shared/armory-data";
import { HERO_IDS } from "../src/shared/game-data";
import { deriveHeroStats } from "../src/shared/hero-stats";
import type {
  EquipmentSlots,
  HeroId,
  ItemId,
  VendorId,
} from "../src/shared/protocol";
import { goldToUnits } from "../src/server/economy";
import { GameWorld } from "../src/server/game";

const ITEM_IDS = [
  "tempered_edge",
  "fleetstep_greaves",
  "runebound_focus",
  "quickening_sigil",
] as const satisfies readonly ItemId[];

const ITEM_VENDORS = {
  tempered_edge: "ironbound_forge",
  fleetstep_greaves: "ironbound_forge",
  runebound_focus: "veilglass_reliquary",
  quickening_sigil: "veilglass_reliquary",
} as const satisfies Record<ItemId, VendorId>;

function equipmentOf(itemId: ItemId, count: number): EquipmentSlots {
  return Array.from({ length: 6 }, (_, index) => index < count ? itemId : null) as EquipmentSlots;
}

function source(heroId: HeroId, level: number, equipment: EquipmentSlots) {
  return {
    heroId,
    level,
    equipment,
    stats: deriveHeroStats(heroId, level, equipment),
  };
}

describe("ordinary shop purchase previews", () => {
  test("every base Warden ware names its exact next Hero Stat result", () => {
    const equipment: EquipmentSlots = [null, null, null, null, null, null];
    expect(ITEM_IDS.map((itemId) => projectOrdinaryPurchasePreview(source("warden", 1, equipment), itemId)?.resultText)).toEqual([
      "BASIC DAMAGE 30 → 36",
      "MOVE SPEED 10.5 → 11.6",
      "SKILL POWER 100% → 115%",
      "COOLDOWN SPEED 100% → 115%",
    ]);
  });

  test("the fourth copy previews the exact doubled Attunement step", () => {
    const expected = [
      ["BASIC DAMAGE 48 → 60", "48", "60"],
      ["MOVE SPEED 13.7 → 15.8", "13.7", "15.8"],
      ["SKILL POWER 145% → 175%", "145%", "175%"],
      ["COOLDOWN SPEED 145% → 175%", "145%", "175%"],
    ];
    for (const [index, itemId] of ITEM_IDS.entries()) {
      const preview = projectOrdinaryPurchasePreview(source("warden", 1, equipmentOf(itemId, 3)), itemId);
      expect(preview).toMatchObject({
        resultText: expected[index]![0],
        currentValue: expected[index]![1],
        projectedValue: expected[index]![2],
        currentCount: 3,
        projectedCount: 4,
        effectiveProjectedCount: 5,
        attunes: true,
      });
      expect(preview?.accessibleResult).toContain("and the stack Attunes");
    }
  });

  test("every hero, ware, level, and ordinary copy count matches the authoritative purchase", () => {
    for (const heroId of HERO_IDS) {
      for (const itemId of ITEM_IDS) {
        for (const level of [1, 4]) {
          for (let count = 0; count <= 5; count += 1) {
            const game = new GameWorld();
            expect(game.addPlayer("p1", "Preview Hero").ok).toBe(true);
            expect(game.claimHero("p1", heroId).ok).toBe(true);
            expect(game.setReady("p1", true).ok).toBe(true);
            expect(game.startGame("p1").ok).toBe(true);
            const player = game.players.get("p1")!;
            player.level = level;
            player.equipment = equipmentOf(itemId, count);
            player.goldUnits = goldToUnits(ARMORY_WARE_PRICE);
            player.position = { ...VENDOR_DEFINITIONS[ITEM_VENDORS[itemId]].position };

            const current = game.getSnapshot().players[0]!;
            const preview = projectOrdinaryPurchasePreview(current, itemId);
            expect(preview).not.toBeNull();

            const result = game.handleMessage("p1", {
              type: "buy_item",
              vendorId: ITEM_VENDORS[itemId],
              itemId,
            });
            expect(result.ok).toBe(true);
            const authoritative = game.getSnapshot().players[0]!;
            expect(authoritative.equipment).toEqual(preview!.equipment);
            expect(authoritative.stats).toEqual(deriveHeroStats(heroId, level, preview!.equipment));
            const expectedCurrentValue = formatEquipmentStat(preview!.statKey, current.stats[preview!.statKey]);
            const expectedProjectedValue = formatEquipmentStat(preview!.statKey, authoritative.stats[preview!.statKey]);
            expect(preview!.currentValue).toBe(expectedCurrentValue);
            expect(preview!.projectedValue).toBe(expectedProjectedValue);
            expect(preview!.resultText).toBe(
              `${preview!.statLabel.toUpperCase()} ${expectedCurrentValue} → ${expectedProjectedValue}`,
            );
            expect(preview!.accessibleResult).toBe(
              `${preview!.statLabel} ${expectedCurrentValue} to ${expectedProjectedValue}${count === 3 ? ", and the stack Attunes" : ""}.`,
            );
            expect(preview!.projectedCount).toBe(count + 1);
            expect(preview!.attunes).toBe(count === 3);
          }
        }
      }
    }
  });

  test("mixed open builds use the first empty slot while full builds require the existing reforge preview", () => {
    const mixed: EquipmentSlots = [
      "tempered_edge",
      "runebound_focus",
      "quickening_sigil",
      null,
      null,
      null,
    ];
    expect(projectOrdinaryPurchasePreview(source("warden", 4, mixed), "fleetstep_greaves")).toMatchObject({
      equipment: [
        "tempered_edge",
        "runebound_focus",
        "quickening_sigil",
        "fleetstep_greaves",
        null,
        null,
      ],
      resultText: "MOVE SPEED 10.5 → 11.6",
    });

    const full: EquipmentSlots = [
      "tempered_edge",
      "runebound_focus",
      "quickening_sigil",
      "fleetstep_greaves",
      "tempered_edge",
      "runebound_focus",
    ];
    expect(projectOrdinaryPurchasePreview(source("warden", 4, full), "fleetstep_greaves")).toBeNull();
    expect(projectOrdinaryPurchasePreview({ ...source("warden", 4, mixed), heroId: null }, "fleetstep_greaves")).toBeNull();
  });

  test("the safe fallback never invents a change", () => {
    expect(formatOrdinaryPurchaseResult("basicDamage", "Basic Damage", 30, 30)).toEqual({
      currentValue: "30",
      projectedValue: "30",
      resultText: "NO HERO STAT CHANGE",
      accessibleResult: "No Hero Stat change.",
      changed: false,
    });
  });
});
