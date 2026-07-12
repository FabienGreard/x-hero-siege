import type { Vec2 } from "./protocol";

export const WEAPON_IDS = ["greatsword"] as const;
export type WeaponId = (typeof WEAPON_IDS)[number];
export type EquippedWeaponId = WeaponId | "practice";
export type GreatswordBranch = "cleaving" | "guarding" | "execution";

export const STANDARD_SKILL_IDS = [
  "cleave",
  "whirlwind",
  "rising_slash",
  "guard",
  "counterstrike",
  "rallying_sweep",
  "charge",
  "impale",
  "colossal_strike",
] as const;
export type StandardSkillId = (typeof STANDARD_SKILL_IDS)[number];

export const MASTERY_SKILL_IDS = ["bladestorm", "unbreakable", "onslaught"] as const;
export type MasterySkillId = (typeof MASTERY_SKILL_IDS)[number];
export type SkillId = StandardSkillId | MasterySkillId;

export type MasteryNodeId =
  | SkillId
  | "tempered_stance"
  | "balanced_grip"
  | "citadel_training"
  | "follow_through"
  | "honed_arc"
  | "sundering_edge"
  | "endless_motion"
  | "riposte"
  | "perfect_guard"
  | "shared_resolve"
  | "guarded_advance"
  | "momentum"
  | "relentless_charge"
  | "measured_blow"
  | "executioners_reach"
  | "countercharge"
  | "sweeping_advance"
  | "stand_and_deliver";

export interface SkillDefinition {
  id: SkillId;
  name: string;
  branch: GreatswordBranch;
  kind: "standard" | "mastery";
  description: string;
  cooldown: number;
  windup: number;
  active: number;
  recovery: number;
  damage: number;
  reach: number;
  radius: number;
}

export interface MasteryNodeDefinition {
  id: MasteryNodeId;
  name: string;
  branch: GreatswordBranch | "shared";
  kind: "skill" | "mastery" | "passive" | "mutation" | "synergy";
  description: string;
  prerequisites: MasteryNodeId[];
  mutationFor?: readonly StandardSkillId[];
  cost: 1;
  semanticOrder: number;
  graphPosition: { x: number; y: number };
  exclusionIds: readonly MasteryNodeId[];
  branchSpendRequirement: number;
  totalSpendRequirement: number;
  requiresAllPrerequisites: boolean;
}

export interface WeaponDefinition {
  id: WeaponId;
  name: string;
  price: number;
  tradeInValue: number;
  basicName: string;
  basicDamage: number;
  basicCooldown: number;
  basicRange: number;
  color: number;
  accent: number;
}

export const PRACTICE_WEAPON = {
  id: "practice" as const,
  name: "Practice Blade",
  basicName: "Training Sweep",
  basicDamage: 14,
  basicCooldown: 0.68,
  basicRange: 4.6,
  tradeInValue: 0,
};

export const WEAPON_DEFINITIONS: Record<WeaponId, WeaponDefinition> = {
  greatsword: {
    id: "greatsword",
    name: "Citadel Greatsword",
    price: 100,
    tradeInValue: 50,
    basicName: "Sweeping Strike",
    basicDamage: 30,
    basicCooldown: 0.56,
    basicRange: 5.6,
    color: 0x8a9bb8,
    accent: 0xe8d3a1,
  },
};

