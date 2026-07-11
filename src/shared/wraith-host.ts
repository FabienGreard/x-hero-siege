export const WRAITH_HOST_MAX_STRIKES_PER_SUMMON = 3;
export const WRAITH_HOST_MAX_ACTIVE_PER_OWNER = 5;

export function wraithHostSummonCount(rank: number): number {
  const safeRank = Math.max(0, Math.floor(rank));
  return safeRank <= 0
    ? 0
    : Math.min(WRAITH_HOST_MAX_ACTIVE_PER_OWNER, 2 + safeRank);
}
