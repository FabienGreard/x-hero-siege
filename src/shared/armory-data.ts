import type { EquipmentSlots, ItemId, VendorId, Vec2 } from "./protocol";

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

export function isItemId(value: unknown): value is ItemId {
  return typeof value === "string" && Object.hasOwn(ITEM_DEFINITIONS, value);
}

export function isVendorId(value: unknown): value is VendorId {
  return typeof value === "string" && Object.hasOwn(VENDOR_DEFINITIONS, value);
}
