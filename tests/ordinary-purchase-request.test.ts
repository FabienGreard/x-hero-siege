import { describe, expect, test } from "bun:test";
import {
  beginOrdinaryPurchaseRequest,
  ordinaryPurchaseRequestAfterError,
  reconcileOrdinaryPurchaseRequest,
  type OrdinaryPurchaseRequest,
} from "../src/client/ordinary-purchase-request";
import type { EquipmentSlots } from "../src/shared/protocol";

const empty: EquipmentSlots = [null, null, null, null, null, null];
const first: OrdinaryPurchaseRequest = { itemId: "runebound_focus", slotIndex: 0 };
const second: OrdinaryPurchaseRequest = { itemId: "quickening_sigil", slotIndex: 0 };

describe("ordinary purchase request lifecycle", () => {
  test("one displayed projection can begin only one request", () => {
    const begun = beginOrdinaryPurchaseRequest(null, first);
    expect(begun).toEqual({ request: first, shouldSend: true });
    expect(beginOrdinaryPurchaseRequest(begun.request, second)).toEqual({
      request: first,
      shouldSend: false,
    });
  });

  test("stale snapshots and unrelated errors retain the lock", () => {
    expect(reconcileOrdinaryPurchaseRequest(first, empty, true)).toBe(first);
    expect(ordinaryPurchaseRequestAfterError(first, "COOLDOWN")).toBe(first);
  });

  test("the authoritative target-slot fill or inactive run clears the lock", () => {
    const filled: EquipmentSlots = ["runebound_focus", null, null, null, null, null];
    expect(reconcileOrdinaryPurchaseRequest(first, filled, true)).toBeNull();
    expect(reconcileOrdinaryPurchaseRequest(first, empty, false)).toBeNull();
  });

  test("every ordinary purchase rejection clears the lock for a retry", () => {
    for (const code of [
      "PLAYER_UNKNOWN",
      "RUN_INACTIVE",
      "PLAYER_DOWNED",
      "VENDOR_UNKNOWN",
      "ITEM_UNKNOWN",
      "ITEM_NOT_STOCKED",
      "OUT_OF_RANGE",
      "INSUFFICIENT_GOLD",
      "EQUIPMENT_FULL",
      "EQUIPMENT_CHANGED",
    ]) {
      expect(ordinaryPurchaseRequestAfterError(first, code)).toBeNull();
    }
  });
});
