import {
  ARMORY_SELL_VALUE,
  ITEM_DEFINITIONS,
  VENDOR_DEFINITIONS,
  armoryReforgeNetCost,
  createEmptyEquipment,
  isItemId,
  isVendorId,
  projectEquipmentChange,
  projectEquipmentRemoval,
} from "../shared/armory-data";
import {
  ABILITY_IMPACT_DEFINITIONS,
  scaleAbilityMagnitude,
  type AbilityImpactMetricId,
} from "../shared/ability-impact";
import { GRAVEBINDER_BASIC_HEAL_PER_TARGET } from "../shared/primary-impact";
import { actionMoveRetention } from "../shared/combat-movement";
import {
  WRAITH_HOST_MAX_ACTIVE_PER_OWNER,
  WRAITH_HOST_MAX_STRIKES_PER_SUMMON,
  wraithHostSummonCount,
} from "../shared/wraith-host";
import {
  ASHCALLER_BASIC_BURST_DAMAGE_RATIO,
  ASHCALLER_BASIC_BURST_RADIUS,
  ASHCALLER_BASIC_RECOVERY_INTERVAL_RATIO,
  ASHCALLER_BASIC_RECOVERY_MIN_SECONDS,
  RANGED_BASIC_ACTIVE_SECONDS,
  RANGED_BASIC_PROJECTILE_RADIUS,
  RIFTSTALKER_BASIC_PIERCE,
  RIFTSTALKER_BASIC_RECOVERY_SECONDS,
  isRangedHero,
} from "../shared/ranged-primary";
import {
  CINDER_WALL_DURATION_SECONDS,
  CINDER_WALL_SLOW_SECONDS,
  CINDER_WALL_START_DISTANCE,
  cinderWallContainsPoint,
  cinderWallEndpoints,
  cinderWallHalfWidth,
} from "../shared/cinder-wall";
import {
  SPLITBOLT_FORK_ANGLE_RADIANS,
  SPLITBOLT_FORK_PIERCE,
  SPLITBOLT_FORK_RADIUS,
  SPLITBOLT_LIFETIME_SECONDS,
  SPLITBOLT_SEED_PIERCE,
  SPLITBOLT_SEED_RADIUS,
  SPLITBOLT_SPEED,
} from "../shared/splitbolt";
import { isEquipmentSlotIndex } from "../shared/protocol";
import {
  DEBUG_TIMINGS,
  DEFAULT_TIMINGS,
  HERO_DEFINITIONS,
  HERO_IDS,
  LANE_IDS,
  WORLD_LAYOUT,
  isAbilitySlot,
  isHeroId,
} from "../shared/game-data";
import type {
  AbilitySlot,
  ActionSnapshot,
  ActionSlot,
  ClientMessage,
  EffectKind,
  EffectSnapshot,
  EnemyKind,
  EnemySnapshot,
  EquipmentSlotIndex,
  EquipmentSlots,
  GameEvent,
  GamePhase,
  GameSnapshot,
  HeroId,
  HeroStatsSnapshot,
  ItemId,
  LaneId,
  PickupSnapshot,
  PlayerSnapshot,
  ProjectileKind,
  ProjectileSnapshot,
  SplitboltStage,
  SummonSnapshot,
  VendorId,
  Vec2,
} from "../shared/protocol";
import { ENEMY_GOLD_REWARDS, goldFromUnits, goldRewardShareUnits, goldToUnits } from "./economy";
import { deriveHeroStats, projectHealthAtPreservedRatio } from "./hero-stats";
import {
  ARSENAL_INTERACTION_RADIUS,
  ARSENAL_POSITION,
  GREATSWORD_MASTERY_NODES,
  GREATSWORD_NODE_BY_ID,
  PRACTICE_WEAPON,
  SKILL_DEFINITIONS,
  WEAPON_DEFINITIONS,
  deriveMasteryNodeAvailability,
  type EquippedWeaponId,
  type MasteryNodeId,
  type SkillId,
  type StandardSkillId,
  type WeaponId,
} from "../shared/weapon-data";
import type { MasteryLoadout, WeaponAllocationSnapshot } from "../shared/protocol";

export interface GameTimings {
  defenseDuration: number;
  breachDuration: number;
  pushDuration: number;
  waveCount: number;
}

export interface GameWorldOptions {
  accelerated?: boolean;
  timings?: Partial<GameTimings>;
  random?: () => number;
  enemyCap?: number;
  telemetry?: (event: AuthoritativeTelemetryEvent) => void;
}

export interface AuthoritativeTelemetryEvent {
  at: number;
  sourcePlayerId: string;
  actionId: SkillId | "greatsword_basic" | "practice_basic";
  targetId: string;
  targetClass: "normal" | "elite" | "objective";
  outcome: "damage" | "stagger" | "interrupt" | "displace" | "control";
  magnitude?: number;
  duration?: number;
}

export interface GameActionResult {
  ok: boolean;
  code?: string;
  message?: string;
  pong?: { sentAt: number; serverTime: number };
}

interface PlayerState {
  id: string;
  name: string;
  connected: boolean;
  heroId: HeroId | null;
  weaponId: EquippedWeaponId;
  weaponAllocations: Partial<Record<WeaponId, WeaponAllocationSnapshot>>;
  cooldownsBySkillId: Partial<Record<SkillId, number>>;
  activeSkillId: SkillId | null;
  basicCombo: 0 | 1 | 2;
  dodgeCharges: number;
  dodgeRechargeRemaining: number;
  dodgeInvulnerableRemaining: number;
  loadoutEditRemaining: number;
  guardRemaining: number;
  guardDirection: Vec2;
  counterRemaining: number;
  unbreakableRemaining: number;
  unbreakableResponses: number;
  riposteReady: boolean;
  counterchargeReady: boolean;
  skillRecoveryMultiplier: number;
  basicDamageMultiplier: number;
  telemetryActionOverride: SkillId | null;
  ready: boolean;
  position: Vec2;
  velocity: Vec2;
  aim: Vec2;
  move: Vec2;
  attacking: boolean;
  hp: number;
  barrier: number;
  maxBarrier: number;
  level: number;
  xp: number;
  goldUnits: number;
  equipment: EquipmentSlots;
  kills: number;
  abilityRanks: Record<AbilitySlot, number>;
  skillPoints: number;
  action: ActionSnapshot | null;
  downedFor: number;
  invulnerableFor: number;
  cooldowns: Record<ActionSlot, number>;
  lastInputSeq: number;
}

interface EnemyState extends EnemySnapshot {
  damage: number;
  speed: number;
  attackCooldown: number;
  xp: number;
  gold: number;
  slowFor: number;
  attackTargetKind: "player" | "gate" | "nexus" | null;
  attackTargetId: string | null;
  attackTargetPosition: Vec2 | null;
  engagementAngle: number;
  engagementBias: number;
  engagementArc: number;
  staggerFor: number;
  exposedFor: number;
}

interface TimedGreatswordStrike {
  at: number;
  ownerId: string;
  skillId: SkillId;
  center: Vec2;
  radius: number;
  damage: number;
  displace?: Vec2;
  stagger?: number;
  playerPosition?: Vec2;
}

interface ProjectileState extends ProjectileSnapshot {
  damage: number;
  pierce: number;
  hitIds: Set<string>;
  splitTriggered?: boolean;
  reservedForkIds?: [string, string];
}

interface SummonState extends SummonSnapshot {
  damage: number;
  speed: number;
  strikeCooldown: number;
  strikesRemaining: number;
  orbitOffset: number;
}

interface EffectState extends EffectSnapshot {}
interface PickupState extends PickupSnapshot {}

interface DelayedStrike {
  at: number;
  ownerId: string;
  position: Vec2;
  radius: number;
  damage: number;
  kind: EffectKind;
}

interface CinderWallState {
  id: string;
  ownerId: string;
  start: Vec2;
  end: Vec2;
  halfWidth: number;
  remaining: number;
  damage: number;
  slowSeconds: number;
  hitIds: Set<string>;
  riftHeartHit: boolean;
}

const ZERO_COOLDOWNS = (): Record<ActionSlot, number> => ({
  basic: 0,
  ability1: 0,
  ability2: 0,
  ability3: 0,
  ultimate: 0,
});

const ZERO_ABILITY_RANKS = (): Record<AbilitySlot, number> => ({
  ability1: 0,
  ability2: 0,
  ability3: 0,
  ultimate: 0,
});

const EMPTY_MASTERY_LOADOUT = (): MasteryLoadout => ({
  ability1: null,
  ability2: null,
  ability3: null,
  ultimate: null,
});

const createGreatswordAllocation = (level: number): WeaponAllocationSnapshot => ({
  revision: 0,
  spentNodeIds: [],
  unspentPoints: Math.max(0, Math.floor(level)),
  loadout: EMPTY_MASTERY_LOADOUT(),
  freeRespecUsed: false,
});

interface EnemyStats {
  hp: number;
  radius: number;
  damage: number;
  speed: number;
  attackCooldown: number;
  xp: number;
  gold: number;
}

const ENEMY_STATS: Record<EnemyKind, EnemyStats> = {
  imp: { hp: 42, radius: 0.75, damage: 7, speed: 5.4, attackCooldown: 0.9, xp: 7, gold: ENEMY_GOLD_REWARDS.imp },
  hound: { hp: 30, radius: 0.65, damage: 6, speed: 7.6, attackCooldown: 0.75, xp: 6, gold: ENEMY_GOLD_REWARDS.hound },
  brute: { hp: 125, radius: 1.25, damage: 14, speed: 3.8, attackCooldown: 1.2, xp: 18, gold: ENEMY_GOLD_REWARDS.brute },
  siege: { hp: 540, radius: 2.1, damage: 28, speed: 2.8, attackCooldown: 1.5, xp: 70, gold: ENEMY_GOLD_REWARDS.siege },
  rift_guard: { hp: 95, radius: 1, damage: 10, speed: 5.1, attackCooldown: 0.9, xp: 12, gold: ENEMY_GOLD_REWARDS.rift_guard },
};

const PLAYER_ACTION_TIMINGS: Record<AbilitySlot, { windup: number; active: number; recovery: number }> = {
  ability1: { windup: 0.18, active: 0.09, recovery: 0.16 },
  ability2: { windup: 0.26, active: 0.11, recovery: 0.2 },
  ability3: { windup: 0.34, active: 0.12, recovery: 0.24 },
  ultimate: { windup: 0.48, active: 0.16, recovery: 0.32 },
};

const ENEMY_WINDUPS: Record<EnemyKind, number> = {
  imp: 0.22,
  hound: 0.22,
  brute: 0.5,
  siege: 0.75,
  rift_guard: 0.3,
};

const copy = (v: Vec2): Vec2 => ({ x: v.x, z: v.z });
const length = (v: Vec2) => Math.hypot(v.x, v.z);
const normalize = (v: Vec2): Vec2 => {
  const magnitude = length(v);
  return magnitude > 0.0001 ? { x: v.x / magnitude, z: v.z / magnitude } : { x: 0, z: -1 };
};
const distance = (a: Vec2, b: Vec2) => Math.hypot(a.x - b.x, a.z - b.z);
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const rotate = (v: Vec2, radians: number): Vec2 => ({
  x: v.x * Math.cos(radians) - v.z * Math.sin(radians),
  z: v.x * Math.sin(radians) + v.z * Math.cos(radians),
});

function segmentHitProgress(start: Vec2, end: Vec2, center: Vec2, radius: number): number | null {
  const delta = { x: end.x - start.x, z: end.z - start.z };
  const lengthSquared = delta.x * delta.x + delta.z * delta.z;
  if (lengthSquared <= 0.000_001) return distance(start, center) <= radius ? 0 : null;
  const relative = { x: start.x - center.x, z: start.z - center.z };
  const inside = relative.x * relative.x + relative.z * relative.z <= radius * radius;
  if (inside) return 0;
  const linear = 2 * (relative.x * delta.x + relative.z * delta.z);
  const constant = relative.x * relative.x + relative.z * relative.z - radius * radius;
  const discriminant = linear * linear - 4 * lengthSquared * constant;
  if (discriminant < 0) return null;
  const firstContact = (-linear - Math.sqrt(discriminant)) / (2 * lengthSquared);
  return firstContact >= 0 && firstContact <= 1 ? firstContact : null;
}

export class GameWorld {
  readonly players = new Map<string, PlayerState>();
  phase: GamePhase = "lobby";
  accelerated: boolean;
  timings: GameTimings;
  hostId: string | null = null;

  private readonly random: () => number;
  private readonly enemyCap: number;
  private readonly telemetry: ((event: AuthoritativeTelemetryEvent) => void) | null;
  private enemies = new Map<string, EnemyState>();
  private projectiles = new Map<string, ProjectileState>();
  private summons = new Map<string, SummonState>();
  private pickups = new Map<string, PickupState>();
  private effects = new Map<string, EffectState>();
  private cinderWalls = new Map<string, CinderWallState>();
  private delayed: DelayedStrike[] = [];
  private greatswordStrikes: TimedGreatswordStrike[] = [];
  private pendingEvents: GameEvent[] = [];
  private recentEvents: GameEvent[] = [];
  private elapsed = 0;
  private runElapsed = 0;
  private totalTime = 0;
  private tickNumber = 0;
  private idCounter = 0;
  private spawnTimer = 0;
  private currentWave = 0;
  private spawned = 0;
  private pressureLane: LaneId | null = null;
  private activeLanes: LaneId[] = [];
  private gatebreakerId: string | null = null;
  private nexus = { hp: 800, maxHp: 800, shielded: false };
  private gates = new Map(LANE_IDS.map((lane) => [lane, { hp: 260, maxHp: 260, breached: false }]));
  private riftHeart = { hp: 1250, maxHp: 1250, active: false };

  constructor(options: GameWorldOptions = {}) {
    this.accelerated = options.accelerated ?? false;
    const base = this.accelerated ? DEBUG_TIMINGS : DEFAULT_TIMINGS;
    this.timings = { ...base, ...options.timings };
    this.random = options.random ?? Math.random;
    this.enemyCap = Math.max(1, Math.floor(options.enemyCap ?? 260));
    this.telemetry = options.telemetry ?? null;
  }

