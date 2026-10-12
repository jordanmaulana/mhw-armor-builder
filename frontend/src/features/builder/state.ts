import { atomWithStorage } from "jotai/utils";

import type { Build, GrantedSkill } from "@/features/builder/types";

const EMPTY_BUILD: Build = {
  pieces: { head: null, chest: null, arms: null, waist: null, legs: null },
  charmId: null,
};

// kept in localStorage so a refresh doesn't throw the set away; getOnInit avoids a flash of empty
export const buildAtom = atomWithStorage<Build>("build", EMPTY_BUILD, undefined, {
  getOnInit: true,
});

// what the set search aims for: most important skill first, `level` is the target
export const wantedAtom = atomWithStorage<GrantedSkill[]>("wanted", [], undefined, {
  getOnInit: true,
});

// monsters (ids) not slain yet: the set search leaves out the armor that needs their materials
export const unslainAtom = atomWithStorage<string[]>("unslain", [], undefined, {
  getOnInit: true,
});
