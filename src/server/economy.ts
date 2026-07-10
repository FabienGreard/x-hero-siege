export const GOLD_UNITS_PER_GOLD = 12;

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