  addPlayer(id: string, name = "Unclaimed Hero"): GameActionResult {
    if (this.players.has(id)) return { ok: true };
    if (this.phase !== "lobby") return this.failure("GAME_IN_PROGRESS", "The siege has already begun.");
    if (this.players.size >= 4) return this.failure("LOBBY_FULL", "The four hero places are filled.");
    const cleanName = name.trim().slice(0, 24) || "Unclaimed Hero";
    this.players.set(id, {
      id,
      name: cleanName,
      connected: true,
      heroId: "defender",
      weaponId: "practice",
      weaponAllocations: {},
      cooldownsBySkillId: {},
      activeSkillId: null,
      basicCombo: 0,
      dodgeCharges: 1,
      dodgeRechargeRemaining: 0,
      dodgeInvulnerableRemaining: 0,
      loadoutEditRemaining: 0,
      guardRemaining: 0,
      guardDirection: { x: 0, z: -1 },
      counterRemaining: 0,
      unbreakableRemaining: 0,
      unbreakableResponses: 0,
      riposteReady: false,
      counterchargeReady: false,
      skillRecoveryMultiplier: 1,
      basicDamageMultiplier: 1,
      telemetryActionOverride: null,
      ready: false,
      position: { x: 0, z: 8 },
      velocity: { x: 0, z: 0 },
      aim: { x: 0, z: -1 },
      move: { x: 0, z: 0 },
      attacking: false,
      hp: 100,
      barrier: 0,
      maxBarrier: 100,
      level: 1,
      xp: 0,
      goldUnits: 0,
      equipment: createEmptyEquipment(),
      kills: 0,
      abilityRanks: ZERO_ABILITY_RANKS(),
      skillPoints: 0,
      action: null,
      downedFor: 0,
      invulnerableFor: 0,
      cooldowns: ZERO_COOLDOWNS(),
      lastInputSeq: 0,
    });
    this.hostId ??= id;
    return { ok: true };
  }

  removePlayer(id: string): void {
    this.players.delete(id);
    if (this.hostId === id) {
      this.hostId = [...this.players.values()].find((player) => player.connected)?.id
        ?? this.players.keys().next().value
        ?? null;
    }
  }

  setPlayerConnected(id: string, connected: boolean): GameActionResult {
    const player = this.players.get(id);
    if (!player) return this.failure("PLAYER_UNKNOWN", "Player is not in this room.");
    player.connected = connected;
    player.move = { x: 0, z: 0 };
    player.attacking = false;
    player.velocity = { x: 0, z: 0 };
    return { ok: true };
  }

  setPlayerName(id: string, name: string): GameActionResult {
    const player = this.players.get(id);
    if (!player) return this.failure("PLAYER_UNKNOWN", "Player is not in this lobby.");
    player.name = name.trim().slice(0, 24) || player.name;
    return { ok: true };
  }

  setReady(playerId: string, ready: boolean): GameActionResult {
    const player = this.players.get(playerId);
    if (!player) return this.failure("PLAYER_UNKNOWN", "Player is not in this lobby.");
    if (this.phase !== "lobby") return this.failure("LOCKED", "Readiness is locked after the arming call.");
    player.ready = ready;
    return { ok: true };
  }

  startGame(playerId: string): GameActionResult {
    if (this.phase !== "lobby") return this.failure("ALREADY_STARTED", "The siege is already active.");
    if (playerId !== this.hostId) return this.failure("HOST_ONLY", "Only the lobby host can start the run.");
    if (!this.canStart()) return this.failure("NOT_READY", "Every connected Defender must be ready.");
    this.resetRunState();
    this.setPhase("arming");
    return { ok: true };
  }

  resetRun(playerId: string): GameActionResult {
    if (this.phase !== "victory" && this.phase !== "defeat") return this.failure("RESET_LOCKED", "The active run cannot be reset.");
    if (playerId !== this.hostId) return this.failure("HOST_ONLY", "Only the lobby host can reset the room.");
    this.reset(this.accelerated);
    return { ok: true };
  }

  reset(accelerated = this.accelerated): void {
    this.accelerated = accelerated;
    this.timings = { ...(accelerated ? DEBUG_TIMINGS : DEFAULT_TIMINGS) };
    this.phase = "lobby";
    this.elapsed = 0;
    this.runElapsed = 0;
    this.totalTime = 0;
    this.currentWave = 0;
    this.activeLanes = [];
    this.enemies.clear();
    this.projectiles.clear();
    this.summons.clear();
    this.pickups.clear();
    this.effects.clear();
    this.cinderWalls.clear();
    this.delayed = [];
    this.greatswordStrikes = [];
    this.recentEvents = [];
    this.pendingEvents = [];
    this.resetStructures();
    for (const player of this.players.values()) {
      player.ready = false;
      player.position = { x: 0, z: 8 };
      player.move = { x: 0, z: 0 };
      player.attacking = false;
      player.action = null;
      player.activeSkillId = null;
      player.weaponId = "practice";
      player.weaponAllocations = {};
      player.cooldownsBySkillId = {};
      player.basicCombo = 0;
      player.dodgeCharges = 1;
      player.dodgeRechargeRemaining = 0;
      player.dodgeInvulnerableRemaining = 0;
      player.loadoutEditRemaining = 0;
      player.guardRemaining = 0;
      player.counterRemaining = 0;
      player.unbreakableRemaining = 0;
      player.unbreakableResponses = 0;
      player.riposteReady = false;
      player.counterchargeReady = false;
      player.skillRecoveryMultiplier = 1;
      player.basicDamageMultiplier = 1;
      player.telemetryActionOverride = null;
      player.equipment = createEmptyEquipment();
      player.abilityRanks = ZERO_ABILITY_RANKS();
      player.skillPoints = 0;
      player.cooldowns = ZERO_COOLDOWNS();
    }
  }

  handleMessage(playerId: string, message: ClientMessage): GameActionResult {
    if (message.type === "hello") return this.failure("ALREADY_ADMITTED", "This connection already has a defender.");
    if (!this.players.get(playerId)?.connected) return this.failure("PLAYER_DISCONNECTED", "Player is not connected.");
    switch (message.type) {
      case "join": return this.setPlayerName(playerId, message.name);
      case "set_ready": return this.setReady(playerId, message.ready);
      case "start": return this.startGame(playerId);
      case "reset_run": return this.resetRun(playerId);
      case "cast": return isAbilitySlot(message.slot) ? this.cast(playerId, message.slot) : this.failure("INVALID_ABILITY", "Unknown ability.");
      case "dodge": return this.dodge(playerId, message.seq, message.direction);
      case "buy_weapon": return this.buyWeapon(playerId, message.weaponId);
      case "allocate_mastery": return this.allocateMastery(playerId, message.weaponId, message.nodeId, message.expectedRevision);
      case "assign_skill": return this.equipSkill(playerId, message.weaponId, message.skillId, message.slot, message.expectedRevision);
      case "respec_mastery": return this.respecMastery(playerId, message.weaponId, message.expectedRevision);
      case "buy_item": return this.buyItem(playerId, message.vendorId, message.itemId);
      case "replace_item": return this.replaceItem(playerId, message.vendorId, message.itemId, message.slotIndex, message.expectedItemId);
      case "sell_item": return this.sellItem(playerId, message.vendorId, message.slotIndex, message.expectedItemId);
      case "input": return this.setInput(playerId, message.seq, message.move, message.aim, message.attacking);
      case "ping": return { ok: true, pong: { sentAt: message.sentAt, serverTime: Date.now() } };
    }
  }

  update(rawDt: number): void {
    const dt = clamp(rawDt, 0, 0.1);
    if (dt <= 0) return;
    this.totalTime += dt;
    this.tickNumber += 1;
    this.updateTransient(dt);
    if (this.phase !== "lobby") this.elapsed += dt;
    if (this.phase === "lobby" || this.phase === "victory" || this.phase === "defeat") return;
    this.runElapsed += dt;
    this.updatePlayers(dt);
    this.updateGreatswordStrikes();
    if (this.phase === "arming") {
      const connected = [...this.players.values()].filter((player) => player.connected);
      if (connected.length > 0 && connected.every((player) => player.weaponId === "greatsword")) {
        if (this.elapsed >= 2.5) this.setPhase("defense");
      } else {
        this.elapsed = 0;
      }
      return;
    }
    this.updateProjectiles(dt);
    this.updateSummons(dt);
    this.updateEnemies(dt);
    this.updateCinderWalls();
    this.updatePickups(dt);
    this.updateDelayed();
    this.updateDirector(dt);
    if (this.nexus.hp <= 0 && !this.nexus.shielded) this.setPhase("defeat");
  }

  private allocation(player: PlayerState, weaponId: WeaponId): WeaponAllocationSnapshot {
    return player.weaponAllocations[weaponId] ??= createGreatswordAllocation(player.level);
  }

  private atArsenal(player: PlayerState): boolean {
    return distance(player.position, ARSENAL_POSITION) <= ARSENAL_INTERACTION_RADIUS;
  }

  private canEditLoadout(player: PlayerState): boolean {
    return this.atArsenal(player) || player.loadoutEditRemaining > 0;
  }

  allocateMastery(
    playerId: string,
    weaponId: WeaponId,
    nodeId: MasteryNodeId,
    expectedRevision: number,
  ): GameActionResult {
    const player = this.players.get(playerId);
    if (!player) return this.failure("PLAYER_UNKNOWN", "Player is not in this run.");
    if (player.weaponId !== weaponId) return this.failure("WEAPON_NOT_EQUIPPED", "Equip that weapon before spending its points.");
    if (this.phase === "lobby" || this.phase === "victory" || this.phase === "defeat") return this.failure("RUN_INACTIVE", "Mastery belongs to the active run.");
    const allocation = this.allocation(player, weaponId);
    if (allocation.revision !== expectedRevision) return this.failure("MASTERY_CHANGED", "The mastery allocation changed; review the latest network.");
    if (allocation.spentNodeIds.includes(nodeId)) return this.failure("NODE_LEARNED", "That mastery node is already learned.");
    const definition = GREATSWORD_NODE_BY_ID[nodeId];
    const availability = deriveMasteryNodeAvailability(nodeId, allocation.spentNodeIds, player.level);
    if (availability.state === "excluded") return this.failure("MASTERY_EXCLUDED", availability.reason);
    if (availability.state === "locked") {
      return this.failure(
        availability.reason === "No mastery points available." ? "NO_MASTERY_POINTS" : definition.kind === "mastery" ? "MASTERY_REQUIREMENT" : "PREREQUISITE_REQUIRED",
        availability.reason,
      );
    }
    allocation.spentNodeIds.push(nodeId);
    allocation.revision += 1;
    allocation.unspentPoints = Math.max(0, player.level - allocation.spentNodeIds.length);
    player.skillPoints = allocation.unspentPoints;
    this.emit("mastery_changed", `${player.name} learned ${definition.name}.`, { playerId });
    return { ok: true };
  }

  equipSkill(
    playerId: string,
    weaponId: WeaponId,
    skillId: SkillId | null,
    slot: AbilitySlot,
    expectedRevision: number,
  ): GameActionResult {
    const player = this.players.get(playerId);
    if (!player) return this.failure("PLAYER_UNKNOWN", "Player is not in this run.");
    if (player.weaponId !== weaponId) return this.failure("WEAPON_NOT_EQUIPPED", "Equip that weapon before changing its loadout.");
    if (!this.canEditLoadout(player)) return this.failure("LOADOUT_LOCKED", "Change equipped skills at the Arsenal or during the level-up interaction.");
    const allocation = this.allocation(player, weaponId);
    if (allocation.revision !== expectedRevision) return this.failure("MASTERY_CHANGED", "The mastery allocation changed; review the latest network.");
    if (skillId !== null && !allocation.spentNodeIds.includes(skillId)) return this.failure("SKILL_UNLEARNED", "Learn that skill before equipping it.");
    const isMastery = skillId !== null && SKILL_DEFINITIONS[skillId].kind === "mastery";
    if ((slot === "ultimate") !== isMastery && skillId !== null) return this.failure("WRONG_SKILL_SLOT", "Standard skills use Q/E/R and a mastery uses F.");
    if (allocation.loadout.ability1 === skillId) allocation.loadout.ability1 = null;
    if (allocation.loadout.ability2 === skillId) allocation.loadout.ability2 = null;
    if (allocation.loadout.ability3 === skillId) allocation.loadout.ability3 = null;
    if (allocation.loadout.ultimate === skillId) allocation.loadout.ultimate = null;
    if (slot === "ultimate") allocation.loadout.ultimate = skillId as MasteryLoadout["ultimate"];
    else allocation.loadout[slot] = skillId as StandardSkillId | null;
    allocation.revision += 1;
    this.emit("mastery_changed", `${player.name} changed their Greatsword loadout.`, { playerId });
    return { ok: true };
  }

  respecMastery(playerId: string, weaponId: WeaponId, expectedRevision: number): GameActionResult {
    const player = this.players.get(playerId);
    if (!player) return this.failure("PLAYER_UNKNOWN", "Player is not in this run.");
    if (player.weaponId !== weaponId || !this.atArsenal(player)) return this.failure("ARSENAL_REQUIRED", "Respecialize at the physical Arsenal.");
    const allocation = this.allocation(player, weaponId);
    if (allocation.revision !== expectedRevision) return this.failure("MASTERY_CHANGED", "The mastery allocation changed; review it again.");
    const price = allocation.freeRespecUsed ? 60 : 0;
    if (player.goldUnits < goldToUnits(price)) return this.failure("INSUFFICIENT_GOLD", `Respecializing costs ${price} gold.`);
    player.goldUnits -= goldToUnits(price);
    player.weaponAllocations[weaponId] = {
      ...createGreatswordAllocation(player.level),
      revision: allocation.revision + 1,
      freeRespecUsed: true,
    };
    player.skillPoints = player.level;
    this.emit("mastery_changed", `${player.name} reforged their Greatsword mastery.`, { playerId });
    return { ok: true };
  }

  damageNexus(amount: number): void {
    if (!this.nexus.shielded) this.nexus.hp = Math.max(0, this.nexus.hp - Math.max(0, amount));
    if (this.nexus.hp <= 0 && this.phase !== "lobby") this.setPhase("defeat");
  }

  damageRiftHeart(amount: number, sourceSummonId: string | null = null, source: PlayerState | null = null): void {
    if (!this.riftHeart.active || this.phase !== "push") return;
    const resolvedDamage = Math.min(this.riftHeart.hp, Math.max(0, amount));
    this.riftHeart.hp = Math.max(0, this.riftHeart.hp - resolvedDamage);
    if (source) this.recordTelemetry(source, this.telemetrySkill(source), "rift_heart", "objective", "damage", resolvedDamage);
    this.effect("rift_hit", WORLD_LAYOUT.riftHeart, 8, null, 0.35, null, undefined, sourceSummonId);
    if (this.riftHeart.hp <= 0) this.setPhase("victory");
  }

  /** Narrow deterministic seam used by server tests and debug tooling. */
  damageGatebreaker(amount: number): void {
    if (!this.gatebreakerId) return;
    const gatebreaker = this.enemies.get(this.gatebreakerId);
    const source = this.players.values().next().value as PlayerState | undefined;
    if (!gatebreaker || !source) return;
    this.damageEnemy(gatebreaker, Math.max(0, amount), source);
  }

  /** Deterministic accelerated-mode seam for visual phase verification. */
  debugAdvance(): GameActionResult {
    if (!this.accelerated) return this.failure("DEBUG_ONLY", "Enable accelerated debug mode first.");
    if (this.phase === "defense") {
      this.setPhase("breach");
      return { ok: true };
    }
    if (this.phase === "breach") {
      this.damageGatebreaker(Number.MAX_SAFE_INTEGER);
      this.elapsed = Math.max(this.elapsed, Math.min(3, this.timings.breachDuration * 0.25));
      this.updateDirector(0);
      if ((this.phase as GamePhase) === "push") {
        let offset = -3;
        for (const player of this.players.values()) {
          player.position = { x: offset, z: WORLD_LAYOUT.riftHeart.z + 24 };
          offset += 2;
        }
      }
      return { ok: true };
    }
    if (this.phase === "push") {
      this.damageRiftHeart(Number.MAX_SAFE_INTEGER);
      return { ok: true };
    }
    return this.failure("NO_DEBUG_ADVANCE", "This phase has no debug advance target.");
  }

