import * as THREE from "three";
import {
  HERO_DEFINITIONS,
  HERO_IDS,
  LANE_IDS,
  WORLD_LAYOUT,
} from "../shared/game-data";
import {
  EQUIPMENT_SLOT_COUNT,
  ITEM_DEFINITIONS,
  VENDOR_DEFINITIONS,
  summarizeEquipment,
} from "../shared/armory-data";
import type {
  ActionSnapshot,
  AbilitySlot,
  ClientMessage,
  EffectSnapshot,
  EnemySnapshot,
  EquipmentSlotIndex,
  GameEvent,
  GamePhase,
  GameSnapshot,
  HeroId,
  ItemId,
  LaneId,
  PickupSnapshot,
  PlayerSnapshot,
  ProjectileSnapshot,
  SummonSnapshot,
  ServerMessage,
  Vec2,
  VendorId,
} from "../shared/protocol";
import {
  HERO_PRESENTATION,
  createArena,
  createEffectVisual,
  createEntityVisual,
  createFloatingText,
  createHealthBar,
  createPickupVisual,
  createProjectileVisual,
  createWraithVisual,
  setEntityFlash,
  updateEffectVisual,
  updateEntityVisual,
  updateHealthBar,
  updatePickupVisual,
  updateWraithVisual,
  type EntityVisual,
} from "./visuals";

function requiredElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing #${id}`);
  return element as T;
}

function requiredMatch<T extends Element>(element: T | null, description: string): T {
  if (!element) throw new Error(`Missing ${description}`);
  return element;
}

const viewport = requiredElement<HTMLDivElement>("viewport");
const hud = requiredElement<HTMLElement>("hud");
const heroSelect = requiredElement<HTMLElement>("hero-select");
const heroGrid = requiredElement<HTMLDivElement>("hero-grid");
const playerNameInput = requiredElement<HTMLInputElement>("player-name");
const readyButton = requiredElement<HTMLButtonElement>("ready-button");
const lobbyCount = requiredElement<HTMLSpanElement>("lobby-count");
const lobbyNote = requiredElement<HTMLSpanElement>("lobby-note");
const connectionPill = requiredElement<HTMLDivElement>("connection-pill");
const connectionLabel = requiredElement<HTMLSpanElement>("connection-label");
const heroStatsToggle = requiredElement<HTMLButtonElement>("hero-stats-toggle");
const heroStatsPanel = requiredElement<HTMLElement>("hero-stats-panel");
const heroStatsName = requiredElement<HTMLElement>("hero-stats-name");
const statBasicDamage = requiredElement<HTMLElement>("stat-basic-damage");
const statMaxHealth = requiredElement<HTMLElement>("stat-max-health");
const statAttackRate = requiredElement<HTMLElement>("stat-attack-rate");
const statMoveSpeed = requiredElement<HTMLElement>("stat-move-speed");
const statAbilityPower = requiredElement<HTMLElement>("stat-ability-power");
const statCooldownRecovery = requiredElement<HTMLElement>("stat-cooldown-recovery");
const equipmentCount = requiredElement<HTMLElement>("equipment-count");
const heroEquipmentSlots = requiredElement<HTMLDivElement>("hero-equipment-slots");
const heroEquipmentSummary = requiredElement<HTMLDivElement>("hero-equipment-summary");
const shopPanel = requiredElement<HTMLElement>("shop-panel");
const shopDistrict = requiredElement<HTMLElement>("shop-district");
const shopTitle = requiredElement<HTMLElement>("shop-title");
const shopTagline = requiredElement<HTMLElement>("shop-tagline");
const shopClose = requiredElement<HTMLButtonElement>("shop-close");
const shopGold = requiredElement<HTMLElement>("shop-gold");
const shopEquipmentCount = requiredElement<HTMLElement>("shop-equipment-count");
const shopEquipmentSlots = requiredElement<HTMLDivElement>("shop-equipment-slots");
const shopLoadoutLabel = requiredElement<HTMLElement>("shop-loadout-label");
const shopReplaceGuide = requiredElement<HTMLElement>("shop-replace-guide");
const shopReplaceItem = requiredElement<HTMLElement>("shop-replace-item");
const shopReplaceConfirm = requiredElement<HTMLElement>("shop-replace-confirm");
const shopReplacePreview = requiredElement<HTMLElement>("shop-replace-preview");
const shopReplaceTerms = requiredElement<HTMLElement>("shop-replace-terms");
const shopReplaceSubmit = requiredElement<HTMLButtonElement>("shop-replace-submit");
const shopReplaceCancel = requiredElement<HTMLButtonElement>("shop-replace-cancel");
const shopItems = requiredElement<HTMLDivElement>("shop-items");
const shopAnnouncement = requiredElement<HTMLElement>("shop-announcement");
const teamList = requiredElement<HTMLDivElement>("team-list");
const phaseLabel = requiredElement<HTMLSpanElement>("phase-label");
const waveLabel = requiredElement<HTMLSpanElement>("wave-label");
const nexusBar = requiredElement<HTMLDivElement>("nexus-bar");
const nexusValue = requiredElement<HTMLSpanElement>("nexus-value");
const objectiveCopy = requiredElement<HTMLDivElement>("objective-copy");
const waveBanner = requiredElement<HTMLDivElement>("wave-banner");
const waveKicker = requiredElement<HTMLSpanElement>("wave-kicker");
const waveTitle = requiredElement<HTMLElement>("wave-title");
const waveSubtitle = requiredElement<HTMLSpanElement>("wave-subtitle");
const combatFeed = requiredElement<HTMLDivElement>("combat-feed");
const skillPointCount = requiredElement<HTMLSpanElement>("skill-point-count");
const bossHud = requiredElement<HTMLElement>("boss-hud");
const bossName = requiredElement<HTMLSpanElement>("boss-name");
const bossBar = requiredElement<HTMLDivElement>("boss-bar");
const heroOrb = requiredElement<HTMLDivElement>("hero-orb");
const heroLevel = requiredElement<HTMLSpanElement>("hero-level");
const heroHealth = requiredElement<HTMLDivElement>("hero-health");
const heroHealthValue = requiredElement<HTMLSpanElement>("hero-health-value");
const basicAttackName = requiredElement<HTMLSpanElement>("basic-attack-name");
const abilityBar = requiredElement<HTMLDivElement>("ability-bar");
const goldValue = requiredElement<HTMLElement>("gold-value");
const killsValue = requiredElement<HTMLElement>("kills-value");
const minimap = requiredElement<HTMLCanvasElement>("minimap");
const threatPanel = requiredMatch(minimap.closest<HTMLElement>(".threat-panel"), ".threat-panel");
const threatHeading = requiredMatch(threatPanel.querySelector<HTMLElement>(".eyebrow"), ".threat-panel .eyebrow");
const threatCompass = requiredMatch(threatPanel.querySelector<HTMLElement>(".threat-compass"), ".threat-compass");
const laneStatusList = document.createElement("div");
laneStatusList.className = "lane-status-list";
laneStatusList.setAttribute("aria-label", "Lane deployment status");
threatCompass.insertAdjacentElement("afterend", laneStatusList);
const endScreen = requiredElement<HTMLElement>("end-screen");
const endKicker = requiredElement<HTMLElement>("end-kicker");
const endTitle = requiredElement<HTMLElement>("end-title");
const endCopy = requiredElement<HTMLElement>("end-copy");
const endStats = requiredElement<HTMLDivElement>("end-stats");
const playAgain = requiredElement<HTMLButtonElement>("play-again");
const toastStack = requiredElement<HTMLDivElement>("toast-stack");
const interactionPrompt = requiredElement<HTMLDivElement>("interaction-prompt");

const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-30, 30, 20, -20, 0.1, 300);
camera.position.set(27, 34, 29);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance", alpha: false });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.32;
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.4));
renderer.domElement.setAttribute("aria-label", "Siegeheart battlefield");
viewport.append(renderer.domElement);

const arena = createArena(scene);
const world = new THREE.Group();
scene.add(world);

const aimMarker = new THREE.Group();
const aimRing = new THREE.Mesh(
  new THREE.RingGeometry(0.55, 0.7, 16),
  new THREE.MeshBasicMaterial({ color: 0xbdeeff, transparent: true, opacity: 0.75, side: THREE.DoubleSide, depthWrite: false }),
);
aimRing.rotation.x = -Math.PI / 2;
aimMarker.add(aimRing);
aimMarker.position.y = 0.11;
aimMarker.visible = false;
scene.add(aimMarker);

interface TrackedEntity {
  visual: EntityVisual;
  health: THREE.Group;
  target: THREE.Vector3;
  velocity: Vec2;
  hp: number;
  maxHp: number;
  kind: string;
  facing: Vec2;
  action: ActionSnapshot | null;
}

interface TrackedObject {
  visual: THREE.Object3D;
  target: THREE.Vector3;
  velocity: Vec2;
  seed: number;
}

const playerVisuals = new Map<string, TrackedEntity>();
const enemyVisuals = new Map<string, TrackedEntity>();
const projectileVisuals = new Map<string, TrackedObject>();
const summonVisuals = new Map<string, TrackedObject>();
const pickupVisuals = new Map<string, TrackedObject>();
const effectVisuals = new Map<string, { visual: THREE.Group; snapshot: EffectSnapshot }>();
const floatingTexts: THREE.Sprite[] = [];
const particles: Array<{ mesh: THREE.Mesh; velocity: THREE.Vector3; born: number; life: number }> = [];
const previousHp = new Map<string, number>();
const seenEvents = new Set<string>();

let socket: WebSocket | null = null;
let reconnectTimer: number | null = null;
let localPlayerId: string | null = null;
let selectedHero: HeroId | null = null;
let snapshot: GameSnapshot | null = null;
let previousPhase: GamePhase = "lobby";
let previousWave = 0;
let inputSequence = 0;
let lastFrame = performance.now();
let cameraViewHeight = 72;
let screenShake = 0;
let bannerTimer: number | null = null;
let runStartedAt = 0;
let joinedName = "";
let endTimer: number | null = null;
let endScheduledFor: "victory" | "defeat" | null = null;
let victoryVisualStartedAt: number | null = null;
let heroStatsOpen = false;
let shopOpen = false;
let heroStatsOpenBeforeShop = false;
let activeVendorId: VendorId | null = null;
let replacementItemId: ItemId | null = null;
let replacementSlotIndex: EquipmentSlotIndex | null = null;
let replacementExpectedItemId: ItemId | null = null;
let replacementRequestPending = false;
const keys = new Set<string>();
const pointer = new THREE.Vector2(0, 0);
const aimWorld = new THREE.Vector3(0, 0, -10);
const raycaster = new THREE.Raycaster();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
let attacking = false;
let pointerInside = false;

const LANE_LABELS: Record<LaneId, string> = {
  north: "North",
  east: "East",
  south: "South",
  west: "West",
};

const SHOP_CLOSE_DISTANCE_PADDING = 3;
const ITEM_SYMBOLS: Record<ItemId, string> = {
  tempered_edge: "†",
  fleetstep_greaves: "»",
  runebound_focus: "◆",
  quickening_sigil: "◎",
};
const VENDOR_PRESENTATION: Record<VendorId, { district: string; tagline: string }> = {
  ironbound_forge: {
    district: "NORTHWEST CITADEL",
    tagline: "MARTIAL GOODS · THE SIEGE CONTINUES",
  },
  veilglass_reliquary: {
    district: "NORTHEAST CITADEL",
    tagline: "ARCANE RELICS · THE SIEGE CONTINUES",
  },
};
const shopItemButtons = new Map<ItemId, HTMLButtonElement>();

const laneStatusElements = new Map<LaneId, HTMLElement>();
for (const lane of LANE_IDS) {
  const status = document.createElement("div");
  status.className = "lane-status is-sealed";
  status.dataset.lane = lane;
  status.innerHTML = `<span class="lane-status-name">${LANE_LABELS[lane]}</span><span class="lane-status-state">SEALED</span>`;
  laneStatusList.append(status);
  laneStatusElements.set(lane, status);
}

