import type { AbilitySlot, ClientMessage, HeroId, PlayerSnapshot, Vec2 } from "../../src/shared/protocol";
import { GameWorld, type GameActionResult } from "../../src/server/game";
import type { MasteryNodeId, StandardSkillId } from "../../src/shared/weapon-data";

export const NORMAL_SOLO_DURATION_SECONDS = 120;
export const NORMAL_SOLO_TARGET_GOLD = 60;
export const NORMAL_SOLO_TARGET_GOLD_DEADLINE_SECONDS = 75;
export const NORMAL_SOLO_SEEDS = Array.from({ length: 30 }, (_, index) => Math.imul(index + 1, 0x9e37_79b1) >>> 0);
const DT = 1 / 60;

const PATH: readonly MasteryNodeId[] = [
  "tempered_stance", "cleave", "follow_through", "honed_arc", "whirlwind",
  "sundering_edge", "endless_motion", "rising_slash", "bladestorm",
];
const STANDARD_LOADOUT: readonly StandardSkillId[] = ["cleave", "whirlwind", "rising_slash"];

export interface NormalSoloResult {
  heroId: HeroId;
  seed: number;
  completedSeconds: number;
  nexusAliveDefense: boolean;
  nexusHp: number;
  northGateHp: number;
  northGateBreached: boolean;
  downs: number;
  kills: number;
  gold: number;
  targetGoldReachedAt: number | null;
  minimumHp: number;
  finalHp: number;
  level: number;
}

const normalize = (vector: Vec2): Vec2 => {
  const magnitude = Math.hypot(vector.x, vector.z);
  return magnitude > 0.0001 ? { x: vector.x / magnitude, z: vector.z / magnitude } : { x: 0, z: -1 };
};
const distance = (left: Vec2, right: Vec2) => Math.hypot(left.x - right.x, left.z - right.z);

function requireOk(action: string, result: GameActionResult): void {
  if (!result.ok) throw new Error(`${action} failed: ${result.code} - ${result.message}`);
}

function playerById(game: GameWorld, playerId: string): PlayerSnapshot {
  const player = game.getSnapshot().players.find((candidate) => candidate.id === playerId);
  if (!player) throw new Error(`Normal solo controller lost player ${playerId}.`);
  return player;
}

export function progressDefenderMastery(game: GameWorld, playerId: string): void {
  let player = playerById(game, playerId);
  while (player.mastery && player.mastery.learnedNodeIds.length < player.mastery.pointBudget) {
    const nodeId = PATH.find((candidate) => !player.mastery!.learnedNodeIds.includes(candidate));
    if (!nodeId) break;
    const result = game.handleMessage(playerId, {
      type: "allocate_mastery", weaponId: "greatsword", nodeId, expectedRevision: player.mastery.revision,
    });
    if (!result.ok) break;
    player = playerById(game, playerId);
  }
  if (!player.mastery || player.mastery.loadoutMutationContext === "none") return;
  for (let index = 0; index < STANDARD_LOADOUT.length; index += 1) {
    const skillId = STANDARD_LOADOUT[index]!;
    const slot = (["ability1", "ability2", "ability3"] as const)[index]!;
    player = playerById(game, playerId);
    if (!player.mastery?.learnedNodeIds.includes(skillId) || player.mastery.equipped[slot] === skillId) continue;
    game.handleMessage(playerId, {
      type: "assign_skill", weaponId: "greatsword", skillId, slot, expectedRevision: player.mastery.revision,
    });
  }
  player = playerById(game, playerId);
  if (player.mastery?.learnedNodeIds.includes("bladestorm") && player.mastery.equipped.ultimate !== "bladestorm") {
    game.handleMessage(playerId, {
      type: "assign_skill", weaponId: "greatsword", skillId: "bladestorm", slot: "ultimate", expectedRevision: player.mastery.revision,
    });
  }
}

export function runNormalSoloOpening(heroId: HeroId, seed: number, targetGold = NORMAL_SOLO_TARGET_GOLD): NormalSoloResult {
  let randomState = seed >>> 0;
  const random = () => {
    randomState = (Math.imul(randomState, 1_664_525) + 1_013_904_223) >>> 0;
    return randomState / 2 ** 32;
  };
  const game = new GameWorld({ accelerated: false, random });
  const playerId = `normal-solo-${heroId}-${seed}`;
  const send = (message: ClientMessage) => game.handleMessage(playerId, message);
  let inputSequence = 0;
  let elapsed = 0;
  let downs = 0;
  let minimumHp = 150;
  let targetGoldReachedAt: number | null = null;

  requireOk("add player", game.addPlayer(playerId, `Normal Solo ${heroId}`));
  requireOk("ready", send({ type: "set_ready", ready: true }));
  requireOk("start", send({ type: "start" }));
  requireOk("buy Greatsword", send({ type: "buy_weapon", arsenalId: "citadel_arsenal", weaponId: "greatsword" }));
  progressDefenderMastery(game, playerId);
  while (game.phase === "arming") game.update(DT);

  while (elapsed < NORMAL_SOLO_DURATION_SECONDS && game.phase === "defense") {
    const snapshot = game.getSnapshot();
    let player = playerById(game, playerId);
    progressDefenderMastery(game, playerId);
    player = playerById(game, playerId);
    const target = [...snapshot.enemies].sort((left, right) => right.position.z - left.position.z)[0];
    let aim: Vec2 = { x: 0, z: -1 };
    let move: Vec2 = aim;
    let targetDistance = Number.POSITIVE_INFINITY;
    if (target) {
      aim = normalize({ x: target.position.x - player.position.x, z: target.position.z - player.position.z });
      targetDistance = distance(target.position, player.position);
      move = targetDistance > 4.5 ? aim : targetDistance < 2.3 ? { x: -aim.x, z: -aim.z } : { x: -aim.z, z: aim.x };
      for (const slot of ["ultimate", "ability2", "ability1", "ability3"] as readonly AbilitySlot[]) {
        if (player.cooldowns[slot] <= 0 && send({ type: "cast", slot }).ok) break;
      }
    }
    send({ type: "input", seq: ++inputSequence, move, aim, attacking: targetDistance <= 7 });
    game.update(DT);
    elapsed += DT;
    const updated = playerById(game, playerId);
    minimumHp = Math.min(minimumHp, updated.hp);
    if (player.downed === false && updated.downed) downs += 1;
    if (targetGoldReachedAt === null && updated.gold >= targetGold) targetGoldReachedAt = elapsed;
  }

  const snapshot = game.getSnapshot();
  const player = playerById(game, playerId);
  const north = snapshot.gates.find((gate) => gate.lane === "north")!;
  return {
    heroId, seed, completedSeconds: elapsed, nexusAliveDefense: snapshot.nexus.hp > 0,
    nexusHp: snapshot.nexus.hp, northGateHp: north.hp, northGateBreached: north.breached,
    downs, kills: player.kills, gold: player.gold, targetGoldReachedAt,
    minimumHp, finalHp: player.hp, level: player.level,
  };
}
