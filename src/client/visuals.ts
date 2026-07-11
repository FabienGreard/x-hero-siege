import * as THREE from "three";
import type {
  ActionSnapshot,
  EffectKind,
  EnemyKind,
  HeroId,
  ItemId,
  LaneId,
  PickupKind,
  ProjectileKind,
  Vec2,
} from "../shared/protocol";
import { VENDOR_DEFINITIONS } from "../shared/armory-data";
import { HERO_DEFINITIONS, WORLD_LAYOUT } from "../shared/game-data";
import { deriveCombatStrideEcho } from "./combat-stride-visual";

export const HERO_PRESENTATION: Record<HeroId, {
  symbol: string;
  shortName: string;
  fantasy: string;
  tags: [string, string];
  color: string;
  dark: string;
}> = {
  warden: {
    symbol: "W",
    shortName: "Warden",
    fantasy: "Break the horde with armored cleaves, charges, and fortress-sized shockwaves.",
    tags: ["Frontline", "Control"],
    color: "#69a7ff",
    dark: "#172d50",
  },
  riftstalker: {
    symbol: "R",
    shortName: "Riftstalker",
    fantasy: "Outrun the siege with rapid arrows, piercing bolts, and lethal repositioning.",
    tags: ["Ranged", "Mobility"],
    color: "#b79aff",
    dark: "#30254f",
  },
  ashcaller: {
    symbol: "A",
    shortName: "Ashcaller",
    fantasy: "Turn crowded lanes into funeral pyres with meteors and spreading flame.",
    tags: ["Area damage", "Fire"],
    color: "#ff9b55",
    dark: "#522117",
  },
  gravebinder: {
    symbol: "G",
    shortName: "Gravebinder",
    fantasy: "Harvest the fallen to sustain yourself and drown the invasion in hungry souls.",
    tags: ["Sustain", "Summons"],
    color: "#79e5b7",
    dark: "#173c32",
  },
};

export const LANE_COLOR: Record<LaneId, number> = {
  north: 0x9764ff,
  east: 0xef8a4c,
  south: 0x68a6ff,
  west: 0x51ba84,
};

const textureCache = new Map<string, THREE.Texture>();
const materialCache = new Map<string, THREE.MeshLambertMaterial>();

function makeCanvasTexture(
  key: string,
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D) => void,
): THREE.CanvasTexture {
  const cached = textureCache.get(key);
  if (cached) return cached as THREE.CanvasTexture;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D is required for Siegeheart visuals.");
  context.imageSmoothingEnabled = false;
  draw(context);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  textureCache.set(key, texture);
  return texture;
}

function hex(color: number): string {
  return `#${color.toString(16).padStart(6, "0")}`;
}

function stoneMaterial(name: string, color: number): THREE.MeshLambertMaterial {
  const existing = materialCache.get(name);
  if (existing) return existing;
  const material = new THREE.MeshLambertMaterial({ color, flatShading: true });
  materialCache.set(name, material);
  return material;
}

function floorTexture(): THREE.CanvasTexture {
  const texture = makeCanvasTexture("floor", 64, 64, (ctx) => {
    ctx.fillStyle = "#182127";
    ctx.fillRect(0, 0, 64, 64);
    for (let y = 0; y < 64; y += 4) {
      for (let x = 0; x < 64; x += 4) {
        const hash = (x * 17 + y * 31 + x * y) % 19;
        ctx.fillStyle = hash < 5 ? "#202b30" : hash > 15 ? "#11191e" : "#1a2429";
        ctx.fillRect(x, y, 4, 4);
        if (hash === 3) {
          ctx.fillStyle = "#2d3c3f";
          ctx.fillRect(x + 1, y + 1, 1, 2);
        }
      }
    }
  });
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(26, 26);
  return texture;
}

function cobbleTexture(): THREE.CanvasTexture {
  const texture = makeCanvasTexture("cobble", 64, 64, (ctx) => {
    ctx.fillStyle = "#343d41";
    ctx.fillRect(0, 0, 64, 64);
    for (let y = 0; y < 64; y += 8) {
      const offset = (y / 8) % 2 === 0 ? 0 : -5;
      for (let x = offset; x < 64; x += 10) {
        const light = 54 + ((x * 7 + y * 11) % 14);
        ctx.fillStyle = `rgb(${light}, ${light + 6}, ${light + 7})`;
        ctx.fillRect(x + 1, y + 1, 8, 6);
        ctx.fillStyle = "#242b30";
        ctx.fillRect(x, y + 7, 10, 1);
        ctx.fillRect(x + 9, y, 1, 8);
      }
    }
  });
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(10, 10);
  return texture;
}

function shadowTexture(): THREE.CanvasTexture {
  return makeCanvasTexture("shadow", 32, 16, (ctx) => {
    const gradient = ctx.createRadialGradient(16, 8, 1, 16, 8, 15);
    gradient.addColorStop(0, "rgba(0,0,0,.72)");
    gradient.addColorStop(0.6, "rgba(0,0,0,.36)");
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 32, 16);
  });
}

function glowTexture(color: string): THREE.CanvasTexture {
  return makeCanvasTexture(`glow-${color}`, 32, 32, (ctx) => {
    const gradient = ctx.createRadialGradient(16, 16, 1, 16, 16, 16);
    gradient.addColorStop(0, "rgba(255,255,255,.95)");
    gradient.addColorStop(0.15, color);
    gradient.addColorStop(0.5, `${color}66`);
    gradient.addColorStop(1, `${color}00`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 32, 32);
  });
}

export const BUILD_SIGNATURE_COLORS: Record<ItemId, string> = {
  tempered_edge: "#f0c56a",
  fleetstep_greaves: "#91e8ff",
  runebound_focus: "#c6a4ff",
  quickening_sigil: "#d7f5ff",
};

function buildSignatureTexture(itemId: ItemId): THREE.CanvasTexture {
  return makeCanvasTexture(`build-signature-${itemId}`, 64, 80, (ctx) => {
    const color = BUILD_SIGNATURE_COLORS[itemId];
    const pixel = (x: number, y: number, width: number, height: number) => {
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.18;
      ctx.fillRect(x - 1, y - 1, width + 2, height + 2);
      ctx.globalAlpha = 0.9;
      ctx.fillRect(x, y, width, height);
    };

    if (itemId === "tempered_edge") {
      for (let step = 0; step < 5; step += 1) {
        pixel(5 + step * 2, 18 + step * 3, 3, 5);
        pixel(56 - step * 2, 18 + step * 3, 3, 5);
        pixel(7 + step * 2, 44 + step * 3, 3, 4);
        pixel(54 - step * 2, 44 + step * 3, 3, 4);
      }
    } else if (itemId === "fleetstep_greaves") {
      for (const centerX of [15, 49]) {
        for (const offsetY of [48, 59]) {
          pixel(centerX - 7, offsetY, 4, 3);
          pixel(centerX - 3, offsetY + 3, 4, 3);
          pixel(centerX + 1, offsetY + 6, 4, 3);
          pixel(centerX + 5, offsetY + 3, 4, 3);
        }
      }
    } else if (itemId === "runebound_focus") {
      const diamond = (centerX: number, centerY: number) => {
        pixel(centerX - 1, centerY - 6, 3, 3);
        pixel(centerX - 4, centerY - 3, 9, 3);
        pixel(centerX - 7, centerY, 15, 3);
        pixel(centerX - 4, centerY + 3, 9, 3);
        pixel(centerX - 1, centerY + 6, 3, 3);
      };
      diamond(9, 28);
      diamond(55, 28);
      diamond(32, 10);
    } else {
      for (const [x, y, width, height] of [
        [19, 13, 9, 3], [36, 13, 9, 3],
        [19, 65, 9, 3], [36, 65, 9, 3],
        [5, 28, 3, 9], [5, 44, 3, 9],
        [56, 28, 3, 9], [56, 44, 3, 9],
        [10, 19, 5, 3], [49, 19, 5, 3],
        [10, 59, 5, 3], [49, 59, 5, 3],
      ] as const) pixel(x, y, width, height);
    }
    ctx.globalAlpha = 1;
  });
}

function createBuildSignature(renderOrder = 10, opacity = 0.76): THREE.Sprite {
  const signature = new THREE.Sprite(new THREE.SpriteMaterial({
    transparent: true,
    depthWrite: false,
    opacity,
  }));
  signature.renderOrder = renderOrder;
  signature.visible = false;
  return signature;
}

function drawHero(ctx: CanvasRenderingContext2D, heroId: HeroId): void {
  const definition = HERO_DEFINITIONS[heroId];
  const main = hex(definition.color);
  const accent = hex(definition.accent);
  ctx.clearRect(0, 0, 48, 64);

  // Ground contact pixels keep the sprite visually rooted in the 3/4 world.
  ctx.fillStyle = "rgba(0,0,0,.25)";
  ctx.fillRect(12, 57, 24, 3);
  ctx.fillRect(16, 60, 16, 2);

  if (heroId === "warden") {
    ctx.fillStyle = "#11151d";
    ctx.fillRect(9, 31, 7, 23);
    ctx.fillRect(32, 31, 7, 23);
    ctx.fillStyle = main;
    ctx.fillRect(12, 23, 24, 29);
    ctx.fillRect(8, 27, 7, 18);
    ctx.fillRect(34, 27, 7, 18);
    ctx.fillStyle = "#253448";
    ctx.fillRect(16, 11, 16, 16);
    ctx.fillRect(13, 17, 22, 8);
    ctx.fillStyle = accent;
    ctx.fillRect(18, 18, 4, 2);
    ctx.fillRect(27, 18, 4, 2);
    ctx.fillRect(17, 29, 14, 5);
    ctx.fillStyle = "#93b7d9";
    ctx.fillRect(5, 33, 4, 22);
    ctx.fillRect(3, 51, 8, 3);
    ctx.fillStyle = "#2c7fb5";
    ctx.fillRect(31, 25, 10, 4);
    ctx.fillRect(36, 28, 6, 22);
  } else if (heroId === "riftstalker") {
    ctx.fillStyle = "#11121a";
    ctx.beginPath();
    ctx.moveTo(24, 7); ctx.lineTo(35, 20); ctx.lineTo(32, 28); ctx.lineTo(16, 28); ctx.lineTo(13, 20); ctx.closePath();
    ctx.fill();
    ctx.fillStyle = main;
    ctx.fillRect(16, 21, 16, 29);
    ctx.fillRect(11, 27, 6, 18);
    ctx.fillRect(31, 25, 6, 18);
    ctx.fillStyle = accent;
    ctx.fillRect(18, 19, 4, 2);
    ctx.fillRect(27, 19, 4, 2);
    ctx.fillStyle = "#1e1a31";
    ctx.fillRect(14, 44, 8, 13);
    ctx.fillRect(27, 44, 8, 13);
    ctx.strokeStyle = "#b99a64";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(37, 32, 9, -Math.PI / 2, Math.PI / 2);
    ctx.stroke();
    ctx.fillStyle = "#d8c7ff";
    ctx.fillRect(38, 22, 2, 20);
  } else if (heroId === "ashcaller") {
    ctx.fillStyle = "#21110d";
    ctx.fillRect(16, 12, 16, 16);
    ctx.fillStyle = "#ffb43d";
    ctx.fillRect(13, 9, 5, 9);
    ctx.fillRect(30, 7, 5, 11);
    ctx.fillRect(20, 6, 4, 8);
    ctx.fillStyle = main;
    ctx.fillRect(13, 23, 23, 30);
    ctx.beginPath();
    ctx.moveTo(13, 43); ctx.lineTo(6, 58); ctx.lineTo(42, 58); ctx.lineTo(36, 43); ctx.closePath();
    ctx.fill();
    ctx.fillStyle = accent;
    ctx.fillRect(19, 18, 4, 2);
    ctx.fillRect(27, 18, 4, 2);
    ctx.fillRect(19, 30, 11, 4);
    ctx.fillStyle = "#6a351b";
    ctx.fillRect(38, 18, 3, 39);
    ctx.fillStyle = "#ffda67";
    ctx.fillRect(35, 13, 9, 9);
    ctx.fillStyle = "#fff0a1";
    ctx.fillRect(38, 16, 3, 3);
  } else {
    ctx.fillStyle = "#0c1816";
    ctx.beginPath();
    ctx.moveTo(24, 7); ctx.lineTo(35, 18); ctx.lineTo(32, 28); ctx.lineTo(16, 28); ctx.lineTo(13, 18); ctx.closePath();
    ctx.fill();
    ctx.fillStyle = main;
    ctx.fillRect(15, 22, 18, 28);
    ctx.beginPath();
    ctx.moveTo(15, 38); ctx.lineTo(7, 59); ctx.lineTo(41, 59); ctx.lineTo(33, 38); ctx.closePath();
    ctx.fill();
    ctx.fillStyle = accent;
    ctx.fillRect(18, 18, 4, 3);
    ctx.fillRect(27, 18, 4, 3);
    ctx.fillRect(21, 32, 7, 8);
    ctx.fillStyle = "#688b80";
    ctx.fillRect(37, 12, 3, 46);
    ctx.beginPath();
    ctx.moveTo(39, 12); ctx.lineTo(47, 16); ctx.lineTo(40, 19); ctx.closePath();
    ctx.fill();
  }

  ctx.fillStyle = "rgba(255,255,255,.2)";
  ctx.fillRect(15, 25, 2, 18);
}

