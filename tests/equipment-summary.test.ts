import { describe, expect, test } from "bun:test";
import {
  createEmptyEquipment,
  dominantEquipmentItem,
  summarizeEquipment,
} from "../src/shared/armory-data";
import type { EquipmentSlots } from "../src/shared/protocol";

describe("equipment build summaries", () => {
  test("an empty six-slot build has no stacks", () => {
    expect(summarizeEquipment(createEmptyEquipment())).toEqual([]);
  });

  test("duplicates are grouped in first-equipped order with their total effects", () => {
    const equipment: EquipmentSlots = [
      "runebound_focus",
      "tempered_edge",
      "runebound_focus",
      "quickening_sigil",
      "tempered_edge",
      "runebound_focus",
    ];

    expect(summarizeEquipment(equipment)).toEqual([
      { itemId: "runebound_focus", count: 3, effectiveCount: 3, attuned: false, totalEffectLabel: "+45% Skill Power" },
      { itemId: "tempered_edge", count: 2, effectiveCount: 2, attuned: false, totalEffectLabel: "+40% Basic Damage" },
      { itemId: "quickening_sigil", count: 1, effectiveCount: 1, attuned: false, totalEffectLabel: "+15% Cooldown Speed" },
    ]);
  });

  test("every current ware exposes its canonical one-copy effect", () => {
    const equipment: EquipmentSlots = [
      "tempered_edge",
      "fleetstep_greaves",
      "runebound_focus",
      "quickening_sigil",
      "gateward_plate",
      null,
    ];

    expect(summarizeEquipment(equipment).map(({ totalEffectLabel }) => totalEffectLabel)).toEqual([
      "+20% Basic Damage",
      "+10% Move Speed",
      "+15% Skill Power",
      "+15% Cooldown Speed",
      "+15 Max Health",
    ]);
  });

  test("six unrestricted duplicates stay readable without floating-point artifacts", () => {
    const builds: EquipmentSlots[] = [
      ["tempered_edge", "tempered_edge", "tempered_edge", "tempered_edge", "tempered_edge", "tempered_edge"],
      ["fleetstep_greaves", "fleetstep_greaves", "fleetstep_greaves", "fleetstep_greaves", "fleetstep_greaves", "fleetstep_greaves"],
      ["runebound_focus", "runebound_focus", "runebound_focus", "runebound_focus", "runebound_focus", "runebound_focus"],
      ["quickening_sigil", "quickening_sigil", "quickening_sigil", "quickening_sigil", "quickening_sigil", "quickening_sigil"],
      ["gateward_plate", "gateward_plate", "gateward_plate", "gateward_plate", "gateward_plate", "gateward_plate"],
    ];

    expect(builds.map((build) => summarizeEquipment(build)[0]?.totalEffectLabel)).toEqual([
      "+140% Basic Damage",
      "+70% Move Speed",
      "+105% Skill Power",
      "+105% Cooldown Speed",
      "+105 Max Health",
    ]);
  });

  test("dominant build identity uses copy count and first-slot tie-breaking", () => {
    expect(dominantEquipmentItem(createEmptyEquipment())).toBeNull();
    expect(dominantEquipmentItem([
      "tempered_edge",
      "runebound_focus",
      "tempered_edge",
      "fleetstep_greaves",
      null,
      null,
    ])).toBe("tempered_edge");
    expect(dominantEquipmentItem([
      "runebound_focus",
      "tempered_edge",
      "runebound_focus",
      "fleetstep_greaves",
      "quickening_sigil",
      "tempered_edge",
    ])).toBe("runebound_focus");
    expect(dominantEquipmentItem([
      "tempered_edge",
      "tempered_edge",
      "runebound_focus",
      "fleetstep_greaves",
      "quickening_sigil",
      "tempered_edge",
    ])).toBe("tempered_edge");
  });
});
