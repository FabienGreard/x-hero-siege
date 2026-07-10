import assert from "node:assert/strict";
import { createGameServer } from "../src/server/index";
import type { GameSnapshot, HeroId, ServerMessage } from "../src/shared/protocol";

type Predicate = (message: ServerMessage) => boolean;

class Peer {
  readonly messages: ServerMessage[] = [];
  playerId = "";

  private constructor(readonly socket: WebSocket) {
    socket.addEventListener("message", (event) => {
      this.messages.push(JSON.parse(String(event.data)) as ServerMessage);
    });
  }

  static async connect(url: string): Promise<Peer> {
    const socket = new WebSocket(url);
    const peer = new Peer(socket);
    const welcome = await peer.waitFor((message) => message.type === "welcome");
    assert.equal(welcome.type, "welcome");
    peer.playerId = welcome.playerId;
    return peer;
  }

  send(message: object): void {
    this.socket.send(JSON.stringify(message));
  }

  async waitFor(predicate: Predicate, timeoutMs = 4_000): Promise<ServerMessage> {
    const existing = this.messages.find(predicate);
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

  async snapshot(predicate: (snapshot: GameSnapshot) => boolean): Promise<GameSnapshot> {
    const message = await this.waitFor((candidate) => candidate.type === "snapshot" && predicate(candidate.snapshot));
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

  console.log(JSON.stringify({
    ok: true,
    clients: peers.length,
    phase: synchronized[0]!.phase,
    heroes,
    activeLanes: synchronized[0]!.activeLanes,
    vendors: synchronized[0]!.vendors.map((vendor) => vendor.id),
    tickSpread: Math.max(...synchronized.map((snapshot) => snapshot.tick)) - Math.min(...synchronized.map((snapshot) => snapshot.tick)),
  }));
} finally {
  for (const peer of peers) peer.socket.close();
  instance.stop();
}
