import type { Build, SavedSet } from "./types.ts";

// What makes two builds the same set. Spelt out, not the whole build as it was saved: one
// from before weapons has no weapon key, and would never equal a set that says `weapon: null`.
export const keyOf = (build: Build) =>
  JSON.stringify([build.pieces, build.charmId, build.weapon ?? null]);

// Nothing equipped: there is no set to save.
export const isEmpty = (build: Build) =>
  !build.weapon && !build.charmId && Object.values(build.pieces).every((piece) => !piece);

// A name is one name whatever its case and the spaces around it: a phone capitalizes as it
// likes, and "Safi bow" beside "Safi Bow" would be one set kept twice.
const fold = (name: string) => name.trim().toLowerCase();

export const named = (sets: SavedSet[], name: string) =>
  sets.find((set) => fold(set.name) === fold(name));

// The list with this build under this name, newest first. A set already of that name is
// replaced, which is how a saved set is updated.
export const save = (sets: SavedSet[], name: string, build: Build): SavedSet[] => [
  { name: name.trim(), build },
  ...sets.filter((set) => fold(set.name) !== fold(name)),
];
