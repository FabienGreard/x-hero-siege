import assert from "node:assert/strict";
import {
  ARMORY_WARE_PRICE,
  VENDOR_DEFINITIONS,
  dominantEquipmentStack,
} from "../src/shared/armory-data";
import { createGameServer } from "../src/server/index";
import { goldToUnits } from "../src/server/economy";
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

  const forgeThresholdBuild: EquipmentSlots = [
    "tempered_edge",
    "tempered_edge",
    "tempered_edge",
    "runebound_focus",
    "fleetstep_greaves",
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
  forgeBuyer.goldUnits = goldToUnits(ARMORY_WARE_PRICE);
  forgeBuyer.position = { ...VENDOR_DEFINITIONS.ironbound_forge.position };
  reliquaryBuyer.equipment = [...reliquaryThresholdBuild] as EquipmentSlots;
  reliquaryBuyer.goldUnits = goldToUnits(ARMORY_WARE_PRICE);
  reliquaryBuyer.position = { ...VENDOR_DEFINITIONS.veilglass_reliquary.position };

  peers[0]!.send({
    type: "replace_item",
    vendorId: "ironbound_forge",
    itemId: "tempered_edge",
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

  const replacements = await Promise.all(peers.map((peer) => peer.snapshot((snapshot) => {
    const forge = snapshot.players.find((player) => player.id === peers[0]!.playerId);
    const reliquary = snapshot.players.find((player) => player.id === peers[1]!.playerId);
    return forge?.equipment[3] === "tempered_edge" &&
      forge.gold === 0 &&
      reliquary?.equipment[3] === "quickening_sigil" &&
      reliquary.gold === 0;
  })));
  const authoritativePlayers = replacements[0]!.players.map((player) => ({
    id: player.id,
    gold: player.gold,
    equipment: player.equipment,
    stats: player.stats,
  }));
  for (const snapshot of replacements) {
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
    "tempered_edge",
    "tempered_edge",
    "tempered_edge",
    "tempered_edge",
    "fleetstep_greaves",
    "quickening_sigil",
  ]);
  assertHeroStats(authoritativeForgeBuyer.stats, {
    maxHp: 190,
    moveSpeed: 11.55,
    basicDamage: 60,
    basicAttackInterval: 0.52,
    abilityPower: 1,
    cooldownRecovery: 1.15,
  });
  assert.deepEqual(dominantEquipmentStack(authoritativeForgeBuyer.equipment), {
    itemId: "tempered_edge",
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
    },
  }));
} finally {
  for (const peer of peers) peer.socket.close();
  instance.stop();
}