  grantExperience(playerId: string, amount: number): void {
    const player = this.players.get(playerId);
    if (!player) return;
    player.xp += Math.max(0, amount);
    while (player.xp >= this.nextLevelXp(player.level)) {
      player.xp -= this.nextLevelXp(player.level);
      player.level += 1;
      if (player.weaponId === "greatsword") {
        const allocation = this.allocation(player, "greatsword");
        allocation.unspentPoints = Math.max(0, player.level - allocation.spentNodeIds.length);
        player.skillPoints = allocation.unspentPoints;
        player.loadoutEditRemaining = 10;
      }
      player.hp = Math.min(this.heroStats(player).maxHp, player.hp + 20);
    }
  }

  takePendingEvents(): GameEvent[] {
    const events = this.pendingEvents;
    this.pendingEvents = [];
    return events;
  }

  getSnapshot(): GameSnapshot {
    const duration = this.phaseDuration();
    const armedPlayerIds = [...this.players.values()].filter((player) => player.weaponId === "greatsword").map((player) => player.id);
    const waitingPlayerIds = [...this.players.values()].filter((player) => player.connected && player.weaponId !== "greatsword").map((player) => player.id);
    const armingCountdown = this.phase === "arming" && waitingPlayerIds.length === 0
      ? Date.now() + Math.max(0, 2.5 - this.elapsed) * 1000
      : null;
    return {
      tick: this.tickNumber,
      serverTime: Date.now(),
      runElapsed: this.runElapsed,
      debug: this.accelerated,
      phase: this.phase,
      phaseElapsed: this.elapsed,
      phaseDuration: duration,
      objective: this.objective(),
      pressureLane: this.pressureLane,
      activeLanes: [...this.activeLanes],
      arming: this.phase === "arming" ? {
        armedPlayerIds,
        waitingPlayerIds,
        countdownEndsAt: armingCountdown,
      } : null,
      lobby: {
        hostId: this.hostId,
        maxPlayers: 4,
        canStart: this.canStart(),
        readyPlayers: [...this.players.values()].filter((player) => player.ready).map((player) => player.id),
      },
      wave: { number: this.currentWave, total: this.timings.waveCount, alive: this.enemies.size, spawned: this.spawned },
      nexus: { position: copy(WORLD_LAYOUT.nexus), ...this.nexus },
      gates: LANE_IDS.map((lane) => ({ lane, position: copy(WORLD_LAYOUT.gates[lane]), ...this.gates.get(lane)! })),
      riftHeart: { position: copy(WORLD_LAYOUT.riftHeart), ...this.riftHeart },
      vendors: Object.values(VENDOR_DEFINITIONS).map((vendor) => ({
        id: vendor.id,
        name: vendor.name,
        position: copy(vendor.position),
        interactionRadius: vendor.interactionRadius,
        itemIds: [...vendor.itemIds],
      })),
      players: [...this.players.values()].map((player) => this.playerSnapshot(player)),
      enemies: [...this.enemies.values()].map((enemy) => this.enemySnapshot(enemy)),
      projectiles: [...this.projectiles.values()].map(({
        damage: _d,
        pierce: _p,
        hitIds: _h,
        splitTriggered: _t,
        reservedForkIds: _r,
        ...projectile
      }) => projectile),
      summons: [...this.summons.values()].map(({ damage: _d, speed: _s, strikeCooldown: _c, strikesRemaining: _r, orbitOffset: _o, ...summon }) => summon),
      pickups: [...this.pickups.values()],
      effects: [...this.effects.values()],
      events: this.recentEvents.slice(-12),
    };
  }

  private resetRunState(): void {
    this.elapsed = 0;
    this.runElapsed = 0;
    this.totalTime = 0;
    this.currentWave = 0;
    this.spawned = 0;
    this.spawnTimer = 0;
    this.pressureLane = null;
    this.activeLanes = LANE_IDS.slice(0, clamp(this.players.size, 1, LANE_IDS.length));
    this.gatebreakerId = null;
    this.enemies.clear();
    this.projectiles.clear();
    this.summons.clear();
    this.pickups.clear();
    this.effects.clear();
    this.cinderWalls.clear();
    this.delayed = [];
    this.greatswordStrikes = [];
    this.resetStructures();
    const starts: Vec2[] = [{ x: -4, z: 10 }, { x: 4, z: 10 }, { x: -4, z: 16 }, { x: 4, z: 16 }];
    let index = 0;
    for (const player of this.players.values()) {
      player.position = copy(starts[index++]!);
      player.velocity = { x: 0, z: 0 };
      player.move = { x: 0, z: 0 };
      player.aim = { x: 0, z: -1 };
      player.attacking = false;
      player.maxBarrier = 100;
      player.barrier = 0;
      player.level = 1;
      player.heroId = "defender";
      player.weaponId = "practice";
      player.weaponAllocations = {};
      player.cooldownsBySkillId = {};
      player.activeSkillId = null;
      player.basicCombo = 0;
      player.dodgeCharges = 1;
      player.dodgeRechargeRemaining = 0;
      player.dodgeInvulnerableRemaining = 0;
      player.loadoutEditRemaining = 0;
      player.guardRemaining = 0;
      player.counterRemaining = 0;
      player.unbreakableRemaining = 0;
      player.unbreakableResponses = 0;
      player.riposteReady = false;
      player.skillRecoveryMultiplier = 1;
      player.basicDamageMultiplier = 1;
      player.telemetryActionOverride = null;
      player.equipment = createEmptyEquipment();
      player.hp = this.heroStats(player).maxHp;
      player.xp = 0;
      player.goldUnits = goldToUnits(100);
      player.kills = 0;
      player.abilityRanks = ZERO_ABILITY_RANKS();
      player.skillPoints = 1;
      player.action = null;
      player.downedFor = 0;
      player.invulnerableFor = 1;
      player.cooldowns = ZERO_COOLDOWNS();
    }
  }

  private resetStructures(): void {
    this.nexus = { hp: 800, maxHp: 800, shielded: false };
    this.gates = new Map(LANE_IDS.map((lane) => [lane, { hp: 260, maxHp: 260, breached: false }]));
    this.riftHeart = { hp: 1250, maxHp: 1250, active: false };
  }

  private canStart(): boolean {
    return this.phase === "lobby" && this.players.size > 0 && [...this.players.values()].every((player) => player.connected && player.ready);
  }

  private setInput(playerId: string, seq: number, move: Vec2, aim: Vec2, attacking: boolean): GameActionResult {
    const player = this.players.get(playerId);
    if (!player) return this.failure("PLAYER_UNKNOWN", "Player is not connected.");
    if (seq < player.lastInputSeq) return { ok: true };
    player.lastInputSeq = seq;
    const moveLength = length(move);
    player.move = moveLength > 1 ? normalize(move) : { x: clamp(move.x, -1, 1), z: clamp(move.z, -1, 1) };
    if (length(aim) > 0.01) player.aim = normalize(aim);
    player.attacking = attacking;
    return { ok: true };
  }

  private buyItem(playerId: string, vendorId: VendorId, itemId: ItemId): GameActionResult {
    return this.purchaseItem(playerId, vendorId, itemId, null);
  }

  buyWeapon(playerId: string, weaponId: WeaponId): GameActionResult {
    const player = this.players.get(playerId);
    if (!player) return this.failure("PLAYER_UNKNOWN", "Player is not connected.");
    if (this.phase !== "arming") return this.failure("ARMING_ONLY", "The first weapon is forged during the arming phase.");
    if (player.downedFor > 0) return this.failure("PLAYER_DOWNED", "A downed Defender cannot use the Arsenal.");
    if (!this.atArsenal(player)) return this.failure("OUT_OF_RANGE", "Move closer to the Citadel Arsenal.");
    if (player.weaponId === weaponId) return this.failure("WEAPON_OWNED", "That Greatsword is already equipped.");
    const definition = WEAPON_DEFINITIONS[weaponId];
    if (player.goldUnits < goldToUnits(definition.price)) return this.failure("INSUFFICIENT_GOLD", `${definition.name} costs ${definition.price} gold.`);
    player.goldUnits -= goldToUnits(definition.price);
    player.weaponId = weaponId;
    this.allocation(player, weaponId);
    player.skillPoints = player.level;
    this.emit("weapon_purchased", `${player.name} forged a ${definition.name}.`, {
      playerId,
      vendorId: "citadel_arsenal",
      goldDelta: -definition.price,
      position: ARSENAL_POSITION,
    });
    return { ok: true };
  }

  dodge(playerId: string, seq: number, direction: Vec2): GameActionResult {
    const player = this.players.get(playerId);
    if (!player || !this.canAct(player)) return this.failure("CANNOT_ACT", "The Defender cannot dodge now.");
    if (seq < player.lastInputSeq) return { ok: true };
    if (player.action && player.action.kind !== "basic") return this.failure("ACTION_BUSY", "A committed skill cannot be cancelled by dodge.");
    if (player.dodgeCharges <= 0) return this.failure("DODGE_RECHARGING", "Dodge is recharging.");
    const travel = length(direction) > 0.01 ? normalize(direction) : normalize(player.aim);
    player.action = null;
    player.activeSkillId = null;
    player.dodgeCharges = 0;
    player.dodgeRechargeRemaining = 6;
    player.dodgeInvulnerableRemaining = 0.18;
    player.invulnerableFor = Math.max(player.invulnerableFor, 0.18);
    player.position.x += travel.x * 5.5;
    player.position.z += travel.z * 5.5;
    this.clampPlayer(player);
    if (this.hasNode(player, "tempered_stance")) player.barrier = Math.min(player.maxBarrier, player.barrier + 10);
    player.lastInputSeq = Math.max(player.lastInputSeq, seq);
    this.effect("warden_charge", player.position, 2.2, player.id, 0.2, null, this.directionYaw(travel));
    return { ok: true };
  }

  private tradeContext(
    playerId: string,
    vendorId: VendorId,
  ): { player: PlayerState; vendor: (typeof VENDOR_DEFINITIONS)[VendorId] } | { error: GameActionResult } {
    const player = this.players.get(playerId);
    if (!player) return { error: this.failure("PLAYER_UNKNOWN", "Player is not connected.") };
    if (!player.heroId || (this.phase !== "defense" && this.phase !== "breach" && this.phase !== "push")) {
      return { error: this.failure("RUN_INACTIVE", "Citadel vendors only trade during an active siege.") };
    }
    if (player.downedFor > 0) return { error: this.failure("PLAYER_DOWNED", "A downed hero cannot trade.") };
    if (!isVendorId(vendorId)) return { error: this.failure("VENDOR_UNKNOWN", "That vendor does not exist.") };
    const vendor = VENDOR_DEFINITIONS[vendorId];
    return { player, vendor };
  }

  private stateAfterEquipmentChange(
    player: PlayerState,
    nextEquipment: EquipmentSlots,
  ): { cooldowns: Record<ActionSlot, number>; cooldownsBySkillId: Partial<Record<SkillId, number>>; hp: number } {
    if (!player.heroId) return { cooldowns: { ...player.cooldowns }, cooldownsBySkillId: { ...player.cooldownsBySkillId }, hp: player.hp };
    const previousStats = this.heroStats(player);
    const nextStats = deriveHeroStats(player.heroId, player.level, nextEquipment, player.weaponId);
    const nextCooldowns = { ...player.cooldowns };
    const nextSkillCooldowns = { ...player.cooldownsBySkillId };
    if (nextStats.cooldownRecovery !== previousStats.cooldownRecovery) {
      const progressScale = previousStats.cooldownRecovery / nextStats.cooldownRecovery;
      for (const slot of ["ability1", "ability2", "ability3", "ultimate"] as const) {
        nextCooldowns[slot] *= progressScale;
      }
      for (const skillId of Object.keys(nextSkillCooldowns) as SkillId[]) {
        nextSkillCooldowns[skillId] = (nextSkillCooldowns[skillId] ?? 0) * progressScale;
      }
    }
    return {
      cooldowns: nextCooldowns,
      cooldownsBySkillId: nextSkillCooldowns,
      hp: projectHealthAtPreservedRatio(player.hp, previousStats.maxHp, nextStats.maxHp),
    };
  }

  private replaceItem(
    playerId: string,
    vendorId: VendorId,
    itemId: ItemId,
    slotIndex: EquipmentSlotIndex,
    expectedItemId: ItemId,
  ): GameActionResult {
    return this.purchaseItem(playerId, vendorId, itemId, slotIndex, expectedItemId);
  }

  private sellItem(
    playerId: string,
    vendorId: VendorId,
    slotIndex: EquipmentSlotIndex,
    expectedItemId: ItemId,
  ): GameActionResult {
    const context = this.tradeContext(playerId, vendorId);
    if ("error" in context) return context.error;
    const { player, vendor } = context;
    if (!isEquipmentSlotIndex(slotIndex)) {
      return this.failure("INVALID_EQUIPMENT_SLOT", "Choose one of the six equipment slots.");
    }
    if (!isItemId(expectedItemId)) {
      return this.failure("ITEM_UNKNOWN", "The expected equipment item does not exist.");
    }
    if (distance(player.position, vendor.position) > vendor.interactionRadius) {
      return this.failure("OUT_OF_RANGE", `Move closer to ${vendor.name} to trade.`);
    }
    const currentItemId = player.equipment[slotIndex];
    if (!currentItemId) return this.failure("EMPTY_EQUIPMENT_SLOT", "Choose an occupied equipment slot to sell.");
    if (currentItemId !== expectedItemId) {
      return this.failure("EQUIPMENT_CHANGED", "That equipment slot changed before the sale was confirmed.");
    }
    const projection = projectEquipmentRemoval(player.equipment, slotIndex, expectedItemId);
    if (!projection) return this.failure("EQUIPMENT_CHANGED", "The equipment sale is no longer available.");

    const nextState = this.stateAfterEquipmentChange(player, projection.equipment);
    player.goldUnits += goldToUnits(ARMORY_SELL_VALUE);
    player.equipment = projection.equipment;
    player.cooldowns = nextState.cooldowns;
    player.cooldownsBySkillId = nextState.cooldownsBySkillId;
    player.hp = nextState.hp;
    this.emit(
      "item_sold",
      `${player.name} sold ${ITEM_DEFINITIONS[expectedItemId].name} at ${vendor.name} for ${ARMORY_SELL_VALUE} gold.`,
      {
        playerId,
        vendorId,
        itemId: expectedItemId,
        slotIndex,
        goldDelta: ARMORY_SELL_VALUE,
        position: vendor.position,
      },
    );
    return { ok: true };
  }

