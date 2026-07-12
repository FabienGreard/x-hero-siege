import { ITEM_IDS, type ItemId } from "./item-ids";
import type { EquipmentSlotIndex, EquipmentSlots, VendorId, Vec2 } from "./protocol";
import { ARSENAL_INTERACTION_RADIUS, ARSENAL_POSITION } from "./weapon-data";

export { ITEM_IDS } from "./item-ids";

export const EQUIPMENT_SLOT_COUNT = 6;
export const ARMORY_WARE_PRICE = 60;
export const ARMORY_SELL_VALUE = 30;
export function armoryReforgeNetCost(itemPrice: number): number {
  const normalizedPrice = Number.isFinite(itemPrice) ? Math.max(0, itemPrice) : 0;
  return Math.max(0, normalizedPrice - ARMORY_SELL_VALUE);
}
export const ARMORY_REFORGE_NET_COST = armoryReforgeNetCost(ARMORY_WARE_PRICE);

export type EquipmentPrimaryStatKey =
  | "maxHp"
  | "basicDamage"
  | "moveSpeed"
  | "abilityPower"
  | "cooldownRecovery";

export interface ItemDefinition {
  id: ItemId;
  name: string;
  description: string;
  effectLabel: string;
  primaryStatKey: EquipmentPrimaryStatKey;
  price: number;
  maxHealthFlat: number;
  basicDamagePercent: number;
  moveSpeedPercent: number;
  abilityPowerPercent: number;
  cooldownRecoveryPercent: number;
  modifiers: readonly ItemModifier[];
}

export type ItemModifier =
  | { stat: "maxHealth"; operation: "add"; value: number }
  | { stat: "weaponDamage" | "moveSpeed" | "skillDamage" | "cooldownRecovery"; operation: "addPercent"; value: number };

export interface VendorDefinition {
  id: VendorId;
  name: string;
  position: Vec2;
  interactionRadius: number;
  itemIds: ItemId[];
}

export interface EquipmentStackSummary {
  itemId: ItemId;
  count: number;
  effectiveCount: number;
  totalEffectLabel: string;
}

export interface DominantEquipmentStack {
  itemId: ItemId;
  count: number;
}

export interface EquipmentChangeProjection {
  equipment: EquipmentSlots;
  slotIndex: EquipmentSlotIndex;
  replacedItemId: ItemId | null;
}

export interface EquipmentRemovalProjection {
  equipment: EquipmentSlots;
  slotIndex: EquipmentSlotIndex;
  removedItemId: ItemId;
}

export interface EquipmentModifiers {
  maxHealthFlat: number;
  basicDamagePercent: number;
  moveSpeedPercent: number;
  abilityPowerPercent: number;
  cooldownRecoveryPercent: number;
}

export const ITEM_DEFINITIONS: Record<ItemId, ItemDefinition> = {
  tempered_edge: {
    id: "tempered_edge",
    name: "Tempered Edge",
    description: "City steel honed against the horde.",
    effectLabel: "+20% Basic Damage",
    primaryStatKey: "basicDamage",
    price: ARMORY_WARE_PRICE,
    maxHealthFlat: 0,
    basicDamagePercent: 0.2,
    moveSpeedPercent: 0,
    abilityPowerPercent: 0,
    cooldownRecoveryPercent: 0,
    modifiers: [{ stat: "weaponDamage", operation: "addPercent", value: 0.2 }],
  },
  fleetstep_greaves: {
    id: "fleetstep_greaves",
    name: "Fleetstep Greaves",
    description: "Messenger gear made to outrun a breach.",
    effectLabel: "+10% Move Speed",
    primaryStatKey: "moveSpeed",
    price: ARMORY_WARE_PRICE,
    maxHealthFlat: 0,
    basicDamagePercent: 0,
    moveSpeedPercent: 0.1,
    abilityPowerPercent: 0,
    cooldownRecoveryPercent: 0,
    modifiers: [{ stat: "moveSpeed", operation: "addPercent", value: 0.1 }],
  },
  runebound_focus: {
    id: "runebound_focus",
    name: "Runebound Focus",
    description: "A caged star that sharpens every invocation.",
    effectLabel: "+15% Skill Power",
    primaryStatKey: "abilityPower",
    price: ARMORY_WARE_PRICE,
    maxHealthFlat: 0,
    basicDamagePercent: 0,
    moveSpeedPercent: 0,
    abilityPowerPercent: 0.15,
    cooldownRecoveryPercent: 0,
    modifiers: [{ stat: "skillDamage", operation: "addPercent", value: 0.15 }],
  },
  quickening_sigil: {
    id: "quickening_sigil",
    name: "Quickening Sigil",
    description: "A sliver of time held under glass.",
    effectLabel: "+15% Cooldown Speed",
    primaryStatKey: "cooldownRecovery",
    price: ARMORY_WARE_PRICE,
    maxHealthFlat: 0,
    basicDamagePercent: 0,
    moveSpeedPercent: 0,
    abilityPowerPercent: 0,
    cooldownRecoveryPercent: 0.15,
    modifiers: [{ stat: "cooldownRecovery", operation: "addPercent", value: 0.15 }],
  },
  gateward_plate: {
    id: "gateward_plate",
    name: "Gateward Plate",
    description: "Layered Citadel plate made for the stand after the wall falls.",
    effectLabel: "+15 Max Health",
    primaryStatKey: "maxHp",
    price: ARMORY_WARE_PRICE,
    maxHealthFlat: 15,
    basicDamagePercent: 0,
    moveSpeedPercent: 0,
    abilityPowerPercent: 0,
    cooldownRecoveryPercent: 0,
    modifiers: [{ stat: "maxHealth", operation: "add", value: 15 }],
  },
};

