// Self-check for recommend, run by `pnpm test` with plain node like totals.test.ts.
// computeTotals is the referee: the levels a recommended build really has are counted by code
// the solver doesn't share.
import { recommend } from "./recommend.ts";
import { computeTotals } from "./totals.ts";
import {
  ARMOR_TYPES,
  type Armor,
  type Build,
  type Catalog,
  type Charm,
  type Decoration,
  type GrantedSkill,
  type Skill,
} from "./types.ts";

function check(what: string, actual: unknown, expected: unknown) {
  const [a, e] = [JSON.stringify(actual), JSON.stringify(expected)];
  if (a !== e) throw new Error(`${what}: expected ${e}, got ${a}`);
}

const byId = <T extends { id: string }>(rows: T[]) => new Map(rows.map((r) => [r.id, r]));

const skill = (id: string, max_level: number): Skill => ({
  id,
  name: id,
  icon_url: "",
  description: "",
  max_level,
});
const SKILLS = [skill("attack", 7), skill("eye", 7), skill("guard", 5)];

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
// "attack-jewel": one point of the skill, for a slot of that level or bigger
const jewel = (of: string, slot: number): Decoration => ({
  id: `${of}-jewel`,
  name: `${of}-jewel`,
  slot,
  rarity: 6,
  skills: [{ skill: of, level: 1 }],
});
const charm = (id: string, skills: GrantedSkill[]): Charm => ({
  id,
  name: id,
  rarity: 6,
  icon_url: "",
  skills,
});
const catalog = (armors: Armor[], decorations: Decoration[] = [], charms: Charm[] = []): Catalog => ({
  skills: byId(SKILLS),
  setBonuses: new Map(),
  armors: byId(armors),
  decorations: byId(decorations),
  charms: byId(charms),
  monsters: new Map(),
});
const want = (...targets: [string, number][]): GrantedSkill[] =>
  targets.map(([id, level]) => ({ skill: id, level }));

{
  const cat = catalog(
    [
      armor("attack-helm", "head", {
        defense: 50,
        slots: [1],
        skills: [{ skill: "attack", level: 2 }],
      }),
      armor("tough-helm", "head", { defense: 90 }),
      armor("mail", "chest", { defense: 60 }),
    ],
    [jewel("attack", 1)],
    [
      charm("attack-charm", [{ skill: "attack", level: 1 }]),
      charm("eye-charm", [{ skill: "eye", level: 3 }]),
    ],
  );
  check(
    "a piece, a jewel and the charm together reach the target",
    recommend(want(["attack", 4]), cat)[0],
    {
      pieces: {
        head: { armorId: "attack-helm", decoIds: ["attack-jewel"] },
        chest: { armorId: "mail", decoIds: [] },
        arms: null,
        waist: null,
        legs: null,
      },
      charmId: "attack-charm",
    },
  );
  check(
    "when nothing grants the skill, defense decides and no charm is picked",
    recommend(want(["guard", 1]), cat)[0],
    {
      pieces: {
        head: { armorId: "tough-helm", decoIds: [] },
        chest: { armorId: "mail", decoIds: [] },
        arms: null,
        waist: null,
        legs: null,
      },
      charmId: null,
    },
  );
  check("no more results than asked for", recommend(want(["attack", 4]), cat, 1).length, 1);
  check("nothing wanted, nothing recommended", recommend([], cat), []);
  // the wanted list is saved in the browser and can outlive a reload of the dataset
  check("a skill the catalog lost is ignored", recommend(want(["gone", 1]), cat), []);
}

{
  const cat = catalog(
    [armor("helm", "head", { slots: [1] })],
    [jewel("attack", 1), jewel("eye", 1)],
  );
  const slotted = (wanted: GrantedSkill[]) => recommend(wanted, cat)[0].pieces.head?.decoIds;
  check(
    "two skills, one slot: the first in the list gets it",
    slotted(want(["attack", 1], ["eye", 1])),
    ["attack-jewel"],
  );
  check("and the other one does when the list is reversed", slotted(want(["eye", 1], ["attack", 1])), [
    "eye-jewel",
  ]);
}

check(
  "a small jewel leaves the big slot to the jewel that needs it",
  recommend(
    want(["attack", 1], ["guard", 1]),
    catalog([armor("helm", "head", { slots: [3, 1] })], [jewel("attack", 1), jewel("guard", 3)]),
  )[0].pieces.head?.decoIds,
  ["guard-jewel", "attack-jewel"],
);

check(
  "slotting stops at the target and leaves the spare slot empty",
  recommend(
    want(["attack", 2]),
    catalog([armor("helm", "head", { slots: [1, 1, 1] })], [jewel("attack", 1)]),
  )[0].pieces.head?.decoIds,
  ["attack-jewel", "attack-jewel", null],
);

check(
  "a target past the skill's cap counts as the cap, so it can't outweigh a skill above it",
  recommend(
    want(["attack", 1], ["guard", 9]),
    catalog([
      armor("guard-helm", "head", { defense: 90, skills: [{ skill: "guard", level: 8 }] }),
      armor("attack-helm", "head", { defense: 10, skills: [{ skill: "attack", level: 1 }] }),
    ]),
  )[0].pieces.head?.armorId,
  "attack-helm",
);

