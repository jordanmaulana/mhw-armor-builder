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
}

export interface Piece {
  armorId: string;
  decoIds: (string | null)[]; // one entry per armor slot, null = empty
}

export interface Build {
  pieces: Record<ArmorType, Piece | null>;
  charmId: string | null;
}
