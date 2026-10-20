// Self-check for computeTotals. No test runner: `pnpm test` runs this file with node, which
// strips the types itself. A failed check throws, so the exit code is non-zero.
import { computeTotals, describeWeapon, effectAt, levelLines } from "./totals.ts";
import type { Armor, Build, Catalog, Skill, Weapon } from "./types.ts";

function check(what: string, actual: unknown, expected: unknown) {
  const [a, e] = [JSON.stringify(actual), JSON.stringify(expected)];
  if (a !== e) throw new Error(`${what}: expected ${e}, got ${a}`);
}

const byId = <T extends { id: string }>(rows: T[]) => new Map(rows.map((r) => [r.id, r]));

const armor = (id: string, type: Armor["type"], over: Partial<Armor>): Armor => ({
  id,
  name: id,
  type,
  rarity: 8,
  defense: 0,
  slots: [],
  fire_res: 0,
  water_res: 0,
  thunder_res: 0,
  ice_res: 0,
  dragon_res: 0,
  icon_url_male: "",
  icon_url_female: "",
  skills: [],
  set_bonus: null,
  hunts: [],
  ...over,
});

const weapon = (id: string, over: Partial<Weapon> = {}): Weapon => ({
  id,
  name: id,
  type: "great_sword",
  rarity: 12,
  attack: 1000,
  affinity: 0,
  defense: 0,
  slots: [],
  elements: [],
  element_hidden: false,
  skill: "",
  ...over,
});

const skill = (id: string, name: string, max_level: number, levels: Skill["levels"] = []): Skill => ({
  id,
  name,
  icon_url: "",
  description: "",
  max_level,
  levels,
});
const attack = skill("attack", "Attack Boost", 7);
const guts = skill("guts", "Guts", 1);
// its lines out of order and one past the cap, as a secret level is
const eye = skill("eye", "Critical Eye", 7, [
  { level: 2, effect: "Affinity +10%" },
  { level: 1, effect: "Affinity +5%" },
  { level: 8, effect: "Affinity +45%" },
]);

const will = {
  id: "will",
  name: "Anjanath Will",
  icon_url: "will.png",
  effects: ["Less stamina use at low health.", "Raises the stamina cap."],
  tiers: [
    { pieces: 2, skill: "Adrenaline" },
    { pieces: 4, skill: "Stamina Cap Up" },
  ],
};
const adrenaline = { pieces: 2, skill: "Adrenaline", effect: "Less stamina use at low health." };
const staminaCap = { pieces: 4, skill: "Stamina Cap Up", effect: "Raises the stamina cap." };
// another bonus with Adrenaline, as Anjanath Power has
const power = {
  id: "power",
  name: "Anjanath Power",
  icon_url: "power.png",
  effects: ["Adrenaline, said by Power."],
  tiers: [{ pieces: 3, skill: "Adrenaline" }],
};
// its skill is in the catalog as a stub: Guts, with no description and no lines
const baz = {
  id: "baz",
  name: "Bazelgeuse Protection",
  icon_url: "baz.png",
  effects: ["Survive a fatal blow."],
  tiers: [{ pieces: 3, skill: "Guts" }],
};
// no such bonus in the game: one level of a skill that has seven, to see brass and purple meet
const sight = {
  id: "sight",
  name: "Eye Favor",
  icon_url: "sight.png",
  effects: ["Affinity, said by the bonus."],
  tiers: [{ pieces: 2, skill: "Critical Eye" }],
};

const catalog: Catalog = {
  skills: byId([attack, guts, eye]),
  setBonuses: byId([will, power, baz, sight]),
  armors: byId([
    armor("helm", "head", {
      defense: 70,
      slots: [3, 1],
      fire_res: 3,
      ice_res: -3,
      skills: [{ skill: "attack", level: 2 }],
    }),
    armor("mail", "chest", {
      defense: 80,
      slots: [1],
      fire_res: 1,
      ice_res: -1,
      dragon_res: 2,
      skills: [
        { skill: "guts", level: 1 },
        { skill: "eye", level: 1 },
      ],
    }),
    // two sets, one bonus: Anja and Aloy pieces both count toward Anjanath Will
    armor("anja-helm", "head", { set_bonus: "will" }),
    armor("aloy-mail", "chest", { set_bonus: "will" }),
    armor("anja-braces", "arms", { set_bonus: "will" }),
    armor("anja-coil", "waist", { set_bonus: "will" }),
    armor("gone-bonus-greaves", "legs", { set_bonus: "gone" }),
    armor("power-mail", "chest", { set_bonus: "power" }),
    armor("power-coil", "waist", { set_bonus: "power" }),
    armor("power-greaves", "legs", { set_bonus: "power" }),
    armor("baz-helm", "head", { set_bonus: "baz" }),
    armor("baz-braces", "arms", { set_bonus: "baz" }),
    armor("baz-coil", "waist", { set_bonus: "baz" }),
    armor("sight-braces", "arms", { set_bonus: "sight" }),
    armor("sight-greaves", "legs", { set_bonus: "sight" }),
  ]),
  decorations: byId([
    { id: "attack-jewel", name: "Attack Jewel 1", slot: 1, rarity: 6, skills: [{ skill: "attack", level: 1 }] },
    { id: "guts-jewel", name: "Guts Jewel 1", slot: 1, rarity: 6, skills: [{ skill: "guts", level: 1 }] },
  ]),
  charms: byId([
    { id: "attack-charm", name: "Attack Charm III", rarity: 7, icon_url: "", skills: [{ skill: "attack", level: 3 }] },
  ]),
  monsters: new Map(),
  weapons: byId([weapon("blade", { defense: 20, slots: [1, 1] })]),
};

