import { describe, expect, test } from "bun:test";
import {
  formatEquipmentStat,
  formatOrdinaryPurchaseResult,
  projectAcceptedPurchaseImpact,
  projectOrdinaryPurchasePreview,
} from "../src/client/shop-preview";
import {
  ARMORY_WARE_PRICE,
  ITEM_IDS,
  VENDOR_DEFINITIONS,
} from "../src/shared/armory-data";
import { HERO_DEFINITIONS, HERO_IDS } from "../src/shared/game-data";
import { deriveHeroStats } from "../src/shared/hero-stats";
import type {
  AbilitySlot,
  EquipmentSlots,
  HeroId,
  ItemId,
  VendorId,
  MasterySnapshot,
} from "../src/shared/protocol";
import { goldToUnits } from "../src/server/economy";
import { GameWorld } from "../src/server/game";

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

function abilityRanks(
  overrides: Partial<Record<AbilitySlot, number>> = {},
): Record<AbilitySlot, number> {
  return {
    ability1: 0,
    ability2: 0,
    ability3: 0,
    ultimate: 0,
    ...overrides,
  };
}

function source(
  heroId: HeroId,
  level: number,
  equipment: EquipmentSlots,
  mastery: MasterySnapshot | null = null,
) {
  return {
    heroId,
    level,
    equipment,
    stats: deriveHeroStats(heroId, level, equipment, "greatsword"),
    mastery,
    weaponId: "greatsword" as const,
  };
}

describe("ordinary shop purchase previews", () => {
  test("Quickening projects accepted equipped Greatsword skills by stable skill identity", () => {
    const mastery: MasterySnapshot = {
      weaponId: "greatsword", revision: 3, pointBudget: 2,
      learnedNodeIds: ["tempered_stance", "cleave"], legalNodeIds: [], excludedNodeIds: [], unavailableNodeReasons: {},
      equipped: { ability1: "cleave", ability2: null, ability3: null, ultimate: null },
      loadoutMutationContext: "none", freeRespecUsed: false,
    };
    const preview = projectOrdinaryPurchasePreview(source("defender", 2, equipmentOf("quickening_sigil", 0), mastery), "quickening_sigil");
    expect(preview?.learnedCooldowns).toEqual([expect.objectContaining({
      skillId: "cleave", slot: "ability1", name: "Cleave", currentSeconds: 5, projectedSeconds: 5 / 1.15,
    })]);
    expect(preview?.accessibleResult).toContain("Cleave fresh-cast cooldown");
  });
  test("every base Defender ware names its exact next Build stat result", () => {
    const equipment: EquipmentSlots = [null, null, null, null, null, null];
    expect(ITEM_IDS.map((itemId) => projectOrdinaryPurchasePreview(source("defender", 1, equipment), itemId)?.resultText)).toEqual([
      "BASIC DAMAGE 30 → 36",
      "MOVE SPEED 11.2 → 12.3",
      "SKILL POWER 100% → 115%",
      "COOLDOWN SPEED 100% → 115%",
      "MAX HEALTH 150 → 165",
    ]);
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
    expect(projectOrdinaryPurchasePreview(source("defender", 4, mixed), "fleetstep_greaves")).toMatchObject({
      equipment: [
        "tempered_edge",
        "runebound_focus",
        "quickening_sigil",
        "fleetstep_greaves",
        null,
        null,
      ],
      resultText: "MOVE SPEED 11.2 → 12.3",
    });

    const full: EquipmentSlots = [
      "tempered_edge",
      "runebound_focus",
      "quickening_sigil",
      "fleetstep_greaves",
      "tempered_edge",
      "runebound_focus",
    ];
    expect(projectOrdinaryPurchasePreview(source("defender", 4, full), "fleetstep_greaves")).toBeNull();
    expect(projectOrdinaryPurchasePreview({ ...source("defender", 4, mixed), heroId: null }, "fleetstep_greaves")).toBeNull();
  });

  test("the safe fallback never invents a change", () => {
    expect(formatOrdinaryPurchaseResult("basicDamage", "Basic Damage", 30, 30)).toEqual({
      currentValue: "30",
      projectedValue: "30",
      resultText: "NO BUILD STAT CHANGE",
      accessibleResult: "No Build stat change.",
      changed: false,
    });
  });
});

describe("accepted purchase impact receipts", () => {
  test("ordinary and replacement receipts report the exact incoming Build stat result", () => {
    const openEquipment: EquipmentSlots = [
      "runebound_focus",
      "tempered_edge",
      null,
      null,
      null,
      null,
    ];
    expect(projectAcceptedPurchaseImpact(source("defender", 6, openEquipment), "quickening_sigil")).toMatchObject({
      statKey: "cooldownRecovery",
      currentValue: "100%",
      projectedValue: "115%",
      resultText: "COOLDOWN SPEED 100% → 115%",
    });

    const fullEquipment: EquipmentSlots = [
      "tempered_edge",
      "tempered_edge",
      "runebound_focus",
      "runebound_focus",
      "fleetstep_greaves",
      "fleetstep_greaves",
    ];
    expect(projectAcceptedPurchaseImpact(source("defender", 6, fullEquipment), "quickening_sigil", 1)).toMatchObject({
      equipment: [
        "tempered_edge",
        "quickening_sigil",
        "runebound_focus",
        "runebound_focus",
        "fleetstep_greaves",
        "fleetstep_greaves",
      ],
      statKey: "cooldownRecovery",
      currentValue: "100%",
      projectedValue: "115%",
      resultText: "COOLDOWN SPEED 100% → 115%",
    });
  });

  test("the Defender and every ware reconstruct the same canonical post-purchase stat", () => {
    for (const heroId of HERO_IDS) {
      for (const itemId of ITEM_IDS) {
        const equipment: EquipmentSlots = [null, null, null, null, null, null];
        const receipt = projectAcceptedPurchaseImpact(source(heroId, 4, equipment), itemId);
        expect(receipt).not.toBeNull();
        expect(receipt!.projectedValue).toBe(
          formatEquipmentStat(
            receipt!.statKey,
            deriveHeroStats(heroId, 4, receipt!.equipment, "greatsword")[receipt!.statKey],
          ),
        );
      }
    }
  });

});
