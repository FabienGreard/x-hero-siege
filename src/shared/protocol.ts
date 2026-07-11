import { isItemId, isVendorId } from "./armory-data";
import type { ItemId } from "./item-ids";

export type { ItemId } from "./item-ids";

export type HeroId =
  | "warden"
  | "riftstalker"
  | "ashcaller"
  | "gravebinder";

export type LaneId = "north" | "east" | "south" | "west";
export type GamePhase =
  | "lobby"
  | "defense"
  | "breach"
  | "push"
  | "victory"
  | "defeat";
export type AbilitySlot = "ability1" | "ability2" | "ability3" | "ultimate";
export type ActionSlot = "basic" | AbilitySlot;
export type ActionPhase = "idle" | "windup" | "active" | "recovery";
export type VendorId = "ironbound_forge" | "veilglass_reliquary";
export type EquipmentSlotIndex = 0 | 1 | 2 | 3 | 4 | 5;
export type EquipmentSlots = [
  ItemId | null,
  ItemId | null,
  ItemId | null,
  ItemId | null,
  ItemId | null,
  ItemId | null,
];

export interface ActionSnapshot {
  kind: "basic" | AbilitySlot | "enemy_attack";
  phase: ActionPhase;
  remaining: number;
  duration: number;
  direction: Vec2;
}

export interface Vec2 {
  x: number;
  z: number;
}

export type ClientMessage =
  | { type: "hello"; name: string; resumeToken?: string }
  | { type: "join"; name: string }
  | { type: "claim_hero"; heroId: HeroId }
  | { type: "release_hero" }
  | { type: "set_ready"; ready: boolean }
  | { type: "start" }
  | { type: "reset_run" }
  | {
      type: "input";
      seq: number;
      move: Vec2;
      aim: Vec2;
      attacking: boolean;
    }
  | { type: "cast"; slot: AbilitySlot }
  | { type: "level_ability"; slot: AbilitySlot }
  | { type: "buy_item"; vendorId: VendorId; itemId: ItemId }
  | {
      type: "replace_item";
      vendorId: VendorId;
      itemId: ItemId;
      slotIndex: EquipmentSlotIndex;
      expectedItemId: ItemId;
    }
  | {
      type: "sell_item";
      vendorId: VendorId;
      slotIndex: EquipmentSlotIndex;
      expectedItemId: ItemId;
    }
  | { type: "ping"; sentAt: number };

export interface LobbySnapshot {
  hostId: string | null;
  maxPlayers: 4;
  canStart: boolean;
  claimedHeroes: Partial<Record<HeroId, string>>;
  availableHeroes: HeroId[];
}

export interface WaveSnapshot {
  number: number;
  total: number;
  alive: number;
  spawned: number;
}

export interface NexusSnapshot {
  position: Vec2;
  hp: number;
  maxHp: number;
  shielded: boolean;
}

export interface GateSnapshot {
  lane: LaneId;
  position: Vec2;
  hp: number;
  maxHp: number;
  breached: boolean;
}

export interface RiftHeartSnapshot {
  position: Vec2;
  hp: number;
  maxHp: number;
  active: boolean;
}

export interface HeroStatsSnapshot {
  maxHp: number;
  moveSpeed: number;
  /** Fraction of current Move Speed retained during primary windup and impact. */
  basicMoveRetention: number;
  basicDamage: number;
  basicAttackInterval: number;
  abilityPower: number;
  cooldownRecovery: number;
}

export interface VendorSnapshot {
  id: VendorId;
  name: string;
  position: Vec2;
  interactionRadius: number;
  itemIds: ItemId[];
}

