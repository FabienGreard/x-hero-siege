import { HERO_DEFINITIONS } from "../../src/shared/game-data";
import type {
  AbilitySlot,
  ClientMessage,
  HeroId,
  PlayerSnapshot,
  Vec2,
} from "../../src/shared/protocol";
import { GameWorld, type GameActionResult } from "../../src/server/game";

export const NORMAL_SOLO_DURATION_SECONDS = 120;
export const NORMAL_SOLO_TARGET_GOLD = 60;
export const NORMAL_SOLO_TARGET_GOLD_DEADLINE_SECONDS = 75;
export const NORMAL_SOLO_SEEDS = Array.from(
  { length: 30 },
  (_, index) => Math.imul(index + 1, 0x9e37_79b1) >>> 0,
);

const DT = 1 / 60;
const NORMAL_SOLO_TICKS = NORMAL_SOLO_DURATION_SECONDS / DT;

interface ControllerProfile {
  approachBeyond: number;
  retreatBelow: number;
  attackWithin: number;
  learnOrder: readonly AbilitySlot[];
  castPriority: readonly AbilitySlot[];
}

const CONTROLLER_PROFILES: Record<HeroId, ControllerProfile> = {
  warden: {
    approachBeyond: 4.3,
    retreatBelow: 2.5,
    attackWithin: 7,
    learnOrder: ["ability2", "ability1", "ability3", "ultimate"],
    castPriority: ["ultimate", "ability2", "ability1", "ability3"],
  },
  riftstalker: {
    approachBeyond: 10.5,
    retreatBelow: 8.5,
    attackWithin: HERO_DEFINITIONS.riftstalker.basicRange,
    learnOrder: ["ability2", "ability3", "ability1", "ultimate"],
    castPriority: ["ultimate", "ability2", "ability3", "ability1"],
  },
  ashcaller: {
    approachBeyond: 10.5,
    retreatBelow: 8.5,
    attackWithin: HERO_DEFINITIONS.ashcaller.basicRange,
    learnOrder: ["ability2", "ability3", "ability1", "ultimate"],
    castPriority: ["ultimate", "ability2", "ability3", "ability1"],
  },
  gravebinder: {
    approachBeyond: 4.3,
    retreatBelow: 2.5,
    attackWithin: 7,
    learnOrder: ["ability3", "ability1", "ability2", "ultimate"],
    castPriority: ["ability3", "ultimate", "ability1", "ability2"],
  },
};

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

function normalize(vector: Vec2): Vec2 {
  const magnitude = Math.hypot(vector.x, vector.z);
  return magnitude > 0.0001
    ? { x: vector.x / magnitude, z: vector.z / magnitude }
    : { x: 0, z: -1 };
}

function distance(left: Vec2, right: Vec2): number {
  return Math.hypot(left.x - right.x, left.z - right.z);
}

function requireOk(action: string, result: GameActionResult): void {
  if (result.ok) return;
  throw new Error(`${action} failed: ${result.code} — ${result.message}`);
}

function canCast(
  heroId: HeroId,
  slot: AbilitySlot,
  targetDistance: number,
  player: PlayerSnapshot,
): boolean {
  if (heroId === "ashcaller" && slot === "ability1") return targetDistance <= 7;
  if (heroId === "warden" && slot === "ability1") return targetDistance <= 10;
  if (heroId === "warden" && slot === "ability2") return targetDistance <= 15;
  if (heroId === "warden" && (slot === "ability3" || slot === "ultimate")) {
    return targetDistance <= 17;
  }
  if (heroId === "gravebinder" && slot === "ability2") return player.barrier < 25;
  return targetDistance <= 22;
}

function playerById(game: GameWorld, playerId: string): PlayerSnapshot {
  const player = game.getSnapshot().players.find((candidate) => candidate.id === playerId);
  if (!player) throw new Error(`Normal solo controller lost player ${playerId}.`);
  return player;
}

/**
 * Runs one normal-speed, pre-purchase solo opening through public game actions.
 * It intentionally performs no XP, gold, equipment, cooldown, or position grants.
 */
