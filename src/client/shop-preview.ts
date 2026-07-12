import {
  ITEM_DEFINITIONS,
  effectiveStackCopies,
  equipmentCopyCount,
  projectEquipmentChange,
} from "../shared/armory-data";
import { deriveHeroStats } from "../shared/hero-stats";
import type {
  AbilitySlot,
  EquipmentSlotIndex,
  EquipmentSlots,
  HeroId,
  HeroStatsSnapshot,
  ItemId,
} from "../shared/protocol";
import type { EquippedWeaponId } from "../shared/weapon-data";
import { SKILL_DEFINITIONS, isSkillId, type SkillId } from "../shared/weapon-data";
import type { MasterySnapshot } from "../shared/protocol";

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
  skillId: SkillId;
  slot: AbilitySlot;
  name: string;
  currentSeconds: number;
  projectedSeconds: number;
  currentValue: string;
  projectedValue: string;
}

/** Exact fresh-cast returns for currently learned abilities whose cooldown changes. */
export function projectLearnedSkillCooldowns(
  mastery: MasterySnapshot | null,
  currentStats: HeroStatsSnapshot,
  projectedStats: HeroStatsSnapshot,
): LearnedAbilityCooldownProjection[] {
  if (!mastery) return [];
  return ABILITY_SLOTS.flatMap((slot) => {
    const skillId = mastery.equipped[slot];
    if (!skillId || !isSkillId(skillId)) return [];
    const definition = SKILL_DEFINITIONS[skillId];
    const currentCooldown = definition.cooldown / currentStats.cooldownRecovery;
    const projectedCooldown = definition.cooldown / projectedStats.cooldownRecovery;
    if (Math.abs(currentCooldown - projectedCooldown) <= 1e-9) return [];
    return [{
      skillId,
      slot,
      name: definition.name,
      currentSeconds: currentCooldown,
      projectedSeconds: projectedCooldown,
      currentValue: `${formatNumber(currentCooldown, 1)}S`,
      projectedValue: `${formatNumber(projectedCooldown, 1)}S`,
    }];
  });
}

function accessibleLearnedCooldownResult(
  projections: readonly LearnedAbilityCooldownProjection[],
): string {
  if (projections.length === 0) return "";
  const consequences = projections
    .map(({ name, currentSeconds, projectedSeconds }) =>
      `${name} fresh-cast cooldown ${formatNumber(currentSeconds, 1)} seconds to ${formatNumber(projectedSeconds, 1)} seconds`)
    .join("; ");
  return ` Learned cast returns: ${consequences}.`;
}

export interface OrdinaryPurchasePreviewSource {
  heroId: HeroId | null;
  level: number;
  equipment: EquipmentSlots;
  stats: HeroStatsSnapshot;
  mastery: MasterySnapshot | null;
  weaponId: EquippedWeaponId;
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
): Pick<OrdinaryPurchasePreview, "currentValue" | "projectedValue" | "resultText" | "accessibleResult" | "changed"> {
  const currentValue = formatEquipmentStat(statKey, current);
  const projectedValue = formatEquipmentStat(statKey, projected);
  const changed = Math.abs(current - projected) > 1e-9;
  return {
    currentValue,
    projectedValue,
    resultText: changed
      ? `${statLabel.toUpperCase()} ${currentValue} → ${projectedValue}`
      : "NO BUILD STAT CHANGE",
    accessibleResult: changed
      ? `${statLabel} ${currentValue} to ${projectedValue}.`
      : "No Build stat change.",
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
  const projectedStats = deriveHeroStats(source.heroId, source.level, projection.equipment, source.weaponId);
  const currentCount = equipmentCopyCount(source.equipment, itemId);
  const projectedCount = equipmentCopyCount(projection.equipment, itemId);
  const learnedCooldowns = Math.abs(source.stats.cooldownRecovery - projectedStats.cooldownRecovery) > 1e-9
    ? projectLearnedSkillCooldowns(
        source.mastery,
        source.stats,
        projectedStats,
      )
    : [];
  const formatted = formatOrdinaryPurchaseResult(
    field.key,
    field.label,
    source.stats[field.key],
    projectedStats[field.key],
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
    learnedCooldowns,
    accessibleResult: `${formatted.accessibleResult}${accessibleLearnedCooldownResult(learnedCooldowns)}`,
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
  const projectedStats = deriveHeroStats(source.heroId, source.level, projection.equipment, source.weaponId);
  return {
    itemId,
    equipment: projection.equipment,
    statKey: field.key,
    statLabel: field.label,
    ...formatOrdinaryPurchaseResult(
      field.key,
      field.label,
      source.stats[field.key],
      projectedStats[field.key],
    ),
  };
}
