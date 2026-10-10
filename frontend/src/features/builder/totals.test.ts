// Self-check for computeTotals. No test runner: `pnpm test` runs this file with node, which
// strips the types itself. A failed check throws, so the exit code is non-zero.
import { computeTotals } from "./totals.ts";
import type { Armor, Build, Catalog } from "./types.ts";

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
  ...over,
});

const attack = { id: "attack", name: "Attack Boost", icon_url: "", description: "", max_level: 7 };
const guts = { id: "guts", name: "Guts", icon_url: "", description: "", max_level: 1 };
const eye = { id: "eye", name: "Critical Eye", icon_url: "", description: "", max_level: 7 };

const will = {
  id: "will",
  name: "Anjanath Will",
  icon_url: "",
  effects: ["Less stamina use at low health.", "Raises the stamina cap."],
  tiers: [
    { pieces: 2, skill: "Adrenaline" },
    { pieces: 4, skill: "Stamina Cap Up" },
  ],
};
const adrenaline = { pieces: 2, skill: "Adrenaline", effect: "Less stamina use at low health." };
const staminaCap = { pieces: 4, skill: "Stamina Cap Up", effect: "Raises the stamina cap." };

const catalog: Catalog = {
  skills: byId([attack, guts, eye]),
  setBonuses: byId([will]),
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
  ]),
  decorations: byId([
    { id: "attack-jewel", name: "Attack Jewel 1", slot: 1, rarity: 6, skills: [{ skill: "attack", level: 1 }] },
    { id: "guts-jewel", name: "Guts Jewel 1", slot: 1, rarity: 6, skills: [{ skill: "guts", level: 1 }] },
  ]),
  charms: byId([
    { id: "attack-charm", name: "Attack Charm III", rarity: 7, icon_url: "", skills: [{ skill: "attack", level: 3 }] },
  ]),
};

const empty: Build = {
  pieces: { head: null, chest: null, arms: null, waist: null, legs: null },
  charmId: null,
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
    { skill: attack, points: 6, level: 6 }, // 2 armor + 1 decoration + 3 charm
    { skill: eye, points: 1, level: 1 },
    { skill: guts, points: 2, level: 1 }, // 1 armor + 1 decoration, but Guts stops at 1
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
    },
    catalog,
  ).skills,
  [{ skill: attack, points: 2, level: 2 }],
);

check("armor without a set bonus shows none", full.setBonuses, []);

const wearing = (pieces: Partial<Build["pieces"]>) =>
  computeTotals({ pieces: { ...empty.pieces, ...pieces }, charmId: null }, catalog).setBonuses;
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

console.log("totals ok");
