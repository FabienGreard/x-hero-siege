import type {
  AbilitySlot,
  HeroId,
  LaneId,
  Vec2,
} from "./protocol";

export const HERO_IDS = [
  "warden",
  "riftstalker",
  "ashcaller",
  "gravebinder",
] as const satisfies readonly HeroId[];

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
  warden: {
    id: "warden",
    name: "The Warden",
    role: "Frontline shockwaves",
    color: 0x3f74c8,
    accent: 0xbad8ff,
    maxHp: 190,
    speed: 10.5,
    basicName: "Iron Cleave",
    basicDamage: 30,
    basicCooldown: 0.52,
    basicRange: 5.4,
    abilities: {
      ability1: { name: "Vanguard Rush", description: "Charge and break the line.", cooldown: 6, maxRank: 3, unlockLevel: 1 },
      ability2: { name: "Rupturing Arc", description: "A heavy frontal shockwave.", cooldown: 8, maxRank: 3, unlockLevel: 1 },
      ability3: { name: "War Standard", description: "Hold an empowered ground.", cooldown: 12, maxRank: 3, unlockLevel: 1 },
      ultimate: { name: "Last Bastion", description: "Detonate a fortress-sized shockwave.", cooldown: 35, maxRank: 2, unlockLevel: 3 },
    },
  },
  riftstalker: {
    id: "riftstalker",
    name: "The Riftstalker",
    role: "Mobile ranged execution",
    color: 0x6655a8,
    accent: 0xd8c7ff,
    maxHp: 125,
    speed: 12.5,
    basicName: "Repeater Shot",
    basicDamage: 19,
    basicCooldown: 0.28,
    basicRange: 22,
    abilities: {
      ability1: { name: "Vaulting Blade", description: "Vault and fire through pursuers.", cooldown: 5, maxRank: 3, unlockLevel: 1 },
      ability2: { name: "Splitbolt", description: "Launch three piercing bolts.", cooldown: 7, maxRank: 3, unlockLevel: 1 },
      ability3: { name: "Snarefield", description: "Trap a dense enemy pack.", cooldown: 11, maxRank: 3, unlockLevel: 1 },
      ultimate: { name: "Execution Volley", description: "Flood the aimed lane with arrows.", cooldown: 34, maxRank: 2, unlockLevel: 3 },
    },
  },
  ashcaller: {
    id: "ashcaller",
    name: "The Ashcaller",
    role: "Explosive area control",
    color: 0xb8472d,
    accent: 0xffc061,
    maxHp: 120,
    speed: 10.8,
    basicName: "Ember Lance",
    basicDamage: 24,
    basicCooldown: 0.44,
    basicRange: 20,
    abilities: {
      ability1: { name: "Flame Ring", description: "Burn and repel nearby demons.", cooldown: 6, maxRank: 3, unlockLevel: 1 },
      ability2: { name: "Cinder Wall", description: "Cut a lane with living fire.", cooldown: 9, maxRank: 3, unlockLevel: 1 },
      ability3: { name: "Falling Star", description: "Call a delayed meteor at the cursor.", cooldown: 12, maxRank: 3, unlockLevel: 1 },
      ultimate: { name: "Worldfire", description: "Ignite everything in a vast radius.", cooldown: 38, maxRank: 2, unlockLevel: 3 },
    },
  },
  gravebinder: {
    id: "gravebinder",
    name: "The Gravebinder",
    role: "Sustain and soul magic",
    color: 0x3d806b,
    accent: 0x9ef2c9,
    maxHp: 155,
    speed: 11.2,
    basicName: "Soul Scythe",
    basicDamage: 27,
    basicCooldown: 0.5,
    basicRange: 5.8,
    abilities: {
      ability1: { name: "Reap", description: "Pull prey into a lethal sweep.", cooldown: 6, maxRank: 3, unlockLevel: 1 },
      ability2: { name: "Bone Ward", description: "Raise a soul-fed barrier.", cooldown: 10, maxRank: 3, unlockLevel: 1 },
      ability3: { name: "Wraith Host", description: "Loose hungry spirits at nearby prey.", cooldown: 12, maxRank: 3, unlockLevel: 1 },
      ultimate: { name: "Death Tide", description: "Send a wide soul wave up the lane.", cooldown: 37, maxRank: 2, unlockLevel: 3 },
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
