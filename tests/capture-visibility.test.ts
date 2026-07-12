import { describe, expect, test } from "bun:test";
import * as THREE from "three";
import {
  reconcileSilhouetteVisibility,
  restoreSilhouetteVisibility,
} from "../src/client/capture-visibility";

describe("capture-only silhouette visibility", () => {
  test("isolates and restores scene and world children added after capture begins", () => {
    const scene = new THREE.Scene();
    const world = new THREE.Group();
    const overlay = new THREE.Group();
    const localVisual = new THREE.Group();
    const remoteVisual = new THREE.Group();
    scene.add(world, overlay);
    world.add(localVisual, remoteVisual);
    const visibility = new Map<THREE.Object3D, boolean>();

    reconcileSilhouetteVisibility({ scene, world, localVisual, visibility });
    expect(world.visible).toBe(true);
    expect(overlay.visible).toBe(false);
    expect(localVisual.visible).toBe(true);
    expect(remoteVisual.visible).toBe(false);

    const lateEffect = new THREE.Group();
    const lateHiddenEffect = new THREE.Group();
    lateHiddenEffect.visible = false;
    const lateOverlay = new THREE.Group();
    world.add(lateEffect, lateHiddenEffect);
    scene.add(lateOverlay);

    reconcileSilhouetteVisibility({ scene, world, localVisual, visibility });
    expect(lateEffect.visible).toBe(false);
    expect(lateHiddenEffect.visible).toBe(false);
    expect(lateOverlay.visible).toBe(false);

    restoreSilhouetteVisibility(visibility);
    expect(overlay.visible).toBe(true);
    expect(remoteVisual.visible).toBe(true);
    expect(lateEffect.visible).toBe(true);
    expect(lateHiddenEffect.visible).toBe(false);
    expect(lateOverlay.visible).toBe(true);
  });
});
