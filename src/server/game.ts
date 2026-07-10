import {
  ITEM_DEFINITIONS,
  VENDOR_DEFINITIONS,
  createEmptyEquipment,
  isItemId,
  isVendorId,
} from "../shared/armory-data";
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
  SummonSnapshot,
  VendorId,
  Vec2,
} from "../shared/protocol";
import { goldFromUnits, goldRewardShareUnits, goldToUnits } from "./economy";
import { deriveHeroStats } from "./hero-stats";

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
  heroId: HeroId | null;
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
}

interface ProjectileState extends ProjectileSnapshot {
  damage: number;
  pierce: number;
  hitIds: Set<string>;
}

interface SummonState extends SummonSnapshot {
  damage: number;
  speed: number;
  strikeCooldown: number;
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
  imp: { hp: 42, radius: 0.75, damage: 7, speed: 5.4, attackCooldown: 0.9, xp: 7, gold: 3 },
  hound: { hp: 30, radius: 0.65, damage: 6, speed: 7.6, attackCooldown: 0.75, xp: 6, gold: 3 },
  brute: { hp: 125, radius: 1.25, damage: 14, speed: 3.8, attackCooldown: 1.2, xp: 18, gold: 9 },
  siege: { hp: 540, radius: 2.1, damage: 28, speed: 2.8, attackCooldown: 1.5, xp: 70, gold: 35 },
  rift_guard: { hp: 95, radius: 1, damage: 10, speed: 5.1, attackCooldown: 0.9, xp: 12, gold: 6 },
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

export class GameWorld {
  readonly players = new Map<string, PlayerState>();
  phase: GamePhase = "lobby";
  accelerated: boolean;
  timings: GameTimings;
  hostId: string | null = null;

  private readonly random: () => number;
  private readonly enemyCap: number;
  private enemies = new Map<string, EnemyState>();
  private projectiles = new Map<string, ProjectileState>();
  private summons = new Map<string, SummonState>();
  private pickups = new Map<string, PickupState>();
  private effects = new Map<string, EffectState>();
  private delayed: DelayedStrike[] = [];
  private pendingEvents: GameEvent[] = [];
  private recentEvents: GameEvent[] = [];
  private elapsed = 0;
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
  }