  private purchaseItem(
    playerId: string,
    vendorId: VendorId,
    itemId: ItemId,
    replacementSlotIndex: EquipmentSlotIndex | null,
    expectedItemId: ItemId | null = null,
  ): GameActionResult {
    const context = this.tradeContext(playerId, vendorId);
    if ("error" in context) return context.error;
    const { player, vendor } = context;
    if (!isItemId(itemId)) return this.failure("ITEM_UNKNOWN", "That item does not exist.");
    if (!vendor.itemIds.includes(itemId)) return this.failure("ITEM_NOT_STOCKED", `${vendor.name} does not stock that item.`);
    if (distance(player.position, vendor.position) > vendor.interactionRadius) {
      return this.failure("OUT_OF_RANGE", `Move closer to ${vendor.name} to trade.`);
    }

    let slotIndex: EquipmentSlotIndex | null = replacementSlotIndex;
    let replacedItemId: ItemId | null = null;
    if (replacementSlotIndex !== null) {
      if (!isEquipmentSlotIndex(replacementSlotIndex)) {
        return this.failure("INVALID_EQUIPMENT_SLOT", "Choose one of the six equipment slots.");
      }
      if (player.equipment.some((equippedItemId) => equippedItemId === null)) {
        return this.failure("REPLACEMENT_NOT_REQUIRED", "Fill all six equipment slots before replacing an item.");
      }
      if (!isItemId(expectedItemId)) {
        return this.failure("ITEM_UNKNOWN", "The expected equipment item does not exist.");
      }
      replacedItemId = player.equipment[replacementSlotIndex];
      if (!replacedItemId) {
        return this.failure("REPLACEMENT_NOT_REQUIRED", "Choose an occupied equipment slot to replace.");
      }
      if (replacedItemId !== expectedItemId) {
        return this.failure("EQUIPMENT_CHANGED", "That equipment slot changed before the replacement was confirmed.");
      }
      if (replacedItemId === itemId) {
        return this.failure("SAME_ITEM", `${ITEM_DEFINITIONS[itemId].name} already occupies that slot.`);
      }
    }

    const item = ITEM_DEFINITIONS[itemId];
    const price = replacementSlotIndex === null ? item.price : armoryReforgeNetCost(item.price);
    const priceUnits = goldToUnits(price);
    if (player.goldUnits < priceUnits) {
      return this.failure(
        "INSUFFICIENT_GOLD",
        replacementSlotIndex === null
          ? `${item.name} costs ${item.price} gold.`
          : `Reforging ${item.name} costs ${price} gold after the ${ARMORY_SELL_VALUE}-gold trade-in.`,
      );
    }
    if (slotIndex === null) {
      const emptySlotIndex = player.equipment.indexOf(null);
      if (!isEquipmentSlotIndex(emptySlotIndex)) return this.failure("EQUIPMENT_FULL", "All six equipment slots are full.");
      slotIndex = emptySlotIndex;
    }

    const projection = projectEquipmentChange(player.equipment, itemId, replacementSlotIndex);
    if (!projection) return this.failure("EQUIPMENT_CHANGED", "The equipment change is no longer available.");
    slotIndex = projection.slotIndex;
    const nextEquipment = projection.equipment;
    const nextState = this.stateAfterEquipmentChange(player, nextEquipment);
    player.goldUnits -= priceUnits;
    player.equipment = nextEquipment;
    player.cooldowns = nextState.cooldowns;
    player.cooldownsBySkillId = nextState.cooldownsBySkillId;
    player.hp = nextState.hp;

    const eventText = replacedItemId
      ? `${player.name} replaced ${ITEM_DEFINITIONS[replacedItemId].name} with ${item.name} at ${vendor.name}.`
      : `${player.name} equipped ${item.name} at ${vendor.name}.`;
    this.emit("item_purchased", eventText, {
      playerId,
      vendorId,
      itemId,
      slotIndex,
      goldDelta: -price,
      ...(replacedItemId ? { replacedItemId } : {}),
      position: vendor.position,
    });
    return { ok: true };
  }

  private cast(playerId: string, slot: AbilitySlot): GameActionResult {
    const player = this.players.get(playerId);
    if (!this.canAct(player) || player.weaponId !== "greatsword") return this.failure("CANNOT_ACT", "The Defender cannot cast that now.");
    if (player.action && player.action.kind !== "basic") return this.failure("ACTION_BUSY", "Finish the current action first.");
    const allocation = this.allocation(player, "greatsword");
    const skillId = allocation.loadout[slot];
    if (!skillId) return this.failure("SKILL_UNASSIGNED", "Assign a learned Greatsword skill to that slot.");
    if ((player.cooldownsBySkillId[skillId] ?? 0) > 0) return this.failure("COOLDOWN", "That skill is cooling down.");
    const definition = SKILL_DEFINITIONS[skillId];
    const stats = this.heroStats(player);
    const cooldown = definition.cooldown / stats.cooldownRecovery;
    player.cooldownsBySkillId[skillId] = cooldown;
    player.cooldowns[slot] = cooldown;
    player.activeSkillId = skillId;
    player.skillRecoveryMultiplier = 1;
    if (skillId === "colossal_strike" && this.hasNode(player, "stand_and_deliver") && this.hasNode(player, "rallying_sweep")) {
      player.barrier = Math.min(player.maxBarrier, player.barrier + 25);
    }
    player.action = this.action(slot, "windup", definition.windup, normalize(player.aim));
    return { ok: true };
  }

  private hasNode(player: PlayerState, nodeId: MasteryNodeId): boolean {
    return player.weaponAllocations.greatsword?.spentNodeIds.includes(nodeId) ?? false;
  }

  private mutationActive(player: PlayerState, nodeId: MasteryNodeId, skillId: StandardSkillId): boolean {
    const mutation = GREATSWORD_NODE_BY_ID[nodeId];
    const loadout = player.weaponAllocations.greatsword?.loadout;
    return this.hasNode(player, nodeId)
      && (mutation.mutationFor?.includes(skillId) ?? false)
      && !!loadout
      && (loadout.ability1 === skillId || loadout.ability2 === skillId || loadout.ability3 === skillId);
  }

  private enemiesInLine(origin: Vec2, direction: Vec2, reach: number, width: number): EnemyState[] {
    const facing = normalize(direction);
    const end = { x: origin.x + facing.x * reach, z: origin.z + facing.z * reach };
    return [...this.enemies.values()]
      .map((enemy) => ({ enemy, progress: segmentHitProgress(origin, end, enemy.position, width + enemy.radius) }))
      .filter((contact): contact is { enemy: EnemyState; progress: number } => contact.progress !== null)
      .sort((left, right) => left.progress - right.progress)
      .map(({ enemy }) => enemy);
  }

  private scheduleGreatswordStrike(
    player: PlayerState,
    skillId: SkillId,
    delay: number,
    center: Vec2,
    radius: number,
    damage: number,
    playerPosition?: Vec2,
  ): void {
    this.greatswordStrikes.push({
      at: this.totalTime + delay,
      ownerId: player.id,
      skillId,
      center: copy(center),
      radius,
      damage,
      ...(playerPosition ? { playerPosition: copy(playerPosition) } : {}),
    });
  }

  private updateGreatswordStrikes(): void {
    const pending: TimedGreatswordStrike[] = [];
    for (const strike of this.greatswordStrikes) {
      if (strike.at > this.totalTime) {
        pending.push(strike);
        continue;
      }
      const player = this.players.get(strike.ownerId);
      if (!player || player.downedFor > 0) continue;
      if (strike.playerPosition) {
        player.position = copy(strike.playerPosition);
        this.clampPlayer(player);
      }
      player.telemetryActionOverride = strike.skillId;
      this.damageCircle(player, strike.center, strike.radius, strike.damage);
      player.telemetryActionOverride = null;
      this.effect("slash", strike.center, strike.radius, player.id, 0.3);
    }
    this.greatswordStrikes = pending;
  }

  private resolveGreatswordSkill(player: PlayerState, skillId: SkillId, aim: Vec2): void {
    const skill = SKILL_DEFINITIONS[skillId];
    const power = this.heroStats(player).abilityPower;
    const damage = skill.damage * power * (this.hasNode(player, "citadel_training") ? 1.08 : 1);
    const target = { x: player.position.x + aim.x * Math.min(skill.reach || 4, 12), z: player.position.z + aim.z * Math.min(skill.reach || 4, 12) };
    if (skillId === "cleave") {
      const hits = this.enemiesInLine(player.position, aim, skill.reach, this.hasNode(player, "honed_arc") ? 5.2 : skill.radius);
      for (const enemy of hits) {
        this.damageEnemy(enemy, damage, player);
        if (this.mutationActive(player, "sundering_edge", "cleave")) enemy.exposedFor = Math.max(enemy.exposedFor, 3);
      }
      if (this.mutationActive(player, "follow_through", "cleave") && hits.length >= 2) player.skillRecoveryMultiplier = 0.55;
      this.effect("slash", target, skill.radius, player.id, 0.45, null, this.directionYaw(aim));
    } else if (skillId === "whirlwind") {
      const strikes = this.mutationActive(player, "endless_motion", "whirlwind") ? 4 : 3;
      for (let index = 0; index < strikes; index += 1) {
        this.scheduleGreatswordStrike(player, skillId, index * 0.16, player.position, skill.radius, damage);
      }
      this.effect("warden_wave", player.position, skill.radius, player.id, 0.7);
    } else if (skillId === "rising_slash") {
      for (const enemy of this.enemiesInLine(player.position, aim, skill.reach, skill.radius)) {
        this.damageEnemy(enemy, damage, player);
        if (this.mutationActive(player, "sundering_edge", "rising_slash")) enemy.exposedFor = Math.max(enemy.exposedFor, 3);
        if (enemy.elite) {
          enemy.staggerFor = Math.max(enemy.staggerFor, 0.65);
          this.recordTelemetry(player, skillId, enemy.id, "elite", "stagger", 1, 0.65);
        } else {
          enemy.position.x += aim.x * 3.2;
          enemy.position.z += aim.z * 3.2;
          enemy.staggerFor = Math.max(enemy.staggerFor, 1.1);
          this.recordTelemetry(player, skillId, enemy.id, "normal", "displace", 3.2, 1.1);
        }
      }
      this.effect("warden_wave", target, skill.reach * 0.5, player.id, 0.5, null, this.directionYaw(aim));
    } else if (skillId === "guard") {
      player.guardRemaining = skill.active;
      player.guardDirection = copy(aim);
      this.effect("warden_bastion", player.position, 4.5, player.id, 0.8);
    } else if (skillId === "counterstrike") {
      player.counterRemaining = skill.active;
      player.guardDirection = copy(aim);
      this.effect("warden_bastion", player.position, skill.radius, player.id, skill.active);
    } else if (skillId === "rallying_sweep") {
      const hits = this.damageCircle(player, player.position, skill.radius, damage);
      player.barrier = Math.min(player.maxBarrier, player.barrier + hits * 10 + 10);
      for (const ally of this.players.values()) {
        if (ally.id === player.id || distance(ally.position, player.position) > 8) continue;
        ally.barrier = Math.min(ally.maxBarrier, ally.barrier + Math.min(30, hits * (this.hasNode(player, "shared_resolve") ? 7 : 4)));
      }
      this.effect("warden_bastion", player.position, skill.radius, player.id, 0.65);
    } else if (skillId === "charge") {
      const reach = skill.reach + (this.mutationActive(player, "momentum", "charge") ? 2 : 0);
      const origin = copy(player.position);
      const contacts = this.enemiesInLine(origin, aim, reach, skill.radius);
      const carried = this.mutationActive(player, "relentless_charge", "charge")
        ? contacts.find((enemy) => !enemy.elite)
        : undefined;
      let eliteHit = false;
      for (const enemy of contacts) {
        eliteHit ||= enemy.elite;
        this.damageEnemy(enemy, damage, player);
        if (enemy.elite) {
          const empowered = this.hasNode(player, "countercharge") && player.counterchargeReady;
          enemy.staggerFor = Math.max(enemy.staggerFor, empowered ? 1.25 : 0.45);
          this.recordTelemetry(player, skillId, enemy.id, "elite", empowered ? "interrupt" : "stagger", 1, enemy.staggerFor);
        } else if (enemy !== carried) {
          enemy.position.x += aim.x * 3;
          enemy.position.z += aim.z * 3;
          this.recordTelemetry(player, skillId, enemy.id, "normal", "displace", 3);
        }
      }
      player.position.x += aim.x * reach;
      player.position.z += aim.z * reach;
      this.clampPlayer(player);
      if (carried) {
        carried.position = { x: player.position.x + aim.x * 1.5, z: player.position.z + aim.z * 1.5 };
        this.recordTelemetry(player, skillId, carried.id, "normal", "displace", reach);
      }
      if (eliteHit && this.mutationActive(player, "momentum", "charge")) {
        player.cooldownsBySkillId.charge = Math.max(0, (player.cooldownsBySkillId.charge ?? 0) - 2);
      }
      player.counterchargeReady = false;
      if (this.hasNode(player, "sweeping_advance")) this.damageCircle(player, player.position, 4, SKILL_DEFINITIONS.cleave.damage * power * 0.55);
      this.effect("warden_charge", { x: (origin.x + player.position.x) / 2, z: (origin.z + player.position.z) / 2 }, reach / 2, player.id, 0.5, null, this.directionYaw(aim));
    } else if (skillId === "impale") {
      const reach = skill.reach + (this.mutationActive(player, "executioners_reach", "impale") ? 2.5 : 0);
      for (const enemy of this.enemiesInLine(player.position, aim, reach, skill.radius)) {
        const weakened = enemy.hp / enemy.maxHp <= 0.35;
        const executionBonus = this.mutationActive(player, "executioners_reach", "impale") && weakened ? 1.45 : 1;
        this.damageEnemy(enemy, damage * (enemy.elite ? 1.35 : 1) * executionBonus, player);
      }
      this.effect("warden_wave", target, skill.reach * 0.5, player.id, 0.4, null, this.directionYaw(aim));
    } else if (skillId === "colossal_strike") {
      const stableAim = aim.x * normalize(player.aim).x + aim.z * normalize(player.aim).z >= 0.985;
      const resolvedDamage = damage * (this.mutationActive(player, "measured_blow", "colossal_strike") && stableAim ? 1.25 : 1);
      this.damageCircle(player, target, skill.radius, resolvedDamage);
      for (const enemy of this.enemies.values()) {
        if (distance(enemy.position, target) <= skill.radius + enemy.radius) {
          enemy.staggerFor = Math.max(enemy.staggerFor, enemy.elite ? 1.2 : 2);
          this.recordTelemetry(player, skillId, enemy.id, enemy.elite ? "elite" : "normal", "stagger", 1, enemy.staggerFor);
        }
      }
      this.effect("shock", target, skill.radius, player.id, 0.75);
    } else if (skillId === "bladestorm") {
      const origin = copy(player.position);
      for (let index = 1; index <= 4; index += 1) {
        const center = { x: origin.x + aim.x * skill.reach * index / 4, z: origin.z + aim.z * skill.reach * index / 4 };
        this.scheduleGreatswordStrike(player, skillId, (index - 1) * 0.18, center, skill.radius, damage, center);
      }
    } else if (skillId === "unbreakable") {
      player.unbreakableRemaining = skill.active;
      player.unbreakableResponses = 3;
      this.effect("warden_bastion", player.position, skill.radius, player.id, 1.8);
    } else if (skillId === "onslaught") {
      const origin = copy(player.position);
      for (let index = 1; index <= 3; index += 1) {
        const step = { x: origin.x + aim.x * skill.reach * index / 3, z: origin.z + aim.z * skill.reach * index / 3 };
        this.scheduleGreatswordStrike(player, skillId, (index - 1) * 0.28, step, skill.radius, damage, step);
      }
      this.effect("warden_charge", target, skill.reach * 0.5, player.id, 0.9, null, this.directionYaw(aim));
    }
  }

