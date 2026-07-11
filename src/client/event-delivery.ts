import type { GameEvent } from "../shared/protocol";

export interface ItemPurchaseDeliveryPolicy {
  acknowledgeLocalPurchase: boolean;
  playAttunementTransient: boolean;
  playLocalPurchaseFeedback: boolean;
  playWareReceiptTransient: boolean;
}

export interface ItemSaleDeliveryPolicy {
  acknowledgeLocalSale: boolean;
  playAttunementTransient: boolean;
  playLocalSaleFeedback: boolean;
}

export function itemPurchaseDeliveryPolicy(
  event: GameEvent,
  localPlayerId: string | null,
  direct: boolean,
): ItemPurchaseDeliveryPolicy {
  const local = event.playerId === localPlayerId;
  const transition = event.attunementTransition !== undefined;
  return {
    acknowledgeLocalPurchase: local,
    playAttunementTransient: transition && direct,
    playLocalPurchaseFeedback: local && (!transition || direct),
    playWareReceiptTransient: local && !transition && direct,
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
    playAttunementTransient: event.attunementTransition !== undefined && direct,
    playLocalSaleFeedback: local && direct,
  };
}