const empty: Build = {
  pieces: { head: null, chest: null, arms: null, waist: null, legs: null },
  charmId: null,
  weapon: null,
};

check("empty build", computeTotals(empty, catalog), {
  defense: 0,
  resistances: { fire: 0, water: 0, thunder: 0, ice: 0, dragon: 0 },
  skills: [],
  setBonuses: [],
});

const full = computeTotals(
  {
    pieces: {
      ...empty.pieces,
      head: { armorId: "helm", decoIds: ["attack-jewel", null] },
      chest: { armorId: "mail", decoIds: ["guts-jewel"] },
    },
    charmId: "attack-charm",
    weapon: null,
  },
  catalog,
);

check("defense adds up across pieces", full.defense, 150);
check("resistances add up across pieces", full.resistances, {
  fire: 4,
  water: 0,
  thunder: 0,
  ice: -4,
  dragon: 2,
});
check(
  "skills add up across armor, decorations and charm, capped at max level, highest first",
  full.skills,
  [
    { skill: attack, points: 6, level: 6, bonus: 0 }, // 2 armor + 1 decoration + 3 charm
    { skill: eye, points: 1, level: 1, bonus: 0 },
    { skill: guts, points: 2, level: 1, bonus: 0 }, // 1 armor + 1 decoration, but Guts stops at 1
  ],
);

// a build saved before the catalog changed must not crash the page
check(
  "ids missing from the catalog are ignored",
  computeTotals(
    {
      pieces: {
        ...empty.pieces,
        head: { armorId: "helm", decoIds: ["gone-jewel", null] },
        legs: { armorId: "gone-greaves", decoIds: ["attack-jewel"] },
      },
      charmId: "gone-charm",
      weapon: null,
    },
    catalog,
  ).skills,
  [{ skill: attack, points: 2, level: 2, bonus: 0 }],
);

const wielding = (held: Build["weapon"]) => {
  const { defense, skills } = computeTotals({ ...empty, weapon: held }, catalog);
  return { defense, skills };
};
check(
  "a weapon adds its defense bonus and the jewels in its slots",
  wielding({ weaponId: "blade", decoIds: ["attack-jewel", null] }),
  { defense: 20, skills: [{ skill: attack, points: 1, level: 1, bonus: 0 }] },
);
check(
  "a weapon the catalog lost is skipped, its jewels with it",
  wielding({ weaponId: "gone-blade", decoIds: ["attack-jewel"] }),
  { defense: 0, skills: [] },
);
// what localStorage hands back for a build saved before weapons were here
check(
  "a build with no weapon key totals like one with no weapon",
  computeTotals({ pieces: empty.pieces, charmId: null } as Build, catalog),
  computeTotals(empty, catalog),
);

check("a weapon with nothing to it still says its affinity", describeWeapon(weapon("iron")), "Affinity 0%");
check(
  "element first, then affinity with its sign",
  describeWeapon(weapon("fatalis", { affinity: -30, elements: [{ type: "dragon", damage: 180 }] })),
  "Dragon 180 · Affinity -30%",
);
check(
  "a hidden element in parentheses, then the defense bonus and the skill",
  describeWeapon(
    weapon("kjarr", {
      affinity: 10,
      defense: 20,
      elements: [{ type: "blast", damage: 450 }],
      element_hidden: true,
      skill: "Critical Status",
    }),
  ),
  "(Blast 450) · Affinity +10% · Defense +20 · Critical Status",
);
check(
  "both elements of dual blades that carry two",
  describeWeapon(
    weapon("twins", {
      elements: [
        { type: "fire", damage: 240 },
        { type: "ice", damage: 240 },
      ],
    }),
  ),
  "Fire 240 · Ice 240 · Affinity 0%",
);

check("armor without a set bonus shows none", full.setBonuses, []);

const wearing = (pieces: Partial<Build["pieces"]>) =>
  computeTotals({ ...empty, pieces: { ...empty.pieces, ...pieces } }, catalog).setBonuses;
