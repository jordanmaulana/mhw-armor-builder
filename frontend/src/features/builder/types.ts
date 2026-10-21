export const ARMOR_TYPES = ["head", "chest", "arms", "waist", "legs"] as const;
export type ArmorType = (typeof ARMOR_TYPES)[number];

export interface GrantedSkill {
  skill: string; // Skill id
  level: number;
}

export interface Skill {
  id: string;
  name: string;
  icon_url: string;
  description: string;
  max_level: number;
  // a set bonus tier that names the secret (Agitator Secret) raises max_level to this (7)
  secret_name: string;
  secret_max_level: number | null;
  levels: { level: number; effect: string }[]; // the game's line per level, secret levels too
}

export interface SetBonus {
  id: string;
  name: string;
  icon_url: string;
  effects: string[]; // effects[i] describes tiers[i]
  tiers: { pieces: number; skill: string }[]; // lowest threshold first
}

export interface Armor {
  id: string;
  name: string;
  type: ArmorType;
  rarity: number | null;
  defense: number;
  slots: number[]; // slot levels, e.g. [3, 1]
  fire_res: number;
  water_res: number;
  thunder_res: number;
  ice_res: number;
  dragon_res: number;
  icon_url_male: string;
  icon_url_female: string;
  skills: GrantedSkill[];
  set_bonus: string | null; // SetBonus id
  // what its recipe asks to have slain: one list per material, the ids of the monsters that
  // drop it. One of each list is enough; [] is a piece forged from ore, bone or a ticket
  hunts: string[][];
}

export interface Decoration {
  id: string;
  name: string;
  slot: number; // slot level it needs
  rarity: number;
  skills: GrantedSkill[];
}

export interface Charm {
  id: string;
  name: string;
  rarity: number | null;
  icon_url: string;
  skills: GrantedSkill[];
}

// in the order the game lists them
export const WEAPON_TYPES = [
  "great_sword",
  "long_sword",
  "sword_and_shield",
  "dual_blades",
  "hammer",
  "hunting_horn",
  "lance",
  "gunlance",
  "switch_axe",
  "charge_blade",
  "insect_glaive",
  "light_bowgun",
  "heavy_bowgun",
  "bow",
] as const;
export type WeaponType = (typeof WEAPON_TYPES)[number];

export interface Weapon {
  id: string;
  name: string;
  type: WeaponType;
  rarity: number;
  attack: number; // the number the game shows, not true raw
  affinity: number; // percent, can be negative
  defense: number; // the bonus some weapons carry, 0 for most
  slots: number[];
  elements: { type: string; damage: number }[]; // a few dual blades have two
  element_hidden: boolean; // needs Free Elem/Ammo Up
  // a name, not an id: a skill, a set bonus or a set-bonus skill, whichever the weapon carries
  skill: string;
}

export interface Monster {
  id: string;
  name: string;
  type: "large" | "small";
  species: string; // as the API spells it: "elder_dragon"
}

export interface Catalog {
  skills: Map<string, Skill>;
  setBonuses: Map<string, SetBonus>;
  armors: Map<string, Armor>;
  decorations: Map<string, Decoration>;
  charms: Map<string, Charm>;
  monsters: Map<string, Monster>;
  weapons: Map<string, Weapon>;
}

export interface Piece {
  armorId: string;
  decoIds: (string | null)[]; // one entry per armor slot, null = empty
}

export interface EquippedWeapon {
  weaponId: string;
  decoIds: (string | null)[]; // one entry per weapon slot, null = empty
}

// a row of the equipment list, which is what a lock is put on
export type Lockable = "weapon" | ArmorType | "charm";

export interface Build {
  pieces: Record<ArmorType, Piece | null>;
  charmId: string | null;
  // A build saved before weapons were here has no such key, and it is read back as it was
  // saved: read this with `?.`, never as if null were the only way to have none.
  weapon: EquippedWeapon | null;
}

// A set kept under a name, in this browser only. The name is its identity: no two alike,
// whatever their case.
export interface SavedSet {
  name: string;
  build: Build;
}
