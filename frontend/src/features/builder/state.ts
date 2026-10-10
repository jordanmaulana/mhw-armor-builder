import { atomWithStorage } from "jotai/utils";

import type { Build } from "@/features/builder/types";

const EMPTY_BUILD: Build = {
  pieces: { head: null, chest: null, arms: null, waist: null, legs: null },
  charmId: null,
};

// kept in localStorage so a refresh doesn't throw the set away; getOnInit avoids a flash of empty
export const buildAtom = atomWithStorage<Build>("build", EMPTY_BUILD, undefined, {
  getOnInit: true,
});