function drawEnemy(ctx: CanvasRenderingContext2D, kind: EnemyKind, elite: boolean): void {
  ctx.clearRect(0, 0, 48, 64);
  const skin = elite ? "#d27aff" : kind === "hound" ? "#b85a43" : "#9a3d48";
  const dark = elite ? "#3a1748" : "#29131a";
  const eye = elite ? "#f9d3ff" : "#ffb55d";
  ctx.fillStyle = "rgba(0,0,0,.3)";
  ctx.fillRect(12, 57, 25, 3);

  if (kind === "hound") {
    ctx.fillStyle = dark;
    ctx.fillRect(8, 34, 31, 15);
    ctx.fillStyle = skin;
    ctx.fillRect(23, 25, 17, 17);
    ctx.fillRect(11, 29, 17, 16);
    ctx.fillRect(10, 45, 6, 12);
    ctx.fillRect(31, 45, 6, 12);
    ctx.fillStyle = eye;
    ctx.fillRect(35, 30, 3, 2);
    ctx.fillStyle = "#d9c7a5";
    ctx.fillRect(40, 39, 4, 2);
  } else if (kind === "brute" || kind === "siege" || kind === "rift_guard") {
    ctx.fillStyle = dark;
    ctx.fillRect(9, 26, 31, 28);
    ctx.fillStyle = skin;
    ctx.fillRect(14, 14, 20, 19);
    ctx.fillRect(5, 29, 12, 20);
    ctx.fillRect(32, 29, 12, 20);
    ctx.fillStyle = "#1b1e22";
    ctx.fillRect(12, 30, 25, 18);
    ctx.fillStyle = eye;
    ctx.fillRect(17, 21, 4, 3);
    ctx.fillRect(28, 21, 4, 3);
    ctx.fillStyle = "#ded0ae";
    ctx.beginPath();
    ctx.moveTo(14, 16); ctx.lineTo(7, 6); ctx.lineTo(18, 13); ctx.closePath();
    ctx.moveTo(34, 16); ctx.lineTo(41, 6); ctx.lineTo(30, 13); ctx.closePath();
    ctx.fill();
    if (kind === "siege") {
      ctx.fillStyle = "#6d4b36";
      ctx.fillRect(1, 35, 7, 25);
      ctx.fillStyle = "#b98c4f";
      ctx.fillRect(0, 31, 9, 8);
    }
    if (kind === "rift_guard") {
      ctx.strokeStyle = "#de86ff";
      ctx.lineWidth = 2;
      ctx.strokeRect(10, 12, 29, 43);
    }
  } else {
    ctx.fillStyle = dark;
    ctx.fillRect(13, 28, 23, 27);
    ctx.fillStyle = skin;
    ctx.fillRect(16, 17, 17, 17);
    ctx.fillRect(10, 31, 7, 17);
    ctx.fillRect(32, 31, 7, 17);
    ctx.fillStyle = eye;
    ctx.fillRect(18, 23, 4, 2);
    ctx.fillRect(28, 23, 4, 2);
    ctx.fillStyle = "#d7c19d";
    ctx.beginPath();
    ctx.moveTo(17, 18); ctx.lineTo(10, 10); ctx.lineTo(20, 16); ctx.closePath();
    ctx.moveTo(32, 18); ctx.lineTo(39, 10); ctx.lineTo(29, 16); ctx.closePath();
    ctx.fill();
  }

  if (elite) {
    ctx.strokeStyle = "#f0a6ff";
    ctx.lineWidth = 1;
    ctx.strokeRect(5, 8, 39, 49);
  }
}

function entityTexture(kind: "hero" | EnemyKind, variant: string, elite = false): THREE.CanvasTexture {
  return makeCanvasTexture(`entity-${kind}-${variant}-${elite}`, 48, 64, (ctx) => {
    if (kind === "hero") drawHero(ctx, variant as HeroId);
    else drawEnemy(ctx, kind, elite);
  });
}

export interface EntityVisual extends THREE.Group {
  userData: {
    entityKind: string;
    variant: HeroId | string;
    sprite: THREE.Sprite;
    silhouette: THREE.Sprite;
    shadow: THREE.Sprite;
    facingIndicator: THREE.Group;
    attackTelegraph: THREE.Group;
    buildSignature: THREE.Sprite | null;
    buildSignatureEcho: THREE.Sprite | null;
    wareReceipt: THREE.Sprite | null;
    wareReceiptStartedAt: number;
    wareReceiptUntil: number;
    buildSignatureItemId: ItemId | null;
    buildSignatureAttuned: boolean;
    buildSignatureTransitionChange: "gained" | "lost" | null;
    buildSignatureTransitionItemId: ItemId | null;
    buildSignatureTransitionStartedAt: number;
    buildSignatureTransitionUntil: number;
    flashUntil: number;
    baseScale: number;
    isLocal: boolean;
  };
}

function groundMaterial(color: number, opacity: number): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

function createFacingIndicator(hero: boolean, scale: number): THREE.Group {
  const group = new THREE.Group();
  if (!hero) {
    // Enemies communicate direction through their pose and short attack windup.
    // A persistent marker beneath every horde member makes movement less readable.
    group.visible = false;
    return group;
  }

  const color = 0x9ce8ff;
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(scale * 0.2, scale * 0.225, 16),
    groundMaterial(color, 0.56),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.075;
  ring.renderOrder = 4;

  // Two restrained corner ticks make the local hero easy to reacquire without
  // turning the marker into a permanent facing arrow.
  const tickMaterial = groundMaterial(color, 0.82);
  const tickA = new THREE.Mesh(new THREE.BoxGeometry(scale * 0.16, 0.025, scale * 0.055), tickMaterial);
  tickA.position.set(-scale * 0.22, 0.09, 0);
  tickA.renderOrder = 5;
  const tickB = tickA.clone();
  tickB.position.x = scale * 0.22;

  group.add(ring, tickA, tickB);
  group.userData.ringMaterial = ring.material;
  group.userData.lineMaterials = [tickA.material, tickB.material];
  group.visible = false;
  return group;
}

function createAttackTelegraph(kind: "hero" | EnemyKind, scale: number): THREE.Group {
  const group = new THREE.Group();
  const heavy = kind === "brute" || kind === "siege" || kind === "rift_guard";
  const length = heavy ? scale * 1.16 : kind === "hero" ? scale * 0.86 : 4.4;
  const width = heavy ? scale * 0.72 : scale * 0.48;
  const fillMaterial = groundMaterial(heavy ? 0xff513f : 0xf36a50, 0);
  const fill = new THREE.Mesh(new THREE.BoxGeometry(length, 0.02, width), fillMaterial);
  fill.position.set(scale * 0.13 + length * 0.5, 0.1, 0);
  fill.renderOrder = 6;

  const edgeMaterial = groundMaterial(0xffd07a, 0);
  const edge = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.035, width + 0.12), edgeMaterial);
  edge.position.set(scale * 0.13 + length, 0.115, 0);
  edge.renderOrder = 7;
  group.add(fill, edge);
  group.userData.fillMaterial = fillMaterial;
  group.userData.edgeMaterial = edgeMaterial;
  group.userData.heavy = heavy;
  group.visible = false;
  return group;
}

export function createEntityVisual(
  kind: "hero" | EnemyKind,
  variant: HeroId | string,
  elite = false,
): EntityVisual {
  const group = new THREE.Group() as EntityVisual;
  const texture = entityTexture(kind, variant, elite);
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, alphaTest: 0.08, depthWrite: false });
  const sprite = new THREE.Sprite(material);
  const scale = kind === "hero" ? 6.2 : kind === "hound" ? 2.9 : kind === "brute" || kind === "siege" || kind === "rift_guard" ? 7.2 : 3.35;
  sprite.scale.set(scale * 0.75, scale, 1);
  sprite.position.y = scale * 0.49;
  sprite.renderOrder = 12;

  // A slightly oversized faction-colored copy creates a coarse pixel silhouette.
  // It stays behind the real sprite, so the interior remains the existing artwork.
  const silhouette = new THREE.Sprite(new THREE.SpriteMaterial({
    map: texture,
    color: kind === "hero" ? 0x315f84 : elite ? 0x732f7e : 0x641d29,
    transparent: true,
    alphaTest: 0.08,
    opacity: kind === "hero" ? 0.92 : 0.86,
    depthWrite: false,
  }));
  silhouette.scale.set(scale * 0.82, scale * 1.085, 1);
  silhouette.position.set(0, scale * 0.49, 0.025);
  silhouette.renderOrder = 11;

  const shadow = new THREE.Sprite(new THREE.SpriteMaterial({ map: shadowTexture(), transparent: true, depthWrite: false, opacity: 0.72 }));
  shadow.scale.set(scale * 0.82, scale * 0.3, 1);
  shadow.position.set(0, 0.06, 0);
  shadow.renderOrder = 3;

  const facingIndicator = createFacingIndicator(kind === "hero", scale);
  const attackTelegraph = createAttackTelegraph(kind, scale);
  const buildSignature = kind === "hero" ? createBuildSignature() : null;
  const buildSignatureEcho = kind === "hero" ? createBuildSignature(9, 0.2) : null;
  const wareReceipt = kind === "hero" ? createBuildSignature(10, 0) : null;

  group.add(shadow, facingIndicator, attackTelegraph);
  if (buildSignatureEcho) group.add(buildSignatureEcho);
  if (wareReceipt) group.add(wareReceipt);
  if (buildSignature) group.add(buildSignature);
  group.add(silhouette, sprite);
  group.userData = {
    entityKind: kind,
    variant,
    sprite,
    silhouette,
    shadow,
    facingIndicator,
    attackTelegraph,
    buildSignature,
    buildSignatureEcho,
    wareReceipt,
    wareReceiptStartedAt: 0,
    wareReceiptUntil: 0,
    buildSignatureItemId: null,
    buildSignatureAttuned: false,
    buildSignatureTransitionChange: null,
    buildSignatureTransitionItemId: null,
    buildSignatureTransitionStartedAt: 0,
    buildSignatureTransitionUntil: 0,
    flashUntil: 0,
    baseScale: scale,
    isLocal: false,
  };
  return group;
}

