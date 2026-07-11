import assert from "node:assert/strict";
import {
  ARMORY_REFORGE_NET_COST,
  ARMORY_SELL_VALUE,
  VENDOR_DEFINITIONS,
  dominantEquipmentStack,
} from "../src/shared/armory-data";
import { createGameServer } from "../src/server/index";
import { goldToUnits } from "../src/server/economy";
import {
  CINDER_WALL_BASE_HALF_WIDTH,
  CINDER_WALL_END_DISTANCE,
  CINDER_WALL_START_DISTANCE,
} from "../src/shared/cinder-wall";
import {
  SPLITBOLT_FORK_ANGLE_RADIANS,
  SPLITBOLT_FORK_PIERCE,
  SPLITBOLT_FORK_RADIUS,
  SPLITBOLT_LIFETIME_SECONDS,
  SPLITBOLT_SEED_PIERCE,
  SPLITBOLT_SEED_RADIUS,
  SPLITBOLT_SPEED,
} from "../src/shared/splitbolt";
import { WRAITH_HOST_MAX_ACTIVE_PER_OWNER } from "../src/shared/wraith-host";
import type {
  EffectSnapshot,
  EquipmentSlots,
  GameSnapshot,
  HeroId,
  HeroStatsSnapshot,
  ProjectileSnapshot,
  ServerMessage,
  Vec2,
} from "../src/shared/protocol";

type Predicate = (message: ServerMessage) => boolean;

function assertHeroStats(
  actual: HeroStatsSnapshot,
  expected: HeroStatsSnapshot,
): void {
  for (const key of Object.keys(expected) as Array<keyof HeroStatsSnapshot>) {
    assert.ok(
      Math.abs(actual[key] - expected[key]) < 1e-9,
      `${key}: expected ${expected[key]}, received ${actual[key]}`,
    );
  }
}

function ownedCinderEffects(snapshot: GameSnapshot, ownerId: string): EffectSnapshot[] {
  return snapshot.effects.filter((effect) =>
    effect.ownerId === ownerId &&
    (effect.kind === "cinder_wall" || effect.kind === "cinder_wall_companion")
  );
}

function ownedSplitbolts(snapshot: GameSnapshot, ownerId: string): ProjectileSnapshot[] {
  return snapshot.projectiles.filter((projectile) =>
    projectile.ownerId === ownerId && projectile.kind === "splitbolt"
  );
}

function assertClose(actual: number, expected: number, label: string): void {
  assert.ok(
    Math.abs(actual - expected) < 1e-9,
    `${label}: expected ${expected}, received ${actual}`,
  );
}

class Peer {
  readonly messages: ServerMessage[] = [];
  playerId = "";
  resumeToken = "";
  resumed = false;

  private constructor(readonly socket: WebSocket) {
    socket.addEventListener("message", (event) => {
      this.messages.push(JSON.parse(String(event.data)) as ServerMessage);
    });
  }

  static async connect(url: string, resumeToken?: string): Promise<Peer> {
    const socket = new WebSocket(url);
    const peer = new Peer(socket);
    socket.addEventListener("open", () => {
      socket.send(JSON.stringify({
        type: "hello",
        name: "Smoke Defender",
        ...(resumeToken ? { resumeToken } : {}),
      }));
    }, { once: true });
    const welcome = await peer.waitFor((message) => message.type === "welcome");
    assert.equal(welcome.type, "welcome");
    peer.playerId = welcome.playerId;
    peer.resumeToken = welcome.resumeToken;
    peer.resumed = welcome.resumed;
    return peer;
  }

  send(message: object): void {
    this.socket.send(JSON.stringify(message));
  }

  async waitFor(predicate: Predicate, cursor = 0, timeoutMs = 4_000): Promise<ServerMessage> {
    const existing = this.messages.slice(cursor).find(predicate);
    if (existing) return existing;
    return await new Promise<ServerMessage>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.socket.removeEventListener("message", onMessage);
        reject(new Error("Timed out waiting for WebSocket message"));
      }, timeoutMs);
      const onMessage = (event: MessageEvent) => {
        const message = JSON.parse(String(event.data)) as ServerMessage;
        if (!predicate(message)) return;
        clearTimeout(timeout);
        this.socket.removeEventListener("message", onMessage);
        resolve(message);
      };
      this.socket.addEventListener("message", onMessage);
    });
  }

  async snapshot(predicate: (snapshot: GameSnapshot) => boolean, cursor = 0): Promise<GameSnapshot> {
    const message = await this.waitFor((candidate) => candidate.type === "snapshot" && predicate(candidate.snapshot), cursor);
    assert.equal(message.type, "snapshot");
    return message.snapshot;
  }
}