  addPlayer(id: string, name = "Unclaimed Hero"): GameActionResult {
    if (this.players.has(id)) return { ok: true };
    if (this.phase !== "lobby") return this.failure("GAME_IN_PROGRESS", "The siege has already begun.");
    if (this.players.size >= 4) return this.failure("LOBBY_FULL", "The four hero places are filled.");
    const cleanName = name.trim().slice(0, 24) || "Unclaimed Hero";
    this.players.set(id, {
      id,
      name: cleanName,
      heroId: null,
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
    if (this.hostId === id) this.hostId = this.players.keys().next().value ?? null;
  }

  setPlayerName(id: string, name: string): GameActionResult {
    const player = this.players.get(id);
    if (!player) return this.failure("PLAYER_UNKNOWN", "Player is not in this lobby.");
    player.name = name.trim().slice(0, 24) || player.name;
    return { ok: true };
  }

  claimHero(playerId: string, heroId: HeroId): GameActionResult {
    const player = this.players.get(playerId);
    if (!player) return this.failure("PLAYER_UNKNOWN", "Player is not in this lobby.");
    if (this.phase !== "lobby") return this.failure("LOCKED", "Hero selection is locked during a run.");
    if (!isHeroId(heroId)) return this.failure("INVALID_HERO", "That hero does not exist.");
    const owner = [...this.players.values()].find((candidate) => candidate.id !== playerId && candidate.heroId === heroId);
    if (owner) return this.failure("HERO_TAKEN", `${HERO_DEFINITIONS[heroId].name} is already claimed by ${owner.name}.`);
    player.heroId = heroId;
    player.ready = false;
    this.emit("hero_claimed", `${player.name} claimed ${HERO_DEFINITIONS[heroId].name}.`, { playerId });
    return { ok: true };
  }

  releaseHero(playerId: string): GameActionResult {
    const player = this.players.get(playerId);
    if (!player || this.phase !== "lobby") return this.failure("LOCKED", "Hero selection is locked.");
    player.heroId = null;
    player.ready = false;
    this.emit("hero_released", `${player.name} released their hero.`, { playerId });
    return { ok: true };
  }

  setReady(playerId: string, ready: boolean): GameActionResult {
    const player = this.players.get(playerId);
    if (!player) return this.failure("PLAYER_UNKNOWN", "Player is not in this lobby.");
    if (this.phase !== "lobby" || !player.heroId) return this.failure("NO_HERO", "Claim a hero before readying.");
    player.ready = ready;
    return { ok: true };
  }

  startGame(playerId: string): GameActionResult {
    if (this.phase !== "lobby") return this.failure("ALREADY_STARTED", "The siege is already active.");
    if (playerId !== this.hostId) return this.failure("HOST_ONLY", "Only the lobby host can start the run.");
    if (!this.canStart()) return this.failure("NOT_READY", "Every player must claim a unique hero and ready up.");
    this.resetRunState();
    this.setPhase("defense");
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
    this.totalTime = 0;
    this.currentWave = 0;
    this.activeLanes = [];
    this.enemies.clear();
    this.projectiles.clear();
    this.summons.clear();
    this.pickups.clear();
    this.effects.clear();
    this.recentEvents = [];
    this.pendingEvents = [];
    this.resetStructures();
    for (const player of this.players.values()) {
      player.ready = false;
      player.position = { x: 0, z: 8 };
      player.move = { x: 0, z: 0 };
      player.attacking = false;
      player.action = null;
      player.equipment = createEmptyEquipment();
      player.abilityRanks = ZERO_ABILITY_RANKS();
      player.skillPoints = 0;
      player.cooldowns = ZERO_COOLDOWNS();
    }
  }

  handleMessage(playerId: string, message: ClientMessage): GameActionResult {
    switch (message.type) {
      case "join": return this.setPlayerName(playerId, message.name);
      case "claim_hero": return this.claimHero(playerId, message.heroId);
      case "release_hero": return this.releaseHero(playerId);
      case "set_ready": return this.setReady(playerId, message.ready);
      case "start": return this.startGame(playerId);
      case "reset_run": return this.resetRun(playerId);
      case "cast": return isAbilitySlot(message.slot) ? this.cast(playerId, message.slot) : this.failure("INVALID_ABILITY", "Unknown ability.");
      case "level_ability": return isAbilitySlot(message.slot) ? this.levelAbility(playerId, message.slot) : this.failure("INVALID_ABILITY", "Unknown ability.");
      case "buy_item": return this.buyItem(playerId, message.vendorId, message.itemId);
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
    this.updatePlayers(dt);
    this.updateProjectiles(dt);
    this.updateSummons(dt);
    this.updateEnemies(dt);
    this.updatePickups(dt);
    this.updateDelayed();
    this.updateDirector(dt);
    if (this.nexus.hp <= 0 && !this.nexus.shielded) this.setPhase("defeat");
  }

  levelAbility(playerId: string, slot: AbilitySlot): GameActionResult {
    const player = this.players.get(playerId);
    if (!player) return this.failure("PLAYER_UNKNOWN", "Player is not in this run.");
    if (!player.heroId || (this.phase !== "defense" && this.phase !== "breach" && this.phase !== "push")) {
      return this.failure("RUN_INACTIVE", "Abilities can only be learned during an active run.");
    }
    const ability = HERO_DEFINITIONS[player.heroId].abilities[slot];
    if (player.level < ability.unlockLevel) return this.failure("LEVEL_REQUIRED", `${ability.name} unlocks at hero level ${ability.unlockLevel}.`);
    if (player.abilityRanks[slot] >= ability.maxRank) return this.failure("MAX_RANK", `${ability.name} is already at maximum rank.`);
    if (player.skillPoints <= 0) return this.failure("NO_SKILL_POINTS", "Reach the next hero level to earn another skill point.");
    player.abilityRanks[slot] += 1;
    player.skillPoints -= 1;
    this.emit("system", `${player.name} learned ${ability.name} rank ${player.abilityRanks[slot]}.`, { playerId });
    return { ok: true };
  }

  damageNexus(amount: number): void {
    if (!this.nexus.shielded) this.nexus.hp = Math.max(0, this.nexus.hp - Math.max(0, amount));
    if (this.nexus.hp <= 0 && this.phase !== "lobby") this.setPhase("defeat");
  }

  damageRiftHeart(amount: number): void {
    if (!this.riftHeart.active || this.phase !== "push") return;
    this.riftHeart.hp = Math.max(0, this.riftHeart.hp - Math.max(0, amount));
    this.effect("rift_hit", WORLD_LAYOUT.riftHeart, 8, null);
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
      player.skillPoints = Math.min(player.skillPoints + 1, this.remainingAbilityRanks(player));
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
    const claimedHeroes: Partial<Record<HeroId, string>> = {};
    for (const player of this.players.values()) if (player.heroId) claimedHeroes[player.heroId] = player.id;
    return {
      tick: this.tickNumber,
      serverTime: Date.now(),
      debug: this.accelerated,
      phase: this.phase,
      phaseElapsed: this.elapsed,
      phaseDuration: duration,
      objective: this.objective(),
      pressureLane: this.pressureLane,
      activeLanes: [...this.activeLanes],
      lobby: {
        hostId: this.hostId,
        maxPlayers: 4,
        canStart: this.canStart(),
        claimedHeroes,
        availableHeroes: HERO_IDS.filter((heroId) => !claimedHeroes[heroId]),
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
      projectiles: [...this.projectiles.values()].map(({ damage: _d, pierce: _p, hitIds: _h, ...projectile }) => projectile),
      summons: [...this.summons.values()].map(({ damage: _d, speed: _s, strikeCooldown: _c, orbitOffset: _o, ...summon }) => summon),
      pickups: [...this.pickups.values()],
      effects: [...this.effects.values()],
      events: this.recentEvents.slice(-12),
    };
  }

  private resetRunState(): void {
    this.elapsed = 0;
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
    this.delayed = [];
    this.resetStructures();
    const starts: Vec2[] = [{ x: -4, z: 7 }, { x: 4, z: 7 }, { x: -4, z: -7 }, { x: 4, z: -7 }];
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
      player.equipment = createEmptyEquipment();
      player.hp = this.heroStats(player).maxHp;
      player.xp = 0;
      player.goldUnits = 0;
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
    return this.phase === "lobby" && this.players.size > 0 && [...this.players.values()].every((player) => player.heroId && player.ready);
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
    const player = this.players.get(playerId);
    if (!player) return this.failure("PLAYER_UNKNOWN", "Player is not connected.");
    if (!player.heroId || (this.phase !== "defense" && this.phase !== "breach" && this.phase !== "push")) {
      return this.failure("RUN_INACTIVE", "Citadel vendors only trade during an active siege.");
    }
    if (player.downedFor > 0) return this.failure("PLAYER_DOWNED", "A downed hero cannot trade.");
    if (!isVendorId(vendorId)) return this.failure("VENDOR_UNKNOWN", "That vendor does not exist.");
    if (!isItemId(itemId)) return this.failure("ITEM_UNKNOWN", "That item does not exist.");

    const vendor = VENDOR_DEFINITIONS[vendorId];
    if (!vendor.itemIds.includes(itemId)) return this.failure("ITEM_NOT_STOCKED", `${vendor.name} does not stock that item.`);
    if (distance(player.position, vendor.position) > vendor.interactionRadius) {
      return this.failure("OUT_OF_RANGE", `Move closer to ${vendor.name} to trade.`);
    }

    const item = ITEM_DEFINITIONS[itemId];
    const priceUnits = goldToUnits(item.price);
    if (player.goldUnits < priceUnits) return this.failure("INSUFFICIENT_GOLD", `${item.name} costs ${item.price} gold.`);
    const slotIndex = player.equipment.indexOf(null);
    if (slotIndex < 0) return this.failure("EQUIPMENT_FULL", "All six equipment slots are full.");

    const previousRecovery = this.heroStats(player).cooldownRecovery;
    player.goldUnits -= priceUnits;
    player.equipment[slotIndex] = itemId;
    const nextRecovery = this.heroStats(player).cooldownRecovery;
    if (nextRecovery !== previousRecovery) {
      const progressScale = previousRecovery / nextRecovery;
      for (const slot of ["ability1", "ability2", "ability3", "ultimate"] as const) {
        player.cooldowns[slot] *= progressScale;
      }
    }
    this.emit("item_purchased", `${player.name} equipped ${item.name} at ${vendor.name}.`, {
      playerId,
      vendorId,
      itemId,
      position: vendor.position,
    });
    return { ok: true };
  }

  private cast(playerId: string, slot: AbilitySlot): GameActionResult {
    const player = this.players.get(playerId);
    if (!this.canAct(player) || !player.heroId) return this.failure("CANNOT_ACT", "Hero cannot cast now.");
    if (player.action && player.action.kind !== "basic") return this.failure("ACTION_BUSY", "Finish the current action first.");
    if (player.abilityRanks[slot] <= 0) return this.failure("ABILITY_UNLEARNED", "Spend a skill point on this ability first.");
    if (player.cooldowns[slot] > 0) return this.failure("COOLDOWN", "Ability is cooling down.");
    const stats = this.heroStats(player);
    player.cooldowns[slot] = HERO_DEFINITIONS[player.heroId].abilities[slot].cooldown / stats.cooldownRecovery;
    const timing = PLAYER_ACTION_TIMINGS[slot];
    player.action = this.action(slot, "windup", timing.windup, normalize(player.aim));
    return { ok: true };
  }

  private castWarden(player: PlayerState, slot: AbilitySlot, aim: Vec2, target: Vec2, rank: number): void {
    if (slot === "ability1") {
      const origin = copy(player.position);
      const reach = this.rankRadius(10, rank);
      this.damageLine(player, origin, aim, reach, this.rankRadius(2.5, rank), this.abilityMagnitude(player, 58, rank));
      player.position.x += aim.x * reach; player.position.z += aim.z * reach; this.clampPlayer(player);
      const midpoint = { x: origin.x + aim.x * reach * 0.5, z: origin.z + aim.z * reach * 0.5 };
      this.effect("warden_charge", midpoint, reach * 0.5, player.id, 0.55, null, this.directionYaw(aim));
    } else if (slot === "ability2") {
      const reach = this.rankRadius(15, rank);
      this.damageLine(player, player.position, aim, reach, this.rankRadius(3.7, rank), this.abilityMagnitude(player, 72, rank));
      this.effect("warden_wave", player.position, reach, player.id, 0.65, null, this.directionYaw(aim));
    } else if (slot === "ability3") {
      const radius = this.rankRadius(9, rank);
      this.damageCircle(player, player.position, radius, this.abilityMagnitude(player, 38, rank));
      player.barrier = Math.min(player.maxBarrier, player.barrier + this.abilityMagnitude(player, 30, rank));
      this.effect("war_standard", player.position, radius, player.id, 5 + rank);
    } else {
      const radius = this.rankRadius(17, rank);
      this.damageCircle(player, player.position, radius, this.abilityMagnitude(player, 145, rank));
      player.barrier = player.maxBarrier;
      this.effect("warden_bastion", player.position, radius, player.id, 1.2);
    }
  }

  private castRiftstalker(player: PlayerState, slot: AbilitySlot, aim: Vec2, target: Vec2, rank: number): void {
    if (slot === "ability1") {
      player.position.x -= aim.x * 6; player.position.z -= aim.z * 6; this.clampPlayer(player); player.invulnerableFor = 0.3;
      this.fireProjectile(player, "arrow", aim, this.abilityMagnitude(player, 44, rank), 31, 2, this.rankRadius(0.45, rank));
      this.effect("slash", player.position, this.rankRadius(2, rank), player.id);
    } else if (slot === "ability2") {
      for (const angle of [-0.18, 0, 0.18]) this.fireProjectile(player, "splitbolt", rotate(aim, angle), this.abilityMagnitude(player, 47, rank), 29, 4, this.rankRadius(0.45, rank));
    } else if (slot === "ability3") {
      const radius = this.rankRadius(7.5, rank);
      this.damageCircle(player, target, radius, this.abilityMagnitude(player, 28, rank), 4); this.effect("snare", target, radius, player.id, 1.1);
    } else {
      for (let index = -5; index <= 5; index++) this.fireProjectile(player, "arrow", rotate(aim, index * 0.075), this.abilityMagnitude(player, 48, rank), 34, 3, this.rankRadius(0.45, rank));
    }
  }

  private castAshcaller(player: PlayerState, slot: AbilitySlot, aim: Vec2, target: Vec2, rank: number): void {
    if (slot === "ability1") {
      const radius = this.rankRadius(7, rank);
      this.damageCircle(player, player.position, radius, this.abilityMagnitude(player, 54, rank)); this.effect("fire", player.position, radius, player.id);
    } else if (slot === "ability2") {
      const hit = new Set<string>();
      for (let step = 1; step <= 5; step++) {
        const point = { x: player.position.x + aim.x * step * 3.2, z: player.position.z + aim.z * step * 3.2 };
        const radius = this.rankRadius(3.2, rank);
        this.damageCircle(player, point, radius, this.abilityMagnitude(player, 42, rank), 2, hit); this.effect("fire", point, radius, player.id, 1);
      }
    } else if (slot === "ability3") {
      const radius = this.rankRadius(8, rank);
      this.effect("meteor_warning", target, radius, player.id, 0.9);
      this.delayed.push({ at: this.totalTime + 0.8, ownerId: player.id, position: target, radius, damage: this.abilityMagnitude(player, 105, rank), kind: "meteor" });
    } else {
      const radius = this.rankRadius(19, rank);
      this.damageCircle(player, player.position, radius, this.abilityMagnitude(player, 155, rank)); this.effect("fire", player.position, radius, player.id, 1.2);
    }
  }

  private castGravebinder(player: PlayerState, slot: AbilitySlot, aim: Vec2, target: Vec2, rank: number): void {
    if (slot === "ability1") {
      const radius = this.rankRadius(8, rank);
      const hit = this.damageCircle(player, target, radius, this.abilityMagnitude(player, 67, rank));
      for (const enemy of this.enemies.values()) if (distance(enemy.position, target) <= radius) {
        const pull = normalize({ x: player.position.x - enemy.position.x, z: player.position.z - enemy.position.z });
        enemy.position.x += pull.x * 4; enemy.position.z += pull.z * 4;
      }
      player.hp = Math.min(this.heroStats(player).maxHp, player.hp + hit * this.abilityMagnitude(player, 7, rank)); this.effect("souls", target, radius, player.id);
    } else if (slot === "ability2") {
      player.barrier = Math.min(player.maxBarrier, player.barrier + this.abilityMagnitude(player, 75, rank)); this.effect("heal", player.position, this.rankRadius(4, rank), player.id);
    } else if (slot === "ability3") {
      this.raiseWraithHost(player, rank);
      this.effect("souls", player.position, this.rankRadius(7, rank), player.id, 0.8);
    } else {
      this.fireProjectile(player, "death_tide", aim, this.abilityMagnitude(player, 125, rank), 19, 99, this.rankRadius(3.2, rank));
      this.effect("souls", player.position, this.rankRadius(10, rank), player.id, 1);
    }
  }

  private updatePlayers(dt: number): void {
    for (const player of this.players.values()) {
      for (const slot of Object.keys(player.cooldowns) as ActionSlot[]) player.cooldowns[slot] = Math.max(0, player.cooldowns[slot] - dt);
      player.invulnerableFor = Math.max(0, player.invulnerableFor - dt);
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
      const movement = length(player.move) > 1 ? normalize(player.move) : player.move;
      const movementScale = !player.action ? 1 : player.action.phase === "recovery" ? 0.45 : 0;
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
      const duration = current.kind === "basic" ? 0.08 : PLAYER_ACTION_TIMINGS[current.kind].active;
      player.action = this.action(current.kind, "active", duration, current.direction);
      return;
    }
    if (current.phase === "active") {
      const duration = current.kind === "basic"
        ? Math.max(0.08, this.heroStats(player).basicAttackInterval * 0.28)
        : PLAYER_ACTION_TIMINGS[current.kind].recovery;
      player.action = this.action(current.kind, "recovery", duration, current.direction);
      return;
    }
    player.action = null;
  }

  private startBasicAttack(player: PlayerState): void {
    if (!player.heroId) return;
    const stats = this.heroStats(player);
    player.cooldowns.basic = stats.basicAttackInterval;
    const windup = clamp(stats.basicAttackInterval * 0.34, 0.08, 0.18);
    player.action = this.action("basic", "windup", windup, normalize(player.aim));
  }

  private resolvePlayerAction(player: PlayerState, action: ActionSnapshot): void {
    if (!player.heroId || action.kind === "enemy_attack") return;
    if (action.kind === "basic") {
      this.basicAttackImpact(player, action.direction);
      return;
    }
    const rank = player.abilityRanks[action.kind];
    if (rank <= 0) return;
    const aim = normalize(action.direction);
    const target = { x: player.position.x + aim.x * 14, z: player.position.z + aim.z * 14 };
    if (player.heroId === "warden") this.castWarden(player, action.kind, aim, target, rank);
    if (player.heroId === "riftstalker") this.castRiftstalker(player, action.kind, aim, target, rank);
    if (player.heroId === "ashcaller") this.castAshcaller(player, action.kind, aim, target, rank);
    if (player.heroId === "gravebinder") this.castGravebinder(player, action.kind, aim, target, rank);
  }

  private basicAttackImpact(player: PlayerState, direction: Vec2): void {
    if (!player.heroId) return;
    const damage = this.heroStats(player).basicDamage;
    if (player.heroId === "warden" || player.heroId === "gravebinder") {
      const center = { x: player.position.x + direction.x * 3.2, z: player.position.z + direction.z * 3.2 };
      const hits = this.damageCircle(player, center, 3.8, damage);
      if (player.heroId === "gravebinder" && hits) player.hp = Math.min(this.heroStats(player).maxHp, player.hp + hits * 2.5);
      this.effect("slash", center, 4, player.id, 0.35, null, this.directionYaw(direction));
    } else {
      this.fireProjectile(player, player.heroId === "ashcaller" ? "ember" : "arrow", direction, damage, player.heroId === "ashcaller" ? 23 : 29, 1);
    }
  }

  private updateProjectiles(dt: number): void {
    for (const projectile of [...this.projectiles.values()]) {
      projectile.remaining -= dt;
      projectile.position.x += projectile.velocity.x * dt;
      projectile.position.z += projectile.velocity.z * dt;
      if (projectile.remaining <= 0) { this.projectiles.delete(projectile.id); continue; }
      if (projectile.team !== "heroes") continue;
      const owner = this.players.get(projectile.ownerId);
      if (!owner) continue;
      for (const enemy of [...this.enemies.values()]) {
        if (projectile.hitIds.has(enemy.id) || distance(projectile.position, enemy.position) > projectile.radius + enemy.radius) continue;
        projectile.hitIds.add(enemy.id);
        this.damageEnemy(enemy, projectile.damage, owner);
        projectile.pierce -= 1;
        if (projectile.pierce <= 0) { this.projectiles.delete(projectile.id); break; }
      }
      if (this.phase === "push" && this.riftHeart.active && distance(projectile.position, WORLD_LAYOUT.riftHeart) <= projectile.radius + 6) {
        this.damageRiftHeart(projectile.damage);
        this.projectiles.delete(projectile.id);
      }
    }
  }

  private raiseWraithHost(player: PlayerState, rank: number): void {
    const count = 2 + rank;
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
        damage: this.abilityMagnitude(player, 24, rank),
        speed: 14.5 + rank,
        strikeCooldown: index * 0.12,
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
            this.damageEnemy(target, summon.damage, owner);
            if (!this.enemies.has(target.id)) summon.targetId = null;
          } else if (riftTarget) {
            this.damageRiftHeart(summon.damage);
          }
          this.effect("souls", summon.position, 1.8, owner.id, 0.22);
        }
      }
    }
  }

