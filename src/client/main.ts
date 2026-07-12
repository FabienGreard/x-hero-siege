import * as THREE from "three";
import {
  HERO_DEFINITIONS,
  HERO_IDS,
  LANE_IDS,
  WORLD_LAYOUT,
} from "../shared/game-data";
import {
  ARMORY_SELL_VALUE,
  EQUIPMENT_SLOT_COUNT,
  ITEM_ATTUNEMENT_THRESHOLD,
  ITEM_DEFINITIONS,
  VENDOR_DEFINITIONS,
  armoryReforgeNetCost,
  deriveAttunementProgress,
  deriveItemEvolutionProgress,
  dominantEquipmentStack,
  effectiveStackCopies,
  equipmentCopyCount,
  isStackAttuned,
  legalEquipmentReplacementSlots,
  projectEquipmentChange,
  projectEquipmentRemoval,
  summarizeEquipment,
} from "../shared/armory-data";
import {
  deriveHeroStats,
  projectHealthAtPreservedRatio,
} from "../shared/hero-stats";
import { deriveAbilityImpactReadout } from "../shared/ability-impact";
import { derivePrimaryImpactReadout } from "../shared/primary-impact";
import {
  GREATSWORD_MASTERY_NODES,
  PRACTICE_WEAPON,
  SKILL_DEFINITIONS,
  WEAPON_DEFINITIONS,
  type MasteryNodeId,
  type SkillId,
} from "../shared/weapon-data";
import {
  WRAITH_HOST_MAX_STRIKES_PER_SUMMON,
  wraithHostSummonCount,
} from "../shared/wraith-host";
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
  HeroStatsSnapshot,
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
import { itemPurchaseDeliveryPolicy, itemSaleDeliveryPolicy } from "./event-delivery";
import { deriveGateReadout } from "./gate-readout";
import {
  beginOrdinaryPurchaseRequest,
  ordinaryPurchaseRequestAfterError,
  reconcileOrdinaryPurchaseRequest,
  type OrdinaryPurchaseRequest,
} from "./ordinary-purchase-request";
import {
  EQUIPMENT_STAT_FIELDS,
  equipmentStatFieldForItem,
  formatEquipmentStat,
  projectAcceptedPurchaseImpact,
  projectLearnedAbilityCooldowns,
  projectOrdinaryPurchasePreview,
  type LearnedAbilityCooldownProjection,
} from "./shop-preview";
import {
  deriveLocalShopReadiness,
  type LocalShopReadiness,
} from "./shop-readiness";
import { deriveShopReplacementOffer } from "./shop-replacement-offer";
import { deriveWraithImpactPresentation } from "./wraith-impact";
import {
  BUILD_SIGNATURE_COLORS,
  HERO_PRESENTATION,
  createArena,
  createEffectVisual,
  createEntityVisual,
  createFloatingText,
  createHealthBar,
  createPickupVisual,
  createProjectileVisual,
  createWraithVisual,
  pulseEntityBuildSignature,
  pulseEntityWareReceipt,
  setEntityFlash,
  setEntityBuildSignature,
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
const abilityImpactReadout = requiredElement<HTMLElement>("ability-impact-readout");
const heroPrimaryImpact = requiredElement<HTMLDivElement>("hero-primary-impact");
const heroAbilityImpact = requiredElement<HTMLDivElement>("hero-ability-impact");
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
const shopSellToggle = requiredElement<HTMLButtonElement>("shop-sell-toggle");
const shopReplaceGuide = requiredElement<HTMLElement>("shop-replace-guide");
const shopReplaceItem = requiredElement<HTMLElement>("shop-replace-item");
const shopReplaceConfirm = requiredElement<HTMLElement>("shop-replace-confirm");
const shopReplacePreview = requiredElement<HTMLElement>("shop-replace-preview");
const shopReplaceStacks = requiredElement<HTMLElement>("shop-replace-stacks");
const shopReplaceStats = requiredElement<HTMLElement>("shop-replace-stats");
const shopReplaceSignature = requiredElement<HTMLElement>("shop-replace-signature");
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
const goldLabel = requiredElement<HTMLElement>("gold-label");
const goldReadout = requiredElement<HTMLElement>("gold-readout");
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

const RESUME_TOKEN_STORAGE_KEY = "siegeheart.resume.v1";
const RECONNECT_DELAYS_MS = [500, 1_000, 2_000, 4_000, 5_000] as const;
const DEFAULT_RESUME_WINDOW_MS = 15_000;
const WELCOME_TIMEOUT_MS = 5_000;
const TERMINAL_CONNECTION_CODES = new Set([
  "SESSION_EXPIRED",
  "GAME_IN_PROGRESS",
  "LOBBY_FULL",
  "SESSION_REPLACED",
]);

let socket: WebSocket | null = null;
let reconnectTimer: number | null = null;
let welcomeTimer: number | null = null;
let connectionGeneration = 0;
let connectionReady = false;
let terminalConnection = false;
let reconnectAttempt = 0;
let reconnectStartedAt: number | null = null;
let resumeWindowMs = DEFAULT_RESUME_WINDOW_MS;
let memoryResumeToken: string | null = null;
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
let saleMode = false;
let saleSlotIndex: EquipmentSlotIndex | null = null;
let saleExpectedItemId: ItemId | null = null;
let saleRequestPending = false;
let ordinaryPurchaseRequest: OrdinaryPurchaseRequest | null = null;
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
  gateward_plate: "⬟",
};
const VENDOR_PRESENTATION: Record<VendorId, { district: string; tagline: string }> = {
  citadel_arsenal: {
    district: "CENTRAL CITADEL",
    tagline: "WEAPONS · MASTERY · THE SIEGE CONTINUES",
  },
  ironbound_forge: {
    district: "NORTHWEST CITADEL",
    tagline: "MARTIAL GOODS · THE SIEGE CONTINUES",
  },
  veilglass_reliquary: {
    district: "NORTHEAST CITADEL",
    tagline: "ARCANE RELICS · THE SIEGE CONTINUES",
  },
};
const ABILITY_READOUT_SLOTS = [
  ["ability1", "Q"],
  ["ability2", "E"],
  ["ability3", "R"],
  ["ultimate", "F"],
] as const satisfies ReadonlyArray<readonly [AbilitySlot, string]>;

function abilityKeyLabel(slot: AbilitySlot): string {
  return ABILITY_READOUT_SLOTS.find(([candidate]) => candidate === slot)?.[1] ?? slot;
}
const ABILITY_METRIC_SHORT_LABELS: Record<string, string> = {
  DAMAGE: "DMG",
  "ARROW DAMAGE": "ARROW",
  "BOLT DAMAGE": "BOLT",
  "DAMAGE / HIT": "DMG/HIT",
  "DAMAGE / TARGET": "DMG/TGT",
  BARRIER: "BAR",
  "HEAL / HIT": "HEAL/HIT",
  "WRAITH DAMAGE": "WRAITH",
};
const PRIMARY_METRIC_SHORT_LABELS: Record<string, string> = {
  "DAMAGE / TARGET": "DMG/TARGET",
  "HEAL / TARGET": "HEAL/TARGET",
};
const shopItemButtons = new Map<ItemId, HTMLButtonElement>();

const laneStatusElements = new Map<LaneId, HTMLElement>();
for (const lane of LANE_IDS) {
  const status = document.createElement("div");
  status.className = "lane-status is-sealed";
  status.dataset.lane = lane;
  status.innerHTML = `
    <span class="lane-status-name">${LANE_LABELS[lane]}</span>
    <span class="lane-status-state">SEALED</span>
    <span class="lane-status-health" aria-hidden="true"><span class="lane-status-health-fill"></span></span>
  `;
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

  play(kind: "attack" | "impact" | "cast" | "warning" | "loot" | "attune" | "unattune" | "victory"): void {
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
      attune: [260, 1040, 0.42, "triangle"],
      unattune: [520, 180, 0.3, "sine"],
      victory: [330, 990, 0.7, "triangle"],
    } as const;
    const [start, end, duration, wave] = settings[kind];
    oscillator.type = wave;
    oscillator.frequency.setValueAtTime(start, now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, end), now + duration);
    filter.type = "lowpass";
    filter.frequency.value = kind === "impact" ? 500 : kind === "unattune" ? 900 : 1800;
    gain.gain.setValueAtTime(0.001, now);
    const peakGain = kind === "impact" ? 0.32 : kind === "attune" ? 0.24 : kind === "unattune" ? 0.15 : 0.18;
    gain.gain.exponentialRampToValueAtTime(peakGain, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    oscillator.connect(filter).connect(gain).connect(this.master);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  }
}

const audio = new SiegeAudio();

function readResumeToken(): string | null {
  try {
    const stored = window.sessionStorage.getItem(RESUME_TOKEN_STORAGE_KEY);
    if (stored) memoryResumeToken = stored;
    return stored || memoryResumeToken;
  } catch {
    return memoryResumeToken;
  }
}

function storeResumeToken(token: string): void {
  memoryResumeToken = token;
  try {
    window.sessionStorage.setItem(RESUME_TOKEN_STORAGE_KEY, token);
  } catch {
    // The in-memory fallback still preserves same-page reconnects.
  }
}

function clearResumeToken(): void {
  memoryResumeToken = null;
  try {
    window.sessionStorage.removeItem(RESUME_TOKEN_STORAGE_KEY);
  } catch {
    // Storage may be unavailable; the fallback has already been cleared.
  }
}

function send(message: ClientMessage): boolean {
  if (!connectionReady || socket?.readyState !== WebSocket.OPEN) return false;
  socket.send(JSON.stringify(message));
  return true;
}

function connectionState(
  state: "connecting" | "online" | "offline",
  label: string,
  mirrorToLobby = true,
): void {
  connectionPill.classList.remove("is-connecting", "is-online", "is-offline");
  connectionPill.classList.add(`is-${state}`);
  connectionLabel.textContent = label;
  connectionPill.setAttribute("aria-label", label);
  if (mirrorToLobby && (!snapshot || snapshot.phase === "lobby")) setTextIfChanged(lobbyNote, label);
}

function setTextIfChanged(element: HTMLElement, text: string): void {
  if (element.textContent !== text) element.textContent = text;
}

function clearConnectionTimers(): void {
  if (reconnectTimer !== null) window.clearTimeout(reconnectTimer);
  if (welcomeTimer !== null) window.clearTimeout(welcomeTimer);
  reconnectTimer = null;
  welcomeTimer = null;
}

function suspendTransactionalUi(): void {
  keys.clear();
  attacking = false;
  ordinaryPurchaseRequest = null;
  replacementRequestPending = false;
  saleRequestPending = false;
  if (shopOpen) {
    setShopOpen(false);
  } else {
    replacementItemId = null;
    replacementSlotIndex = null;
    replacementExpectedItemId = null;
    saleMode = false;
    saleSlotIndex = null;
    saleExpectedItemId = null;
  }
}

function terminalConnectionLabel(code: string): string {
  if (code === "SESSION_REPLACED") return "Session open in another tab";
  if (code === "LOBBY_FULL") return "War table full";
  if (code === "GAME_IN_PROGRESS" || code === "SESSION_EXPIRED") return "Rejoin expired · run in progress";
  return "Realm unavailable";
}

function stopConnection(code: string, message?: string): void {
  terminalConnection = true;
  connectionReady = false;
  clearConnectionTimers();
  suspendTransactionalUi();
  if (code === "SESSION_EXPIRED" || code === "SESSION_REPLACED") clearResumeToken();
  connectionState("offline", terminalConnectionLabel(code));
  if (message) toast(message, "warning");
}

