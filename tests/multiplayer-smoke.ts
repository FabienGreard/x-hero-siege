import assert from "node:assert/strict";
import { createGameServer } from "../src/server/index";
import { goldToUnits } from "../src/server/economy";
import { VENDOR_DEFINITIONS } from "../src/shared/armory-data";
import type { GameSnapshot, ServerMessage } from "../src/shared/protocol";

type Predicate = (message: ServerMessage) => boolean;

class Peer {
  readonly messages: ServerMessage[] = [];
  playerId = "";
  resumeToken = "";
  resumed = false;

  private constructor(readonly socket: WebSocket) {
    socket.addEventListener("message", (event) => this.messages.push(JSON.parse(String(event.data)) as ServerMessage));
  }

  static async connect(url: string, resumeToken?: string): Promise<Peer> {
    const socket = new WebSocket(url);
    const peer = new Peer(socket);
    socket.addEventListener("open", () => socket.send(JSON.stringify({
      type: "hello", name: "Smoke Defender", ...(resumeToken ? { resumeToken } : {}),
    })), { once: true });
    const welcome = await peer.waitFor((message) => message.type === "welcome");
    assert.equal(welcome.type, "welcome");
    peer.playerId = welcome.playerId;
    peer.resumeToken = welcome.resumeToken;
    peer.resumed = welcome.resumed;
    return peer;
  }

  send(message: object): void { this.socket.send(JSON.stringify(message)); }

  async waitFor(predicate: Predicate, cursor = 0, timeoutMs = 4_000): Promise<ServerMessage> {
    const deadline = performance.now() + timeoutMs;
    while (performance.now() < deadline) {
      const match = this.messages.slice(cursor).find(predicate);
      if (match) return match;
      await Bun.sleep(5);
    }
    throw new Error("Timed out waiting for WebSocket message");
  }

  async snapshot(predicate: (snapshot: GameSnapshot) => boolean, cursor = 0): Promise<GameSnapshot> {
    const message = await this.waitFor((candidate) => candidate.type === "snapshot" && predicate(candidate.snapshot), cursor);
    assert.equal(message.type, "snapshot");
    return message.snapshot;
  }

  close(): void { this.socket.close(1000, "smoke reconnect"); }
}

const instance = createGameServer({ port: 0, hostname: "127.0.0.1", accelerated: true, reconnectGraceMs: 1_000 });
const url = `ws://127.0.0.1:${instance.server.port}/ws`;
const peers: Peer[] = [];