const minimapWorldPoints: Vec2[] = [
  WORLD_LAYOUT.nexus,
  WORLD_LAYOUT.riftHeart,
  ...Object.values(WORLD_LAYOUT.gates),
  ...Object.values(WORLD_LAYOUT.spawns),
  { x: -WORLD_LAYOUT.defenseHalfExtent, z: -WORLD_LAYOUT.defenseHalfExtent },
  { x: WORLD_LAYOUT.defenseHalfExtent, z: WORLD_LAYOUT.defenseHalfExtent },
  { x: -WORLD_LAYOUT.pushHalfWidth, z: WORLD_LAYOUT.pushNorthZ - 8 },
  { x: WORLD_LAYOUT.pushHalfWidth, z: WORLD_LAYOUT.pushNorthZ - 8 },
];
const minimapWorldBounds = {
  minX: Math.min(...minimapWorldPoints.map((point) => point.x)),
  maxX: Math.max(...minimapWorldPoints.map((point) => point.x)),
  minZ: Math.min(...minimapWorldPoints.map((point) => point.z)),
  maxZ: Math.max(...minimapWorldPoints.map((point) => point.z)),
};

class SiegeAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private lastPlayed = new Map<string, number>();

  unlock(): void {
    if (this.context) {
      if (this.context.state === "suspended") void this.context.resume();
      return;
    }
    const AudioContextClass = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    this.context = new AudioContextClass();
    this.master = this.context.createGain();
    this.master.gain.value = 0.1;
    this.master.connect(this.context.destination);
  }

  play(kind: "attack" | "impact" | "cast" | "warning" | "loot" | "victory"): void {
    if (!this.context || !this.master) return;
    const nowMs = performance.now();
    const throttle = kind === "impact" ? 45 : kind === "attack" ? 90 : 0;
    if (nowMs - (this.lastPlayed.get(kind) ?? 0) < throttle) return;
    this.lastPlayed.set(kind, nowMs);
    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    const filter = this.context.createBiquadFilter();
    const settings = {
      attack: [95, 52, 0.045, "sawtooth"],
      impact: [72, 38, 0.07, "square"],
      cast: [220, 620, 0.16, "triangle"],
      warning: [105, 92, 0.3, "sawtooth"],
      loot: [440, 880, 0.14, "sine"],
      victory: [330, 990, 0.7, "triangle"],
    } as const;
    const [start, end, duration, wave] = settings[kind];
    oscillator.type = wave;
    oscillator.frequency.setValueAtTime(start, now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, end), now + duration);
    filter.type = "lowpass";
    filter.frequency.value = kind === "impact" ? 500 : 1800;
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(kind === "impact" ? 0.32 : 0.18, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    oscillator.connect(filter).connect(gain).connect(this.master);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  }
}

const audio = new SiegeAudio();

function send(message: ClientMessage): void {
  if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
}

function connectionState(state: "connecting" | "online" | "offline", label: string): void {
  connectionPill.classList.remove("is-connecting", "is-online", "is-offline");
  connectionPill.classList.add(`is-${state}`);
  connectionLabel.textContent = label;
}

function connect(): void {
  if (reconnectTimer !== null) window.clearTimeout(reconnectTimer);
  connectionState("connecting", "Opening the war table…");
  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  const debugQuery = new URLSearchParams(location.search).has("debug") ? "?debug=1" : "";
  socket = new WebSocket(`${protocol}//${location.host}/ws${debugQuery}`);
  socket.addEventListener("open", () => {
    connectionState("online", "Realm online");
    const name = cleanName(playerNameInput.value);
    joinedName = name;
    send({ type: "join", name });
  });
  socket.addEventListener("message", (event) => {
    let message: ServerMessage;
    try {
      message = JSON.parse(String(event.data)) as ServerMessage;
    } catch {
      return;
    }
    if (message.type === "welcome") {
      localPlayerId = message.playerId;
      applySnapshot(message.snapshot);
    } else if (message.type === "snapshot") {
      applySnapshot(message.snapshot);
    } else if (message.type === "event") {
      handleEvent(message.event);
    } else if (message.type === "error") {
      const replacementError = new Set([
        "EQUIPMENT_CHANGED",
        "REPLACEMENT_NOT_REQUIRED",
        "INVALID_EQUIPMENT_SLOT",
        "SAME_ITEM",
        "ITEM_NOT_STOCKED",
        "INSUFFICIENT_GOLD",
        "OUT_OF_RANGE",
        "PLAYER_DOWNED",
        "RUN_INACTIVE",
      ]).has(message.code);
      if (replacementRequestPending && replacementError) {
        replacementRequestPending = false;
        if (message.code === "EQUIPMENT_CHANGED") clearReplacementSlot();
        else refreshReplacementState();
        shopAnnouncement.textContent = `${message.message} No gold was spent.`;
      }
      toast(message.message, "warning");
      lobbyNote.textContent = message.message;
    }
  });
  socket.addEventListener("close", () => {
    connectionState("offline", "Reconnecting…");
    socket = null;
    reconnectTimer = window.setTimeout(connect, 1200);
  });
  socket.addEventListener("error", () => socket?.close());
}

function cleanName(name: string): string {
  return name.trim().replace(/[^a-zA-Z0-9 _-]/g, "").slice(0, 18) || "Defender";
}

function heroCss(heroId: HeroId | null): void {
  if (!heroId) return;
  const presentation = HERO_PRESENTATION[heroId];
  document.documentElement.style.setProperty("--hero-color", presentation.color);
  document.documentElement.style.setProperty("--hero-dark", presentation.dark);
}

function isHeroStatsPhase(phase: GamePhase | undefined): boolean {
  return phase === "defense" || phase === "breach" || phase === "push";
}

function setHeroStatsOpen(open: boolean): void {
  const self = snapshot?.players.find((player) => player.id === localPlayerId);
  const nextOpen = open && isHeroStatsPhase(snapshot?.phase) && Boolean(self?.heroId);
  heroStatsOpen = nextOpen;
  heroStatsPanel.classList.toggle("is-hidden", !nextOpen);
  heroStatsPanel.setAttribute("aria-hidden", String(!nextOpen));
  heroStatsToggle.classList.toggle("is-open", nextOpen);
  heroStatsToggle.setAttribute("aria-expanded", String(nextOpen));
  heroStatsToggle.setAttribute("aria-label", `${nextOpen ? "Close" : "Open"} hero stats (C)`);
}

function formatHeroStat(value: number, decimals = 0): string {
  if (!Number.isFinite(value)) return "—";
  const fixed = value.toFixed(decimals);
  return fixed.replace(/\.0+$/, "").replace(/(\.\d*?[1-9])0+$/, "$1");
}

function updateHeroStats(self: PlayerSnapshot): void {
  const stats = self.stats;
  heroStatsName.textContent = self.heroId ? HERO_DEFINITIONS[self.heroId].name : "Defender";
  statBasicDamage.textContent = formatHeroStat(stats.basicDamage, 1);
  statMaxHealth.textContent = formatHeroStat(stats.maxHp);
  statAttackRate.textContent = stats.basicAttackInterval > 0
    ? formatHeroStat(1 / stats.basicAttackInterval, 2)
    : "—";
  statMoveSpeed.textContent = formatHeroStat(stats.moveSpeed, 1);
  statAbilityPower.textContent = `${formatHeroStat(stats.abilityPower * 100)}%`;
  statCooldownRecovery.textContent = `${formatHeroStat(stats.cooldownRecovery * 100)}%`;
}

