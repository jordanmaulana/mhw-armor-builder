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

// ponytail: the search runs on the main thread, on every change to the wanted list, and grows
// with it. The slowest list found at this size (twelve damage skills, all at their cap) takes
// ~0.3s on a desktop; most take a few tens of ms. Move it to a Web Worker before raising this,
// or if a phone stutters.
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

  // ponytail: one jewel per skill, the smallest that grants that skill alone. Combo and "+"
  // jewels need a level 4 slot, and half the Master Rank pieces have one: until they are
  // counted, such a slot gets a smaller jewel and the rest of it goes unused.
  const jewels = targets.map(({ skill }) => {
    let smallest: Decoration | undefined;
    for (const jewel of catalog.decorations.values()) {
      const alone = jewel.skills.length === 1 && jewel.skills[0].skill === skill;
      if (alone && (!smallest || jewel.slot < smallest.slot)) smallest = jewel;
    }
    return smallest;
  });

  // Only slots a wanted jewel fits count, and past the biggest of those jewels a bigger slot is
  // no better. With no jewels at all the bounds are ±Infinity and every slot drops out.
  const sizes = jewels.flatMap((jewel) => (jewel ? [jewel.slot] : []));
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
  // significant, which makes comparing two builds a plain comparison.
  const base = Math.max(...targets.map((target) => target.level)) + 1;
  const fill = (v: number[], slots: number[]) => {
    const c = slots.slice();
    let score = 0;
    targets.forEach(({ level: target }, i) => {
      const jewel = jewels[i];
      let have = v[i];
      for (let level = jewel?.slot ?? 5; level <= 5 && have < target; ) {
        if (c[level] > 0) {
          c[level]--;
          have += level < 5 && jewel ? jewel.skills[0].level : 1;
        } else level++;
      }
      score = score * base + Math.min(have, target);
    });
    return score;
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
  for (const rows of groups) rows.sort((a, b) => fill(b.v, b.c) - fill(a.v, a.c) || b.def - a.def);

  // ahead[d]: the most the groups from d on could add, taking each group's best slots and best
  // defense at once, and its points counted two ways. `v` takes the best of every skill at once,
  // as if one piece carried them all. `loose` keeps to the most points one piece really carries,
  // but lets them go to any skill. No real choice beats either, which is all a bound needs, and
  // each is tight where the other is slack: `v` alone stops cutting past a handful of skills.
  const ahead = [{ v: blank.v, c: blank.c, loose: 0, def: 0 }];
  for (const rows of groups.toReversed()) {
    const atLeast = (level: number) =>
      Math.max(...rows.map((row) => row.c.slice(level).reduce((sum, n) => sum + n, 0)));
    const useful = (row: Row) =>
      row.v.reduce((sum, p, k) => sum + Math.min(p, targets[k].level), 0);
    ahead.unshift({
      v: ahead[0].v.map((p, k) => p + Math.max(...rows.map((row) => row.v[k]))),
      c: ahead[0].c.map((n, level) => (level ? n + atLeast(level) - atLeast(level + 1) : 0)),
      loose: ahead[0].loose + Math.max(...rows.map(useful)),
      def: ahead[0].def + Math.max(...rows.map((row) => row.def)),
    });
  }

  const kept: { score: number; def: number; ids: (string | null)[]; v: number[] }[] = [];
  const ids: (string | null)[] = [];
  const search = (d: number, v: number[], c: number[], def: number) => {
    // once the list is full, a branch that can't beat its last entry is not worth walking
    const last = kept.length === limit ? kept[limit - 1] : undefined;
    if (last) {
      const slots = c.map((n, level) => n + ahead[d].c[level]);
      const beaten = (most: number) =>
        most < last.score || (most === last.score && def + ahead[d].def <= last.def);
      if (
        beaten(
          fill(
            v.map((p, k) => p + ahead[d].v[k]),
            slots,
          ),
        ) ||
        beaten(fill(v, slots.with(5, ahead[d].loose)))
      )
        return;
    }
    if (d === groups.length) {
      kept.push({ score: fill(v, c), def, ids: ids.slice(), v });
      kept.sort((a, b) => b.score - a.score || b.def - a.def);
      if (kept.length > limit) kept.pop();
      return;
    }
    for (const row of groups[d]) {
      ids[d] = row.id;
      search(
        d + 1,
        v.map((p, k) => p + row.v[k]),
        c.map((n, level) => n + row.c[level]),
        def + row.def,
      );
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
  search(0, points(granted(onWeapon)), usable(open(weapon?.slots ?? [], onWeapon)), 0);

  // the same fill once more, this time onto the real slots of the pieces that won
  return kept.map(({ ids: [charmId, ...armorIds], v }) => {
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

    const have = v.slice();
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