export function runNormalSoloOpening(
  heroId: HeroId,
  seed: number,
  targetGold = NORMAL_SOLO_TARGET_GOLD,
): NormalSoloResult {
  let randomState = seed >>> 0;
  const random = () => {
    randomState = (Math.imul(randomState, 1_664_525) + 1_013_904_223) >>> 0;
    return randomState / 2 ** 32;
  };

  const game = new GameWorld({ accelerated: false, random });
  const playerId = `normal-solo-${heroId}-${seed}`;
  const profile = CONTROLLER_PROFILES[heroId];
  const send = (message: ClientMessage) => game.handleMessage(playerId, message);
  let inputSequence = 0;
  let nextLearnIndex = 0;
  let completedTicks = 0;
  let downs = 0;
  let minimumHp = HERO_DEFINITIONS[heroId].maxHp;
  let targetGoldReachedAt: number | null = null;

  requireOk("add player", game.addPlayer(playerId, `Normal Solo ${heroId}`));
  requireOk("claim hero", send({ type: "claim_hero", heroId }));
  requireOk("ready hero", send({ type: "set_ready", ready: true }));
  requireOk("start run", send({ type: "start" }));

  while (completedTicks < NORMAL_SOLO_TICKS) {
    const snapshot = game.getSnapshot();
    if (snapshot.phase !== "defense") break;

    let player = playerById(game, playerId);
    while (player.skillPoints > 0) {
      let learned = false;
      for (let offset = 0; offset < profile.learnOrder.length; offset += 1) {
        const index = (nextLearnIndex + offset) % profile.learnOrder.length;
        const result = send({ type: "level_ability", slot: profile.learnOrder[index]! });
        if (!result.ok) continue;
        nextLearnIndex = (index + 1) % profile.learnOrder.length;
        learned = true;
        break;
      }
      if (!learned) break;
      player = playerById(game, playerId);
    }

    const target = [...snapshot.enemies].sort(
      (left, right) => right.position.z - left.position.z,
    )[0];
    let aim: Vec2 = { x: 0, z: -1 };
    let move: Vec2 = aim;
    let targetDistance = Number.POSITIVE_INFINITY;

    if (target) {
      aim = normalize({
        x: target.position.x - player.position.x,
        z: target.position.z - player.position.z,
      });
      targetDistance = distance(target.position, player.position);
      move = targetDistance > profile.approachBeyond
        ? aim
        : targetDistance < profile.retreatBelow
          ? { x: -aim.x, z: -aim.z }
          : { x: -aim.z, z: aim.x };

      for (const slot of profile.castPriority) {
        if (player.cooldowns[slot] > 0 || !canCast(heroId, slot, targetDistance, player)) continue;
        if (send({ type: "cast", slot }).ok) break;
      }
    }

    requireOk("combat input", send({
      type: "input",
      seq: ++inputSequence,
      move,
      aim,
      attacking: targetDistance <= profile.attackWithin,
    }));
    game.update(DT);
    completedTicks += 1;

    for (const event of game.takePendingEvents()) {
      if (event.kind === "player_downed") downs += 1;
    }
    player = playerById(game, playerId);
    minimumHp = Math.min(minimumHp, player.hp);
    if (targetGoldReachedAt === null && player.gold >= targetGold) {
      targetGoldReachedAt = completedTicks * DT;
    }
  }

  const final = game.getSnapshot();
  const player = playerById(game, playerId);
  const northGate = final.gates.find((gate) => gate.lane === "north");
  if (!northGate) throw new Error("Normal solo controller could not read North gate.");

  return {
    heroId,
    seed,
    completedSeconds: completedTicks * DT,
    nexusAliveDefense:
      completedTicks === NORMAL_SOLO_TICKS && final.phase === "defense" && final.nexus.hp > 0,
    nexusHp: final.nexus.hp,
    northGateHp: northGate.hp,
    northGateBreached: northGate.breached,
    downs,
    kills: player.kills,
    gold: player.gold,
    targetGoldReachedAt,
    minimumHp,
    finalHp: player.hp,
    level: player.level,
  };
}