function distanceBetween(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

function vendorSnapshot(vendorId: VendorId | null, state: GameSnapshot | null = snapshot): GameSnapshot["vendors"][number] | undefined {
  return vendorId ? state?.vendors.find((vendor) => vendor.id === vendorId) : undefined;
}

function currentPlayer(state: GameSnapshot | null = snapshot): PlayerSnapshot | undefined {
  return state?.players.find((player) => player.id === localPlayerId);
}

function nearestInRangeVendor(state: GameSnapshot, self: PlayerSnapshot | undefined): GameSnapshot["vendors"][number] | undefined {
  if (!self?.heroId || self.downed || !isHeroStatsPhase(state.phase)) return undefined;
  return state.vendors
    .filter((vendor) => distanceBetween(self.position, vendor.position) <= vendor.interactionRadius)
    .sort((left, right) => distanceBetween(self.position, left.position) - distanceBetween(self.position, right.position))[0];
}

function equipmentIsFull(equipment: PlayerSnapshot["equipment"]): boolean {
  return equipment.every((itemId) => itemId !== null);
}

function renderEquipmentSlots(
  container: HTMLDivElement,
  equipment: PlayerSnapshot["equipment"],
  incomingItemId: ItemId | null = null,
  selectedSlotIndex: EquipmentSlotIndex | null = null,
): void {
  const key = `${equipment.map((itemId) => itemId ?? "empty").join("|")}|${incomingItemId ?? "read-only"}|${selectedSlotIndex ?? "none"}|${replacementRequestPending ? "pending" : "ready"}`;
  if (container.dataset.equipment === key) return;
  container.dataset.equipment = key;
  container.replaceChildren();
  for (let index = 0; index < EQUIPMENT_SLOT_COUNT; index += 1) {
    const itemId = equipment[index] ?? null;
    const interactive = Boolean(incomingItemId);
    const slot = interactive ? document.createElement("button") : document.createElement("span");
    slot.className = `equipment-slot${itemId ? " has-item" : ""}`;
    slot.dataset.slot = String(index + 1);
    if (interactive && slot instanceof HTMLButtonElement) {
      slot.type = "button";
      const unchanged = itemId === incomingItemId;
      slot.classList.add("is-replace-target");
      slot.classList.toggle("is-unchanged", unchanged);
      slot.classList.toggle("is-selected", index === selectedSlotIndex);
      slot.disabled = !itemId || unchanged || replacementRequestPending;
      slot.addEventListener("click", () => selectReplacementSlot(index as EquipmentSlotIndex));
    }
    if (itemId) {
      const item = ITEM_DEFINITIONS[itemId];
      slot.dataset.item = itemId;
      slot.textContent = ITEM_SYMBOLS[itemId];
      slot.title = `${item.name}: ${item.effectLabel}`;
      const incoming = incomingItemId ? ITEM_DEFINITIONS[incomingItemId] : null;
      slot.setAttribute(
        "aria-label",
        incoming
          ? itemId === incomingItemId
            ? `Slot ${index + 1}: ${item.name}. Already equipped here; choose another slot.`
            : `Slot ${index + 1}: replace ${item.name}, ${item.effectLabel}, with ${incoming.name}, ${incoming.effectLabel}, for ${incoming.price} gold.`
          : `Slot ${index + 1}: ${item.name}, ${item.effectLabel}`,
      );
    } else {
      slot.setAttribute("aria-label", `Slot ${index + 1}: empty`);
    }
    container.append(slot);
  }
}

function renderEquipmentSummary(equipment: PlayerSnapshot["equipment"]): void {
  const key = equipment.map((itemId) => itemId ?? "empty").join("|");
  if (heroEquipmentSummary.dataset.equipment === key) return;
  heroEquipmentSummary.dataset.equipment = key;
  heroEquipmentSummary.replaceChildren();
  const stacks = summarizeEquipment(equipment);
  if (stacks.length === 0) {
    heroEquipmentSummary.hidden = true;
    heroEquipmentSummary.setAttribute("aria-label", "Equipped item totals: none");
    return;
  }
  heroEquipmentSummary.hidden = false;
  heroEquipmentSummary.setAttribute(
    "aria-label",
    stacks
      .map(({ itemId, count, totalEffectLabel }) => `${ITEM_DEFINITIONS[itemId].name}, ${count} ${count === 1 ? "copy" : "copies"}, ${totalEffectLabel}`)
      .join("; "),
  );
  for (const { itemId, count, totalEffectLabel } of stacks) {
    const item = ITEM_DEFINITIONS[itemId];
    const stack = document.createElement("div");
    stack.className = "equipment-stack";
    stack.dataset.item = itemId;
    stack.setAttribute("role", "listitem");
    stack.innerHTML = `
      <span class="equipment-stack-icon" aria-hidden="true">${ITEM_SYMBOLS[itemId]}</span>
      <span class="equipment-stack-copy">
        <strong><span>${item.name}</span><b>×${count}</b></strong>
        <small>${totalEffectLabel}</small>
      </span>`;
    heroEquipmentSummary.append(stack);
  }
}

function updateEquipmentReadouts(self: PlayerSnapshot): void {
  const used = self.equipment.filter((itemId) => itemId !== null).length;
  equipmentCount.textContent = `${used} / ${EQUIPMENT_SLOT_COUNT} SLOTS`;
  shopEquipmentCount.textContent = `${used} / ${EQUIPMENT_SLOT_COUNT}`;
  shopGold.textContent = `${Math.floor(self.gold)} GOLD`;
  renderEquipmentSlots(heroEquipmentSlots, self.equipment);
  renderEquipmentSummary(self.equipment);
  renderEquipmentSlots(shopEquipmentSlots, self.equipment, replacementItemId, replacementSlotIndex);
}

function renderShopCatalog(vendorId: VendorId): void {
  shopItems.replaceChildren();
  shopItemButtons.clear();
  const vendor = VENDOR_DEFINITIONS[vendorId];
  vendor.itemIds.forEach((itemId, index) => {
    const item = ITEM_DEFINITIONS[itemId];
    const button = document.createElement("button");
    button.type = "button";
    button.className = "shop-item";
    button.dataset.item = itemId;
    button.innerHTML = `
      <span class="shop-item-key">${index + 1}</span>
      <span class="shop-item-icon" aria-hidden="true">${ITEM_SYMBOLS[itemId]}</span>
      <strong class="shop-item-name">${item.name}</strong>
      <span class="shop-item-meta"><span class="shop-item-effect">${item.effectLabel}</span><small class="shop-item-owned" data-shop-owned aria-hidden="true">0 OWNED</small></span>
      <small class="shop-item-description">${item.description}</small>
      <span class="shop-item-price"><span>● ${item.price}</span><small data-shop-status>BUY &amp; EQUIP</small></span>`;
    button.addEventListener("click", () => buyShopItem(itemId));
    shopItems.append(button);
    shopItemButtons.set(itemId, button);
  });
}

function updateShopPresentation(vendorId: VendorId, name: string): void {
  const presentation = VENDOR_PRESENTATION[vendorId];
  shopPanel.dataset.vendor = vendorId;
  shopDistrict.textContent = presentation.district;
  shopTitle.textContent = name;
  shopTagline.textContent = presentation.tagline;
  shopClose.setAttribute("aria-label", `Close ${name}`);
  renderShopCatalog(vendorId);
}

function refreshReplacementState(self: PlayerSnapshot | undefined = currentPlayer()): void {
  const selectedItem = replacementItemId ? ITEM_DEFINITIONS[replacementItemId] : null;
  const selectedOutgoingId = replacementSlotIndex !== null ? self?.equipment[replacementSlotIndex] ?? null : null;
  const selectedOutgoing = selectedOutgoingId ? ITEM_DEFINITIONS[selectedOutgoingId] : null;
  const confirming = Boolean(selectedItem && selectedOutgoing && replacementExpectedItemId === selectedOutgoingId);
  shopPanel.classList.toggle("is-replacing", Boolean(selectedItem));
  shopPanel.classList.toggle("is-confirming", confirming);
  shopLoadoutLabel.textContent = confirming ? "CONFIRM THE REFORGE" : selectedItem ? "CHOOSE A SLOT TO DISCARD" : "YOUR LOADOUT";
  shopReplaceGuide.classList.toggle("is-hidden", !selectedItem || confirming);
  shopReplaceGuide.setAttribute("aria-hidden", String(!selectedItem || confirming));
  shopReplaceConfirm.classList.toggle("is-hidden", !confirming);
  shopReplaceConfirm.setAttribute("aria-hidden", String(!confirming));
  if (selectedItem) {
    shopReplaceItem.textContent = replacementRequestPending
      ? `REFORGING ${selectedItem.name.toUpperCase()}…`
      : `${ITEM_SYMBOLS[selectedItem.id]} ${selectedItem.name.toUpperCase()} · ${selectedItem.price} GOLD`;
  }
  if (confirming && selectedItem && selectedOutgoing) {
    shopReplacePreview.textContent = `OUT ${selectedOutgoing.name} ${selectedOutgoing.effectLabel} → IN ${selectedItem.name} ${selectedItem.effectLabel}`;
    shopReplaceTerms.textContent = `${selectedItem.price} GOLD · OLD ITEM DISCARDED`;
  }
  shopReplaceSubmit.disabled = !confirming || replacementRequestPending;
  shopReplaceSubmit.innerHTML = replacementRequestPending ? "REFORGING…" : "BUY &amp; REPLACE <kbd>ENTER</kbd>";
  if (self) {
    renderEquipmentSlots(shopEquipmentSlots, self.equipment, replacementItemId, replacementSlotIndex);
    if (shopOpen) updateShopCards(self);
  }
}

function clearReplacementSelection(announce = false): void {
  if (!replacementItemId && replacementSlotIndex === null && !replacementRequestPending) return;
  replacementItemId = null;
  replacementSlotIndex = null;
  replacementExpectedItemId = null;
  replacementRequestPending = false;
  refreshReplacementState();
  if (announce) shopAnnouncement.textContent = "Replacement cancelled. Choose a ware or close the shop.";
}

function clearReplacementSlot(announce = false): void {
  if (replacementSlotIndex === null && !replacementExpectedItemId) return;
  replacementSlotIndex = null;
  replacementExpectedItemId = null;
  refreshReplacementState();
  if (announce && replacementItemId) {
    const item = ITEM_DEFINITIONS[replacementItemId];
    shopAnnouncement.textContent = `${item.name} remains selected. Choose equipment slot 1 through 6, or press Escape again to cancel.`;
    shopItemButtons.get(replacementItemId)?.focus();
  }
}

function selectReplacementItem(itemId: ItemId): void {
  if (replacementRequestPending) return;
  if (replacementItemId === itemId) {
    clearReplacementSelection(true);
    return;
  }
  replacementItemId = itemId;
  replacementSlotIndex = null;
  replacementExpectedItemId = null;
  const item = ITEM_DEFINITIONS[itemId];
  refreshReplacementState();
  shopAnnouncement.textContent = `${item.name} selected for ${item.price} gold. Choose equipment slot 1 through 6 to replace, or press Escape to cancel.`;
}

function selectReplacementSlot(slotIndex: EquipmentSlotIndex): void {
  const self = currentPlayer();
  if (!shopOpen || !self || !activeVendorId || !replacementItemId || replacementRequestPending) return;
  const vendor = vendorSnapshot(activeVendorId);
  const incoming = ITEM_DEFINITIONS[replacementItemId];
  const outgoingItemId = self.equipment[slotIndex];
  if (!vendor || distanceBetween(self.position, vendor.position) > vendor.interactionRadius) {
    toast(`Move closer to ${vendor?.name ?? "the vendor"}.`, "warning");
    return;
  }
  if (!equipmentIsFull(self.equipment)) {
    clearReplacementSelection();
    toast("Fill the open equipment slot before replacing an item.", "warning");
    return;
  }
  if (!outgoingItemId) {
    toast(`Slot ${slotIndex + 1} is empty.`, "warning");
    return;
  }
  if (outgoingItemId === replacementItemId) {
    toast(`${incoming.name} is already in slot ${slotIndex + 1}.`, "warning");
    return;
  }
  if (self.gold < incoming.price) {
    toast(`Need ${Math.max(1, Math.ceil(incoming.price - self.gold))} more gold.`, "warning");
    return;
  }
  const outgoing = ITEM_DEFINITIONS[outgoingItemId];
  replacementSlotIndex = slotIndex;
  replacementExpectedItemId = outgoingItemId;
  refreshReplacementState(self);
  shopAnnouncement.textContent = `Slot ${slotIndex + 1} selected. Out ${outgoing.name}, ${outgoing.effectLabel}; in ${incoming.name}, ${incoming.effectLabel}; ${incoming.price} gold; old item discarded. Press Enter or choose Buy and Replace to confirm, or Escape to go back.`;
  requestAnimationFrame(() => shopReplaceSubmit.focus());
}

function confirmReplacement(): void {
  const self = currentPlayer();
  if (
    !shopOpen ||
    !self ||
    !activeVendorId ||
    !replacementItemId ||
    replacementSlotIndex === null ||
    !replacementExpectedItemId ||
    replacementRequestPending
  ) return;
  const vendor = vendorSnapshot(activeVendorId);
  const incoming = ITEM_DEFINITIONS[replacementItemId];
  if (!vendor || distanceBetween(self.position, vendor.position) > vendor.interactionRadius) {
    clearReplacementSelection();
    toast(`Move closer to ${vendor?.name ?? "the vendor"}.`, "warning");
    return;
  }
  if (!equipmentIsFull(self.equipment)) {
    clearReplacementSelection();
    toast("Fill the open equipment slot before replacing an item.", "warning");
    return;
  }
  const currentOutgoingItemId = self.equipment[replacementSlotIndex];
  if (currentOutgoingItemId !== replacementExpectedItemId) {
    clearReplacementSlot();
    toast("That equipment slot changed. Choose it again.", "warning");
    shopAnnouncement.textContent = "Equipment changed before confirmation. No gold was spent; choose a slot again.";
    return;
  }
  if (currentOutgoingItemId === replacementItemId) {
    clearReplacementSlot();
    toast(`${incoming.name} is already in that slot.`, "warning");
    return;
  }
  if (self.gold < incoming.price) {
    toast(`Need ${Math.max(1, Math.ceil(incoming.price - self.gold))} more gold.`, "warning");
    return;
  }
  const outgoing = ITEM_DEFINITIONS[currentOutgoingItemId];
  replacementRequestPending = true;
  refreshReplacementState(self);
  shopAnnouncement.textContent = `Reforging slot ${replacementSlotIndex + 1}: ${outgoing.name} into ${incoming.name}.`;
  audio.unlock();
  send({
    type: "replace_item",
    vendorId: activeVendorId,
    itemId: replacementItemId,
    slotIndex: replacementSlotIndex,
    expectedItemId: replacementExpectedItemId,
  });
}

function updateShopCards(self: PlayerSnapshot, withinPurchaseRange = true): void {
  const slotsFull = equipmentIsFull(self.equipment);
  const vendorName = vendorSnapshot(activeVendorId)?.name ?? "vendor";
  for (const [itemId, button] of shopItemButtons) {
    const item = ITEM_DEFINITIONS[itemId];
    const affordable = self.gold >= item.price;
    const selected = replacementItemId === itemId;
    const canBuy = !self.downed && withinPurchaseRange && affordable && !replacementRequestPending;
    const status = button.querySelector<HTMLElement>("[data-shop-status]");
    const owned = self.equipment.filter((equippedItemId) => equippedItemId === itemId).length;
    const ownedLabel = button.querySelector<HTMLElement>("[data-shop-owned]");
    if (ownedLabel) {
      ownedLabel.textContent = `${owned} OWNED`;
      ownedLabel.classList.toggle("has-items", owned > 0);
    }
    button.disabled = !canBuy;
    button.classList.toggle("can-buy", canBuy);
    button.classList.toggle("is-selected", selected);
    if (status) {
      status.textContent = !withinPurchaseRange
        ? "MOVE CLOSER"
        : replacementRequestPending && selected
          ? "REFORGING"
          : slotsFull && selected && replacementSlotIndex !== null
            ? "CONFIRM BELOW"
            : slotsFull && selected
              ? "SELECT SLOT"
              : slotsFull
                ? "REPLACE ITEM"
                : affordable
                  ? "BUY & EQUIP"
                  : `NEED ${Math.max(1, Math.ceil(item.price - self.gold))}`;
    }
    button.setAttribute(
      "aria-label",
      `${item.name}, ${item.effectLabel}, ${item.price} gold. You own ${owned} ${owned === 1 ? "copy" : "copies"}. ${!withinPurchaseRange
        ? `Move closer to ${vendorName}.`
        : replacementRequestPending && selected
          ? "Replacement request pending."
          : slotsFull && selected && replacementSlotIndex !== null
            ? "Selected. Confirm the exact replacement below."
            : slotsFull && selected
              ? "Selected. Choose equipment slot 1 through 6 to replace."
              : slotsFull && affordable
                ? "Select this ware, then choose an occupied equipment slot to replace."
                : affordable
                  ? "Buy and equip."
                  : `Need ${Math.max(1, Math.ceil(item.price - self.gold))} more gold.`}`,
    );
  }
}

function canOpenVendor(state: GameSnapshot, self: PlayerSnapshot | undefined, vendorId: VendorId | null): boolean {
  const vendor = vendorSnapshot(vendorId, state);
  return Boolean(
    vendor &&
    self?.heroId &&
    !self.downed &&
    isHeroStatsPhase(state.phase) &&
    distanceBetween(self.position, vendor.position) <= vendor.interactionRadius,
  );
}

function setShopOpen(open: boolean, requestedVendorId: VendorId | null = null): void {
  const state = snapshot;
  const self = currentPlayer(state);
  const targetVendorId = open && state
    ? requestedVendorId ?? nearestInRangeVendor(state, self)?.id ?? null
    : null;
  const nextOpen = Boolean(open && state && targetVendorId && canOpenVendor(state, self, targetVendorId));
  if (nextOpen && shopOpen && activeVendorId === targetVendorId) return;
  if (!nextOpen && !shopOpen) return;
  if (nextOpen) {
    if (!shopOpen) heroStatsOpenBeforeShop = heroStatsOpen;
    shopOpen = true;
    activeVendorId = targetVendorId;
    replacementItemId = null;
    replacementSlotIndex = null;
    replacementExpectedItemId = null;
    replacementRequestPending = false;
    const vendor = vendorSnapshot(activeVendorId, state);
    if (activeVendorId && vendor) {
      updateShopPresentation(activeVendorId, vendor.name);
      shopAnnouncement.textContent = `${vendor.name} opened. ${vendor.itemIds.map((itemId) => ITEM_DEFINITIONS[itemId].name).join(" and ")} available.`;
    }
    setHeroStatsOpen(true);
    interactionPrompt.classList.add("is-hidden");
  } else {
    const restoreStats = heroStatsOpenBeforeShop;
    shopOpen = false;
    activeVendorId = null;
    replacementItemId = null;
    replacementSlotIndex = null;
    replacementExpectedItemId = null;
    replacementRequestPending = false;
    shopAnnouncement.textContent = "Shop closed.";
    setHeroStatsOpen(restoreStats);
  }
  shopPanel.classList.toggle("is-hidden", !shopOpen);
  shopPanel.setAttribute("aria-hidden", String(!shopOpen));
  refreshReplacementState(self);
}

function buyShopItem(itemId: ItemId): void {
  const self = currentPlayer();
  if (!shopOpen || !self || !activeVendorId) return;
  const vendor = vendorSnapshot(activeVendorId);
  if (!vendor || distanceBetween(self.position, vendor.position) > vendor.interactionRadius) {
    toast(`Move closer to ${vendor?.name ?? "the vendor"}.`, "warning");
    return;
  }
  const item = ITEM_DEFINITIONS[itemId];
  if (self.gold < item.price) {
    toast(`Need ${Math.max(1, Math.ceil(item.price - self.gold))} more gold.`, "warning");
    return;
  }
  if (equipmentIsFull(self.equipment)) {
    selectReplacementItem(itemId);
    return;
  }
  clearReplacementSelection();
  audio.unlock();
  send({ type: "buy_item", vendorId: activeVendorId, itemId });
}

function updateArmoryUi(state: GameSnapshot, self: PlayerSnapshot | undefined): void {
  if (!self) {
    if (shopOpen) setShopOpen(false);
    interactionPrompt.classList.add("is-hidden");
    return;
  }

  if (replacementItemId && !equipmentIsFull(self.equipment)) clearReplacementSelection();
  if (
    replacementSlotIndex !== null &&
    replacementExpectedItemId &&
    self.equipment[replacementSlotIndex] !== replacementExpectedItemId &&
    !replacementRequestPending
  ) {
    clearReplacementSlot();
    shopAnnouncement.textContent = "Equipment changed. No gold was spent; choose a slot again.";
  }
  updateEquipmentReadouts(self);
  const openedVendor = vendorSnapshot(activeVendorId, state);
  if (shopOpen) {
    if (!openedVendor || self.downed || !isHeroStatsPhase(state.phase) || distanceBetween(self.position, openedVendor.position) > openedVendor.interactionRadius + SHOP_CLOSE_DISTANCE_PADDING) {
      setShopOpen(false);
    }
  }

  const nearbyVendor = nearestInRangeVendor(state, self);
  interactionPrompt.classList.toggle("is-hidden", !nearbyVendor || shopOpen);
  interactionPrompt.classList.toggle("is-shop", Boolean(nearbyVendor && !shopOpen));
  if (nearbyVendor && !shopOpen) {
    if (interactionPrompt.dataset.vendor !== nearbyVendor.id) {
      interactionPrompt.dataset.vendor = nearbyVendor.id;
      interactionPrompt.innerHTML = `<kbd>B</kbd> BROWSE · ${nearbyVendor.name.toUpperCase()}`;
    }
  } else {
    delete interactionPrompt.dataset.vendor;
  }
  const activeVendor = vendorSnapshot(activeVendorId, state);
  if (shopOpen && activeVendor) {
    updateShopCards(self, distanceBetween(self.position, activeVendor.position) <= activeVendor.interactionRadius);
  }
}

function pulsePurchasedStat(itemId: ItemId | undefined): void {
  const value = itemId === "tempered_edge"
    ? statBasicDamage
    : itemId === "fleetstep_greaves"
      ? statMoveSpeed
      : itemId === "runebound_focus"
        ? statAbilityPower
        : itemId === "quickening_sigil"
          ? statCooldownRecovery
          : null;
  const stat = value?.closest<HTMLElement>(".hero-stat");
  if (!stat) return;
  stat.classList.remove("is-purchased");
  requestAnimationFrame(() => {
    stat.classList.add("is-purchased");
    window.setTimeout(() => stat.classList.remove("is-purchased"), 760);
  });
}

function renderHeroCards(): void {
  heroGrid.replaceChildren();
  for (const heroId of HERO_IDS) {
    const definition = HERO_DEFINITIONS[heroId];
    const presentation = HERO_PRESENTATION[heroId];
    const card = document.createElement("button");
    card.type = "button";
    card.className = "hero-card";
    card.dataset.hero = heroId;
    card.style.setProperty("--card-color", presentation.color);
    card.innerHTML = `
      <span class="hero-card-art"><span class="hero-card-runes"></span><span class="hero-silhouette"></span></span>
      <span class="hero-owner is-hidden"></span>
      <span class="hero-card-copy">
        <span class="hero-role">${definition.role}</span>
        <h3>${definition.name}</h3>
        <p>${presentation.fantasy}</p>
        <span class="hero-tags"><span>${presentation.tags[0]}</span><span>${presentation.tags[1]}</span></span>
      </span>`;
    card.addEventListener("click", () => chooseHero(heroId));
    heroGrid.append(card);
  }
}

function chooseHero(heroId: HeroId): void {
  audio.unlock();
  const ownerId = snapshot?.lobby.claimedHeroes[heroId];
  if (ownerId && ownerId !== localPlayerId) return;
  selectedHero = heroId;
  heroCss(heroId);
  if (joinedName !== cleanName(playerNameInput.value)) {
    joinedName = cleanName(playerNameInput.value);
    send({ type: "join", name: joinedName });
  }
  send({ type: "claim_hero", heroId });
  updateLobby();
}

function updateLobby(): void {
  if (!snapshot) return;
  const self = snapshot.players.find((player) => player.id === localPlayerId);
  if (self?.heroId) selectedHero = self.heroId;
  for (const card of heroGrid.querySelectorAll<HTMLButtonElement>(".hero-card")) {
    const heroId = card.dataset.hero as HeroId;
    const ownerId = snapshot.lobby.claimedHeroes[heroId];
    const owner = ownerId ? snapshot.players.find((player) => player.id === ownerId) : undefined;
    const isSelf = ownerId === localPlayerId;
    card.classList.toggle("is-selected", isSelf || selectedHero === heroId && !ownerId);
    card.classList.toggle("is-taken", Boolean(ownerId && !isSelf));
    card.disabled = Boolean(ownerId && !isSelf);
    const ownerLabel = card.querySelector<HTMLElement>(".hero-owner");
    if (ownerLabel) {
      ownerLabel.classList.toggle("is-hidden", !ownerId);
      ownerLabel.textContent = isSelf ? "YOUR HERO" : `${owner?.name ?? "ALLY"} CLAIMED`;
    }
  }
  lobbyCount.textContent = `${snapshot.players.length} / 4 defender${snapshot.players.length === 1 ? "" : "s"}`;
  const isHost = snapshot.lobby.hostId === localPlayerId;
  readyButton.disabled = !self?.heroId;
  if (!self?.heroId) {
    setReadyText("CHOOSE A HERO", "ONE DEFENDER · ONE LEGEND");
    lobbyNote.textContent = "Choose a hero to reserve them";
  } else if (!self.ready) {
    setReadyText("READY", "ENTER THE CITY");
    lobbyNote.textContent = `${HERO_DEFINITIONS[self.heroId].name} reserved for you`;
  } else if (isHost && snapshot.lobby.canStart) {
    setReadyText("START THE SIEGE", "YOUR PARTY IS READY");
    lobbyNote.textContent = "The war table awaits your command";
  } else if (isHost) {
    setReadyText("CANCEL READY", "WAITING FOR THE PARTY");
    lobbyNote.textContent = "Waiting for every defender to ready up";
  } else {
    setReadyText("CANCEL READY", "WAITING FOR THE HOST");
    lobbyNote.textContent = "Ready — the host will begin the siege";
  }
}

function setReadyText(main: string, sub: string): void {
  const mainElement = readyButton.querySelector<HTMLElement>(".ready-main");
  const subElement = readyButton.querySelector<HTMLElement>(".ready-sub");
  if (mainElement) mainElement.textContent = main;
  if (subElement) subElement.textContent = sub;
}

readyButton.addEventListener("click", () => {
  audio.unlock();
  if (!snapshot) return;
  const self = snapshot.players.find((player) => player.id === localPlayerId);
  if (!self?.heroId) return;
  if (self.ready && snapshot.lobby.hostId === localPlayerId && snapshot.lobby.canStart) {
    send({ type: "start" });
    setReadyText("OPENING THE GATES…", "THE CITY MUST HOLD");
    return;
  }
  send({ type: "set_ready", ready: !self.ready });
});

playerNameInput.addEventListener("change", () => {
  playerNameInput.value = cleanName(playerNameInput.value);
  if (socket?.readyState === WebSocket.OPEN) {
    joinedName = playerNameInput.value;
    send({ type: "join", name: joinedName });
  }
});

playAgain.addEventListener("click", () => {
  if (!snapshot || !localPlayerId) return;
  if (snapshot.lobby.hostId !== localPlayerId) {
    toast("Waiting for the host to reopen the war table.", "warning");
    return;
  }
  send({ type: "reset_run" });
  playAgain.disabled = true;
  const replayMain = playAgain.querySelector<HTMLElement>(".ready-main");
  const replaySub = playAgain.querySelector<HTMLElement>(".ready-sub");
  if (replayMain) replayMain.textContent = "RETURNING…";
  if (replaySub) replaySub.textContent = "REOPENING THE WAR TABLE";
});

function handleEvent(event: GameEvent): void {
  if (seenEvents.has(event.id)) return;
  seenEvents.add(event.id);
  if (seenEvents.size > 200) {
    const oldest = seenEvents.values().next().value as string | undefined;
    if (oldest) seenEvents.delete(oldest);
  }
  const eventKind = String(event.kind);
  const warning = eventKind === "gate_breached" || eventKind === "player_downed" || eventKind === "defeat";
  const powerGained = eventKind === "skill_point" || eventKind === "ability_leveled" || eventKind === "item_purchased";
  addFeed(event.text, warning ? "warning" : powerGained ? "loot" : undefined);
  if (event.kind === "wave") showBanner("THE HORNS SOUND", event.text.toUpperCase(), event.lane?.toUpperCase() ?? "THE OUTER ROAD");
  if (event.kind === "gate_breached") {
    toast(event.text, "warning");
    audio.play("warning");
    screenShake = Math.max(screenShake, 1.2);
  } else if (eventKind === "skill_point") {
    toast("Skill point ready — choose Q, E, R, or F", "loot");
    audio.play("loot");
  } else if (event.kind === "item_purchased" && event.playerId === localPlayerId) {
    const self = currentPlayer();
    const position = event.position ?? self?.position ?? (event.vendorId ? VENDOR_DEFINITIONS[event.vendorId].position : WORLD_LAYOUT.nexus);
    if (event.replacedItemId) {
      clearReplacementSelection();
      shopAnnouncement.textContent = `${event.text} Build remains six of six.`;
    }
    toast(event.text, "loot");
    audio.play("loot");
    spawnBurst(position, 0xf1c56f, 13, 1.15);
    pulsePurchasedStat(event.itemId);
    if (event.replacedItemId) pulsePurchasedStat(event.replacedItemId);
  } else if (event.kind === "rift_exposed") {
    showBanner("THE BARRIER RISES", "COUNTERATTACK", "DESTROY THE RIFT HEART");
    audio.play("cast");
  } else if (event.kind === "victory") {
    const riftPosition = snapshot?.riftHeart.position ?? WORLD_LAYOUT.riftHeart;
    spawnBurst(riftPosition, 0xc06cff, 48, 2.8);
    spawnBurst(riftPosition, 0x91e8ff, 24, 3.7);
    screenShake = Math.max(screenShake, 2.4);
    audio.play("victory");
  }
}

function addFeed(text: string, variant?: "warning" | "loot"): void {
  const line = document.createElement("div");
  line.className = `feed-line${variant ? ` is-${variant}` : ""}`;
  line.textContent = text;
  combatFeed.prepend(line);
  while (combatFeed.children.length > 6) combatFeed.lastElementChild?.remove();
  window.setTimeout(() => line.remove(), 8500);
}

function toast(text: string, variant?: "warning" | "loot"): void {
  const element = document.createElement("div");
  element.className = `toast${variant ? ` is-${variant}` : ""}`;
  element.textContent = text;
  toastStack.append(element);
  window.setTimeout(() => element.remove(), 3200);
}

function showBanner(kicker: string, title: string, subtitle: string): void {
  if (bannerTimer !== null) window.clearTimeout(bannerTimer);
  waveKicker.textContent = kicker;
  waveTitle.textContent = title;
  waveSubtitle.textContent = subtitle;
  waveBanner.classList.add("is-visible");
  bannerTimer = window.setTimeout(() => waveBanner.classList.remove("is-visible"), 2600);
}

function applySnapshot(next: GameSnapshot): void {
  const firstSnapshot = snapshot === null;
  snapshot = next;
  if (next.phase === "victory" && previousPhase !== "victory") {
    victoryVisualStartedAt = performance.now();
  } else if (next.phase !== "victory") {
    victoryVisualStartedAt = null;
  }
  for (const event of next.events) handleEvent(event);
  const self = next.players.find((player) => player.id === localPlayerId);
  if (self?.heroId) {
    selectedHero = self.heroId;
    heroCss(self.heroId);
  }
  const heroStatsAvailable = Boolean(self?.heroId) && isHeroStatsPhase(next.phase);
  heroStatsToggle.classList.toggle("is-hidden", !heroStatsAvailable);
  if (!heroStatsAvailable) setHeroStatsOpen(false);

  if (next.phase !== previousPhase) {
    if (!firstSnapshot) onPhaseChanged(next.phase);
    previousPhase = next.phase;
  }
  if (next.wave.number !== previousWave && next.phase === "defense") {
    previousWave = next.wave.number;
    showBanner("THE HORNS SOUND", `WAVE ${roman(Math.max(1, next.wave.number))}`, next.pressureLane?.toUpperCase() ?? "MULTIPLE FRONTS");
  }
  updateLobby();
  syncPlayers(next.players);
  syncEnemies(next.enemies);
  syncProjectiles(next.projectiles);
  syncSummons(next.summons);
  syncPickups(next.pickups);
  syncEffects(next.effects);
  updateHud(next, self);
  updateArmoryUi(next, self);
  heroSelect.classList.toggle("is-hidden", next.phase !== "lobby");
  hud.classList.toggle("is-hidden", next.phase === "lobby");
  if (next.phase !== "victory" && next.phase !== "defeat") {
    if (endTimer !== null) window.clearTimeout(endTimer);
    endTimer = null;
    endScheduledFor = null;
    endScreen.classList.add("is-hidden");
  }
  if (next.phase === "lobby") runStartedAt = 0;
  if (next.phase !== "lobby" && runStartedAt === 0) runStartedAt = performance.now();
  if (next.phase === "victory" || next.phase === "defeat") scheduleEnd(next.phase);
}

function scheduleEnd(phase: "victory" | "defeat"): void {
  if (endScheduledFor === phase) return;
  if (endTimer !== null) window.clearTimeout(endTimer);
  endScheduledFor = phase;
  endTimer = window.setTimeout(() => {
    if (!snapshot || snapshot.phase !== phase) return;
    showEnd(snapshot, snapshot.players.find((player) => player.id === localPlayerId));
  }, phase === "victory" ? 1450 : 550);
}

function onPhaseChanged(phase: GamePhase): void {
  if (phase === "defense") showBanner("THE FIRST BREACH", "DEFEND THE NEXUS", "HOLD THE FOUR GATES");
  else if (phase === "breach") showBanner("THE WALLS TREMBLE", "SIEGE COMMANDER", "SURVIVE THE PRESSURE");
  else if (phase === "push") showBanner("THE HEARTFIRE ANSWERS", "COUNTERATTACK", "FOLLOW THE NORTH ROAD");
  if (phase !== "lobby") screenShake = Math.max(screenShake, 0.5);
}

function roman(number: number): string {
  return ["0", "I", "II", "III", "IV", "V", "VI", "VII", "VIII"][number] ?? String(number);
}

function trackedPlayer(player: PlayerSnapshot): TrackedEntity | null {
  if (!player.heroId) return null;
  let tracked = playerVisuals.get(player.id);
  if (!tracked || tracked.kind !== player.heroId) {
    if (tracked) world.remove(tracked.visual);
    const visual = createEntityVisual("hero", player.heroId);
    const health = createHealthBar(HERO_DEFINITIONS[player.heroId].accent, 4.5);
    health.position.y = 7;
    visual.add(health);
    visual.position.set(player.position.x, 0, player.position.z);
    world.add(visual);
    tracked = {
      visual,
      health,
      target: visual.position.clone(),
      velocity: player.velocity,
      hp: player.hp,
      maxHp: player.maxHp,
      kind: player.heroId,
      facing: player.aim,
      action: player.action,
    };
    playerVisuals.set(player.id, tracked);
  }
  return tracked;
}

function syncPlayers(players: PlayerSnapshot[]): void {
  const active = new Set<string>();
  for (const player of players) {
    if (!player.heroId) continue;
    active.add(player.id);
    const tracked = trackedPlayer(player);
    if (!tracked) continue;
    tracked.target.set(player.position.x, 0, player.position.z);
    tracked.velocity = player.velocity;
    tracked.facing = player.aim;
    tracked.action = player.action;
    tracked.visual.userData.isLocal = player.id === localPlayerId;
    const oldHp = previousHp.get(`p-${player.id}`);
    if (oldHp !== undefined && player.hp < oldHp) damageFeedback(tracked, oldHp - player.hp, player.position, true);
    previousHp.set(`p-${player.id}`, player.hp);
    tracked.hp = player.hp;
    tracked.maxHp = player.maxHp;
    updateHealthBar(tracked.health, player.hp / Math.max(1, player.maxHp));
    tracked.visual.visible = snapshot?.phase !== "lobby" || player.ready;
    tracked.visual.scale.setScalar(player.downed ? 0.72 : 1);
    tracked.visual.rotation.z = player.downed ? Math.PI / 2 : 0;
  }
  for (const [id, tracked] of playerVisuals) {
    if (active.has(id)) continue;
    world.remove(tracked.visual);
    playerVisuals.delete(id);
  }
}

function syncEnemies(enemies: EnemySnapshot[]): void {
  const active = new Set<string>();
  for (const enemy of enemies) {
    active.add(enemy.id);
    let tracked = enemyVisuals.get(enemy.id);
    const visualKind = `${enemy.kind}-${enemy.elite}`;
    if (!tracked || tracked.kind !== visualKind) {
      if (tracked) world.remove(tracked.visual);
      const visual = createEntityVisual(enemy.kind, enemy.kind, enemy.elite);
      const health = createHealthBar(enemy.elite ? 0xd87cff : 0xe1545d, enemy.elite ? 4.5 : 3.3);
      health.position.y = visual.userData.baseScale + 0.35;
      visual.add(health);
      visual.position.set(enemy.position.x, 0, enemy.position.z);
      world.add(visual);
      tracked = {
        visual,
        health,
        target: visual.position.clone(),
        velocity: enemy.velocity,
        hp: enemy.hp,
        maxHp: enemy.maxHp,
        kind: visualKind,
        facing: enemy.facing,
        action: enemy.action,
      };
      enemyVisuals.set(enemy.id, tracked);
      spawnBurst(enemy.position, enemy.elite ? 0xc46eff : 0x8e2e43, enemy.elite ? 7 : 3, 0.6);
    }
    tracked.target.set(enemy.position.x, 0, enemy.position.z);
    tracked.velocity = enemy.velocity;
    tracked.facing = enemy.facing;
    tracked.action = enemy.action;
    const oldHp = previousHp.get(`e-${enemy.id}`);
    if (oldHp !== undefined && enemy.hp < oldHp) damageFeedback(tracked, oldHp - enemy.hp, enemy.position, false);
    previousHp.set(`e-${enemy.id}`, enemy.hp);
    tracked.hp = enemy.hp;
    tracked.maxHp = enemy.maxHp;
    updateHealthBar(tracked.health, enemy.hp / Math.max(1, enemy.maxHp));
  }
  for (const [id, tracked] of enemyVisuals) {
    if (active.has(id)) continue;
    spawnBurst({ x: tracked.visual.position.x, z: tracked.visual.position.z }, 0xd55a6a, tracked.kind.includes("true") ? 12 : 5, 1.1);
    world.remove(tracked.visual);
    enemyVisuals.delete(id);
    previousHp.delete(`e-${id}`);
  }
}

function damageFeedback(tracked: TrackedEntity, amount: number, position: Vec2, player: boolean): void {
  const now = performance.now();
  setEntityFlash(tracked.visual, now, player ? 0xff776d : 0xffffff);
  const text = createFloatingText(`${Math.max(1, Math.round(amount))}`, player ? "#ff7b70" : "#ffe8a3", amount >= 50 ? 20 : 16);
  text.position.set(position.x + (Math.random() - 0.5) * 0.8, tracked.visual.userData.baseScale + 1.3, position.z);
  scene.add(text);
  floatingTexts.push(text);
  screenShake = Math.max(screenShake, player ? 0.65 : amount >= 50 ? 0.45 : 0.18);
  audio.play("impact");
}

function syncProjectiles(projectiles: ProjectileSnapshot[]): void {
  const active = new Set<string>();
  for (const projectile of projectiles) {
    active.add(projectile.id);
    let tracked = projectileVisuals.get(projectile.id);
    if (!tracked) {
      const visual = createProjectileVisual(projectile.kind, projectile.team);
      visual.position.set(projectile.position.x, 0, projectile.position.z);
      world.add(visual);
      tracked = { visual, target: visual.position.clone(), velocity: projectile.velocity, seed: Math.random() * 10 };
      projectileVisuals.set(projectile.id, tracked);
    }
    tracked.target.set(projectile.position.x, 0, projectile.position.z);
    tracked.velocity = projectile.velocity;
    tracked.visual.rotation.y = Math.atan2(-projectile.velocity.z, projectile.velocity.x);
  }
  for (const [id, tracked] of projectileVisuals) {
    if (active.has(id)) continue;
    world.remove(tracked.visual);
    projectileVisuals.delete(id);
  }
}

function syncSummons(summons: SummonSnapshot[]): void {
  const active = new Set<string>();
  for (const summon of summons) {
    active.add(summon.id);
    let tracked = summonVisuals.get(summon.id);
    if (!tracked) {
      const visual = createWraithVisual();
      visual.position.set(summon.position.x, 0, summon.position.z);
      world.add(visual);
      tracked = { visual, target: visual.position.clone(), velocity: summon.velocity, seed: Math.random() * 10 };
      summonVisuals.set(summon.id, tracked);
      spawnBurst(summon.position, 0x72e4b7, 7, 0.8);
    }
    tracked.target.set(summon.position.x, 0, summon.position.z);
    tracked.velocity = summon.velocity;
    tracked.visual.rotation.y = Math.atan2(-summon.facing.z, summon.facing.x);
  }
  for (const [id, tracked] of summonVisuals) {
    if (active.has(id)) continue;
    spawnBurst({ x: tracked.visual.position.x, z: tracked.visual.position.z }, 0x72e4b7, 5, 0.65);
    world.remove(tracked.visual);
    summonVisuals.delete(id);
  }
}

function syncPickups(pickups: PickupSnapshot[]): void {
  const active = new Set<string>();
  for (const pickup of pickups) {
    active.add(pickup.id);
    let tracked = pickupVisuals.get(pickup.id);
    if (!tracked) {
      const visual = createPickupVisual(pickup.kind);
      visual.position.set(pickup.position.x, 0, pickup.position.z);
      world.add(visual);
      tracked = { visual, target: visual.position.clone(), velocity: { x: 0, z: 0 }, seed: Math.random() * 10 };
      pickupVisuals.set(pickup.id, tracked);
    }
    tracked.target.set(pickup.position.x, 0, pickup.position.z);
  }
  for (const [id, tracked] of pickupVisuals) {
    if (active.has(id)) continue;
    spawnBurst({ x: tracked.visual.position.x, z: tracked.visual.position.z }, 0xffd35f, 4, 0.7);
    world.remove(tracked.visual);
    pickupVisuals.delete(id);
  }
}

function syncEffects(effects: EffectSnapshot[]): void {
  const active = new Set<string>();
  for (const effect of effects) {
    active.add(effect.id);
    let tracked = effectVisuals.get(effect.id);
    if (!tracked) {
      const visual = createEffectVisual(effect.kind, effect.radius, effect.rotation);
      visual.position.set(effect.position.x, 0, effect.position.z);
      world.add(visual);
      tracked = { visual, snapshot: effect };
      effectVisuals.set(effect.id, tracked);
      if (effect.kind !== "meteor_warning" && effect.kind !== "snare") {
        const effectColor = effect.kind === "fire" || effect.kind === "meteor" ? 0xff7442 : effect.kind === "souls" || effect.kind === "heal" ? 0x6be3ad : 0x8cdcff;
        spawnBurst(effect.position, effectColor, effect.kind === "meteor" ? 20 : 7, Math.min(2.2, effect.radius * 0.25));
      }
      if (effect.kind === "meteor" || effect.kind === "nexus_hit" || effect.kind === "gate_hit") screenShake = Math.max(screenShake, effect.kind === "meteor" ? 1.1 : 0.55);
    }
    tracked.snapshot = effect;
    tracked.visual.position.set(effect.position.x, 0, effect.position.z);
  }
  for (const [id, tracked] of effectVisuals) {
    if (active.has(id)) continue;
    world.remove(tracked.visual);
    effectVisuals.delete(id);
  }
}

function spawnBurst(position: Vec2, color: number, count: number, force: number): void {
  const material = new THREE.MeshBasicMaterial({ color, transparent: true });
  for (let index = 0; index < count; index += 1) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.16 + Math.random() * 0.18, 0.16 + Math.random() * 0.18, 0.16), material.clone());
    mesh.position.set(position.x, 0.7 + Math.random() * 1.8, position.z);
    world.add(mesh);
    const angle = Math.random() * Math.PI * 2;
    particles.push({
      mesh,
      velocity: new THREE.Vector3(Math.cos(angle) * force * (1 + Math.random()), 1.6 + Math.random() * force * 1.8, Math.sin(angle) * force * (1 + Math.random())),
      born: performance.now(),
      life: 350 + Math.random() * 500,
    });
  }
}