const piece = (armorId: string) => ({ armorId, decoIds: [] });

check("one piece shows the bonus it is working toward, nothing active", wearing({ head: piece("anja-helm") }), [
  {
    bonus: will,
    pieces: 1,
    tiers: [
      { ...adrenaline, active: false },
      { ...staminaCap, active: false },
    ],
  },
]);
check(
  "pieces of different sets sharing a bonus count together",
  wearing({ head: piece("anja-helm"), chest: piece("aloy-mail") }),
  [
    {
      bonus: will,
      pieces: 2,
      tiers: [
        { ...adrenaline, active: true },
        { ...staminaCap, active: false },
      ],
    },
  ],
);
check(
  "every tier the piece count reaches is active; a bonus the catalog lost is ignored",
  wearing({
    head: piece("anja-helm"),
    chest: piece("aloy-mail"),
    arms: piece("anja-braces"),
    waist: piece("anja-coil"),
    legs: piece("gone-bonus-greaves"),
  }),
  [
    {
      bonus: will,
      pieces: 4,
      tiers: [
        { ...adrenaline, active: true },
        { ...staminaCap, active: true },
      ],
    },
  ],
);

const skillsOf = (pieces: Partial<Build["pieces"]>, charmId: string | null = null) =>
  computeTotals({ ...empty, pieces: { ...empty.pieces, ...pieces }, charmId }, catalog).skills;
// what totals make of a set-bonus skill the catalog lacks
const madeUp = (name: string, effect: string, icon_url: string): Skill => ({
  id: `set-bonus:${name}`,
  name,
  icon_url,
  description: effect,
  max_level: 1,
  levels: [],
});

check("a tier not yet reached adds no skill", skillsOf({ head: piece("anja-helm") }), []);
check(
  "an active tier's skill the catalog lacks is made up: one level, purple, the bonus's words and icon",
  skillsOf({ head: piece("anja-helm"), chest: piece("aloy-mail") }),
  [{ skill: madeUp("Adrenaline", adrenaline.effect, "will.png"), points: 1, level: 1, bonus: 1 }],
);
check(
  "the gear's skills come first, then the set bonus's by name",
  skillsOf(
    {
      head: piece("anja-helm"),
      chest: piece("aloy-mail"),
      arms: piece("anja-braces"),
      waist: piece("anja-coil"),
    },
    "attack-charm",
  ),
  [
    { skill: attack, points: 3, level: 3, bonus: 0 },
    { skill: madeUp("Adrenaline", adrenaline.effect, "will.png"), points: 1, level: 1, bonus: 1 },
    { skill: madeUp("Stamina Cap Up", staminaCap.effect, "will.png"), points: 1, level: 1, bonus: 1 },
  ],
);
check(
  "two bonuses with one skill grant it once, in the words of the one with more pieces",
  skillsOf({
    head: piece("anja-helm"),
    arms: piece("anja-braces"),
    chest: piece("power-mail"),
    waist: piece("power-coil"),
    legs: piece("power-greaves"),
  }),
  [{ skill: madeUp("Adrenaline", power.effects[0], "power.png"), points: 1, level: 1, bonus: 1 }],
);

const bazPieces = { head: piece("baz-helm"), arms: piece("baz-braces"), waist: piece("baz-coil") };
const filledGuts = { ...guts, icon_url: "baz.png", description: baz.effects[0] };
check(
  "a stub in the catalog is the skill a tier names, with the bonus's words and icon",
  skillsOf(bazPieces),
  [{ skill: filledGuts, points: 1, level: 1, bonus: 1 }],
);
check(
  "a bonus level past the cap is over the cap, not purple",
  skillsOf({ ...bazPieces, chest: piece("mail") }),
  [
    { skill: eye, points: 1, level: 1, bonus: 0 },
    { skill: filledGuts, points: 2, level: 1, bonus: 0 }, // 1 armor + 1 bonus, Guts stops at 1
  ],
);
check(
  "a bonus adds its level to the gear's, and keeps a full skill's own words",
  skillsOf({ chest: piece("mail"), arms: piece("sight-braces"), legs: piece("sight-greaves") }),
  [
    { skill: eye, points: 2, level: 2, bonus: 1 },
    { skill: guts, points: 1, level: 1, bonus: 0 },
  ],
);

check("a level's line is found by its number, not its place", effectAt(eye, 1), "Affinity +5%");
check("a secret level has its line too", effectAt(eye, 8), "Affinity +45%");
check("no line for a level the skill lacks", effectAt(eye, 4), "");
check("no line for a skill the dataset has none for", effectAt(attack, 1), "");
check("the lines to list stop at the cap, lowest level first", levelLines(eye), [
  { level: 1, effect: "Affinity +5%" },
  { level: 2, effect: "Affinity +10%" },
]);
check("nothing to list for a skill the dataset has no lines for", levelLines(attack), []);

console.log("totals ok");
