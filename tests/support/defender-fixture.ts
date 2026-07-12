import { expect } from "bun:test";
import { GameWorld } from "../../src/server/game";
import type { AbilitySlot, EnemyKind, Vec2 } from "../../src/shared/protocol";
import type { MasteryNodeId, SkillId } from "../../src/shared/weapon-data";

export function createArmedDefenders(count = 1, options: ConstructorParameters<typeof GameWorld>[0] = {}): GameWorld {
  const game = new GameWorld({ accelerated: true, ...options });
  for (let index = 0; index < count; index += 1) {
    const id = `p${index + 1}`;
    expect(game.addPlayer(id, `Defender ${index + 1}`).ok).toBe(true);
    expect(game.setReady(id, true).ok).toBe(true);
  }
  expect(game.startGame("p1").ok).toBe(true);
  for (let index = 0; index < count; index += 1) {
    expect(game.handleMessage(`p${index + 1}`, {
      type: "buy_weapon",
      arsenalId: "citadel_arsenal",
      weaponId: "greatsword",
    }).ok).toBe(true);
  }
  for (let index = 0; index < 26; index += 1) game.update(0.1);
  expect(game.phase).toBe("defense");
  for (const player of game.players.values()) player.position = { x: 0, z: 0 };
  return game;
}

export function completeArming(game: GameWorld, playerIds: readonly string[]): void {
  for (const playerId of playerIds) {
    expect(game.handleMessage(playerId, {
      type: "buy_weapon", arsenalId: "citadel_arsenal", weaponId: "greatsword",
    }).ok).toBe(true);
  }
  for (let index = 0; index < 26; index += 1) game.update(0.1);
  expect(game.phase).toBe("defense");
}

export function configureGreatsword(
  game: GameWorld,
  playerId: string,
  learnedNodeIds: MasteryNodeId[],
  loadout: Partial<Record<AbilitySlot, SkillId | null>>,
): void {
  const player = game.players.get(playerId)!;
  player.level = Math.max(player.level, learnedNodeIds.length);
  player.weaponAllocations.greatsword = {
    revision: 1,
    spentNodeIds: [...learnedNodeIds],
    unspentPoints: 0,
    loadout: {
      ability1: loadout.ability1 as never ?? null,
      ability2: loadout.ability2 as never ?? null,
      ability3: loadout.ability3 as never ?? null,
      ultimate: loadout.ultimate as never ?? null,
    },
    freeRespecUsed: false,
  };
}

export function spawnTestEnemy(game: GameWorld, kind: EnemyKind, position: Vec2, lane = "north"): string {
  const id = (game as unknown as { spawnEnemy(lane: string, kind: EnemyKind, position: Vec2): string }).spawnEnemy(lane, kind, position);
  expect(id).toBeString();
  return id;
}

export function castAndResolve(game: GameWorld, slot: AbilitySlot, aim: Vec2 = { x: 0, z: -1 }): void {
  const player = game.players.get("p1")!;
  player.aim = { ...aim };
  expect(game.handleMessage("p1", { type: "cast", slot }).ok).toBe(true);
  for (let index = 0; index < 8; index += 1) game.update(0.1);
}