function scheduleReconnect(): void {
  if (terminalConnection || reconnectTimer !== null) return;
  reconnectStartedAt ??= performance.now();
  const elapsed = performance.now() - reconnectStartedAt;
  const resumingDefender = Boolean(localPlayerId || readResumeToken());
  if (resumingDefender && elapsed >= resumeWindowMs) {
    stopConnection("SESSION_EXPIRED", "Your defender could not be restored before the rejoin window closed.");
    return;
  }
  const nextAttempt = reconnectAttempt + 1;
  const delay = RECONNECT_DELAYS_MS[Math.min(reconnectAttempt, RECONNECT_DELAYS_MS.length - 1)]!;
  const online = navigator.onLine;
  connectionState(
    online ? "connecting" : "offline",
    online
      ? `${resumingDefender ? "Rejoining defender" : "Reopening war table"} · attempt ${nextAttempt}`
      : "Realm unreachable · waiting for network",
  );
  reconnectTimer = window.setTimeout(() => {
    reconnectTimer = null;
    reconnectAttempt = nextAttempt;
    connect();
  }, resumingDefender ? Math.min(delay, Math.max(0, resumeWindowMs - elapsed)) : delay);
}

function connect(): void {
  if (terminalConnection) return;
  clearConnectionTimers();
  connectionReady = false;
  const generation = ++connectionGeneration;
  if (reconnectAttempt === 0 && reconnectStartedAt === null) {
    connectionState("connecting", "Opening the war table…");
  }
  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  const debugQuery = new URLSearchParams(location.search).has("debug") ? "?debug=1" : "";
  const currentSocket = new WebSocket(`${protocol}//${location.host}/ws${debugQuery}`);
  socket = currentSocket;
  currentSocket.addEventListener("open", () => {
    if (generation !== connectionGeneration) return;
    const name = cleanName(playerNameInput.value);
    const resumeToken = readResumeToken();
    currentSocket.send(JSON.stringify({
      type: "hello",
      name,
      ...(resumeToken ? { resumeToken } : {}),
    } satisfies ClientMessage));
    welcomeTimer = window.setTimeout(() => {
      if (generation === connectionGeneration && !connectionReady) currentSocket.close(4000, "Welcome timeout");
    }, WELCOME_TIMEOUT_MS);
  });
  currentSocket.addEventListener("message", (event) => {
    if (generation !== connectionGeneration) return;
    let message: ServerMessage;
    try {
      message = JSON.parse(String(event.data)) as ServerMessage;
    } catch {
      return;
    }
    if (message.type === "welcome") {
      if (welcomeTimer !== null) window.clearTimeout(welcomeTimer);
      welcomeTimer = null;
      const resumed = message.resumed;
      if (!resumed) {
        selectedHero = null;
        seenEvents.clear();
        inputSequence = 0;
      }
      suspendTransactionalUi();
      localPlayerId = message.playerId;
      storeResumeToken(message.resumeToken);
      resumeWindowMs = Math.max(1_000, message.resumeWindowMs || DEFAULT_RESUME_WINDOW_MS);
      const self = message.snapshot.players.find((player) => player.id === message.playerId);
      inputSequence = Math.max(inputSequence, self?.lastInputSeq ?? 0);
      if (self) {
        playerNameInput.value = cleanName(self.name);
        joinedName = playerNameInput.value;
      }
      terminalConnection = false;
      connectionReady = true;
      reconnectAttempt = 0;
      reconnectStartedAt = null;
      previousHp.clear();
      applySnapshot(message.snapshot, { hydrate: true });
      connectionState("online", resumed ? "Defender restored" : "Realm online", false);
      if (resumed) {
        toast("Back in the fight — build restored.", "loot");
        window.setTimeout(() => {
          if (generation === connectionGeneration && connectionReady) connectionState("online", "Realm online", false);
        }, 1_600);
      }
    } else if (message.type === "snapshot") {
      if (connectionReady) applySnapshot(message.snapshot);
    } else if (message.type === "event") {
      if (connectionReady) handleEvent(message.event, true);
    } else if (message.type === "error") {
      if (TERMINAL_CONNECTION_CODES.has(message.code)) {
        stopConnection(message.code, message.message);
        currentSocket.close(1000, message.code);
        return;
      }
      const tradeError = new Set([
        "EQUIPMENT_CHANGED",
        "EMPTY_EQUIPMENT_SLOT",
        "REPLACEMENT_NOT_REQUIRED",
        "INVALID_EQUIPMENT_SLOT",
        "SAME_ITEM",
        "ITEM_UNKNOWN",
        "ITEM_NOT_STOCKED",
        "INSUFFICIENT_GOLD",
        "VENDOR_UNKNOWN",
        "OUT_OF_RANGE",
        "PLAYER_DOWNED",
        "RUN_INACTIVE",
      ]).has(message.code);
      if (replacementRequestPending && tradeError) {
        replacementRequestPending = false;
        if (message.code === "EQUIPMENT_CHANGED") clearReplacementSlot();
        else refreshShopTradeState();
        shopAnnouncement.textContent = `${message.message} No gold was spent.`;
      }
      if (saleRequestPending && tradeError) {
        saleRequestPending = false;
        if (message.code === "EQUIPMENT_CHANGED" || message.code === "EMPTY_EQUIPMENT_SLOT") clearSaleSlot();
        else refreshShopTradeState();
        shopAnnouncement.textContent = `${message.message} No item was sold and no gold was credited.`;
      }
      const pendingOrdinaryPurchase = ordinaryPurchaseRequest;
      ordinaryPurchaseRequest = ordinaryPurchaseRequestAfterError(ordinaryPurchaseRequest, message.code);
      if (pendingOrdinaryPurchase && !ordinaryPurchaseRequest) {
        const self = currentPlayer();
        if (shopOpen && self) refreshShopTradeState(self);
      }
      toast(message.message, "warning");
      setTextIfChanged(lobbyNote, message.message);
    }
  });
  currentSocket.addEventListener("close", (event) => {
    if (generation !== connectionGeneration) return;
    if (welcomeTimer !== null) window.clearTimeout(welcomeTimer);
    welcomeTimer = null;
    if (socket === currentSocket) socket = null;
    connectionReady = false;
    suspendTransactionalUi();
    if (event.code === 4001) {
      stopConnection("SESSION_REPLACED", "This defender session is open in another tab.");
      return;
    }
    if (!terminalConnection) scheduleReconnect();
  });
  currentSocket.addEventListener("error", () => currentSocket.close());
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

function updateHeroPrimaryImpact(self: PlayerSnapshot): void {
  if (!self.heroId) {
    heroPrimaryImpact.replaceChildren();
    delete heroPrimaryImpact.dataset.impact;
    return;
  }
  const key = [
    self.heroId,
    self.stats.basicDamage,
    self.stats.basicAttackInterval,
    self.stats.moveSpeed,
    self.stats.basicMoveRetention,
  ].join("|");
  if (heroPrimaryImpact.dataset.impact === key) return;
  heroPrimaryImpact.dataset.impact = key;
  const impact = derivePrimaryImpactReadout(self.heroId, self.stats);
  const fullMetrics = impact.metrics
    .map((metric) => `${formatHeroStat(metric.value, 1)} ${metric.label}`)
    .join(" and ");
  const compactMetrics = impact.metrics
    .map((metric) => `${formatHeroStat(metric.value, 1)} ${PRIMARY_METRIC_SHORT_LABELS[metric.label] ?? metric.label}`)
    .join(" / ");
  const attacksPerSecond = `${formatHeroStat(impact.attacksPerSecond, 2)}/S`;
  const strideDescription = impact.moveRetention > 0
    ? ` Combat Stride moves at ${formatHeroStat(impact.moveSpeedDuringWindupImpact, 1)} world units per second during windup and impact, retaining ${formatHeroStat(impact.moveRetention * 100)} percent Move Speed. It does not apply to abilities.`
    : "";
  const strideLine = impact.moveRetention > 0
    ? `<div class="primary-impact-stride"><strong>COMBAT STRIDE</strong><span>${formatHeroStat(impact.moveSpeedDuringWindupImpact, 1)} WORLD/S</span><em>WINDUP + IMPACT</em></div>`
    : "";
  heroPrimaryImpact.setAttribute(
    "aria-label",
    `LMB, ${impact.name}. ${fullMetrics}. ${formatHeroStat(impact.attacksPerSecond, 2)} attacks per second.${strideDescription}`,
  );
  heroPrimaryImpact.innerHTML = `
    <div class="ability-impact-heading"><kbd>LMB</kbd><strong>${impact.name}</strong><small>PRIMARY</small></div>
    <div class="ability-impact-result"><span>${compactMetrics}</span><em>${attacksPerSecond}</em></div>
    ${strideLine}`;
}

function updateHeroAbilityImpact(self: PlayerSnapshot): void {
  if (!self.heroId) {
    heroAbilityImpact.replaceChildren();
    delete heroAbilityImpact.dataset.impact;
    return;
  }
  const key = [
    self.heroId,
    ...ABILITY_READOUT_SLOTS.map(([slot]) => self.abilityRanks[slot]),
    self.stats.abilityPower,
    self.stats.cooldownRecovery,
  ].join("|");
  if (heroAbilityImpact.dataset.impact === key) return;
  heroAbilityImpact.dataset.impact = key;
  heroAbilityImpact.replaceChildren();

  for (const [slot, keyLabel] of ABILITY_READOUT_SLOTS) {
    const impact = deriveAbilityImpactReadout(
      self.heroId,
      slot,
      self.abilityRanks[slot],
      self.stats.abilityPower,
      self.stats.cooldownRecovery,
    );
    const row = document.createElement("div");
    row.className = `ability-impact${impact.learned ? "" : " is-unlearned"}`;
    row.setAttribute("role", "listitem");
    const wraithHost = false;
    const cinderWall = impact.behavior?.id === "cinder_wall";
    const splitbolt = impact.behavior?.id === "splitbolt";
    const fullMetrics = impact.metrics
      .map((metric) => `${formatHeroStat(metric.value, 1)} ${metric.label}`)
      .concat(
        impact.behavior ? [impact.behavior.accessibleDescription] : [],
        wraithHost
          ? [`${wraithHostSummonCount(impact.rank)} Wraiths with up to ${WRAITH_HOST_MAX_STRIKES_PER_SUMMON} strikes each; at most 5 Wraiths active`]
          : [],
      )
      .join(" and ");
    const compactMetrics = impact.metrics
      .map((metric) => `${formatHeroStat(metric.value, 1)} ${wraithHost || cinderWall ? "DMG" : (ABILITY_METRIC_SHORT_LABELS[metric.label] ?? metric.label)}`)
      .concat(
        wraithHost
          ? [`${wraithHostSummonCount(impact.rank)}×${WRAITH_HOST_MAX_STRIKES_PER_SUMMON} HIT CAP`]
          : [],
      )
      .join("/");
    const cooldown = `${formatHeroStat(impact.cooldown, 1)}S`;
    row.setAttribute(
      "aria-label",
      impact.learned
        ? `${keyLabel}, ${impact.name}, rank ${impact.rank}. ${fullMetrics}. ${formatHeroStat(impact.cooldown, 1)} second cooldown.`
        : `${keyLabel}, ${impact.name}, unlearned.`,
    );
    row.innerHTML = `
      <div class="ability-impact-heading"><kbd>${keyLabel}</kbd><strong>${impact.name}</strong><small>${impact.learned ? `R${impact.rank}` : "R0"}</small></div>
      <div class="ability-impact-result"><span>${impact.learned ? compactMetrics : "UNLEARNED"}</span><em>${impact.learned ? cooldown : "—"}</em></div>
      ${impact.behavior ? `<div class="ability-impact-rule${splitbolt ? " is-rift" : ""}">${impact.behavior.compactLabel}</div>` : ""}`;
    heroAbilityImpact.append(row);
  }
}

const REFORGE_ITEM_NAMES: Record<ItemId, string> = {
  tempered_edge: "Edge",
  fleetstep_greaves: "Greaves",
  runebound_focus: "Focus",
  quickening_sigil: "Sigil",
  gateward_plate: "Plate",
};

function replacementStackPreview(
  current: PlayerSnapshot["equipment"],
  projected: PlayerSnapshot["equipment"],
  outgoingItemId: ItemId,
  incomingItemId: ItemId,
): string {
  return [outgoingItemId, incomingItemId]
    .map((itemId) => {
      const currentAttuned = isStackAttuned(equipmentCopyCount(current, itemId));
      const projectedAttuned = isStackAttuned(equipmentCopyCount(projected, itemId));
      return `${REFORGE_ITEM_NAMES[itemId]} ×${equipmentCopyCount(current, itemId)}${currentAttuned ? " ATTUNED" : ""} → ×${equipmentCopyCount(projected, itemId)}${projectedAttuned ? " ATTUNED" : ""}`;
    })
    .join(" · ");
}

function saleStackPreview(
  current: PlayerSnapshot["equipment"],
  projected: PlayerSnapshot["equipment"],
  outgoingItemId: ItemId,
): string {
  const currentCount = equipmentCopyCount(current, outgoingItemId);
  const projectedCount = equipmentCopyCount(projected, outgoingItemId);
  const currentAttuned = isStackAttuned(currentCount);
  const projectedAttuned = isStackAttuned(projectedCount);
  return `${REFORGE_ITEM_NAMES[outgoingItemId]} ×${currentCount}${currentAttuned ? " ATTUNED" : ""} → ×${projectedCount}${projectedAttuned ? " ATTUNED" : ""}`;
}

function replacementStatsPreview(
  current: HeroStatsSnapshot,
  projected: HeroStatsSnapshot,
  currentHp: number,
  heroId: HeroId,
  abilityRanks: PlayerSnapshot["abilityRanks"],
): string {
  const changes = EQUIPMENT_STAT_FIELDS
    .filter(({ key }) => key !== "basicMoveRetention" && Math.abs(current[key] - projected[key]) > 1e-9)
    .map(({ key, label }) => `${label} ${formatEquipmentStat(key, current[key])} → ${formatEquipmentStat(key, projected[key])}`);
  if (Math.abs(current.maxHp - projected.maxHp) > 1e-9) {
    const projectedHp = projectHealthAtPreservedRatio(currentHp, current.maxHp, projected.maxHp);
    const heldRatio = current.maxHp > 0
      ? Math.max(0, Math.min(1, currentHp / current.maxHp))
      : 0;
    changes.push(
      `Current HP ${formatHeroStat(currentHp, 1)}/${formatHeroStat(current.maxHp)} → ${formatHeroStat(projectedHp, 1)}/${formatHeroStat(projected.maxHp)} · ${formatHeroStat(heldRatio * 100, 1)}% HELD`,
    );
  }
  const currentStride = current.moveSpeed * current.basicMoveRetention;
  const projectedStride = projected.moveSpeed * projected.basicMoveRetention;
  if (Math.abs(currentStride - projectedStride) > 1e-9) {
    const strideValue = (speed: number) => speed > 0 ? `${formatHeroStat(speed, 1)} WORLD/S` : "LOCKED";
    changes.push(`Combat Stride ${strideValue(currentStride)} → ${strideValue(projectedStride)}`);
  }
  if (Math.abs(current.cooldownRecovery - projected.cooldownRecovery) > 1e-9) {
    const learnedCooldowns = projectLearnedAbilityCooldowns(
      heroId,
      abilityRanks,
      current,
      projected,
    );
    if (learnedCooldowns.length > 0) {
      changes.push(`Fresh Cast Cooldowns ${learnedCooldowns
        .map((cooldown) => `${abilityKeyLabel(cooldown.slot)} ${cooldown.name} ${cooldown.currentValue} → ${cooldown.projectedValue}`)
        .join(" / ")}`);
    }
  }
  return changes.join(" · ");
}

function replacementSignaturePreview(
  current: PlayerSnapshot["equipment"],
  projected: PlayerSnapshot["equipment"],
): string {
  const currentStack = dominantEquipmentStack(current);
  const projectedStack = dominantEquipmentStack(projected);
  const currentName = currentStack
    ? `${REFORGE_ITEM_NAMES[currentStack.itemId]}${currentStack.attuned ? " Attuned" : ""}`
    : "None";
  const projectedName = projectedStack
    ? `${REFORGE_ITEM_NAMES[projectedStack.itemId]}${projectedStack.attuned ? " Attuned" : ""}`
    : "None";
  const unchanged = currentStack?.itemId === projectedStack?.itemId && currentStack?.attuned === projectedStack?.attuned;
  return unchanged ? `${currentName} · unchanged` : `${currentName} → ${projectedName}`;
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
  updateHeroPrimaryImpact(self);
  updateHeroAbilityImpact(self);
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
  selling = false,
): void {
  const key = `${equipment.map((itemId) => itemId ?? "empty").join("|")}|${selling ? "sell" : incomingItemId ?? "read-only"}|${selectedSlotIndex ?? "none"}|${replacementRequestPending || saleRequestPending ? "pending" : "ready"}`;
  if (container.dataset.equipment === key) return;
  container.dataset.equipment = key;
  container.replaceChildren();
  const legalReplacementSlots = incomingItemId
    ? new Set(legalEquipmentReplacementSlots(equipment, incomingItemId))
    : null;
  for (let index = 0; index < EQUIPMENT_SLOT_COUNT; index += 1) {
    const itemId = equipment[index] ?? null;
    const interactive = Boolean(incomingItemId || selling);
    const slot = interactive ? document.createElement("button") : document.createElement("span");
    slot.className = `equipment-slot${itemId ? " has-item" : ""}`;
    slot.dataset.slot = String(index + 1);
    if (interactive && slot instanceof HTMLButtonElement) {
      slot.type = "button";
      const unchanged = itemId === incomingItemId;
      slot.classList.add(selling ? "is-sale-target" : "is-replace-target");
      slot.classList.toggle("is-unchanged", !selling && unchanged);
      slot.classList.toggle("is-selected", index === selectedSlotIndex);
      slot.disabled = selling
        ? !itemId || saleRequestPending
        : !legalReplacementSlots?.has(index as EquipmentSlotIndex) || replacementRequestPending;
      slot.addEventListener("click", () => {
        if (selling) selectSaleSlot(index as EquipmentSlotIndex);
        else selectReplacementSlot(index as EquipmentSlotIndex);
      });
    }
    if (itemId) {
      const item = ITEM_DEFINITIONS[itemId];
      slot.dataset.item = itemId;
      slot.textContent = ITEM_SYMBOLS[itemId];
      slot.title = `${item.name}: ${item.effectLabel}`;
      const incoming = incomingItemId ? ITEM_DEFINITIONS[incomingItemId] : null;
      slot.setAttribute(
        "aria-label",
        selling
          ? `Slot ${index + 1}: ${item.name}, ${item.effectLabel}. Select to sell for ${ARMORY_SELL_VALUE} gold.`
          : incoming
          ? itemId === incomingItemId
            ? `Slot ${index + 1}: ${item.name}. Already equipped here; choose another slot.`
            : `Slot ${index + 1}: trade in ${item.name}, ${item.effectLabel}, for ${ARMORY_SELL_VALUE} gold and buy ${incoming.name}, ${incoming.effectLabel}, for ${incoming.price} gold; ${armoryReforgeNetCost(incoming.price)} gold net.`
          : `Slot ${index + 1}: ${item.name}, ${item.effectLabel}`,
      );
    } else {
      slot.setAttribute("aria-label", selling
        ? `Slot ${index + 1}: empty. Nothing to sell.`
        : `Slot ${index + 1}: empty`);
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
      .map(({ itemId, count, totalEffectLabel }) => {
        const copyLabel = `${count} equipped ${count === 1 ? "copy" : "copies"}`;
        const progress = deriveAttunementProgress(count);
        const evolution = deriveItemEvolutionProgress(itemId, count);
        return `${ITEM_DEFINITIONS[itemId].name}, ${copyLabel}, ${progress.accessibleDescription}${evolution ? ` ${evolution.accessibleDescription}` : ""} ${totalEffectLabel}`;
      })
      .join("; "),
  );
  for (const { itemId, count, attuned, totalEffectLabel } of stacks) {
    const item = ITEM_DEFINITIONS[itemId];
    const progress = deriveAttunementProgress(count);
    const evolution = deriveItemEvolutionProgress(itemId, count);
    const progressLabel = evolution?.visualLabel ?? progress.visualLabel;
    const stack = document.createElement("div");
    stack.className = "equipment-stack";
    stack.dataset.item = itemId;
    stack.dataset.attunement = progress.state;
    stack.classList.toggle("is-attuned", attuned);
    stack.classList.toggle("will-attune", progress.state === "next");
    stack.setAttribute("role", "listitem");
    stack.innerHTML = `
      <span class="equipment-stack-icon" aria-hidden="true">${ITEM_SYMBOLS[itemId]}</span>
      <span class="equipment-stack-copy">
        <strong><span>${item.name}</span><b>×${count}</b></strong>
        <small>${totalEffectLabel}</small>
        <em>${progressLabel}</em>
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
  renderEquipmentSlots(
    shopEquipmentSlots,
    self.equipment,
    saleMode ? null : replacementItemId,
    saleMode ? saleSlotIndex : replacementSlotIndex,
    saleMode,
  );
}

function renderLearnedCooldownProjection(
  grid: HTMLElement,
  cooldowns: readonly LearnedAbilityCooldownProjection[],
): void {
  const projectionKey = cooldowns
    .map(({ slot, rank, currentValue, projectedValue }) => `${slot}:${rank}:${currentValue}:${projectedValue}`)
    .join("|");
  if (grid.dataset.projection === projectionKey) return;
  grid.dataset.projection = projectionKey;
  grid.replaceChildren(...cooldowns.map((cooldown) => {
    const row = document.createElement("span");
    row.className = "shop-item-cast-return";
    row.title = `${cooldown.name} rank ${cooldown.rank} fresh-cast cooldown: ${cooldown.currentValue} to ${cooldown.projectedValue}`;
    const key = document.createElement("b");
    key.textContent = abilityKeyLabel(cooldown.slot);
    const value = document.createElement("span");
    value.textContent = `${cooldown.currentValue} → ${cooldown.projectedValue}`;
    row.append(key, value);
    return row;
  }));
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
      <span class="shop-item-meta"><span class="shop-item-effect">${item.effectLabel}</span><small class="shop-item-owned" data-shop-owned aria-hidden="true">×0</small></span>
      <small class="shop-item-description">${item.description}</small>
      <span class="shop-item-projection" data-shop-projection aria-hidden="true" hidden><small>NEXT</small><strong data-shop-projection-value>—</strong><em data-shop-projection-attunement hidden>ATTUNES</em><span class="shop-item-evolution" data-shop-evolution hidden><small>COMBAT STRIDE</small><strong data-shop-evolution-value>—</strong></span><span class="shop-item-cast-preview" data-shop-cast-preview hidden><small>RETURNS</small><span class="shop-item-cast-grid" data-shop-cast-grid></span></span></span>
      <span class="shop-item-price"><span data-shop-price>● ${item.price}</span><small data-shop-status>BUY &amp; EQUIP</small></span>`;
    button.addEventListener("click", () => buyShopItem(itemId));
    shopItems.append(button);
    shopItemButtons.set(itemId, button);
  });
}

function updateShopPresentation(vendorId: VendorId, name: string): void {
  const presentation = VENDOR_PRESENTATION[vendorId];
  shopPanel.dataset.vendor = vendorId;
  shopPanel.dataset.stockCount = String(VENDOR_DEFINITIONS[vendorId].itemIds.length);
  shopDistrict.textContent = presentation.district;
  shopTitle.textContent = name;
  shopTagline.textContent = presentation.tagline;
  shopClose.setAttribute("aria-label", `Close ${name}`);
  renderShopCatalog(vendorId);
}

function refreshShopTradeState(self: PlayerSnapshot | undefined = currentPlayer()): void {
  const selectedItem = replacementItemId ? ITEM_DEFINITIONS[replacementItemId] : null;
  const selectedReforgeCost = selectedItem ? armoryReforgeNetCost(selectedItem.price) : 0;
  const selectedOutgoingId = replacementSlotIndex !== null ? self?.equipment[replacementSlotIndex] ?? null : null;
  const selectedOutgoing = selectedOutgoingId ? ITEM_DEFINITIONS[selectedOutgoingId] : null;
  const replacementConfirming = Boolean(selectedItem && selectedOutgoing && replacementExpectedItemId === selectedOutgoingId);
  const saleOutgoingId = saleSlotIndex !== null ? self?.equipment[saleSlotIndex] ?? null : null;
  const saleOutgoing = saleOutgoingId ? ITEM_DEFINITIONS[saleOutgoingId] : null;
  const saleConfirming = Boolean(saleMode && saleOutgoing && saleExpectedItemId === saleOutgoingId);
  const confirming = replacementConfirming || saleConfirming;
  const hasSaleItems = Boolean(self?.equipment.some((itemId) => itemId !== null));
  if (!confirming && shopReplaceConfirm.contains(document.activeElement)) {
    (shopOpen ? shopClose : heroStatsToggle).focus();
  }
  shopPanel.classList.toggle("is-replacing", Boolean(selectedItem));
  shopPanel.classList.toggle("is-selling", saleMode);
  shopPanel.classList.toggle("is-confirming", confirming);
  shopLoadoutLabel.textContent = saleConfirming
    ? "CONFIRM THE SALE"
    : saleMode
      ? "CHOOSE A SLOT TO SELL"
      : replacementConfirming
        ? "CONFIRM THE REFORGE"
        : selectedItem
          ? "CHOOSE A SLOT TO TRADE IN"
          : "YOUR LOADOUT";
  const guideVisible = Boolean((selectedItem || saleMode) && !confirming);
  shopReplaceGuide.classList.toggle("is-hidden", !guideVisible);
  shopReplaceGuide.setAttribute("aria-hidden", String(!guideVisible));
  shopReplaceConfirm.classList.toggle("is-hidden", !confirming);
  shopReplaceConfirm.setAttribute("aria-hidden", String(!confirming));
  shopSellToggle.classList.toggle("is-hidden", saleMode || Boolean(selectedItem) || !hasSaleItems);
  shopSellToggle.disabled = !hasSaleItems || replacementRequestPending || saleRequestPending || ordinaryPurchaseRequest !== null;
  shopSellToggle.setAttribute(
    "aria-label",
    hasSaleItems
      ? `Sell one equipped item for ${ARMORY_SELL_VALUE} gold. Press X.`
      : "No equipped item is available to sell.",
  );
  shopReplaceStacks.textContent = "—";
  shopReplaceStats.textContent = "—";
  shopReplaceSignature.textContent = "—";
  shopReplaceConfirm.removeAttribute("aria-label");
  if (saleMode) {
    shopReplaceItem.textContent = saleRequestPending
      ? "VERIFYING SALE…"
      : `SELL ONE ITEM · +${ARMORY_SELL_VALUE} GOLD`;
  } else if (selectedItem) {
    shopReplaceItem.textContent = replacementRequestPending
      ? `REFORGING ${selectedItem.name.toUpperCase()}…`
      : `${ITEM_SYMBOLS[selectedItem.id]} ${selectedItem.name.toUpperCase()} · ${selectedReforgeCost} GOLD NET`;
  }
  let previewReady = false;
  if (replacementConfirming && selectedItem && selectedOutgoing && self?.heroId && replacementSlotIndex !== null) {
    shopReplacePreview.textContent = `OUT ${REFORGE_ITEM_NAMES[selectedOutgoing.id].toUpperCase()} ${selectedOutgoing.effectLabel} → IN ${REFORGE_ITEM_NAMES[selectedItem.id].toUpperCase()} ${selectedItem.effectLabel}`;
    shopReplaceTerms.textContent = `BUY ${selectedItem.price} − TRADE-IN ${ARMORY_SELL_VALUE} = ${selectedReforgeCost} GOLD NET`;
    const projection = projectEquipmentChange(self.equipment, selectedItem.id, replacementSlotIndex);
    if (projection?.replacedItemId === selectedOutgoing.id) {
      const projectedStats = deriveHeroStats(self.heroId, self.level, projection.equipment);
      shopReplaceStacks.textContent = replacementStackPreview(
        self.equipment,
        projection.equipment,
        selectedOutgoing.id,
        selectedItem.id,
      );
      shopReplaceStats.textContent = replacementStatsPreview(
        self.stats,
        projectedStats,
        self.hp,
        self.heroId,
        self.abilityRanks,
      ) || "No Hero Stat change";
      shopReplaceSignature.textContent = replacementSignaturePreview(self.equipment, projection.equipment);
      shopReplaceConfirm.setAttribute(
        "aria-label",
        `${shopReplacePreview.textContent}. Stacks: ${shopReplaceStacks.textContent}. Hero Stats: ${shopReplaceStats.textContent}. Signature: ${shopReplaceSignature.textContent}. ${shopReplaceTerms.textContent}.`,
      );
      previewReady = true;
    }
  } else if (saleConfirming && saleOutgoing && self?.heroId && saleSlotIndex !== null) {
    const projection = projectEquipmentRemoval(self.equipment, saleSlotIndex, saleOutgoing.id);
    shopReplacePreview.textContent = `SELL SLOT ${saleSlotIndex + 1} — ${saleOutgoing.name.toUpperCase()} ${saleOutgoing.effectLabel}`;
    if (projection?.removedItemId === saleOutgoing.id) {
      const projectedStats = deriveHeroStats(self.heroId, self.level, projection.equipment);
      shopReplaceStacks.textContent = saleStackPreview(self.equipment, projection.equipment, saleOutgoing.id);
      shopReplaceStats.textContent = replacementStatsPreview(
        self.stats,
        projectedStats,
        self.hp,
        self.heroId,
        self.abilityRanks,
      ) || "No Hero Stat change";
      shopReplaceSignature.textContent = replacementSignaturePreview(self.equipment, projection.equipment);
      shopReplaceTerms.textContent = `GOLD ${formatHeroStat(self.gold, 1)} → ${formatHeroStat(self.gold + ARMORY_SELL_VALUE, 1)} · +${ARMORY_SELL_VALUE} · SLOT ${saleSlotIndex + 1} BECOMES EMPTY`;
      shopReplaceConfirm.setAttribute(
        "aria-label",
        `${shopReplacePreview.textContent}. Stacks: ${shopReplaceStacks.textContent}. Hero Stats: ${shopReplaceStats.textContent}. Signature: ${shopReplaceSignature.textContent}. ${shopReplaceTerms.textContent}.`,
      );
      previewReady = true;
    }
  }
  const requestPending = replacementRequestPending || saleRequestPending;
  shopReplaceSubmit.disabled = !confirming || !previewReady || requestPending;
  shopReplaceCancel.disabled = requestPending;
  shopReplaceSubmit.innerHTML = saleMode
    ? saleRequestPending ? "SELLING…" : `SELL ITEM · +${ARMORY_SELL_VALUE} <kbd>ENTER</kbd>`
    : replacementRequestPending ? "REFORGING…" : "BUY &amp; REPLACE <kbd>ENTER</kbd>";
  if (self) {
    renderEquipmentSlots(
      shopEquipmentSlots,
      self.equipment,
      saleMode ? null : replacementItemId,
      saleMode ? saleSlotIndex : replacementSlotIndex,
      saleMode,
    );
    if (shopOpen) updateShopCards(self);
  }
}

function clearReplacementSelection(announce = false): void {
  if (!replacementItemId && replacementSlotIndex === null && !replacementRequestPending) return;
  replacementItemId = null;
  replacementSlotIndex = null;
  replacementExpectedItemId = null;
  replacementRequestPending = false;
  refreshShopTradeState();
  if (announce) shopAnnouncement.textContent = "Replacement cancelled. Choose a ware or close the shop.";
}

function clearReplacementSlot(announce = false): void {
  if (replacementSlotIndex === null && !replacementExpectedItemId) return;
  replacementSlotIndex = null;
  replacementExpectedItemId = null;
  refreshShopTradeState();
  if (announce && replacementItemId) {
    const item = ITEM_DEFINITIONS[replacementItemId];
    shopAnnouncement.textContent = `${item.name} remains selected. Choose equipment slot 1 through 6, or press Escape again to cancel.`;
    shopItemButtons.get(replacementItemId)?.focus();
  }
}

function clearSaleSelection(announce = false): void {
  if (!saleMode && saleSlotIndex === null && !saleRequestPending) return;
  saleMode = false;
  saleSlotIndex = null;
  saleExpectedItemId = null;
  saleRequestPending = false;
  refreshShopTradeState();
  if (announce) {
    shopAnnouncement.textContent = "Sale cancelled. Browse wares, sell another item, or close the shop.";
    requestAnimationFrame(() => shopSellToggle.focus());
  }
}

function clearSaleSlot(announce = false): void {
  if (saleSlotIndex === null && !saleExpectedItemId) return;
  saleSlotIndex = null;
  saleExpectedItemId = null;
  saleRequestPending = false;
  refreshShopTradeState();
  if (announce) {
    shopAnnouncement.textContent = `Sale mode remains open. Choose equipment slot 1 through 6, press X, or press Escape again to cancel.`;
  }
}

function toggleSaleMode(): void {
  if (!shopOpen) return;
  if (replacementRequestPending || saleRequestPending || ordinaryPurchaseRequest) {
    shopAnnouncement.textContent = "The current trade is already being verified by the server.";
    return;
  }
  if (saleMode) {
    clearSaleSelection(true);
    return;
  }
  const self = currentPlayer();
  if (!self?.equipment.some((itemId) => itemId !== null)) {
    shopAnnouncement.textContent = "No equipped item is available to sell.";
    toast("Equip a ware before trying to sell.", "warning");
    return;
  }
  replacementItemId = null;
  replacementSlotIndex = null;
  replacementExpectedItemId = null;
  saleMode = true;
  saleSlotIndex = null;
  saleExpectedItemId = null;
  refreshShopTradeState(self);
  shopAnnouncement.textContent = `Sell mode opened. Choose one occupied equipment slot with the mouse or keys 1 through 6. Every item sells for ${ARMORY_SELL_VALUE} gold at either Citadel shop. Press X or Escape to cancel.`;
}

function selectSaleSlot(slotIndex: EquipmentSlotIndex): void {
  const self = currentPlayer();
  if (!shopOpen || !saleMode || !self || !activeVendorId || saleRequestPending) return;
  const vendor = vendorSnapshot(activeVendorId);
  if (!vendor || distanceBetween(self.position, vendor.position) > vendor.interactionRadius) {
    clearSaleSelection();
    toast(`Move closer to ${vendor?.name ?? "the vendor"}.`, "warning");
    return;
  }
  const outgoingItemId = self.equipment[slotIndex];
  if (!outgoingItemId) {
    toast(`Slot ${slotIndex + 1} is empty.`, "warning");
    return;
  }
  const projection = projectEquipmentRemoval(self.equipment, slotIndex, outgoingItemId);
  if (!projection) {
    toast("That item can no longer be sold.", "warning");
    return;
  }
  saleSlotIndex = slotIndex;
  saleExpectedItemId = outgoingItemId;
  refreshShopTradeState(self);
  const outgoing = ITEM_DEFINITIONS[outgoingItemId];
  shopAnnouncement.textContent = `Slot ${slotIndex + 1} selected. Sell ${outgoing.name}, ${outgoing.effectLabel}, for ${ARMORY_SELL_VALUE} gold. Stacks: ${shopReplaceStacks.textContent}. Hero Stats: ${shopReplaceStats.textContent}. Signature: ${shopReplaceSignature.textContent}. Wallet: ${formatHeroStat(self.gold, 1)} to ${formatHeroStat(self.gold + ARMORY_SELL_VALUE, 1)} gold. Press Enter or choose Sell Item to confirm, or Escape to go back.`;
  requestAnimationFrame(() => shopReplaceSubmit.focus());
}

function confirmSale(): void {
  if (!connectionReady) return;
  const self = currentPlayer();
  if (
    !shopOpen ||
    !saleMode ||
    !self ||
    !activeVendorId ||
    saleSlotIndex === null ||
    !saleExpectedItemId ||
    saleRequestPending
  ) return;
  const vendor = vendorSnapshot(activeVendorId);
  if (!vendor || distanceBetween(self.position, vendor.position) > vendor.interactionRadius) {
    clearSaleSelection();
    toast(`Move closer to ${vendor?.name ?? "the vendor"}.`, "warning");
    return;
  }
  const currentItemId = self.equipment[saleSlotIndex];
  if (currentItemId !== saleExpectedItemId) {
    clearSaleSlot();
    toast("That equipment slot changed. Choose it again.", "warning");
    shopAnnouncement.textContent = "Equipment changed before confirmation. No item was sold; choose a slot again.";
    return;
  }
  const projection = projectEquipmentRemoval(self.equipment, saleSlotIndex, saleExpectedItemId);
  if (!projection) {
    clearSaleSlot();
    toast("That sale can no longer be previewed.", "warning");
    return;
  }
  saleRequestPending = true;
  refreshShopTradeState(self);
  shopAnnouncement.textContent = `Selling slot ${saleSlotIndex + 1}: ${ITEM_DEFINITIONS[saleExpectedItemId].name} for ${ARMORY_SELL_VALUE} gold.`;
  audio.unlock();
  send({
    type: "sell_item",
    vendorId: activeVendorId,
    slotIndex: saleSlotIndex,
    expectedItemId: saleExpectedItemId,
  });
}

function selectReplacementItem(itemId: ItemId): void {
  if (replacementRequestPending || saleRequestPending || ordinaryPurchaseRequest) return;
  if (saleMode) clearSaleSelection();
  if (replacementItemId === itemId) {
    clearReplacementSelection(true);
    return;
  }
  const self = currentPlayer();
  const offer = self ? deriveShopReplacementOffer(self.equipment, itemId) : null;
  if (!offer || offer.state !== "replace") {
    if (offer?.state === "full-stack") {
      const item = ITEM_DEFINITIONS[itemId];
      shopAnnouncement.textContent = `${offer.actionLabel} No gold was spent.`;
      toast(`${item.name} already fills all six slots.`, "warning");
    }
    return;
  }
  replacementItemId = itemId;
  replacementSlotIndex = null;
  replacementExpectedItemId = null;
  const item = ITEM_DEFINITIONS[itemId];
  const reforgeCost = armoryReforgeNetCost(item.price);
  refreshShopTradeState();
  shopAnnouncement.textContent = `${item.name} selected for a ${reforgeCost}-gold net reforge: buy for ${item.price}, trade in the chosen slot for ${ARMORY_SELL_VALUE}. Choose equipment slot 1 through 6, or press Escape to cancel.`;
}

function selectReplacementSlot(slotIndex: EquipmentSlotIndex): void {
  const self = currentPlayer();
  if (!shopOpen || !self || !activeVendorId || !replacementItemId || replacementRequestPending || saleRequestPending) return;
  const vendor = vendorSnapshot(activeVendorId);
  const incoming = ITEM_DEFINITIONS[replacementItemId];
  const reforgeCost = armoryReforgeNetCost(incoming.price);
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
  if (self.gold < reforgeCost) {
    toast(`Need ${Math.max(1, Math.ceil(reforgeCost - self.gold))} more gold.`, "warning");
    return;
  }
  const outgoing = ITEM_DEFINITIONS[outgoingItemId];
  replacementSlotIndex = slotIndex;
  replacementExpectedItemId = outgoingItemId;
  refreshShopTradeState(self);
  shopAnnouncement.textContent = `Slot ${slotIndex + 1} selected. Out ${outgoing.name}, ${outgoing.effectLabel}; in ${incoming.name}, ${incoming.effectLabel}. Stacks: ${shopReplaceStacks.textContent}. Hero Stats: ${shopReplaceStats.textContent}. Signature: ${shopReplaceSignature.textContent}. Buy ${incoming.price}, trade in for ${ARMORY_SELL_VALUE}, ${reforgeCost} gold net. Press Enter or choose Buy and Replace to confirm, or Escape to go back.`;
  requestAnimationFrame(() => shopReplaceSubmit.focus());
}

function confirmReplacement(): void {
  if (!connectionReady) return;
  const self = currentPlayer();
  if (
    !shopOpen ||
    !self ||
    !activeVendorId ||
    !replacementItemId ||
    replacementSlotIndex === null ||
    !replacementExpectedItemId ||
    replacementRequestPending ||
    saleRequestPending
  ) return;
  const vendor = vendorSnapshot(activeVendorId);
  const incoming = ITEM_DEFINITIONS[replacementItemId];
  const reforgeCost = armoryReforgeNetCost(incoming.price);
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
  const projection = projectEquipmentChange(self.equipment, replacementItemId, replacementSlotIndex);
  if (!projection || projection.replacedItemId !== replacementExpectedItemId) {
    clearReplacementSlot();
    toast("That replacement can no longer be previewed.", "warning");
    shopAnnouncement.textContent = "The projected equipment change is no longer available. No gold was spent; choose a slot again.";
    return;
  }
  if (self.gold < reforgeCost) {
    toast(`Need ${Math.max(1, Math.ceil(reforgeCost - self.gold))} more gold.`, "warning");
    return;
  }
  const outgoing = ITEM_DEFINITIONS[currentOutgoingItemId];
  replacementRequestPending = true;
  refreshShopTradeState(self);
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
    const reforgeCost = armoryReforgeNetCost(item.price);
    const transactionCost = slotsFull ? reforgeCost : item.price;
    const affordable = self.gold >= transactionCost;
    const selected = replacementItemId === itemId;
    const purchasePending = ordinaryPurchaseRequest !== null;
    const pendingThisItem = ordinaryPurchaseRequest?.itemId === itemId;
    const replacementOffer = deriveShopReplacementOffer(self.equipment, itemId);
    const fullStack = replacementOffer.state === "full-stack";
    const canBuy = !saleMode && !self.downed && withinPurchaseRange && affordable && !replacementRequestPending && !saleRequestPending && !purchasePending && !fullStack;
    const status = button.querySelector<HTMLElement>("[data-shop-status]");
    const price = button.querySelector<HTMLElement>("[data-shop-price]");
    if (price) price.textContent = slotsFull ? `● ${reforgeCost} NET` : `● ${item.price}`;
    const owned = equipmentCopyCount(self.equipment, itemId);
    const attunementProgress = deriveAttunementProgress(owned);
    const evolutionProgress = deriveItemEvolutionProgress(itemId, owned);
    const attuned = attunementProgress.state === "attuned";
    const nextCopyAttunes = attunementProgress.state === "next";
    const ownedLabel = button.querySelector<HTMLElement>("[data-shop-owned]");
    const purchasePreview = slotsFull
      ? null
      : projectOrdinaryPurchasePreview(
          {
            heroId: self.heroId,
            level: self.level,
            equipment: self.equipment,
            stats: self.stats,
            abilityRanks: self.abilityRanks,
          },
          itemId,
        );
    const preview = button.querySelector<HTMLElement>("[data-shop-projection]");
    const previewValue = button.querySelector<HTMLElement>("[data-shop-projection-value]");
    const previewAttunement = button.querySelector<HTMLElement>("[data-shop-projection-attunement]");
    const previewEvolution = button.querySelector<HTMLElement>("[data-shop-evolution]");
    const previewEvolutionValue = button.querySelector<HTMLElement>("[data-shop-evolution-value]");
    const previewCast = button.querySelector<HTMLElement>("[data-shop-cast-preview]");
    const previewCastGrid = button.querySelector<HTMLElement>("[data-shop-cast-grid]");
    const learnedCooldowns = purchasePreview?.learnedCooldowns ?? [];
    button.classList.toggle("has-purchase-preview", purchasePreview !== null);
    button.classList.toggle("has-evolution-preview", purchasePreview?.combatStride !== null && purchasePreview?.combatStride !== undefined);
    button.classList.toggle("has-cast-preview", learnedCooldowns.length > 0);
    if (preview) preview.hidden = purchasePreview === null;
    if (previewValue) previewValue.textContent = purchasePreview?.resultText ?? "—";
    if (previewAttunement) previewAttunement.hidden = !purchasePreview?.attunes;
    if (previewEvolution) previewEvolution.hidden = !purchasePreview?.combatStride;
    if (previewEvolutionValue) {
      const stride = purchasePreview?.combatStride;
      previewEvolutionValue.textContent = stride
        ? stride.currentSpeed <= 0
          ? `${stride.projectedValue} WORLD/S DURING LMB`
          : `${stride.currentValue} → ${stride.projectedValue} WORLD/S`
        : "—";
    }
    if (previewCast) previewCast.hidden = learnedCooldowns.length === 0;
    if (previewCastGrid) renderLearnedCooldownProjection(previewCastGrid, learnedCooldowns);
    if (ownedLabel) {
      ownedLabel.textContent = attunementProgress.state === "building"
        ? `×${owned}/${ITEM_ATTUNEMENT_THRESHOLD}`
        : attunementProgress.state === "next"
          ? `×${owned}/${ITEM_ATTUNEMENT_THRESHOLD} NEXT`
          : attunementProgress.state === "attuned"
            ? `×${owned} ${evolutionProgress?.state === "active" ? "STRIDE" : "ATTUNED"}`
            : `×${owned}`;
      ownedLabel.dataset.attunement = attunementProgress.state;
      ownedLabel.classList.toggle("has-items", owned > 0);
      ownedLabel.classList.toggle("is-building", attunementProgress.state === "building");
      ownedLabel.classList.toggle("will-attune", nextCopyAttunes);
      ownedLabel.classList.toggle("is-attuned", attuned);
    }
    button.disabled = !canBuy;
    button.classList.toggle("can-buy", canBuy);
    button.classList.toggle("is-selected", selected);
    button.classList.toggle("is-pending", pendingThisItem);
    button.classList.toggle("is-full-stack", fullStack);
    const actionLabel = purchasePending
      ? pendingThisItem ? "Purchase request pending." : "Another purchase request is pending."
      : saleMode
        ? "Sale mode is open; choose an occupied equipment slot."
        : fullStack
          ? replacementOffer.actionLabel!
          : !withinPurchaseRange
            ? `Move closer to ${vendorName}.`
            : saleRequestPending
              ? "Sale request pending."
              : replacementRequestPending && selected
                ? "Replacement request pending."
                : slotsFull && selected && replacementSlotIndex !== null
                  ? "Selected. Confirm the exact replacement below."
                  : slotsFull && selected
                    ? "Selected. Choose equipment slot 1 through 6 to replace."
                    : slotsFull && affordable
                      ? replacementOffer.actionLabel!
                      : affordable
                        ? "Buy and equip."
                        : `Need ${Math.max(1, Math.ceil(transactionCost - self.gold))} more gold.`;
    const statusLabel = purchasePending
      ? pendingThisItem ? "PURCHASING" : "WAIT"
      : saleMode
        ? "SELL MODE"
        : fullStack
          ? replacementOffer.statusLabel!
          : !withinPurchaseRange
            ? "MOVE CLOSER"
            : saleRequestPending
              ? "SELLING"
              : replacementRequestPending && selected
                ? "REFORGING"
                : slotsFull && selected && replacementSlotIndex !== null
                  ? "CONFIRM BELOW"
                  : slotsFull && selected
                    ? "SELECT SLOT"
                    : slotsFull
                      ? replacementOffer.statusLabel!
                      : affordable
                        ? "BUY & EQUIP"
                        : `NEED ${Math.max(1, Math.ceil(transactionCost - self.gold))}`;
    if (status) status.textContent = statusLabel;
    const attunementDescription = ` ${attunementProgress.accessibleDescription}${evolutionProgress ? ` ${evolutionProgress.accessibleDescription}` : ""}`;
    const previewDescription = purchasePreview
      ? ` Next Hero Stat result: ${purchasePreview.accessibleResult}`
      : "";
    button.setAttribute(
      "aria-label",
      `${item.name}, ${item.effectLabel}, ${item.price} gold${slotsFull ? `; full-build reforge costs ${reforgeCost} gold after a ${ARMORY_SELL_VALUE}-gold trade-in` : ""}. You own ${owned} ${owned === 1 ? "copy" : "copies"}.${attunementDescription}${previewDescription} ${actionLabel}`,
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
  if (open && !connectionReady) return;
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
    saleMode = false;
    saleSlotIndex = null;
    saleExpectedItemId = null;
    saleRequestPending = false;
    const vendor = vendorSnapshot(activeVendorId, state);
    if (activeVendorId && vendor) {
      updateShopPresentation(activeVendorId, vendor.name);
      shopAnnouncement.textContent = `${vendor.name} opened. ${vendor.itemIds.map((itemId) => ITEM_DEFINITIONS[itemId].name).join(" and ")} available for ${ITEM_DEFINITIONS[vendor.itemIds[0]!].price} gold; any equipped item sells here for ${ARMORY_SELL_VALUE}.`;
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
    saleMode = false;
    saleSlotIndex = null;
    saleExpectedItemId = null;
    saleRequestPending = false;
    shopAnnouncement.textContent = "Shop closed.";
    setHeroStatsOpen(restoreStats);
  }
  shopPanel.classList.toggle("is-hidden", !shopOpen);
  shopPanel.setAttribute("aria-hidden", String(!shopOpen));
  refreshShopTradeState(self);
}

function buyShopItem(itemId: ItemId): void {
  if (!connectionReady) return;
  const self = currentPlayer();
  if (!shopOpen || !self || !activeVendorId || saleMode || saleRequestPending || replacementRequestPending) return;
  const vendor = vendorSnapshot(activeVendorId);
  if (!vendor || distanceBetween(self.position, vendor.position) > vendor.interactionRadius) {
    toast(`Move closer to ${vendor?.name ?? "the vendor"}.`, "warning");
    return;
  }
  const item = ITEM_DEFINITIONS[itemId];
  const replacementOffer = deriveShopReplacementOffer(self.equipment, itemId);
  if (replacementOffer.state === "full-stack") {
    shopAnnouncement.textContent = `${replacementOffer.actionLabel} No gold was spent.`;
    toast(`${item.name} already fills all six slots.`, "warning");
    return;
  }
  if (equipmentIsFull(self.equipment)) {
    const reforgeCost = armoryReforgeNetCost(item.price);
    if (self.gold < reforgeCost) {
      toast(`Need ${Math.max(1, Math.ceil(reforgeCost - self.gold))} more gold.`, "warning");
      return;
    }
    selectReplacementItem(itemId);
    return;
  }
  if (self.gold < item.price) {
    toast(`Need ${Math.max(1, Math.ceil(item.price - self.gold))} more gold.`, "warning");
    return;
  }
  const projection = projectEquipmentChange(self.equipment, itemId);
  if (!projection || projection.replacedItemId !== null) {
    toast("The next equipment slot is no longer available.", "warning");
    return;
  }
  const request = beginOrdinaryPurchaseRequest(ordinaryPurchaseRequest, {
    itemId,
    slotIndex: projection.slotIndex,
  });
  if (!request.shouldSend) return;
  clearReplacementSelection();
  ordinaryPurchaseRequest = request.request;
  refreshShopTradeState(self);
  audio.unlock();
  send({ type: "buy_item", vendorId: activeVendorId, itemId });
}

function updateArmoryUi(state: GameSnapshot, self: PlayerSnapshot | undefined): void {
  if (!self) {
    if (shopOpen) setShopOpen(false);
    interactionPrompt.classList.add("is-hidden");
    return;
  }

  ordinaryPurchaseRequest = reconcileOrdinaryPurchaseRequest(
    ordinaryPurchaseRequest,
    self.equipment,
    isHeroStatsPhase(state.phase),
  );
  if (
    saleMode &&
    saleSlotIndex !== null &&
    saleExpectedItemId &&
    self.equipment[saleSlotIndex] !== saleExpectedItemId
  ) {
    const saleWasPending = saleRequestPending;
    const completedSaleSlot = saleSlotIndex;
    const soldItem = ITEM_DEFINITIONS[saleExpectedItemId];
    if (saleWasPending) clearSaleSelection();
    else clearSaleSlot();
    shopAnnouncement.textContent = saleWasPending
      ? `${soldItem.name} sale verified. Slot ${completedSaleSlot + 1} is open and ${ARMORY_SELL_VALUE} gold was credited.`
      : "Equipment changed before confirmation. No item was sold; choose a slot again.";
  }
  if (replacementItemId && !equipmentIsFull(self.equipment)) clearReplacementSelection();
  if (
    replacementItemId &&
    !replacementRequestPending &&
    deriveShopReplacementOffer(self.equipment, replacementItemId).state === "full-stack"
  ) {
    const item = ITEM_DEFINITIONS[replacementItemId];
    clearReplacementSelection();
    shopAnnouncement.textContent = `${item.name} now fills all six equipment slots. Choose another ware to reforge.`;
  }
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
    refreshShopTradeState(self);
    updateShopCards(self, distanceBetween(self.position, activeVendor.position) <= activeVendor.interactionRadius);
  }
}

function pulsePurchasedStat(itemId: ItemId | undefined): void {
  if (!itemId) return;
  const statKey = equipmentStatFieldForItem(itemId).key;
  const value = statKey === "basicDamage"
    ? statBasicDamage
    : statKey === "maxHp"
      ? statMaxHealth
      : statKey === "moveSpeed"
      ? statMoveSpeed
      : statKey === "abilityPower"
        ? statAbilityPower
        : statKey === "cooldownRecovery"
          ? statCooldownRecovery
          : null;
  const stat = value?.closest<HTMLElement>(".hero-stat");
  const targets = [
    ...(stat ? [stat] : []),
    ...(statKey === "basicDamage" || statKey === "moveSpeed" || statKey === "basicMoveRetention" ? [heroPrimaryImpact] : []),
    ...(statKey === "abilityPower" || statKey === "cooldownRecovery" ? [abilityImpactReadout] : []),
  ];
  if (targets.length === 0) return;
  for (const target of targets) target.classList.remove("is-purchased");
  requestAnimationFrame(() => {
    for (const target of targets) target.classList.add("is-purchased");
    window.setTimeout(() => {
      for (const target of targets) target.classList.remove("is-purchased");
    }, 760);
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
  if (!connectionReady) return;
  audio.unlock();
  selectedHero = heroId;
  heroCss(heroId);
  if (joinedName !== cleanName(playerNameInput.value)) {
    joinedName = cleanName(playerNameInput.value);
    send({ type: "join", name: joinedName });
  }
  updateLobby();
}

function updateLobby(): void {
  if (!snapshot) return;
  const self = snapshot.players.find((player) => player.id === localPlayerId);
  selectedHero = "defender";
  for (const card of heroGrid.querySelectorAll<HTMLButtonElement>(".hero-card")) {
    const heroId = card.dataset.hero as HeroId;
    card.classList.toggle("is-selected", heroId === "defender");
    card.classList.remove("is-taken");
    card.disabled = false;
    const ownerLabel = card.querySelector<HTMLElement>(".hero-owner");
    if (ownerLabel) {
      ownerLabel.classList.remove("is-hidden");
      ownerLabel.textContent = "EVERY PLAYER · ONE DEFENDER";
    }
  }
  const reconnectingPlayers = snapshot.players.filter((player) => !player.connected).length;
  setTextIfChanged(lobbyCount, `${snapshot.players.length} / 4 defender${snapshot.players.length === 1 ? "" : "s"}${reconnectingPlayers > 0 ? ` · ${reconnectingPlayers} reconnecting` : ""}`);
  const isHost = snapshot.lobby.hostId === localPlayerId;
  readyButton.disabled = !self;
  if (self && !self.ready) {
    setReadyText("READY", "ENTER THE CITY");
    setTextIfChanged(lobbyNote, "Enter the Citadel with a practice weapon");
  } else if (isHost && snapshot.lobby.canStart) {
    setReadyText("START ARMING", "YOUR PARTY IS READY");
    setTextIfChanged(lobbyNote, "The party is ready");
  } else if (isHost) {
    setReadyText("CANCEL READY", "WAITING FOR THE PARTY");
    setTextIfChanged(lobbyNote, "Waiting for every defender to ready up");
  } else {
    setReadyText("CANCEL READY", "WAITING FOR THE HOST");
    setTextIfChanged(lobbyNote, "Ready — the host will begin the siege");
  }
}

function setReadyText(main: string, sub: string): void {
  const mainElement = readyButton.querySelector<HTMLElement>(".ready-main");
  const subElement = readyButton.querySelector<HTMLElement>(".ready-sub");
  if (mainElement) mainElement.textContent = main;
  if (subElement) subElement.textContent = sub;
}

readyButton.addEventListener("click", () => {
  if (!connectionReady) return;
  audio.unlock();
  if (!snapshot) return;
  const self = snapshot.players.find((player) => player.id === localPlayerId);
  if (!self) return;
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
  if (!connectionReady) return;
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

function playAttunementTransition(
  event: GameEvent,
  transition: NonNullable<GameEvent["attunementTransition"]>,
): void {
  const tracked = event.playerId ? playerVisuals.get(event.playerId) : null;
  const player = event.playerId
    ? snapshot?.players.find((candidate) => candidate.id === event.playerId)
    : null;
  const position = tracked
    ? { x: tracked.visual.position.x, z: tracked.visual.position.z }
    : player?.position ?? event.position ?? WORLD_LAYOUT.nexus;
  const local = event.playerId === localPlayerId;
  const color = new THREE.Color(BUILD_SIGNATURE_COLORS[transition.itemId]).getHex();
  spawnBurst(
    position,
    color,
    transition.change === "gained" ? local ? 26 : 15 : local ? 11 : 7,
    transition.change === "gained" ? local ? 1.65 : 1.2 : local ? 0.85 : 0.6,
  );
  if (tracked) {
    pulseEntityBuildSignature(
      tracked.visual,
      transition.itemId,
      transition.change,
    );
  }
  if (!local) return;
  const text = createFloatingText(
    transition.change === "gained" ? "ATTUNED" : "RELEASED",
    BUILD_SIGNATURE_COLORS[transition.itemId],
    transition.change === "gained" ? 17 : 14,
  );
  text.position.set(
    position.x,
    (tracked?.visual.userData.baseScale ?? 6.2) + 1.2,
    position.z,
  );
  if (event.playerId) {
    text.userData.followPlayerId = event.playerId;
    text.userData.followHeight = (tracked?.visual.userData.baseScale ?? 6.2) + 1.2;
  }
  scene.add(text);
  floatingTexts.push(text);
}

const PURCHASE_STAT_SHORT_LABELS = {
  basicDamage: "BASIC",
  maxHp: "MAX HP",
  moveSpeed: "MOVE",
  abilityPower: "SKILL",
  cooldownRecovery: "COOLDOWN",
  basicMoveRetention: "STRIDE",
} as const;

function playWareReceipt(event: GameEvent): ReturnType<typeof projectAcceptedPurchaseImpact> {
  if (!event.playerId || !event.itemId) return null;
  const player = snapshot?.players.find((candidate) => candidate.id === event.playerId);
  if (!player) return null;
  const impact = projectAcceptedPurchaseImpact(
    player,
    event.itemId,
    event.replacedItemId ? event.slotIndex ?? null : null,
  );
  const tracked = playerVisuals.get(event.playerId);
  const position = tracked
    ? { x: tracked.visual.position.x, z: tracked.visual.position.z }
    : player.position;
  const color = BUILD_SIGNATURE_COLORS[event.itemId];
  spawnBurst(position, new THREE.Color(color).getHex(), 11, 0.95);
  if (tracked) pulseEntityWareReceipt(tracked.visual, event.itemId);
  if (!impact) return null;
  const text = createFloatingText(
    `${PURCHASE_STAT_SHORT_LABELS[impact.statKey]} ${impact.currentValue}→${impact.projectedValue}`,
    color,
    13,
  );
  text.position.set(
    position.x,
    (tracked?.visual.userData.baseScale ?? 6.2) + 1,
    position.z,
  );
  text.userData.followPlayerId = event.playerId;
  text.userData.followHeight = (tracked?.visual.userData.baseScale ?? 6.2) + 1;
  scene.add(text);
  floatingTexts.push(text);
  return impact;
}

function handleEvent(event: GameEvent, playTransient = false): void {
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
  } else if (event.kind === "item_purchased") {
    const transition = event.attunementTransition;
    const delivery = itemPurchaseDeliveryPolicy(event, localPlayerId, playTransient);
    if (transition && delivery.playAttunementTransient) playAttunementTransition(event, transition);
    const purchaseImpact = delivery.playWareReceiptTransient ? playWareReceipt(event) : null;
    if (delivery.acknowledgeLocalPurchase) {
      const self = currentPlayer();
      const position = event.position ?? self?.position ?? (event.vendorId ? VENDOR_DEFINITIONS[event.vendorId].position : WORLD_LAYOUT.nexus);
      if (event.replacedItemId) {
        clearReplacementSelection();
        shopAnnouncement.textContent = `${event.text} Build remains six of six.`;
      }
      if (!delivery.playLocalPurchaseFeedback) return;
      const itemName = transition ? ITEM_DEFINITIONS[transition.itemId].name : null;
      const evolved = transition?.change === "gained"
        ? deriveItemEvolutionProgress(transition.itemId, transition.toCount)?.state === "active"
        : false;
      const transitionToast = transition?.change === "gained"
        ? `${itemName} Attuned · ×${transition.fromCount} → ×${transition.toCount} · effective ×${effectiveStackCopies(transition.toCount)}${evolved ? " · Combat Stride unlocked" : ""}`
        : transition?.change === "lost"
          ? `${itemName} Attunement lost · ×${transition.fromCount} → ×${transition.toCount}`
          : purchaseImpact
            ? `${event.text} ${purchaseImpact.resultText}.`
            : event.text;
      toast(transitionToast, "loot");
      audio.play(transition?.change === "gained" ? "attune" : transition?.change === "lost" ? "unattune" : "loot");
      if (!transition && !delivery.playWareReceiptTransient) spawnBurst(position, 0xf1c56f, 13, 1.15);
      pulsePurchasedStat(event.itemId);
      if (event.replacedItemId) pulsePurchasedStat(event.replacedItemId);
    }
  } else if (event.kind === "item_sold") {
    const transition = event.attunementTransition;
    const delivery = itemSaleDeliveryPolicy(event, localPlayerId, playTransient);
    if (transition && delivery.playAttunementTransient) playAttunementTransition(event, transition);
    if (delivery.acknowledgeLocalSale) {
      if (saleMode) clearSaleSelection();
      shopAnnouncement.textContent = `${event.text} The selected equipment slot is now open.`;
      if (!delivery.playLocalSaleFeedback) return;
      toast(event.text, "loot");
      audio.play(transition ? "unattune" : "loot");
      pulsePurchasedStat(event.itemId);
    }
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

function applySnapshot(next: GameSnapshot, options: { hydrate?: boolean } = {}): void {
  const hydrate = options.hydrate === true;
  const firstSnapshot = snapshot === null;
  snapshot = next;
  if (!hydrate && next.phase === "victory" && previousPhase !== "victory") {
    victoryVisualStartedAt = performance.now();
  } else if (next.phase !== "victory") {
    victoryVisualStartedAt = null;
  }
  if (hydrate) {
    for (const event of next.events) seenEvents.add(event.id);
    previousPhase = next.phase;
    previousWave = next.wave.number;
  } else {
    for (const event of next.events) handleEvent(event, false);
  }
  const self = next.players.find((player) => player.id === localPlayerId);
  if (self?.heroId) {
    selectedHero = self.heroId;
    heroCss(self.heroId);
  }
  const heroStatsAvailable = Boolean(self?.heroId) && isHeroStatsPhase(next.phase);
  heroStatsToggle.classList.toggle("is-hidden", !heroStatsAvailable);
  if (!heroStatsAvailable) setHeroStatsOpen(false);

  if (!hydrate && next.phase !== previousPhase) {
    if (!firstSnapshot) onPhaseChanged(next.phase);
    previousPhase = next.phase;
  }
  if (!hydrate && next.wave.number !== previousWave && next.phase === "defense") {
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
    const dominantStack = dominantEquipmentStack(player.equipment);
    setEntityBuildSignature(tracked.visual, dominantStack?.itemId ?? null, dominantStack?.attuned ?? false);
    const oldHp = previousHp.get(`p-${player.id}`);
    if (oldHp !== undefined) {
      const comparableOldHp = projectHealthAtPreservedRatio(
        oldHp,
        tracked.maxHp,
        player.maxHp,
      );
      if (player.hp < comparableOldHp - 1e-6) {
        damageFeedback(tracked, comparableOldHp - player.hp, player.position, true);
      }
    }
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
      const visual = createProjectileVisual(projectile.kind, projectile.team, projectile.splitStage);
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
      const presentation = deriveWraithImpactPresentation(effect);
      const hiddenCompanion = presentation === "hidden-companion" || effect.kind === "cinder_wall_companion";
      const visual = hiddenCompanion
        ? new THREE.Group()
        : createEffectVisual(effect.kind, effect.radius, effect.rotation);
      if (hiddenCompanion) {
        visual.userData.kind = effect.kind;
        visual.userData.pieces = [];
      }
      visual.position.set(effect.position.x, 0, effect.position.z);
      world.add(visual);
      tracked = { visual, snapshot: effect };
      effectVisuals.set(effect.id, tracked);
      if (
        presentation === "default" &&
        !hiddenCompanion &&
        effect.kind !== "cinder_wall" &&
        effect.kind !== "meteor_warning" &&
        effect.kind !== "snare" &&
        effect.kind !== "repeater_impact" &&
        effect.kind !== "ember_impact"
      ) {
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
  arming: "ARM THE DEFENDERS",
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
  const shopReadiness = deriveLocalShopReadiness(state, self);
  updateMinimap(state, shopReadiness);
  goldReadout.classList.toggle("is-spendable", shopReadiness.ready);
  goldReadout.classList.toggle("is-reforge-ready", shopReadiness.mode === "reforge");
  goldReadout.setAttribute("aria-label", shopReadiness.ariaLabel);
  goldLabel.textContent = shopReadiness.label;

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
  const gates = new Map(state.gates.map((gate) => [gate.lane, gate]));
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
    const gate = gates.get(lane);
    const gateReadout = gate ? deriveGateReadout(gate, active, counts[lane]) : null;
    element.title = gateReadout?.title ?? (active ? `${LANE_LABELS[lane]} lane: open` : `${LANE_LABELS[lane]} lane: sealed`);
    element.setAttribute("aria-label", element.title);

    const status = laneStatusElements.get(lane);
    if (!status) continue;
    status.classList.toggle("is-active", active);
    status.classList.toggle("is-sealed", gateReadout?.tone === "sealed");
    status.classList.toggle("is-pressured", gateReadout?.tone === "damaged");
    status.classList.toggle("is-critical", gateReadout?.tone === "critical");
    status.classList.toggle("is-fallen", gateReadout?.tone === "fallen");
    status.style.setProperty("--gate-health", `${(gateReadout?.ratio ?? 0) * 100}%`);
    if (gateReadout) {
      status.title = gateReadout.title;
      status.setAttribute("aria-label", gateReadout.ariaLabel);
    }
    const statusCopy = status.querySelector<HTMLElement>(".lane-status-state");
    if (statusCopy) statusCopy.textContent = gateReadout?.label ?? (active ? "OPEN" : "SEALED");
  }
}

function updateTeam(players: PlayerSnapshot[]): void {
  teamList.replaceChildren();
  for (const player of players) {
    if (!player.heroId) continue;
    const definition = HERO_DEFINITIONS[player.heroId];
    const presentation = HERO_PRESENTATION[player.heroId];
    const disconnected = !player.connected;
    const stateLabels = [player.downed ? "DOWNED" : null, disconnected ? "RECONNECTING" : null].filter(Boolean);
    const member = document.createElement("div");
    member.className = `team-member${player.id === localPlayerId ? " is-self" : ""}${player.downed ? " is-downed" : ""}${disconnected ? " is-disconnected" : ""}`;
    member.style.setProperty("--hero-color", presentation.color);
    member.style.setProperty("--hero-dark", presentation.dark);
    member.style.setProperty("--health", `${Math.max(0, (player.hp / Math.max(1, player.maxHp)) * 100)}%`);
    member.setAttribute("aria-label", `${player.name}, ${definition.name}${stateLabels.length > 0 ? `, ${stateLabels.join(", ").toLowerCase()}` : ""}`);
    member.innerHTML = `
      <span class="team-portrait">${presentation.symbol}</span>
      <span class="team-copy"><strong>${escapeText(player.name)}</strong><small>${definition.name}${stateLabels.length > 0 ? ` · ${stateLabels.join(" · ")}` : ""}</small></span>
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
  basicAttackName.textContent = self.weaponId === "greatsword" ? WEAPON_DEFINITIONS.greatsword.basicName : PRACTICE_WEAPON.basicName;
  const allocation = self.mastery;
  for (const action of ["ability1", "ability2", "ability3", "ultimate"] as const) {
    const element = abilityBar.querySelector<HTMLButtonElement>(`[data-action="${action}"]`);
    if (!element) continue;
    const skillId = allocation?.equipped[action] ?? null;
    const skill = skillId ? SKILL_DEFINITIONS[skillId] : null;
    const cooldown = skillId ? Math.max(0, self.cooldownsBySkillId[skillId] ?? 0) : 0;
    const effectiveCooldown = skill ? skill.cooldown / Math.max(0.01, self.stats.cooldownRecovery) : 1;
    element.style.setProperty("--cooldown", `${Math.min(100, (cooldown / effectiveCooldown) * 100)}%`);
    element.classList.toggle("is-locked", !skill);
    element.classList.toggle("is-level-locked", false);
    element.classList.toggle("is-maxed", false);
    element.classList.toggle("can-upgrade", false);
    element.classList.toggle("is-cooling", Boolean(skill) && cooldown > 0.1);
    element.classList.toggle("is-ready", action === "ultimate" && Boolean(skill) && cooldown <= 0);
    element.disabled = !skill;
    element.title = skill ? skill.description : `${abilityKeyLabel(action)}, empty ${action === "ultimate" ? "mastery" : "standard skill"} slot`;
    element.setAttribute("aria-label", skill
      ? `${abilityKeyLabel(action)}, ${skill.name}, ${cooldown > 0.1 ? `${cooldown.toFixed(1)} seconds remaining` : "ready"}.`
      : `${abilityKeyLabel(action)}, empty ${action === "ultimate" ? "mastery" : "standard skill"} slot.`);
    const label = element.querySelector<HTMLElement>(".ability-name");
    if (label) label.textContent = skill?.name ?? (action === "ultimate" ? "No Mastery" : "Empty");
    const cooldownLabel = element.querySelector<HTMLElement>(".cooldown-value");
    if (cooldownLabel) cooldownLabel.textContent = cooldown > 0.1 ? cooldown.toFixed(cooldown >= 10 ? 0 : 1) : "";
    const status = element.querySelector<HTMLElement>(".ability-status");
    if (status) status.textContent = skill ? cooldown > 0.1 ? "COOLDOWN" : "READY" : "EMPTY";
    const ranks = element.querySelector<HTMLElement>(".ability-ranks");
    if (ranks) ranks.replaceChildren();
    const upgrade = abilityBar.querySelector<HTMLButtonElement>(`[data-upgrade="${action}"]`);
    if (upgrade) {
      upgrade.hidden = true;
      upgrade.disabled = true;
    }
  }
  const unspent = allocation ? Math.max(0, allocation.pointBudget - allocation.learnedNodeIds.length) : 0;
  skillPointCount.classList.toggle("is-hidden", unspent <= 0);
  skillPointCount.textContent = `${unspent} MASTERY POINT${unspent === 1 ? "" : "S"} · M`;
  skillPointCount.setAttribute("aria-label", `${unspent} mastery point${unspent === 1 ? "" : "s"} available; press M to inspect the network`);
  abilityBar.classList.toggle("has-upgrades", unspent > 0);
  abilityBar.dataset.skillPoints = String(unspent);
  abilityBar.setAttribute("aria-label", "Defender equipped Greatsword skills");
}

const SKILL_SLOTS: ReadonlyArray<{ slot: AbilitySlot; key: "Q" | "E" | "R" | "F" }> = [
  { slot: "ability1", key: "Q" },
  { slot: "ability2", key: "E" },
  { slot: "ability3", key: "R" },
  { slot: "ultimate", key: "F" },
];

function levelAbility(slot: AbilitySlot): void {
  void slot;
}

function updateMinimap(state: GameSnapshot, shopReadiness: LocalShopReadiness): void {
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
  const readyVendors = new Set(shopReadiness.vendorIds);
  for (const vendor of state.vendors) {
    const [x, y] = toMap(vendor.position);
    if (readyVendors.has(vendor.id)) {
      context.strokeStyle = vendor.id === "ironbound_forge"
        ? "rgba(244, 204, 118, 0.9)"
        : "rgba(208, 183, 255, 0.9)";
      context.lineWidth = 1.5;
      context.beginPath();
      context.arc(x, y, 8, 0, Math.PI * 2);
      context.stroke();
    }
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
  const fundedShops = shopReadiness.ready
    ? `; ${shopReadiness.mode === "reforge" ? "reforge" : "ware"} funded at ${state.vendors.filter((vendor) => readyVendors.has(vendor.id)).map((vendor) => vendor.name).join(" and ")}`
    : "";
  minimap.setAttribute("aria-label", `Battlefield minimap: ${state.activeLanes.map((lane) => LANE_LABELS[lane]).join(", ") || "no"} lanes open; ${state.vendors.map((vendor) => vendor.name).join(" and ")} marked as local shops${fundedShops}`);
}

function showEnd(state: GameSnapshot, self: PlayerSnapshot | undefined): void {
  const won = state.phase === "victory";
  endKicker.textContent = won ? "THE RIFT COLLAPSES" : "THE HEARTFIRE IS SILENT";
  endTitle.textContent = won ? "THE CITY ENDURES" : "THE CITY HAS FALLEN";
  endCopy.textContent = won ? "The invasion recoils—for now." : "The horde consumed the Heartfire. Rally and try again.";
  endStats.innerHTML = `
    <div class="end-stat"><strong>${self?.kills ?? 0}</strong><small>DEMONS SLAIN</small></div>
    <div class="end-stat"><strong>${self?.level ?? 1}</strong><small>HERO LEVEL</small></div>
    <div class="end-stat"><strong>${formatTime(state.runElapsed * 1000)}</strong><small>TIME HELD</small></div>`;
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
  if (!connectionReady || !snapshot || snapshot.phase === "lobby" || snapshot.phase === "victory" || snapshot.phase === "defeat") return;
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
  if (!connectionReady) return;
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
shopClose.addEventListener("click", () => {
  if (replacementRequestPending || saleRequestPending || ordinaryPurchaseRequest) {
    shopAnnouncement.textContent = "The current trade is already being verified by the server.";
    return;
  }
  setShopOpen(false);
});
shopSellToggle.addEventListener("click", toggleSaleMode);
shopReplaceSubmit.addEventListener("click", () => {
  if (saleMode) confirmSale();
  else confirmReplacement();
});
shopReplaceCancel.addEventListener("click", () => {
  if (replacementRequestPending || saleRequestPending) {
    shopAnnouncement.textContent = "The current trade is already being verified by the server.";
    return;
  }
  if (saleMode) clearSaleSlot(true);
  else clearReplacementSlot(true);
});

window.addEventListener("keydown", (event) => {
  if (event.target instanceof HTMLInputElement) return;
  const unmodified = !event.ctrlKey && !event.metaKey && !event.altKey;
  if (event.code === "KeyB" && unmodified) {
    if (!event.repeat) {
      event.preventDefault();
      if (shopOpen && (replacementRequestPending || saleRequestPending || ordinaryPurchaseRequest)) {
        shopAnnouncement.textContent = "The current trade is already being verified by the server.";
      } else {
        setShopOpen(!shopOpen);
      }
    }
    return;
  }
  if (shopOpen && unmodified && !event.repeat) {
    if (event.code === "KeyX") {
      event.preventDefault();
      toggleSaleMode();
      return;
    }
    if (event.code === "Escape") {
      event.preventDefault();
      if (replacementRequestPending || saleRequestPending || ordinaryPurchaseRequest) {
        shopAnnouncement.textContent = "The current trade is already being verified by the server.";
      } else if (saleSlotIndex !== null) {
        clearSaleSlot(true);
      } else if (saleMode) {
        clearSaleSelection(true);
      } else if (replacementSlotIndex !== null) {
        clearReplacementSlot(true);
      } else if (replacementItemId) {
        clearReplacementSelection(true);
      } else {
        setShopOpen(false);
      }
      return;
    }
    if (
      event.code === "Enter" &&
      (replacementSlotIndex !== null || saleSlotIndex !== null) &&
      (!(event.target instanceof HTMLButtonElement) || event.target === shopReplaceSubmit)
    ) {
      event.preventDefault();
      if (replacementRequestPending || saleRequestPending) {
        shopAnnouncement.textContent = "The current trade is already being verified by the server.";
      } else if (saleMode) {
        confirmSale();
      } else {
        confirmReplacement();
      }
      return;
    }
    const number = /^Digit[1-6]$/.test(event.code) || /^Numpad[1-6]$/.test(event.code)
      ? Number(event.code.at(-1))
      : 0;
    if (saleMode && number >= 1 && number <= EQUIPMENT_SLOT_COUNT) {
      event.preventDefault();
      selectSaleSlot((number - 1) as EquipmentSlotIndex);
      return;
    }
    if (replacementItemId && number >= 1 && number <= EQUIPMENT_SLOT_COUNT) {
      event.preventDefault();
      selectReplacementSlot((number - 1) as EquipmentSlotIndex);
      return;
    }
    const activeStock = activeVendorId
      ? VENDOR_DEFINITIONS[activeVendorId].itemIds
      : [];
    const itemIndex = number >= 1 && number <= activeStock.length ? number - 1 : -1;
    const itemId = itemIndex >= 0
      ? activeStock[itemIndex]
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
  if (connectionReady && (event.code === "KeyW" || event.code === "KeyA" || event.code === "KeyS" || event.code === "KeyD")) keys.add(event.code);
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
window.addEventListener("offline", () => {
  if (terminalConnection) return;
  connectionReady = false;
  suspendTransactionalUi();
  connectionState("offline", "Realm unreachable · waiting for network");
  socket?.close();
});
window.addEventListener("online", () => {
  if (terminalConnection || connectionReady || socket?.readyState === WebSocket.CONNECTING || socket?.readyState === WebSocket.OPEN) return;
  if (reconnectTimer !== null) window.clearTimeout(reconnectTimer);
  reconnectTimer = null;
  reconnectStartedAt ??= performance.now();
  reconnectAttempt += 1;
  const resumingDefender = Boolean(localPlayerId || readResumeToken());
  connectionState("connecting", `${resumingDefender ? "Rejoining defender" : "Reopening war table"} · attempt ${reconnectAttempt}`);
  connect();
});

renderer.domElement.addEventListener("pointerenter", () => { pointerInside = true; });
renderer.domElement.addEventListener("pointerleave", () => { pointerInside = false; attacking = false; });
renderer.domElement.addEventListener("pointermove", (event) => {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
});
renderer.domElement.addEventListener("pointerdown", (event) => {
  if (!connectionReady) return;
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
    updateEntityVisual(tracked.visual, now, tracked.velocity, elapsed, tracked.facing, tracked.action);
  }
  for (const tracked of enemyVisuals.values()) {
    tracked.visual.position.lerp(tracked.target, 1 - Math.exp(-delta * 15));
    updateEntityVisual(tracked.visual, now, tracked.velocity, elapsed + tracked.target.x * 0.03, tracked.facing, tracked.action);
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
    const followPlayerId = text.userData.followPlayerId;
    const followed = typeof followPlayerId === "string" ? playerVisuals.get(followPlayerId) : null;
    if (followed) {
      text.position.set(
        followed.visual.position.x,
        Number(text.userData.followHeight ?? followed.visual.userData.baseScale + 1) + age / 1000 * 2.4,
        followed.visual.position.z,
      );
    } else {
      text.position.y += delta * 2.4;
    }
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
