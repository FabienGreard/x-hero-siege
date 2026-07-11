import type { HeroId } from "./protocol";

export const RANGED_BASIC_PROJECTILE_RADIUS = 0.75;
export const RANGED_BASIC_ACTIVE_SECONDS = 0.06;
export const RIFTSTALKER_BASIC_RECOVERY_SECONDS = 0.04;
export const ASHCALLER_BASIC_RECOVERY_MIN_SECONDS = 0.05;
export const ASHCALLER_BASIC_RECOVERY_INTERVAL_RATIO = 0.18;
export const RIFTSTALKER_BASIC_PIERCE = 2;
export const ASHCALLER_BASIC_BURST_RADIUS = 3;
export const ASHCALLER_BASIC_BURST_DAMAGE_RATIO = 0.5;

export function isRangedHero(heroId: HeroId | null): heroId is Extract<HeroId, "riftstalker" | "ashcaller"> {
  return heroId === "riftstalker" || heroId === "ashcaller";
}