/** One restrained, item-shaped receipt for an accepted local trade. */
export function pulseEntityWareReceipt(
  visual: EntityVisual,
  itemId: ItemId,
  now = performance.now(),
): void {
  const receipt = visual.userData.wareReceipt;
  if (!receipt) return;
  const material = receipt.material as THREE.SpriteMaterial;
  material.map = buildSignatureTexture(itemId);
  material.needsUpdate = true;
  receipt.visible = true;
  visual.userData.wareReceiptStartedAt = now;
  visual.userData.wareReceiptUntil = now + 760;
}

export function setEntityBuildSignature(visual: EntityVisual, itemId: ItemId | null, attuned = false): void {
  const signature = visual.userData.buildSignature;
  const echo = visual.userData.buildSignatureEcho;
  const nextAttuned = Boolean(itemId && attuned);
  if (
    !signature || !echo ||
    (visual.userData.buildSignatureItemId === itemId && visual.userData.buildSignatureAttuned === nextAttuned)
  ) return;
  const itemChanged = visual.userData.buildSignatureItemId !== itemId;
  visual.userData.buildSignatureItemId = itemId;
  visual.userData.buildSignatureAttuned = nextAttuned;
  signature.visible = itemId !== null;
  const lossTransitionActive =
    visual.userData.buildSignatureTransitionChange === "lost" &&
    performance.now() < visual.userData.buildSignatureTransitionUntil;
  echo.visible = nextAttuned || lossTransitionActive;
  if (!itemId || !itemChanged) return;
  const texture = buildSignatureTexture(itemId);
  const material = signature.material as THREE.SpriteMaterial;
  material.map = texture;
  material.needsUpdate = true;
  if (!lossTransitionActive) {
    const echoMaterial = echo.material as THREE.SpriteMaterial;
    echoMaterial.map = texture;
    echoMaterial.needsUpdate = true;
  }
}

export function pulseEntityBuildSignature(
  visual: EntityVisual,
  itemId: ItemId,
  change: "gained" | "lost",
  now = performance.now(),
): void {
  const echo = visual.userData.buildSignatureEcho;
  if (!echo) return;
  const echoMaterial = echo.material as THREE.SpriteMaterial;
  echoMaterial.map = buildSignatureTexture(itemId);
  echoMaterial.needsUpdate = true;
  echo.visible = true;
  visual.userData.buildSignatureTransitionChange = change;
  visual.userData.buildSignatureTransitionItemId = itemId;
  visual.userData.buildSignatureTransitionStartedAt = now;
  visual.userData.buildSignatureTransitionUntil = now + (change === "gained" ? 650 : 520);
}

export function setEntityFlash(visual: EntityVisual, now: number, color = 0xffffff): void {
  visual.userData.flashUntil = now + 90;
  (visual.userData.sprite.material as THREE.SpriteMaterial).color.setHex(color);
}

export function updateEntityVisual(
  visual: EntityVisual,
  now: number,
  velocity: Vec2,
  elapsed: number,
  facing: Vec2,
  action: ActionSnapshot | null,
): void {
  const sprite = visual.userData.sprite;
  const silhouette = visual.userData.silhouette;
  const indicator = visual.userData.facingIndicator;
  const telegraph = visual.userData.attackTelegraph;
  const buildSignature = visual.userData.buildSignature;
  const buildSignatureEcho = visual.userData.buildSignatureEcho;
  const wareReceipt = visual.userData.wareReceipt;
  const baseScale = visual.userData.baseScale;
  const hero = visual.userData.entityKind === "hero";
  const variant = visual.userData.variant;
  const moving = Math.hypot(velocity.x, velocity.z) > 0.1;
  if (now >= visual.userData.flashUntil) (sprite.material as THREE.SpriteMaterial).color.setHex(0xffffff);

  const actionDirection = action && Math.hypot(action.direction.x, action.direction.z) > 0.01
    ? action.direction
    : facing;
  const directionLength = Math.max(0.001, Math.hypot(actionDirection.x, actionDirection.z));
  const direction = {
    x: actionDirection.x / directionLength,
    z: actionDirection.z / directionLength,
  };
  const yaw = Math.atan2(-direction.z, direction.x);
  telegraph.rotation.y = yaw;

  // Only the local hero receives a compact, static selection cue. Enemy facing
  // remains visible through sprite motion and the attack telegraph when relevant.
  indicator.visible = hero && visual.userData.isLocal;
  if (indicator.visible) {
    const ringMaterial = indicator.userData.ringMaterial as THREE.MeshBasicMaterial;
    const lineMaterials = indicator.userData.lineMaterials as THREE.MeshBasicMaterial[];
    ringMaterial.opacity = 0.46 + Math.sin(elapsed * 3.2) * 0.08;
    for (const lineMaterial of lineMaterials) lineMaterial.opacity = 0.78;
  }

  const actionProgress = action
    ? THREE.MathUtils.clamp(1 - action.remaining / Math.max(0.001, action.duration), 0, 1)
    : 0;
  const isWindup = action?.phase === "windup";
  const isActive = action?.phase === "active";
  const isRecovery = action?.phase === "recovery";
  const facingAcrossScreen = THREE.MathUtils.clamp((direction.x - direction.z) * 0.707, -1, 1);
  const stride = moving && !isWindup ? Math.sin(elapsed * 10) : 0;
  let bounce = moving ? Math.abs(stride) * 0.15 : Math.sin(elapsed * 2.4) * 0.04;
  let scaleX = baseScale * 0.75;
  let scaleY = baseScale;
  let lean = moving ? facingAcrossScreen * 0.045 + stride * 0.018 : 0;
  let offset = 0;

  if (isWindup) {
    const anticipation = THREE.MathUtils.smoothstep(actionProgress, 0, 1);
    scaleX *= 1 + anticipation * 0.1;
    scaleY *= 1 - anticipation * (hero ? 0.12 : 0.16);
    lean -= facingAcrossScreen * anticipation * (hero ? 0.1 : 0.13);
    offset = -anticipation * baseScale * 0.065;
    bounce -= anticipation * baseScale * 0.035;
  } else if (isActive) {
    const strike = Math.sin(actionProgress * Math.PI);
    scaleX *= 1 - strike * 0.04;
    scaleY *= 1 + strike * 0.08;
    lean += facingAcrossScreen * strike * 0.13;
    offset = strike * baseScale * (action?.kind === "enemy_attack" ? 0.13 : 0.17);
  } else if (isRecovery) {
    const settle = 1 - actionProgress;
    scaleX *= 1 - Math.sin(actionProgress * Math.PI) * 0.035;
    scaleY *= 1 + Math.sin(actionProgress * Math.PI) * 0.045;
    lean += facingAcrossScreen * settle * 0.055;
    offset = settle * baseScale * 0.045;
  }

  sprite.scale.set(scaleX, scaleY, 1);
  sprite.position.set(direction.x * offset, baseScale * 0.49 + bounce, direction.z * offset);
  sprite.material.rotation = lean;
  silhouette.scale.set(scaleX * 1.09, scaleY * 1.085, 1);
  silhouette.position.set(sprite.position.x, sprite.position.y, sprite.position.z + 0.025);
  silhouette.material.rotation = lean;
  if (buildSignature?.visible) {
    const attuned = visual.userData.buildSignatureAttuned;
    const transitionChange = visual.userData.buildSignatureTransitionChange;
    const transitionActive = Boolean(
      transitionChange && now < visual.userData.buildSignatureTransitionUntil,
    );
    const transitionDuration = Math.max(
      1,
      visual.userData.buildSignatureTransitionUntil - visual.userData.buildSignatureTransitionStartedAt,
    );
    const transitionProgress = transitionActive
      ? THREE.MathUtils.clamp(
          (now - visual.userData.buildSignatureTransitionStartedAt) / transitionDuration,
          0,
          1,
        )
      : 1;
    const signatureMatchesTransition =
      visual.userData.buildSignatureItemId === visual.userData.buildSignatureTransitionItemId;
    const signaturePulse = transitionActive && transitionChange === "gained" && signatureMatchesTransition
      ? 1 + Math.sin(transitionProgress * Math.PI) * 0.1
      : 1;
    buildSignature.scale.set(
      scaleX * (attuned ? 1.43 : 1.34) * signaturePulse,
      scaleY * (attuned ? 1.27 : 1.2) * signaturePulse,
      1,
    );
    buildSignature.position.set(sprite.position.x, sprite.position.y, sprite.position.z + 0.012);
    const signatureMaterial = buildSignature.material as THREE.SpriteMaterial;
    signatureMaterial.rotation = lean;
    signatureMaterial.opacity = visual.userData.isLocal
      ? attuned ? 0.84 : 0.76
      : attuned ? 0.62 : 0.56;

    if (buildSignatureEcho) {
      const echoVisible = attuned || transitionActive;
      buildSignatureEcho.visible = echoVisible;
      if (echoVisible) {
        const breath = 1 + Math.sin(elapsed * 2.4) * 0.025;
        const gainBloom = transitionActive && transitionChange === "gained"
          ? 0.76 + (1 - Math.pow(1 - transitionProgress, 3)) * 0.24
          : 1;
        const lossCollapse = transitionActive && transitionChange === "lost"
          ? 1 - transitionProgress * 0.28
          : 1;
        const echoScale = breath * gainBloom * lossCollapse;
        buildSignatureEcho.scale.set(scaleX * 1.64 * echoScale, scaleY * 1.46 * echoScale, 1);
        const combatStrideEcho = transitionActive
          ? { offset: { x: 0, z: 0 }, opacityBoost: 0 }
          : deriveCombatStrideEcho({
              itemId: visual.userData.buildSignatureItemId,
              attuned,
              velocity,
              action,
              baseScale,
              isLocal: visual.userData.isLocal,
            });
        buildSignatureEcho.position.set(
          sprite.position.x + combatStrideEcho.offset.x,
          sprite.position.y,
          sprite.position.z + combatStrideEcho.offset.z + 0.008,
        );
        const echoMaterial = buildSignatureEcho.material as THREE.SpriteMaterial;
        echoMaterial.rotation = lean;
        const settledOpacity = visual.userData.isLocal ? 0.24 : 0.12;
        if (transitionActive && transitionChange === "gained") {
          echoMaterial.opacity = settledOpacity +
            Math.sin(transitionProgress * Math.PI) * (visual.userData.isLocal ? 0.34 : 0.15);
        } else if (transitionActive && transitionChange === "lost") {
          echoMaterial.opacity = settledOpacity * (1 - transitionProgress);
        } else {
          echoMaterial.opacity = settledOpacity + combatStrideEcho.opacityBoost;
        }
      }
    }

    if (!transitionActive && transitionChange) {
      visual.userData.buildSignatureTransitionChange = null;
      visual.userData.buildSignatureTransitionItemId = null;
      if (buildSignatureEcho && !attuned) buildSignatureEcho.visible = false;
    }
  }
  if (wareReceipt) {
    const receiptActive = now < visual.userData.wareReceiptUntil;
    wareReceipt.visible = receiptActive;
    if (receiptActive) {
      const receiptDuration = Math.max(
        1,
        visual.userData.wareReceiptUntil - visual.userData.wareReceiptStartedAt,
      );
      const receiptProgress = THREE.MathUtils.clamp(
        (now - visual.userData.wareReceiptStartedAt) / receiptDuration,
        0,
        1,
      );
      const bloom = 0.92 + Math.sin(receiptProgress * Math.PI) * 0.18;
      wareReceipt.scale.set(scaleX * 1.48 * bloom, scaleY * 1.34 * bloom, 1);
      wareReceipt.position.set(sprite.position.x, sprite.position.y, sprite.position.z + 0.01);
      const material = wareReceipt.material as THREE.SpriteMaterial;
      material.rotation = lean;
      material.opacity = Math.sin(receiptProgress * Math.PI) * 0.48;
    }
  }

  const fillMaterial = telegraph.userData.fillMaterial as THREE.MeshBasicMaterial;
  const edgeMaterial = telegraph.userData.edgeMaterial as THREE.MeshBasicMaterial;
  const showRangedLaunch = hero &&
    action?.kind === "basic" &&
    (variant === "riftstalker" || variant === "ashcaller") &&
    (isActive || (isRecovery && actionProgress < 0.42));
  const showEnemyWarning = !hero && action?.kind === "enemy_attack" && isWindup;
  telegraph.visible = showRangedLaunch || showEnemyWarning;
  if (showRangedLaunch) {
    const riftstalker = variant === "riftstalker";
    const release = isRecovery
      ? THREE.MathUtils.clamp(1 - actionProgress / 0.42, 0, 1)
      : 1;
    // Reuse the otherwise-hidden hero telegraph as one weapon-height launch
    // streak. It lasts only through impact and the opening of recovery, so the
    // projectile remains the directional read and abilities keep visual priority.
    telegraph.position.y = 0.48;
    telegraph.scale.set(riftstalker ? 0.44 : 0.38, 1, riftstalker ? 0.1 : 0.14);
    fillMaterial.color.setHex(riftstalker ? 0xb79aff : 0xff6a32);
    edgeMaterial.color.setHex(riftstalker ? 0xf3edff : 0xffd98a);
    fillMaterial.opacity = (riftstalker ? 0.38 : 0.44) * release;
    edgeMaterial.opacity = (riftstalker ? 0.85 : 0.92) * release;
  } else if (showEnemyWarning) {
    const heavy = telegraph.userData.heavy as boolean;
    const pulse = 0.5 + Math.abs(Math.sin(elapsed * (heavy ? 7 : 10))) * 0.5;
    fillMaterial.opacity = (heavy ? 0.2 : 0.14) + actionProgress * (heavy ? 0.28 : 0.2);
    edgeMaterial.opacity = (0.3 + actionProgress * 0.55) * pulse;
    telegraph.scale.x = 0.82 + actionProgress * 0.18;
  }
}

