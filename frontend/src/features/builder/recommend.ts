import {
  ARMOR_TYPES,
  type Armor,
  type Build,
  type Catalog,
  type Charm,
  type Decoration,
  type EquippedWeapon,
  type GrantedSkill,
} from "./types.ts";

// ponytail: the search runs in a worker (`recommend.worker.ts`) on every change to the wanted
// list, and grows with it. Twelve damage skills at their cap take ~0.5s on an M1, ~0.9s with a
// weapon of two level 4 slots, and the slowest list found (eleven skills, all met) ~8s; most
// take a few ms. The page stays usable meanwhile, but the sets wait: raising this lengthens it.
export const MAX_WANTED = 12;

interface Row {
  id: string | null; // null: leave this one empty
  v: number[]; // points toward each wanted skill
  // slots a wanted jewel fits, counted by level: c[1]..c[4]. c[5] is zero on a real row: the
  // search uses it for points that may go to any skill (see `ahead`)
  c: number[];
  def: number;
}

// The rows the search has to keep. Each is in every build with the jewels on it where they
// are: only its empty slots are the search's to fill.
export interface Locked {
  pieces?: Partial<Build["pieces"]>;
  charmId?: string | null;
  weapon?: EquippedWeapon | null; // the weapon in hand, or it locks nothing
}