const PHASE_LABELS: Record<GamePhase, string> = {
  lobby: "THE WAR TABLE",
  defense: "HOLD THE CITY",
  breach: "THE FIRST BREACH",
  push: "THE COUNTERATTACK",
  victory: "THE CITY ENDURES",
  defeat: "THE HEARTFIRE FALLS",
};

function updateHud(state: GameSnapshot, self: PlayerSnapshot | undefined): void {
  phaseLabel.textContent = PHASE_LABELS[state.phase];
  waveLabel.textContent = state.phase === "defense" ? `WAVE ${Math.max(1, state.wave.number)} / ${state.wave.total}` : state.phase === "push" ? "RIFT ASSAULT" : state.phase === "breach" ? "SIEGE EVENT" : "";
  objectiveCopy.textContent = state.objective;
  const nexusRatio = state.nexus.hp / Math.max(1, state.nexus.maxHp);
  nexusBar.style.width = `${Math.max(0, nexusRatio * 100)}%`;
  nexusBar.classList.toggle("is-critical", nexusRatio < 0.3);
  nexusValue.textContent = `${Math.ceil(nexusRatio * 100)}%`;
  updateThreats(state);
  updateTeam(state.players);
  updateMinimap(state);

  if (state.riftHeart.active && state.riftHeart.maxHp > 0) {
    bossHud.classList.remove("is-hidden");
    bossName.textContent = "THE RIFT HEART";
    bossBar.style.width = `${Math.max(0, (state.riftHeart.hp / state.riftHeart.maxHp) * 100)}%`;
  } else {
    bossHud.classList.add("is-hidden");
  }

  if (!self) return;
  heroLevel.textContent = String(self.level);
  heroHealth.style.width = `${Math.max(0, (self.hp / Math.max(1, self.maxHp)) * 100)}%`;
  heroHealthValue.textContent = `${Math.ceil(self.hp)} / ${self.maxHp}${self.barrier > 0 ? `  +${Math.ceil(self.barrier)}` : ""}`;
  goldValue.textContent = String(Math.floor(self.gold));
  killsValue.textContent = String(self.kills);
  if (self.heroId) {
    heroOrb.dataset.hero = self.heroId;
    updateAbilityBar(self);
    updateHeroStats(self);
  }
}

