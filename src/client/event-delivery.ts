import type { GameEvent } from "../shared/protocol";

export interface ItemPurchaseDeliveryPolicy {
  acknowledgeLocalPurchase: boolean;
  playLocalPurchaseFeedback: boolean;
  playWareReceiptTransient: boolean;
}

export interface ItemSaleDeliveryPolicy {
  acknowledgeLocalSale: boolean;
  playLocalSaleFeedback: boolean;
}

export function itemPurchaseDeliveryPolicy(
  event: GameEvent,
  localPlayerId: string | null,
  direct: boolean,
): ItemPurchaseDeliveryPolicy {
  const local = event.playerId === localPlayerId;
  return {
    acknowledgeLocalPurchase: local,
    playLocalPurchaseFeedback: local && direct,
    playWareReceiptTransient: local && direct,
  };
}

export function itemSaleDeliveryPolicy(
  event: GameEvent,
  localPlayerId: string | null,
  direct: boolean,
): ItemSaleDeliveryPolicy {
  const local = event.playerId === localPlayerId;
  return {
    acknowledgeLocalSale: local,
    playLocalSaleFeedback: local && direct,
  };
}
