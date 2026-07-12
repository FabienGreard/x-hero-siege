import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import type { EquippedWeaponId } from "../shared/weapon-data";
import type { ActionSnapshot, Vec2 } from "../shared/protocol";

export const DEFENDER_PROOF_ASSET_URL = "/assets/models/proof/siegeheart-defender-proof.glb";

const RUNTIME_NODE_NAMES = new Set([
  "RIG_Defender",
  "WPN_Practice_A",
  "WPN_Greatsword_A",
]);

export interface DefenderProofAsset {
  scene: THREE.Group;
  animations: THREE.AnimationClip[];
}

export interface DefenderProofLoadMetrics {
  assetUrl: string;
  transferredBytes: number;
  fetchMs: number;
  decodeMs: number;
  readyMs: number;
}

let loadMetrics: DefenderProofLoadMetrics | null = null;

export function getDefenderProofLoadMetrics(): DefenderProofLoadMetrics | null {
  return loadMetrics ? { ...loadMetrics } : null;
}

export interface DefenderProofInstance {
  root: THREE.Group;
  setAccent(accentId: string): void;
  setWeapon(weaponId: EquippedWeaponId): void;
  update(delta: number, velocity: Vec2, facing: Vec2, action: ActionSnapshot | null, dodgeActive: boolean): void;
  debugState(): { animation: DefenderAnimationName | null; animationDuration: number | null; dodgeVisualRemaining: number };
  dispose(): void;
}

const DEFENDER_ACCENTS = [0x5f9cbb, 0x8b78b8, 0x4f9a83, 0xb19a62] as const;

export function defenderAccentColor(accentId: string): number {
  const ordinal = Number.parseInt(accentId.match(/(\d+)$/)?.[1] ?? "1", 10);
  return DEFENDER_ACCENTS[(Math.max(1, ordinal) - 1) % DEFENDER_ACCENTS.length]!;
}

export type DefenderAnimationName = "Idle" | "Run" | "Basic_Windup" | "Basic_Active" | "Basic_Recovery" | "Dodge";

export function selectDefenderAnimation(
  velocity: Vec2,
  action: ActionSnapshot | null,
  dodgeActive: boolean,
): { name: DefenderAnimationName; progress: number | null } {
  if (dodgeActive) return { name: "Dodge", progress: null };
  if (action?.phase === "windup") {
    return { name: "Basic_Windup", progress: THREE.MathUtils.clamp(1 - action.remaining / Math.max(0.001, action.duration), 0, 1) };
  }
  if (action?.phase === "active") {
    return { name: "Basic_Active", progress: THREE.MathUtils.clamp(1 - action.remaining / Math.max(0.001, action.duration), 0, 1) };
  }
  if (action?.phase === "recovery") {
    return { name: "Basic_Recovery", progress: THREE.MathUtils.clamp(1 - action.remaining / Math.max(0.001, action.duration), 0, 1) };
  }
  return Math.hypot(velocity.x, velocity.z) > 0.1
    ? { name: "Run", progress: null }
    : { name: "Idle", progress: null };
}

export function advanceDodgeVisualLatch(input: {
  remaining: number;
  wasAuthoritativeDodge: boolean;
  authoritativeDodge: boolean;
  clipDuration: number;
  delta: number;
  actionActive: boolean;
}): { remaining: number; wasAuthoritativeDodge: boolean } {
  const edge = input.authoritativeDodge && !input.wasAuthoritativeDodge;
  const started = edge ? input.clipDuration : input.remaining;
  return {
    remaining: input.actionActive ? 0 : Math.max(0, started - input.delta),
    wasAuthoritativeDodge: input.authoritativeDodge,
  };
}

export function createDefenderProofAssetCache(
  loader: () => Promise<DefenderProofAsset>,
): { load(): Promise<DefenderProofAsset> } {
  let cached: Promise<DefenderProofAsset> | null = null;
  return {
    load(): Promise<DefenderProofAsset> {
      cached ??= loader();
      return cached;
    },
  };
}