function updateThreats(state: GameSnapshot): void {
  const counts: Record<LaneId, number> = { north: 0, east: 0, south: 0, west: 0 };
  for (const enemy of state.enemies) counts[enemy.lane] += enemy.elite ? 3 : enemy.kind === "brute" || enemy.kind === "siege" ? 2 : 1;
  const activeLanes = new Set(state.activeLanes);
  const activeCount = activeLanes.size;
  const max = Math.max(5, ...state.activeLanes.map((lane) => counts[lane]));
  threatHeading.textContent = activeCount === 1 ? "1 ROAD OPEN" : `${activeCount} ROADS OPEN`;
  threatPanel.dataset.activeLanes = String(activeCount);
  threatPanel.setAttribute("aria-label", `${activeCount} active ${activeCount === 1 ? "lane" : "lanes"}`);
  for (const lane of LANE_IDS) {
    const element = requiredElement<HTMLDivElement>(`threat-${lane}`);
    const active = activeLanes.has(lane);
    const pressure = counts[lane] / max;
    element.style.setProperty("--pressure", String(active ? 0.18 + pressure * 0.82 : 0.05));
    element.style.setProperty("--pressure-color", active ? pressure > 0.6 ? "#e95e48" : pressure > 0.25 ? "#c48948" : "#526a72" : "#1b2225");
    element.classList.toggle("is-active", active);
    element.classList.toggle("is-sealed", !active);
    element.classList.toggle("is-hot", active && (lane === state.pressureLane || pressure > 0.72));
    const compassLabel = element.querySelector<HTMLElement>("b");
    if (compassLabel) compassLabel.textContent = active ? lane[0]!.toUpperCase() : "×";
    element.title = active ? `${LANE_LABELS[lane]} lane: open, ${counts[lane]} threat` : `${LANE_LABELS[lane]} lane: sealed`;
    element.setAttribute("aria-label", element.title);

    const status = laneStatusElements.get(lane);
    if (!status) continue;
    status.classList.toggle("is-active", active);
    status.classList.toggle("is-sealed", !active);
    const statusCopy = status.querySelector<HTMLElement>(".lane-status-state");
    if (statusCopy) statusCopy.textContent = active ? counts[lane] > 0 ? `OPEN · ${counts[lane]}` : "OPEN" : "SEALED";
  }
}

