import type { EffectSnapshot } from "../shared/protocol";

export type WraithImpactPresentation = "default" | "hidden-companion" | "compact-impact";

export function deriveWraithImpactPresentation(
  effect: Pick<EffectSnapshot, "kind" | "sourceSummonId">,
): WraithImpactPresentation {
  if (
    effect.sourceSummonId &&
    (effect.kind === "impact" || effect.kind === "rift_hit" || effect.kind === "souls")
  ) {
    return "hidden-companion";
  }
  return effect.kind === "wraith_impact" ? "compact-impact" : "default";
}
