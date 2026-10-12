import type { Build, Catalog, GrantedSkill, SetBonus, Skill, Weapon } from "./types.ts";

export const ELEMENTS = ["fire", "water", "thunder", "ice", "dragon"] as const;
export type Element = (typeof ELEMENTS)[number];

export interface SkillTotal {
  skill: Skill;
  points: number; // everything the build grants
  level: number; // what actually applies
}

export interface SetBonusTotal {
  bonus: SetBonus;
  pieces: number; // equipped pieces that count toward it
  tiers: { pieces: number; skill: string; effect: string; active: boolean }[];
}

export interface Totals {
  defense: number;
  resistances: Record<Element, number>;
  skills: SkillTotal[];
  setBonuses: SetBonusTotal[];
}

// "Attack Boost +2, Critical Eye +1"
export function describeSkills(granted: GrantedSkill[], skills: Map<string, Skill>): string {
  return granted
    .map(({ skill, level }) => `${skills.get(skill)?.name ?? "Unknown skill"} +${level}`)
    .join(", ");
}

// "(Blast 450) · Affinity +10% · Defense +20 · Critical Status": what a weapon is, on the line
// where armor says its skills. The parentheses are the game's own for an element that stays
// hidden without Free Elem/Ammo Up. Affinity is always there, so the line is never empty.
export function describeWeapon(weapon: Weapon): string {
  const elements = weapon.elements.map(({ type, damage }) => {
    const element = `${type[0].toUpperCase()}${type.slice(1)} ${damage}`;
    return weapon.element_hidden ? `(${element})` : element;
  });
  return [
    ...elements,
    `Affinity ${weapon.affinity > 0 ? "+" : ""}${weapon.affinity}%`,
    weapon.defense > 0 && `Defense +${weapon.defense}`,
    // ponytail: a name and no more. It is a skill, a set bonus or a set-bonus skill, and none
    // of the three is counted in the totals below
    weapon.skill,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function computeTotals(build: Build, catalog: Catalog): Totals {
  let defense = 0;
  const resistances = { fire: 0, water: 0, thunder: 0, ice: 0, dragon: 0 };
  const points = new Map<string, number>();
  const worn = new Map<string, number>(); // SetBonus id -> pieces equipped
  const grant = (granted: GrantedSkill[] = []) => {
    for (const { skill, level } of granted) points.set(skill, (points.get(skill) ?? 0) + level);
  };

  // ids the catalog no longer has (a build saved before a reload of the dataset) are skipped
  for (const piece of Object.values(build.pieces)) {
    const armor = piece && catalog.armors.get(piece.armorId);
    if (!armor) continue;
    defense += armor.defense;
    for (const element of ELEMENTS) resistances[element] += armor[`${element}_res`];
    grant(armor.skills);
    if (armor.set_bonus) worn.set(armor.set_bonus, (worn.get(armor.set_bonus) ?? 0) + 1);
    for (const id of piece.decoIds) grant(id ? catalog.decorations.get(id)?.skills : undefined);
  }
  grant(build.charmId ? catalog.charms.get(build.charmId)?.skills : undefined);
  // a build saved before weapons were here has no such key: `held` can be undefined, not just null
  const held = build.weapon;
  const weapon = held && catalog.weapons.get(held.weaponId);
  if (held && weapon) {
    defense += weapon.defense;
    for (const id of held.decoIds) grant(id ? catalog.decorations.get(id)?.skills : undefined);
  }

  const skills: SkillTotal[] = [];
  for (const [id, total] of points) {
    const skill = catalog.skills.get(id);
    // ponytail: caps at max_level. Secret caps (Agitator 5 -> 7) come from Iceborne set bonuses,
    // and the scraped set list is base game only; raise the cap here once those sets are in.
    if (skill) skills.push({ skill, points: total, level: Math.min(total, skill.max_level) });
  }
  skills.sort((a, b) => b.level - a.level || a.skill.name.localeCompare(b.skill.name));

  // ponytail: a set bonus's skills are listed on their own, never added to the points above;
  // most of them (Adrenaline, Guts, ...) aren't in the skill catalog. Merge the few that are
  // (Critical Element, Non-elemental Boost) if a build ever needs them counted together.
  const setBonuses: SetBonusTotal[] = [];
  for (const [id, pieces] of worn) {
    const bonus = catalog.setBonuses.get(id);
    if (!bonus) continue;
    const tiers = bonus.tiers.map((tier, i) => ({
      ...tier,
      effect: bonus.effects[i] ?? "",
      active: pieces >= tier.pieces,
    }));
    setBonuses.push({ bonus, pieces, tiers });
  }
  setBonuses.sort((a, b) => b.pieces - a.pieces || a.bonus.name.localeCompare(b.bonus.name));

  return { defense, resistances, skills, setBonuses };
}
