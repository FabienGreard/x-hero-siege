import { describe, expect, test } from "bun:test";
import { deriveShopReplacementOffer } from "../src/client/shop-replacement-offer";
import {
  ARMORY_REFORGE_NET_COST,
  ARMORY_SELL_VALUE,
  ITEM_DEFINITIONS,
} from "../src/shared/armory-data";
import type { EquipmentSlots, ItemId } from "../src/shared/protocol";

const ITEM_IDS = [
  "tempered_edge",
  "fleetstep_greaves",
  "runebound_focus",
  "quickening_sigil",
] as const satisfies readonly ItemId[];

const OTHER_ITEM: Record<ItemId, ItemId> = {
  tempered_edge: "fleetstep_greaves",
  fleetstep_greaves: "tempered_edge",
  runebound_focus: "quickening_sigil",
  quickening_sigil: "runebound_focus",
};

describe("full-build shop replacement offers", () => {
  test("an open socket remains the established ordinary purchase path", () => {
    expect(deriveShopReplacementOffer([
      "tempered_edge",
      null,
      null,
      null,
      null,
      null,
    ], "tempered_edge")).toEqual({
      state: "open-slot",
      legalSlotIndices: [],
      statusLabel: null,
      actionLabel: null,
    });
  });

  test("all four six-duplicate builds truthfully expose no same-ware trade", () => {
    for (const itemId of ITEM_IDS) {
      const equipment = Array.from({ length: 6 }, () => itemId) as EquipmentSlots;
      expect(deriveShopReplacementOffer(equipment, itemId)).toEqual({
        state: "full-stack",
        legalSlotIndices: [],
        statusLabel: "FULL STACK",
        actionLabel: `No change: ${ITEM_DEFINITIONS[itemId].name} already fills all six equipment slots. Choose another ware.`,
      });
    }
  });

  test("five matching copies preserve the one legal sixth-copy reforge target", () => {
    for (const itemId of ITEM_IDS) {
      const equipment = [itemId, itemId, itemId, itemId, itemId, OTHER_ITEM[itemId]] as EquipmentSlots;
      expect(deriveShopReplacementOffer(equipment, itemId)).toEqual({
        state: "replace",
        legalSlotIndices: [5],
        statusLabel: "REPLACE ITEM",
        actionLabel: `Select this ware, then trade in an occupied slot for ${ARMORY_SELL_VALUE} gold; the reforge costs ${ARMORY_REFORGE_NET_COST} gold net.`,
      });
    }
  });

  test("a cross-ware reforge offers every occupied slot that would actually change", () => {
    const equipment: EquipmentSlots = [
      "tempered_edge",
      "tempered_edge",
      "fleetstep_greaves",
      "runebound_focus",
      "quickening_sigil",
      "tempered_edge",
    ];
    expect(deriveShopReplacementOffer(equipment, "tempered_edge").legalSlotIndices).toEqual([2, 3, 4]);
    expect(deriveShopReplacementOffer(equipment, "runebound_focus").legalSlotIndices).toEqual([0, 1, 2, 4, 5]);
  });
});
