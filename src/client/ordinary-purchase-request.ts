import type {
  EquipmentSlotIndex,
  EquipmentSlots,
  ItemId,
} from "../shared/protocol";

export interface OrdinaryPurchaseRequest {
  itemId: ItemId;
  slotIndex: EquipmentSlotIndex;
}

const ORDINARY_PURCHASE_ERROR_CODES = new Set([
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
]);

export function beginOrdinaryPurchaseRequest(
  current: OrdinaryPurchaseRequest | null,
  next: OrdinaryPurchaseRequest,
): { request: OrdinaryPurchaseRequest; shouldSend: boolean } {
  if (current) return { request: current, shouldSend: false };
  return { request: next, shouldSend: true };
}

export function reconcileOrdinaryPurchaseRequest(
  request: OrdinaryPurchaseRequest | null,
  equipment: EquipmentSlots,
  active: boolean,
): OrdinaryPurchaseRequest | null {
  if (!request || !active || equipment[request.slotIndex] !== null) return null;
  return request;
}

export function ordinaryPurchaseRequestAfterError(
  request: OrdinaryPurchaseRequest | null,
  errorCode: string,
): OrdinaryPurchaseRequest | null {
  if (request && ORDINARY_PURCHASE_ERROR_CODES.has(errorCode)) return null;
  return request;
}
