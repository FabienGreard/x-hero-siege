import { describe, expect, test } from "bun:test";
import * as THREE from "three";
import {
  createArsenalProofLandmark,
  createDefenderProofAssetCache,
  createDefenderProofInstance,
  createProceduralArsenalFallback,
  advanceDodgeVisualLatch,
  defenderAccentColor,
  selectDefenderAnimation,
  type DefenderProofAsset,
} from "../src/client/defender-proof";

function proofAsset(): DefenderProofAsset {
  const scene = new THREE.Group();
  const rig = new THREE.Group();
  rig.name = "RIG_Defender";
  const rootBone = new THREE.Bone();
  rootBone.name = "DEF_root";
  const grip = new THREE.Bone();
  grip.name = "DEF_grip_secondary";
  rootBone.add(grip);
  const material = new THREE.MeshStandardMaterial();
  const defender = new THREE.SkinnedMesh(new THREE.BoxGeometry(), material);
  defender.name = "CHR_Defender";
  defender.add(rootBone);
  defender.bind(new THREE.Skeleton([rootBone, grip]));
  rig.add(defender);

  const practice = new THREE.Mesh(new THREE.BoxGeometry(), material);
  practice.name = "WPN_Practice_A";
  const greatsword = new THREE.Mesh(new THREE.BoxGeometry(), material);
  greatsword.name = "WPN_Greatsword_A";
  const environment = new THREE.Mesh(new THREE.BoxGeometry(), material);
  environment.name = "ENV_Citadel_Wall_Straight_A";
  const brazier = new THREE.Mesh(new THREE.BoxGeometry(), material);
  brazier.name = "PRP_Brazier_A";
  scene.add(rig, practice, greatsword, environment, brazier);
  const animations = ["Idle", "Run", "Basic_Windup", "Basic_Active", "Basic_Recovery", "Dodge"].map(
    (name) => new THREE.AnimationClip(name, 1, []),
  );
  return { scene, animations };
}