function updateTeam(players: PlayerSnapshot[]): void {
  teamList.replaceChildren();
  for (const player of players) {
    if (!player.heroId) continue;
    const definition = HERO_DEFINITIONS[player.heroId];
    const presentation = HERO_PRESENTATION[player.heroId];
    const member = document.createElement("div");
    member.className = `team-member${player.id === localPlayerId ? " is-self" : ""}${player.downed ? " is-downed" : ""}`;
    member.style.setProperty("--hero-color", presentation.color);
    member.style.setProperty("--hero-dark", presentation.dark);
    member.style.setProperty("--health", `${Math.max(0, (player.hp / Math.max(1, player.maxHp)) * 100)}%`);
    member.innerHTML = `
      <span class="team-portrait">${presentation.symbol}</span>
      <span class="team-copy"><strong>${escapeText(player.name)}</strong><small>${definition.name}${player.downed ? " · DOWNED" : ""}</small></span>
      <span class="team-level">LV ${player.level}</span>
      <span class="team-health"><i></i></span>`;
    teamList.append(member);
  }
}

function escapeText(text: string): string {
  const element = document.createElement("span");
  element.textContent = text;
  return element.innerHTML;
}

function updateAbilityBar(self: PlayerSnapshot): void {
  if (!self.heroId) return;
  const definition = HERO_DEFINITIONS[self.heroId];
  basicAttackName.textContent = definition.basicName;
  const slots: Array<{ action: AbilitySlot; name: string; cooldown: number; maxRank: number }> = [
    { action: "ability1", name: definition.abilities.ability1.name, cooldown: definition.abilities.ability1.cooldown, maxRank: definition.abilities.ability1.maxRank },
    { action: "ability2", name: definition.abilities.ability2.name, cooldown: definition.abilities.ability2.cooldown, maxRank: definition.abilities.ability2.maxRank },
    { action: "ability3", name: definition.abilities.ability3.name, cooldown: definition.abilities.ability3.cooldown, maxRank: definition.abilities.ability3.maxRank },
    { action: "ultimate", name: definition.abilities.ultimate.name, cooldown: definition.abilities.ultimate.cooldown, maxRank: definition.abilities.ultimate.maxRank },
  ];
  let upgradeableCount = 0;
  for (const slot of slots) {
    const element = abilityBar.querySelector<HTMLButtonElement>(`[data-action="${slot.action}"]`);
    if (!element) continue;
    const ability = definition.abilities[slot.action];
    const rank = self.abilityRanks[slot.action] ?? 0;
    const cooldown = Math.max(0, self.cooldowns[slot.action] ?? 0);
    const effectiveCooldown = slot.cooldown / Math.max(0.01, self.stats.cooldownRecovery);
    const maxed = rank >= slot.maxRank;
    const canUpgrade = self.skillPoints > 0 && self.level >= ability.unlockLevel && !maxed;
    if (canUpgrade) upgradeableCount += 1;
    element.style.setProperty("--cooldown", `${Math.min(100, (cooldown / effectiveCooldown) * 100)}%`);
    element.classList.toggle("is-locked", rank === 0);
    element.classList.toggle("is-level-locked", self.level < ability.unlockLevel);
    element.classList.toggle("is-maxed", maxed);
    element.classList.toggle("can-upgrade", canUpgrade);
    element.classList.toggle("is-cooling", rank > 0 && cooldown > 0.1);
    element.classList.toggle("is-ready", slot.action === "ultimate" && rank > 0 && cooldown <= 0);
    element.disabled = rank === 0;
    element.title = rank === 0 ? `${slot.name} is not learned` : `${slot.name} rank ${rank} of ${slot.maxRank}`;
    const label = element.querySelector<HTMLElement>(".ability-name");
    if (label) label.textContent = slot.name;
    const cooldownLabel = element.querySelector<HTMLElement>(".cooldown-value");
    if (cooldownLabel) cooldownLabel.textContent = cooldown > 0.1 ? cooldown.toFixed(cooldown >= 10 ? 0 : 1) : "";
    const status = element.querySelector<HTMLElement>(".ability-status");
    if (status) status.textContent = maxed ? "MAX" : rank === 0 ? canUpgrade ? "LEARN" : "LOCKED" : "";
    const ranks = element.querySelector<HTMLElement>(".ability-ranks");
    if (ranks) {
      ranks.replaceChildren();
      ranks.setAttribute("aria-label", `Rank ${rank} of ${slot.maxRank}`);
      for (let index = 0; index < slot.maxRank; index += 1) {
        const pip = document.createElement("span");
        pip.classList.toggle("is-filled", index < rank);
        ranks.append(pip);
      }
    }
    const upgrade = abilityBar.querySelector<HTMLButtonElement>(`[data-upgrade="${slot.action}"]`);
    if (upgrade) {
      upgrade.hidden = !canUpgrade;
      upgrade.disabled = !canUpgrade;
      upgrade.setAttribute("aria-label", `Upgrade ${slot.name} to rank ${rank + 1} of ${slot.maxRank}`);
      upgrade.title = `Spend 1 skill point: ${slot.name} rank ${rank + 1}`;
    }
  }
  const hasUpgradeableAbility = self.skillPoints > 0 && upgradeableCount > 0;
  skillPointCount.classList.toggle("is-hidden", !hasUpgradeableAbility);
  skillPointCount.textContent = `${self.skillPoints} SKILL POINT${self.skillPoints === 1 ? "" : "S"} · CLICK +`;
  skillPointCount.setAttribute("aria-label", `${self.skillPoints} skill point${self.skillPoints === 1 ? "" : "s"} available on the ability bar`);
  abilityBar.classList.toggle("has-upgrades", hasUpgradeableAbility);
  abilityBar.dataset.skillPoints = String(hasUpgradeableAbility ? self.skillPoints : 0);
  abilityBar.setAttribute("aria-label", hasUpgradeableAbility ? `Abilities, ${self.skillPoints} skill point${self.skillPoints === 1 ? "" : "s"} available` : "Abilities");
}

