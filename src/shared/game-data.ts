import type {
  AbilitySlot,
  HeroId,
  LaneId,
  Vec2,
} from "./protocol";

export const HERO_IDS = ["defender"] as const satisfies readonly HeroId[];

export const LANE_IDS = ["north", "east", "south", "west"] as const satisfies readonly LaneId[];

export interface AbilityDefinition {
  name: string;
  description: string;
  cooldown: number;
  maxRank: number;
  unlockLevel: number;
}

export interface HeroDefinition {
  id: HeroId;
  name: string;
  role: string;
  color: number;
  accent: number;
  maxHp: number;
  speed: number;
  basicName: string;
  basicDamage: number;
  basicCooldown: number;
  basicRange: number;
  abilities: Record<AbilitySlot, AbilityDefinition>;
}

export const HERO_DEFINITIONS: Record<HeroId, HeroDefinition> = {
  defender: {
    id: "defender",
    name: "Citadel Defender",
    role: "Weapon-defined guardian",
    color: 0x596b86,
    accent: 0xe8d3a1,
    maxHp: 150,
    speed: 11.2,
    basicName: "Training Sweep",
    basicDamage: 14,
    basicCooldown: 0.68,
    basicRange: 4.6,
    abilities: {
      ability1: { name: "Unassigned", description: "Learn and equip a Greatsword skill.", cooldown: 0, maxRank: 1, unlockLevel: 1 },
      ability2: { name: "Unassigned", description: "Learn and equip a Greatsword skill.", cooldown: 0, maxRank: 1, unlockLevel: 1 },
      ability3: { name: "Unassigned", description: "Learn and equip a Greatsword skill.", cooldown: 0, maxRank: 1, unlockLevel: 1 },
      ultimate: { name: "Unassigned", description: "Learn one branch mastery.", cooldown: 0, maxRank: 1, unlockLevel: 8 },
    },
  },
};

export const WORLD_LAYOUT = {
  nexus: { x: 0, z: 0 } satisfies Vec2,
  nexusRadius: 7,
  defenseHalfExtent: 96,
  pushNorthZ: -166,
  pushHalfWidth: 64,
  gates: {
    north: { x: 0, z: -52 },
    east: { x: 52, z: 0 },
    south: { x: 0, z: 52 },
    west: { x: -52, z: 0 },
  } satisfies Record<LaneId, Vec2>,
  spawns: {
    north: { x: 0, z: -112 },
    east: { x: 112, z: 0 },
    south: { x: 0, z: 112 },
    west: { x: -112, z: 0 },
  } satisfies Record<LaneId, Vec2>,
  riftHeart: { x: 0, z: -160 } satisfies Vec2,
} as const;

export const DEFAULT_TIMINGS = {
  defenseDuration: 210,
  breachDuration: 45,
  pushDuration: 105,
  waveCount: 5,
} as const;

export const DEBUG_TIMINGS = {
  defenseDuration: 24,
  breachDuration: 12,
  pushDuration: 35,
  waveCount: 3,
} as const;

export function isHeroId(value: unknown): value is HeroId {
  return typeof value === "string" && (HERO_IDS as readonly string[]).includes(value);
}

export function isAbilitySlot(value: unknown): value is AbilitySlot {
  return value === "ability1" || value === "ability2" || value === "ability3" || value === "ultimate";
}