// Full builds for a list of skill targets, best first. `wanted` is in priority order: builds are
// compared by the level they reach of each skill (never more than its target), first skill
// first, and by defense when those are equal. The weapon is a given, not something searched
// for: every build holds it, and its slots are filled along with the armor's. So is a locked
// row, and the jewels on one are a given too.
export function recommend(
  wanted: GrantedSkill[],
  catalog: Catalog,
  limit = 10,
  weaponId: string | null = null,
  locked: Locked = {},
): Build[] {
  // the list is read back from localStorage: drop skills the catalog lost, hold levels to the cap
  const targets = wanted
    .flatMap(({ skill, level }) => {
      const max = catalog.skills.get(skill)?.max_level;
      return max ? [{ skill, level: Math.max(1, Math.min(Math.floor(level) || 1, max)) }] : [];
    })
    .slice(0, MAX_WANTED);
  if (targets.length === 0) return [];

  const index = new Map(targets.map((target, i) => [target.skill, i]));
  const points = (granted: GrantedSkill[]) => {
    const v = targets.map(() => 0);
    for (const { skill, level } of granted) {
      const i = index.get(skill);
      if (i !== undefined) v[i] += level;
    }
    return v;
  };

  // One jewel per skill, the smallest that grants that skill alone: a point of it, in any slot.
  const jewels = targets.map(({ skill }) => {
    let smallest: Decoration | undefined;
    for (const jewel of catalog.decorations.values()) {
      const alone = jewel.skills.length === 1 && jewel.skills[0].skill === skill;
      if (alone && (!smallest || jewel.slot < smallest.slot)) smallest = jewel;
    }
    return smallest;
  });

  // The level 4 jewels that do more than one of those: a "+" jewel, two levels or more of one
  // skill, or a combo, a level each of two wanted skills. Points past a target count for nothing,
  // so a jewel is kept only while two of its points count, and not when another one brings as
  // many of every skill (of two alike, the first). Best for the first skill last: `best` below
  // tries them from the end.
  const sum = (v: number[]) => v.reduce((total, p) => total + p, 0);
  const big = [...catalog.decorations.values()].flatMap((jewel) => {
    const v = points(jewel.skills).map((p, k) => Math.min(p, targets[k].level));
    return jewel.slot === 4 && sum(v) >= 2 ? [{ id: jewel.id, v }] : [];
  });
  const noLess = (a: number[], b: number[]) => a.every((p, k) => p >= b[k]);
  const fours = big
    .filter((x, i) => !big.some((y, j) => j !== i && noLess(y.v, x.v) && (j < i || !noLess(x.v, y.v))))
    .sort((a, b) => {
      const k = a.v.findIndex((p, k) => p !== b.v[k]);
      return k < 0 ? 0 : a.v[k] - b.v[k];
    });
  const most = Math.max(0, ...fours.map((jewel) => sum(jewel.v))); // the most one slot can bring

  // Only slots a wanted jewel fits count, and past the biggest of those jewels a bigger slot is
  // no better. With no jewels at all the bounds are ±Infinity and every slot drops out.
  const sizes = jewels.flatMap((jewel) => (jewel ? [jewel.slot] : []));
  if (fours.length) sizes.push(4);
  const [smallest, biggest] = [Math.min(...sizes), Math.max(...sizes)];
  const usable = (slots: number[]) => {
    const c = [0, 0, 0, 0, 0, 0];
    for (const level of slots) if (level >= smallest) c[Math.min(level, biggest)]++;
    return c;
  };

  // Jewels go in by priority, each into the smallest slot it fits. That is exact, not a guess: a
  // jewel fits every slot of its size or more, so this always leaves the bigger slots to whatever
  // comes next. Level 5 holds loose points, good for any skill, jewel or not; they go last for
  // the same reason. Returns the levels reached as the digits of one number, first skill most
  // significant, which makes comparing two builds a plain comparison. A bound can ask for less
  // than a target (`caps`), where it knows a skill can't reach it anyway, and can count the level
  // 4 slots and the loose points as other than the slots say.
  const base = Math.max(...targets.map((target) => target.level)) + 1;
  const goals = targets.map((target) => target.level);
  const perfect = goals.reduce((score, goal) => score * base + goal, 0);
  const stock = [0, 0, 0, 0, 0, 0]; // what `fill` has left, shared: no call runs inside another
  const fill = (v: number[], slots: number[], caps = goals, four = slots[4], loose = slots[5]) => {
    for (let level = 1; level < 4; level++) stock[level] = slots[level];
    [stock[4], stock[5]] = [four, loose];
    let score = 0;
    for (let i = 0; i < targets.length; i++) {
      const jewel = jewels[i];
      const target = caps[i];
      let have = v[i];
      for (let level = jewel?.slot ?? 5; level <= 5 && have < target; ) {
        if (stock[level] > 0) {
          stock[level]--;
          have += level < 5 && jewel ? jewel.skills[0].level : 1;
        } else level++;
      }
      score = score * base + Math.min(have, target);
    }
    return score;
  };

  // What `best` scores at most, for a few `fill`s. The level 4 slots are one budget, and a
  // point drawn on it costs 1 / gain of a slot, gain being the most points the level 4 slot that
  // brings the skill one can hold (1 for a skill no big jewel brings): a big jewel's points then
  // cost one slot or less, and so does a small jewel's point, so nothing a real fill can do is
  // left out. The other slots and the loose points are as in `fill`, every jewel for them a level
  // of one skill as in the game. Each skill, first first, takes all it can while what is taken so
  // far still fits, which is the best of the budget by priority.
  //
  // Whether it fits: a skill fits slots from some level up, `lowest`. Those of level s or more
  // share the slots of level s to 3 and the loose points, so for each s what they ask beyond
  // those comes out of the budget. The cheapest way to cover the four at once is from the inside
  // out, drawing first on the skills with the most gain: a point taken for the skills of level s
  // or more counts for every level below too.
  const gain = targets.map((_, k) =>
    Math.max(1, ...fours.flatMap(({ v }) => (v[k] > 0 ? [sum(v)] : []))),
  );
  // 4 for a skill only big jewels bring, 5 for one no jewel does
  const lowest = jewels.map((jewel, k) => jewel?.slot ?? (gain[k] > 1 ? 4 : 5));
  // ask[s]: the points skills of level s or more take; asks[s][g]: those of level s and gain g.
  // Shared by every call, none of which runs inside another.
  const ask = [0, 0, 0, 0, 0];
  const asks = ask.map(() => [0, 0, 0, 0, 0]);
  const room = [0, 0, 0, 0, 0]; // room[s]: the slots of level s to 3 and the loose points
  const left = [0, 0, 0, 0, 0];
  const take = (k: number, n: number) => {
    for (let s = 1; s <= Math.min(lowest[k], 4); s++) ask[s] += n;
    if (lowest[k] <= 4) asks[lowest[k]][gain[k]] += n;
  };
  const fits = (budget: number) => {
    left.fill(0);
    let [cost, covered] = [0, 0];
    for (let s = 4; s >= 1; s--) {
      for (let g = 1; g <= 4; g++) left[g] += asks[s][g];
      let need = ask[s] - room[s] - covered;
      for (let g = 4; g >= 1 && need > 0; g--) {
        const t = Math.min(need, left[g]);
        left[g] -= t;
        need -= t;
        covered += t;
        cost += t * (12 / g);
      }
      if (need > 0) return false;
    }
    return cost <= 12 * budget;
  };
  // Above `bound`, for one `fill`: every level 4 slot as `most` of them, or as `most` loose
  // points where a skill only big jewels bring would be left out.
  const loose4 = lowest.some((level, k) => level === 4 && !jewels[k]);
  const rough = (v: number[], c: number[], caps = goals) => {
    if (!fours.length || !c[4]) return fill(v, c, caps);
    return loose4 ? fill(v, c, caps, 0, c[5] + c[4] * most) : fill(v, c, caps, c[4] * most);
  };
  const bound = (v: number[], c: number[], caps = goals) => {
    if (!fours.length || !c[4]) return fill(v, c, caps);
    ask.fill(0);
    for (const row of asks) row.fill(0);
    room[4] = c[5];
    for (let s = 3; s >= 1; s--) room[s] = room[s + 1] + c[s];
    let score = 0;
    for (let k = 0; k < targets.length; k++) {
      const target = caps[k];
      let [lo, hi] = [0, Math.max(0, target - v[k])];
      take(k, hi);
      if (hi && !fits(c[4])) {
        take(k, -hi);
        hi--;
        while (lo < hi) {
          const mid = Math.ceil((lo + hi) / 2);
          take(k, mid);
          if (fits(c[4])) lo = mid;
          else hi = mid - 1;
          take(k, -mid);
        }
        take(k, lo);
      } else lo = hi;
      score = score * base + Math.min(v[k] + lo, target);
    }
    return score;
  };

  // The exact score, and the big jewels that reach it (indices into `fours`, in order). Every
  // set of big jewels the level 4 slots can hold is tried once, indices never going down, with
  // `fill` for the slots left. A jewel is never added that brings no point still short of its
  // target, or one point a small jewel in its slot would bring as well; and a branch stops when
  // even `bound` can't beat what was found, or can't reach `floor`: a caller that passes one only
  // needs the score of a set that does.
  //
  // Each set is tried before the sets that hold it and more, and the later jewels first, so of
  // two sets that score alike the one found first has fewer of `fours[0]`, or as many and fewer
  // of `fours[1]`, and so on: no big jewel at all wins every tie. That choice holds when one of
  // its jewels is taken out and seated, the rest being the choice for what is left, which is how
  // a set chosen comes back once a lock holds part of it.
  const best = (v: number[], c: number[], floor = 0) => {
    let top = { score: fill(v, c), picks: [] as number[] };
    const beyond = (v: number[], c: number[]) => {
      const bar = Math.max(top.score + 1, floor);
      return rough(v, c) >= bar && bound(v, c) >= bar;
    };
    if (!fours.length || !c[4] || !beyond(v, c)) return top;
    const picks: number[] = [];
    const walk = (to: number, v: number[], free: number) => {
      const rest = c.with(4, free - 1); // what is left once one of the free ones takes a big jewel
      for (let k = fours.length - 1; k >= to; k--) {
        const add = fours[k].v;
        let [n, only] = [0, 0]; // the points it brings that count, and a skill they go to
        for (let i = 0; i < add.length; i++) {
          const p = Math.min(add[i], Math.max(0, goals[i] - v[i]));
          if (p) [n, only] = [n + p, i];
        }
        if (!n || (n === 1 && jewels[only])) continue;
        const more = v.map((p, i) => p + add[i]);
        picks.push(k);
        const score = fill(more, rest);
        if (score > top.score) top = { score, picks: picks.slice() };
        if (free > 1 && beyond(more, rest)) walk(k, more, free - 1);
        picks.pop();
      }
    };
    walk(0, v, c[4]);
    return top;
  };

  // slots a are worth at least slots b: at every level, as many of that size or bigger
  const covers = (a: number[], b: number[]) => {
    let [x, y] = [0, 0];
    for (let level = 4; level >= 1; level--) {
      x += a[level];
      y += b[level];
      if (x < y) return false;
    }
    return true;
  };
  // A row is dropped when another has at least its points, slots and defense: swapping that one
  // in can only help. Of two equal rows the earlier stays. This is what makes the search small:
  // some 340 pieces a slot come down to between 12 and 32 for a list of twelve skills.
  const prune = (rows: Row[]) =>
    rows.filter(
      (x, i) =>
        !rows.some(
          (y, j) =>
            j !== i &&
            y.def >= x.def &&
            y.v.every((p, k) => p >= x.v[k]) &&
            covers(y.c, x.c) &&
            (j < i || y.def > x.def || y.v.some((p, k) => p > x.v[k]) || !covers(x.c, y.c)),
        ),
    );

  // The jewels a locked row holds, slot by slot, and null where the slot is the search's to
  // fill: an empty one, or one whose jewel the catalog lost. Every slot, when the row is not
  // locked. The skills of those jewels are points in hand, and only the slots left count.
  const seated = (slots: number[], decoIds: (string | null)[] = []) =>
    slots.map((_, at) => catalog.decorations.get(decoIds[at] ?? "")?.id ?? null);
  const granted = (decoIds: (string | null)[]) =>
    decoIds.flatMap((id) => catalog.decorations.get(id ?? "")?.skills ?? []);
  const open = (slots: number[], decoIds: (string | null)[]) =>
    slots.filter((_, at) => !decoIds[at]);

  // The blank goes first so a charm with none of the wanted skills loses to wearing no charm,
  // rather than one being picked at random. For armor it only survives a slot with no pieces.
  const blank: Row = { id: null, v: points([]), c: usable([]), def: 0 };
  const charmRow = (charm: Charm): Row => ({ ...blank, id: charm.id, v: points(charm.skills) });
  const armorRow = (armor: Armor, decoIds: (string | null)[] = []): Row => ({
    id: armor.id,
    v: points([...armor.skills, ...granted(decoIds)]),
    c: usable(open(armor.slots, decoIds)),
    def: armor.defense,
  });
  // A locked row is a group of one. Not even the blank stands beside it: a locked charm with
  // none of the wanted skills is the blank's equal, and of two equal rows the earlier stays.
  const lockedCharm = catalog.charms.get(locked.charmId ?? "");
  const groups = [
    lockedCharm
      ? [charmRow(lockedCharm)]
      : prune([blank, ...[...catalog.charms.values()].map(charmRow)]),
    ...ARMOR_TYPES.map((type) => {
      const lock = locked.pieces?.[type];
      const armor = catalog.armors.get(lock?.armorId ?? "");
      if (lock && armor) return [armorRow(armor, seated(armor.slots, lock.decoIds))];
      const rows = [...catalog.armors.values()].filter((piece) => piece.type === type);
      return prune([blank, ...rows.map((piece) => armorRow(piece))]);
    }),
  ];
  // strongest first, so good builds turn up early and the bound below has something to cut with
  for (const rows of groups) rows.sort((a, b) => bound(b.v, b.c) - bound(a.v, a.c) || b.def - a.def);

  // What a group adds at most, taking its best slots and best defense at once, and its points
  // counted three ways. `v` takes the best of every skill at once, as if one piece carried them
  // all. `loose` keeps to the most points one piece really carries, but lets them go to any
  // skill. `whole` is the most one piece brings with its slots too, every one of them loose. No
  // real choice beats any of them, which is all a bound needs, and each is tight where another is
  // slack: `v` alone stops cutting past a handful of skills, and with level 4 slots worth more
  // than one point, the best slots and the best points of a group are seldom the same piece's.
  interface Reach {
    v: number[];
    at: number[]; // at[level]: slots of that level or more
    loose: number;
    whole: number;
    def: number;
  }
  const useful = (row: Row) => row.v.reduce((sum, p, k) => sum + Math.min(p, targets[k].level), 0);
  const worth = (c: number[]) => c[1] + c[2] + c[3] + c[4] * Math.max(1, most);
  const nothing: Reach = { v: blank.v, at: blank.c, loose: 0, whole: 0, def: 0 };
  const plus = (a: Reach, b: Reach): Reach => ({
    v: a.v.map((p, k) => p + b.v[k]),
    at: a.at.map((n, level) => n + b.at[level]),
    loose: a.loose + b.loose,
    whole: a.whole + b.whole,
    def: a.def + b.def,
  });
  const counts = (at: number[]) => at.map((n, level) => (level ? n - (at[level + 1] ?? 0) : 0));
  // tough[d][i]: what group d adds at most with one of its i + 1 toughest rows, for a set that
  // has to be tougher than the last one kept
  const tough = groups.map((rows) => {
    let reach = nothing;
    return rows
      .toSorted((a, b) => b.def - a.def)
      .map((row) => {
        reach = {
          v: reach.v.map((p, k) => Math.max(p, row.v[k])),
          at: reach.at.map((n, level) => Math.max(n, row.c.slice(level).reduce((sum, m) => sum + m, 0))),
          loose: Math.max(reach.loose, useful(row)),
          whole: Math.max(reach.whole, useful(row) + worth(row.c)),
          def: row.def, // the defense of the last of them, the least
        };
        return reach;
      });
  });
  // ahead[d]: what the groups from d on add at most, each with any of its rows
  const ahead = [nothing];
  for (const rows of tough.toReversed()) {
    ahead.unshift(plus(ahead[0], { ...rows.at(-1)!, def: rows[0].def }));
  }
  // The same when the groups from d on have to add `need` defense or more: each group then has
  // to take a row that leaves the others room to make up the rest. Undefined when none can.
  const toughest = (d: number, need: number) => {
    if (need <= 0) return ahead[d];
    const spare = ahead[d].def - need;
    if (spare < 0) return undefined;
    let reach = nothing;
    for (let g = d; g < groups.length; g++) {
      const rows = tough[g];
      const floor = rows[0].def - spare;
      let [lo, hi] = [0, rows.length - 1];
      while (lo < hi) {
        const mid = Math.ceil((lo + hi) / 2);
        if (rows[mid].def >= floor) lo = mid;
        else hi = mid - 1;
      }
      reach = plus(reach, rows[lo]);
    }
    return reach;
  };

  // The least of the three bounds on what a set from here reaches, with `a` ahead, or the first
  // found under `floor`. With nothing ahead the three are one. `rough` goes first, being cheap and
  // the one that cuts most; `bound` is only worth it where a level 4 slot is in it.
  //
  // Loose points go to any skill, but a skill no jewel brings only has what the pieces carry, so
  // where points are loose such a skill is held to that.
  const bare = lowest.includes(5);
  const ceiling = (d: number, v: number[], c: number[], a: Reach, floor: number) => {
    if (d === groups.length) {
      const low = rough(v, c);
      return low < floor || !fours.length || !c[4] ? low : bound(v, c);
    }
    const caps = bare
      ? goals.map((goal, k) => (lowest[k] === 5 ? Math.min(goal, v[k] + a.v[k]) : goal))
      : goals;
    const more = counts(a.at);
    const slots = c.map((n, level) => n + more[level]);
    const tries: [number[], number[], number[]][] = [
      [v, c.with(5, c[5] + a.whole), caps],
      [v.map((p, k) => p + a.v[k]), slots, goals],
      [v, slots.with(5, a.loose), caps],
    ];
    let low = Infinity;
    for (const [v, c, caps] of tries) if ((low = Math.min(low, rough(v, c, caps))) < floor) return low;
    if (fours.length) {
      for (const [v, c, caps] of tries) {
        if (c[4] && (low = Math.min(low, bound(v, c, caps))) < floor) return low;
      }
    }
    return low;
  };

  // Two passes. The first keeps only sets that meet every target, and walks as if the list were
  // full of them already: a branch that can't meet them all is cut at once, and once ten are
  // found the rest is a race on defense. That is the whole answer when it finds ten. When it
  // finds fewer it has found all there are, and the second pass looks for the others.
  let first = true;
  const all = { score: perfect, def: -1 };
  const kept: { score: number; def: number; ids: (string | null)[]; v: number[]; c: number[] }[] = [];
  const ids: (string | null)[] = [];
  // the points and slots in hand at each depth, rewritten for every row tried there
  const vs = ahead.map(() => targets.map(() => 0));
  const cs = ahead.map(() => [0, 0, 0, 0, 0, 0]);
  const search = (d: number, def: number) => {
    const [v, c] = [vs[d], cs[d]];
    // once the list is full, a branch that can't beat its last entry is not worth walking
    const last = kept.length === limit ? kept[limit - 1] : first ? all : undefined;
    if (last) {
      // One that meets every target can't be beaten on skills.
      const top = last.score < perfect ? ceiling(d, v, c, ahead[d], last.score) : perfect;
      if (top < last.score) return;
      // At best a tie on skills, so it has to be tougher, and that leaves fewer pieces to take.
      if (top === last.score) {
        const a = toughest(d, last.def - def + 1);
        if (!a || ceiling(d, v, c, a, last.score) < last.score) return;
      }
    }
    if (d === groups.length) {
      const { score } = best(v, c, last?.score);
      if (first ? score < perfect : score === perfect) return;
      kept.push({ score, def, ids: ids.slice(), v: v.slice(), c: c.slice() });
      kept.sort((a, b) => b.score - a.score || b.def - a.def);
      if (kept.length > limit) kept.pop();
      return;
    }
    const [nv, nc] = [vs[d + 1], cs[d + 1]];
    for (const row of groups[d]) {
      ids[d] = row.id;
      for (let k = 0; k < v.length; k++) nv[k] = v[k] + row.v[k];
      for (let level = 0; level < 6; level++) nc[level] = c[level] + row.c[level];
      search(d + 1, def + row.def);
    }
  };
  // The weapon's slots are there before a piece is chosen, and so are the points of the jewels
  // on it when it is locked. That is all the search knows of it: the bounds add what lies ahead
  // to the points and slots in hand, whichever these are.
  const weapon = catalog.weapons.get(weaponId ?? "");
  const onWeapon = seated(
    weapon?.slots ?? [],
    locked.weapon?.weaponId === weapon?.id ? locked.weapon?.decoIds : undefined,
  );
  [vs[0], cs[0]] = [points(granted(onWeapon)), usable(open(weapon?.slots ?? [], onWeapon))];
  search(0, 0);
  first = false;
  if (kept.length < limit) search(0, 0);

  // the same fill once more, this time onto the real slots of the pieces that won
  return kept.map(({ ids: [charmId, ...armorIds], v, c }) => {
    const pieces: Build["pieces"] = { head: null, chest: null, arms: null, waist: null, legs: null };
    const free: { decoIds: (string | null)[]; at: number; level: number }[] = [];
    ARMOR_TYPES.forEach((type, i) => {
      const armor = catalog.armors.get(armorIds[i] ?? "");
      if (!armor) return;
      // a locked piece comes back with its jewels in place, and only its other slots are free
      const lock = locked.pieces?.[type];
      const decoIds = seated(armor.slots, lock?.armorId === armor.id ? lock.decoIds : undefined);
      pieces[type] = { armorId: armor.id, decoIds };
      armor.slots.forEach((level, at) => {
        if (!decoIds[at]) free.push({ decoIds, at, level });
      });
    });
    // After the armor's, and the sort is stable: of two slots alike the armor's is filled
    // first, so a jewel is not on the weapon when one of the pieces could hold it.
    let held: Build["weapon"] = null;
    if (weapon) {
      held = { weaponId: weapon.id, decoIds: onWeapon.slice() };
      for (const [at, level] of weapon.slots.entries()) {
        if (!onWeapon[at]) free.push({ decoIds: held.decoIds, at, level });
      }
    }
    free.sort((a, b) => a.level - b.level);

    // The big jewels first, each in the first level 4 slot still free; then the small ones, as
    // `fill` counted them, into what is left.
    const have = v.slice();
    for (const k of best(v, c).picks) {
      const [slot] = free.splice(
        free.findIndex((slot) => slot.level >= 4),
        1,
      );
      slot.decoIds[slot.at] = fours[k].id;
      fours[k].v.forEach((p, i) => (have[i] += p));
    }
    targets.forEach(({ level: target }, i) => {
      const jewel = jewels[i];
      while (jewel && have[i] < target) {
        const at = free.findIndex((slot) => slot.level >= jewel.slot);
        if (at < 0) break;
        const [slot] = free.splice(at, 1);
        slot.decoIds[slot.at] = jewel.id;
        have[i] += jewel.skills[0].level;
      }
    });
    return { pieces, charmId, weapon: held };
  });
}