const SKILL_SLOTS: ReadonlyArray<{ slot: AbilitySlot; key: "Q" | "E" | "R" | "F" }> = [
  { slot: "ability1", key: "Q" },
  { slot: "ability2", key: "E" },
  { slot: "ability3", key: "R" },
  { slot: "ultimate", key: "F" },
];

function levelAbility(slot: AbilitySlot): void {
  const self = snapshot?.players.find((player) => player.id === localPlayerId);
  const skill = SKILL_SLOTS.find((candidate) => candidate.slot === slot);
  if (!self?.heroId || !skill || self.skillPoints <= 0) return;
  const definition = HERO_DEFINITIONS[self.heroId].abilities[slot];
  if (self.level < definition.unlockLevel || (self.abilityRanks[slot] ?? 0) >= definition.maxRank) return;
  send({ type: "level_ability", slot });
  audio.play("loot");
}

function updateMinimap(state: GameSnapshot): void {
  const context = minimap.getContext("2d");
  if (!context) return;
  const width = minimap.width;
  const height = minimap.height;
  const padding = 9;
  const worldWidth = Math.max(1, minimapWorldBounds.maxX - minimapWorldBounds.minX);
  const worldHeight = Math.max(1, minimapWorldBounds.maxZ - minimapWorldBounds.minZ);
  const scale = Math.min((width - padding * 2) / worldWidth, (height - padding * 2) / worldHeight);
  const drawnWidth = worldWidth * scale;
  const drawnHeight = worldHeight * scale;
  const offsetX = (width - drawnWidth) / 2;
  const offsetY = (height - drawnHeight) / 2;
  const toMap = (point: Vec2): [number, number] => [
    offsetX + (point.x - minimapWorldBounds.minX) * scale,
    offsetY + (point.z - minimapWorldBounds.minZ) * scale,
  ];
  const [centerX, centerY] = toMap(WORLD_LAYOUT.nexus);
  const activeLanes = new Set(state.activeLanes);
  context.clearRect(0, 0, width, height);
  context.fillStyle = "#080b10";
  context.fillRect(0, 0, width, height);
  context.lineCap = "round";
  for (const lane of LANE_IDS) {
    const [roadX, roadY] = toMap(WORLD_LAYOUT.spawns[lane]);
    const active = activeLanes.has(lane);
    context.strokeStyle = active ? "#34464e" : "#12171a";
    context.lineWidth = active ? 5 : 3;
    context.beginPath();
    context.moveTo(centerX, centerY);
    context.lineTo(roadX, roadY);
    context.stroke();
  }
  context.fillStyle = "#263137";
  context.fillRect(centerX - 12, centerY - 12, 24, 24);
  context.strokeStyle = "#5d6c72";
  context.lineWidth = 2;
  context.strokeRect(centerX - 12, centerY - 12, 24, 24);
  for (const gate of state.gates) {
    const [x, y] = toMap(gate.position);
    const active = activeLanes.has(gate.lane);
    context.fillStyle = active ? gate.breached ? "#9e3036" : "#829ca5" : "#171d20";
    context.fillRect(x - 4, y - 4, 8, 8);
    context.strokeStyle = active ? "#a9bdc3" : "#30383b";
    context.lineWidth = 1;
    context.strokeRect(x - 4, y - 4, 8, 8);
    if (!active) {
      context.strokeStyle = "#50585a";
      context.beginPath(); context.moveTo(x - 3, y - 3); context.lineTo(x + 3, y + 3); context.stroke();
      context.beginPath(); context.moveTo(x + 3, y - 3); context.lineTo(x - 3, y + 3); context.stroke();
    }
  }
  for (const vendor of state.vendors) {
    const [x, y] = toMap(vendor.position);
    if (vendor.id === "ironbound_forge") {
      context.fillStyle = "#e9ba63";
      context.strokeStyle = "#2a1d0d";
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(x, y - 4);
      context.lineTo(x + 4, y);
      context.lineTo(x, y + 4);
      context.lineTo(x - 4, y);
      context.closePath();
      context.fill();
      context.stroke();
    } else {
      context.fillStyle = "#171424";
      context.strokeStyle = "#bfa2ff";
      context.lineWidth = 1.25;
      context.beginPath();
      context.moveTo(x, y - 5);
      context.lineTo(x + 1.4, y - 1.4);
      context.lineTo(x + 5, y);
      context.lineTo(x + 1.4, y + 1.4);
      context.lineTo(x, y + 5);
      context.lineTo(x - 1.4, y + 1.4);
      context.lineTo(x - 5, y);
      context.lineTo(x - 1.4, y - 1.4);
      context.closePath();
      context.fill();
      context.stroke();
      context.fillStyle = "#9eeaff";
      context.fillRect(Math.round(x) - 1, Math.round(y) - 1, 2, 2);
    }
  }
  context.fillStyle = state.nexus.hp / state.nexus.maxHp < 0.3 ? "#ff555e" : "#5bdcff";
  context.beginPath(); context.arc(centerX, centerY, 4, 0, Math.PI * 2); context.fill();
  for (const enemy of state.enemies) {
    const [x, y] = toMap(enemy.position);
    context.fillStyle = enemy.elite ? "#d77aff" : enemy.kind === "brute" || enemy.kind === "siege" ? "#ff714f" : "#b63c49";
    context.fillRect(Math.round(x) - (enemy.elite ? 2 : 1), Math.round(y) - (enemy.elite ? 2 : 1), enemy.elite ? 4 : 2, enemy.elite ? 4 : 2);
  }
  for (const player of state.players) {
    if (!player.heroId) continue;
    const [x, y] = toMap(player.position);
    context.fillStyle = HERO_PRESENTATION[player.heroId].color;
    context.beginPath(); context.arc(x, y, player.id === localPlayerId ? 3 : 2, 0, Math.PI * 2); context.fill();
    if (player.id === localPlayerId) {
      context.strokeStyle = "#ffffff";
      context.lineWidth = 1;
      context.stroke();
    }
  }
  if (state.riftHeart.active) {
    const [x, y] = toMap(state.riftHeart.position);
    context.fillStyle = "#c35cff";
    context.beginPath(); context.arc(x, y, 5, 0, Math.PI * 2); context.fill();
  }
  context.font = "bold 7px monospace";
  context.textAlign = "center";
  context.textBaseline = "middle";
  for (const lane of LANE_IDS) {
    const [x, y] = toMap(WORLD_LAYOUT.spawns[lane]);
    context.fillStyle = activeLanes.has(lane) ? "rgba(225,239,243,.82)" : "rgba(92,103,107,.42)";
    const xOffset = lane === "east" ? -7 : lane === "west" ? 7 : 0;
    const yOffset = lane === "north" ? 7 : lane === "south" ? -7 : 0;
    context.fillText(LANE_LABELS[lane].toUpperCase(), x + xOffset, y + yOffset);
  }
  minimap.setAttribute("aria-label", `Battlefield minimap: ${state.activeLanes.map((lane) => LANE_LABELS[lane]).join(", ") || "no"} lanes open; ${state.vendors.map((vendor) => vendor.name).join(" and ")} marked as local shops`);
}

function showEnd(state: GameSnapshot, self: PlayerSnapshot | undefined): void {
  const won = state.phase === "victory";
  endKicker.textContent = won ? "THE RIFT COLLAPSES" : "THE HEARTFIRE IS SILENT";
  endTitle.textContent = won ? "THE CITY ENDURES" : "THE CITY HAS FALLEN";
  endCopy.textContent = won ? "The invasion recoils—for now." : "The horde consumed the Heartfire. Rally and try again.";
  endStats.innerHTML = `
    <div class="end-stat"><strong>${self?.kills ?? 0}</strong><small>DEMONS SLAIN</small></div>
    <div class="end-stat"><strong>${self?.level ?? 1}</strong><small>HERO LEVEL</small></div>
    <div class="end-stat"><strong>${formatTime(runStartedAt ? performance.now() - runStartedAt : 0)}</strong><small>TIME HELD</small></div>`;
  const isHost = state.lobby.hostId === localPlayerId;
  playAgain.disabled = !isHost;
  const replayMain = playAgain.querySelector<HTMLElement>(".ready-main");
  const replaySub = playAgain.querySelector<HTMLElement>(".ready-sub");
  if (replayMain) replayMain.textContent = isHost ? "DEFEND AGAIN" : "WAITING FOR HOST";
  if (replaySub) replaySub.textContent = isHost ? "RETURN TO THE WAR TABLE" : "THE PARTY STAYS TOGETHER";
  endScreen.classList.remove("is-hidden");
}

