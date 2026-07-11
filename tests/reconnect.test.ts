import { describe, expect, test } from "bun:test";
import { goldToUnits } from "../src/server/economy";
import { createGameServer } from "../src/server/index";
import {
  SPLITBOLT_FORK_ANGLE_RADIANS,
  SPLITBOLT_FORK_PIERCE,
  SPLITBOLT_FORK_RADIUS,
  SPLITBOLT_LIFETIME_SECONDS,
  SPLITBOLT_SEED_PIERCE,
  SPLITBOLT_SEED_RADIUS,
  SPLITBOLT_SPEED,
} from "../src/shared/splitbolt";
import type {
  EffectSnapshot,
  EquipmentSlots,
  GameSnapshot,
  HeroId,
  PlayerSnapshot,
  ProjectileSnapshot,
  ServerMessage,
  Vec2,
} from "../src/shared/protocol";

const RECONNECT_GRACE_MS = 180;
const WAIT_TIMEOUT_MS = 2_000;

const delay = (milliseconds: number) => new Promise<void>((resolve) => {
  setTimeout(resolve, milliseconds);
});

async function waitUntil(
  predicate: () => boolean,
  description: string,
  timeoutMs = WAIT_TIMEOUT_MS,
): Promise<void> {
  const deadline = performance.now() + timeoutMs;
  while (performance.now() < deadline) {
    if (predicate()) return;
    await delay(5);
  }
  throw new Error(`Timed out waiting for ${description}`);
}

type WelcomeMessage = Extract<ServerMessage, { type: "welcome" }>;

class Peer {
  readonly messages: ServerMessage[] = [];
  readonly closed: Promise<CloseEvent>;

  private constructor(readonly socket: WebSocket) {
    this.closed = new Promise<CloseEvent>((resolve) => {
      socket.addEventListener("close", resolve, { once: true });
    });
    socket.addEventListener("message", (event) => {
      this.messages.push(JSON.parse(String(event.data)) as ServerMessage);
    });
  }

  static async open(url: string): Promise<Peer> {
    const socket = new WebSocket(url);
    const peer = new Peer(socket);
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Timed out opening WebSocket")), WAIT_TIMEOUT_MS);
      socket.addEventListener("open", () => {
        clearTimeout(timeout);
        resolve();
      }, { once: true });
      socket.addEventListener("error", () => {
        clearTimeout(timeout);
        reject(new Error("WebSocket failed to open"));
      }, { once: true });
    });
    return peer;
  }

  send(message: object): void {
    this.socket.send(JSON.stringify(message));
  }

  sendHello(name: string, resumeToken?: string): number {
    const cursor = this.messages.length;
    this.send({
      type: "hello",
      name,
      ...(resumeToken === undefined ? {} : { resumeToken }),
    });
    return cursor;
  }

  async welcome(name: string, resumeToken?: string): Promise<WelcomeMessage> {
    const cursor = this.sendHello(name, resumeToken);
    const message = await this.waitFor((candidate) => candidate.type === "welcome", cursor);
    expect(message.type).toBe("welcome");
    return message as WelcomeMessage;
  }

  async waitFor(
    predicate: (message: ServerMessage) => boolean,
    cursor = 0,
    timeoutMs = WAIT_TIMEOUT_MS,
  ): Promise<ServerMessage> {
    const deadline = performance.now() + timeoutMs;
    while (performance.now() < deadline) {
      const match = this.messages.slice(cursor).find(predicate);
      if (match) return match;
      await delay(5);
    }
    throw new Error("Timed out waiting for WebSocket message");
  }

  async waitForClose(timeoutMs = WAIT_TIMEOUT_MS): Promise<CloseEvent> {
    return await Promise.race([
      this.closed,
      delay(timeoutMs).then(() => {
        throw new Error("Timed out waiting for WebSocket close");
      }),
    ]);
  }

  close(): void {
    if (this.socket.readyState === WebSocket.OPEN) this.socket.close(1000, "test cleanup");
  }
}

function createHarness() {
  const instance = createGameServer({
    port: 0,
    hostname: "127.0.0.1",
    accelerated: false,
    reconnectGraceMs: RECONNECT_GRACE_MS,
  });
  const peers = new Set<Peer>();
  const host = `127.0.0.1:${instance.server.port}`;

  return {
    instance,
    wsUrl: `ws://${host}/ws`,
    debugUrl: `http://${host}/debug/state`,
    async open(): Promise<Peer> {
      const peer = await Peer.open(`ws://${host}/ws`);
      peers.add(peer);
      return peer;
    },
    async stop(): Promise<void> {
      for (const peer of peers) peer.close();
      await delay(10);
      instance.stop();
    },
  };
}