const instance = createGameServer({ port: 0, hostname: "127.0.0.1", accelerated: true });
const url = `ws://127.0.0.1:${instance.server.port}/ws`;
const peers: Peer[] = [];

try {
  for (let index = 0; index < 4; index++) peers.push(await Peer.connect(url));

  const heroes: HeroId[] = ["warden", "riftstalker", "ashcaller", "gravebinder"];
  peers[0]!.send({ type: "claim_hero", heroId: "warden" });
  await peers[0]!.snapshot((snapshot) => snapshot.lobby.claimedHeroes.warden === peers[0]!.playerId);

  peers[1]!.send({ type: "claim_hero", heroId: "warden" });
  const rejection = await peers[1]!.waitFor((message) => message.type === "error" && message.code === "HERO_TAKEN");
  assert.equal(rejection.type, "error");

  for (let index = 1; index < peers.length; index++) {
    peers[index]!.send({ type: "claim_hero", heroId: heroes[index] });
  }
  await peers[0]!.snapshot((snapshot) => Object.keys(snapshot.lobby.claimedHeroes).length === 4);

  for (const peer of peers) peer.send({ type: "set_ready", ready: true });
  await peers[0]!.snapshot((snapshot) => snapshot.lobby.canStart);
  peers[0]!.send({ type: "start" });

  const synchronized = await Promise.all(peers.map((peer) => peer.snapshot((snapshot) => snapshot.phase === "defense" && snapshot.players.length === 4)));
  for (const snapshot of synchronized) {
    assert.equal(snapshot.phase, "defense");
    assert.equal(snapshot.gates.length, 4);
    assert.deepEqual(snapshot.activeLanes, ["north", "east", "south", "west"]);
    assert.deepEqual(snapshot.vendors.map((vendor) => vendor.id), ["ironbound_forge", "veilglass_reliquary"]);
    assert.deepEqual(snapshot.vendors.map((vendor) => vendor.itemIds), [
      ["tempered_edge", "fleetstep_greaves", "gateward_plate"],
      ["runebound_focus", "quickening_sigil"],
    ]);
    assert.deepEqual(new Set(snapshot.players.map((player) => player.heroId)), new Set(heroes));
    for (const player of snapshot.players) {
      assert.equal(player.skillPoints, 1);
      assert.deepEqual(player.abilityRanks, { ability1: 0, ability2: 0, ability3: 0, ultimate: 0 });
    }
  }

  peers[0]!.send({ type: "level_ability", slot: "ability1" });
  const learned = await peers[0]!.snapshot((snapshot) => {
    const player = snapshot.players.find((candidate) => candidate.id === peers[0]!.playerId);
    return player?.abilityRanks.ability1 === 1 && player.skillPoints === 0;
  });
  assert.equal(learned.players.find((player) => player.id === peers[0]!.playerId)!.abilityRanks.ability1, 1);

  peers[0]!.send({ type: "cast", slot: "ability1" });
  const windingUp = await peers[0]!.snapshot((snapshot) => {
    const player = snapshot.players.find((candidate) => candidate.id === peers[0]!.playerId);
    return player?.action?.kind === "ability1" && player.action.phase === "windup";
  });
  assert.equal(windingUp.players.find((player) => player.id === peers[0]!.playerId)!.action?.phase, "windup");

  const hostGame = instance.game as unknown as {
    enemies: Map<string, {
      position: Vec2;
      hp: number;
      radius: number;
      speed: number;
    }>;
    projectiles: Map<string, ProjectileSnapshot & {
      damage: number;
      pierce: number;
      hitIds: Set<string>;
      splitTriggered?: boolean;
      reservedForkIds?: [string, string];
    }>;
    spawnTimer: number;
    spawnEnemy(lane: "north", kind: "imp", position: Vec2): string | null;
  };
  hostGame.enemies.clear();
  hostGame.spawnTimer = 9_999;

  const riftPeer = peers[1]!;
  const riftId = riftPeer.playerId;
  const riftOrigin: Vec2 = { x: -24, z: -4 };
  const splitTarget: Vec2 = { x: -24, z: -20 };
  const riftState = instance.game.players.get(riftId)!;
  riftState.position = { ...riftOrigin };
  riftState.action = null;
  riftPeer.send({ type: "level_ability", slot: "ability2" });
  await riftPeer.snapshot((snapshot) => {
    const player = snapshot.players.find((candidate) => candidate.id === riftId);
    return player?.abilityRanks.ability2 === 1 && player.skillPoints === 0;
  });
  riftPeer.send({
    type: "input",
    seq: 1,
    move: { x: 0, z: 0 },
    aim: { x: 0, z: -1 },
    attacking: false,
  });
  await riftPeer.snapshot((snapshot) => {
    const player = snapshot.players.find((candidate) => candidate.id === riftId);
    return player?.lastInputSeq === 1 && player.aim.x === 0 && player.aim.z === -1;
  });

  const splitEnemyId = hostGame.spawnEnemy("north", "imp", splitTarget);
  assert.notEqual(splitEnemyId, null);
  const splitEnemy = hostGame.enemies.get(splitEnemyId!)!;
  splitEnemy.position = { ...splitTarget };
  splitEnemy.speed = 0;
  splitEnemy.hp = 30;

  riftPeer.send({ type: "cast", slot: "ability2" });
  const splitSeedAuthority = await riftPeer.snapshot((snapshot) => {
    const splitbolts = ownedSplitbolts(snapshot, riftId);
    return splitbolts.length === 1 && splitbolts[0]?.splitStage === "seed";
  });
  const splitSeedTick = splitSeedAuthority.tick;
  const splitSeedSnapshots = await Promise.all(peers.map((peer) =>
    peer.snapshot((snapshot) => snapshot.tick === splitSeedTick)
  ));
  const authoritativeSeedProjectiles = ownedSplitbolts(splitSeedAuthority, riftId);
  assert.equal(authoritativeSeedProjectiles.length, 1);
  const splitSeed = authoritativeSeedProjectiles[0]!;
  assert.equal(SPLITBOLT_FORK_ANGLE_RADIANS, 0.22);
  assert.equal(splitSeed.splitStage, "seed");
  assert.deepEqual(splitSeed.velocity, { x: 0, z: -SPLITBOLT_SPEED });
  assert.equal(splitSeed.radius, SPLITBOLT_SEED_RADIUS);
  for (const snapshot of splitSeedSnapshots) {
    assert.deepEqual(ownedSplitbolts(snapshot, riftId), authoritativeSeedProjectiles);
  }

  const internalSeed = hostGame.projectiles.get(splitSeed.id)!;
  const reservedForkIds = [...internalSeed.reservedForkIds!] as [string, string];
  assert.equal(internalSeed.damage, 47);
  assert.equal(internalSeed.pierce, SPLITBOLT_SEED_PIERCE);
  assert.equal(internalSeed.radius, SPLITBOLT_SEED_RADIUS);
  assert.equal(new Set(reservedForkIds).size, 2);
  assert.equal(hostGame.projectiles.has(reservedForkIds[0]), false);
  assert.equal(hostGame.projectiles.has(reservedForkIds[1]), false);

  const splitForkAuthority = await riftPeer.snapshot((snapshot) => {
    const splitbolts = ownedSplitbolts(snapshot, riftId);
    return splitbolts.length === 3 &&
      splitbolts.filter((projectile) => projectile.splitStage === "seed").length === 1 &&
      splitbolts.filter((projectile) => projectile.splitStage === "fork").length === 2;
  });
  const splitForkTick = splitForkAuthority.tick;
  const splitForkSnapshots = await Promise.all(peers.map((peer) =>
    peer.snapshot((snapshot) => snapshot.tick === splitForkTick)
  ));
  const authoritativeSplitbolts = ownedSplitbolts(splitForkAuthority, riftId);
  for (const snapshot of splitForkSnapshots) {
    assert.deepEqual(ownedSplitbolts(snapshot, riftId), authoritativeSplitbolts);
  }

  const earnedSeed = authoritativeSplitbolts.find((projectile) => projectile.id === splitSeed.id)!;
  const leftFork = authoritativeSplitbolts.find((projectile) => projectile.id === reservedForkIds[0])!;
  const rightFork = authoritativeSplitbolts.find((projectile) => projectile.id === reservedForkIds[1])!;
  assert.ok(earnedSeed);
  assert.ok(leftFork);
  assert.ok(rightFork);
  assert.equal(earnedSeed.splitStage, "seed");
  assert.equal(leftFork.splitStage, "fork");
  assert.equal(rightFork.splitStage, "fork");
  assert.equal(new Set(authoritativeSplitbolts.map((projectile) => projectile.id)).size, 3);
  assert.deepEqual(authoritativeSplitbolts.map((projectile) => projectile.id), [
    splitSeed.id,
    ...reservedForkIds,
  ]);

  const expectedForkX = Math.sin(SPLITBOLT_FORK_ANGLE_RADIANS) * SPLITBOLT_SPEED;
  const expectedForkZ = -Math.cos(SPLITBOLT_FORK_ANGLE_RADIANS) * SPLITBOLT_SPEED;
  assertClose(leftFork.velocity.x, -expectedForkX, "left fork velocity x");
  assertClose(leftFork.velocity.z, expectedForkZ, "left fork velocity z");
  assertClose(rightFork.velocity.x, expectedForkX, "right fork velocity x");
  assertClose(rightFork.velocity.z, expectedForkZ, "right fork velocity z");
  for (const projectile of authoritativeSplitbolts) {
    assertClose(Math.hypot(projectile.velocity.x, projectile.velocity.z), SPLITBOLT_SPEED, `${projectile.id} speed`);
  }
  assert.equal(earnedSeed.radius, SPLITBOLT_SEED_RADIUS);
  assert.equal(leftFork.radius, SPLITBOLT_FORK_RADIUS);
  assert.equal(rightFork.radius, SPLITBOLT_FORK_RADIUS);
  assertClose(leftFork.remaining, rightFork.remaining, "fork remaining lifetime");
  assert.ok(leftFork.remaining <= SPLITBOLT_LIFETIME_SECONDS);
  assert.ok(leftFork.remaining > SPLITBOLT_LIFETIME_SECONDS - 0.2);
  assert.ok(leftFork.remaining > earnedSeed.remaining);
  assertClose(leftFork.position.x + rightFork.position.x, splitTarget.x * 2, "fork horizontal symmetry");
  assertClose(leftFork.position.z, rightFork.position.z, "fork forward symmetry");
  assertClose(earnedSeed.position.x, splitTarget.x, "seed lane axis");
  assert.equal(hostGame.projectiles.get(earnedSeed.id)?.splitTriggered, true);
  for (const forkId of reservedForkIds) {
    const fork = hostGame.projectiles.get(forkId)!;
    assert.equal(fork.damage, 47);
    assert.equal(fork.pierce, SPLITBOLT_FORK_PIERCE);
    assert.equal(fork.radius, SPLITBOLT_FORK_RADIUS);
    assert.equal(fork.splitTriggered, undefined);
    assert.equal(fork.reservedForkIds, undefined);
  }
  for (const state of instance.game.players.values()) {
    state.goldUnits = 0;
    state.xp = 0;
    state.kills = 0;
  }

  const ashPeer = peers[2]!;
  const ashId = ashPeer.playerId;
  const ashOrigin = { x: 7, z: -11 };
  const ashState = instance.game.players.get(ashId)!;
  ashState.position = { ...ashOrigin };
  ashState.action = null;
  ashPeer.send({ type: "level_ability", slot: "ability2" });
  await ashPeer.snapshot((snapshot) => {
    const player = snapshot.players.find((candidate) => candidate.id === ashId);
    return player?.abilityRanks.ability2 === 1 && player.skillPoints === 0;
  });
  ashPeer.send({
    type: "input",
    seq: 1,
    move: { x: 0, z: 0 },
    aim: { x: 0, z: -1 },
    attacking: false,
  });
  await ashPeer.snapshot((snapshot) => {
    const player = snapshot.players.find((candidate) => candidate.id === ashId);
    return player?.lastInputSeq === 1 && player.aim.x === 0 && player.aim.z === -1;
  });

  ashPeer.send({ type: "cast", slot: "ability2" });
  const cinderAuthority = await ashPeer.snapshot((snapshot) => {
    const effects = ownedCinderEffects(snapshot, ashId);
    return effects.filter((effect) => effect.kind === "cinder_wall").length === 1 &&
      effects.filter((effect) => effect.kind === "cinder_wall_companion").length === 4;
  });
  const cinderTick = cinderAuthority.tick;
  const cinderSnapshots = await Promise.all(peers.map((peer) =>
    peer.snapshot((snapshot) => snapshot.tick === cinderTick)
  ));
  const authoritativeCinderEffects = ownedCinderEffects(cinderAuthority, ashId);
  for (const snapshot of cinderSnapshots) {
    assert.deepEqual(ownedCinderEffects(snapshot, ashId), authoritativeCinderEffects);
  }

  const visibleCinder = authoritativeCinderEffects.filter((effect) => effect.kind === "cinder_wall");
  const cinderCompanions = authoritativeCinderEffects.filter(
    (effect) => effect.kind === "cinder_wall_companion",
  );
  assert.equal(visibleCinder.length, 1);
  assert.equal(cinderCompanions.length, 4);
  assert.equal(new Set(authoritativeCinderEffects.map((effect) => effect.id)).size, 5);
  assert.deepEqual(visibleCinder[0]!.position, {
    x: ashOrigin.x,
    z: ashOrigin.z - (CINDER_WALL_START_DISTANCE + CINDER_WALL_END_DISTANCE) * 0.5,
  });
  assert.equal(visibleCinder[0]!.radius, CINDER_WALL_BASE_HALF_WIDTH);
  assert.ok(Math.abs(visibleCinder[0]!.rotation - Math.PI * 0.5) < 1e-9);
  assert.deepEqual(cinderCompanions.map((effect) => effect.position),
    [2, 3, 4, 5].map((step) => ({
      x: ashOrigin.x,
      z: ashOrigin.z - step * CINDER_WALL_START_DISTANCE,
    })),
  );
  for (const effect of cinderCompanions) {
    assert.equal(effect.radius, CINDER_WALL_BASE_HALF_WIDTH);
  }

  const gravePeer = peers[3]!;
  const graveId = gravePeer.playerId;
  gravePeer.send({ type: "level_ability", slot: "ability3" });
  await gravePeer.snapshot((snapshot) => {
    const player = snapshot.players.find((candidate) => candidate.id === graveId);
    return player?.abilityRanks.ability3 === 1 && player.skillPoints === 0;
  });
  hostGame.enemies.clear();
  hostGame.spawnTimer = 9_999;
  gravePeer.send({ type: "cast", slot: "ability3" });
  const firstHosts = await Promise.all(peers.map((peer) => peer.snapshot((snapshot) =>
    snapshot.summons.length === 3 && snapshot.summons.every((summon) => summon.ownerId === graveId)
  )));
  const firstHostIds = firstHosts[0]!.summons.map((summon) => summon.id);
  for (const snapshot of firstHosts) {
    assert.deepEqual(snapshot.summons.map((summon) => summon.id), firstHostIds);
  }

  await gravePeer.snapshot((snapshot) => {
    const player = snapshot.players.find((candidate) => candidate.id === graveId);
    return player?.action === null;
  });
  const graveState = instance.game.players.get(graveId)!;
  graveState.cooldowns.ability3 = 0;
  graveState.action = null;
  gravePeer.send({ type: "cast", slot: "ability3" });
  const boundedHosts = await Promise.all(peers.map((peer) => peer.snapshot((snapshot) =>
    snapshot.summons.length === WRAITH_HOST_MAX_ACTIVE_PER_OWNER &&
    snapshot.summons.every((summon) => summon.ownerId === graveId)
  )));
  const boundedHostIds = boundedHosts[0]!.summons.map((summon) => summon.id);
  assert.equal(boundedHostIds.includes(firstHostIds[0]!), false);
  assert.deepEqual(boundedHostIds.slice(0, 2), firstHostIds.slice(1));
  for (const snapshot of boundedHosts) {
    assert.deepEqual(snapshot.summons.map((summon) => summon.id), boundedHostIds);
  }

  const graveToken = gravePeer.resumeToken;
  const graveDisconnectCursors = peers.map((peer) => peer.messages.length);
  gravePeer.socket.close();
  const reservedHostSnapshots = await Promise.all(peers.slice(0, 3).map((peer, index) => peer.snapshot((snapshot) => {
    const player = snapshot.players.find((candidate) => candidate.id === graveId);
    return player?.connected === false &&
      snapshot.summons.length === WRAITH_HOST_MAX_ACTIVE_PER_OWNER;
  }, graveDisconnectCursors[index])));
  for (const snapshot of reservedHostSnapshots) {
    assert.deepEqual(snapshot.summons.map((summon) => summon.id), boundedHostIds);
  }

  const graveRestoreCursors = peers.map((peer) => peer.messages.length);
  const resumedGravePeer = await Peer.connect(url, graveToken);
  assert.equal(resumedGravePeer.resumed, true);
  assert.equal(resumedGravePeer.playerId, graveId);
  peers[3] = resumedGravePeer;
  const restoredHostSnapshots = await Promise.all(peers.map((peer, index) => peer.snapshot((snapshot) => {
    const player = snapshot.players.find((candidate) => candidate.id === graveId);
    return player?.connected === true &&
      snapshot.summons.length === WRAITH_HOST_MAX_ACTIVE_PER_OWNER;
  }, index === 3 ? 0 : graveRestoreCursors[index])));
  for (const snapshot of restoredHostSnapshots) {
    assert.deepEqual(snapshot.summons.map((summon) => summon.id), boundedHostIds);
  }

  const forgeThresholdBuild: EquipmentSlots = [
    "fleetstep_greaves",
    "fleetstep_greaves",
    "fleetstep_greaves",
    "runebound_focus",
    "tempered_edge",
    "quickening_sigil",
  ];
  const reliquaryThresholdBuild: EquipmentSlots = [
    "runebound_focus",
    "runebound_focus",
    "runebound_focus",
    "runebound_focus",
    "tempered_edge",
    "fleetstep_greaves",
  ];
  const forgeBuyer = instance.game.players.get(peers[0]!.playerId)!;
  const reliquaryBuyer = instance.game.players.get(peers[1]!.playerId)!;
  forgeBuyer.equipment = [...forgeThresholdBuild] as EquipmentSlots;
  forgeBuyer.goldUnits = goldToUnits(ARMORY_REFORGE_NET_COST);
  forgeBuyer.position = { ...VENDOR_DEFINITIONS.ironbound_forge.position };
  reliquaryBuyer.equipment = [...reliquaryThresholdBuild] as EquipmentSlots;
  reliquaryBuyer.goldUnits = goldToUnits(ARMORY_REFORGE_NET_COST);
  reliquaryBuyer.position = { ...VENDOR_DEFINITIONS.veilglass_reliquary.position };

  peers[0]!.send({
    type: "replace_item",
    vendorId: "ironbound_forge",
    itemId: "fleetstep_greaves",
    slotIndex: 3,
    expectedItemId: "runebound_focus",
  });
  peers[1]!.send({
    type: "replace_item",
    vendorId: "veilglass_reliquary",
    itemId: "quickening_sigil",
    slotIndex: 3,
    expectedItemId: "runebound_focus",
  });

  const attunementEvents = await Promise.all(peers.map(async (peer) => {
    const gainedMessage = await peer.waitFor((message) =>
      message.type === "event" &&
      message.event.playerId === peers[0]!.playerId &&
      message.event.attunementTransition?.change === "gained"
    );
    const lostMessage = await peer.waitFor((message) =>
      message.type === "event" &&
      message.event.playerId === peers[1]!.playerId &&
      message.event.attunementTransition?.change === "lost"
    );
    assert.equal(gainedMessage.type, "event");
    assert.equal(lostMessage.type, "event");
    return { gained: gainedMessage.event, lost: lostMessage.event };
  }));
  const authoritativeAttunementEvents = attunementEvents[0]!;
  for (const events of attunementEvents) assert.deepEqual(events, authoritativeAttunementEvents);
  assert.deepEqual(authoritativeAttunementEvents.gained.attunementTransition, {
    itemId: "fleetstep_greaves",
    change: "gained",
    fromCount: 3,
    toCount: 4,
  });
  assert.deepEqual(authoritativeAttunementEvents.lost.attunementTransition, {
    itemId: "runebound_focus",
    change: "lost",
    fromCount: 4,
    toCount: 3,
  });

  const replacements = await Promise.all(peers.map((peer) => peer.snapshot((snapshot) => {
    const forge = snapshot.players.find((player) => player.id === peers[0]!.playerId);
    const reliquary = snapshot.players.find((player) => player.id === peers[1]!.playerId);
    return forge?.equipment[3] === "fleetstep_greaves" &&
      forge.gold === 0 &&
      reliquary?.equipment[3] === "quickening_sigil" &&
      reliquary.gold === 0;
  })));

  const saleCursors = peers.map((peer) => peer.messages.length);
  peers[0]!.send({
    type: "sell_item",
    vendorId: "ironbound_forge",
    slotIndex: 5,
    expectedItemId: "quickening_sigil",
  });
  const saleEvents = await Promise.all(peers.map(async (peer, index) => {
    const message = await peer.waitFor((candidate) =>
      candidate.type === "event" &&
      candidate.event.kind === "item_sold" &&
      candidate.event.playerId === peers[0]!.playerId,
    saleCursors[index]);
    assert.equal(message.type, "event");
    return message.event;
  }));
  for (const event of saleEvents) assert.deepEqual(event, saleEvents[0]);
  assert.equal(saleEvents[0]!.itemId, "quickening_sigil");
  assert.equal(saleEvents[0]!.slotIndex, 5);
  assert.equal(saleEvents[0]!.vendorId, "ironbound_forge");
  assert.equal(saleEvents[0]!.goldDelta, ARMORY_SELL_VALUE);

  const sales = await Promise.all(peers.map((peer) => peer.snapshot((snapshot) => {
    const forge = snapshot.players.find((player) => player.id === peers[0]!.playerId);
    return forge?.equipment[5] === null && forge.gold === ARMORY_SELL_VALUE;
  })));
  const authoritativePlayers = sales[0]!.players.map((player) => ({
    id: player.id,
    gold: player.gold,
    equipment: player.equipment,
    stats: player.stats,
  }));
  for (const snapshot of sales) {
    assert.deepEqual(snapshot.players.map((player) => ({
      id: player.id,
      gold: player.gold,
      equipment: player.equipment,
      stats: player.stats,
    })), authoritativePlayers);
  }
  const authoritativeForgeBuyer = authoritativePlayers.find((player) => player.id === peers[0]!.playerId)!;
  const authoritativeReliquaryBuyer = authoritativePlayers.find((player) => player.id === peers[1]!.playerId)!;
  assert.deepEqual(authoritativeForgeBuyer.equipment, [
    "fleetstep_greaves",
    "fleetstep_greaves",
    "fleetstep_greaves",
    "fleetstep_greaves",
    "tempered_edge",
    null,
  ]);
  assertHeroStats(authoritativeForgeBuyer.stats, {
    maxHp: 190,
    moveSpeed: 15.75,
    basicMoveRetention: 0.15,
    basicDamage: 36,
    basicAttackInterval: 0.52,
    abilityPower: 1,
    cooldownRecovery: 1,
  });
  assert.deepEqual(dominantEquipmentStack(authoritativeForgeBuyer.equipment), {
    itemId: "fleetstep_greaves",
    count: 4,
    attuned: true,
  });
  assert.deepEqual(authoritativeReliquaryBuyer.equipment, [
    "runebound_focus",
    "runebound_focus",
    "runebound_focus",
    "quickening_sigil",
    "tempered_edge",
    "fleetstep_greaves",
  ]);
  assertHeroStats(authoritativeReliquaryBuyer.stats, {
    maxHp: 125,
    moveSpeed: 13.75,
    basicMoveRetention: 0,
    basicDamage: 22.8,
    basicAttackInterval: 0.28,
    abilityPower: 1.45,
    cooldownRecovery: 1.15,
  });
  assert.deepEqual(dominantEquipmentStack(authoritativeReliquaryBuyer.equipment), {
    itemId: "runebound_focus",
    count: 3,
    attuned: false,
  });
  for (const peer of peers.slice(2)) {
    const untouched = authoritativePlayers.find((player) => player.id === peer.playerId)!;
    assert.equal(untouched.gold, 0);
    assert.deepEqual(untouched.equipment, [null, null, null, null, null, null]);
  }

  await peers[0]!.snapshot((snapshot) => {
    const player = snapshot.players.find((candidate) => candidate.id === peers[0]!.playerId);
    return player?.action === null;
  });
  peers[0]!.send({
    type: "input",
    seq: 1,
    move: { x: 1, z: 0 },
    aim: { x: 1, z: 0 },
    attacking: true,
  });
  const strideAuthority = await peers[0]!.snapshot((snapshot) => {
    const player = snapshot.players.find((candidate) => candidate.id === peers[0]!.playerId);
    return player?.action?.kind === "basic" &&
      player.action.phase === "windup" &&
      player.velocity.x > 0 &&
      player.stats.basicMoveRetention === 0.15;
  });
  const strideTick = strideAuthority.tick;
  const strideSnapshots = await Promise.all(peers.map((peer) => peer.snapshot((snapshot) => snapshot.tick === strideTick)));
  const authoritativeStride = strideAuthority.players.find((player) => player.id === peers[0]!.playerId)!;
  for (const snapshot of strideSnapshots) {
    const observed = snapshot.players.find((player) => player.id === peers[0]!.playerId)!;
    assert.ok(Math.abs(observed.velocity.x - 2.3625) < 1e-9);
    assert.equal(observed.velocity.z, 0);
    assert.deepEqual({
      equipment: observed.equipment,
      stats: observed.stats,
      action: observed.action,
      velocity: observed.velocity,
      position: observed.position,
    }, {
      equipment: authoritativeStride.equipment,
      stats: authoritativeStride.stats,
      action: authoritativeStride.action,
      velocity: authoritativeStride.velocity,
      position: authoritativeStride.position,
    });
  }

  const departing = peers[0]!;
  const departingId = departing.playerId;
  const departingToken = departing.resumeToken;
  const disconnectCursors = peers.map((peer) => peer.messages.length);
  departing.socket.close();
  const reservedSnapshots = await Promise.all(peers.slice(1).map((peer, index) => peer.snapshot((snapshot) => {
    const player = snapshot.players.find((candidate) => candidate.id === departingId);
    return snapshot.players.length === 4 && player?.connected === false;
  }, disconnectCursors[index + 1])));
  const reserved = reservedSnapshots[0]!;
  const reservedPlayer = reserved.players.find((player) => player.id === departingId)!;
  assert.equal(reservedPlayer.connected, false);
  assert.equal(reservedPlayer.gold, ARMORY_SELL_VALUE);
  assert.deepEqual(reservedPlayer.equipment, authoritativeForgeBuyer.equipment);
  assertHeroStats(reservedPlayer.stats, authoritativeForgeBuyer.stats);

  const restoreCursors = peers.map((peer) => peer.messages.length);
  const resumedPeer = await Peer.connect(url, departingToken);
  assert.equal(resumedPeer.resumed, true);
  assert.equal(resumedPeer.playerId, departingId);
  peers[0] = resumedPeer;
  const restored = await Promise.all(peers.map((peer, index) => peer.snapshot((snapshot) => {
    const player = snapshot.players.find((candidate) => candidate.id === departingId);
    return snapshot.players.length === 4 &&
      player?.connected === true;
  }, index === 0 ? 0 : restoreCursors[index])));
  for (const snapshot of restored) {
    const player = snapshot.players.find((candidate) => candidate.id === departingId)!;
    assert.equal(player.connected, true);
    assert.equal(player.gold, ARMORY_SELL_VALUE);
    assert.deepEqual(player.equipment, authoritativeForgeBuyer.equipment);
    assertHeroStats(player.stats, authoritativeForgeBuyer.stats);
  }

  await resumedPeer.snapshot((snapshot) => {
    const player = snapshot.players.find((candidate) => candidate.id === departingId);
    return player?.action === null;
  });
  const authorityCursors = peers.map((peer) => peer.messages.length);
  const resumeSequence = Math.max(...restored.map((snapshot) =>
    snapshot.players.find((player) => player.id === departingId)!.lastInputSeq
  )) + 1;
  resumedPeer.send({
    type: "input",
    seq: resumeSequence,
    move: { x: -1, z: 0 },
    aim: { x: -1, z: 0 },
    attacking: true,
  });
  const resumedAuthority = await Promise.all(peers.map((peer, index) => peer.snapshot((snapshot) => {
    const player = snapshot.players.find((candidate) => candidate.id === departingId);
    return player?.lastInputSeq === resumeSequence &&
      player.action?.kind === "basic" &&
      player.action.phase === "windup" &&
      player.velocity.x < 0;
  }, authorityCursors[index])));
  const authoritativeResume = resumedAuthority[0]!.players.find((player) => player.id === departingId)!;
  for (const snapshot of resumedAuthority) {
    const player = snapshot.players.find((candidate) => candidate.id === departingId)!;
    assert.deepEqual({
      connected: player.connected,
      lastInputSeq: player.lastInputSeq,
      action: player.action,
      velocity: player.velocity,
      position: player.position,
    }, {
      connected: true,
      lastInputSeq: resumeSequence,
      action: authoritativeResume.action,
      velocity: authoritativeResume.velocity,
      position: authoritativeResume.position,
    });
  }

  console.log(JSON.stringify({
    ok: true,
    clients: peers.length,
    phase: synchronized[0]!.phase,
    heroes,
    activeLanes: synchronized[0]!.activeLanes,
    vendors: synchronized[0]!.vendors.map((vendor) => vendor.id),
    tickSpread: Math.max(...synchronized.map((snapshot) => snapshot.tick)) - Math.min(...synchronized.map((snapshot) => snapshot.tick)),
    replacements: {
      convergedClients: replacements.length,
      forgeAttunedCopies: 4,
      reliquaryAttunedCopies: 0,
      combatStrideClients: strideSnapshots.length,
      resumedClients: restored.length,
      postResumeAuthorityClients: resumedAuthority.length,
    },
    selling: {
      convergedClients: sales.length,
      eventClients: saleEvents.length,
      gold: ARMORY_SELL_VALUE,
      slot: 5,
    },
    wraithHost: {
      convergedClients: boundedHosts.length,
      maxActive: boundedHostIds.length,
      reservedClients: reservedHostSnapshots.length,
      resumedClients: restoredHostSnapshots.length,
    },
    cinderWall: {
      convergedClients: cinderSnapshots.length,
      visibleEffects: visibleCinder.length,
      companionEffects: cinderCompanions.length,
      effectIds: authoritativeCinderEffects.map((effect) => effect.id),
    },
    splitbolt: {
      seedClients: splitSeedSnapshots.length,
      forkClients: splitForkSnapshots.length,
      seedId: splitSeed.id,
      forkIds: reservedForkIds,
      stages: authoritativeSplitbolts.map((projectile) => projectile.splitStage),
    },
  }));
} finally {
  for (const peer of peers) peer.socket.close();
  instance.stop();
}
