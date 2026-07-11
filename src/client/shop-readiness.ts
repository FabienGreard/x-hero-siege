import {
  ITEM_DEFINITIONS,
  armoryReforgeNetCost,
  legalEquipmentReplacementSlots,
} from "../shared/armory-data";
import type {
  EquipmentSlots,
  GamePhase,
  HeroId,
  ItemId,
  VendorId,
} from "../shared/protocol";

const ACTIVE_TRADE_PHASES = new Set<GamePhase>(["defense", "breach", "push"]);

export interface ShopReadinessState {
  phase: GamePhase;
  vendors: ReadonlyArray<{
    id: VendorId;
    name: string;
    itemIds: ReadonlyArray<ItemId>;
  }>;
}

export interface ShopReadinessPlayer {
  heroId: HeroId | null;
  gold: number;
  downed: boolean;
  equipment: EquipmentSlots;
}

export interface LocalShopReadiness {
  ready: boolean;
  mode: "ware" | "reforge" | null;
  label: "GOLD" | "WARE READY" | "REFORGE READY";
  vendorIds: VendorId[];
  gold: number;
  ariaLabel: string;
}

export function deriveLocalShopReadiness(
  state: ShopReadinessState,
  player: ShopReadinessPlayer | undefined,
): LocalShopReadiness {
  const gold = Math.max(0, Math.floor(player?.gold ?? 0));
  const canTrade = Boolean(
    player?.heroId &&
    !player.downed &&
    ACTIVE_TRADE_PHASES.has(state.phase),
  );
  const fullBuild = Boolean(player?.equipment.every((itemId) => itemId !== null));
  const affordableVendors = canTrade && player
    ? state.vendors.filter((vendor) =>
        vendor.itemIds.some((itemId) => fullBuild
          ? player.gold >= armoryReforgeNetCost(ITEM_DEFINITIONS[itemId].price) && legalEquipmentReplacementSlots(player.equipment, itemId).length > 0
          : player.gold >= ITEM_DEFINITIONS[itemId].price))
    : [];
  const ready = affordableVendors.length > 0;
  const mode = ready
    ? fullBuild ? "reforge" : "ware"
    : null;
  const label = mode === "reforge" ? "REFORGE READY" : mode === "ware" ? "WARE READY" : "GOLD";
  const vendorNames = affordableVendors.map((vendor) => vendor.name);
  const destination = vendorNames.length > 1
    ? `${vendorNames.slice(0, -1).join(", ")} and ${vendorNames.at(-1)}`
    : vendorNames[0];
  const action = mode === "reforge" ? "A local reforge is funded" : "A local ware is funded";

  return {
    ready,
    mode,
    label,
    vendorIds: affordableVendors.map((vendor) => vendor.id),
    gold,
    ariaLabel: ready
      ? `${gold} gold. ${action} at ${destination}; travel to a shop to trade.`
      : `${gold} gold.`,
  };
}