try {
  for (let index = 0; index < 4; index += 1) peers.push(await Peer.connect(url));
  assert.equal(new Set(peers.map((peer) => peer.playerId)).size, 4);
  assert.equal(new Set(peers.map((peer) => peer.resumeToken)).size, 4);

  for (const peer of peers) peer.send({ type: "set_ready", ready: true });
  await peers[0]!.snapshot((snapshot) => snapshot.lobby.canStart);
  peers[0]!.send({ type: "start" });
  await peers[0]!.snapshot((snapshot) => snapshot.phase === "arming");
  for (const peer of peers) peer.send({ type: "buy_weapon", arsenalId: "citadel_arsenal", weaponId: "greatsword" });

  const synchronized = await Promise.all(peers.map((peer) => peer.snapshot(
    (snapshot) => snapshot.phase === "defense" && snapshot.players.every((player) => player.weaponId === "greatsword"),
  )));
  console.log("smoke: arming convergence");
  for (const snapshot of synchronized) {
    assert.deepEqual(snapshot.activeLanes, ["north", "east", "south", "west"]);
    assert.equal(snapshot.players.length, 4);
    assert.ok(snapshot.players.every((player) => player.heroId === "defender"));
    assert.deepEqual(snapshot.vendors.map((vendor) => vendor.id), ["citadel_arsenal", "ironbound_forge", "veilglass_reliquary"]);
  }

  const ownerId = peers[0]!.playerId;
  const owner = instance.game.players.get(ownerId)!;
  instance.game.grantExperience(ownerId, 1_000);
  let revision = instance.game.getSnapshot().players.find((player) => player.id === ownerId)!.mastery!.revision;
  for (const nodeId of ["tempered_stance", "cleave"] as const) {
    peers[0]!.send({ type: "allocate_mastery", weaponId: "greatsword", nodeId, expectedRevision: revision++ });
    await peers[0]!.snapshot((snapshot) => snapshot.players.find((player) => player.id === ownerId)?.mastery?.revision === revision);
  }
  peers[0]!.send({ type: "assign_skill", weaponId: "greatsword", skillId: "cleave", slot: "ability1", expectedRevision: revision });
  revision += 1;
  await peers[0]!.snapshot((snapshot) => snapshot.players.find((player) => player.id === ownerId)?.mastery?.equipped.ability1 === "cleave");
  console.log("smoke: mastery convergence");

  peers[0]!.send({ type: "input", seq: 41, move: { x: 1, z: 0 }, aim: { x: 0, z: -1 }, attacking: false });
  peers[0]!.send({ type: "dodge", seq: 42, direction: { x: 1, z: 0 } });
  peers[0]!.send({ type: "cast", slot: "ability1" });
  const combat = await Promise.all(peers.map((peer) => peer.snapshot((snapshot) => {
    const player = snapshot.players.find((candidate) => candidate.id === ownerId);
    return player?.lastInputSeq === 42 && player.dodge.charges === 0 && (player.cooldownsBySkillId.cleave ?? 0) > 0;
  })));
  console.log("smoke: combat convergence");
  const combatProjection = (snapshot: GameSnapshot) => {
    const player = snapshot.players.find((candidate) => candidate.id === ownerId)!;
    return { mastery: player.mastery, cooldowns: player.cooldownsBySkillId, dodge: player.dodge, seq: player.lastInputSeq };
  };
  for (const snapshot of combat.slice(1)) assert.deepEqual(combatProjection(snapshot), combatProjection(combat[0]!));

  owner.goldUnits = goldToUnits(240);
  owner.position = { ...VENDOR_DEFINITIONS.ironbound_forge.position };
  peers[0]!.send({ type: "buy_item", vendorId: "ironbound_forge", itemId: "tempered_edge" });
  await peers[0]!.snapshot((snapshot) => snapshot.players.find((player) => player.id === ownerId)?.equipment[0] === "tempered_edge");
  owner.equipment = ["tempered_edge", "tempered_edge", "tempered_edge", "tempered_edge", "tempered_edge", "tempered_edge"];
  peers[0]!.send({
    type: "replace_item", vendorId: "ironbound_forge", itemId: "gateward_plate", slotIndex: 3, expectedItemId: "tempered_edge",
  });
  const economy = await peers[1]!.snapshot((snapshot) => snapshot.players.find((player) => player.id === ownerId)?.equipment[3] === "gateward_plate");
  console.log("smoke: economy convergence");
  assert.equal(economy.players.find((player) => player.id === ownerId)!.equipment[3], "gateward_plate");
  for (const peer of peers.slice(1)) {
    const player = economy.players.find((candidate) => candidate.id === peer.playerId)!;
    assert.deepEqual(player.equipment, [null, null, null, null, null, null]);
    assert.equal(player.gold, 0);
  }

  const token = peers[0]!.resumeToken;
  const exactBefore = instance.game.getSnapshot().players.find((player) => player.id === ownerId)!;
  peers[0]!.close();
  await Bun.sleep(30);
  const resumed = await Peer.connect(url, token);
  peers.push(resumed);
  assert.equal(resumed.resumed, true);
  assert.equal(resumed.playerId, ownerId);
  const exactAfter = (await resumed.snapshot((snapshot) => snapshot.players.some((player) => player.id === ownerId && player.connected)))
    .players.find((player) => player.id === ownerId)!;
  console.log("smoke: reconnect convergence");
  assert.deepEqual(exactAfter.equipment, exactBefore.equipment);
  assert.deepEqual(exactAfter.mastery, exactBefore.mastery);
  assert.ok((exactAfter.cooldownsBySkillId.cleave ?? 0) <= (exactBefore.cooldownsBySkillId.cleave ?? 0));
  assert.ok((exactBefore.cooldownsBySkillId.cleave ?? 0) - (exactAfter.cooldownsBySkillId.cleave ?? 0) < 0.1);
  assert.equal(exactAfter.dodge.charges, exactBefore.dodge.charges);
  assert.ok(exactAfter.dodge.rechargeRemaining <= exactBefore.dodge.rechargeRemaining);
  assert.ok(exactBefore.dodge.rechargeRemaining - exactAfter.dodge.rechargeRemaining < 0.1);
  assert.equal(exactAfter.lastInputSeq, exactBefore.lastInputSeq);

  for (const expectedPhase of ["breach", "push", "victory"] as const) {
    assert.equal(instance.game.debugAdvance().ok, true);
    await Promise.all(peers.slice(1).map((peer) => peer.snapshot((snapshot) => snapshot.phase === expectedPhase)));
  }
  const finalSnapshots = await Promise.all(peers.slice(1).map((peer) => peer.snapshot((snapshot) => snapshot.phase === "victory")));
  for (const snapshot of finalSnapshots.slice(1)) {
    assert.deepEqual(snapshot.gates, finalSnapshots[0]!.gates);
    assert.deepEqual(snapshot.nexus, finalSnapshots[0]!.nexus);
    assert.deepEqual(snapshot.riftHeart, finalSnapshots[0]!.riftHeart);
  }

  console.log("Multiplayer Defender authority smoke passed.");
} finally {
  for (const peer of peers) peer.close();
  instance.stop();
}