export interface PlayerSnapshot {
  id: string;
  name: string;
  connected: boolean;
  heroId: HeroId | null;
  ready: boolean;
  position: Vec2;
  velocity: Vec2;
  aim: Vec2;
  hp: number;
  /** Compatibility projection of stats.maxHp for existing clients. */
  maxHp: number;
  stats: HeroStatsSnapshot;
  barrier: number;
  maxBarrier: number;
  level: number;
  xp: number;
  nextLevelXp: number;
  gold: number;
  equipment: EquipmentSlots;
  kills: number;
  abilityRanks: Record<AbilitySlot, number>;
  skillPoints: number;
  action: ActionSnapshot | null;
  downed: boolean;
  invulnerable: boolean;
  cooldowns: Record<ActionSlot, number>;
  lastInputSeq: number;
}

export type EnemyKind = "imp" | "hound" | "brute" | "siege" | "rift_guard";
export type EnemyTargetKind = "gate" | "nexus" | "player" | "advance";

export interface EnemySnapshot {
  id: string;
  kind: EnemyKind;
  lane: LaneId;
  position: Vec2;
  velocity: Vec2;
  facing: Vec2;
  hp: number;
  maxHp: number;
  radius: number;
  elite: boolean;
  targetKind: EnemyTargetKind;
  targetId: string | null;
  slowed: boolean;
  action: ActionSnapshot | null;
}

export type ProjectileKind =
  | "arrow"
  | "repeater"
  | "ember"
  | "soul"
  | "splitbolt"
  | "death_tide"
  | "demon_bolt";

export interface ProjectileSnapshot {
  id: string;
  ownerId: string;
  team: "heroes" | "demons";
  kind: ProjectileKind;
  position: Vec2;
  velocity: Vec2;
  radius: number;
  remaining: number;
}

export interface SummonSnapshot {
  id: string;
  ownerId: string;
  kind: "wraith";
  position: Vec2;
  velocity: Vec2;
  facing: Vec2;
  radius: number;
  remaining: number;
  targetId: string | null;
}

export type PickupKind = "gold" | "heal" | "rift_shard";

export interface PickupSnapshot {
  id: string;
  kind: PickupKind;
  position: Vec2;
  value: number;
  remaining: number;
}

export type EffectKind =
  | "slash"
  | "impact"
  | "repeater_impact"
  | "ember_impact"
  | "wraith_impact"
  | "cinder_wall"
  | "cinder_wall_companion"
  | "shock"
  | "fire"
  | "meteor_warning"
  | "meteor"
  | "snare"
  | "war_standard"
  | "warden_charge"
  | "warden_wave"
  | "warden_bastion"
  | "souls"
  | "heal"
  | "gate_hit"
  | "nexus_hit"
  | "rift_hit";

export interface EffectSnapshot {
  id: string;
  kind: EffectKind;
  position: Vec2;
  radius: number;
  rotation: number;
  remaining: number;
  ownerId: string | null;
  lane: LaneId | null;
  sourceSummonId?: string;
}

export type GameEventKind =
  | "system"
  | "hero_claimed"
  | "hero_released"
  | "phase"
  | "wave"
  | "gate_breached"
  | "player_downed"
  | "player_revived"
  | "item_purchased"
  | "item_sold"
  | "rift_exposed"
  | "victory"
  | "defeat";

export interface GameEvent {
  id: string;
  kind: GameEventKind;
  text: string;
  at: number;
  position?: Vec2;
  playerId?: string;
  lane?: LaneId;
  vendorId?: VendorId;
  itemId?: ItemId;
  slotIndex?: EquipmentSlotIndex;
  replacedItemId?: ItemId;
  goldDelta?: number;
  attunementTransition?: {
    itemId: ItemId;
    change: "gained" | "lost";
    fromCount: number;
    toCount: number;
  };
}

export interface GameSnapshot {
  tick: number;
  serverTime: number;
  runElapsed: number;
  debug: boolean;
  phase: GamePhase;
  phaseElapsed: number;
  phaseDuration: number | null;
  objective: string;
  pressureLane: LaneId | null;
  activeLanes: LaneId[];
  lobby: LobbySnapshot;
  wave: WaveSnapshot;
  nexus: NexusSnapshot;
  gates: GateSnapshot[];
  riftHeart: RiftHeartSnapshot;
  vendors: VendorSnapshot[];
  players: PlayerSnapshot[];
  enemies: EnemySnapshot[];
  projectiles: ProjectileSnapshot[];
  summons: SummonSnapshot[];
  pickups: PickupSnapshot[];
  effects: EffectSnapshot[];
  events: GameEvent[];
}