function configureSharedProofResources(scene: THREE.Group): void {
  const configuredTextures = new Set<THREE.Texture>();
  scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.castShadow = false;
    object.receiveShadow = false;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      if (!(material instanceof THREE.MeshStandardMaterial) || !material.map || configuredTextures.has(material.map)) continue;
      configuredTextures.add(material.map);
      material.map.magFilter = THREE.NearestFilter;
      material.map.minFilter = THREE.NearestFilter;
      material.map.generateMipmaps = false;
      material.map.colorSpace = THREE.SRGBColorSpace;
      material.map.needsUpdate = true;
      material.roughness = THREE.MathUtils.clamp(material.roughness, 0.68, 0.78);
      configureAccentShader(material, false);
    }
  });
}

function configureAccentShader(material: THREE.MeshStandardMaterial, enabled: boolean): void {
  delete material.userData.defenderAccentUniforms;
  material.userData.defenderAccentEnabled = enabled;
  material.userData.defenderAccentColor ??= defenderAccentColor("defender-1");
  material.onBeforeCompile = (shader) => {
    shader.uniforms.defenderAccent = { value: new THREE.Color(material.userData.defenderAccentColor as number) };
    shader.uniforms.defenderAccentEnabled = { value: material.userData.defenderAccentEnabled ? 1 : 0 };
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <map_fragment>",
      `#include <map_fragment>
      if (defenderAccentEnabled > 0.5) {
        diffuseColor.rgb = min(diffuseColor.rgb + vec3(0.028, 0.034, 0.04), vec3(1.0));
      }
      if (defenderAccentEnabled > 0.5 && vMapUv.y >= 0.25 && vMapUv.y < 0.5 && vMapUv.x < 0.75) {
        float authoredValue = max(max(diffuseColor.r, diffuseColor.g), diffuseColor.b);
        diffuseColor.rgb = mix(diffuseColor.rgb, defenderAccent * (0.42 + authoredValue * 1.35), 0.72);
      }`,
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      "void main() {",
      "uniform vec3 defenderAccent;\nuniform float defenderAccentEnabled;\nvoid main() {",
    );
    material.userData.defenderAccentUniforms = shader.uniforms;
  };
  material.customProgramCacheKey = () => "siegeheart-defender-cloth-accent-v1";
}

async function fetchDefenderProof(): Promise<DefenderProofAsset> {
  const startedAt = performance.now();
  const response = await fetch(DEFENDER_PROOF_ASSET_URL, { cache: "force-cache" });
  if (!response.ok) throw new Error(`Defender proof asset failed with ${response.status}.`);
  const bytes = await response.arrayBuffer();
  const fetchedAt = performance.now();
  const basePath = new URL(".", new URL(DEFENDER_PROOF_ASSET_URL, window.location.href)).href;
  const gltf = await new Promise<GLTF>((resolve, reject) => {
    new GLTFLoader().parse(bytes, basePath, resolve, reject);
  });
  configureSharedProofResources(gltf.scene);
  const readyAt = performance.now();
  loadMetrics = {
    assetUrl: DEFENDER_PROOF_ASSET_URL,
    transferredBytes: bytes.byteLength,
    fetchMs: fetchedAt - startedAt,
    decodeMs: readyAt - fetchedAt,
    readyMs: readyAt - startedAt,
  };
  return { scene: gltf.scene, animations: gltf.animations };
}

const defenderProofCache = createDefenderProofAssetCache(fetchDefenderProof);

export function loadDefenderProof(): Promise<DefenderProofAsset> {
  return defenderProofCache.load();
}

