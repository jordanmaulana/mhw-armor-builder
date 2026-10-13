// Self-check for recommend, run by `pnpm test` with plain node like totals.test.ts.
// computeTotals is the referee: the levels a recommended build really has are counted by code
// the solver doesn't share.
import { recommend, type Locked } from "./recommend.ts";
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
  type Weapon,
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
  levels: [],
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
// no defense bonus: the armor's defense is what the brute force below ranks by
const weapon = (id: string, slots: number[]): Weapon => ({
  id,
  name: id,
  type: "great_sword",
  rarity: 12,
  attack: 1000,
  affinity: 0,
  defense: 0,
  slots,
  elements: [],
  element_hidden: false,
  skill: "",
});
const catalog = (
  armors: Armor[],
  decorations: Decoration[] = [],
  charms: Charm[] = [],
  weapons: Weapon[] = [],
): Catalog => ({
  skills: byId(SKILLS),
  setBonuses: new Map(),
  armors: byId(armors),
  decorations: byId(decorations),
  charms: byId(charms),
  monsters: new Map(),
  weapons: byId(weapons),
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
      weapon: null,
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
      weapon: null,
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

{
  const cat = catalog(
    [armor("helm", "head", { slots: [1] })],
    [jewel("attack", 1), jewel("guard", 3)],
    [],
    [weapon("blade", [3, 1]), weapon("club", [])],
  );
  const held = (wanted: GrantedSkill[], weaponId?: string) =>
    recommend(wanted, cat, 10, weaponId)[0].weapon;
  check(
    "the weapon in hand is part of the set, and its slots are filled with the armor's",
    recommend(want(["guard", 1], ["attack", 2]), cat, 10, "blade")[0],
    {
      pieces: {
        head: { armorId: "helm", decoIds: ["attack-jewel"] },
        chest: null,
        arms: null,
        waist: null,
        legs: null,
      },
      charmId: null,
      weapon: { weaponId: "blade", decoIds: ["guard-jewel", "attack-jewel"] },
    },
  );
  check("the armor's slots fill first: a jewel there outlives a change of weapon", held(want(["attack", 1]), "blade"), {
    weaponId: "blade",
    decoIds: [null, null],
  });
  check("a weapon with no slots is still the set's weapon", held(want(["attack", 1]), "club"), {
    weaponId: "club",
    decoIds: [],
  });
  check("no weapon in hand, none in the set", held(want(["attack", 1])), null);
  // the build is saved in the browser and can outlive a reload of the dataset
  check("a weapon the catalog lost is no weapon", held(want(["attack", 1]), "gone"), null);
}

{
  const cat = catalog(
    [
      armor("attack-helm", "head", {
        defense: 50,
        slots: [1],
        skills: [{ skill: "attack", level: 2 }],
      }),
      armor("plain-helm", "head", { defense: 10, slots: [3, 1] }),
      armor("mail", "chest", { slots: [1] }),
      armor("plate", "chest", { defense: 60 }),
    ],
    [jewel("attack", 1), jewel("guard", 3)],
    [
      charm("attack-charm", [{ skill: "attack", level: 1 }]),
      charm("eye-charm", [{ skill: "eye", level: 3 }]),
    ],
    [weapon("blade", [3, 1])],
  );
  const plain = (...decoIds: (string | null)[]): Locked => ({
    pieces: { head: { armorId: "plain-helm", decoIds } },
  });
  check(
    "a locked piece is in every set, though another is better",
    recommend(want(["attack", 7]), cat, 10, null, plain(null, null)).map(
      (set) => set.pieces.head?.armorId,
    ),
    ["plain-helm", "plain-helm"],
  );
  check(
    "the jewels on it stay where they are, and the search fills the slots still empty",
    recommend(want(["attack", 7]), cat, 10, null, plain("guard-jewel", null))[0].pieces.head,
    { armorId: "plain-helm", decoIds: ["guard-jewel", "attack-jewel"] },
  );
  // unlocked, the blade's big slot would take the guard jewel the helm already holds
  check(
    "a jewel on a locked piece counts: the target it meets takes no second one",
    recommend(want(["guard", 1]), cat, 10, "blade", plain("guard-jewel", null))[0].weapon,
    { weaponId: "blade", decoIds: [null, null] },
  );
  check(
    "a locked charm stays, though it grants nothing wanted",
    recommend(want(["attack", 7]), cat, 10, null, { charmId: "eye-charm" })[0].charmId,
    "eye-charm",
  );
  // guard has to go to the helm: the blade's big slot is taken, by a jewel that fits a small one
  check(
    "a locked weapon keeps the jewel on it, in the slot it is in",
    recommend(want(["guard", 1], ["attack", 2]), cat, 10, "blade", {
      weapon: { weaponId: "blade", decoIds: ["attack-jewel", null] },
    })[0],
    {
      pieces: {
        head: { armorId: "plain-helm", decoIds: ["guard-jewel", null] },
        chest: { armorId: "plate", decoIds: [] },
        arms: null,
        waist: null,
        legs: null,
      },
      charmId: "attack-charm",
      weapon: { weaponId: "blade", decoIds: ["attack-jewel", null] },
    },
  );
  // the build and the locks are saved in the browser and can outlive a reload of the dataset
  check(
    "a locked piece the catalog lost is no lock",
    recommend(want(["attack", 7]), cat, 10, null, {
      pieces: { head: { armorId: "gone", decoIds: [] } },
    })[0].pieces.head?.armorId,
    "attack-helm",
  );
  check(
    "a jewel the catalog lost is an empty slot",
    recommend(want(["attack", 7]), cat, 10, null, plain("gone", null))[0].pieces.head?.decoIds,
    ["attack-jewel", "attack-jewel"],
  );
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
  const wanted = ids.map((_, i) => ({ skill: ids[(i + seed) % ids.length], level: 1 + int(5) }));
  // three seeds in four hold a weapon, with up to two slots of its own. It is drawn last, so
  // the armor, charms and targets of a seed are what they were before weapons were in.
  const blade =
    seed % 4 ? weapon("blade", Array.from({ length: int(3) }, () => 1 + int(3))) : undefined;
  const cat = catalog(armors, jewels, charms, blade ? [blade] : []);

  // Each catalog is searched twice: with nothing locked, then with a piece locked, a jewel on
  // some of its slots, and on a coin toss a charm and the blade as well. The locks are drawn
  // last, as the blade was, so a seed's catalog is what it was before there were any.
  const pin = (slots: number[]) =>
    slots.map((level) => {
      const fits = jewels.filter((j) => j.slot <= level);
      return int(2) ? fits[int(fits.length)].id : null;
    });
  const piece = armors[int(armors.length)];
  const locks: Locked = { pieces: { [piece.type]: { armorId: piece.id, decoIds: pin(piece.slots) } } };
  if (int(2)) locks.charmId = charms[int(charms.length)].id;
  if (blade && int(2)) locks.weapon = { weaponId: blade.id, decoIds: pin(blade.slots) };

  for (const locked of [{}, locks] as Locked[]) {
    const tag = `seed ${seed}${locked === locks ? ", locked" : ""}`;

    const best = [-1, -1]; // rank, defense
    const types = ARMOR_TYPES.map((type) =>
      armors.filter((a) => a.type === type && a.id === (locked.pieces?.[type]?.armorId ?? a.id)),
    );
    const sizes = wanted.map((w) => jewels.find((j) => j.skills[0].skill === w.skill)!.slot);
    const each = (chosen: Armor[]) => {
      if (chosen.length < types.length) {
        for (const next of types[chosen.length]) each([...chosen, next]);
        return;
      }
      const defense = chosen.reduce((sum, a) => sum + a.defense, 0);
      // each row's slots beside the jewels a lock holds there: those are points in hand, and
      // only the slots left are to fill
      const rows = [
        ...chosen.map((a) => [a.slots, locked.pieces?.[a.type]?.decoIds ?? []] as const),
        [blade?.slots ?? [], locked.weapon?.decoIds ?? []] as const,
      ];
      const slots = rows.flatMap(([levels, on]) => levels.filter((_, at) => !on[at]));
      const fixed = rows.flatMap(([, on]) =>
        on.flatMap((id) => cat.decorations.get(id ?? "")?.skills ?? []),
      );
      const worn = charms.find((c) => c.id === locked.charmId);
      for (const charmed of worn ? [worn] : [undefined, ...charms]) {
        const granted = [
          ...[...chosen, ...(charmed ? [charmed] : [])].flatMap((item) => item.skills),
          ...fixed,
        ];
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
    const limit = seed % 2 ? 1 : 10;
    const sets = recommend(wanted, cat, limit, blade?.id, locked);
    const [top] = sets;
    check(`${tag}: the set holds the weapon in hand`, top.weapon?.weaponId, blade?.id);
    check(
      `${tag}: every jewel on the weapon sits in a slot it fits`,
      blade?.slots.map((level, i) => (cat.decorations.get(top.weapon?.decoIds[i] ?? "")?.slot ?? 0) <= level),
      blade?.slots.map(() => true),
    );
    for (const type of ARMOR_TYPES) {
      const piece = top.pieces[type]!;
      const worn = cat.armors.get(piece.armorId)!;
      check(`${tag}: the ${type} slot holds a ${type} piece`, worn.type, type);
      check(
        `${tag}: every jewel on ${worn.id} sits in a slot it fits`,
        worn.slots.map((level, i) => (cat.decorations.get(piece.decoIds[i] ?? "")?.slot ?? 0) <= level),
        worn.slots.map(() => true),
      );
    }
    check(
      `${tag}: the first result is the best of every combination`,
      [rank(reached(top, cat, wanted)), computeTotals(top, cat).defense],
      best,
    );

    // what is locked is in every set, each of its jewels in the slot it was in
    const kept = (now: (string | null)[] = [], then: (string | null)[] = []) =>
      then.every((id, at) => id === null || now[at] === id);
    for (const set of sets) {
      for (const type of ARMOR_TYPES) {
        const lock = locked.pieces?.[type];
        if (!lock) continue;
        check(`${tag}: the locked ${type} piece is in the set`, set.pieces[type]?.armorId, lock.armorId);
        check(`${tag}: with its jewels`, kept(set.pieces[type]?.decoIds, lock.decoIds), true);
      }
      if (locked.charmId) check(`${tag}: the locked charm is in the set`, set.charmId, locked.charmId);
      check(`${tag}: the locked weapon keeps its jewels`, kept(set.weapon?.decoIds, locked.weapon?.decoIds), true);

      // Choosing a set makes the jewels it put on a locked row part of the lock, and the page
      // searches again. The set has to come back as it was, or the page loses track of which
      // one is worn.
      const chosen: Locked = {
        pieces: Object.fromEntries(
          ARMOR_TYPES.flatMap((type) => (locked.pieces?.[type] ? [[type, set.pieces[type]]] : [])),
        ),
        charmId: locked.charmId,
        weapon: locked.weapon && set.weapon,
      };
      check(
        `${tag}: a set chosen is found again by the search it sets off`,
        recommend(wanted, cat, limit, blade?.id, chosen).some(
          (again) => JSON.stringify(again) === JSON.stringify(set),
        ),
        true,
      );
    }
  }
}

console.log("recommend ok");
