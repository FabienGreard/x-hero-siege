import type { VendorId, Vec2 } from "../shared/protocol";

export function nearestInRangeVendorId(
  playerPosition: Vec2,
  vendors: readonly { id: VendorId; position: Vec2; interactionRadius: number }[],
): VendorId | null {
  return vendors
    .filter((vendor) => Math.hypot(playerPosition.x - vendor.position.x, playerPosition.z - vendor.position.z) <= vendor.interactionRadius)
    .sort((left, right) => {
      const leftDistance = Math.hypot(playerPosition.x - left.position.x, playerPosition.z - left.position.z);
      const rightDistance = Math.hypot(playerPosition.x - right.position.x, playerPosition.z - right.position.z);
      const delta = leftDistance - rightDistance;
      return Math.abs(delta) > 1e-9 ? delta : left.id.localeCompare(right.id);
    })[0]?.id ?? null;
}
