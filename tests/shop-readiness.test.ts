import { describe, expect, test } from "bun:test";
import { VENDOR_DEFINITIONS } from "../src/shared/armory-data";
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
    expect(deriveLocalShopReadiness(state, player({ gold: 29.99 }))).toMatchObject({
      ready: false,
      mode: null,
      label: "GOLD",
      vendorIds: [],
      gold: 29,
    });
    expect(deriveLocalShopReadiness(state, player({ gold: 30 }))).toMatchObject({
      ready: true,
      mode: "ware",
      label: "WARE READY",
      vendorIds: ["ironbound_forge", "veilglass_reliquary"],
      gold: 30,
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
    expect(deriveLocalShopReadiness(state, player({ gold: 30, equipment: full }))).toMatchObject({
      ready: true,
      mode: "reforge",
      label: "REFORGE READY",
    });
  });

  test("spending from sixty to thirty remains ready while spending below price clears it", () => {
    expect(deriveLocalShopReadiness(state, player({ gold: 60 })).ready).toBe(true);
    expect(deriveLocalShopReadiness(state, player({ gold: 30 })).ready).toBe(true);
    expect(deriveLocalShopReadiness(state, player({ gold: 0 })).ready).toBe(false);
  });

  test("inactive, downed, unclaimed, and disconnected heroes never receive a retreat cue", () => {
    expect(deriveLocalShopReadiness({ ...state, phase: "lobby" }, player({ gold: 30 })).ready).toBe(false);
    expect(deriveLocalShopReadiness(state, player({ gold: 30, downed: true })).ready).toBe(false);
    expect(deriveLocalShopReadiness(state, player({ gold: 30, heroId: null })).ready).toBe(false);
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
