import type { Armor, Catalog } from "./types.ts";

// Whether a piece can be forged while these monsters (ids) are still unslain: each of its hunts
// has to name one that is not among them.
export const forgeable = (armor: Armor, unslain: ReadonlySet<string>) =>
  armor.hunts.every((drops) => drops.some((monster) => !unslain.has(monster)));

const NONE: ReadonlySet<string> = new Set();

// The catalog less the pieces that can't be forged yet. With nothing unslain it is the catalog
// itself, not a copy: the set search goes by identity and would search again for nothing.
// `keep` is the pieces (ids) that stay whatever they are made of: a locked piece is worn, and
// the search has to find it.
export function narrow(
  catalog: Catalog,
  unslain: ReadonlySet<string>,
  keep: ReadonlySet<string> = NONE,
): Catalog {
  if (unslain.size === 0) return catalog;
  const armors = [...catalog.armors].filter(
    ([id, armor]) => keep.has(id) || forgeable(armor, unslain),
  );
  return { ...catalog, armors: new Map(armors) };
}
