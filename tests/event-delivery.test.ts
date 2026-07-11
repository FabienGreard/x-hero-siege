import { describe, expect, test } from "bun:test";
import { itemPurchaseDeliveryPolicy, itemSaleDeliveryPolicy } from "../src/client/event-delivery";
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

const itemSale: GameEvent = {
  id: "sale",
  kind: "item_sold",
  text: "Warden sold Tempered Edge.",
  at: 2,
  playerId: "local",
  itemId: "tempered_edge",
  slotIndex: 0,
  goldDelta: 30,
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

describe("item-sale delivery policy", () => {
  test("a direct local sale acknowledges once and plays only local sale feedback", () => {
    expect(itemSaleDeliveryPolicy(itemSale, "local", true)).toEqual({
      acknowledgeLocalSale: true,
      playAttunementTransient: false,
      playLocalSaleFeedback: true,
    });
  });

  test("a replayed local sale reconciles without replaying feedback", () => {
    expect(itemSaleDeliveryPolicy(itemSale, "local", false)).toEqual({
      acknowledgeLocalSale: true,
      playAttunementTransient: false,
      playLocalSaleFeedback: false,
    });
  });

  test("an ally sale never opens local UI or feedback", () => {
    expect(itemSaleDeliveryPolicy(itemSale, "ally", true)).toEqual({
      acknowledgeLocalSale: false,
      playAttunementTransient: false,
      playLocalSaleFeedback: false,
    });
  });

  test("an Attunement-losing sale keeps its direct world transition", () => {
    const transitionSale: GameEvent = {
      ...itemSale,
      attunementTransition: {
        itemId: "tempered_edge",
        change: "lost",
        fromCount: 4,
        toCount: 3,
      },
    };
    expect(itemSaleDeliveryPolicy(transitionSale, "ally", true)).toEqual({
      acknowledgeLocalSale: false,
      playAttunementTransient: true,
      playLocalSaleFeedback: false,
    });
    expect(itemSaleDeliveryPolicy(transitionSale, "local", false).playAttunementTransient).toBe(false);
  });
});
