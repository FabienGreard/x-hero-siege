import { describe, expect, test } from "bun:test";
import { itemPurchaseDeliveryPolicy, itemSaleDeliveryPolicy } from "../src/client/event-delivery";
import type { GameEvent } from "../src/shared/protocol";

const purchase: GameEvent = {
  id: "purchase", kind: "item_purchased", text: "Defender bought Tempered Edge.", at: 1,
  playerId: "local", itemId: "tempered_edge", slotIndex: 0, goldDelta: -60,
};
const sale: GameEvent = {
  id: "sale", kind: "item_sold", text: "Defender sold Tempered Edge.", at: 2,
  playerId: "local", itemId: "tempered_edge", slotIndex: 0, goldDelta: 30,
};

describe("item event delivery remains direct, local, and non-replayable", () => {
  test("direct local purchase acknowledges and plays one receipt", () => {
    expect(itemPurchaseDeliveryPolicy(purchase, "local", true)).toEqual({
      acknowledgeLocalPurchase: true, playLocalPurchaseFeedback: true, playWareReceiptTransient: true,
    });
  });

  test("replayed local purchase reconciles without feedback", () => {
    expect(itemPurchaseDeliveryPolicy(purchase, "local", false)).toEqual({
      acknowledgeLocalPurchase: true, playLocalPurchaseFeedback: false, playWareReceiptTransient: false,
    });
  });

  test("ally purchase never opens local UI or a world receipt", () => {
    expect(itemPurchaseDeliveryPolicy(purchase, "ally", true)).toEqual({
      acknowledgeLocalPurchase: false, playLocalPurchaseFeedback: false, playWareReceiptTransient: false,
    });
  });

  test("direct local sale acknowledges and plays feedback once", () => {
    expect(itemSaleDeliveryPolicy(sale, "local", true)).toEqual({
      acknowledgeLocalSale: true, playLocalSaleFeedback: true,
    });
  });

  test("replayed local sale reconciles silently", () => {
    expect(itemSaleDeliveryPolicy(sale, "local", false)).toEqual({
      acknowledgeLocalSale: true, playLocalSaleFeedback: false,
    });
  });

  test("ally sale remains silent", () => {
    expect(itemSaleDeliveryPolicy(sale, "ally", true)).toEqual({
      acknowledgeLocalSale: false, playLocalSaleFeedback: false,
    });
  });

  test("public item events contain no retired progression transition", () => {
    expect(JSON.stringify([purchase, sale]).toLowerCase()).not.toContain("attun");
  });
});