export function createDefenderProofInstance(asset: DefenderProofAsset): DefenderProofInstance {
  const root = cloneSkeleton(asset.scene) as THREE.Group;
  root.name = "runtime-defender-proof";

  for (const child of [...root.children]) {
    if (!RUNTIME_NODE_NAMES.has(child.name)) root.remove(child);
  }

  const grip = root.getObjectByName("DEF_grip_secondary");
  const practice = root.getObjectByName("WPN_Practice_A");
  const greatsword = root.getObjectByName("WPN_Greatsword_A");
  if (!grip || !practice || !greatsword) throw new Error("Defender proof is missing the grip or weapon nodes.");

  grip.add(practice, greatsword);
  practice.position.set(0, 0, 0);
  practice.rotation.set(0, 0, 0);
  practice.scale.set(1, 1, 1);
  greatsword.position.set(0, 0, 0);
  greatsword.rotation.set(0, 0, 0);
  greatsword.scale.set(1, 1, 1);
  // Fixed-camera calibration: the authored 4.66-unit body otherwise renders
  // materially smaller than the established 6.2-unit gameplay silhouette.
  // Weapon nodes remain at authored unit scale beneath this shared root.
  root.scale.setScalar(1.33);

  const accent = new THREE.Color(defenderAccentColor("defender-1"));
  const defenderBody = root.getObjectByName("CHR_Defender");
  if (!(defenderBody instanceof THREE.SkinnedMesh) || !(defenderBody.material instanceof THREE.MeshStandardMaterial)) {
    throw new Error("Defender proof is missing its single skinned body material.");
  }
  const defenderMaterial = defenderBody.material.clone();
  defenderMaterial.emissive.setHex(0x52616a);
  defenderMaterial.emissiveIntensity = 0.28;
  defenderMaterial.emissiveMap = defenderMaterial.map;
  defenderMaterial.flatShading = true;
  configureAccentShader(defenderMaterial, true);
  defenderBody.material = defenderMaterial;

  const mixer = new THREE.AnimationMixer(root);
  const actions = new Map<DefenderAnimationName, THREE.AnimationAction>();
  for (const name of ["Idle", "Run", "Basic_Windup", "Basic_Active", "Basic_Recovery", "Dodge"] as const) {
    const clip = asset.animations.find((candidate) => candidate.name === name);
    if (!clip) throw new Error(`Defender proof is missing ${name}.`);
    actions.set(name, mixer.clipAction(clip));
  }
  let activeAnimation: DefenderAnimationName | null = null;
  let dodgeVisualRemaining = 0;
  let wasAuthoritativeDodge = false;

  function activate(name: DefenderAnimationName, scrubbed: boolean): THREE.AnimationAction {
    const next = actions.get(name)!;
    if (activeAnimation !== name) {
      const previousName = activeAnimation;
      const previous = previousName ? actions.get(previousName)! : null;
      const locomotionBlend = previousName !== null &&
        (previousName === "Idle" || previousName === "Run") &&
        (name === "Idle" || name === "Run");
      if (!locomotionBlend) mixer.stopAllAction();
      next.reset();
      next.enabled = true;
      next.setEffectiveWeight(1);
      next.setLoop(name === "Dodge" ? THREE.LoopOnce : THREE.LoopRepeat, name === "Dodge" ? 1 : Infinity);
      next.clampWhenFinished = name === "Dodge";
      next.play();
      if (locomotionBlend && previous) previous.crossFadeTo(next, 0.1, false);
      activeAnimation = name;
    }
    next.paused = scrubbed;
    return next;
  }

  let disposed = false;
  return {
    root,
    setAccent(accentId): void {
      if (disposed) return;
      accent.setHex(defenderAccentColor(accentId));
      defenderMaterial.userData.defenderAccentColor = accent.getHex();
      const uniforms = defenderMaterial.userData.defenderAccentUniforms as Record<string, { value: unknown }> | undefined;
      const uniformColor = uniforms?.defenderAccent?.value;
      if (uniformColor instanceof THREE.Color) uniformColor.copy(accent);
    },
    setWeapon(weaponId): void {
      if (disposed) return;
      practice.visible = weaponId === "practice";
      greatsword.visible = weaponId === "greatsword";
    },
    update(delta, velocity, facing, action, dodgeActive): void {
      if (disposed) return;
      const direction = action?.direction ?? facing;
      const length = Math.hypot(direction.x, direction.z);
      if (length <= 0.001) return;
      root.rotation.y = Math.atan2(-direction.z / length, direction.x / length);
      const dodgeLatch = advanceDodgeVisualLatch({
        remaining: dodgeVisualRemaining,
        wasAuthoritativeDodge,
        authoritativeDodge: dodgeActive,
        clipDuration: actions.get("Dodge")!.getClip().duration,
        delta,
        actionActive: action !== null,
      });
      dodgeVisualRemaining = dodgeLatch.remaining;
      wasAuthoritativeDodge = dodgeLatch.wasAuthoritativeDodge;
      const selected = selectDefenderAnimation(velocity, action, dodgeActive || dodgeVisualRemaining > 0);
      const selectedAction = activate(selected.name, selected.progress !== null);
      if (selected.progress !== null) {
        selectedAction.time = selected.progress * selectedAction.getClip().duration;
        mixer.update(0);
      } else {
        mixer.update(delta);
      }
    },
    debugState(): { animation: DefenderAnimationName | null; animationDuration: number | null; dodgeVisualRemaining: number } {
      return {
        animation: activeAnimation,
        animationDuration: activeAnimation ? actions.get(activeAnimation)!.getClip().duration : null,
        dodgeVisualRemaining,
      };
    },
    dispose(): void {
      if (disposed) return;
      disposed = true;
      mixer.stopAllAction();
      mixer.uncacheRoot(root);
      root.removeFromParent();
      defenderMaterial.dispose();
    },
  };
}

