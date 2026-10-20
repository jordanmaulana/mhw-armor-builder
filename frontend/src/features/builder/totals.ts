import type { Build, Catalog, GrantedSkill, SetBonus, Skill, Weapon } from "./types.ts";

export const ELEMENTS = ["fire", "water", "thunder", "ice", "dragon"] as const;
export type Element = (typeof ELEMENTS)[number];

export interface SkillTotal {
  skill: Skill;
  points: number; // everything the build grants, set bonuses too
  level: number; // what actually applies
  bonus: number; // of `level`, what a set bonus adds: the purple pips, drawn after the brass
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

// "Affinity +15%": what a skill does at that level, in the game's words. Empty for a skill the
// dataset has no lines for (one a loader stubbed from an armor's skill list).
export function effectAt(skill: Skill, level: number): string {
  return skill.levels.find((row) => row.level === level)?.effect ?? "";
}

// The lines a build can reach, lowest level first: a skill with a secret has lines past its cap
// (Agitator's 6 and 7), and the totals below stop at max_level.
export function levelLines(skill: Skill): Skill["levels"] {
  return skill.levels
    .filter((row) => row.level <= skill.max_level)
    .sort((a, b) => a.level - b.level);
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
    // ponytail: a name and no more. It is a skill, a set bonus or a set-bonus skill, and the
    // totals below count none of them for a weapon
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

  // The skills the active tiers grant, by name: a tier names its skill, it does not link it. One
  // level each, however many bonuses grant it (Critical Element from Rathalos Power and Rathalos
  // Mastery), with the first bonus's effect.
  const granted = new Map<string, { effect: string; icon: string }>();
  for (const { bonus, tiers } of setBonuses) {
    for (const tier of tiers) {
      if (tier.active && !granted.has(tier.skill)) {
        granted.set(tier.skill, { effect: tier.effect, icon: bonus.icon_url });
      }
    }
  }
  // A skill a loader stubbed (Adrenaline, Guts) has no description, no lines and no icon: the
  // bonus has an effect and an icon.
  const fill = (skill: Skill, from: { effect: string; icon: string }): Skill =>
    skill.description || skill.levels.length > 0
      ? skill
      : { ...skill, description: from.effect, icon_url: skill.icon_url || from.icon };

  const skills: SkillTotal[] = [];
  for (const [id, total] of points) {
    const skill = catalog.skills.get(id);
    if (!skill) continue;
    const from = granted.get(skill.name);
    granted.delete(skill.name);
    // ponytail: caps at max_level. Secret caps (Agitator 5 -> 7) come from Iceborne set bonuses,
    // and the scraped set list is base game only; raise the cap here once those sets are in.
    const gear = Math.min(total, skill.max_level);
    const bonus = from ? Math.min(1, skill.max_level - gear) : 0;
    skills.push({
      skill: from ? fill(skill, from) : skill,
      points: total + (from ? 1 : 0),
      level: gear + bonus,
      bonus,
    });
  }
  skills.sort((a, b) => b.level - a.level || a.skill.name.localeCompare(b.skill.name));

  // What only a set bonus grants comes after the gear's skills. Most of it (Great Luck, Master's
  // Touch) is in no catalog, and is made up here as a skill of one level.
  const byName = new Map([...catalog.skills.values()].map((skill) => [skill.name, skill]));
  const extra = [...granted]
    .map(([name, from]) => {
      const known = byName.get(name);
      const skill: Skill = known
        ? fill(known, from)
        : {
            id: `set-bonus:${name}`,
            name,
            icon_url: from.icon,
            description: from.effect,
            max_level: 1,
            levels: [],
          };
      return { skill, points: 1, level: 1, bonus: 1 };
    })
    .sort((a, b) => a.skill.name.localeCompare(b.skill.name));

  return { defense, resistances, skills: [...skills, ...extra], setBonuses };
}