describe("Defender proof runtime seam", () => {
  test("loads one cached asset promise", async () => {
    let calls = 0;
    const asset = proofAsset();
    const cache = createDefenderProofAssetCache(async () => {
      calls += 1;
      return asset;
    });
    const [first, second] = await Promise.all([cache.load(), cache.load()]);
    expect(calls).toBe(1);
    expect(first).toBe(asset);
    expect(second).toBe(asset);
  });

  test("keeps one failed load promise so every player remains on the same fallback path", async () => {
    let calls = 0;
    const cache = createDefenderProofAssetCache(async () => {
      calls += 1;
      throw new Error("decode failed");
    });
    await expect(cache.load()).rejects.toThrow("decode failed");
    await expect(cache.load()).rejects.toThrow("decode failed");
    expect(calls).toBe(1);
  });

  test("clones skeletons and one body material per player while sharing geometry and atlas resources", () => {
    const asset = proofAsset();
    const first = createDefenderProofInstance(asset);
    const second = createDefenderProofInstance(asset);
    const templateBody = asset.scene.getObjectByName("CHR_Defender") as THREE.SkinnedMesh;
    const firstBody = first.root.getObjectByName("CHR_Defender") as THREE.SkinnedMesh;
    const secondBody = second.root.getObjectByName("CHR_Defender") as THREE.SkinnedMesh;

    expect(firstBody.skeleton).not.toBe(templateBody.skeleton);
    expect(secondBody.skeleton).not.toBe(firstBody.skeleton);
    expect(firstBody.geometry).toBe(templateBody.geometry);
    expect(firstBody.material).not.toBe(templateBody.material);
    expect(secondBody.material).not.toBe(firstBody.material);
    expect((firstBody.material as THREE.MeshStandardMaterial).map).toBe((templateBody.material as THREE.MeshStandardMaterial).map);
    expect((firstBody.material as THREE.MeshStandardMaterial).userData.defenderAccentUniforms).toBeUndefined();
    expect(first.root.getObjectByName("ENV_Citadel_Wall_Straight_A")).toBeUndefined();

    first.setWeapon("practice");
    expect(first.root.getObjectByName("WPN_Practice_A")?.visible).toBe(true);
    expect(first.root.getObjectByName("WPN_Greatsword_A")?.visible).toBe(false);
    first.setWeapon("greatsword");
    expect(first.root.getObjectByName("WPN_Practice_A")?.visible).toBe(false);
    expect(first.root.getObjectByName("WPN_Greatsword_A")?.visible).toBe(true);
    expect(first.root.getObjectByName("WPN_Practice_A")?.scale.toArray()).toEqual([1, 1, 1]);
    expect(first.root.getObjectByName("WPN_Greatsword_A")?.scale.toArray()).toEqual([1, 1, 1]);

    const parent = new THREE.Group();
    parent.add(first.root);
    first.dispose();
    expect(first.root.parent).toBeNull();
    first.dispose();
  });

  test("maps movement, every authoritative basic phase, and dodge onto the six authored clips", () => {
    const action = (phase: "windup" | "active" | "recovery") => ({
      kind: "basic" as const,
      phase,
      remaining: 0.25,
      duration: 0.5,
      direction: { x: 1, z: 0 },
    });
    expect(selectDefenderAnimation({ x: 0, z: 0 }, null, false)).toEqual({ name: "Idle", progress: null });
    expect(selectDefenderAnimation({ x: 1, z: 0 }, null, false)).toEqual({ name: "Run", progress: null });
    expect(selectDefenderAnimation({ x: 0, z: 0 }, action("windup"), false)).toEqual({ name: "Basic_Windup", progress: 0.5 });
    expect(selectDefenderAnimation({ x: 0, z: 0 }, action("active"), false)).toEqual({ name: "Basic_Active", progress: 0.5 });
    expect(selectDefenderAnimation({ x: 0, z: 0 }, action("recovery"), false)).toEqual({ name: "Basic_Recovery", progress: 0.5 });
    expect(selectDefenderAnimation({ x: 1, z: 0 }, action("active"), true)).toEqual({ name: "Dodge", progress: null });
  });

  test("latches visual dodge recovery without extending authority and yields to a new action", () => {
    let state = { remaining: 0, wasAuthoritativeDodge: false };
    state = advanceDodgeVisualLatch({ ...state, authoritativeDodge: true, clipDuration: 0.6, delta: 0.05, actionActive: false });
    expect(state.remaining).toBeCloseTo(0.55);
    state = advanceDodgeVisualLatch({ ...state, authoritativeDodge: false, clipDuration: 0.6, delta: 0.18, actionActive: false });
    expect(state.remaining).toBeCloseTo(0.37);
    state = advanceDodgeVisualLatch({ ...state, authoritativeDodge: false, clipDuration: 0.6, delta: 0.05, actionActive: true });
    expect(state.remaining).toBe(0);
  });

  test("reports authored animation duration for rendered transition evidence", () => {
    const instance = createDefenderProofInstance(proofAsset());
    instance.update(0.01, { x: 0, z: 0 }, { x: 1, z: 0 }, null, true);
    expect(instance.debugState()).toMatchObject({ animation: "Dodge", animationDuration: 1, dodgeVisualRemaining: 0.99 });
    instance.dispose();
  });

  test("uses four restrained non-danger accent colors", () => {
    const colors = [1, 2, 3, 4].map((index) => defenderAccentColor(`defender-${index}`));
    expect(new Set(colors).size).toBe(4);
    for (const color of colors) {
      const red = (color >> 16) & 0xff;
      const green = (color >> 8) & 0xff;
      expect(red > green * 1.35).toBe(false);
    }
  });

  test("replaces and disposes one static Arsenal landmark without cloning proof resources", () => {
    const asset = proofAsset();
    const landmark = createArsenalProofLandmark(asset);
    expect(landmark.root.getObjectByName("ENV_Citadel_Wall_Straight_A")).toBeDefined();
    expect(landmark.root.getObjectByName("WPN_Greatsword_A")).toBeDefined();
    const parent = new THREE.Group();
    parent.add(landmark.root);
    landmark.dispose();
    expect(landmark.root.parent).toBeNull();

    const fallback = createProceduralArsenalFallback();
    parent.add(fallback.root);
    fallback.dispose();
    expect(fallback.root.parent).toBeNull();
  });
});