export interface ArsenalProofLandmark {
  root: THREE.Group;
  dispose(): void;
}

export function createArsenalProofLandmark(asset: DefenderProofAsset): ArsenalProofLandmark {
  const root = new THREE.Group();
  root.name = "runtime-arsenal-proof";
  const names = ["ENV_Citadel_Wall_Straight_A", "PRP_Brazier_A", "WPN_Practice_A", "WPN_Greatsword_A"] as const;
  const clones = Object.fromEntries(names.map((name) => {
    const source = asset.scene.getObjectByName(name);
    if (!source) throw new Error(`Defender proof is missing ${name}.`);
    return [name, source.clone()];
  })) as Record<(typeof names)[number], THREE.Object3D>;

  clones.ENV_Citadel_Wall_Straight_A.position.set(-4.5, 0, 0);
  clones.WPN_Practice_A.position.set(-2.2, 1.25, 0.35);
  clones.WPN_Greatsword_A.position.set(-2.2, 2.05, 0.35);
  clones.PRP_Brazier_A.position.set(2.8, 0, 1.7);
  const warmCue = new THREE.PointLight(0xe9a45d, 0.72, 10, 2);
  warmCue.position.set(2.8, 2.1, 1.7);
  root.add(...names.map((name) => clones[name]), warmCue);
  return {
    root,
    dispose(): void {
      root.removeFromParent();
    },
  };
}

export function createProceduralArsenalFallback(): ArsenalProofLandmark {
  const root = new THREE.Group();
  root.name = "runtime-arsenal-fallback";
  const stone = new THREE.MeshLambertMaterial({ color: 0x273037, flatShading: true });
  const iron = new THREE.MeshLambertMaterial({ color: 0x111820, flatShading: true });
  const wall = new THREE.Mesh(new THREE.BoxGeometry(8, 2.8, 0.8), stone);
  wall.position.set(0, 1.4, 0);
  const rack = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.18, 0.25), iron);
  rack.position.set(0, 1.45, 0.55);
  const brazier = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 1.1, 6), iron);
  brazier.position.set(3.2, 0.55, 1.7);
  const warmCue = new THREE.PointLight(0xe9a45d, 0.58, 8, 2);
  warmCue.position.set(3.2, 2, 1.7);
  root.add(wall, rack, brazier, warmCue);
  return {
    root,
    dispose(): void {
      root.removeFromParent();
      wall.geometry.dispose();
      rack.geometry.dispose();
      brazier.geometry.dispose();
      stone.dispose();
      iron.dispose();
    },
  };
}
