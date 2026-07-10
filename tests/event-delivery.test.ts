import { describe, expect, test } from "bun:test";
import { itemPurchaseDeliveryPolicy } from "../src/client/event-delivery";
import type { GameEvent } from "../src/shared/protocol";

const ordinaryPurchase: GameEvent = {
  id: "ordinary",
  kind: "item_purchased",
  text: "Warden bought Tempered Edge.",
  at: 1,
  playerId: "local",
  itemId: "tempered_edge",
};

const attunementPurchase: GameEvent = {
  ...ordinaryPurchase,
  id: "attunement",
  attunementTransition: {
    itemId: "tempered_edge",
    change: "gained",
    fromCount: 3,
    toCount: 4,
  },
};

describe("item-purchase delivery policy", () => {
  test("a replayed local Attunement still acknowledges the purchase without replaying feedback", () => {
    expect(itemPurchaseDeliveryPolicy(attunementPurchase, "local", false)).toEqual({
      acknowledgeLocalPurchase: true,
      playAttunementTransient: false,
      playLocalPurchaseFeedback: false,
      playWareReceiptTransient: false,
    });
  });

  test("a direct local Attunement acknowledges once and plays its ceremony", () => {
    expect(itemPurchaseDeliveryPolicy(attunementPurchase, "local", true)).toEqual({
      acknowledgeLocalPurchase: true,
      playAttunementTransient: true,
      playLocalPurchaseFeedback: true,
      playWareReceiptTransient: false,
    });
  });

  test("a direct ally Attunement plays only the reduced world ceremony", () => {
    expect(itemPurchaseDeliveryPolicy(attunementPurchase, "ally", true)).toEqual({
      acknowledgeLocalPurchase: false,
      playAttunementTransient: true,
      playLocalPurchaseFeedback: false,
      playWareReceiptTransient: false,
    });
  });

  test("a replayed ally Attunement remains silent", () => {
    expect(itemPurchaseDeliveryPolicy(attunementPurchase, "ally", false)).toEqual({
      acknowledgeLocalPurchase: false,
      playAttunementTransient: false,
      playLocalPurchaseFeedback: false,
      playWareReceiptTransient: false,
    });
  });

  test("an ordinary local purchase keeps its established snapshot acknowledgement", () => {
    expect(itemPurchaseDeliveryPolicy(ordinaryPurchase, "local", false)).toEqual({
      acknowledgeLocalPurchase: true,
      playAttunementTransient: false,
      playLocalPurchaseFeedback: true,
      playWareReceiptTransient: false,
    });
  });

  test("a direct ordinary local purchase adds one non-replayable ware receipt", () => {
    expect(itemPurchaseDeliveryPolicy(ordinaryPurchase, "local", true)).toEqual({
      acknowledgeLocalPurchase: true,
      playAttunementTransient: false,
      playLocalPurchaseFeedback: true,
      playWareReceiptTransient: true,
    });
  });

  test("an ally ordinary purchase never adds local UI or a world receipt", () => {
    expect(itemPurchaseDeliveryPolicy(ordinaryPurchase, "ally", true)).toEqual({
      acknowledgeLocalPurchase: false,
      playAttunementTransient: false,
      playLocalPurchaseFeedback: false,
      playWareReceiptTransient: false,
    });
  });
});
