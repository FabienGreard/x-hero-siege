import { describe, expect, test } from "bun:test";
import { createEmptyEquipment, summarizeEquipment } from "../src/shared/armory-data";
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
      { itemId: "runebound_focus", count: 3, totalEffectLabel: "+45% Skill Power" },
      { itemId: "tempered_edge", count: 2, totalEffectLabel: "+40% Basic Damage" },
      { itemId: "quickening_sigil", count: 1, totalEffectLabel: "+15% Cooldown Speed" },
    ]);
  });

  test("every current ware exposes its canonical one-copy effect", () => {
    const equipment: EquipmentSlots = [
      "tempered_edge",
      "fleetstep_greaves",
      "runebound_focus",
      "quickening_sigil",
      null,
      null,
    ];

    expect(summarizeEquipment(equipment).map(({ totalEffectLabel }) => totalEffectLabel)).toEqual([
      "+20% Basic Damage",
      "+10% Move Speed",
      "+15% Skill Power",
      "+15% Cooldown Speed",
    ]);
  });

  test("six unrestricted duplicates stay readable without floating-point artifacts", () => {
    const builds: EquipmentSlots[] = [
      ["tempered_edge", "tempered_edge", "tempered_edge", "tempered_edge", "tempered_edge", "tempered_edge"],
      ["fleetstep_greaves", "fleetstep_greaves", "fleetstep_greaves", "fleetstep_greaves", "fleetstep_greaves", "fleetstep_greaves"],
      ["runebound_focus", "runebound_focus", "runebound_focus", "runebound_focus", "runebound_focus", "runebound_focus"],
      ["quickening_sigil", "quickening_sigil", "quickening_sigil", "quickening_sigil", "quickening_sigil", "quickening_sigil"],
    ];

    expect(builds.map((build) => summarizeEquipment(build)[0]?.totalEffectLabel)).toEqual([
      "+120% Basic Damage",
      "+60% Move Speed",
      "+90% Skill Power",
      "+90% Cooldown Speed",
    ]);
  });
});