export function createHealthBar(color: number, width = 3.7): THREE.Group {
  const group = new THREE.Group();
  const back = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0x050609, opacity: 0.82, transparent: true, depthWrite: false }));
  back.scale.set(width + 0.22, 0.34, 1);
  const bar = new THREE.Sprite(new THREE.SpriteMaterial({ color, depthWrite: false }));
  bar.scale.set(width, 0.15, 1);
  bar.position.z = 0.02;
  group.add(back, bar);
  group.userData.bar = bar;
  group.userData.fullWidth = width;
  group.visible = false;
  return group;
}

export function updateHealthBar(group: THREE.Group, ratio: number): void {
  const bar = group.userData.bar as THREE.Sprite;
  const width = group.userData.fullWidth as number;
  const clamped = THREE.MathUtils.clamp(ratio, 0, 1);
  bar.scale.x = Math.max(0.001, width * clamped);
  bar.position.x = -(width - bar.scale.x) / 2;
  group.visible = clamped < 0.999 && clamped > 0;
}

export function createProjectileVisual(kind: ProjectileKind, team: "heroes" | "demons"): THREE.Object3D {
  const colors: Record<ProjectileKind, number> = {
    repeater: 0xb79aff,
    arrow: 0xd7ecff,
    ember: 0xff6a32,
    soul: 0x73e9bd,
    splitbolt: 0xb79aff,
    death_tide: 0x59d7a6,
    demon_bolt: 0xf05b8d,
  };
  const group = new THREE.Group();
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture(hex(colors[kind])),
    color: colors[kind],
    transparent: true,
    opacity: kind === "repeater" ? 0.34 : kind === "ember" ? 0.38 : 1,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }));
  if (kind === "repeater") glow.scale.set(0.95, 0.72, 1);
  else if (kind === "ember") glow.scale.set(1.05, 0.84, 1);
  else glow.scale.set(kind === "death_tide" ? 4 : 1.8, kind === "death_tide" ? 4 : 1.8, 1);
  glow.position.y = 0.65;
  const directionalPrimary = kind === "repeater" || kind === "ember";
  const coreSize: [number, number, number] = kind === "repeater"
    ? [1.65, 0.16, 0.18]
    : kind === "ember"
      ? [1.25, 0.22, 0.26]
      : [kind === "arrow" ? 1.6 : 0.65, 0.18, 0.22];
  const core = new THREE.Mesh(
    new THREE.BoxGeometry(...coreSize),
    new THREE.MeshBasicMaterial({
      color: kind === "repeater" ? 0xf3edff : kind === "ember" ? 0xffd58a : colors[kind],
    }),
  );
  core.position.y = 0.65;
  if (directionalPrimary) {
    const tail = new THREE.Mesh(
      new THREE.BoxGeometry(
        kind === "repeater" ? 1.1 : 0.85,
        kind === "repeater" ? 0.08 : 0.12,
        kind === "repeater" ? 0.15 : 0.22,
      ),
      new THREE.MeshBasicMaterial({
        color: kind === "repeater" ? 0xb79aff : 0xff6a32,
        transparent: true,
        opacity: kind === "repeater" ? 0.62 : 0.68,
        depthWrite: false,
      }),
    );
    tail.position.set(kind === "repeater" ? -1 : -0.72, 0.65, 0);
    group.add(glow, tail, core);
    group.userData.tail = tail;
  } else {
    group.add(glow, core);
  }
  group.userData.core = core;
  group.userData.team = team;
  return group;
}

export function createWraithVisual(): THREE.Group {
  const group = new THREE.Group();
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture("#74efc0"),
    color: 0x74efc0,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }));
  glow.scale.set(3.8, 4.8, 1);
  glow.position.y = 1.55;
  const body = new THREE.Mesh(
    new THREE.ConeGeometry(0.72, 2.4, 5),
    new THREE.MeshBasicMaterial({ color: 0x8ff2ca, transparent: true, opacity: 0.82 }),
  );
  body.position.y = 1.35;
  body.rotation.z = Math.PI;
  const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xeafff7 });
  const eyeA = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.13, 0.12), eyeMaterial);
  eyeA.position.set(-0.22, 1.82, 0.58);
  const eyeB = eyeA.clone();
  eyeB.position.x = 0.22;
  group.add(glow, body, eyeA, eyeB);
  group.userData.glow = glow;
  group.userData.body = body;
  return group;
}

export function updateWraithVisual(group: THREE.Group, elapsed: number, seed: number, moving: boolean): void {
  const pulse = 0.88 + Math.sin(elapsed * 7 + seed) * 0.12;
  const glow = group.userData.glow as THREE.Sprite;
  const body = group.userData.body as THREE.Mesh;
  glow.scale.set(3.8 * pulse, 4.8 * pulse, 1);
  glow.material.opacity = 0.48 + pulse * 0.2;
  body.position.y = 1.35 + Math.sin(elapsed * 4.8 + seed) * 0.28;
  body.rotation.y += moving ? 0.13 : 0.045;
  group.scale.setScalar(moving ? 1.08 : 1);
}

export function createPickupVisual(kind: PickupKind): THREE.Group {
  const group = new THREE.Group();
  const colors: Record<PickupKind, number> = { gold: 0xffcd5c, heal: 0x68e192, rift_shard: 0xbd78ff };
  const geometry = kind === "gold" ? new THREE.OctahedronGeometry(0.42, 0) : new THREE.TetrahedronGeometry(0.58, 0);
  const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: colors[kind] }));
  mesh.position.y = 0.7;
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(hex(colors[kind])), color: colors[kind], transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  glow.scale.set(2.5, 2.5, 1);
  glow.position.y = 0.7;
  group.add(glow, mesh);
  group.userData.mesh = mesh;
  group.userData.baseY = 0.7;
  return group;
}

export function updatePickupVisual(group: THREE.Group, elapsed: number, seed: number): void {
  const mesh = group.userData.mesh as THREE.Mesh;
  const y = (group.userData.baseY as number) + Math.sin(elapsed * 3.2 + seed) * 0.18;
  mesh.position.y = y;
  mesh.rotation.y = elapsed * 2 + seed;
  mesh.rotation.x = elapsed * 0.7;
  const glow = group.children[0];
  if (glow) glow.position.y = y;
}

interface EffectPiece {
  mesh: THREE.Mesh;
  baseOpacity: number;
}

function effectMaterial(
  color: number,
  opacity: number,
  additive = false,
): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
  });
}

function addEffectMesh(
  group: THREE.Group,
  geometry: THREE.BufferGeometry,
  color: number,
  opacity: number,
  additive = false,
): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, effectMaterial(color, opacity, additive));
  mesh.position.y = 0.12;
  mesh.renderOrder = 8;
  group.add(mesh);
  (group.userData.pieces as EffectPiece[]).push({ mesh, baseOpacity: opacity });
  return mesh;
}

function addFlatRing(
  group: THREE.Group,
  innerRadius: number,
  outerRadius: number,
  color: number,
  opacity: number,
  start = 0,
  length = Math.PI * 2,
  additive = false,
): THREE.Mesh {
  const mesh = addEffectMesh(
    group,
    new THREE.RingGeometry(Math.max(0.05, innerRadius), Math.max(0.1, outerRadius), 24, 1, start, length),
    color,
    opacity,
    additive,
  );
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
}

