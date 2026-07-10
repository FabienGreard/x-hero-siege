import type { EnemyKind } from "../shared/protocol";

export const GOLD_UNITS_PER_GOLD = 12;

export const ENEMY_GOLD_REWARDS: Readonly<Record<EnemyKind, number>> = {
  imp: 1,
  hound: 1,
  brute: 3,
  siege: 35,
  rift_guard: 6,
};

export function goldRewardShareUnits(gold: number, playerCount: number): number {
  const normalizedPlayers = Math.min(4, Math.max(1, Math.floor(playerCount)));
  return Math.round((gold * GOLD_UNITS_PER_GOLD) / normalizedPlayers);
}

export function goldFromUnits(units: number): number {
  return units / GOLD_UNITS_PER_GOLD;
}

export function goldToUnits(gold: number): number {
  return Math.round(gold * GOLD_UNITS_PER_GOLD);
}
