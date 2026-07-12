import { describe, expect, test } from "bun:test";
import { transitionAdministrativeSurface } from "../src/client/administrative-surfaces";

describe("administrative surface exclusivity", () => {
  test("C to M to B and the reverse order always leave exactly one surface open", () => {
    let state = { stats: false, mastery: false, shop: false, arsenal: false };
    for (const surface of ["stats", "mastery", "shop"] as const) {
      state = transitionAdministrativeSurface(state, surface, true);
      expect(state).toEqual({ stats: surface === "stats", mastery: surface === "mastery", shop: surface === "shop", arsenal: false });
    }
    for (const surface of ["shop", "mastery", "stats"] as const) {
      state = transitionAdministrativeSurface(state, surface, true);
      expect(Object.values(state).filter(Boolean)).toHaveLength(1);
      expect(state[surface]).toBe(true);
    }
    state = transitionAdministrativeSurface(state, "arsenal", true);
    expect(state).toEqual({ stats: false, mastery: false, shop: false, arsenal: true });
    expect(transitionAdministrativeSurface(state, "arsenal", false)).toEqual({ stats: false, mastery: false, shop: false, arsenal: false });
  });
});