export function createEffectVisual(kind: EffectKind, radius: number, rotation: number): THREE.Group {
  const group = new THREE.Group();
  group.userData.kind = kind;
  group.userData.baseRadius = radius;
  group.userData.baseRotation = rotation;
  group.userData.pieces = [] as EffectPiece[];
  group.rotation.y = rotation;

  const colorByKind: Record<EffectKind, number> = {
    slash: 0xeaf7ff,
    impact: 0xffb866,
    repeater_impact: 0xf3edff,
    ember_impact: 0xffd58a,
    wraith_impact: 0x8ff0c8,
    shock: 0x62caff,
    fire: 0xff6638,
    meteor_warning: 0xf14d3f,
    meteor: 0xff9a3d,
    snare: 0x9d77ef,
    war_standard: 0x4d98ef,
    warden_charge: 0x78c8ff,
    warden_wave: 0x65b8ff,
    warden_bastion: 0xa9ddff,
    souls: 0x69dfb0,
    heal: 0x72e79b,
    gate_hit: 0xff7858,
    nexus_hit: 0xff4f57,
    rift_hit: 0xd277ff,
  };
  const color = colorByKind[kind];

  if (kind === "wraith_impact") {
    const slash = addEffectMesh(group, new THREE.BoxGeometry(0.72, 0.04, 0.1), color, 0.78);
    slash.rotation.y = 0.48;
    const answer = addEffectMesh(group, new THREE.BoxGeometry(0.5, 0.035, 0.08), 0xd8ffed, 0.62);
    answer.rotation.y = -0.58;
  } else if (kind === "repeater_impact") {
    const shard = addEffectMesh(group, new THREE.BoxGeometry(1.05, 0.04, 0.14), color, 0.86);
    shard.position.x = -0.18;
    const cap = addEffectMesh(group, new THREE.BoxGeometry(0.12, 0.05, 0.48), 0xb79aff, 0.68);
    cap.position.x = 0.26;
  } else if (kind === "ember_impact") {
    const shard = addEffectMesh(group, new THREE.BoxGeometry(1.15, 0.05, 0.24), color, 0.88);
    shard.position.x = -0.18;
    const cap = addEffectMesh(group, new THREE.BoxGeometry(0.16, 0.06, 0.6), 0xff6a32, 0.72);
    cap.position.x = 0.3;
  } else if (kind === "slash") {
    // Local +X is the strike direction; the server-provided yaw turns this arc.
    addFlatRing(group, radius * 0.42, radius, color, 0.78, -0.56, 1.12);
    addFlatRing(group, radius * 0.75, radius * 0.88, 0x8cdcff, 0.48, -0.7, 1.4);
  } else if (kind === "warden_charge") {
    // The effect position is the path midpoint and radius is half its length.
    const trailLength = Math.max(3, radius * 2);
    const width = Math.max(1.4, Math.min(2.4, radius * 0.34));
    addEffectMesh(group, new THREE.BoxGeometry(trailLength, 0.035, width), color, 0.3, true);
    const edgeA = addEffectMesh(group, new THREE.BoxGeometry(trailLength, 0.045, 0.13), 0xd9f3ff, 0.82, true);
    edgeA.position.set(0, 0.14, width * 0.5);
    const edgeB = addEffectMesh(group, new THREE.BoxGeometry(trailLength, 0.045, 0.13), 0xd9f3ff, 0.82, true);
    edgeB.position.set(0, 0.14, -width * 0.5);
    const cap = addEffectMesh(group, new THREE.BoxGeometry(0.24, 0.06, width * 1.28), 0xffffff, 0.9, true);
    cap.position.set(trailLength * 0.5, 0.16, 0);
  } else if (kind === "warden_wave") {
    const cone = addEffectMesh(
      group,
      new THREE.CircleGeometry(radius, 20, -0.62, 1.24),
      color,
      0.2,
      true,
    );
    cone.rotation.x = -Math.PI / 2;
    addFlatRing(group, radius * 0.48, radius * 0.58, 0xc8ebff, 0.52, -0.62, 1.24, true);
    addFlatRing(group, radius * 0.82, radius, 0xe7f7ff, 0.86, -0.62, 1.24, true);
  } else if (kind === "war_standard") {
    addFlatRing(group, radius * 0.68, radius, color, 0.58);
    addFlatRing(group, radius * 0.15, radius * 0.23, 0xbfe6ff, 0.84);
    const pole = addEffectMesh(group, new THREE.BoxGeometry(0.25, 3.6, 0.25), 0xb8d7ea, 0.9);
    pole.position.set(0, 1.8, 0);
    const banner = addEffectMesh(group, new THREE.BoxGeometry(1.7, 0.9, 0.12), color, 0.92);
    banner.position.set(0.85, 2.65, 0);
  } else if (kind === "warden_bastion") {
    addFlatRing(group, radius * 0.22, radius * 0.34, 0xffffff, 0.76, 0, Math.PI * 2, true);
    addFlatRing(group, radius * 0.68, radius * 0.77, color, 0.72, 0, Math.PI * 2, true);
    for (let index = 0; index < 8; index += 1) {
      const angle = (index / 8) * Math.PI * 2;
      const segment = addEffectMesh(
        group,
        new THREE.BoxGeometry(Math.max(1.1, radius * 0.22), 0.16, Math.max(0.35, radius * 0.055)),
        index % 2 === 0 ? 0xd9f2ff : color,
        0.86,
        true,
      );
      segment.position.set(Math.cos(angle) * radius * 0.73, 0.18, Math.sin(angle) * radius * 0.73);
      segment.rotation.y = -angle;
    }
  } else {
    const additive = kind === "fire" || kind === "meteor";
    addFlatRing(
      group,
      Math.max(0.1, radius * 0.72),
      Math.max(0.25, radius),
      color,
      kind === "meteor_warning" ? 0.58 : 0.75,
      0,
      Math.PI * 2,
      additive,
    );
  }

  return group;
}

export function updateEffectVisual(group: THREE.Group, remaining: number, elapsed: number): void {
  const kind = group.userData.kind as EffectKind;
  const pieces = (group.userData.pieces as EffectPiece[] | undefined) ?? [];
  const compactImpact = kind === "repeater_impact" || kind === "ember_impact" || kind === "wraith_impact";
  const fade = compactImpact
    ? THREE.MathUtils.clamp(remaining / 0.16, 0, 1)
    : THREE.MathUtils.clamp(remaining * 2.5, 0, 1);
  const pulse = 1 + (1 - THREE.MathUtils.clamp(remaining, 0, 1)) * 0.2;

  if (kind === "meteor_warning") {
    const warningPulse = 0.36 + Math.abs(Math.sin(elapsed * 10)) * 0.64;
    for (const piece of pieces) (piece.mesh.material as THREE.MeshBasicMaterial).opacity = piece.baseOpacity * warningPulse;
    group.rotation.y = (group.userData.baseRotation as number) + elapsed * 0.55;
    return;
  }

  for (const piece of pieces) {
    (piece.mesh.material as THREE.MeshBasicMaterial).opacity = piece.baseOpacity * fade;
  }
  if (compactImpact) {
    group.scale.setScalar(1);
  } else if (kind === "warden_charge") {
    group.scale.z = 0.82 + Math.abs(Math.sin(elapsed * 18)) * 0.18;
  } else if (kind === "warden_wave") {
    group.scale.setScalar(pulse);
  } else if (kind === "warden_bastion") {
    group.rotation.y = (group.userData.baseRotation as number) + elapsed * 0.85;
    group.scale.setScalar(0.92 + Math.abs(Math.sin(elapsed * 8)) * 0.08);
  } else if (kind !== "war_standard") {
    group.scale.setScalar(pulse);
  }
}

export function createFloatingText(text: string, color = "#ffffff", size = 16): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 48;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D unavailable");
  context.imageSmoothingEnabled = false;
  context.font = `900 ${size}px ui-monospace, monospace`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.strokeStyle = "rgba(0,0,0,.95)";
  context.lineWidth = 5;
  context.strokeText(text, 64, 24);
  context.fillStyle = color;
  context.fillText(text, 64, 24);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
  sprite.scale.set(5.3, 2, 1);
  sprite.renderOrder = 30;
  sprite.userData.bornAt = performance.now();
  return sprite;
}

interface Brazier {
  flame: THREE.Sprite;
  light: THREE.PointLight;
  seed: number;
}

interface ForgeVisual {
  sigil: THREE.Mesh;
  sigilGlow: THREE.Sprite;
  sign: THREE.Group;
  light: THREE.PointLight;
}

interface ReliquaryVisual {
  sigil: THREE.Group;
  core: THREE.Mesh;
  glow: THREE.Sprite;
  light: THREE.PointLight;
  prisms: THREE.Mesh[];
  motes: THREE.Points;
}

interface GateSealVisual {
  root: THREE.Group;
  ward: THREE.Mesh;
  bars: THREE.Mesh[];
}

interface GateHealthBarVisual {
  root: THREE.Group;
  background: THREE.Sprite;
  fill: THREE.Sprite;
}

export interface ArenaVisuals {
  root: THREE.Group;
  nexusCrystal: THREE.Mesh;
  nexusGlow: THREE.Sprite;
  nexusRings: THREE.Mesh[];
  nexusLight: THREE.PointLight;
  riftCore: THREE.Mesh;
  riftGlow: THREE.Sprite;
  braziers: Brazier[];
  gateCrystals: Record<LaneId, THREE.Mesh>;
  gateGlows: Record<LaneId, THREE.Sprite>;
  gateArches: Record<LaneId, THREE.Mesh>;
  gateSeals: Record<LaneId, GateSealVisual>;
  gateHealthBars: Record<LaneId, GateHealthBarVisual>;
  motes: THREE.Points;
  update: (
    elapsed: number,
    nexusRatio: number,
    shielded: boolean,
    phase: string,
    phaseElapsed: number,
    pressure: LaneId | null,
    activeLanes: LaneId[],
    gateStates: Partial<Record<LaneId, { hpRatio: number; breached: boolean }>>,
    riftRatio: number,
  ) => void;
}

function addBox(
  parent: THREE.Object3D,
  size: [number, number, number],
  position: [number, number, number],
  material: THREE.Material,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addWallSegment(parent: THREE.Group, x: number, z: number, horizontal: boolean, length = 9): void {
  const stone = stoneMaterial("wall", 0x263037);
  const cap = stoneMaterial("wall-cap", 0x39444a);
  addBox(parent, horizontal ? [length, 2.7, 2.2] : [2.2, 2.7, length], [x, 1.35, z], stone);
  addBox(parent, horizontal ? [length + 0.35, 0.45, 2.6] : [2.6, 0.45, length + 0.35], [x, 2.85, z], cap);
  const count = Math.max(2, Math.floor(length / 2.4));
  for (let index = 0; index < count; index += 1) {
    const offset = -length / 2 + 1 + (index * (length - 2)) / Math.max(1, count - 1);
    addBox(parent, [1.15, 0.8, 1.15], horizontal ? [x + offset, 3.35, z] : [x, 3.35, z + offset], cap);
  }
}

function addTower(parent: THREE.Group, x: number, z: number, color = 0x334047): void {
  const base = stoneMaterial(`tower-${color}`, color);
  const trim = stoneMaterial("tower-trim", 0x566067);
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(2.35, 2.75, 5, 8), base);
  tower.position.set(x, 2.5, z);
  parent.add(tower);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(2.7, 2.5, 0.55, 8), trim);
  cap.position.set(x, 5.1, z);
  parent.add(cap);
  for (let i = 0; i < 8; i += 2) {
    const angle = (i / 8) * Math.PI * 2;
    addBox(parent, [0.8, 0.9, 0.8], [x + Math.cos(angle) * 2.15, 5.65, z + Math.sin(angle) * 2.15], trim);
  }
}

function addBrazier(parent: THREE.Group, x: number, z: number, braziers: Brazier[], seed: number): void {
  const metal = stoneMaterial("brazier-metal", 0x3a3432);
  addBox(parent, [0.55, 1.25, 0.55], [x, 0.62, z], metal);
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.82, 0.45, 0.45, 8), metal);
  bowl.position.set(x, 1.33, z);
  parent.add(bowl);
  const flame = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture("#ff8b37"),
    color: 0xff8b37,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }));
  flame.scale.set(2.2, 2.8, 1);
  flame.position.set(x, 2.2, z);
  const light = new THREE.PointLight(0xff7138, 1.5, 12, 2);
  light.position.set(x, 2.6, z);
  parent.add(flame, light);
  braziers.push({ flame, light, seed });
}