export const VENDOR_DEFINITIONS: Record<VendorId, VendorDefinition> = {
  citadel_arsenal: {
    id: "citadel_arsenal",
    name: "Citadel Arsenal",
    position: ARSENAL_POSITION,
    interactionRadius: ARSENAL_INTERACTION_RADIUS,
    itemIds: [],
  },
  ironbound_forge: {
    id: "ironbound_forge",
    name: "Ironbound Forge",
    position: { x: -20, z: -14.5 },
    interactionRadius: 7,
    itemIds: ["tempered_edge", "fleetstep_greaves", "gateward_plate"],
  },
  veilglass_reliquary: {
    id: "veilglass_reliquary",
    name: "Veilglass Reliquary",
    position: { x: 20, z: -14.5 },
    interactionRadius: 7,
    itemIds: ["runebound_focus", "quickening_sigil"],
  },
};

export function createEmptyEquipment(): EquipmentSlots {
  return [null, null, null, null, null, null];
}

function normalizedStackCount(count: number): number {
  return Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
}

export function effectiveStackCopies(count: number): number {
  return normalizedStackCount(count);
}

export function equipmentCopyCount(
  equipment: ReadonlyArray<ItemId | null>,
  itemId: ItemId,
): number {
  let count = 0;
  for (const equippedItemId of equipment) {
    if (equippedItemId === itemId) count += 1;
  }
  return count;
}

/** Exhaustive, item-owned modifier aggregation shared by authority and previews. */
export function deriveEquipmentModifiers(
  equipment: ReadonlyArray<ItemId | null>,
): EquipmentModifiers {
  const counts = new Map<ItemId, number>();
  for (const itemId of equipment) {
    if (itemId) counts.set(itemId, (counts.get(itemId) ?? 0) + 1);
  }
  const modifiers: EquipmentModifiers = {
    maxHealthFlat: 0,
    basicDamagePercent: 0,
    moveSpeedPercent: 0,
    abilityPowerPercent: 0,
    cooldownRecoveryPercent: 0,
  };
  for (const [itemId, count] of counts) {
    const item = ITEM_DEFINITIONS[itemId];
    for (const modifier of item.modifiers) {
      const value = modifier.value * count;
      if (modifier.stat === "maxHealth") modifiers.maxHealthFlat += value;
      if (modifier.stat === "weaponDamage") modifiers.basicDamagePercent += value;
      if (modifier.stat === "moveSpeed") modifiers.moveSpeedPercent += value;
      if (modifier.stat === "skillDamage") modifiers.abilityPowerPercent += value;
      if (modifier.stat === "cooldownRecovery") modifiers.cooldownRecoveryPercent += value;
    }
  }
  return modifiers;
}