export const SKILL_DEFINITIONS: Record<SkillId, SkillDefinition> = {
  cleave: { id: "cleave", name: "Cleave", branch: "cleaving", kind: "standard", description: "A broad, decisive cut.", cooldown: 5, windup: 0.24, active: 0.1, recovery: 0.2, damage: 62, reach: 6.2, radius: 4.4 },
  whirlwind: { id: "whirlwind", name: "Whirlwind", branch: "cleaving", kind: "standard", description: "Move through a sequence of circular strikes.", cooldown: 9, windup: 0.18, active: 0.5, recovery: 0.22, damage: 27, reach: 0, radius: 5.2 },
  rising_slash: { id: "rising_slash", name: "Rising Slash", branch: "cleaving", kind: "standard", description: "Launch a narrow stagger-heavy cut.", cooldown: 7, windup: 0.28, active: 0.11, recovery: 0.22, damage: 54, reach: 8, radius: 2.2 },
  guard: { id: "guard", name: "Guard", branch: "guarding", kind: "standard", description: "Brace against attacks arriving from the aimed direction.", cooldown: 5, windup: 0.08, active: 0.65, recovery: 0.16, damage: 0, reach: 0, radius: 0 },
  counterstrike: { id: "counterstrike", name: "Counterstrike", branch: "guarding", kind: "standard", description: "Open a counter window and answer a received attack.", cooldown: 7, windup: 0.1, active: 0.55, recovery: 0.18, damage: 72, reach: 6.4, radius: 3.4 },
  rallying_sweep: { id: "rallying_sweep", name: "Rallying Sweep", branch: "guarding", kind: "standard", description: "Strike around the Defender and raise barriers.", cooldown: 10, windup: 0.3, active: 0.12, recovery: 0.25, damage: 42, reach: 0, radius: 5.2 },
  charge: { id: "charge", name: "Charge", branch: "execution", kind: "standard", description: "Rush forward and break a formation.", cooldown: 6, windup: 0.16, active: 0.12, recovery: 0.2, damage: 44, reach: 10, radius: 2.6 },
  impale: { id: "impale", name: "Impale", branch: "execution", kind: "standard", description: "A long thrust built for priority targets.", cooldown: 6.5, windup: 0.25, active: 0.1, recovery: 0.2, damage: 68, reach: 9.5, radius: 1.7 },
  colossal_strike: { id: "colossal_strike", name: "Colossal Strike", branch: "execution", kind: "standard", description: "Commit to an extreme stagger overhead.", cooldown: 12, windup: 0.62, active: 0.14, recovery: 0.34, damage: 132, reach: 6.5, radius: 3.3 },
  bladestorm: { id: "bladestorm", name: "Bladestorm", branch: "cleaving", kind: "mastery", description: "Surge through a path of large circular strikes.", cooldown: 32, windup: 0.28, active: 0.75, recovery: 0.32, damage: 48, reach: 14, radius: 6 },
  unbreakable: { id: "unbreakable", name: "Unbreakable", branch: "guarding", kind: "mastery", description: "Answer several reduced attacks with finishers.", cooldown: 34, windup: 0.18, active: 1.8, recovery: 0.3, damage: 58, reach: 0, radius: 5.5 },
  onslaught: { id: "onslaught", name: "Onslaught", branch: "execution", kind: "mastery", description: "Drive repeated Charge and Impale strikes through the line.", cooldown: 33, windup: 0.24, active: 0.9, recovery: 0.32, damage: 56, reach: 15, radius: 2.8 },
};

let nextNodeOrder = 0;
const branchRows: Record<MasteryNodeDefinition["branch"], number> = { shared: 0, cleaving: 0, guarding: 0, execution: 0 };
const branchColumns: Record<MasteryNodeDefinition["branch"], number> = { shared: 1.5, cleaving: 0, guarding: 1.5, execution: 3 };
const node = (
  id: MasteryNodeId,
  name: string,
  branch: MasteryNodeDefinition["branch"],
  kind: MasteryNodeDefinition["kind"],
  description: string,
  prerequisites: MasteryNodeId[],
  mutationFor?: readonly StandardSkillId[],
): MasteryNodeDefinition => {
  const semanticOrder = nextNodeOrder++;
  const row = branchRows[branch]++;
  return {
    id,
    name,
    branch,
    kind,
    description,
    prerequisites,
    ...(mutationFor ? { mutationFor } : {}),
    cost: 1,
    semanticOrder,
    graphPosition: { x: branchColumns[branch], y: row },
    exclusionIds: kind === "mastery" ? MASTERY_SKILL_IDS.filter((masteryId) => masteryId !== id) : [],
    branchSpendRequirement: kind === "mastery" ? 4 : 0,
    totalSpendRequirement: kind === "mastery" ? 7 : 0,
    requiresAllPrerequisites: kind === "synergy",
  };
};

