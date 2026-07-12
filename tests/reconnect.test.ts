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
const WAIT_TIMEOUT_MS = 4_000;

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
    weaponId: player.weaponId,
    mastery: player.mastery,
    cooldownsBySkillId: player.cooldownsBySkillId,
    basicCombo: player.basicCombo,
    dodge: player.dodge,
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
  _heroId: HeroId,
): Promise<void> {
  peer.send({ type: "set_ready", ready: true });
  await waitUntil(
    () => findPlayer(harness.instance.game.getSnapshot(), playerId).ready,
    `Defender ready state`,
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

      await claimAndReady(harness, original, playerId, "defender");
      original.send({ type: "start" });
      original.send({ type: "buy_weapon", arsenalId: "citadel_arsenal", weaponId: "greatsword" });
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
      authoritative.position = { x: 0, z: 13 };
      authoritative.hp = 143;
      authoritative.barrier = 37;
      authoritative.kills = 19;
      authoritative.abilityRanks = { ability1: 2, ability2: 1, ability3: 1, ultimate: 1 };
      authoritative.skillPoints = 2;
      const masteryPath = [
        "tempered_stance", "cleave", "follow_through", "honed_arc",
        "whirlwind", "sundering_edge", "endless_motion", "rising_slash",
      ] as const;
      let revision = 0;
      for (const nodeId of masteryPath) {
        expect(harness.instance.game.allocateMastery(playerId, "greatsword", nodeId, revision).ok).toBe(true);
        revision += 1;
      }
      for (const [slot, skillId] of [
        ["ability1", "cleave"], ["ability2", "whirlwind"], ["ability3", "rising_slash"],
      ] as const) {
        expect(harness.instance.game.equipSkill(playerId, "greatsword", skillId, slot, revision).ok).toBe(true);
        revision += 1;
      }
      authoritative.cooldownsBySkillId = { cleave: 2.75, whirlwind: 4.5, rising_slash: 1.25 };
      authoritative.basicCombo = 2;
      authoritative.dodgeCharges = 0;
      authoritative.dodgeRechargeRemaining = 3.4;
      authoritative.dodgeInvulnerableRemaining = 0.12;
      authoritative.position = { x: 12.25, z: -9.75 };

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
      const detachedSimulationTime = (harness.instance.game as unknown as { totalTime: number }).totalTime;
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
      const resumedState = resumableState(resumedPlayer);
      const resumedSimulationTime = (harness.instance.game as unknown as { totalTime: number }).totalTime;
      const elapsedWhileDetached = resumedSimulationTime - detachedSimulationTime;
      const { cooldownsBySkillId: detachedCooldowns, dodge: detachedDodge, ...detachedPersistent } = detachedState;
      const { cooldownsBySkillId: resumedCooldowns, dodge: resumedDodge, ...resumedPersistent } = resumedState;
      expect(resumedPersistent).toEqual(detachedPersistent);
      const cooldownDecay = (["cleave", "whirlwind", "rising_slash"] as const).map((skillId) => {
        const before = detachedCooldowns[skillId] ?? 0;
        const after = resumedCooldowns[skillId] ?? 0;
        expect(after).toBeLessThanOrEqual(before);
        expect(Math.abs(after - Math.max(0, before - elapsedWhileDetached))).toBeLessThanOrEqual(0.06);
        return before - after;
      });
      expect(Math.max(...cooldownDecay) - Math.min(...cooldownDecay)).toBeLessThanOrEqual(0.06);
      expect(resumedDodge.charges).toBe(detachedDodge.charges);
      expect(resumedDodge.rechargeRemaining).toBeLessThanOrEqual(detachedDodge.rechargeRemaining);
      expect(Math.abs(resumedDodge.rechargeRemaining - Math.max(0, detachedDodge.rechargeRemaining - elapsedWhileDetached))).toBeLessThanOrEqual(0.06);
      expect(resumed.messages.filter((message) => message.type === "event")).toHaveLength(0);
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

  test("rejects invalid and tokenless handshakes terminally while a run is active", async () => {
    const harness = createHarness();
    try {
      const owner = await harness.open();
      const ownerWelcome = await owner.welcome("Ada");
      await claimAndReady(harness, owner, ownerWelcome.playerId, "defender");
      owner.send({ type: "start" });
      owner.send({ type: "buy_weapon", arsenalId: "citadel_arsenal", weaponId: "greatsword" });
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

      await claimAndReady(harness, host, hostWelcome.playerId, "defender");
      await claimAndReady(harness, ally, allyWelcome.playerId, "defender");
      host.send({ type: "start" });
      host.send({ type: "buy_weapon", arsenalId: "citadel_arsenal", weaponId: "greatsword" });
      ally.send({ type: "buy_weapon", arsenalId: "citadel_arsenal", weaponId: "greatsword" });
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
      expect(freshPlayer.heroId).toBe("defender");
      expect(freshPlayer.gold).toBe(0);
      expect(freshPlayer.equipment).toEqual([null, null, null, null, null, null]);
    } finally {
      await harness.stop();
    }
  });
});
