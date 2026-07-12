import * as THREE from "three";

export interface SilhouetteVisibilityScope {
  scene: THREE.Scene;
  world: THREE.Object3D;
  localVisual: THREE.Object3D;
  visibility: Map<THREE.Object3D, boolean>;
}

/**
 * Keeps capture-mode silhouettes isolated when runtime snapshots add new scene
 * or world children after silhouette mode was enabled.
 */
export function reconcileSilhouetteVisibility({
  scene,
  world,
  localVisual,
  visibility,
}: SilhouetteVisibilityScope): void {
  for (const child of scene.children) {
    if (!visibility.has(child)) visibility.set(child, child.visible);
    child.visible = child === world;
  }
  for (const child of world.children) {
    if (!visibility.has(child)) visibility.set(child, child.visible);
    child.visible = child === localVisual;
  }
}

export function restoreSilhouetteVisibility(visibility: Map<THREE.Object3D, boolean>): void {
  for (const [object, visible] of visibility) object.visible = visible;
}
