import type { EquipmentSlotIndex, EquipmentSlots, ItemId, VendorId, Vec2 } from "./protocol";

export const EQUIPMENT_SLOT_COUNT = 6;
export const ARMORY_WARE_PRICE = 30;

export interface ItemDefinition {
  id: ItemId;
  name: string;
  description: string;
  effectLabel: string;
  price: number;
  basicDamagePercent: number;
  moveSpeedPercent: number;
  abilityPowerPercent: number;
  cooldownRecoveryPercent: number;
}

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
  totalEffectLabel: string;
}

export interface EquipmentChangeProjection {
  equipment: EquipmentSlots;
  slotIndex: EquipmentSlotIndex;
  replacedItemId: ItemId | null;
}

export const ITEM_DEFINITIONS: Record<ItemId, ItemDefinition> = {
  tempered_edge: {
    id: "tempered_edge",
    name: "Tempered Edge",
    description: "City steel honed against the horde.",
    effectLabel: "+20% Basic Damage",
    price: ARMORY_WARE_PRICE,
    basicDamagePercent: 0.2,
    moveSpeedPercent: 0,
    abilityPowerPercent: 0,
    cooldownRecoveryPercent: 0,
  },
  fleetstep_greaves: {
    id: "fleetstep_greaves",
    name: "Fleetstep Greaves",
    description: "Messenger gear made to outrun a breach.",
    effectLabel: "+10% Move Speed",
    price: ARMORY_WARE_PRICE,
    basicDamagePercent: 0,
    moveSpeedPercent: 0.1,
    abilityPowerPercent: 0,
    cooldownRecoveryPercent: 0,
  },
  runebound_focus: {
    id: "runebound_focus",
    name: "Runebound Focus",
    description: "A caged star that sharpens every invocation.",
    effectLabel: "+15% Skill Power",
    price: ARMORY_WARE_PRICE,
    basicDamagePercent: 0,
    moveSpeedPercent: 0,
    abilityPowerPercent: 0.15,
    cooldownRecoveryPercent: 0,
  },
  quickening_sigil: {
    id: "quickening_sigil",
    name: "Quickening Sigil",
    description: "A sliver of time held under glass.",
    effectLabel: "+15% Cooldown Speed",
    price: ARMORY_WARE_PRICE,
    basicDamagePercent: 0,
    moveSpeedPercent: 0,
    abilityPowerPercent: 0,
    cooldownRecoveryPercent: 0.15,
  },
};

export const VENDOR_DEFINITIONS: Record<VendorId, VendorDefinition> = {
  ironbound_forge: {
    id: "ironbound_forge",
    name: "Ironbound Forge",
    position: { x: -20, z: -14.5 },
    interactionRadius: 7,
    itemIds: ["tempered_edge", "fleetstep_greaves"],
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

function formatPercent(value: number): string {
  const percent = value * 100;
  return Number.isInteger(percent) ? String(percent) : String(Number(percent.toFixed(1)));
}

function totalEffectLabel(itemId: ItemId, count: number): string {
  const item = ITEM_DEFINITIONS[itemId];
  const effects = [
    [item.basicDamagePercent, "Basic Damage"],
    [item.moveSpeedPercent, "Move Speed"],
    [item.abilityPowerPercent, "Skill Power"],
    [item.cooldownRecoveryPercent, "Cooldown Speed"],
  ] as const;
  return effects
    .filter(([value]) => value !== 0)
    .map(([value, label]) => `+${formatPercent(value * count)}% ${label}`)
    .join(" · ");
}

export function summarizeEquipment(equipment: EquipmentSlots): EquipmentStackSummary[] {
  const counts = new Map<ItemId, number>();
  for (const itemId of equipment) {
    if (itemId) counts.set(itemId, (counts.get(itemId) ?? 0) + 1);
  }
  return [...counts].map(([itemId, count]) => ({
    itemId,
    count,
    totalEffectLabel: totalEffectLabel(itemId, count),
  }));
}

export function dominantEquipmentItem(equipment: EquipmentSlots): ItemId | null {
  let dominant: ItemId | null = null;
  let dominantCount = 0;
  for (const itemId of equipment) {
    if (!itemId) continue;
    let count = 0;
    for (const equippedItemId of equipment) {
      if (equippedItemId === itemId) count += 1;
    }
    if (count > dominantCount) {
      dominant = itemId;
      dominantCount = count;
    }
  }
  return dominant;
}

export function isItemId(value: unknown): value is ItemId {
  return typeof value === "string" && Object.hasOwn(ITEM_DEFINITIONS, value);
}

export function isVendorId(value: unknown): value is VendorId {
  return typeof value === "string" && Object.hasOwn(VENDOR_DEFINITIONS, value);
}
