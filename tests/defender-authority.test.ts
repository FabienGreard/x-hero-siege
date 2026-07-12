import { describe, expect, test } from "bun:test";
import { GameWorld } from "../src/server/game";
import type { AuthoritativeTelemetryEvent } from "../src/server/game";
import { parseClientMessage } from "../src/shared/protocol";
import {
  GREATSWORD_MASTERY_NODES,
  GREATSWORD_NODE_BY_ID,
  deriveMasteryNodeAvailability,
  type MasteryNodeId,
} from "../src/shared/weapon-data";

function readyArmingGame(playerIds = ["p1"]): GameWorld {
  const game = new GameWorld({ accelerated: true });
  for (const playerId of playerIds) {
    expect(game.addPlayer(playerId, `Defender ${playerId}`).ok).toBe(true);
    expect(game.setReady(playerId, true).ok).toBe(true);
  }
  expect(game.startGame(playerIds[0]!).ok).toBe(true);
  expect(game.phase).toBe("arming");
  return game;
}

function buyGreatsword(game: GameWorld, playerId: string): void {
  expect(game.handleMessage(playerId, {
    type: "buy_weapon",
    arsenalId: "citadel_arsenal",
    weaponId: "greatsword",
  }).ok).toBe(true);
}

describe("Forge the First Defender contracts", () => {
  test("canonical graph has thirty stable reachable nodes and explicit multi-skill mutations", () => {
    expect(GREATSWORD_MASTERY_NODES).toHaveLength(30);
    expect(new Set(GREATSWORD_MASTERY_NODES.map((node) => node.id)).size).toBe(30);
    expect(GREATSWORD_NODE_BY_ID.sundering_edge.mutationFor).toEqual(["cleave", "rising_slash"]);
    expect(GREATSWORD_MASTERY_NODES.filter((node) => node.kind === "skill")).toHaveLength(9);
    expect(GREATSWORD_MASTERY_NODES.filter((node) => node.kind === "mastery")).toHaveLength(3);

    const reachable = new Set<MasteryNodeId>();
    while (reachable.size < GREATSWORD_MASTERY_NODES.length) {
      const before = reachable.size;
      for (const node of GREATSWORD_MASTERY_NODES) {
        const requirementsMet = node.prerequisites.length === 0 || (
          node.requiresAllPrerequisites
            ? node.prerequisites.every((id) => reachable.has(id))
            : node.prerequisites.some((id) => reachable.has(id))
        );
        if (requirementsMet) reachable.add(node.id);
      }
      expect(reachable.size).toBeGreaterThan(before);
    }
  });

  test("protocol accepts only the canonical physical Arsenal commands", () => {
    expect(parseClientMessage(JSON.stringify({
      type: "buy_weapon",
      arsenalId: "citadel_arsenal",
      weaponId: "greatsword",
    }))).toEqual({ type: "buy_weapon", arsenalId: "citadel_arsenal", weaponId: "greatsword" });
    expect(parseClientMessage(JSON.stringify({ type: "buy_weapon", arsenalId: "ironbound_forge", weaponId: "greatsword" }))).toBeNull();
    expect(parseClientMessage(JSON.stringify({ type: "buy_weapon", weaponId: "greatsword" }))).toBeNull();
    expect(parseClientMessage(JSON.stringify({ type: "claim_hero", heroId: "defender" }))).toBeNull();
    expect(parseClientMessage(JSON.stringify({ type: "level_ability", slot: "ability1" }))).toBeNull();
  });

  test("arming gives practice weapons and personal gold, then waits and counts down authoritatively", () => {
    const game = readyArmingGame(["p1", "p2"]);
    let snapshot = game.getSnapshot();
    expect(snapshot.players.map((player) => [player.identity, player.weaponId, player.gold])).toEqual([
      ["defender", "practice", 100],
      ["defender", "practice", 100],
    ]);
    expect(snapshot.arming).toMatchObject({ armedPlayerIds: [], waitingPlayerIds: ["p1", "p2"], countdownEndsAt: null });

    buyGreatsword(game, "p1");
    snapshot = game.getSnapshot();
    expect(snapshot.players.find((player) => player.id === "p1")).toMatchObject({ weaponId: "greatsword", gold: 0 });
    expect(snapshot.arming).toMatchObject({ armedPlayerIds: ["p1"], waitingPlayerIds: ["p2"], countdownEndsAt: null });

    buyGreatsword(game, "p2");
    expect(game.getSnapshot().arming?.countdownEndsAt).toBeNumber();
    for (let index = 0; index < 26; index += 1) game.update(0.1);
    expect(game.phase).toBe("defense");
  });

  test("allocation, explicit assignment, mastery exclusion, cooldown identity, respec, and dodge stay authoritative", () => {
    const game = readyArmingGame();
    buyGreatsword(game, "p1");
    game.grantExperience("p1", 10_000);
    const path: MasteryNodeId[] = [
      "tempered_stance",
      "cleave",
      "follow_through",
      "honed_arc",
      "whirlwind",
      "sundering_edge",
      "rising_slash",
      "bladestorm",
    ];
    let revision = 0;
    for (const nodeId of path) {
      expect(deriveMasteryNodeAvailability(nodeId, path.slice(0, revision), 8).state).toBe("legal");
      expect(game.allocateMastery("p1", "greatsword", nodeId, revision).ok).toBe(true);
      revision += 1;
    }
    expect(game.allocateMastery("p1", "greatsword", "unbreakable", revision)).toMatchObject({ ok: false, code: "MASTERY_EXCLUDED" });
    expect(game.getSnapshot().players[0]!.mastery?.equipped).toEqual({ ability1: null, ability2: null, ability3: null, ultimate: null });
    const authority = game.getSnapshot().players[0]!.mastery!;
    expect(authority.excludedNodeIds).toContain("unbreakable");
    expect(authority.unavailableNodeReasons.unbreakable).toContain("Excluded by");
    expect(authority.legalNodeIds).not.toContain("unbreakable");

    expect(game.equipSkill("p1", "greatsword", "cleave", "ability1", revision).ok).toBe(true);
    revision += 1;
    expect(game.equipSkill("p1", "greatsword", "bladestorm", "ultimate", revision).ok).toBe(true);
    revision += 1;
    expect(game.handleMessage("p1", { type: "cast", slot: "ability1" }).ok).toBe(true);
    let player = game.getSnapshot().players[0]!;
    expect(player.cooldownsBySkillId.cleave).toBeGreaterThan(0);
    expect(game.equipSkill("p1", "greatsword", null, "ability1", revision).ok).toBe(true);
    revision += 1;
    expect(game.equipSkill("p1", "greatsword", "cleave", "ability2", revision).ok).toBe(true);
    revision += 1;
    player = game.getSnapshot().players[0]!;
    expect(player.cooldownsBySkillId.cleave).toBeGreaterThan(0);
    for (let index = 0; index < 10; index += 1) game.update(0.1);

    expect(game.respecMastery("p1", "greatsword", revision).ok).toBe(true);
    const reset = game.getSnapshot().players[0]!.mastery!;
    expect(reset.learnedNodeIds).toEqual([]);
    expect(reset.freeRespecUsed).toBe(true);
    expect(game.respecMastery("p1", "greatsword", reset.revision)).toMatchObject({ ok: false, code: "INSUFFICIENT_GOLD" });

    game.handleMessage("p1", { type: "input", seq: 1, move: { x: 0, z: 0 }, aim: { x: 1, z: 0 }, attacking: true });
    game.update(0.01);
    expect(game.getSnapshot().players[0]!.action?.kind).toBe("basic");
    expect(game.handleMessage("p1", { type: "dodge", seq: 2, direction: { x: 1, z: 0 } }).ok).toBe(true);
    player = game.getSnapshot().players[0]!;
    expect(player.action).toBeNull();
    expect(player.dodge).toMatchObject({ charges: 0, rechargeRemaining: 6, rechargeDuration: 6, invulnerable: true });
    expect(game.handleMessage("p1", { type: "dodge", seq: 3, direction: { x: 1, z: 0 } })).toMatchObject({ ok: false, code: "DODGE_RECHARGING" });
  });

  test("test-only telemetry observes resolved authoritative contribution without snapshot growth", () => {
    const events: AuthoritativeTelemetryEvent[] = [];
    const game = new GameWorld({ accelerated: true, telemetry: (event) => events.push(event) });
    expect(game.addPlayer("p1", "Telemetry Defender").ok).toBe(true);
    expect(game.setReady("p1", true).ok).toBe(true);
    expect(game.startGame("p1").ok).toBe(true);
    buyGreatsword(game, "p1");
    for (let index = 0; index < 26; index += 1) game.update(0.1);
    expect(game.debugAdvance().ok).toBe(true);
    expect(game.debugAdvance().ok).toBe(true);
    expect(game.phase).toBe("push");
    const authority = game.players.get("p1")!;
    authority.position = { x: 0, z: -154 };
    game.handleMessage("p1", { type: "input", seq: 1, move: { x: 0, z: 0 }, aim: { x: 0, z: -1 }, attacking: true });
    for (let index = 0; index < 8; index += 1) game.update(0.1);
    expect(events.some((event) => event.actionId === "greatsword_basic" && event.targetClass === "objective" && event.outcome === "damage")).toBe(true);
    expect(JSON.stringify(game.getSnapshot())).not.toContain("actionId");
  });
});
