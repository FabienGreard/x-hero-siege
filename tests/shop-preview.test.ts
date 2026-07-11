import { describe, expect, test } from "bun:test";
import {
  formatEquipmentStat,
  formatOrdinaryPurchaseResult,
  projectAcceptedPurchaseImpact,
  projectLearnedAbilityCooldowns,
  projectOrdinaryPurchasePreview,
} from "../src/client/shop-preview";
import {
  ARMORY_WARE_PRICE,
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
  ranks: Record<AbilitySlot, number> = abilityRanks(),
) {
  return {
    heroId,
    level,
    equipment,
    stats: deriveHeroStats(heroId, level, equipment),
    abilityRanks: ranks,
  };
}

describe("learned ability cooldown projections", () => {
  test("shows exact fresh-cast returns for learned abilities and never invents rank-one values", () => {
    const currentStats = deriveHeroStats("ashcaller", 6);
    const projectedStats = deriveHeroStats("ashcaller", 6, ["quickening_sigil"]);
    const ranks = abilityRanks({ ability1: 2, ability3: 3 });

    expect(projectLearnedAbilityCooldowns("ashcaller", ranks, currentStats, projectedStats)).toEqual([
      {
        slot: "ability1",
        name: "Flame Ring",
        rank: 2,
        currentSeconds: 6,
        projectedSeconds: 6 / 1.15,
        currentValue: "6S",
        projectedValue: "5.2S",
      },
      {
        slot: "ability3",
        name: "Falling Star",
        rank: 3,
        currentSeconds: 12,
        projectedSeconds: 12 / 1.15,
        currentValue: "12S",
        projectedValue: "10.4S",
      },
    ]);

    const preview = projectOrdinaryPurchasePreview(
      source("ashcaller", 6, equipmentOf("quickening_sigil", 0), ranks),
      "quickening_sigil",
    );
    expect(preview?.resultText).toBe("COOLDOWN SPEED 100% → 115%");
    expect(preview?.accessibleResult).toContain(
      "Flame Ring rank 2 fresh-cast cooldown 6 seconds to 5.2 seconds",
    );
    expect(preview?.accessibleResult).toContain(
      "Falling Star rank 3 fresh-cast cooldown 12 seconds to 10.4 seconds",
    );
    expect(preview?.accessibleResult).not.toContain("Cinder Wall");
    expect(preview?.accessibleResult).not.toContain("Worldfire");
  });

  test("all champions, legal ranks, and ordinary Sigil counts stay learned-only and monotonic", () => {
    const slots = ["ability1", "ability2", "ability3", "ultimate"] as const satisfies readonly AbilitySlot[];
    for (const heroId of HERO_IDS) {
      for (const slot of slots) {
        const ability = HERO_DEFINITIONS[heroId].abilities[slot];
        for (let rank = 0; rank <= ability.maxRank; rank += 1) {
          for (let count = 0; count <= 5; count += 1) {
            const currentStats = deriveHeroStats(heroId, 6, equipmentOf("quickening_sigil", count));
            const projectedStats = deriveHeroStats(heroId, 6, equipmentOf("quickening_sigil", count + 1));
            const projections = projectLearnedAbilityCooldowns(
              heroId,
              abilityRanks({ [slot]: rank }),
              currentStats,
              projectedStats,
            );
            if (rank === 0) {
              expect(projections).toEqual([]);
              continue;
            }
            expect(projections).toHaveLength(1);
            expect(projections[0]).toMatchObject({ slot, name: ability.name, rank });
            expect(projections[0]!.projectedSeconds).toBeLessThan(projections[0]!.currentSeconds);
          }
        }
      }
    }
  });

  test("the fourth Sigil exposes its doubled Attunement step while other wares remain isolated", () => {
    const ranks = abilityRanks({ ability1: 1 });
    const sigil = projectOrdinaryPurchasePreview(
      source("warden", 6, equipmentOf("quickening_sigil", 3), ranks),
      "quickening_sigil",
    );
    expect(sigil).toMatchObject({
      attunes: true,
      resultText: "COOLDOWN SPEED 145% → 175%",
      learnedCooldowns: [{
        slot: "ability1",
        name: "Vanguard Rush",
        rank: 1,
        currentValue: "4.1S",
        projectedValue: "3.4S",
      }],
    });

    for (const itemId of ["tempered_edge", "fleetstep_greaves", "runebound_focus"] as const) {
      expect(projectOrdinaryPurchasePreview(
        source("warden", 6, equipmentOf(itemId, 0), ranks),
        itemId,
      )?.learnedCooldowns).toEqual([]);
    }
  });

  test("reforge gain, loss, and Attunement loss expose exact learned fresh-cast cooldowns", () => {
    const ranks = abilityRanks({ ability1: 3, ability2: 0, ability3: 2, ultimate: 1 });
    const withoutSigil: EquipmentSlots = [
      "tempered_edge",
      "tempered_edge",
      "tempered_edge",
      "tempered_edge",
      "tempered_edge",
      "tempered_edge",
    ];
    const withOneSigil: EquipmentSlots = [
      "quickening_sigil",
      "tempered_edge",
      "tempered_edge",
      "tempered_edge",
      "tempered_edge",
      "tempered_edge",
    ];
    const gain = projectLearnedAbilityCooldowns(
      "ashcaller",
      ranks,
      deriveHeroStats("ashcaller", 8, withoutSigil),
      deriveHeroStats("ashcaller", 8, withOneSigil),
    );
    expect(gain.map(({ slot, currentValue, projectedValue }) => ({ slot, currentValue, projectedValue }))).toEqual([
      { slot: "ability1", currentValue: "6S", projectedValue: "5.2S" },
      { slot: "ability3", currentValue: "12S", projectedValue: "10.4S" },
      { slot: "ultimate", currentValue: "38S", projectedValue: "33S" },
    ]);
    expect(projectLearnedAbilityCooldowns(
      "ashcaller",
      ranks,
      deriveHeroStats("ashcaller", 8, withOneSigil),
      deriveHeroStats("ashcaller", 8, withoutSigil),
    ).map(({ slot, currentValue, projectedValue }) => ({ slot, currentValue, projectedValue }))).toEqual([
      { slot: "ability1", currentValue: "5.2S", projectedValue: "6S" },
      { slot: "ability3", currentValue: "10.4S", projectedValue: "12S" },
      { slot: "ultimate", currentValue: "33S", projectedValue: "38S" },
    ]);

    const fourSigils: EquipmentSlots = [
      "quickening_sigil",
      "quickening_sigil",
      "quickening_sigil",
      "quickening_sigil",
      "runebound_focus",
      "runebound_focus",
    ];
    const threeSigils: EquipmentSlots = [
      "quickening_sigil",
      "quickening_sigil",
      "quickening_sigil",
      "runebound_focus",
      "runebound_focus",
      "runebound_focus",
    ];
    expect(projectLearnedAbilityCooldowns(
      "ashcaller",
      ranks,
      deriveHeroStats("ashcaller", 8, fourSigils),
      deriveHeroStats("ashcaller", 8, threeSigils),
    ).map(({ slot, currentValue, projectedValue }) => ({ slot, currentValue, projectedValue }))).toEqual([
      { slot: "ability1", currentValue: "3.4S", projectedValue: "4.1S" },
      { slot: "ability3", currentValue: "6.9S", projectedValue: "8.3S" },
      { slot: "ultimate", currentValue: "21.7S", projectedValue: "26.2S" },
    ]);
  });

  test("each projected return agrees with the authoritative cooldown after purchase", () => {
    const slots = ["ability1", "ability2", "ability3", "ultimate"] as const satisfies readonly AbilitySlot[];
    for (const heroId of HERO_IDS) {
      for (const slot of slots) {
        for (let rank = 1; rank <= HERO_DEFINITIONS[heroId].abilities[slot].maxRank; rank += 1) {
          for (const count of [0, 3, 5]) {
            const game = new GameWorld();
            expect(game.addPlayer("p1", "Preview Hero").ok).toBe(true);
            expect(game.claimHero("p1", heroId).ok).toBe(true);
            expect(game.setReady("p1", true).ok).toBe(true);
            expect(game.startGame("p1").ok).toBe(true);
            const player = game.players.get("p1")!;
            player.equipment = equipmentOf("quickening_sigil", count);
            player.abilityRanks = abilityRanks({ [slot]: rank });
            player.goldUnits = goldToUnits(ARMORY_WARE_PRICE);
            player.position = { ...VENDOR_DEFINITIONS.veilglass_reliquary.position };

            const preview = projectOrdinaryPurchasePreview(
              game.getSnapshot().players[0]!,
              "quickening_sigil",
            );
            expect(preview?.learnedCooldowns).toHaveLength(1);
            expect(game.handleMessage("p1", {
              type: "buy_item",
              vendorId: "veilglass_reliquary",
              itemId: "quickening_sigil",
            }).ok).toBe(true);
            player.cooldowns[slot] = 0;
            player.action = null;
            expect(game.handleMessage("p1", { type: "cast", slot }).ok).toBe(true);
            expect(player.cooldowns[slot]).toBeCloseTo(
              preview!.learnedCooldowns[0]!.projectedSeconds,
            );
          }
        }
      }
    }
  });
});

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
      if (itemId === "fleetstep_greaves") {
        expect(preview?.combatStride).toMatchObject({
          currentValue: "0",
          projectedValue: "2.4",
          resultText: "COMBAT STRIDE · 2.4 WORLD/S DURING LMB",
        });
        expect(preview?.accessibleResult).toContain("does not apply to abilities");
      } else {
        expect(preview?.combatStride).toBeNull();
      }
    }
  });

  test("later Greaves copies preview the exact current champion stride rate", () => {
    expect([3, 4, 5].map((count) => {
      const stride = projectOrdinaryPurchasePreview(
        source("warden", 1, equipmentOf("fleetstep_greaves", count)),
        "fleetstep_greaves",
      )?.combatStride;
      return stride && {
        currentValue: stride.currentValue,
        projectedValue: stride.projectedValue,
        resultText: stride.resultText,
      };
    })).toEqual([
      {
        currentValue: "0",
        projectedValue: "2.4",
        resultText: "COMBAT STRIDE · 2.4 WORLD/S DURING LMB",
      },
      {
        currentValue: "2.4",
        projectedValue: "2.5",
        resultText: "COMBAT STRIDE 2.4 → 2.5 WORLD/S",
      },
      {
        currentValue: "2.5",
        projectedValue: "2.7",
        resultText: "COMBAT STRIDE 2.5 → 2.7 WORLD/S",
      },
    ]);
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
            const expectedAccessible = `${preview!.statLabel} ${expectedCurrentValue} to ${expectedProjectedValue}${count === 3 ? ", and the stack Attunes" : ""}.`;
            expect(preview!.accessibleResult.startsWith(expectedAccessible)).toBe(true);
            if (itemId === "fleetstep_greaves" && count >= 3) {
              expect(preview!.combatStride).not.toBeNull();
              expect(preview!.accessibleResult).toContain("Combat Stride");
            } else {
              expect(preview!.combatStride).toBeNull();
              expect(preview!.accessibleResult).toBe(expectedAccessible);
            }
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

describe("accepted purchase impact receipts", () => {
  test("ordinary and replacement receipts report the exact incoming Hero Stat result", () => {
    const openEquipment: EquipmentSlots = [
      "runebound_focus",
      "tempered_edge",
      null,
      null,
      null,
      null,
    ];
    expect(projectAcceptedPurchaseImpact(source("warden", 6, openEquipment), "quickening_sigil")).toMatchObject({
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
    expect(projectAcceptedPurchaseImpact(source("warden", 6, fullEquipment), "quickening_sigil", 1)).toMatchObject({
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

  test("all four heroes and wares reconstruct the same canonical post-purchase stat", () => {
    for (const heroId of HERO_IDS) {
      for (const itemId of ITEM_IDS) {
        const equipment: EquipmentSlots = [null, null, null, null, null, null];
        const receipt = projectAcceptedPurchaseImpact(source(heroId, 4, equipment), itemId);
        expect(receipt).not.toBeNull();
        expect(receipt!.projectedValue).toBe(
          formatEquipmentStat(
            receipt!.statKey,
            deriveHeroStats(heroId, 4, receipt!.equipment)[receipt!.statKey],
          ),
        );
      }
    }
  });

  test("the fourth Greaves receipt names the unlocked current champion stride", () => {
    const equipment = equipmentOf("fleetstep_greaves", 3);
    expect(projectAcceptedPurchaseImpact(source("warden", 4, equipment), "fleetstep_greaves")).toMatchObject({
      statKey: "moveSpeed",
      currentValue: "13.7",
      projectedValue: "15.8",
      resultText: "MOVE SPEED 13.7 → 15.8 · COMBAT STRIDE · 2.4 WORLD/S DURING LMB",
    });
  });
});