  private castWarden(player: PlayerState, slot: AbilitySlot, aim: Vec2, target: Vec2, rank: number): void {
    if (slot === "ability1") {
      const origin = copy(player.position);
      const reach = this.rankRadius(10, rank);
      this.damageLine(player, origin, aim, reach, this.rankRadius(2.5, rank), this.abilityMagnitude(player, slot, rank));
      player.position.x += aim.x * reach; player.position.z += aim.z * reach; this.clampPlayer(player);
      const midpoint = { x: origin.x + aim.x * reach * 0.5, z: origin.z + aim.z * reach * 0.5 };
      this.effect("warden_charge", midpoint, reach * 0.5, player.id, 0.55, null, this.directionYaw(aim));
    } else if (slot === "ability2") {
      const reach = this.rankRadius(15, rank);
      this.damageLine(player, player.position, aim, reach, this.rankRadius(3.7, rank), this.abilityMagnitude(player, slot, rank));
      this.effect("warden_wave", player.position, reach, player.id, 0.65, null, this.directionYaw(aim));
    } else if (slot === "ability3") {
      const radius = this.rankRadius(9, rank);
      this.damageCircle(player, player.position, radius, this.abilityMagnitude(player, slot, rank));
      player.barrier = Math.min(player.maxBarrier, player.barrier + this.abilityMagnitude(player, slot, rank, "secondary"));
      this.effect("war_standard", player.position, radius, player.id, 5 + rank);
    } else {
      const radius = this.rankRadius(17, rank);
      this.damageCircle(player, player.position, radius, this.abilityMagnitude(player, slot, rank));
      player.barrier = player.maxBarrier;
      this.effect("warden_bastion", player.position, radius, player.id, 1.2);
    }
  }

  private castRiftstalker(player: PlayerState, slot: AbilitySlot, aim: Vec2, target: Vec2, rank: number): void {
    if (slot === "ability1") {
      player.position.x -= aim.x * 6; player.position.z -= aim.z * 6; this.clampPlayer(player); player.invulnerableFor = 0.3;
      this.fireProjectile(player, "arrow", aim, this.abilityMagnitude(player, slot, rank), 31, 2, this.rankRadius(0.45, rank));
      this.effect("slash", player.position, this.rankRadius(2, rank), player.id);
    } else if (slot === "ability2") {
      const seed = this.fireProjectile(
        player,
        "splitbolt",
        aim,
        this.abilityMagnitude(player, slot, rank),
        SPLITBOLT_SPEED,
        SPLITBOLT_SEED_PIERCE,
        SPLITBOLT_SEED_RADIUS,
        SPLITBOLT_LIFETIME_SECONDS,
        "seed",
      );
      // The previous cast reserved three projectile IDs immediately. Keep that
      // cadence even when the seed earns no fork so unrelated IDs drift less.
      seed.reservedForkIds = [this.id("projectile"), this.id("projectile")];
    } else if (slot === "ability3") {
      const radius = this.rankRadius(7.5, rank);
      this.damageCircle(player, target, radius, this.abilityMagnitude(player, slot, rank), 4); this.effect("snare", target, radius, player.id, 1.1);
    } else {
      for (let index = -5; index <= 5; index++) this.fireProjectile(player, "arrow", rotate(aim, index * 0.075), this.abilityMagnitude(player, slot, rank), 34, 3, this.rankRadius(0.45, rank));
    }
  }

  private castAshcaller(player: PlayerState, slot: AbilitySlot, aim: Vec2, target: Vec2, rank: number): void {
    if (slot === "ability1") {
      const radius = this.rankRadius(7, rank);
      this.damageCircle(player, player.position, radius, this.abilityMagnitude(player, slot, rank)); this.effect("fire", player.position, radius, player.id);
    } else if (slot === "ability2") {
      this.createCinderWall(player, aim, rank);
    } else if (slot === "ability3") {
      const radius = this.rankRadius(8, rank);
      this.effect("meteor_warning", target, radius, player.id, 0.9);
      this.delayed.push({ at: this.totalTime + 0.8, ownerId: player.id, position: target, radius, damage: this.abilityMagnitude(player, slot, rank), kind: "meteor" });
    } else {
      const radius = this.rankRadius(19, rank);
      this.damageCircle(player, player.position, radius, this.abilityMagnitude(player, slot, rank)); this.effect("fire", player.position, radius, player.id, 1.2);
    }
  }

  private castGravebinder(player: PlayerState, slot: AbilitySlot, aim: Vec2, target: Vec2, rank: number): void {
    if (slot === "ability1") {
      const radius = this.rankRadius(8, rank);
      const hit = this.damageCircle(player, target, radius, this.abilityMagnitude(player, slot, rank));
      for (const enemy of this.enemies.values()) if (distance(enemy.position, target) <= radius) {
        const pull = normalize({ x: player.position.x - enemy.position.x, z: player.position.z - enemy.position.z });
        enemy.position.x += pull.x * 4; enemy.position.z += pull.z * 4;
      }
      player.hp = Math.min(this.heroStats(player).maxHp, player.hp + hit * this.abilityMagnitude(player, slot, rank, "secondary")); this.effect("souls", target, radius, player.id);
    } else if (slot === "ability2") {
      player.barrier = Math.min(player.maxBarrier, player.barrier + this.abilityMagnitude(player, slot, rank)); this.effect("heal", player.position, this.rankRadius(4, rank), player.id);
    } else if (slot === "ability3") {
      this.raiseWraithHost(player, rank);
      this.effect("souls", player.position, this.rankRadius(7, rank), player.id, 0.8);
    } else {
      this.fireProjectile(player, "death_tide", aim, this.abilityMagnitude(player, slot, rank), 19, 99, this.rankRadius(3.2, rank));
      this.effect("souls", player.position, this.rankRadius(10, rank), player.id, 1);
    }
  }

  private updatePlayers(dt: number): void {
    for (const player of this.players.values()) {
      for (const slot of Object.keys(player.cooldowns) as ActionSlot[]) player.cooldowns[slot] = Math.max(0, player.cooldowns[slot] - dt);
      for (const skillId of Object.keys(player.cooldownsBySkillId) as SkillId[]) {
        player.cooldownsBySkillId[skillId] = Math.max(0, (player.cooldownsBySkillId[skillId] ?? 0) - dt);
      }
      player.loadoutEditRemaining = Math.max(0, player.loadoutEditRemaining - dt);
      player.guardRemaining = Math.max(0, player.guardRemaining - dt);
      player.counterRemaining = Math.max(0, player.counterRemaining - dt);
      player.unbreakableRemaining = Math.max(0, player.unbreakableRemaining - dt);
      player.dodgeInvulnerableRemaining = Math.max(0, player.dodgeInvulnerableRemaining - dt);
      if (player.dodgeCharges === 0) {
        player.dodgeRechargeRemaining = Math.max(0, player.dodgeRechargeRemaining - dt);
        if (player.dodgeRechargeRemaining <= 0) player.dodgeCharges = 1;
      }
      player.invulnerableFor = Math.max(0, player.invulnerableFor - dt);
      if (player.guardRemaining > 0 && this.mutationActive(player, "perfect_guard", "guard")) {
        for (const enemy of this.enemies.values()) {
          if (enemy.action?.phase !== "windup" || distance(enemy.position, player.position) > enemy.radius + 5) continue;
          const towardEnemy = normalize({ x: enemy.position.x - player.position.x, z: enemy.position.z - player.position.z });
          if (towardEnemy.x * player.guardDirection.x + towardEnemy.z * player.guardDirection.z < 0.35) continue;
          enemy.action = null;
          enemy.staggerFor = Math.max(enemy.staggerFor, enemy.elite ? 0.55 : 1.1);
          this.recordTelemetry(player, "guard", enemy.id, enemy.elite ? "elite" : "normal", "interrupt", 1, enemy.staggerFor);
        }
      }
      if (player.downedFor > 0) {
        player.downedFor -= dt;
        if (player.downedFor <= 0) {
          player.hp = this.heroStats(player).maxHp * 0.55; player.position = { x: 0, z: 6 }; player.invulnerableFor = 2;
          this.emit("player_revived", `${player.name} returned at the Nexus.`, { playerId: player.id });
        }
        player.action = null;
        player.velocity = { x: 0, z: 0 };
        continue;
      }
      const hero = player.heroId ? HERO_DEFINITIONS[player.heroId] : null;
      if (!hero) continue;
      const stats = this.heroStats(player);
      this.updatePlayerAction(player, dt);
      if (
        stats.basicMoveRetention > 0 &&
        player.attacking &&
        !player.action &&
        player.cooldowns.basic <= 0
      ) this.startBasicAttack(player);
      const movement = length(player.move) > 1 ? normalize(player.move) : player.move;
      const movementScale = player.guardRemaining > 0 && this.mutationActive(player, "guarded_advance", "guard")
        ? 0.32
        : actionMoveRetention(player.action, stats);
      player.velocity = { x: movement.x * stats.moveSpeed * movementScale, z: movement.z * stats.moveSpeed * movementScale };
      player.position.x += player.velocity.x * dt;
      player.position.z += player.velocity.z * dt;
      this.clampPlayer(player);
      if (player.attacking && !player.action && player.cooldowns.basic <= 0) this.startBasicAttack(player);
    }
  }

  private updatePlayerAction(player: PlayerState, dt: number): void {
    const current = player.action;
    if (!current) return;
    if (current.kind === "enemy_attack") {
      player.action = null;
      return;
    }
    current.remaining -= dt;
    if (current.remaining > 0) return;
    if (current.phase === "windup") {
      this.resolvePlayerAction(player, current);
      const duration = current.kind === "basic"
        ? 0.1
        : player.activeSkillId ? SKILL_DEFINITIONS[player.activeSkillId].active : 0.1;
      player.action = this.action(current.kind, "active", duration, current.direction);
      return;
    }
    if (current.phase === "active") {
      const duration = current.kind === "basic"
        ? Math.max(0.1, this.heroStats(player).basicAttackInterval * 0.28) * (
            player.basicCombo === 0 && this.hasNode(player, "balanced_grip") ? 0.72 : 1
          )
        : player.activeSkillId ? SKILL_DEFINITIONS[player.activeSkillId].recovery * player.skillRecoveryMultiplier : 0.16;
      player.action = this.action(current.kind, "recovery", duration, current.direction);
      return;
    }
    player.action = null;
    player.activeSkillId = null;
  }

  private startBasicAttack(player: PlayerState): void {
    if (!player.heroId) return;
    const stats = this.heroStats(player);
    player.cooldowns.basic = stats.basicAttackInterval;
    const empowered = player.riposteReady;
    player.basicDamageMultiplier = empowered ? 1.6 : 1;
    player.riposteReady = false;
    const windup = empowered ? 0.04 : clamp(stats.basicAttackInterval * 0.34, 0.08, 0.18);
    player.action = this.action("basic", "windup", windup, normalize(player.aim));
  }

  private resolvePlayerAction(player: PlayerState, action: ActionSnapshot): void {
    if (!player.heroId || action.kind === "enemy_attack") return;
    if (action.kind === "basic") {
      const direction = action.direction;
      action.direction = copy(direction);
      this.basicAttackImpact(player, direction);
      return;
    }
    if (!player.activeSkillId) return;
    this.resolveGreatswordSkill(player, player.activeSkillId, normalize(action.direction));
  }

  private basicAttackImpact(player: PlayerState, direction: Vec2): void {
    if (!player.heroId) return;
    const damage = this.heroStats(player).basicDamage;
    const finisher = player.weaponId === "greatsword" && player.basicCombo === 2;
    const finalDamage = damage * (finisher ? 1.45 : 1) * player.basicDamageMultiplier;
    const center = { x: player.position.x + direction.x * 3.2, z: player.position.z + direction.z * 3.2 };
    this.damageCircle(player, center, finisher ? 4.5 : 3.8, finalDamage);
    this.effect("slash", center, finisher ? 4.8 : 4, player.id, 0.35, null, this.directionYaw(direction));
    player.basicCombo = player.weaponId === "greatsword" ? ((player.basicCombo + 1) % 3) as 0 | 1 | 2 : 0;
    player.basicDamageMultiplier = 1;
  }