/** Mirrors the six-slot mutation rule without spending or changing authoritative state. */
export function projectEquipmentChange(
  equipment: EquipmentSlots,
  incomingItemId: ItemId,
  replacementSlotIndex: EquipmentSlotIndex | null = null,
): EquipmentChangeProjection | null {
  const candidateIndex = replacementSlotIndex ?? equipment.indexOf(null);
  if (!Number.isInteger(candidateIndex) || candidateIndex < 0 || candidateIndex >= EQUIPMENT_SLOT_COUNT) return null;
  const slotIndex = candidateIndex as EquipmentSlotIndex;
  const replacedItemId = equipment[slotIndex];
  if (replacementSlotIndex !== null && !replacedItemId) return null;
  if (replacedItemId === incomingItemId) return null;
  const nextEquipment = [...equipment] as EquipmentSlots;
  nextEquipment[slotIndex] = incomingItemId;
  return { equipment: nextEquipment, slotIndex, replacedItemId };
}

/** Mirrors an exact-slot sale without spending or changing authoritative state. */
export function projectEquipmentRemoval(
  equipment: EquipmentSlots,
  slotIndex: EquipmentSlotIndex,
  expectedItemId: ItemId | null = null,
): EquipmentRemovalProjection | null {
  if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex >= EQUIPMENT_SLOT_COUNT) return null;
  const removedItemId = equipment[slotIndex];
  if (!removedItemId || (expectedItemId !== null && removedItemId !== expectedItemId)) return null;
  const nextEquipment = [...equipment] as EquipmentSlots;
  nextEquipment[slotIndex] = null;
  return { equipment: nextEquipment, slotIndex, removedItemId };
}

/** Every authoritative full-build target that would produce a real equipment change. */
export function legalEquipmentReplacementSlots(
  equipment: EquipmentSlots,
  incomingItemId: ItemId,
): EquipmentSlotIndex[] {
  if (equipment.some((itemId) => itemId === null)) return [];
  const slots: EquipmentSlotIndex[] = [];
  for (let index = 0; index < EQUIPMENT_SLOT_COUNT; index += 1) {
    const slotIndex = index as EquipmentSlotIndex;
    if (projectEquipmentChange(equipment, incomingItemId, slotIndex)) slots.push(slotIndex);
  }
  return slots;
}

function formatPercent(value: number): string {
  const percent = value * 100;
  return Number.isInteger(percent) ? String(percent) : String(Number(percent.toFixed(1)));
}

function totalEffectLabel(itemId: ItemId, effectiveCount: number): string {
  const item = ITEM_DEFINITIONS[itemId];
  const percentageEffects = [
    [item.basicDamagePercent, "Basic Damage"],
    [item.moveSpeedPercent, "Move Speed"],
    [item.abilityPowerPercent, "Skill Power"],
    [item.cooldownRecoveryPercent, "Cooldown Speed"],
  ] as const;
  const labels = percentageEffects
    .filter(([value]) => value !== 0)
    .map(([value, label]) => `+${formatPercent(value * effectiveCount)}% ${label}`);
  if (item.maxHealthFlat !== 0) labels.unshift(`+${item.maxHealthFlat * effectiveCount} Max Health`);
  return labels.join(" · ");
}

export function summarizeEquipment(equipment: EquipmentSlots): EquipmentStackSummary[] {
  const counts = new Map<ItemId, number>();
  for (const itemId of equipment) {
    if (itemId) counts.set(itemId, (counts.get(itemId) ?? 0) + 1);
  }
  return [...counts].map(([itemId, count]) => {
    const effectiveCount = effectiveStackCopies(count);
    return {
      itemId,
      count,
      effectiveCount,
      totalEffectLabel: totalEffectLabel(itemId, effectiveCount),
    };
  });
}

export function dominantEquipmentStack(equipment: EquipmentSlots): DominantEquipmentStack | null {
  let dominant: DominantEquipmentStack | null = null;
  for (const itemId of equipment) {
    if (!itemId) continue;
    const count = equipmentCopyCount(equipment, itemId);
    if (!dominant || count > dominant.count) {
      dominant = { itemId, count };
    }
  }
  return dominant;
}

export function dominantEquipmentItem(equipment: EquipmentSlots): ItemId | null {
  return dominantEquipmentStack(equipment)?.itemId ?? null;
}

export function isItemId(value: unknown): value is ItemId {
  return typeof value === "string" && (ITEM_IDS as readonly string[]).includes(value);
}

export function isVendorId(value: unknown): value is VendorId {
  return typeof value === "string" && Object.hasOwn(VENDOR_DEFINITIONS, value);
}
