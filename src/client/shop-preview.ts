import {
  ITEM_DEFINITIONS,
  effectiveStackCopies,
  equipmentCopyCount,
  isStackAttuned,
  projectEquipmentChange,
} from "../shared/armory-data";
import { deriveAbilityImpactReadout } from "../shared/ability-impact";
import { deriveHeroStats } from "../shared/hero-stats";
import type {
  AbilitySlot,
  EquipmentSlotIndex,
  EquipmentSlots,
  HeroId,
  HeroStatsSnapshot,
  ItemId,
} from "../shared/protocol";

export const EQUIPMENT_STAT_FIELDS = [
  { key: "basicDamage", label: "Basic Damage" },
  { key: "maxHp", label: "Max Health" },
  { key: "moveSpeed", label: "Move Speed" },
  { key: "abilityPower", label: "Skill Power" },
  { key: "cooldownRecovery", label: "Cooldown Speed" },
  { key: "basicMoveRetention", label: "LMB Stride" },
] as const satisfies ReadonlyArray<{ key: keyof HeroStatsSnapshot; label: string }>;

export type EquipmentStatKey = (typeof EQUIPMENT_STAT_FIELDS)[number]["key"];

export function equipmentStatFieldForItem(itemId: ItemId): (typeof EQUIPMENT_STAT_FIELDS)[number] {
  const statKey = ITEM_DEFINITIONS[itemId].primaryStatKey;
  const field = EQUIPMENT_STAT_FIELDS.find((candidate) => candidate.key === statKey);
  if (!field) throw new Error(`No equipment preview field for ${itemId}.`);
  return field;
}

function formatNumber(value: number, decimals = 0): string {
  if (!Number.isFinite(value)) return "—";
  return value
    .toFixed(decimals)
    .replace(/\.0+$/, "")
    .replace(/(\.\d*?[1-9])0+$/, "$1");
}

export function formatEquipmentStat(key: EquipmentStatKey, value: number): string {
  if (key === "moveSpeed") return formatNumber(value, 1);
  if (key === "maxHp") return formatNumber(value);
  if (key === "abilityPower" || key === "cooldownRecovery" || key === "basicMoveRetention") {
    return `${formatNumber(value * 100)}%`;
  }
  return formatNumber(value, 1);
}

const ABILITY_SLOTS = [
  "ability1",
  "ability2",
  "ability3",
  "ultimate",
] as const satisfies readonly AbilitySlot[];

export interface LearnedAbilityCooldownProjection {
  slot: AbilitySlot;
  name: string;
  rank: number;
  currentSeconds: number;
  projectedSeconds: number;
  currentValue: string;
  projectedValue: string;
}

/** Exact fresh-cast returns for currently learned abilities whose cooldown changes. */
export function projectLearnedAbilityCooldowns(
  heroId: HeroId,
  abilityRanks: Record<AbilitySlot, number>,
  currentStats: HeroStatsSnapshot,
  projectedStats: HeroStatsSnapshot,
): LearnedAbilityCooldownProjection[] {
  return ABILITY_SLOTS.flatMap((slot) => {
    const rank = abilityRanks[slot] ?? 0;
    const current = deriveAbilityImpactReadout(
      heroId,
      slot,
      rank,
      currentStats.abilityPower,
      currentStats.cooldownRecovery,
    );
    if (!current.learned) return [];
    const projected = deriveAbilityImpactReadout(
      heroId,
      slot,
      rank,
      projectedStats.abilityPower,
      projectedStats.cooldownRecovery,
    );
    if (Math.abs(current.cooldown - projected.cooldown) <= 1e-9) return [];
    return [{
      slot,
      name: current.name,
      rank: current.rank,
      currentSeconds: current.cooldown,
      projectedSeconds: projected.cooldown,
      currentValue: `${formatNumber(current.cooldown, 1)}S`,
      projectedValue: `${formatNumber(projected.cooldown, 1)}S`,
    }];
  });
}

function accessibleLearnedCooldownResult(
  projections: readonly LearnedAbilityCooldownProjection[],
): string {
  if (projections.length === 0) return "";
  const consequences = projections
    .map(({ name, rank, currentSeconds, projectedSeconds }) =>
      `${name} rank ${rank} fresh-cast cooldown ${formatNumber(currentSeconds, 1)} seconds to ${formatNumber(projectedSeconds, 1)} seconds`)
    .join("; ");
  return ` Learned cast returns: ${consequences}.`;
}

export interface CombatStridePreview {
  currentSpeed: number;
  projectedSpeed: number;
  currentValue: string;
  projectedValue: string;
  resultText: string;
  accessibleResult: string;
}

function projectCombatStride(
  current: HeroStatsSnapshot,
  projected: HeroStatsSnapshot,
): CombatStridePreview | null {
  const currentSpeed = current.moveSpeed * current.basicMoveRetention;
  const projectedSpeed = projected.moveSpeed * projected.basicMoveRetention;
  if (Math.abs(currentSpeed - projectedSpeed) <= 1e-9) return null;
  const currentValue = formatNumber(currentSpeed, 1);
  const projectedValue = formatNumber(projectedSpeed, 1);
  return {
    currentSpeed,
    projectedSpeed,
    currentValue,
    projectedValue,
    resultText: currentSpeed <= 0
      ? `COMBAT STRIDE · ${projectedValue} WORLD/S DURING LMB`
      : `COMBAT STRIDE ${currentValue} → ${projectedValue} WORLD/S`,
    accessibleResult: `Combat Stride changes from ${currentSpeed <= 0 ? "locked" : `${currentValue} world units per second`} to ${projectedValue} world units per second during LMB windup and impact. It retains ${formatNumber(projected.basicMoveRetention * 100)} percent Move Speed and does not apply to abilities.`,
  };
}