function findPlayer(snapshot: GameSnapshot, playerId: string): PlayerSnapshot {
  const player = snapshot.players.find((candidate) => candidate.id === playerId);
  if (!player) throw new Error(`Player ${playerId} is missing from the snapshot`);
  return player;
}

function visibleCinderWalls(snapshot: GameSnapshot, ownerId: string): EffectSnapshot[] {
  return snapshot.effects.filter((effect) =>
    effect.ownerId === ownerId && effect.kind === "cinder_wall"
  );
}

function ownedSplitbolts(snapshot: GameSnapshot, ownerId: string): ProjectileSnapshot[] {
  return snapshot.projectiles.filter((projectile) =>
    projectile.ownerId === ownerId && projectile.kind === "splitbolt"
  );
}

function cinderWallIdentity(effect: EffectSnapshot) {
  return {
    id: effect.id,
    kind: effect.kind,
    ownerId: effect.ownerId,
    position: { ...effect.position },
    radius: effect.radius,
    rotation: effect.rotation,
    lane: effect.lane,
  };
}

function resumableState(player: PlayerSnapshot) {
  return {
    id: player.id,
    name: player.name,
    heroId: player.heroId,
    hp: player.hp,
    barrier: player.barrier,
    maxBarrier: player.maxBarrier,
    level: player.level,
    xp: player.xp,
    gold: player.gold,
    equipment: player.equipment,
    stats: player.stats,
    position: player.position,
    kills: player.kills,
    abilityRanks: player.abilityRanks,
    skillPoints: player.skillPoints,
    lastInputSeq: player.lastInputSeq,
  };
}

async function claimAndReady(
  harness: ReturnType<typeof createHarness>,
  peer: Peer,
  playerId: string,
  heroId: HeroId,
): Promise<void> {
  peer.send({ type: "claim_hero", heroId });
  await waitUntil(
    () => harness.instance.game.getSnapshot().lobby.claimedHeroes[heroId] === playerId,
    `${heroId} claim`,
  );
  peer.send({ type: "set_ready", ready: true });
  await waitUntil(
    () => findPlayer(harness.instance.game.getSnapshot(), playerId).ready,
    `${heroId} ready state`,
  );
}

