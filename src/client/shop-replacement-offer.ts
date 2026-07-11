import {
  ITEM_DEFINITIONS,
  legalEquipmentReplacementSlots,
} from "../shared/armory-data";
import type { EquipmentSlotIndex, EquipmentSlots, ItemId } from "../shared/protocol";

export type ShopReplacementOfferState = "open-slot" | "replace" | "full-stack";

export interface ShopReplacementOffer {
  state: ShopReplacementOfferState;
  legalSlotIndices: EquipmentSlotIndex[];
  statusLabel: "REPLACE ITEM" | "FULL STACK" | null;
  actionLabel: string | null;
}

/** Keeps mouse, keyboard, visible status, and accessibility on one full-build answer. */
export function deriveShopReplacementOffer(
  equipment: EquipmentSlots,
  itemId: ItemId,
): ShopReplacementOffer {
  if (equipment.some((equippedItemId) => equippedItemId === null)) {
    return {
      state: "open-slot",
      legalSlotIndices: [],
      statusLabel: null,
      actionLabel: null,
    };
  }

  const legalSlotIndices = legalEquipmentReplacementSlots(equipment, itemId);
  if (legalSlotIndices.length > 0) {
    return {
      state: "replace",
      legalSlotIndices,
      statusLabel: "REPLACE ITEM",
      actionLabel: "Select this ware, then choose an occupied equipment slot to replace.",
    };
  }

  return {
    state: "full-stack",
    legalSlotIndices,
    statusLabel: "FULL STACK",
    actionLabel: `No change: ${ITEM_DEFINITIONS[itemId].name} already fills all six equipment slots. Choose another ware.`,
  };
}