function addIronboundForge(parent: THREE.Group, braziers: Brazier[]): ForgeVisual {
  const vendor = VENDOR_DEFINITIONS.ironbound_forge;
  const buildingX = -20;
  const buildingZ = -19;
  const stone = stoneMaterial("forge-building", 0x34383a);
  const darkStone = stoneMaterial("forge-dark-stone", 0x262a2d);
  const timber = stoneMaterial("forge-timber", 0x5b3d28);
  const iron = stoneMaterial("forge-iron", 0x3c4143);
  const warmIron = stoneMaterial("forge-warm-iron", 0x71513a);
  const roof = stoneMaterial("forge-roof", 0x4a2c29);

  addBox(parent, [8, 4, 6], [buildingX, 2, buildingZ], stone);
  const roofMesh = new THREE.Mesh(new THREE.ConeGeometry(5.8, 2.7, 4), roof);
  roofMesh.position.set(buildingX, 5.25, buildingZ);
  roofMesh.rotation.y = Math.PI / 4;
  parent.add(roofMesh);

  // The open counter faces the Nexus so the route and interaction side remain
  // readable without adding collision or placing a shop panel over combat.
  addBox(parent, [6.4, 1.25, 1.05], [buildingX, 0.64, -15.5], timber);
  addBox(parent, [6.9, 0.26, 3.1], [buildingX, 3.7, -16.1], roof);
  for (const x of [buildingX - 2.8, buildingX + 2.8]) {
    addBox(parent, [0.3, 3.6, 0.3], [x, 1.8, -14.8], timber);
  }

  // Low-poly smith silhouette behind the counter.
  const smithBody = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.7, 1.75, 6), darkStone);
  smithBody.position.set(buildingX + 0.4, 1.73, -16.3);
  const smithHead = new THREE.Mesh(new THREE.DodecahedronGeometry(0.42, 0), warmIron);
  smithHead.position.set(buildingX + 0.4, 2.83, -16.3);
  parent.add(smithBody, smithHead);

  // Anvil and resting hammer make the forge legible before the UI prompt does.
  addBox(parent, [1.45, 0.3, 0.7], [buildingX - 1.65, 1.32, -14.7], iron);
  addBox(parent, [0.62, 0.9, 0.5], [buildingX - 1.65, 0.75, -14.7], darkStone);
  const hammer = new THREE.Group();
  addBox(hammer, [0.16, 1.15, 0.16], [0, 0.55, 0], timber).rotation.z = -0.58;
  const hammerHead = addBox(hammer, [0.8, 0.28, 0.34], [0.32, 1.03, 0], iron);
  hammerHead.rotation.z = -0.12;
  hammer.position.set(buildingX + 1.6, 1.18, -15.05);
  hammer.rotation.y = 0.35;
  parent.add(hammer);

  addBrazier(parent, buildingX - 3.5, -13.9, braziers, 7.4);

  // Hanging hammer sign, deliberately warm and smaller than objective crystals.
  const sign = new THREE.Group();
  sign.position.set(buildingX + 3.2, 4.45, -14.9);
  const board = addBox(sign, [1.55, 1.65, 0.22], [0, 0, 0], darkStone);
  board.rotation.z = 0.02;
  addBox(sign, [0.16, 1.05, 0.16], [-0.12, -0.02, 0.18], timber).rotation.z = -0.62;
  addBox(sign, [0.84, 0.26, 0.18], [0.24, 0.37, 0.18], warmIron).rotation.z = -0.08;
  parent.add(sign);

  const sigil = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.58, 0),
    new THREE.MeshStandardMaterial({ color: 0xf0c56f, emissive: 0x8b5423, emissiveIntensity: 1.45, roughness: 0.28 }),
  );
  sigil.position.set(vendor.position.x, 6.45, vendor.position.z);
  const sigilGlow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture("#e9ba63"),
    color: 0xe9ba63,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }));
  sigilGlow.position.copy(sigil.position);
  sigilGlow.scale.set(4.2, 4.2, 1);
  const light = new THREE.PointLight(0xe9a54f, 1.7, 18, 2);
  light.position.set(vendor.position.x, 4, vendor.position.z);
  parent.add(sigil, sigilGlow, light);

  return { sigil, sigilGlow, sign, light };
}

function addVeilglassReliquary(parent: THREE.Group): ReliquaryVisual {
  const vendor = VENDOR_DEFINITIONS.veilglass_reliquary;
  const buildingX = 20;
  const buildingZ = -19;
  const stone = stoneMaterial("reliquary-stone", 0x303543);
  const darkStone = stoneMaterial("reliquary-dark-stone", 0x222633);
  const trim = stoneMaterial("reliquary-trim", 0x4b5266);
  const roof = stoneMaterial("reliquary-roof", 0x29253d);
  const lecternMaterial = stoneMaterial("reliquary-lectern", 0x353b4b);

  // A tall shrine silhouette deliberately opposes the Forge's low timber span.
  addBox(parent, [6.5, 5.3, 6], [buildingX, 2.65, buildingZ], stone);
  const roofMesh = new THREE.Mesh(new THREE.ConeGeometry(4.75, 3.9, 4), roof);
  roofMesh.position.set(buildingX, 7.55, buildingZ);
  roofMesh.rotation.y = Math.PI / 4;
  parent.add(roofMesh);

  // Open arched facade and lectern face the Nexus from the northeast corner.
  for (const x of [buildingX - 2.25, buildingX + 2.25]) {
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.46, 4.25, 6), trim);
    pillar.position.set(x, 2.15, -15.65);
    parent.add(pillar);
    const cap = new THREE.Mesh(new THREE.OctahedronGeometry(0.48, 0), darkStone);
    cap.position.set(x, 4.5, -15.65);
    parent.add(cap);
  }
  addBox(parent, [5.2, 0.48, 0.7], [buildingX, 4.38, -15.65], trim);
  addBox(parent, [2.25, 1.55, 1.2], [buildingX, 0.78, -15.2], lecternMaterial);
  addBox(parent, [2.55, 0.22, 1.4], [buildingX, 1.58, -15.2], trim);

  // A still, masked curator keeps the physical shop inhabited without adding AI.
  const curator = new THREE.Mesh(new THREE.ConeGeometry(0.7, 2.25, 6), darkStone);
  curator.position.set(buildingX, 2.1, -16.35);
  const mask = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.42, 0),
    new THREE.MeshLambertMaterial({ color: 0xb9d9e6, emissive: 0x29465a, emissiveIntensity: 0.45, flatShading: true }),
  );
  mask.scale.set(0.72, 1, 0.55);
  mask.position.set(buildingX, 3.32, -16.35);
  parent.add(curator, mask);

  const prisms: THREE.Mesh[] = [];
  for (const [index, x] of [buildingX - 1.55, buildingX + 1.55].entries()) {
    const prism = new THREE.Mesh(
      new THREE.OctahedronGeometry(index === 0 ? 0.48 : 0.42, 0),
      new THREE.MeshStandardMaterial({
        color: index === 0 ? 0x9eeaff : 0xc19cff,
        emissive: index === 0 ? 0x24677f : 0x5b2d82,
        emissiveIntensity: 1.25,
        roughness: 0.2,
      }),
    );
    prism.position.set(x, 1.65, -14.8);
    parent.add(prism);
    prisms.push(prism);
  }

  // A four-point hanging sign matches the minimap marker without using text.
  const sign = new THREE.Group();
  sign.position.set(buildingX + 2.9, 5.05, -15.45);
  addBox(sign, [0.22, 1.65, 0.16], [0, 0, 0], trim).rotation.z = 0.76;
  addBox(sign, [0.22, 1.65, 0.16], [0, 0, 0.02], trim).rotation.z = -0.76;
  const signCore = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.32, 0),
    new THREE.MeshBasicMaterial({ color: 0xbfa2ff }),
  );
  signCore.position.z = 0.14;
  sign.add(signCore);
  parent.add(sign);

  const sigil = new THREE.Group();
  sigil.position.set(vendor.position.x, 6.55, vendor.position.z);
  const ringMaterial = new THREE.MeshBasicMaterial({ color: 0xbfa2ff, transparent: true, opacity: 0.86 });
  const ringA = new THREE.Mesh(new THREE.TorusGeometry(0.92, 0.075, 6, 24), ringMaterial);
  const ringB = new THREE.Mesh(new THREE.TorusGeometry(0.66, 0.06, 6, 20), ringMaterial.clone());
  ringB.rotation.y = Math.PI / 2;
  const core = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.43, 0),
    new THREE.MeshStandardMaterial({ color: 0xbcefff, emissive: 0x3f6b99, emissiveIntensity: 1.7, roughness: 0.18 }),
  );
  sigil.add(ringA, ringB, core);
  parent.add(sigil);

  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture("#bfa2ff"),
    color: 0xbfa2ff,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }));
  glow.position.copy(sigil.position);
  glow.scale.set(4.4, 4.4, 1);
  const light = new THREE.PointLight(0x8ecfff, 1.45, 18, 2);
  light.position.set(vendor.position.x, 4.2, vendor.position.z);
  parent.add(glow, light);

  const motePositions = new Float32Array(18 * 3);
  for (let index = 0; index < 18; index += 1) {
    const angle = (index / 18) * Math.PI * 2;
    const radius = 1.5 + (index % 4) * 0.52;
    motePositions[index * 3] = vendor.position.x + Math.cos(angle) * radius;
    motePositions[index * 3 + 1] = 1.2 + (index % 6) * 0.62;
    motePositions[index * 3 + 2] = vendor.position.z + Math.sin(angle) * radius * 0.58;
  }
  const moteGeometry = new THREE.BufferGeometry();
  moteGeometry.setAttribute("position", new THREE.BufferAttribute(motePositions, 3));
  const motes = new THREE.Points(
    moteGeometry,
    new THREE.PointsMaterial({ color: 0xaedfff, size: 0.14, transparent: true, opacity: 0.48, depthWrite: false }),
  );
  parent.add(motes);

  return { sigil, core, glow, light, prisms, motes };
}

function addBanner(parent: THREE.Group, x: number, z: number, rotation: number, color: number): void {
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 4.8, 6), stoneMaterial("banner-pole", 0x54483a));
  pole.position.set(x, 2.4, z);
  parent.add(pole);
  const cloth = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 2.4), new THREE.MeshLambertMaterial({ color, side: THREE.DoubleSide }));
  cloth.position.set(x + Math.sin(rotation) * 0.08, 3.45, z + Math.cos(rotation) * 0.08);
  cloth.rotation.y = rotation;
  parent.add(cloth);
}

function addWagon(parent: THREE.Group, x: number, z: number, rotation: number): void {
  const wagon = new THREE.Group();
  wagon.position.set(x, 0, z);
  wagon.rotation.y = rotation;
  const wood = stoneMaterial("wagon-wood", 0x69452e);
  addBox(wagon, [3.4, 0.65, 1.9], [0, 1, 0], wood);
  for (const wx of [-1.15, 1.15]) {
    for (const wz of [-1.1, 1.1]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.24, 10), stoneMaterial("wheel", 0x2f2622));
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(wx, 0.62, wz * 0.84);
      wagon.add(wheel);
    }
  }
  parent.add(wagon);
}

function addBarricade(parent: THREE.Group, x: number, z: number, rotation: number): void {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = rotation;
  const timber = stoneMaterial("barricade-timber", 0x59402d);
  const iron = stoneMaterial("barricade-iron", 0x3a4144);
  addBox(group, [4.2, 0.45, 0.45], [0, 0.9, 0], timber);
  for (const offset of [-1.55, 0, 1.55]) {
    const stake = addBox(group, [0.38, 2.2, 0.38], [offset, 1, 0], offset === 0 ? iron : timber);
    stake.rotation.z = offset === 0 ? 0 : Math.sign(offset) * 0.16;
  }
  parent.add(group);
}

function addRubbleCluster(parent: THREE.Group, x: number, z: number, rotation: number): void {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = rotation;
  const rubble = stoneMaterial("rubble", 0x252d31);
  addBox(group, [3.6, 0.7, 1.5], [0, 0.32, 0], rubble).rotation.y = 0.18;
  addBox(group, [1.3, 1.25, 1.2], [-1.5, 0.58, 0.7], rubble).rotation.z = 0.28;
  addBox(group, [1.9, 0.45, 1], [1.45, 0.2, -0.6], rubble).rotation.y = -0.4;
  parent.add(group);
}