export type ServerMessage =
  | {
      type: "welcome";
      playerId: string;
      websocketPath: "/ws";
      resumeToken: string;
      resumed: boolean;
      resumeWindowMs: number;
      snapshot: GameSnapshot;
    }
  | { type: "snapshot"; snapshot: GameSnapshot }
  | { type: "event"; event: GameEvent }
  | { type: "error"; code: string; message: string }
  | { type: "pong"; sentAt: number; serverTime: number };

export function isVec2(value: unknown): value is Vec2 {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<Vec2>;
  return Number.isFinite(candidate.x) && Number.isFinite(candidate.z);
}

export function isEquipmentSlotIndex(value: unknown): value is EquipmentSlotIndex {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value < 6;
}

export function parseClientMessage(raw: string): ClientMessage | null {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!value || typeof value !== "object" || !("type" in value)) return null;
  const message = value as Record<string, unknown>;
  switch (message.type) {
    case "hello": {
      if (typeof message.name !== "string") return null;
      if (message.resumeToken === undefined) return { type: "hello", name: message.name };
      return typeof message.resumeToken === "string" && message.resumeToken.length <= 128
        ? { type: "hello", name: message.name, resumeToken: message.resumeToken }
        : null;
    }
    case "join":
      return typeof message.name === "string"
        ? { type: "join", name: message.name }
        : null;
    case "claim_hero":
      return typeof message.heroId === "string"
        ? ({ type: "claim_hero", heroId: message.heroId } as ClientMessage)
        : null;
    case "release_hero":
      return { type: "release_hero" };
    case "set_ready":
      return typeof message.ready === "boolean"
        ? { type: "set_ready", ready: message.ready }
        : null;
    case "start":
      return { type: "start" };
    case "reset_run":
      return { type: "reset_run" };
    case "input":
      return Number.isFinite(message.seq) &&
        isVec2(message.move) &&
        isVec2(message.aim) &&
        typeof message.attacking === "boolean"
        ? {
            type: "input",
            seq: message.seq as number,
            move: message.move,
            aim: message.aim,
            attacking: message.attacking,
          }
        : null;
    case "cast":
      return typeof message.slot === "string"
        ? ({ type: "cast", slot: message.slot } as ClientMessage)
        : null;
    case "level_ability":
      return typeof message.slot === "string"
        ? ({ type: "level_ability", slot: message.slot } as ClientMessage)
        : null;
    case "buy_item":
      return isVendorId(message.vendorId) && isItemId(message.itemId)
        ? { type: "buy_item", vendorId: message.vendorId, itemId: message.itemId }
        : null;
    case "replace_item":
      return isVendorId(message.vendorId) &&
        isItemId(message.itemId) &&
        isItemId(message.expectedItemId) &&
        isEquipmentSlotIndex(message.slotIndex)
        ? {
            type: "replace_item",
            vendorId: message.vendorId,
            itemId: message.itemId,
            slotIndex: message.slotIndex,
            expectedItemId: message.expectedItemId,
          }
        : null;
    case "sell_item":
      return isVendorId(message.vendorId) &&
        isItemId(message.expectedItemId) &&
        isEquipmentSlotIndex(message.slotIndex)
        ? {
            type: "sell_item",
            vendorId: message.vendorId,
            slotIndex: message.slotIndex,
            expectedItemId: message.expectedItemId,
          }
        : null;
    case "ping":
      return Number.isFinite(message.sentAt)
        ? { type: "ping", sentAt: message.sentAt as number }
        : null;
    default:
      return null;
  }
}