  private updateEnemies(dt: number): void {
    for (const enemy of [...this.enemies.values()]) {
      enemy.slowFor = Math.max(0, enemy.slowFor - dt);
      enemy.slowed = enemy.slowFor > 0;
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
      if (target && target.downedFor <= 0 && distance(enemy.position, target.position) <= enemy.radius + 3.75) this.damagePlayer(target, enemy.damage);
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
      this.emit("victory", "RIFT HEART DESTROYED — humanity survives the night.", { position: WORLD_LAYOUT.riftHeart });
    }
    if (phase === "defeat") this.emit("defeat", this.nexus.hp <= 0 ? "The Heartfire Nexus has fallen." : "The Nexus barrier collapsed before the Rift Heart fell.", {});
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

  private fireProjectile(player: PlayerState, kind: ProjectileKind, direction: Vec2, damage: number, speed: number, pierce: number, radius = 0.45): void {
    const normalized = normalize(direction);
    const projectile: ProjectileState = {
      id: this.id("projectile"), ownerId: player.id, team: "heroes", kind,
      position: { x: player.position.x + normalized.x * 1.7, z: player.position.z + normalized.z * 1.7 },
      velocity: { x: normalized.x * speed, z: normalized.z * speed }, radius, remaining: kind === "death_tide" ? 4 : 2.2,
      damage, pierce, hitIds: new Set(),
    };
    this.projectiles.set(projectile.id, projectile);
  }

  private action(kind: ActionSnapshot["kind"], phase: ActionSnapshot["phase"], duration: number, direction: Vec2): ActionSnapshot {
    return { kind, phase, remaining: duration, duration, direction: copy(normalize(direction)) };
  }

  private copyAction(action: ActionSnapshot): ActionSnapshot {
    return { ...action, direction: copy(action.direction) };
  }

  private heroStats(player: PlayerState): HeroStatsSnapshot {
    return deriveHeroStats(player.heroId, player.level, player.equipment);
  }

  private abilityMagnitude(player: PlayerState, base: number, rank: number): number {
    return base * (1 + Math.max(0, rank - 1) * 0.25) * this.heroStats(player).abilityPower;
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
      if (distance(WORLD_LAYOUT.riftHeart, nearest) <= width + 6) this.damageRiftHeart(damage);
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
    if (this.phase === "push" && distance(center, WORLD_LAYOUT.riftHeart) <= radius + 6) this.damageRiftHeart(damage);
    return hits;
  }

  private damageEnemy(enemy: EnemyState, baseDamage: number, source: PlayerState): void {
    enemy.hp -= baseDamage;
    this.effect("impact", enemy.position, Math.max(1.2, enemy.radius * 1.5), source.id, 0.16);
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

  private damagePlayer(player: PlayerState, amount: number): void {
    if (player.invulnerableFor > 0 || player.downedFor > 0) return;
    const absorbed = Math.min(player.barrier, amount);
    player.barrier -= absorbed;
    player.hp -= amount - absorbed;
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
    return !!player && player.downedFor <= 0 && (this.phase === "defense" || this.phase === "breach" || this.phase === "push");
  }

  private playerSnapshot(player: PlayerState): PlayerSnapshot {
    const stats = this.heroStats(player);
    return {
      id: player.id, name: player.name, heroId: player.heroId, ready: player.ready, position: copy(player.position),
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
    if (this.phase === "defense") return this.timings.defenseDuration;
    if (this.phase === "breach") return this.timings.breachDuration;
    if (this.phase === "push") return this.timings.pushDuration;
    return null;
  }

  private objective(): string {
    if (this.phase === "lobby") return "Claim one unique hero and ready up.";
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
  ): void {
    const effect: EffectState = { id: this.id("effect"), kind, position: copy(position), radius, rotation, remaining, ownerId, lane };
    this.effects.set(effect.id, effect);
  }

  private emit(kind: GameEvent["kind"], text: string, extra: Partial<GameEvent>): void {
    const event: GameEvent = { id: this.id("event"), kind, text, at: this.totalTime, ...extra };
    this.recentEvents.push(event); this.pendingEvents.push(event);
  }

  private failure(code: string, message: string): GameActionResult { return { ok: false, code, message }; }
  private id(prefix: string): string { return `${prefix}-${++this.idCounter}`; }
}