function appendCombatStrideResult<
  T extends Pick<OrdinaryPurchasePreview, "resultText" | "accessibleResult">,
>(formatted: T, combatStride: CombatStridePreview | null): T {
  if (!combatStride) return formatted;
  return {
    ...formatted,
    resultText: `${formatted.resultText} · ${combatStride.resultText}`,
    accessibleResult: `${formatted.accessibleResult} ${combatStride.accessibleResult}`,
  };
}

export interface OrdinaryPurchasePreviewSource {
  heroId: HeroId | null;
  level: number;
  equipment: EquipmentSlots;
  stats: HeroStatsSnapshot;
  abilityRanks: Record<AbilitySlot, number>;
}

export interface OrdinaryPurchasePreview {
  itemId: ItemId;
  equipment: EquipmentSlots;
  statKey: EquipmentStatKey;
  statLabel: string;
  currentValue: string;
  projectedValue: string;
  resultText: string;
  accessibleResult: string;
  changed: boolean;
  currentCount: number;
  projectedCount: number;
  effectiveProjectedCount: number;
  attunes: boolean;
  combatStride: CombatStridePreview | null;
  learnedCooldowns: LearnedAbilityCooldownProjection[];
}

export interface AcceptedPurchaseImpact {
  itemId: ItemId;
  equipment: EquipmentSlots;
  statKey: EquipmentStatKey;
  statLabel: string;
  currentValue: string;
  projectedValue: string;
  resultText: string;
  accessibleResult: string;
  changed: boolean;
}

export function formatOrdinaryPurchaseResult(
  statKey: EquipmentStatKey,
  statLabel: string,
  current: number,
  projected: number,
  attunes = false,
): Pick<OrdinaryPurchasePreview, "currentValue" | "projectedValue" | "resultText" | "accessibleResult" | "changed"> {
  const currentValue = formatEquipmentStat(statKey, current);
  const projectedValue = formatEquipmentStat(statKey, projected);
  const changed = Math.abs(current - projected) > 1e-9;
  return {
    currentValue,
    projectedValue,
    resultText: changed
      ? `${statLabel.toUpperCase()} ${currentValue} → ${projectedValue}`
      : "NO HERO STAT CHANGE",
    accessibleResult: changed
      ? `${statLabel} ${currentValue} to ${projectedValue}${attunes ? ", and the stack Attunes" : ""}.`
      : "No Hero Stat change.",
    changed,
  };
}

export function projectOrdinaryPurchasePreview(
  source: OrdinaryPurchasePreviewSource,
  itemId: ItemId,
): OrdinaryPurchasePreview | null {
  if (!source.heroId) return null;
  const projection = projectEquipmentChange(source.equipment, itemId);
  if (!projection || projection.replacedItemId !== null) return null;

  const field = equipmentStatFieldForItem(itemId);
  const projectedStats = deriveHeroStats(source.heroId, source.level, projection.equipment);
  const currentCount = equipmentCopyCount(source.equipment, itemId);
  const projectedCount = equipmentCopyCount(projection.equipment, itemId);
  const attunes = !isStackAttuned(currentCount) && isStackAttuned(projectedCount);
  const combatStride = projectCombatStride(source.stats, projectedStats);
  const learnedCooldowns = Math.abs(source.stats.cooldownRecovery - projectedStats.cooldownRecovery) > 1e-9
    ? projectLearnedAbilityCooldowns(
        source.heroId,
        source.abilityRanks,
        source.stats,
        projectedStats,
      )
    : [];
  const formatted = formatOrdinaryPurchaseResult(
    field.key,
    field.label,
    source.stats[field.key],
    projectedStats[field.key],
    attunes,
  );

  return {
    itemId,
    equipment: projection.equipment,
    statKey: field.key,
    statLabel: field.label,
    ...formatted,
    currentCount,
    projectedCount,
    effectiveProjectedCount: effectiveStackCopies(projectedCount),
    attunes,
    combatStride,
    learnedCooldowns,
    accessibleResult: `${formatted.accessibleResult}${
      combatStride ? ` ${combatStride.accessibleResult}` : ""
    }${accessibleLearnedCooldownResult(learnedCooldowns)}`,
  };
}

/**
 * Reconstructs the exact incoming-stat result of an accepted purchase from the
 * last authoritative player snapshot. A non-null slot is the established
 * full-build replacement path; ordinary purchases still use first-empty.
 */
export function projectAcceptedPurchaseImpact(
  source: OrdinaryPurchasePreviewSource,
  itemId: ItemId,
  replacementSlotIndex: EquipmentSlotIndex | null = null,
): AcceptedPurchaseImpact | null {
  if (!source.heroId) return null;
  const projection = projectEquipmentChange(
    source.equipment,
    itemId,
    replacementSlotIndex,
  );
  if (!projection) return null;
  const field = equipmentStatFieldForItem(itemId);
  const projectedStats = deriveHeroStats(source.heroId, source.level, projection.equipment);
  return {
    itemId,
    equipment: projection.equipment,
    statKey: field.key,
    statLabel: field.label,
    ...appendCombatStrideResult(
      formatOrdinaryPurchaseResult(
        field.key,
        field.label,
        source.stats[field.key],
        projectedStats[field.key],
      ),
      projectCombatStride(source.stats, projectedStats),
    ),
  };
}
