import assert from "node:assert/strict";
import {
  ARMORY_REFORGE_NET_COST,
  ARMORY_SELL_VALUE,
  VENDOR_DEFINITIONS,
  dominantEquipmentStack,
} from "../src/shared/armory-data";
import { createGameServer } from "../src/server/index";
import { goldToUnits } from "../src/server/economy";
import { WRAITH_HOST_MAX_ACTIVE_PER_OWNER } from "../src/shared/wraith-host";
import type {
  EquipmentSlots,
  GameSnapshot,
  HeroId,
  HeroStatsSnapshot,
  ServerMessage,
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
      ["tempered_edge", "fleetstep_greaves"],
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

  const gravePeer = peers[3]!;
  const graveId = gravePeer.playerId;
  gravePeer.send({ type: "level_ability", slot: "ability3" });
  await gravePeer.snapshot((snapshot) => {
    const player = snapshot.players.find((candidate) => candidate.id === graveId);
    return player?.abilityRanks.ability3 === 1 && player.skillPoints === 0;
  });
  const hostGame = instance.game as unknown as {
    enemies: Map<string, unknown>;
    spawnTimer: number;
  };
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
  }));
} finally {
  for (const peer of peers) peer.socket.close();
  instance.stop();
}