export const GREATSWORD_MASTERY_NODES: readonly MasteryNodeDefinition[] = [
  node("tempered_stance", "Tempered Stance", "shared", "passive", "Gain a small barrier after a dodge.", []),
  node("balanced_grip", "Balanced Grip", "shared", "passive", "Sweeping Strike recovers more quickly after its finisher.", ["tempered_stance"]),
  node("citadel_training", "Citadel Training", "shared", "passive", "Greatsword direct damage increases by 8%.", ["tempered_stance"]),

  node("cleave", "Cleave", "cleaving", "skill", SKILL_DEFINITIONS.cleave.description, ["tempered_stance"]),
  node("follow_through", "Follow Through", "cleaving", "mutation", "Cleave recovery shortens after hitting several enemies.", ["cleave"], ["cleave"]),
  node("honed_arc", "Honed Arc", "cleaving", "passive", "Widen frontal Greatsword cuts.", ["cleave"]),
  node("whirlwind", "Whirlwind", "cleaving", "skill", SKILL_DEFINITIONS.whirlwind.description, ["follow_through", "honed_arc"]),
  node("sundering_edge", "Sundering Edge", "cleaving", "mutation", "Cleave and Rising Slash expose struck enemies.", ["whirlwind"], ["cleave", "rising_slash"]),
  node("endless_motion", "Endless Motion", "cleaving", "mutation", "Whirlwind gains one additional bounded strike.", ["whirlwind"], ["whirlwind"]),
  node("rising_slash", "Rising Slash", "cleaving", "skill", SKILL_DEFINITIONS.rising_slash.description, ["sundering_edge", "endless_motion"]),
  node("bladestorm", "Bladestorm", "cleaving", "mastery", SKILL_DEFINITIONS.bladestorm.description, ["rising_slash"]),

  node("guard", "Guard", "guarding", "skill", SKILL_DEFINITIONS.guard.description, ["tempered_stance"]),
  node("riposte", "Riposte", "guarding", "mutation", "A successful Guard empowers the next basic strike.", ["guard"], ["guard"]),
  node("perfect_guard", "Perfect Guard", "guarding", "mutation", "Guarding a windup interrupts normal enemies.", ["guard"], ["guard"]),
  node("counterstrike", "Counterstrike", "guarding", "skill", SKILL_DEFINITIONS.counterstrike.description, ["riposte", "perfect_guard"]),
  node("shared_resolve", "Shared Resolve", "guarding", "mutation", "Rallying Sweep grants stronger ally barriers.", ["counterstrike"], ["rallying_sweep"]),
  node("guarded_advance", "Guarded Advance", "guarding", "mutation", "Guard permits slow forward movement.", ["counterstrike"], ["guard"]),
  node("rallying_sweep", "Rallying Sweep", "guarding", "skill", SKILL_DEFINITIONS.rallying_sweep.description, ["shared_resolve", "guarded_advance"]),
  node("unbreakable", "Unbreakable", "guarding", "mastery", SKILL_DEFINITIONS.unbreakable.description, ["rallying_sweep"]),

  node("charge", "Charge", "execution", "skill", SKILL_DEFINITIONS.charge.description, ["tempered_stance"]),
  node("momentum", "Momentum", "execution", "mutation", "Charge travels farther and rewards an elite hit.", ["charge"], ["charge"]),
  node("relentless_charge", "Relentless Charge", "execution", "mutation", "Carry the first normal enemy into the endpoint.", ["charge"], ["charge"]),
  node("impale", "Impale", "execution", "skill", SKILL_DEFINITIONS.impale.description, ["momentum", "relentless_charge"]),
  node("measured_blow", "Measured Blow", "execution", "mutation", "Stable aim strengthens Colossal Strike.", ["impale"], ["colossal_strike"]),
  node("executioners_reach", "Executioner's Reach", "execution", "mutation", "Impale pierces and pressures weakened enemies.", ["impale"], ["impale"]),
  node("colossal_strike", "Colossal Strike", "execution", "skill", SKILL_DEFINITIONS.colossal_strike.description, ["measured_blow", "executioners_reach"]),
  node("onslaught", "Onslaught", "execution", "mastery", SKILL_DEFINITIONS.onslaught.description, ["colossal_strike"]),

  node("countercharge", "Countercharge", "shared", "synergy", "A successful Guard empowers Charge against elites.", ["guard", "charge"]),
  node("sweeping_advance", "Sweeping Advance", "shared", "synergy", "Charge releases a weaker Cleave at its endpoint.", ["cleave", "charge"]),
  node("stand_and_deliver", "Stand and Deliver", "shared", "synergy", "Colossal Strike gains a windup barrier when Rallying Sweep is learned.", ["rallying_sweep", "colossal_strike"]),
] as const;

