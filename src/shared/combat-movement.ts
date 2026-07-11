import type { ActionSnapshot, HeroStatsSnapshot } from "./protocol";

export const ACTION_RECOVERY_MOVE_RETENTION = 0.45;

/** Canonical authoritative movement retained while a champion action is in progress. */
export function actionMoveRetention(
  action: ActionSnapshot | null,
  stats: HeroStatsSnapshot,
): number {
  if (!action || action.phase === "idle") return 1;
  if (action.phase === "recovery") return ACTION_RECOVERY_MOVE_RETENTION;
  if (action.kind !== "basic") return 0;
  const retention = Number.isFinite(stats.basicMoveRetention) ? stats.basicMoveRetention : 0;
  return Math.max(0, Math.min(1, retention));
}
