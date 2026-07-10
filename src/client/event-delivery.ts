import type { GameEvent } from "../shared/protocol";

export interface ItemPurchaseDeliveryPolicy {
  acknowledgeLocalPurchase: boolean;
  playAttunementTransient: boolean;
  playLocalPurchaseFeedback: boolean;
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
  };
}