function formatTime(milliseconds: number): string {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function movementInput(): Vec2 {
  let x = 0;
  let z = 0;
  if (keys.has("KeyA")) x -= 1;
  if (keys.has("KeyD")) x += 1;
  if (keys.has("KeyW")) z -= 1;
  if (keys.has("KeyS")) z += 1;
  const length = Math.hypot(x, z);
  return length > 1 ? { x: x / length, z: z / length } : { x, z };
}

function sendInput(): void {
  if (!snapshot || snapshot.phase === "lobby" || snapshot.phase === "victory" || snapshot.phase === "defeat") return;
  const self = snapshot.players.find((player) => player.id === localPlayerId);
  const aim = self
    ? { x: aimWorld.x - self.position.x, z: aimWorld.z - self.position.z }
    : { x: 0, z: -1 };
  send({
    type: "input",
    seq: ++inputSequence,
    move: movementInput(),
    aim,
    attacking,
  });
}

window.setInterval(sendInput, 50);

function cast(slot: AbilitySlot): void {
  if (snapshot?.phase === "lobby") return;
  const self = snapshot?.players.find((player) => player.id === localPlayerId);
  if (!self || (self.abilityRanks[slot] ?? 0) <= 0) return;
  audio.unlock();
  audio.play("cast");
  send({ type: "cast", slot });
  abilityBar.querySelector(`[data-action="${slot}"]`)?.classList.add("is-active");
  window.setTimeout(() => abilityBar.querySelector(`[data-action="${slot}"]`)?.classList.remove("is-active"), 100);
}

heroStatsToggle.addEventListener("click", () => setHeroStatsOpen(!heroStatsOpen));
shopClose.addEventListener("click", () => setShopOpen(false));
shopReplaceSubmit.addEventListener("click", confirmReplacement);
shopReplaceCancel.addEventListener("click", () => clearReplacementSlot(true));

window.addEventListener("keydown", (event) => {
  if (event.target instanceof HTMLInputElement) return;
  const unmodified = !event.ctrlKey && !event.metaKey && !event.altKey;
  if (event.code === "KeyB" && unmodified) {
    if (!event.repeat) {
      event.preventDefault();
      setShopOpen(!shopOpen);
    }
    return;
  }
  if (shopOpen && unmodified && !event.repeat) {
    if (event.code === "Escape") {
      event.preventDefault();
      if (replacementRequestPending) {
        shopAnnouncement.textContent = "The reforge is already being verified by the server.";
      } else if (replacementSlotIndex !== null) {
        clearReplacementSlot(true);
      } else if (replacementItemId) {
        clearReplacementSelection(true);
      } else {
        setShopOpen(false);
      }
      return;
    }
    const number = /^Digit[1-6]$/.test(event.code) || /^Numpad[1-6]$/.test(event.code)
      ? Number(event.code.at(-1))
      : 0;
    if (replacementItemId && number >= 1 && number <= EQUIPMENT_SLOT_COUNT) {
      event.preventDefault();
      selectReplacementSlot((number - 1) as EquipmentSlotIndex);
      return;
    }
    const itemIndex = number >= 1 && number <= 2 ? number - 1 : -1;
    const itemId = itemIndex >= 0 && activeVendorId
      ? VENDOR_DEFINITIONS[activeVendorId].itemIds[itemIndex]
      : undefined;
    if (itemId) {
      event.preventDefault();
      buyShopItem(itemId);
      return;
    }
  }
  if (event.code === "KeyC" && !event.ctrlKey && !event.metaKey && !event.altKey) {
    if (!event.repeat) {
      event.preventDefault();
      setHeroStatsOpen(!heroStatsOpen);
    }
    return;
  }
  if (event.code === "Escape" && heroStatsOpen) {
    event.preventDefault();
    setHeroStatsOpen(false);
    return;
  }
  if (event.code === "KeyW" || event.code === "KeyA" || event.code === "KeyS" || event.code === "KeyD") keys.add(event.code);
  if (event.repeat) return;
  const keyedSkill = event.code === "KeyQ" ? "ability1"
    : event.code === "KeyE" ? "ability2"
      : event.code === "KeyR" ? "ability3"
        : event.code === "KeyF" ? "ultimate"
          : null;
  if (!keyedSkill) return;
  if (event.ctrlKey) {
    event.preventDefault();
    levelAbility(keyedSkill);
    return;
  }
  cast(keyedSkill);
});

window.addEventListener("keyup", (event) => keys.delete(event.code));
window.addEventListener("blur", () => {
  keys.clear();
  attacking = false;
});

renderer.domElement.addEventListener("pointerenter", () => { pointerInside = true; });
renderer.domElement.addEventListener("pointerleave", () => { pointerInside = false; attacking = false; });
renderer.domElement.addEventListener("pointermove", (event) => {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
});
renderer.domElement.addEventListener("pointerdown", (event) => {
  audio.unlock();
  if (event.button === 0) {
    attacking = true;
    audio.play("attack");
  }
});
window.addEventListener("pointerup", (event) => {
  if (event.button === 0) attacking = false;
});
window.addEventListener("contextmenu", (event) => event.preventDefault());

abilityBar.addEventListener("click", (event) => {
  const upgrade = (event.target as HTMLElement).closest<HTMLButtonElement>(".ability-upgrade");
  const upgradeAction = upgrade?.dataset.upgrade;
  if (upgradeAction === "ability1" || upgradeAction === "ability2" || upgradeAction === "ability3" || upgradeAction === "ultimate") {
    levelAbility(upgradeAction);
    return;
  }
  const target = (event.target as HTMLElement).closest<HTMLButtonElement>(".ability-slot");
  if (!target) return;
  const action = target.dataset.action;
  if (action === "ability1" || action === "ability2" || action === "ability3" || action === "ultimate") {
    cast(action);
  }
});

function updateAim(): void {
  raycaster.setFromCamera(pointer, camera);
  if (raycaster.ray.intersectPlane(groundPlane, aimWorld)) {
    aimMarker.position.x = aimWorld.x;
    aimMarker.position.z = aimWorld.z;
    aimMarker.visible = pointerInside && snapshot?.phase !== "lobby";
  }
}

function resize(): void {
  const width = Math.max(1, window.innerWidth);
  const height = Math.max(1, window.innerHeight);
  renderer.setSize(width, height, false);
  updateCameraFrustum(width / height);
}

function updateCameraFrustum(aspect = window.innerWidth / Math.max(1, window.innerHeight)): void {
  camera.left = (-cameraViewHeight * aspect) / 2;
  camera.right = (cameraViewHeight * aspect) / 2;
  camera.top = cameraViewHeight / 2;
  camera.bottom = -cameraViewHeight / 2;
  camera.updateProjectionMatrix();
}

window.addEventListener("resize", resize);

const cameraTarget = new THREE.Vector3(0, 0, -4);
const desiredCameraTarget = new THREE.Vector3();
const cameraOffset = new THREE.Vector3(27, 34, 29);

function updateCamera(delta: number): void {
  const self = snapshot?.players.find((player) => player.id === localPlayerId);
  const desiredHeight = snapshot?.phase === "lobby" ? 72 : 42;
  cameraViewHeight = THREE.MathUtils.lerp(cameraViewHeight, desiredHeight, 1 - Math.exp(-delta * 2.8));
  if (self && snapshot?.phase !== "lobby") {
    const inPush = snapshot?.phase === "push";
    const minX = inPush ? -WORLD_LAYOUT.pushHalfWidth : -WORLD_LAYOUT.defenseHalfExtent;
    const maxX = inPush ? WORLD_LAYOUT.pushHalfWidth : WORLD_LAYOUT.defenseHalfExtent;
    const minZ = inPush ? WORLD_LAYOUT.pushNorthZ - 8 : -WORLD_LAYOUT.defenseHalfExtent;
    const maxZ = WORLD_LAYOUT.defenseHalfExtent;
    const lookAheadX = THREE.MathUtils.clamp(aimWorld.x - self.position.x, -9, 9) * 0.2;
    const lookAheadZ = THREE.MathUtils.clamp(aimWorld.z - self.position.z, -9, 9) * 0.2;
    desiredCameraTarget.set(
      THREE.MathUtils.clamp(self.position.x + lookAheadX, minX, maxX),
      0,
      THREE.MathUtils.clamp(self.position.z + lookAheadZ, minZ, maxZ),
    );
  } else {
    desiredCameraTarget.set(0, 0, -4);
  }
  cameraTarget.lerp(desiredCameraTarget, 1 - Math.exp(-delta * 5));
  const shakeX = (Math.random() - 0.5) * screenShake;
  const shakeZ = (Math.random() - 0.5) * screenShake;
  camera.position.copy(cameraTarget).add(cameraOffset).add(new THREE.Vector3(shakeX, 0, shakeZ));
  camera.lookAt(cameraTarget.x, 0, cameraTarget.z);
  screenShake = Math.max(0, screenShake - delta * 2.8);
  updateCameraFrustum();
}

function updateWorld(now: number, delta: number): void {
  const elapsed = now / 1000;
  for (const tracked of playerVisuals.values()) {
    tracked.visual.position.lerp(tracked.target, 1 - Math.exp(-delta * 17));
    updateEntityVisual(tracked.visual, now, Math.hypot(tracked.velocity.x, tracked.velocity.z) > 0.1, elapsed, tracked.facing, tracked.action);
  }
  for (const tracked of enemyVisuals.values()) {
    tracked.visual.position.lerp(tracked.target, 1 - Math.exp(-delta * 15));
    updateEntityVisual(tracked.visual, now, Math.hypot(tracked.velocity.x, tracked.velocity.z) > 0.1, elapsed + tracked.target.x * 0.03, tracked.facing, tracked.action);
  }
  for (const tracked of projectileVisuals.values()) tracked.visual.position.lerp(tracked.target, 1 - Math.exp(-delta * 28));
  for (const tracked of summonVisuals.values()) {
    tracked.visual.position.lerp(tracked.target, 1 - Math.exp(-delta * 20));
    updateWraithVisual(tracked.visual as THREE.Group, elapsed, tracked.seed, Math.hypot(tracked.velocity.x, tracked.velocity.z) > 0.1);
  }
  for (const tracked of pickupVisuals.values()) {
    tracked.visual.position.lerp(tracked.target, 1 - Math.exp(-delta * 12));
    updatePickupVisual(tracked.visual as THREE.Group, elapsed, tracked.seed);
  }
  for (const tracked of effectVisuals.values()) updateEffectVisual(tracked.visual, tracked.snapshot.remaining, elapsed);

  for (let index = floatingTexts.length - 1; index >= 0; index -= 1) {
    const text = floatingTexts[index];
    if (!text) continue;
    const age = now - (text.userData.bornAt as number);
    text.position.y += delta * 2.4;
    const material = text.material as THREE.SpriteMaterial;
    material.opacity = THREE.MathUtils.clamp(1 - age / 760, 0, 1);
    if (age > 780) {
      scene.remove(text);
      material.map?.dispose();
      material.dispose();
      floatingTexts.splice(index, 1);
    }
  }
  for (let index = particles.length - 1; index >= 0; index -= 1) {
    const particle = particles[index];
    if (!particle) continue;
    const age = now - particle.born;
    particle.velocity.y -= delta * 6.8;
    particle.mesh.position.addScaledVector(particle.velocity, delta);
    particle.mesh.rotation.x += delta * 5;
    particle.mesh.rotation.z += delta * 4;
    const material = particle.mesh.material as THREE.MeshBasicMaterial;
    material.opacity = THREE.MathUtils.clamp(1 - age / particle.life, 0, 1);
    if (particle.mesh.position.y < 0.1) {
      particle.mesh.position.y = 0.1;
      particle.velocity.y *= -0.25;
      particle.velocity.x *= 0.6;
      particle.velocity.z *= 0.6;
    }
    if (age > particle.life) {
      world.remove(particle.mesh);
      particle.mesh.geometry.dispose();
      material.dispose();
      particles.splice(index, 1);
    }
  }
  aimRing.rotation.z = elapsed * 0.8;
  aimRing.scale.setScalar(0.94 + Math.sin(elapsed * 5) * 0.06);
  const state = snapshot;
  const gateStates = Object.fromEntries(
    (state?.gates ?? []).map((gate) => [
      gate.lane,
      { hpRatio: gate.hp / Math.max(1, gate.maxHp), breached: gate.breached },
    ]),
  ) as Partial<Record<LaneId, { hpRatio: number; breached: boolean }>>;
  arena.update(
    elapsed,
    state ? state.nexus.hp / Math.max(1, state.nexus.maxHp) : 1,
    state?.nexus.shielded ?? false,
    state?.phase ?? "lobby",
    state?.phase === "victory" && victoryVisualStartedAt !== null
      ? Math.max(0, (now - victoryVisualStartedAt) / 1000)
      : state?.phaseElapsed ?? 0,
    state?.pressureLane ?? null,
    state?.activeLanes ?? [],
    gateStates,
    state?.riftHeart.maxHp ? state.riftHeart.hp / state.riftHeart.maxHp : 1,
  );
}

function frame(now: number): void {
  const delta = Math.min(0.05, Math.max(0, (now - lastFrame) / 1000));
  lastFrame = now;
  updateAim();
  updateCamera(delta);
  updateWorld(now, delta);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

renderHeroCards();
resize();
connect();
requestAnimationFrame(frame);