export const GREATSWORD_NODE_BY_ID = Object.fromEntries(
  GREATSWORD_MASTERY_NODES.map((definition) => [definition.id, definition]),
) as Record<MasteryNodeId, MasteryNodeDefinition>;

export const ARSENAL_POSITION = { x: 0, z: 13 } satisfies Vec2;
export const ARSENAL_INTERACTION_RADIUS = 8;

export function isWeaponId(value: unknown): value is WeaponId {
  return typeof value === "string" && (WEAPON_IDS as readonly string[]).includes(value);
}

export function isStandardSkillId(value: unknown): value is StandardSkillId {
  return typeof value === "string" && (STANDARD_SKILL_IDS as readonly string[]).includes(value);
}

export function isMasterySkillId(value: unknown): value is MasterySkillId {
  return typeof value === "string" && (MASTERY_SKILL_IDS as readonly string[]).includes(value);
}

export function isSkillId(value: unknown): value is SkillId {
  return isStandardSkillId(value) || isMasterySkillId(value);
}

export function isMasteryNodeId(value: unknown): value is MasteryNodeId {
  return typeof value === "string" && Object.hasOwn(GREATSWORD_NODE_BY_ID, value);
}

export type MasteryNodeAvailability =
  | { state: "learned" }
  | { state: "legal" }
  | { state: "excluded"; reason: string }
  | { state: "locked"; reason: string };

export function deriveMasteryNodeAvailability(
  nodeId: MasteryNodeId,
  learnedNodeIds: readonly MasteryNodeId[],
  pointBudget: number,
): MasteryNodeAvailability {
  if (learnedNodeIds.includes(nodeId)) return { state: "learned" };
  const definition = GREATSWORD_NODE_BY_ID[nodeId];
  const learnedMastery = learnedNodeIds.find((id) => GREATSWORD_NODE_BY_ID[id].kind === "mastery");
  if (definition.kind === "mastery" && learnedMastery) {
    return { state: "excluded", reason: `Excluded by ${GREATSWORD_NODE_BY_ID[learnedMastery].name}.` };
  }
  if (learnedNodeIds.length >= pointBudget) return { state: "locked", reason: "No mastery points available." };
  const prerequisitesMet = definition.prerequisites.length === 0 || (
    definition.requiresAllPrerequisites
      ? definition.prerequisites.every((id) => learnedNodeIds.includes(id))
      : definition.prerequisites.some((id) => learnedNodeIds.includes(id))
  );
  if (!prerequisitesMet) {
    return { state: "locked", reason: `Requires ${definition.prerequisites.map((id) => GREATSWORD_NODE_BY_ID[id].name).join(definition.requiresAllPrerequisites ? " and " : " or ")}.` };
  }
  if (definition.kind === "mastery") {
    const branchPoints = learnedNodeIds.filter((id) => GREATSWORD_NODE_BY_ID[id].branch === definition.branch).length;
    if (learnedNodeIds.length < definition.totalSpendRequirement || branchPoints < definition.branchSpendRequirement) {
      return { state: "locked", reason: `${definition.branchSpendRequirement} branch and ${definition.totalSpendRequirement} total points required.` };
    }
  }
  return { state: "legal" };
}
