import { describe, expect, test } from "bun:test";
import { nearestInRangeVendorId } from "../src/client/vendor-routing";
import { VENDOR_DEFINITIONS } from "../src/shared/armory-data";

const vendors = Object.values(VENDOR_DEFINITIONS);

describe("physical vendor keyboard routing", () => {
  test("arming spawn routes B to the actual Citadel Arsenal snapshot candidate", () => {
    expect(nearestInRangeVendorId({ x: 0, z: 10 }, vendors)).toBe("citadel_arsenal");
  });

  test("routes to the nearest in-range shop, rejects remote B, and breaks exact ties by stable vendor ID", () => {
    expect(nearestInRangeVendorId(VENDOR_DEFINITIONS.ironbound_forge.position, vendors)).toBe("ironbound_forge");
    expect(nearestInRangeVendorId({ x: 90, z: 90 }, vendors)).toBeNull();
    expect(nearestInRangeVendorId({ x: 0, z: 0 }, [
      { id: "veilglass_reliquary", position: { x: 1, z: 0 }, interactionRadius: 2 },
      { id: "ironbound_forge", position: { x: -1, z: 0 }, interactionRadius: 2 },
    ])).toBe("ironbound_forge");
  });
});