function createGateSeal(
  parent: THREE.Group,
  lane: LaneId,
  point: Vec2,
  horizontal: boolean,
): GateSealVisual {
  const root = new THREE.Group();
  root.position.set(point.x, 0, point.z);
  root.visible = false;
  const bars: THREE.Mesh[] = [];
  const barMaterial = new THREE.MeshLambertMaterial({ color: 0x59646b, emissive: 0x11191d });
  for (const offset of [-4.4, -2.2, 0, 2.2, 4.4]) {
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(horizontal ? 0.34 : 0.48, 4.3, horizontal ? 0.48 : 0.34),
      barMaterial,
    );
    bar.position.set(horizontal ? offset : 0, 2.25, horizontal ? 0 : offset);
    root.add(bar);
    bars.push(bar);
  }
  const crossbar = new THREE.Mesh(
    new THREE.BoxGeometry(horizontal ? 11.2 : 0.5, 0.42, horizontal ? 0.5 : 11.2),
    barMaterial,
  );
  crossbar.position.y = 2.35;
  root.add(crossbar);
  bars.push(crossbar);

  const ward = new THREE.Mesh(
    new THREE.PlaneGeometry(11, 4.4),
    new THREE.MeshBasicMaterial({
      color: LANE_COLOR[lane],
      transparent: true,
      opacity: 0.13,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  ward.position.y = 2.3;
  if (!horizontal) ward.rotation.y = Math.PI / 2;
  ward.renderOrder = 2;
  root.add(ward);
  parent.add(root);
  return { root, ward, bars };
}

export function createArena(scene: THREE.Scene): ArenaVisuals {
  const root = new THREE.Group();
  scene.add(root);
  scene.background = new THREE.Color(0x0f1721);
  scene.fog = new THREE.FogExp2(0x101923, 0.0037);

  const ambient = new THREE.HemisphereLight(0x9dbed4, 0x34261f, 1.85);
  const moon = new THREE.DirectionalLight(0xc2def0, 2.55);
  moon.position.set(-30, 48, 25);
  const fireFill = new THREE.DirectionalLight(0xc57a4a, 0.68);
  fireFill.position.set(32, 18, -28);
  scene.add(ambient, moon, fireFill);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(360, 400),
    new THREE.MeshLambertMaterial({ map: floorTexture(), color: 0xd1d5d3 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -0.12, -30);
  ground.receiveShadow = true;
  root.add(ground);

  const courtyard = new THREE.Mesh(
    new THREE.PlaneGeometry(100, 100),
    new THREE.MeshLambertMaterial({ map: cobbleTexture(), color: 0xd8dddc }),
  );
  courtyard.rotation.x = -Math.PI / 2;
  courtyard.position.y = -0.06;
  root.add(courtyard);

  const roadMaterial = new THREE.MeshLambertMaterial({ map: cobbleTexture(), color: 0xa8b0b1 });
  const northRoad = new THREE.Mesh(new THREE.PlaneGeometry(18, 230), roadMaterial);
  northRoad.rotation.x = -Math.PI / 2;
  northRoad.position.set(0, -0.045, -82);
  root.add(northRoad);
  const southRoad = new THREE.Mesh(new THREE.PlaneGeometry(18, 104), roadMaterial);
  southRoad.rotation.x = -Math.PI / 2;
  southRoad.position.set(0, -0.045, 84);
  root.add(southRoad);
  const eastRoad = new THREE.Mesh(new THREE.PlaneGeometry(104, 18), roadMaterial);
  eastRoad.rotation.x = -Math.PI / 2;
  eastRoad.position.set(84, -0.045, 0);
  root.add(eastRoad);
  const westRoad = eastRoad.clone();
  westRoad.position.x = -84;
  root.add(westRoad);

  // The fortification follows the actual gate line. Each side leaves a broad
  // opening around its lane instead of shrinking the playable courtyard.
  const wallCoordinates = [-47, -36, -25, -14, 14, 25, 36, 47];
  for (const x of wallCoordinates) {
    addWallSegment(root, x, -52, true, 10);
    addWallSegment(root, x, 52, true, 10);
  }
  for (const z of wallCoordinates) {
    addWallSegment(root, -52, z, false, 10);
    addWallSegment(root, 52, z, false, 10);
  }
  for (const x of [-52, 52]) {
    for (const z of [-52, 52]) addTower(root, x, z, 0x2c383e);
  }

  const gateCrystals = {} as Record<LaneId, THREE.Mesh>;
  const gateGlows = {} as Record<LaneId, THREE.Sprite>;
  const gateArches = {} as Record<LaneId, THREE.Mesh>;
  const gateSeals = {} as Record<LaneId, GateSealVisual>;
  const gateHealthBars = {} as Record<LaneId, GateHealthBarVisual>;
  for (const lane of ["north", "east", "south", "west"] as const) {
    const point = WORLD_LAYOUT.gates[lane];
    const horizontal = lane === "north" || lane === "south";
    if (horizontal) {
      addTower(root, point.x - 7.5, point.z);
      addTower(root, point.x + 7.5, point.z);
    } else {
      addTower(root, point.x, point.z - 7.5);
      addTower(root, point.x, point.z + 7.5);
    }
    const arch = addBox(root, horizontal ? [14, 1.2, 1.6] : [1.6, 1.2, 14], [point.x, 5.3, point.z], stoneMaterial("gate-arch", 0x46535a));
    arch.userData.lane = lane;
    arch.userData.baseY = 5.3;
    gateArches[lane] = arch;
    const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.85, 0), new THREE.MeshBasicMaterial({ color: LANE_COLOR[lane] }));
    crystal.position.set(point.x, 6.6, point.z);
    root.add(crystal);
    gateCrystals[lane] = crystal;
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(hex(LANE_COLOR[lane])), color: LANE_COLOR[lane], transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    glow.position.copy(crystal.position);
    glow.scale.set(4.2, 4.2, 1);
    root.add(glow);
    gateGlows[lane] = glow;
    gateSeals[lane] = createGateSeal(root, lane, point, horizontal);

    const healthRoot = new THREE.Group();
    healthRoot.position.set(point.x, 9.25, point.z);
    const healthBackground = new THREE.Sprite(new THREE.SpriteMaterial({
      color: 0x0a1115,
      transparent: true,
      opacity: 0.9,
      depthTest: false,
      depthWrite: false,
    }));
    healthBackground.scale.set(7.2, 0.66, 1);
    healthBackground.renderOrder = 24;
    healthRoot.add(healthBackground);
    const healthFill = new THREE.Sprite(new THREE.SpriteMaterial({
      color: 0x8ed7e6,
      transparent: true,
      opacity: 0.96,
      depthTest: false,
      depthWrite: false,
    }));
    healthFill.center.set(0, 0.5);
    healthFill.position.set(-3.25, 0, 0);
    healthFill.scale.set(6.5, 0.28, 1);
    healthFill.renderOrder = 25;
    healthRoot.add(healthFill);
    healthRoot.visible = false;
    root.add(healthRoot);
    gateHealthBars[lane] = { root: healthRoot, background: healthBackground, fill: healthFill };
  }

  // Heartfire Nexus: deliberately readable from every approach.
  const nexusBase = new THREE.Mesh(new THREE.CylinderGeometry(6.3, 7.2, 1.2, 8), stoneMaterial("nexus-base", 0x293941));
  nexusBase.position.y = 0.55;
  root.add(nexusBase);
  const nexusStep = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 5.4, 1, 8), stoneMaterial("nexus-step", 0x40545e));
  nexusStep.position.y = 1.45;
  root.add(nexusStep);
  for (let i = 0; i < 4; i += 1) {
    const angle = i * Math.PI / 2 + Math.PI / 4;
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.78, 4.4, 6), stoneMaterial("nexus-pillar", 0x3e4c52));
    pillar.position.set(Math.cos(angle) * 3.9, 2.7, Math.sin(angle) * 3.9);
    pillar.rotation.z = Math.cos(angle) * 0.18;
    pillar.rotation.x = Math.sin(angle) * 0.18;
    root.add(pillar);
  }
  const nexusCrystal = new THREE.Mesh(
    new THREE.OctahedronGeometry(2.3, 0),
    new THREE.MeshStandardMaterial({ color: 0x74dfff, emissive: 0x1e7897, emissiveIntensity: 1.8, roughness: 0.2, metalness: 0.15 }),
  );
  nexusCrystal.scale.y = 1.7;
  nexusCrystal.position.y = 5;
  root.add(nexusCrystal);
  const nexusGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture("#6edcff"), color: 0x73ddff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  nexusGlow.scale.set(12, 12, 1);
  nexusGlow.position.y = 5;
  root.add(nexusGlow);
  const nexusLight = new THREE.PointLight(0x56c9ff, 4, 34, 2);
  nexusLight.position.y = 6;
  root.add(nexusLight);
  const nexusRings = [3.1, 5.2].map((radius, index) => {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(radius, index === 0 ? 0.12 : 0.08, 5, 40),
      new THREE.MeshBasicMaterial({ color: index === 0 ? 0x8fe9ff : 0x3da3cb, transparent: true, opacity: 0.72, blending: THREE.AdditiveBlending }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = index === 0 ? 3.7 : 1.95;
    root.add(ring);
    return ring;
  });

  const braziers: Brazier[] = [];
  for (const [index, point] of [[-11, -11], [11, -11], [-11, 11], [11, 11], [-43, -43], [43, -43], [-43, 43], [43, 43]] .entries()) {
    addBrazier(root, point[0] ?? 0, point[1] ?? 0, braziers, index * 0.81);
  }
  const forge = addIronboundForge(root, braziers);
  const reliquary = addVeilglassReliquary(root);
  addBanner(root, -10.5, -43, 0, 0x2f6e99);
  addBanner(root, 10.5, -43, Math.PI, 0x2f6e99);
  addBanner(root, -43, -10.5, Math.PI / 2, 0x3c7560);
  addBanner(root, 43, 10.5, Math.PI / 2, 0x7d4336);
  addWagon(root, -31, 26, -0.4);
  addWagon(root, 30, -29, 2.2);

  // Remaining city silhouettes: storehouse and chapel ruin. The northwest and
  // northeast buildings are the distinct playable shops above.
  const roof = stoneMaterial("roof", 0x442b2c);
  const timber = stoneMaterial("timber", 0x513827);
  for (const [x, z, w, d, h] of [[20, 19, 7, 8, 4.8], [-19, 20, 6, 6, 5.2]] as const) {
    addBox(root, [w, h, d], [x, h / 2, z], stoneMaterial("building", 0x30383a));
    const roofMesh = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.72, 2.6, 4), roof);
    roofMesh.position.set(x, h + 1.25, z);
    roofMesh.rotation.y = Math.PI / 4;
    root.add(roofMesh);
    addBox(root, [0.45, 2.4, 0.45], [x + w * 0.28, 1.2, z + d * 0.51], timber);
  }

  // Broken defensive lines and roadside ruins give the longer approaches
  // landmarks while leaving each 18-unit lane clear for horde movement.
  for (const [x, z, rotation] of [
    [-16, -71, 0.12], [17, -92, -0.18],
    [16, 72, Math.PI + 0.12], [-18, 96, Math.PI - 0.18],
    [71, -16, Math.PI / 2 + 0.12], [94, 18, Math.PI / 2 - 0.18],
    [-72, 16, -Math.PI / 2 + 0.12], [-96, -18, -Math.PI / 2 - 0.18],
  ] as const) addBarricade(root, x, z, rotation);
  for (const [x, z, rotation] of [
    [-23, -84, 0.3], [25, -112, -0.45], [-27, -137, 0.18],
    [24, 81, -0.2], [-22, 111, 0.4],
    [82, 24, 0.25], [111, -25, -0.38],
    [-82, -24, -0.25], [-111, 25, 0.38],
  ] as const) addRubbleCluster(root, x, z, rotation);

  // The source of the invasion sits at the end of the north road.
  const riftPlatform = new THREE.Mesh(new THREE.CylinderGeometry(9, 11, 1.2, 10), stoneMaterial("rift-platform", 0x251c2e));
  riftPlatform.position.set(WORLD_LAYOUT.riftHeart.x, 0.4, WORLD_LAYOUT.riftHeart.z);
  root.add(riftPlatform);
  const riftCore = new THREE.Mesh(
    new THREE.IcosahedronGeometry(2.8, 0),
    new THREE.MeshStandardMaterial({ color: 0x8f3ac9, emissive: 0x6b168e, emissiveIntensity: 2.2, roughness: 0.18 }),
  );
  riftCore.scale.y = 1.45;
  riftCore.position.set(WORLD_LAYOUT.riftHeart.x, 5.2, WORLD_LAYOUT.riftHeart.z);
  root.add(riftCore);
  const riftGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture("#b454ff"), color: 0xb454ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  riftGlow.position.copy(riftCore.position);
  riftGlow.scale.set(17, 17, 1);
  root.add(riftGlow);
  for (let i = 0; i < 5; i += 1) {
    const angle = (i / 5) * Math.PI * 2;
    const obelisk = new THREE.Mesh(new THREE.ConeGeometry(1.25, 7 + (i % 2), 5), stoneMaterial("rift-obelisk", 0x21172a));
    obelisk.position.set(Math.cos(angle) * 8, 3.4, WORLD_LAYOUT.riftHeart.z + Math.sin(angle) * 8);
    obelisk.rotation.z = -Math.cos(angle) * 0.18;
    root.add(obelisk);
  }

  const moteCount = 210;
  const motePositions = new Float32Array(moteCount * 3);
  for (let i = 0; i < moteCount; i += 1) {
    motePositions[i * 3] = (Math.random() - 0.5) * 300;
    motePositions[i * 3 + 1] = 1 + Math.random() * 13;
    motePositions[i * 3 + 2] = (Math.random() - 0.5) * 330 - 30;
  }
  const moteGeometry = new THREE.BufferGeometry();
  moteGeometry.setAttribute("position", new THREE.BufferAttribute(motePositions, 3));
  const motes = new THREE.Points(moteGeometry, new THREE.PointsMaterial({ color: 0x5e7180, size: 0.18, transparent: true, opacity: 0.42, depthWrite: false }));
  root.add(motes);

  function update(
    elapsed: number,
    nexusRatio: number,
    shielded: boolean,
    phase: string,
    phaseElapsed: number,
    pressure: LaneId | null,
    activeLanes: LaneId[],
    gateStates: Partial<Record<LaneId, { hpRatio: number; breached: boolean }>>,
    riftRatio: number,
  ): void {
    nexusCrystal.rotation.y = elapsed * 0.72;
    nexusCrystal.position.y = 5 + Math.sin(elapsed * 1.9) * 0.22;
    nexusGlow.position.y = nexusCrystal.position.y;
    nexusGlow.material.opacity = 0.54 + Math.sin(elapsed * 3) * 0.1;
    nexusGlow.scale.setScalar((10.5 + Math.sin(elapsed * 2.2)) * (shielded ? 1.25 : 1));
    nexusLight.intensity = (2.2 + nexusRatio * 2.2) * (shielded ? 1.45 : 1);
    nexusLight.color.setHex(nexusRatio < 0.3 ? 0xff4d5b : 0x56c9ff);
    (nexusCrystal.material as THREE.MeshStandardMaterial).emissive.setHex(nexusRatio < 0.3 ? 0x9e1623 : 0x1e7897);
    nexusRings[0]?.rotateZ(0.008);
    nexusRings[1]?.rotateZ(-0.005);
    for (const [index, ring] of nexusRings.entries()) {
      ring.scale.setScalar(shielded ? 1.16 + Math.sin(elapsed * 2 + index) * 0.03 : 1);
    }
    for (const brazier of braziers) {
      const pulse = 0.82 + Math.sin(elapsed * 8.2 + brazier.seed) * 0.14 + Math.sin(elapsed * 13.7 + brazier.seed) * 0.06;
      brazier.flame.scale.set(1.8 * pulse, 2.5 * pulse, 1);
      brazier.flame.position.y = 2.15 + Math.sin(elapsed * 7 + brazier.seed) * 0.08;
      brazier.light.intensity = 1.2 + pulse * 0.7;
    }
    const forgePulse = 0.9 + Math.sin(elapsed * 3.2) * 0.1;
    forge.sigil.rotation.y = elapsed * 0.82;
    forge.sigil.rotation.z = Math.sin(elapsed * 1.6) * 0.12;
    forge.sigil.position.y = 6.45 + Math.sin(elapsed * 2.2) * 0.18;
    forge.sigilGlow.position.y = forge.sigil.position.y;
    forge.sigilGlow.scale.setScalar(3.8 + forgePulse * 0.55);
    forge.sigilGlow.material.opacity = 0.38 + forgePulse * 0.2;
    forge.light.intensity = 1.15 + forgePulse * 0.72;
    forge.sign.rotation.z = Math.sin(elapsed * 0.9) * 0.012;
    const reliquaryPulse = 0.9 + Math.sin(elapsed * 2.7 + 0.8) * 0.1;
    reliquary.sigil.rotation.y = elapsed * 0.48;
    reliquary.sigil.rotation.z = Math.sin(elapsed * 1.25) * 0.1;
    reliquary.sigil.position.y = 6.55 + Math.sin(elapsed * 1.9) * 0.2;
    reliquary.core.rotation.y = -elapsed * 1.35;
    reliquary.core.scale.setScalar(0.9 + reliquaryPulse * 0.12);
    reliquary.glow.position.y = reliquary.sigil.position.y;
    reliquary.glow.scale.setScalar(3.95 + reliquaryPulse * 0.6);
    reliquary.glow.material.opacity = 0.3 + reliquaryPulse * 0.2;
    reliquary.light.intensity = 0.95 + reliquaryPulse * 0.68;
    reliquary.prisms.forEach((prism, index) => {
      prism.rotation.y = elapsed * (index === 0 ? 0.72 : -0.64);
      prism.position.y = 1.65 + Math.sin(elapsed * 2.4 + index * 1.8) * 0.08;
    });
    reliquary.motes.position.y = Math.sin(elapsed * 0.8) * 0.1;
    (reliquary.motes.material as THREE.PointsMaterial).opacity = 0.38 + reliquaryPulse * 0.12;
    const laneSelectionActive = phase === "defense" || phase === "breach";
    for (const lane of ["north", "east", "south", "west"] as const) {
      const isPressure = lane === pressure;
      const laneIsOpen = !laneSelectionActive || activeLanes.includes(lane);
      const gateState = gateStates[lane] ?? { hpRatio: 1, breached: false };
      const crystal = gateCrystals[lane];
      const glow = gateGlows[lane];
      const arch = gateArches[lane];
      const seal = gateSeals[lane];
      const healthBar = gateHealthBars[lane];
      seal.root.visible = laneSelectionActive && !laneIsOpen && !gateState.breached;
      if (seal.root.visible) {
        const sealPulse = 0.76 + Math.sin(elapsed * 2.4 + activeLanes.length) * 0.08;
        (seal.ward.material as THREE.MeshBasicMaterial).opacity = 0.1 + sealPulse * 0.07;
        (seal.ward.material as THREE.MeshBasicMaterial).color.setHex(0x52606a);
        seal.ward.scale.setScalar(0.98 + Math.sin(elapsed * 1.8) * 0.015);
        for (const bar of seal.bars) {
          (bar.material as THREE.MeshLambertMaterial).color.setHex(0x4b555b);
        }
      }
      crystal.rotation.y += gateState.breached ? 0.08 : isPressure ? 0.035 : 0.012;
      crystal.rotation.z = gateState.breached ? Math.sin(elapsed * 6) * 0.35 : 0;
      crystal.scale.setScalar(gateState.breached ? 0.42 : !laneIsOpen ? 0.56 : isPressure ? 1 + Math.sin(elapsed * 9) * 0.16 : 0.72 + gateState.hpRatio * 0.28);
      (crystal.material as THREE.MeshBasicMaterial).color.setHex(gateState.breached ? 0xff413f : !laneIsOpen ? 0x606a70 : LANE_COLOR[lane]);
      glow.material.color.setHex(gateState.breached ? 0xff413f : !laneIsOpen ? 0x67747c : LANE_COLOR[lane]);
      glow.material.opacity = gateState.breached
        ? 0.28 + Math.abs(Math.sin(elapsed * 8)) * 0.25
        : !laneIsOpen
          ? 0.08
          : isPressure
            ? 0.9
            : 0.2 + gateState.hpRatio * 0.18;
      glow.scale.setScalar(gateState.breached ? 6.5 + Math.sin(elapsed * 8) * 1.2 : !laneIsOpen ? 3.1 : isPressure ? 5.5 + Math.sin(elapsed * 9) : 4.2);
      const collapse = gateState.breached ? 1 : 0;
      arch.position.y = THREE.MathUtils.lerp(5.3, 1.05, collapse);
      arch.rotation.z = gateState.breached ? (lane === "north" || lane === "south" ? 0.28 : 0.12) : 0;
      arch.rotation.x = gateState.breached ? (lane === "east" || lane === "west" ? 0.28 : 0.12) : 0;
      arch.scale.y = gateState.breached ? 0.72 : 1;

      const gateRatio = THREE.MathUtils.clamp(gateState.hpRatio, 0, 1);
      healthBar.root.visible = laneSelectionActive && laneIsOpen;
      healthBar.fill.visible = !gateState.breached && gateRatio > 0;
      healthBar.fill.scale.x = 6.5 * gateRatio;
      (healthBar.fill.material as THREE.SpriteMaterial).color.setHex(
        gateState.breached || gateRatio <= 0.25
          ? 0xef635a
          : gateRatio <= 0.6
            ? 0xe0a75a
            : 0x8ed7e6,
      );
      (healthBar.background.material as THREE.SpriteMaterial).color.setHex(gateState.breached ? 0x12080a : 0x0a1115);
      (healthBar.background.material as THREE.SpriteMaterial).opacity = gateState.breached ? 0.72 : 0.9;
    }
    const riftActive = phase === "push";
    riftCore.visible = phase !== "lobby";
    riftGlow.visible = phase !== "lobby";
    riftCore.rotation.y -= riftActive ? 0.026 : 0.009;
    riftCore.rotation.x = Math.sin(elapsed * 0.9) * 0.22;
    if (phase === "victory") {
      const collapse = THREE.MathUtils.clamp(1 - phaseElapsed * 1.25, 0, 1);
      riftCore.visible = collapse > 0.02;
      riftGlow.visible = collapse > 0.02;
      riftCore.scale.set(collapse, collapse * 1.45, collapse);
      riftCore.rotation.y -= 0.16;
      riftCore.rotation.z += 0.09;
      riftGlow.scale.setScalar(17 * collapse + Math.sin(elapsed * 20) * collapse * 3);
      riftGlow.material.opacity = collapse;
    } else {
      const woundedScale = 0.82 + THREE.MathUtils.clamp(riftRatio, 0, 1) * 0.18;
      riftCore.scale.set(woundedScale, woundedScale * 1.45, woundedScale);
      riftGlow.scale.setScalar(17);
      riftGlow.material.opacity = riftActive ? 0.82 + Math.sin(elapsed * 5) * 0.16 : 0.35;
    }
    motes.rotation.y = elapsed * 0.003;
    motes.position.y = Math.sin(elapsed * 0.18) * 0.6;
  }

  return { root, nexusCrystal, nexusGlow, nexusRings, nexusLight, riftCore, riftGlow, braziers, gateCrystals, gateGlows, gateArches, gateSeals, gateHealthBars, motes, update };
}
