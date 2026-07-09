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

export interface PlayerSnapshot {
  id: string;
  name: string;
  heroId: HeroId | null;
  ready: boolean;
  position: Vec2;
  velocity: Vec2;
  aim: Vec2;
  hp: number;
  maxHp: number;
  barrier: number;
  maxBarrier: number;
  level: number;
  xp: number;
  nextLevelXp: number;
  gold: number;
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
}

export interface GameSnapshot {
  tick: number;
  serverTime: number;
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
    case "ping":
      return Number.isFinite(message.sentAt)
        ? { type: "ping", sentAt: message.sentAt as number }
        : null;
    default:
      return null;
  }
}