// The attack helm is tried first and leads to attack 1, eye 1. The eye helm starts lower and
// only wins with the one attack point the greaves still carry: a search that counts the pieces
// ahead a point short gives up on it. Asking for one result makes the search cut its hardest.
check(
  "a set that needs every point the pieces still to come carry is found",
  recommend(
    want(["attack", 1], ["eye", 2]),
    catalog([
      armor("attack-helm", "head", { skills: [{ skill: "attack", level: 1 }] }),
      armor("eye-helm", "head", { skills: [{ skill: "eye", level: 2 }] }),
      armor("attack-greaves", "legs", { skills: [{ skill: "attack", level: 1 }] }),
      armor("eye-greaves", "legs", { skills: [{ skill: "eye", level: 1 }] }),
    ]),
    1,
  )[0].pieces,
  {
    head: { armorId: "eye-helm", decoIds: [] },
    chest: null,
    arms: null,
    waist: null,
    legs: { armorId: "attack-greaves", decoIds: [] },
  },
);

// The check that catches a wrong prune or a wrong bound: on small made-up catalogs, try every
// combination of pieces and charm with every way to fill the slots, and hold the solver's first
// result against the best of them.
const reached = (build: Build, cat: Catalog, wanted: GrantedSkill[]) => {
  const got = new Map(computeTotals(build, cat).skills.map((s) => [s.skill.id, s.level]));
  return wanted.map((w) => Math.min(got.get(w.skill) ?? 0, w.level));
};
// levels in priority order as one number: digits in base 8, first skill most significant
const rank = (levels: number[]) => levels.reduce((sum, level) => sum * 8 + level, 0);

for (let seed = 1; seed <= 40; seed++) {
  let state = seed;
  const int = (n: number) => {
    state = (state * 1664525 + 1013904223) >>> 0; // LCG, so a failing seed fails every run
    return Math.floor((state / 2 ** 32) * n);
  };
  const ids = SKILLS.map((s) => s.id);
  const grants = () =>
    Array.from({ length: int(3) }, () => ({ skill: ids[int(ids.length)], level: 1 + int(2) }));

  const armors = ARMOR_TYPES.flatMap((type) =>
    Array.from({ length: 3 }, (_, i) =>
      armor(`${type}${i}`, type, {
        defense: int(4) * 10,
        slots: Array.from({ length: [0, 0, 1, 1, 2][int(5)] }, () => 1 + int(3)),
        skills: grants(),
      }),
    ),
  );
  const jewels = [jewel("attack", 1), jewel("eye", 2), jewel("guard", 3)];
  const charms = [charm("charm0", grants()), charm("charm1", grants())];
  const cat = catalog(armors, jewels, charms);
  const wanted = ids.map((_, i) => ({ skill: ids[(i + seed) % ids.length], level: 1 + int(5) }));

  const best = [-1, -1]; // rank, defense
  const types = ARMOR_TYPES.map((type) => armors.filter((a) => a.type === type));
  const sizes = wanted.map((w) => jewels.find((j) => j.skills[0].skill === w.skill)!.slot);
  const each = (chosen: Armor[]) => {
    if (chosen.length < types.length) {
      for (const next of types[chosen.length]) each([...chosen, next]);
      return;
    }
    const defense = chosen.reduce((sum, a) => sum + a.defense, 0);
    const slots = chosen.flatMap((a) => a.slots);
    for (const worn of [undefined, ...charms]) {
      const granted = [...chosen, ...(worn ? [worn] : [])].flatMap((item) => item.skills);
      const points = wanted.map((w) =>
        granted.reduce((sum, g) => sum + (g.skill === w.skill ? g.level : 0), 0),
      );
      const fill = (k: number, levels: number[]) => {
        if (k === slots.length) {
          const r = rank(levels.map((level, i) => Math.min(level, wanted[i].level)));
          if (r > best[0] || (r === best[0] && defense > best[1])) [best[0], best[1]] = [r, defense];
          return;
        }
        // a point never hurts, so a slot only stays empty when no wanted jewel fits it
        const fits = sizes.flatMap((size, i) => (size <= slots[k] ? [i] : []));
        if (fits.length === 0) fill(k + 1, levels);
        for (const i of fits) fill(k + 1, levels.with(i, levels[i] + 1));
      };
      fill(0, points);
    }
  };
  each([]);

  // odd seeds ask for a single result: the shorter the list, the harder the search cuts
  const [top] = recommend(wanted, cat, seed % 2 ? 1 : 10);
  for (const type of ARMOR_TYPES) {
    const piece = top.pieces[type]!;
    const worn = cat.armors.get(piece.armorId)!;
    check(`seed ${seed}: the ${type} slot holds a ${type} piece`, worn.type, type);
    check(
      `seed ${seed}: every jewel on ${worn.id} sits in a slot it fits`,
      worn.slots.map((level, i) => (cat.decorations.get(piece.decoIds[i] ?? "")?.slot ?? 0) <= level),
      worn.slots.map(() => true),
    );
  }
  check(
    `seed ${seed}: the first result is the best of every combination`,
    [rank(reached(top, cat, wanted)), computeTotals(top, cat).defense],
    best,
  );
}

console.log("recommend ok");