  private updateProjectiles(dt: number): void {
    for (const projectile of [...this.projectiles.values()]) {
      const rangedBasic = projectile.kind === "repeater" || projectile.kind === "ember";
      const splitbolt = projectile.kind === "splitbolt";
      const sweptProjectile = rangedBasic || splitbolt;
      const previous = copy(projectile.position);
      let expired = false;
      if (sweptProjectile) {
        const stepSeconds = Math.min(Math.max(0, projectile.remaining), dt);
        projectile.remaining = Math.max(0, projectile.remaining - dt);
        projectile.position.x += projectile.velocity.x * stepSeconds;
        projectile.position.z += projectile.velocity.z * stepSeconds;
        expired = projectile.remaining <= 0;
      } else {
        // Preserve established ability and demon projectile travel: they move a
        // full step, expire before collision, and sample only their new point.
        projectile.remaining -= dt;
        projectile.position.x += projectile.velocity.x * dt;
        projectile.position.z += projectile.velocity.z * dt;
        if (projectile.remaining <= 0) {
          this.projectiles.delete(projectile.id);
          continue;
        }
      }
      if (projectile.team !== "heroes") {
        if (expired) this.projectiles.delete(projectile.id);
        continue;
      }
      const owner = this.players.get(projectile.ownerId);
      if (!owner) {
        if (expired) this.projectiles.delete(projectile.id);
        continue;
      }
      const collisions: Array<{ enemy: EnemyState; progress: number }> = sweptProjectile
        ? [...this.enemies.values()]
            .filter((enemy) => !projectile.hitIds.has(enemy.id))
            .map((enemy) => ({
              enemy,
              progress: segmentHitProgress(
                previous,
                projectile.position,
                enemy.position,
                projectile.radius + enemy.radius,
              ),
            }))
            .filter((collision): collision is { enemy: EnemyState; progress: number } => collision.progress !== null)
            .sort((left, right) => left.progress - right.progress || left.enemy.id.localeCompare(right.enemy.id))
        : [...this.enemies.values()]
            .filter(
              (enemy) =>
                !projectile.hitIds.has(enemy.id) &&
                distance(projectile.position, enemy.position) <= projectile.radius + enemy.radius,
            )
            .map((enemy) => ({ enemy, progress: 0 }));
      const sweptHeartProgress = sweptProjectile && this.phase === "push" && this.riftHeart.active
        ? segmentHitProgress(
            previous,
            projectile.position,
            WORLD_LAYOUT.riftHeart,
            projectile.radius + 6,
          )
        : null;
      let rangedHeartHit = false;

      for (const { enemy, progress } of collisions) {
        if (
          sweptHeartProgress !== null &&
          sweptHeartProgress <= progress &&
          this.projectiles.has(projectile.id)
        ) {
          this.damageRiftHeart(projectile.damage);
          this.projectiles.delete(projectile.id);
          rangedHeartHit = true;
          break;
        }
        projectile.hitIds.add(enemy.id);
        let killed = false;
        if (rangedBasic) {
          this.damageEnemy(
            enemy,
            projectile.damage,
            owner,
            projectile.kind === "repeater" ? "repeater_impact" : "ember_impact",
            this.directionYaw(projectile.velocity),
          );
        } else if (splitbolt) {
          // Preserve the generic ability impact's presentation RNG draw while
          // using the quieter directional hit already established for Rift shots.
          this.random();
          this.damageEnemy(
            enemy,
            projectile.damage,
            owner,
            "repeater_impact",
            this.directionYaw(projectile.velocity),
          );
          killed = !this.enemies.has(enemy.id);
        } else {
          // Ability impacts retain their generic visual and RNG consumption.
          this.damageEnemy(enemy, projectile.damage, owner);
        }
        if (killed) this.forkSplitbolt(projectile, enemy.position);
        if (projectile.kind === "ember") {
          this.damageAshcallerBurst(enemy.position, projectile.damage, owner, enemy.id);
        }
        projectile.pierce -= 1;
        if (projectile.pierce <= 0) { this.projectiles.delete(projectile.id); break; }
      }
      if (
        sweptProjectile &&
        !rangedHeartHit &&
        sweptHeartProgress !== null &&
        this.projectiles.has(projectile.id)
      ) {
        this.damageRiftHeart(projectile.damage);
        this.projectiles.delete(projectile.id);
      } else if (
        !sweptProjectile &&
        this.phase === "push" &&
        this.riftHeart.active &&
        distance(projectile.position, WORLD_LAYOUT.riftHeart) <= projectile.radius + 6
      ) {
        // Preserve the established post-enemy endpoint check for abilities.
        this.damageRiftHeart(projectile.damage);
        this.projectiles.delete(projectile.id);
      }
      if (sweptProjectile && expired) this.projectiles.delete(projectile.id);
    }
  }

  private forkSplitbolt(seed: ProjectileState, origin: Vec2): void {
    if (
      seed.kind !== "splitbolt" ||
      seed.splitStage !== "seed" ||
      seed.splitTriggered
    ) return;
    seed.splitTriggered = true;
    const reservedIds = seed.reservedForkIds;
    if (!reservedIds) return;

    const direction = normalize(seed.velocity);
    const speed = length(seed.velocity);
    for (const [index, angle] of [-SPLITBOLT_FORK_ANGLE_RADIANS, SPLITBOLT_FORK_ANGLE_RADIANS].entries()) {
      const forkDirection = rotate(direction, angle);
      const fork: ProjectileState = {
        id: reservedIds[index]!,
        ownerId: seed.ownerId,
        team: seed.team,
        kind: "splitbolt",
        splitStage: "fork",
        position: copy(origin),
        velocity: { x: forkDirection.x * speed, z: forkDirection.z * speed },
        radius: SPLITBOLT_FORK_RADIUS,
        remaining: SPLITBOLT_LIFETIME_SECONDS,
        damage: seed.damage,
        pierce: SPLITBOLT_FORK_PIERCE,
        hitIds: new Set(seed.hitIds),
      };
      this.projectiles.set(fork.id, fork);
    }
  }

  private raiseWraithHost(player: PlayerState, rank: number): void {
    const count = wraithHostSummonCount(rank);
    const ownedWraiths = [...this.summons.values()].filter((summon) => summon.ownerId === player.id);
    const overflow = Math.max(0, ownedWraiths.length + count - WRAITH_HOST_MAX_ACTIVE_PER_OWNER);
    for (const summon of ownedWraiths.slice(0, overflow)) this.summons.delete(summon.id);
    for (let index = 0; index < count; index += 1) {
      const angle = (index / count) * Math.PI * 2;
      const summon: SummonState = {
        id: this.id("wraith"),
        ownerId: player.id,
        kind: "wraith",
        position: {
          x: player.position.x + Math.cos(angle) * 2.4,
          z: player.position.z + Math.sin(angle) * 2.4,
        },
        velocity: { x: 0, z: 0 },
        facing: copy(player.aim),
        radius: 0.72,
        remaining: 6 + rank * 1.25,
        targetId: null,
        damage: this.abilityMagnitude(player, "ability3", rank),
        speed: 14.5 + rank,
        strikeCooldown: index * 0.12,
        strikesRemaining: WRAITH_HOST_MAX_STRIKES_PER_SUMMON,
        orbitOffset: angle,
      };
      this.summons.set(summon.id, summon);
    }
  }

  private updateSummons(dt: number): void {
    for (const summon of [...this.summons.values()]) {
      summon.remaining -= dt;
      summon.strikeCooldown = Math.max(0, summon.strikeCooldown - dt);
      const owner = this.players.get(summon.ownerId);
      if (!owner || summon.remaining <= 0) {
        this.summons.delete(summon.id);
        continue;
      }

      let target = summon.targetId ? this.enemies.get(summon.targetId) : undefined;
      if (!target || distance(summon.position, target.position) > 34) {
        target = this.closestEnemy(summon.position, 30) ?? undefined;
        summon.targetId = target?.id ?? null;
      }

      const riftTarget = !target && this.phase === "push" && this.riftHeart.active;
      const orbitAngle = this.totalTime * 1.7 + summon.orbitOffset;
      const engagementDirection = { x: Math.cos(summon.orbitOffset), z: Math.sin(summon.orbitOffset) };
      const targetPosition = target?.position
        ? {
          x: target.position.x + engagementDirection.x * (target.radius + 0.9),
          z: target.position.z + engagementDirection.z * (target.radius + 0.9),
        }
        : (riftTarget
          ? {
            x: WORLD_LAYOUT.riftHeart.x + engagementDirection.x * 5.7,
            z: WORLD_LAYOUT.riftHeart.z + engagementDirection.z * 5.7,
          }
          : { x: owner.position.x + Math.cos(orbitAngle) * 3.2, z: owner.position.z + Math.sin(orbitAngle) * 3.2 });
      const toTarget = { x: targetPosition.x - summon.position.x, z: targetPosition.z - summon.position.z };
      const direction = normalize(toTarget);
      summon.facing = direction;
      const strikeRange = target || riftTarget ? 0.52 : 0.65;

      if (distance(summon.position, targetPosition) > strikeRange) {
        const step = Math.min(length(toTarget), summon.speed * dt);
        summon.velocity = { x: direction.x * summon.speed, z: direction.z * summon.speed };
        summon.position.x += direction.x * step;
        summon.position.z += direction.z * step;
      } else {
        summon.velocity = { x: 0, z: 0 };
        if (summon.strikeCooldown <= 0) {
          summon.strikeCooldown = 0.72;
          if (target) {
            this.damageEnemy(target, summon.damage, owner, "impact", undefined, summon.id);
            if (!this.enemies.has(target.id)) summon.targetId = null;
          } else if (riftTarget) {
            this.damageRiftHeart(summon.damage, summon.id);
          } else {
            // Preserve the established idle-orbit effect draw and ID without
            // rendering a false contact or spending a strike.
            this.effect("souls", summon.position, 1.8, owner.id, 0.22, null, undefined, summon.id);
            continue;
          }
          this.effect("wraith_impact", summon.position, 1.2, owner.id, 0.16, null, undefined, summon.id);
          summon.strikesRemaining -= 1;
          if (summon.strikesRemaining <= 0) this.summons.delete(summon.id);
        }
      }
    }
  }

  private updateEnemies(dt: number): void {
    for (const enemy of [...this.enemies.values()]) {
      enemy.slowFor = Math.max(0, enemy.slowFor - dt);
      enemy.staggerFor = Math.max(0, enemy.staggerFor - dt);
      enemy.exposedFor = Math.max(0, enemy.exposedFor - dt);
      enemy.slowed = enemy.slowFor > 0;
      if (enemy.staggerFor > 0) {
        enemy.velocity = { x: 0, z: 0 };
        continue;
      }
      if (enemy.action) {
        enemy.velocity = { x: 0, z: 0 };
        this.updateEnemyAction(enemy, dt);
        continue;
      }
      let targetPosition: Vec2;
      let damageTargetPosition: Vec2;
      const targetPlayer = this.closestLivingPlayer(enemy.position, 9);
      if (targetPlayer) {
        enemy.targetKind = "player";
        enemy.targetId = targetPlayer.id;
        damageTargetPosition = targetPlayer.position;
        targetPosition = this.playerEngagementPoint(enemy, targetPlayer.position);
      } else if (this.phase !== "push" && !this.gates.get(enemy.lane)!.breached) {
        enemy.targetKind = "gate";
        enemy.targetId = enemy.lane;
        damageTargetPosition = WORLD_LAYOUT.gates[enemy.lane];
        targetPosition = this.gateEngagementPoint(enemy, enemy.lane);
      } else {
        enemy.targetKind = this.phase === "push" ? "advance" : "nexus";
        enemy.targetId = null;
        damageTargetPosition = WORLD_LAYOUT.nexus;
        targetPosition = this.nexusEngagementPoint(enemy);
      }
      const direction = normalize({ x: targetPosition.x - enemy.position.x, z: targetPosition.z - enemy.position.z });
      const separation = this.enemySeparation(enemy);
      const steering = normalize({ x: direction.x + separation.x * 0.82, z: direction.z + separation.z * 0.82 });
      enemy.facing = steering;
      const attackRange = targetPlayer ? 0.52 : 0.72;
      if (distance(enemy.position, targetPosition) > attackRange) {
        const speed = enemy.speed * (enemy.slowed ? 0.5 : 1);
        enemy.velocity = { x: steering.x * speed, z: steering.z * speed };
        enemy.position.x += enemy.velocity.x * dt; enemy.position.z += enemy.velocity.z * dt;
      } else {
        enemy.velocity = { x: 0, z: 0 };
        enemy.attackTargetKind = targetPlayer ? "player" : enemy.targetKind === "gate" ? "gate" : "nexus";
        enemy.attackTargetId = targetPlayer?.id ?? (enemy.targetKind === "gate" ? enemy.lane : null);
        enemy.attackTargetPosition = copy(targetPosition);
        const attackDirection = normalize({ x: damageTargetPosition.x - enemy.position.x, z: damageTargetPosition.z - enemy.position.z });
        enemy.facing = attackDirection;
        enemy.action = this.action("enemy_attack", "windup", ENEMY_WINDUPS[enemy.kind], attackDirection);
      }
    }
  }

  private updateEnemyAction(enemy: EnemyState, dt: number): void {
    const current = enemy.action;
    if (!current) return;
    current.remaining -= dt;
    if (current.remaining > 0) return;
    if (current.phase === "windup") {
      this.resolveEnemyAttack(enemy);
      enemy.action = this.action("enemy_attack", "active", 0.1, current.direction);
      return;
    }
    if (current.phase === "active") {
      enemy.action = this.action("enemy_attack", "recovery", enemy.attackCooldown, current.direction);
      return;
    }
    enemy.action = null;
    enemy.attackTargetKind = null;
    enemy.attackTargetId = null;
    enemy.attackTargetPosition = null;
  }

  private resolveEnemyAttack(enemy: EnemyState): void {
    if (enemy.attackTargetKind === "player" && enemy.attackTargetId) {
      const target = this.players.get(enemy.attackTargetId);
      if (target && target.downedFor <= 0 && distance(enemy.position, target.position) <= enemy.radius + 3.75) this.damagePlayer(target, enemy.damage, enemy);
      return;
    }
    if (enemy.attackTargetKind === "gate" && enemy.attackTargetId) {
      const lane = enemy.attackTargetId as LaneId;
      if (enemy.attackTargetPosition && distance(enemy.position, enemy.attackTargetPosition) <= enemy.radius + 1.5) this.damageGate(lane, enemy.damage);
      return;
    }
    if (enemy.attackTargetKind === "nexus" && enemy.attackTargetPosition && distance(enemy.position, enemy.attackTargetPosition) <= enemy.radius + 1.5) {
      this.damageNexus(enemy.damage);
    }
  }

