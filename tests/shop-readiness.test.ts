import { describe, expect, test } from "bun:test";
import {
  ARMORY_REFORGE_NET_COST,
  ARMORY_WARE_PRICE,
  VENDOR_DEFINITIONS,
} from "../src/shared/armory-data";
import {
  deriveLocalShopReadiness,
  type ShopReadinessPlayer,
  type ShopReadinessState,
} from "../src/client/shop-readiness";
import type { EquipmentSlots, VendorId } from "../src/shared/protocol";

const empty: EquipmentSlots = [null, null, null, null, null, null];
const full: EquipmentSlots = [
  "tempered_edge",
  "fleetstep_greaves",
  "runebound_focus",
  "quickening_sigil",
  "tempered_edge",
  "runebound_focus",
];
const state: ShopReadinessState = {
  phase: "defense",
  vendors: Object.values(VENDOR_DEFINITIONS),
};

function player(overrides: Partial<ShopReadinessPlayer> = {}): ShopReadinessPlayer {
  return {
    heroId: "warden",
    gold: 0,
    downed: false,
    equipment: empty,
    ...overrides,
  };
}

describe("local shop readiness", () => {
  test("the canonical affordability edge is exact", () => {
    expect(deriveLocalShopReadiness(state, player({ gold: ARMORY_WARE_PRICE - 0.01 }))).toMatchObject({
      ready: false,
      mode: null,
      label: "GOLD",
      vendorIds: [],
      gold: 59,
    });
    expect(deriveLocalShopReadiness(state, player({ gold: ARMORY_WARE_PRICE }))).toMatchObject({
      ready: true,
      mode: "ware",
      label: "WARE READY",
      vendorIds: ["ironbound_forge", "veilglass_reliquary"],
      gold: ARMORY_WARE_PRICE,
    });
  });

  test("readiness follows the actual stock and names only funded local destinations", () => {
    const oneVendorState: ShopReadinessState = {
      ...state,
      vendors: state.vendors.filter((vendor) => vendor.id === "veilglass_reliquary"),
    };
    const readiness = deriveLocalShopReadiness(oneVendorState, player({ gold: 60 }));
    expect(readiness.vendorIds).toEqual(["veilglass_reliquary"] satisfies VendorId[]);
    expect(readiness.ariaLabel).toBe("60 gold. A local ware is funded at Veilglass Reliquary; travel to a shop to trade.");
  });

  test("a full six-slot build truthfully changes the funded action to reforge", () => {
    expect(deriveLocalShopReadiness(state, player({ gold: ARMORY_REFORGE_NET_COST - 0.01, equipment: full }))).toMatchObject({
      ready: false,
      mode: null,
      label: "GOLD",
    });
    expect(deriveLocalShopReadiness(state, player({ gold: ARMORY_REFORGE_NET_COST, equipment: full }))).toMatchObject({
      ready: true,
      mode: "reforge",
      label: "REFORGE READY",
    });

    const allEdges = Array.from({ length: 6 }, () => "tempered_edge" as const) as EquipmentSlots;
    const edgeOnlyState: ShopReadinessState = {
      phase: "defense",
      vendors: [{ id: "ironbound_forge", name: "Ironbound Forge", itemIds: ["tempered_edge"] }],
    };
    expect(deriveLocalShopReadiness(edgeOnlyState, player({ gold: ARMORY_REFORGE_NET_COST, equipment: allEdges }))).toMatchObject({
      ready: false,
      mode: null,
      vendorIds: [],
    });
  });

  test("a partial build needs 60 while a full build needs only the 30-gold net cost", () => {
    expect(deriveLocalShopReadiness(state, player({ gold: 2 * ARMORY_WARE_PRICE })).ready).toBe(true);
    expect(deriveLocalShopReadiness(state, player({ gold: ARMORY_WARE_PRICE })).ready).toBe(true);
    expect(deriveLocalShopReadiness(state, player({ gold: ARMORY_REFORGE_NET_COST })).ready).toBe(false);
    expect(deriveLocalShopReadiness(state, player({ gold: ARMORY_REFORGE_NET_COST, equipment: full })).ready).toBe(true);
    expect(deriveLocalShopReadiness(state, player({ gold: 0 })).ready).toBe(false);
  });

  test("inactive, downed, unclaimed, and disconnected heroes never receive a retreat cue", () => {
    expect(deriveLocalShopReadiness({ ...state, phase: "lobby" }, player({ gold: ARMORY_WARE_PRICE })).ready).toBe(false);
    expect(deriveLocalShopReadiness(state, player({ gold: ARMORY_WARE_PRICE, downed: true })).ready).toBe(false);
    expect(deriveLocalShopReadiness(state, player({ gold: ARMORY_WARE_PRICE, heroId: null })).ready).toBe(false);
    expect(deriveLocalShopReadiness(state, undefined)).toEqual({
      ready: false,
      mode: null,
      label: "GOLD",
      vendorIds: [],
      gold: 0,
      ariaLabel: "0 gold.",
    });
  });
});