describe("authoritative reconnect lifecycle", () => {
  test("requires hello, returns a private fresh token, and never leaks it through shared state", async () => {
    const harness = createHarness();
    try {
      const owner = await harness.open();

      await delay(40);
      expect(owner.messages).toEqual([]);
      expect(harness.instance.game.players.size).toBe(0);

      const welcome = await owner.welcome("Ada");
      expect(welcome.resumed).toBe(false);
      expect(welcome.resumeWindowMs).toBe(RECONNECT_GRACE_MS);
      expect(welcome.resumeToken.length).toBeGreaterThan(16);
      expect(welcome.resumeToken).not.toBe(welcome.playerId);
      expect(findPlayer(welcome.snapshot, welcome.playerId).connected).toBe(true);
      expect(JSON.stringify(welcome.snapshot)).not.toContain(welcome.resumeToken);

      const observer = await harness.open();
      const observerWelcome = await observer.welcome("Bryn");
      expect(observerWelcome.resumed).toBe(false);
      expect(observerWelcome.playerId).not.toBe(welcome.playerId);
      await delay(30);

      expect(JSON.stringify(observer.messages)).not.toContain(welcome.resumeToken);
      expect(await fetch(harness.debugUrl).then((response) => response.text())).not.toContain(welcome.resumeToken);
    } finally {
      await harness.stop();
    }
  });

  test("detaches an active hero, resumes its exact run state, and fences stale duplicate sockets", async () => {
    const harness = createHarness();
    try {
      const original = await harness.open();
      const firstWelcome = await original.welcome("Ada");
      const playerId = firstWelcome.playerId;

      await claimAndReady(harness, original, playerId, "warden");
      original.send({ type: "start" });
      await waitUntil(() => harness.instance.game.phase === "defense", "active defense");

      const equipment: EquipmentSlots = [
        "fleetstep_greaves",
        "fleetstep_greaves",
        "fleetstep_greaves",
        "fleetstep_greaves",
        "tempered_edge",
        "gateward_plate",
      ];
      const authoritative = harness.instance.game.players.get(playerId)!;
      authoritative.level = 8;
      authoritative.xp = 377;
      authoritative.goldUnits = goldToUnits(87);
      authoritative.equipment = [...equipment] as EquipmentSlots;
      authoritative.position = { x: 12.25, z: -9.75 };
      authoritative.hp = 143;
      authoritative.barrier = 37;
      authoritative.kills = 19;
      authoritative.abilityRanks = { ability1: 2, ability2: 1, ability3: 1, ultimate: 1 };
      authoritative.skillPoints = 2;

      original.send({
        type: "input",
        seq: 41,
        move: { x: 1, z: 0 },
        aim: { x: 0, z: -1 },
        attacking: true,
      });
      await waitUntil(
        () => {
          const state = harness.instance.game.players.get(playerId);
          return state?.lastInputSeq === 41 && state.attacking && state.velocity.x > 0;
        },
        "held authoritative movement and attack",
      );

      original.close();
      await original.waitForClose();
      await waitUntil(
        () => harness.instance.game.getSnapshot().players.some((player) => player.id === playerId && !player.connected),
        "detached player snapshot",
      );

      const detached = findPlayer(harness.instance.game.getSnapshot(), playerId);
      const detachedState = resumableState(detached);
      const detachedPosition = { ...detached.position };
      const detachedInternal = harness.instance.game.players.get(playerId)!;
      expect(detached.connected).toBe(false);
      expect(detached.velocity).toEqual({ x: 0, z: 0 });
      expect(detachedInternal.move).toEqual({ x: 0, z: 0 });
      expect(detachedInternal.attacking).toBe(false);

      await delay(20);
      expect(findPlayer(harness.instance.game.getSnapshot(), playerId).position).toEqual(detachedPosition);

      const resumed = await harness.open();
      const resumedWelcome = await resumed.welcome("Ada Returning", firstWelcome.resumeToken);
      expect(resumedWelcome.resumed).toBe(true);
      expect(resumedWelcome.playerId).toBe(playerId);
      expect(resumedWelcome.resumeWindowMs).toBe(RECONNECT_GRACE_MS);
      const resumedPlayer = findPlayer(resumedWelcome.snapshot, playerId);
      expect(resumedPlayer.connected).toBe(true);
      expect(resumableState(resumedPlayer)).toEqual(detachedState);
      expect(harness.instance.game.getSnapshot().players).toHaveLength(1);

      resumed.send({
        type: "input",
        seq: 42,
        move: { x: 0, z: 1 },
        aim: { x: 1, z: 0 },
        attacking: false,
      });
      await waitUntil(
        () => {
          const state = harness.instance.game.players.get(playerId);
          return state?.lastInputSeq === 42 && state.move.x === 0 && state.move.z === 1;
        },
        "first post-resume input sequence",
      );

      const newest = await harness.open();
      const newestWelcome = await newest.welcome("Ada Newest", resumedWelcome.resumeToken);
      expect(newestWelcome.resumed).toBe(true);
      expect(newestWelcome.playerId).toBe(playerId);
      await resumed.waitForClose();

      await delay(RECONNECT_GRACE_MS + 35);
      const fencedPlayer = findPlayer(harness.instance.game.getSnapshot(), playerId);
      expect(fencedPlayer.connected).toBe(true);
      expect(harness.instance.game.getSnapshot().players).toHaveLength(1);

      newest.send({
        type: "input",
        seq: 43,
        move: { x: -1, z: 0 },
        aim: { x: 0, z: 1 },
        attacking: false,
      });
      await waitUntil(
        () => {
          const state = harness.instance.game.players.get(playerId);
          return state?.lastInputSeq === 43 && state.move.x === -1 && state.move.z === 0;
        },
        "newest duplicate-token socket authority",
      );
    } finally {
      await harness.stop();
    }
  });

  test("keeps one server-owned Cinder Wall through Ashcaller disconnect and resume", async () => {
    const harness = createHarness();
    try {
      const original = await harness.open();
      const firstWelcome = await original.welcome("Ash Wall Owner");
      const playerId = firstWelcome.playerId;

      await claimAndReady(harness, original, playerId, "ashcaller");
      original.send({ type: "start" });
      await waitUntil(() => harness.instance.game.phase === "defense", "active Ashcaller defense");

      const internals = harness.instance.game as unknown as {
        enemies: Map<string, unknown>;
        spawnTimer: number;
        cinderWalls: Map<string, unknown>;
      };
      internals.enemies.clear();
      internals.spawnTimer = 9_999;
      const player = harness.instance.game.players.get(playerId)!;
      player.position = { x: 5, z: -8 };

      original.send({ type: "level_ability", slot: "ability2" });
      await waitUntil(
        () => harness.instance.game.players.get(playerId)?.abilityRanks.ability2 === 1,
        "learned Cinder Wall",
      );
      original.send({
        type: "input",
        seq: 1,
        move: { x: 0, z: 0 },
        aim: { x: 0, z: -1 },
        attacking: false,
      });
      await waitUntil(
        () => harness.instance.game.players.get(playerId)?.lastInputSeq === 1,
        "authoritative Cinder Wall aim",
      );
      original.send({ type: "cast", slot: "ability2" });
      await waitUntil(
        () => visibleCinderWalls(harness.instance.game.getSnapshot(), playerId).length === 1,
        "active Cinder Wall",
      );

      const activeSnapshot = harness.instance.game.getSnapshot();
      const activeWalls = visibleCinderWalls(activeSnapshot, playerId);
      expect(activeWalls).toHaveLength(1);
      const activeWall = activeWalls[0]!;
      const wallId = activeWall.id;
      const activeRemaining = activeWall.remaining;
      const activeIdentity = cinderWallIdentity(activeWall);
      expect([...internals.cinderWalls.keys()]).toEqual([wallId]);

      original.close();
      await original.waitForClose();
      await waitUntil(
        () => !findPlayer(harness.instance.game.getSnapshot(), playerId).connected,
        "detached Ashcaller with active wall",
      );

      const detachedWalls = visibleCinderWalls(harness.instance.game.getSnapshot(), playerId);
      expect(detachedWalls).toHaveLength(1);
      expect(cinderWallIdentity(detachedWalls[0]!)).toEqual(activeIdentity);
      const detachedRemaining = detachedWalls[0]!.remaining;
      expect(detachedRemaining).toBeLessThanOrEqual(activeRemaining);
      expect(detachedWalls[0]!.remaining).toBeGreaterThan(0);
      expect([...internals.cinderWalls.keys()]).toEqual([wallId]);

      const resumed = await harness.open();
      const resumedWelcome = await resumed.welcome(
        "Ash Wall Owner Returning",
        firstWelcome.resumeToken,
      );
      expect(resumedWelcome.resumed).toBe(true);
      expect(resumedWelcome.playerId).toBe(playerId);
      const resumedWalls = visibleCinderWalls(resumedWelcome.snapshot, playerId);
      expect(resumedWalls).toHaveLength(1);
      expect(cinderWallIdentity(resumedWalls[0]!)).toEqual(activeIdentity);
      expect(resumedWalls[0]!.remaining).toBeLessThanOrEqual(detachedRemaining);
      expect(resumedWalls[0]!.remaining).toBeGreaterThan(0);
      expect([...internals.cinderWalls.keys()]).toEqual([wallId]);
      expect(findPlayer(resumedWelcome.snapshot, playerId).connected).toBe(true);
    } finally {
      await harness.stop();
    }
  });

  test("keeps one earned Splitbolt lineage through Riftstalker disconnect and resume", async () => {
    const harness = createHarness();
    try {
      const original = await harness.open();
      const firstWelcome = await original.welcome("Rift Bolt Owner");
      const playerId = firstWelcome.playerId;

      await claimAndReady(harness, original, playerId, "riftstalker");
      original.send({ type: "start" });
      await waitUntil(() => harness.instance.game.phase === "defense", "active Riftstalker defense");

      type InternalProjectile = ProjectileSnapshot & {
        damage: number;
        pierce: number;
        hitIds: Set<string>;
        splitTriggered?: boolean;
        reservedForkIds?: [string, string];
      };
      const internals = harness.instance.game as unknown as {
        enemies: Map<string, {
          position: Vec2;
          hp: number;
          radius: number;
          speed: number;
        }>;
        projectiles: Map<string, InternalProjectile>;
        spawnTimer: number;
        spawnEnemy(lane: "north", kind: "imp", position: Vec2): string | null;
      };
      internals.enemies.clear();
      internals.spawnTimer = 9_999;

      const player = harness.instance.game.players.get(playerId)!;
      player.position = { x: 20, z: 0 };
      original.send({ type: "level_ability", slot: "ability2" });
      await waitUntil(
        () => harness.instance.game.players.get(playerId)?.abilityRanks.ability2 === 1,
        "learned Splitbolt",
      );
      original.send({
        type: "input",
        seq: 1,
        move: { x: 0, z: 0 },
        aim: { x: 0, z: -1 },
        attacking: false,
      });
      await waitUntil(
        () => harness.instance.game.players.get(playerId)?.lastInputSeq === 1,
        "authoritative Splitbolt aim",
      );

      const targetPosition: Vec2 = { x: 20, z: -35 };
      const targetId = internals.spawnEnemy("north", "imp", targetPosition);
      expect(targetId).not.toBeNull();
      const target = internals.enemies.get(targetId!)!;
      target.position = { ...targetPosition };
      target.speed = 0;
      target.hp = 30;

      original.send({ type: "cast", slot: "ability2" });
      await waitUntil(
        () => {
          const splitbolts = ownedSplitbolts(harness.instance.game.getSnapshot(), playerId);
          return splitbolts.length === 1 && splitbolts[0]?.splitStage === "seed";
        },
        "active Splitbolt seed",
      );

      const activeSeed = ownedSplitbolts(harness.instance.game.getSnapshot(), playerId)[0]!;
      const seedInternal = internals.projectiles.get(activeSeed.id)!;
      const reservedForkIds = [...seedInternal.reservedForkIds!] as [string, string];
      const seedDamage = seedInternal.damage;
      expect(SPLITBOLT_FORK_ANGLE_RADIANS).toBe(0.22);
      expect(seedDamage).toBe(47);
      expect(seedInternal.pierce).toBe(SPLITBOLT_SEED_PIERCE);
      expect(activeSeed.splitStage).toBe("seed");
      expect(activeSeed.velocity).toEqual({ x: 0, z: -SPLITBOLT_SPEED });
      expect(activeSeed.radius).toBe(SPLITBOLT_SEED_RADIUS);
      expect(new Set(reservedForkIds).size).toBe(2);
      expect(internals.projectiles.has(reservedForkIds[0])).toBe(false);
      expect(internals.projectiles.has(reservedForkIds[1])).toBe(false);

      original.close();
      await original.waitForClose();
      await waitUntil(
        () => !findPlayer(harness.instance.game.getSnapshot(), playerId).connected,
        "detached Riftstalker with active Splitbolt seed",
      );

      const detachedSeedProjectiles = ownedSplitbolts(harness.instance.game.getSnapshot(), playerId);
      expect(detachedSeedProjectiles).toHaveLength(1);
      const detachedSeed = detachedSeedProjectiles[0]!;
      expect(detachedSeed.id).toBe(activeSeed.id);
      expect(detachedSeed.splitStage).toBe("seed");
      expect(detachedSeed.velocity).toEqual(activeSeed.velocity);
      expect(detachedSeed.radius).toBe(activeSeed.radius);
      expect(detachedSeed.remaining).toBeLessThanOrEqual(activeSeed.remaining);
      expect(detachedSeed.remaining).toBeGreaterThan(0);
      expect(detachedSeed.position.x).toBe(activeSeed.position.x);
      expect(detachedSeed.position.z).toBeLessThanOrEqual(activeSeed.position.z);
      expect(internals.projectiles.get(activeSeed.id)?.reservedForkIds).toEqual(reservedForkIds);

      const resumed = await harness.open();
      const resumedWelcome = await resumed.welcome(
        "Rift Bolt Owner Returning",
        firstWelcome.resumeToken,
      );
      expect(resumedWelcome.resumed).toBe(true);
      expect(resumedWelcome.playerId).toBe(playerId);
      const resumedSeedProjectiles = ownedSplitbolts(resumedWelcome.snapshot, playerId);
      expect(resumedSeedProjectiles).toHaveLength(1);
      const resumedSeed = resumedSeedProjectiles[0]!;
      expect(resumedSeed.id).toBe(activeSeed.id);
      expect(resumedSeed.splitStage).toBe("seed");
      expect(resumedSeed.velocity).toEqual(activeSeed.velocity);
      expect(resumedSeed.radius).toBe(activeSeed.radius);
      expect(resumedSeed.remaining).toBeLessThanOrEqual(detachedSeed.remaining);
      expect(resumedSeed.remaining).toBeGreaterThan(0);
      expect(internals.projectiles.get(activeSeed.id)?.reservedForkIds).toEqual(reservedForkIds);

      resumed.send({
        type: "input",
        seq: 2,
        move: { x: 0, z: 0 },
        aim: { x: 1, z: 0 },
        attacking: false,
      });
      await waitUntil(
        () => harness.instance.game.players.get(playerId)?.lastInputSeq === 2,
        "post-resume Riftstalker re-aim",
      );
      const resumedPlayer = harness.instance.game.players.get(playerId)!;
      resumedPlayer.equipment[0] = "runebound_focus";
      resumedPlayer.position = { x: 40, z: 40 };

      await waitUntil(
        () => {
          const splitbolts = ownedSplitbolts(harness.instance.game.getSnapshot(), playerId);
          return splitbolts.length === 3 &&
            splitbolts.filter((projectile) => projectile.splitStage === "fork").length === 2;
        },
        "earned Splitbolt forks after resume",
      );

      const earned = ownedSplitbolts(harness.instance.game.getSnapshot(), playerId);
      expect(earned.map((projectile) => projectile.id)).toEqual([
        activeSeed.id,
        ...reservedForkIds,
      ]);
      expect(new Set(earned.map((projectile) => projectile.id)).size).toBe(3);
      expect(earned.map((projectile) => projectile.splitStage)).toEqual(["seed", "fork", "fork"]);
      expect(findPlayer(harness.instance.game.getSnapshot(), playerId).stats.abilityPower).toBeCloseTo(1.15);

      const expectedForkX = Math.sin(SPLITBOLT_FORK_ANGLE_RADIANS) * SPLITBOLT_SPEED;
      const expectedForkZ = -Math.cos(SPLITBOLT_FORK_ANGLE_RADIANS) * SPLITBOLT_SPEED;
      expect(earned[0]!.velocity).toEqual({ x: 0, z: -SPLITBOLT_SPEED });
      expect(earned[1]!.velocity.x).toBeCloseTo(-expectedForkX);
      expect(earned[1]!.velocity.z).toBeCloseTo(expectedForkZ);
      expect(earned[2]!.velocity.x).toBeCloseTo(expectedForkX);
      expect(earned[2]!.velocity.z).toBeCloseTo(expectedForkZ);
      expect(earned[1]!.position.x + earned[2]!.position.x).toBeCloseTo(targetPosition.x * 2);
      expect(earned[1]!.position.z).toBeCloseTo(earned[2]!.position.z);
      expect(earned[0]!.radius).toBe(SPLITBOLT_SEED_RADIUS);
      expect(earned[1]!.radius).toBe(SPLITBOLT_FORK_RADIUS);
      expect(earned[2]!.radius).toBe(SPLITBOLT_FORK_RADIUS);
      expect(earned[1]!.remaining).toBeCloseTo(earned[2]!.remaining);
      expect(earned[1]!.remaining).toBeLessThanOrEqual(SPLITBOLT_LIFETIME_SECONDS);
      expect(earned[1]!.remaining).toBeGreaterThan(SPLITBOLT_LIFETIME_SECONDS - 0.2);
      expect(earned[1]!.remaining).toBeGreaterThan(earned[0]!.remaining);

      const earnedSeedInternal = internals.projectiles.get(activeSeed.id)!;
      expect(earnedSeedInternal.damage).toBe(seedDamage);
      expect(earnedSeedInternal.radius).toBe(SPLITBOLT_SEED_RADIUS);
      expect(earnedSeedInternal.splitTriggered).toBe(true);
      for (const id of reservedForkIds) {
        const fork = internals.projectiles.get(id)!;
        expect(fork.damage).toBe(seedDamage);
        expect(fork.pierce).toBe(SPLITBOLT_FORK_PIERCE);
        expect(fork.radius).toBe(SPLITBOLT_FORK_RADIUS);
        expect(fork.splitTriggered).toBeUndefined();
        expect(fork.reservedForkIds).toBeUndefined();
      }

      await delay(60);
      expect(ownedSplitbolts(harness.instance.game.getSnapshot(), playerId).map(({ id }) => id)).toEqual([
        activeSeed.id,
        ...reservedForkIds,
      ]);
    } finally {
      await harness.stop();
    }
  });

  test("rejects invalid and tokenless handshakes terminally while a run is active", async () => {
    const harness = createHarness();
    try {
      const owner = await harness.open();
      const ownerWelcome = await owner.welcome("Ada");
      await claimAndReady(harness, owner, ownerWelcome.playerId, "warden");
      owner.send({ type: "start" });
      await waitUntil(() => harness.instance.game.phase === "defense", "active defense");

      const invalid = await harness.open();
      const invalidCursor = invalid.sendHello("Intruder", "not-a-valid-resume-token");
      const invalidError = await invalid.waitFor(
        (message) => message.type === "error" && message.code === "SESSION_EXPIRED",
        invalidCursor,
      );
      expect(invalidError.type).toBe("error");
      const invalidClose = await invalid.waitForClose();
      expect([1008, 1013]).toContain(invalidClose.code);
      expect(invalid.messages.slice(invalidCursor).some((message) => message.type === "welcome")).toBe(false);

      const tokenless = await harness.open();
      const tokenlessCursor = tokenless.sendHello("Latecomer");
      const tokenlessError = await tokenless.waitFor(
        (message) => message.type === "error" && message.code === "GAME_IN_PROGRESS",
        tokenlessCursor,
      );
      expect(tokenlessError.type).toBe("error");
      const tokenlessClose = await tokenless.waitForClose();
      expect([1008, 1013]).toContain(tokenlessClose.code);
      expect(tokenless.messages.slice(tokenlessCursor).some((message) => message.type === "welcome")).toBe(false);

      const snapshot = harness.instance.game.getSnapshot();
      expect(snapshot.players).toHaveLength(1);
      expect(findPlayer(snapshot, ownerWelcome.playerId).connected).toBe(true);
    } finally {
      await harness.stop();
    }
  });

  test("expires detached players, resets a fully abandoned run, and treats stale lobby tokens as fresh", async () => {
    const harness = createHarness();
    try {
      const host = await harness.open();
      const hostWelcome = await host.welcome("Ada");
      const ally = await harness.open();
      const allyWelcome = await ally.welcome("Bryn");

      await claimAndReady(harness, host, hostWelcome.playerId, "warden");
      await claimAndReady(harness, ally, allyWelcome.playerId, "riftstalker");
      host.send({ type: "start" });
      await waitUntil(() => harness.instance.game.phase === "defense", "two-player defense");

      ally.close();
      await ally.waitForClose();
      await waitUntil(
        () => harness.instance.game.getSnapshot().players.some((player) => player.id === allyWelcome.playerId && !player.connected),
        "detached ally",
      );
      await waitUntil(
        () => !harness.instance.game.players.has(allyWelcome.playerId),
        "ally grace expiry",
        RECONNECT_GRACE_MS * 4,
      );
      expect(harness.instance.game.phase).toBe("defense");
      expect(harness.instance.game.getSnapshot().players.map((player) => player.id)).toEqual([hostWelcome.playerId]);

      host.close();
      await host.waitForClose();
      await waitUntil(
        () => harness.instance.game.players.size === 0 && harness.instance.game.phase === "lobby",
        "final abandoned-run reset",
        RECONNECT_GRACE_MS * 4,
      );

      const fresh = await harness.open();
      const staleWelcome = await fresh.welcome("Ada Fresh", hostWelcome.resumeToken);
      expect(staleWelcome.resumed).toBe(false);
      expect(staleWelcome.playerId).not.toBe(hostWelcome.playerId);
      expect(staleWelcome.resumeToken).not.toBe(hostWelcome.resumeToken);
      expect(staleWelcome.snapshot.phase).toBe("lobby");
      expect(staleWelcome.snapshot.players).toHaveLength(1);

      const freshPlayer = findPlayer(staleWelcome.snapshot, staleWelcome.playerId);
      expect(freshPlayer.connected).toBe(true);
      expect(freshPlayer.heroId).toBeNull();
      expect(freshPlayer.gold).toBe(0);
      expect(freshPlayer.equipment).toEqual([null, null, null, null, null, null]);
    } finally {
      await harness.stop();
    }
  });
});
