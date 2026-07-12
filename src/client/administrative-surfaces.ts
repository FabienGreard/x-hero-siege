export type AdministrativeSurface = "stats" | "mastery" | "shop" | "arsenal";
export type AdministrativeSurfaceState = Record<AdministrativeSurface, boolean>;

export function transitionAdministrativeSurface(
  current: AdministrativeSurfaceState,
  target: AdministrativeSurface,
  open: boolean,
): AdministrativeSurfaceState {
  if (!open) return { ...current, [target]: false };
  return { stats: target === "stats", mastery: target === "mastery", shop: target === "shop", arsenal: target === "arsenal" };
}