  private updateDirector(dt: number): void {
    if (this.phase === "defense") {
      const wave = Math.min(this.timings.waveCount, Math.floor((this.elapsed / this.timings.defenseDuration) * this.timings.waveCount) + 1);
      if (wave !== this.currentWave) {
        this.currentWave = wave;
        this.pressureLane = this.activeLanes[0] ?? "north";
        const fronts = this.activeLanes.map((lane) => lane.toUpperCase()).join(" / ");
        this.emit("wave", `Wave ${wave}: ${fronts} ${this.activeLanes.length === 1 ? "lane is" : "lanes are"} under attack.`, {
          lane: this.pressureLane,
        });
      }
      this.spawnTimer -= dt;
      const interval = Math.max(0.2, 0.72 - wave * 0.07) / 1.03;
      if (this.spawnTimer <= 0) {
        this.spawnTimer = interval;
        // Keep the wave batch atomic so the global safety cap can never favor
        // earlier lanes in LANE_IDS when all four fronts are saturated.
        if (this.enemies.size + this.activeLanes.length <= this.enemyCap) {
          for (const lane of this.activeLanes) this.spawnEnemy(lane, this.rollEnemyKind(wave));
        }
      }
      if (this.elapsed >= this.timings.defenseDuration) this.setPhase("breach");
    } else if (this.phase === "breach") {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) { this.spawnTimer = 0.65; this.spawnEnemy("north", this.random() < 0.25 ? "brute" : "imp", { x: (this.random() - 0.5) * 16, z: -48 }); }
      const minimumPressure = Math.min(8, this.timings.breachDuration * 0.25);
      if (this.elapsed >= minimumPressure && (!this.gatebreakerId || !this.enemies.has(this.gatebreakerId))) this.setPhase("push");
    } else if (this.phase === "push") {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawnTimer = 3.4;
        this.spawnEnemy("north", "rift_guard", {
          x: (this.random() - 0.5) * 24,
          z: WORLD_LAYOUT.riftHeart.z + 12 + this.random() * 34,
        });
      }
      if (this.elapsed >= this.timings.pushDuration) this.setPhase("defeat");
    }
  }

  private setPhase(phase: GamePhase): void {
    if (this.phase === phase) return;
    this.phase = phase;
    this.elapsed = 0;
    this.spawnTimer = 0;
    if (phase === "arming") {
      this.emit("phase", "ARM THE DEFENDERS: forge a Greatsword at the physical Arsenal.", { position: ARSENAL_POSITION });
    }
    if (phase === "defense") {
      const laneCount = this.activeLanes.length;
      this.emit("phase", `Hold ${laneCount === 1 ? "the open lane" : `all ${laneCount} open lanes`}. The Heartfire Nexus must survive.`, {});
    }
    if (phase === "breach") {
      this.pressureLane = "north";
      const gate = this.gates.get("north")!; gate.hp = 0; gate.breached = true;
      this.emit("gate_breached", "The NORTH GATE has fallen! Protect the Nexus.", { lane: "north", position: WORLD_LAYOUT.gates.north });
      this.reserveEnemySlots(1);
      this.gatebreakerId = this.spawnEnemy("north", "siege", { x: 0, z: -52 });
      for (let index = 0; index < 8; index++) this.spawnEnemy("north", index % 3 === 0 ? "brute" : "imp", { x: (this.random() - 0.5) * 18, z: -45 - this.random() * 12 });
      this.emit("phase", "BREACH: kill the Gatebreaker and survive the inner-city rush.", {});
    }
    if (phase === "push") {
      this.pressureLane = "north";
      this.gatebreakerId = null;
      this.nexus.shielded = true;
      this.riftHeart.active = true;
      this.enemies.clear();
      this.projectiles.clear();
      this.emit("rift_exposed", "The Nexus barrier holds. Push north and destroy the Rift Heart!", { position: WORLD_LAYOUT.riftHeart });
      this.emit("phase", "COUNTERATTACK: destroy the source before the barrier expires.", {});
    }
    if (phase === "victory") {
      this.riftHeart.active = false;
      this.enemies.clear();
      this.projectiles.clear();
      this.clearCinderWalls();
      this.emit("victory", "RIFT HEART DESTROYED — humanity survives the night.", { position: WORLD_LAYOUT.riftHeart });
    }
    if (phase === "defeat") {
      this.projectiles.clear();
      this.clearCinderWalls();
      this.emit("defeat", this.nexus.hp <= 0 ? "The Heartfire Nexus has fallen." : "The Nexus barrier collapsed before the Rift Heart fell.", {});
    }
  }

  private spawnEnemy(lane: LaneId, kind: EnemyKind, forcedPosition?: Vec2): string | null {
    if (this.enemies.size >= this.enemyCap) return null;
    const base = ENEMY_STATS[kind];
    const healthScale = 1 + Math.max(0, this.currentWave - 1) * 0.07;
    const position = forcedPosition ? copy(forcedPosition) : copy(WORLD_LAYOUT.spawns[lane]);
    if (!forcedPosition) {
      if (lane === "north" || lane === "south") position.x += (this.random() - 0.5) * 22;
      else position.z += (this.random() - 0.5) * 22;
    }
    const hp = Math.round(base.hp * healthScale);
    const id = this.id("enemy");
    const enemy: EnemyState = {
      id, kind, lane, position, velocity: { x: 0, z: 0 }, hp, maxHp: hp,
      facing: normalize({ x: WORLD_LAYOUT.gates[lane].x - position.x, z: WORLD_LAYOUT.gates[lane].z - position.z }),
      radius: base.radius, elite: kind === "siege" || kind === "brute", targetKind: "gate", targetId: lane,
      slowed: false, action: null, damage: base.damage, speed: base.speed, attackCooldown: base.attackCooldown,
      xp: base.xp, gold: base.gold, slowFor: 0, attackTargetKind: null, attackTargetId: null, attackTargetPosition: null,
      engagementAngle: this.stableAngle(id),
      engagementBias: this.stableUnit(id, 53),
      engagementArc: this.stableUnit(id, 91),
      staggerFor: 0,
      exposedFor: 0,
    };
    this.enemies.set(enemy.id, enemy);
    this.spawned += 1;
    return enemy.id;
  }

  private reserveEnemySlots(count: number): void {
    while (this.enemies.size + count > this.enemyCap) {
      const oldestEnemyId = this.enemies.keys().next().value as string | undefined;
      if (!oldestEnemyId) return;
      this.enemies.delete(oldestEnemyId);
    }
  }

  private rollEnemyKind(wave: number): EnemyKind {
    const roll = this.random();
    if (wave >= 4 && roll < 0.11) return "brute";
    if (wave >= 2 && roll < 0.36) return "hound";
    return "imp";
  }

  private fireProjectile(
    player: PlayerState,
    kind: ProjectileKind,
    direction: Vec2,
    damage: number,
    speed: number,
    pierce: number,
    radius = 0.45,
    lifetime = kind === "death_tide" ? 4 : 2.2,
    splitStage?: SplitboltStage,
  ): ProjectileState {
    const normalized = normalize(direction);
    const projectile: ProjectileState = {
      id: this.id("projectile"), ownerId: player.id, team: "heroes", kind,
      position: { x: player.position.x + normalized.x * 1.7, z: player.position.z + normalized.z * 1.7 },
      velocity: { x: normalized.x * speed, z: normalized.z * speed }, radius, remaining: lifetime,
      damage, pierce, hitIds: new Set(),
      ...(splitStage ? { splitStage } : {}),
      ...(splitStage === "seed" ? { splitTriggered: false } : {}),
    };
    this.projectiles.set(projectile.id, projectile);
    return projectile;
  }

  private action(kind: ActionSnapshot["kind"], phase: ActionSnapshot["phase"], duration: number, direction: Vec2): ActionSnapshot {
    return { kind, phase, remaining: duration, duration, direction: copy(normalize(direction)) };
  }

  private copyAction(action: ActionSnapshot): ActionSnapshot {
    return { ...action, direction: copy(action.direction) };
  }

  private heroStats(player: PlayerState): HeroStatsSnapshot {
    return deriveHeroStats(player.heroId, player.level, player.equipment, player.weaponId);
  }

  private abilityMagnitude(
    player: PlayerState,
    slot: AbilitySlot,
    rank: number,
    metricId: AbilityImpactMetricId = "primary",
  ): number {
    if (!player.heroId) return 0;
    const metric = ABILITY_IMPACT_DEFINITIONS[player.heroId][slot][metricId];
    if (!metric) return 0;
    return scaleAbilityMagnitude(metric.base, rank, this.heroStats(player).abilityPower);
  }

  private rankRadius(base: number, rank: number): number {
    return base * (1 + Math.max(0, rank - 1) * 0.08);
  }

  private directionYaw(direction: Vec2): number {
    return Math.atan2(-direction.z, direction.x);
  }

  private damageLine(player: PlayerState, origin: Vec2, direction: Vec2, reach: number, width: number, damage: number): number {
    const facing = normalize(direction);
    let hits = 0;
    for (const enemy of [...this.enemies.values()]) {
      const relative = { x: enemy.position.x - origin.x, z: enemy.position.z - origin.z };
      const projected = clamp(relative.x * facing.x + relative.z * facing.z, 0, reach);
      const nearest = { x: origin.x + facing.x * projected, z: origin.z + facing.z * projected };
      if (distance(enemy.position, nearest) > width + enemy.radius) continue;
      hits += 1;
      this.damageEnemy(enemy, damage, player);
    }
    if (this.phase === "push") {
      const heartRelative = { x: WORLD_LAYOUT.riftHeart.x - origin.x, z: WORLD_LAYOUT.riftHeart.z - origin.z };
      const projected = clamp(heartRelative.x * facing.x + heartRelative.z * facing.z, 0, reach);
      const nearest = { x: origin.x + facing.x * projected, z: origin.z + facing.z * projected };
      if (distance(WORLD_LAYOUT.riftHeart, nearest) <= width + 6) this.damageRiftHeart(damage, null, player);
    }
    return hits;
  }

  private damageCircle(player: PlayerState, center: Vec2, radius: number, damage: number, slowFor = 0, alreadyHit = new Set<string>()): number {
    let hits = 0;
    for (const enemy of [...this.enemies.values()]) {
      if (alreadyHit.has(enemy.id) || distance(center, enemy.position) > radius + enemy.radius) continue;
      alreadyHit.add(enemy.id); hits += 1; enemy.slowFor = Math.max(enemy.slowFor, slowFor);
      this.damageEnemy(enemy, damage, player);
    }
    if (this.phase === "push" && distance(center, WORLD_LAYOUT.riftHeart) <= radius + 6) this.damageRiftHeart(damage, null, player);
    return hits;
  }

  private damageAshcallerBurst(
    center: Vec2,
    basicDamage: number,
    source: PlayerState,
    directTargetId: string,
  ): void {
    for (const enemy of [...this.enemies.values()]) {
      if (
        enemy.id === directTargetId ||
        distance(center, enemy.position) > ASHCALLER_BASIC_BURST_RADIUS + enemy.radius
      ) continue;
      this.damageEnemy(
        enemy,
        basicDamage * ASHCALLER_BASIC_BURST_DAMAGE_RATIO,
        source,
        null,
      );
    }
  }

  private telemetrySkill(player: PlayerState): SkillId | "greatsword_basic" | "practice_basic" {
    return player.telemetryActionOverride ?? player.activeSkillId ?? (player.weaponId === "greatsword" ? "greatsword_basic" : "practice_basic");
  }

  private recordTelemetry(
    source: PlayerState,
    skillId: SkillId | "greatsword_basic" | "practice_basic",
    targetId: string,
    targetClass: AuthoritativeTelemetryEvent["targetClass"],
    outcome: AuthoritativeTelemetryEvent["outcome"],
    magnitude?: number,
    duration?: number,
  ): void {
    if (!this.telemetry) return;
    this.telemetry({
      at: this.totalTime,
      sourcePlayerId: source.id,
      actionId: skillId,
      targetId,
      targetClass,
      outcome,
      ...(magnitude === undefined ? {} : { magnitude }),
      ...(duration === undefined ? {} : { duration }),
    });
  }

  private damageEnemy(
    enemy: EnemyState,
    baseDamage: number,
    source: PlayerState,
    impactKind: EffectKind | null = "impact",
    impactRotation?: number,
    sourceSummonId: string | null = null,
  ): void {
    const exposedMultiplier = enemy.exposedFor > 0 ? 1.15 : 1;
    const resolvedDamage = Math.min(Math.max(0, enemy.hp), Math.max(0, baseDamage * exposedMultiplier));
    enemy.hp -= resolvedDamage;
    this.recordTelemetry(
      source,
      this.telemetrySkill(source),
      enemy.id,
      enemy.elite ? "elite" : "normal",
      "damage",
      resolvedDamage,
    );
    if (impactKind) {
      this.effect(
        impactKind,
        enemy.position,
        Math.max(1.2, enemy.radius * 1.5),
        source.id,
        0.16,
        null,
        impactRotation ?? this.random() * Math.PI * 2,
        sourceSummonId,
      );
    }
    if (enemy.hp <= 0) this.killEnemy(enemy, source);
  }

  private killEnemy(enemy: EnemyState, source: PlayerState): void {
    if (!this.enemies.delete(enemy.id)) return;
    source.kills += 1;
    const goldShareUnits = goldRewardShareUnits(enemy.gold, this.players.size);
    for (const player of this.players.values()) player.goldUnits += goldShareUnits;
    for (const player of this.players.values()) this.grantExperience(player.id, enemy.xp);
    const pickup: PickupState = { id: this.id("pickup"), kind: enemy.elite ? "rift_shard" : "gold", position: copy(enemy.position), value: enemy.gold, remaining: 6 };
    this.pickups.set(pickup.id, pickup);
  }

  private damageGate(lane: LaneId, amount: number): void {
    const gate = this.gates.get(lane)!;
    if (gate.breached) return;
    gate.hp = Math.max(0, gate.hp - amount);
    this.effect("gate_hit", WORLD_LAYOUT.gates[lane], 4, null, 0.25, lane);
    if (gate.hp <= 0) {
      gate.breached = true;
      this.emit("gate_breached", `The ${lane.toUpperCase()} GATE has fallen!`, { lane, position: WORLD_LAYOUT.gates[lane] });
    }
  }

  private damagePlayer(player: PlayerState, amount: number, source?: EnemyState): void {
    if (player.invulnerableFor > 0 || player.downedFor > 0) return;
    const incoming = source
      ? normalize({ x: source.position.x - player.position.x, z: source.position.z - player.position.z })
      : { x: 0, z: 0 };
    const frontal = !!source && incoming.x * player.guardDirection.x + incoming.z * player.guardDirection.z >= 0.35;
    let resolvedAmount = amount;
    if (player.guardRemaining > 0 && frontal) {
      resolvedAmount *= 0.28;
      if (this.mutationActive(player, "riposte", "guard")) player.riposteReady = true;
      if (this.hasNode(player, "countercharge")) player.counterchargeReady = true;
    }
    if (player.counterRemaining > 0 && frontal && source) {
      player.counterRemaining = 0;
      player.telemetryActionOverride = "counterstrike";
      this.damageEnemy(source, SKILL_DEFINITIONS.counterstrike.damage * this.heroStats(player).abilityPower, player);
      player.telemetryActionOverride = null;
      source.staggerFor = Math.max(source.staggerFor, source.elite ? 0.45 : 0.9);
      this.recordTelemetry(player, "counterstrike", source.id, source.elite ? "elite" : "normal", "stagger", 1, source.staggerFor);
    }
    if (player.unbreakableRemaining > 0 && player.unbreakableResponses > 0 && source) {
      resolvedAmount *= 0.4;
      player.unbreakableResponses -= 1;
      player.telemetryActionOverride = "unbreakable";
      this.damageCircle(player, player.position, SKILL_DEFINITIONS.unbreakable.radius, SKILL_DEFINITIONS.unbreakable.damage * this.heroStats(player).abilityPower);
      player.telemetryActionOverride = null;
      if (player.unbreakableResponses === 0) player.unbreakableRemaining = 0;
    }
    const absorbed = Math.min(player.barrier, resolvedAmount);
    player.barrier -= absorbed;
    player.hp -= resolvedAmount - absorbed;
    if (player.hp <= 0) {
      player.hp = 0; player.downedFor = 5; player.attacking = false; player.action = null;
      this.emit("player_downed", `${player.name} was overwhelmed.`, { playerId: player.id, position: player.position });
    }
  }

  private updatePickups(dt: number): void {
    for (const pickup of [...this.pickups.values()]) {
      pickup.remaining -= dt;
      if (pickup.remaining <= 0) { this.pickups.delete(pickup.id); continue; }
      // Gold and Rift Shards are shared reward feedback, not stealable
      // transactions. Only restorative pickups are consumed by proximity.
      if (pickup.kind !== "heal") continue;
      const player = this.closestLivingPlayer(pickup.position, 4.5);
      if (!player) continue;
      player.hp = Math.min(this.heroStats(player).maxHp, player.hp + pickup.value);
      this.pickups.delete(pickup.id);
    }
  }

  private updateDelayed(): void {
    for (const strike of [...this.delayed]) {
      if (strike.at > this.totalTime) continue;
      const player = this.players.get(strike.ownerId);
      if (player) { this.damageCircle(player, strike.position, strike.radius, strike.damage); this.effect(strike.kind, strike.position, strike.radius, player.id, 0.8); }
      this.delayed.splice(this.delayed.indexOf(strike), 1);
    }
  }

  private createCinderWall(player: PlayerState, direction: Vec2, rank: number): void {
    const facing = normalize(direction);
    const { start, end } = cinderWallEndpoints(player.position, facing);
    const halfWidth = cinderWallHalfWidth(rank);
    const midpoint = {
      x: (start.x + end.x) * 0.5,
      z: (start.z + end.z) * 0.5,
    };

    // The old five-ring cast consumed five presentation RNG draws and five
    // effect IDs. Retain that presentation cadence to minimize unrelated seed
    // drift even though persistent contacts can still change later gameplay.
    this.random();
    const visible = this.effect(
      "cinder_wall",
      midpoint,
      halfWidth,
      player.id,
      CINDER_WALL_DURATION_SECONDS,
      null,
      this.directionYaw(facing),
    );
    for (let step = 2; step <= 5; step += 1) {
      const point = {
        x: player.position.x + facing.x * step * CINDER_WALL_START_DISTANCE,
        z: player.position.z + facing.z * step * CINDER_WALL_START_DISTANCE,
      };
      this.effect("cinder_wall_companion", point, halfWidth, player.id, 1);
    }

    const wall: CinderWallState = {
      id: visible.id,
      ownerId: player.id,
      start,
      end,
      halfWidth,
      remaining: visible.remaining,
      damage: this.abilityMagnitude(player, "ability2", rank),
      slowSeconds: CINDER_WALL_SLOW_SECONDS,
      hitIds: new Set<string>(),
      riftHeartHit: false,
    };
    this.cinderWalls.set(visible.id, wall);
    this.applyCinderWallContacts(wall, player);
  }

  private updateCinderWalls(): void {
    for (const wall of [...this.cinderWalls.values()]) {
      const visual = this.effects.get(wall.id);
      if (!visual) {
        this.cinderWalls.delete(wall.id);
        continue;
      }
      wall.remaining = visual.remaining;
      const owner = this.players.get(wall.ownerId);
      if (!owner) {
        this.effects.delete(wall.id);
        this.cinderWalls.delete(wall.id);
        continue;
      }

      this.applyCinderWallContacts(wall, owner);
    }
  }

  private clearCinderWalls(): void {
    for (const [id, effect] of this.effects) {
      if (effect.kind === "cinder_wall" || effect.kind === "cinder_wall_companion") {
        this.effects.delete(id);
      }
    }
    this.cinderWalls.clear();
  }

  private applyCinderWallContacts(wall: CinderWallState, owner: PlayerState): void {
    for (const enemy of [...this.enemies.values()]) {
      if (
        wall.hitIds.has(enemy.id) ||
        !cinderWallContainsPoint(
          wall.start,
          wall.end,
          enemy.position,
          wall.halfWidth + enemy.radius,
        )
      ) continue;
      wall.hitIds.add(enemy.id);
      enemy.slowFor = Math.max(enemy.slowFor, wall.slowSeconds);
      this.damageEnemy(enemy, wall.damage, owner);
    }

    if (
      !wall.riftHeartHit &&
      this.phase === "push" &&
      this.riftHeart.active &&
      cinderWallContainsPoint(
        wall.start,
        wall.end,
        WORLD_LAYOUT.riftHeart,
        wall.halfWidth + 6,
      )
    ) {
      wall.riftHeartHit = true;
      this.damageRiftHeart(wall.damage);
    }
  }

  private updateTransient(dt: number): void {
    for (const effect of [...this.effects.values()]) { effect.remaining -= dt; if (effect.remaining <= 0) this.effects.delete(effect.id); }
    this.recentEvents = this.recentEvents.filter((event) => this.totalTime - event.at <= 10);
  }

  private closestLivingPlayer(position: Vec2, range: number): PlayerState | null {
    let found: PlayerState | null = null;
    let best = range;
    for (const player of this.players.values()) {
      if (player.downedFor > 0) continue;
      const value = distance(position, player.position);
      if (value < best) { best = value; found = player; }
    }
    return found;
  }

  private closestEnemy(position: Vec2, range: number): EnemyState | null {
    let found: EnemyState | null = null;
    let best = range;
    for (const enemy of this.enemies.values()) {
      const value = distance(position, enemy.position);
      if (value < best) {
        best = value;
        found = enemy;
      }
    }
    return found;
  }

  private playerEngagementPoint(enemy: EnemyState, position: Vec2): Vec2 {
    const radius = 2.5 + enemy.radius * 0.65 + enemy.engagementBias * 0.75;
    return {
      x: position.x + Math.cos(enemy.engagementAngle) * radius,
      z: position.z + Math.sin(enemy.engagementAngle) * radius,
    };
  }

  private gateEngagementPoint(enemy: EnemyState, lane: LaneId): Vec2 {
    const gate = WORLD_LAYOUT.gates[lane];
    const tangentOffset = (enemy.engagementBias * 2 - 1) * 6.2;
    const rowOffset = enemy.engagementArc < 0.55 ? 0 : 3.2;
    if (lane === "north") return { x: gate.x + tangentOffset, z: gate.z - rowOffset };
    if (lane === "south") return { x: gate.x + tangentOffset, z: gate.z + rowOffset };
    if (lane === "east") return { x: gate.x + rowOffset, z: gate.z + tangentOffset };
    return { x: gate.x - rowOffset, z: gate.z + tangentOffset };
  }

  private nexusEngagementPoint(enemy: EnemyState): Vec2 {
    const baseAngles: Record<LaneId, number> = {
      north: -Math.PI / 2,
      east: 0,
      south: Math.PI / 2,
      west: Math.PI,
    };
    const ring = Math.min(2, Math.floor(enemy.engagementBias * 3));
    const radius = 6.55 + ring * 2.1 + enemy.radius * 0.2;
    const angle = baseAngles[enemy.lane] + (enemy.engagementArc * 2 - 1) * 1.2;
    return {
      x: WORLD_LAYOUT.nexus.x + Math.cos(angle) * radius,
      z: WORLD_LAYOUT.nexus.z + Math.sin(angle) * radius,
    };
  }

  private enemySeparation(enemy: EnemyState): Vec2 {
    let x = 0;
    let z = 0;
    for (const other of this.enemies.values()) {
      if (other.id === enemy.id) continue;
      const dx = enemy.position.x - other.position.x;
      const dz = enemy.position.z - other.position.z;
      const currentDistance = Math.hypot(dx, dz);
      const desiredDistance = enemy.radius + other.radius + 0.5;
      if (currentDistance >= desiredDistance) continue;
      const strength = (desiredDistance - currentDistance) / desiredDistance;
      if (currentDistance > 0.001) {
        x += (dx / currentDistance) * strength;
        z += (dz / currentDistance) * strength;
      } else {
        x += Math.cos(enemy.engagementAngle) * strength;
        z += Math.sin(enemy.engagementAngle) * strength;
      }
    }
    const magnitude = Math.hypot(x, z);
    return magnitude > 1 ? { x: x / magnitude, z: z / magnitude } : { x, z };
  }

  private stableUnit(id: string, salt: number): number {
    const numericSuffix = Number(id.slice(id.lastIndexOf("-") + 1));
    let hash = Number.isFinite(numericSuffix)
      ? (numericSuffix + Math.imul(salt, 0x9e3779b9)) >>> 0
      : (2166136261 ^ salt) >>> 0;
    if (!Number.isFinite(numericSuffix)) {
      for (let index = 0; index < id.length; index += 1) {
        hash ^= id.charCodeAt(index);
        hash = Math.imul(hash, 16777619) >>> 0;
      }
    }
    hash ^= hash >>> 16;
    hash = Math.imul(hash, 0x7feb352d) >>> 0;
    hash ^= hash >>> 15;
    hash = Math.imul(hash, 0x846ca68b) >>> 0;
    hash ^= hash >>> 16;
    return (hash >>> 0) / 0xffffffff;
  }

  private stableAngle(id: string): number {
    const numericSuffix = Number(id.slice(id.lastIndexOf("-") + 1));
    const sequence = Number.isFinite(numericSuffix) ? numericSuffix : Math.floor(this.stableUnit(id, 17) * 10_000);
    return (sequence * 2.399963229728653) % (Math.PI * 2);
  }

  private clampPlayer(player: PlayerState): void {
    const extent = WORLD_LAYOUT.defenseHalfExtent;
    player.position.x = clamp(player.position.x, this.phase === "push" ? -WORLD_LAYOUT.pushHalfWidth : -extent, this.phase === "push" ? WORLD_LAYOUT.pushHalfWidth : extent);
    player.position.z = clamp(player.position.z, this.phase === "push" ? WORLD_LAYOUT.pushNorthZ - 8 : -extent, extent);
  }

  private canAct(player: PlayerState | undefined): player is PlayerState {
    return !!player && player.downedFor <= 0 && (this.phase === "arming" || this.phase === "defense" || this.phase === "breach" || this.phase === "push");
  }

  private playerSnapshot(player: PlayerState): PlayerSnapshot {
    const stats = this.heroStats(player);
    const allocation = player.weaponId === "greatsword" ? this.allocation(player, "greatsword") : null;
    const loadoutMutationContext = this.atArsenal(player)
      ? "arsenal"
      : player.loadoutEditRemaining > 0
        ? "level_up"
        : "none";
    const nodeAvailability = allocation
      ? GREATSWORD_MASTERY_NODES.map((node) => [node.id, deriveMasteryNodeAvailability(node.id, allocation.spentNodeIds, player.level)] as const)
      : [];
    return {
      id: player.id, name: player.name, connected: player.connected, heroId: player.heroId, ready: player.ready, position: copy(player.position),
      identity: "defender", accentId: `defender-${[...this.players.keys()].indexOf(player.id) + 1}`,
      weaponId: player.weaponId,
      mastery: allocation ? {
        weaponId: "greatsword",
        revision: allocation.revision,
        pointBudget: player.level,
        learnedNodeIds: [...allocation.spentNodeIds],
        legalNodeIds: nodeAvailability.filter(([, availability]) => availability.state === "legal").map(([nodeId]) => nodeId),
        excludedNodeIds: nodeAvailability.filter(([, availability]) => availability.state === "excluded").map(([nodeId]) => nodeId),
        unavailableNodeReasons: Object.fromEntries(nodeAvailability.flatMap(([nodeId, availability]) =>
          availability.state === "locked" || availability.state === "excluded" ? [[nodeId, availability.reason]] : []
        )),
        equipped: { ...allocation.loadout },
        loadoutMutationContext,
        freeRespecUsed: allocation.freeRespecUsed,
      } : null,
      cooldownsBySkillId: { ...player.cooldownsBySkillId },
      basicCombo: player.basicCombo,
      dodge: {
        charges: player.dodgeCharges,
        maxCharges: 1,
        rechargeRemaining: player.dodgeRechargeRemaining,
        rechargeDuration: 6,
        invulnerable: player.dodgeInvulnerableRemaining > 0,
      },
      velocity: copy(player.velocity), aim: copy(player.aim), hp: player.hp, maxHp: stats.maxHp, stats, barrier: player.barrier,
      maxBarrier: player.maxBarrier, level: player.level, xp: player.xp, nextLevelXp: this.nextLevelXp(player.level), gold: goldFromUnits(player.goldUnits),
      equipment: [...player.equipment] as EquipmentSlots, kills: player.kills, abilityRanks: { ...player.abilityRanks }, skillPoints: player.skillPoints,
      action: player.action ? this.copyAction(player.action) : null, downed: player.downedFor > 0,
      invulnerable: player.invulnerableFor > 0, cooldowns: { ...player.cooldowns }, lastInputSeq: player.lastInputSeq,
    };
  }

  private enemySnapshot(enemy: EnemyState): EnemySnapshot {
    return {
      id: enemy.id,
      kind: enemy.kind,
      lane: enemy.lane,
      position: copy(enemy.position),
      velocity: copy(enemy.velocity),
      facing: copy(enemy.facing),
      hp: enemy.hp,
      maxHp: enemy.maxHp,
      radius: enemy.radius,
      elite: enemy.elite,
      targetKind: enemy.targetKind,
      targetId: enemy.targetId,
      slowed: enemy.slowed,
      action: enemy.action ? this.copyAction(enemy.action) : null,
    };
  }

  private phaseDuration(): number | null {
    if (this.phase === "arming") return 2.5;
    if (this.phase === "defense") return this.timings.defenseDuration;
    if (this.phase === "breach") return this.timings.breachDuration;
    if (this.phase === "push") return this.timings.pushDuration;
    return null;
  }

  private objective(): string {
    if (this.phase === "lobby") return "Ready the Citadel Defenders.";
    if (this.phase === "arming") {
      const waiting = [...this.players.values()].filter((player) => player.connected && player.weaponId !== "greatsword").length;
      return waiting > 0 ? `Arm the Defenders — waiting for ${waiting}.` : `Greatswords forged — battle begins in ${Math.max(0, Math.ceil(2.5 - this.elapsed))}.`;
    }
    if (this.phase === "defense") {
      const fronts = this.activeLanes.map((lane) => lane.toUpperCase()).join(" / ");
      return `Defend ${fronts} — wave ${this.currentWave || 1}/${this.timings.waveCount}.`;
    }
    if (this.phase === "breach") return "North gate breached: survive the inner-city rush.";
    if (this.phase === "push") return "Push north and destroy the Rift Heart.";
    if (this.phase === "victory") return "The invasion source is destroyed.";
    return "The Heartfire Nexus has fallen.";
  }

  private remainingAbilityRanks(player: PlayerState): number {
    if (!player.heroId) return 0;
    const definitions = HERO_DEFINITIONS[player.heroId].abilities;
    return (Object.keys(definitions) as AbilitySlot[]).reduce(
      (remaining, slot) => remaining + Math.max(0, definitions[slot].maxRank - player.abilityRanks[slot]),
      0,
    );
  }

  private nextLevelXp(level: number): number { return 50 + (level - 1) * 35; }

  private effect(
    kind: EffectKind,
    position: Vec2,
    radius: number,
    ownerId: string | null,
    remaining = 0.35,
    lane: LaneId | null = null,
    rotation = this.random() * Math.PI * 2,
    sourceSummonId: string | null = null,
  ): EffectState {
    const effect: EffectState = {
      id: this.id("effect"),
      kind,
      position: copy(position),
      radius,
      rotation,
      remaining,
      ownerId,
      lane,
      ...(sourceSummonId ? { sourceSummonId } : {}),
    };
    this.effects.set(effect.id, effect);
    return effect;
  }

  private emit(kind: GameEvent["kind"], text: string, extra: Partial<GameEvent>): void {
    const event: GameEvent = { id: this.id("event"), kind, text, at: this.totalTime, ...extra };
    this.recentEvents.push(event); this.pendingEvents.push(event);
  }

  private failure(code: string, message: string): GameActionResult { return { ok: false, code, message }; }
  private id(prefix: string): string { return `${prefix}-${++this.idCounter}`; }
}
