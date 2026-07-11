export const ITEM_IDS = [
  "tempered_edge",
  "fleetstep_greaves",
  "runebound_focus",
  "quickening_sigil",
  "gateward_plate",
] as const;

export type ItemId = (typeof ITEM_IDS)[number];
