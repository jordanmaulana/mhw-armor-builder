// The set search, off the main thread: the page stays usable while a heavy list is searched,
// and a search the input has moved past is ended by ending this worker (`use-sets.ts`).
import { narrow } from "./hunts.ts";
import { recommend, type Locked } from "./recommend.ts";
import type { Build, Catalog, GrantedSkill } from "./types.ts";

export interface Query {
  wanted: GrantedSkill[];
  unslain: ReadonlySet<string>; // monsters not yet slain: the search leaves out their armor
  keep: ReadonlySet<string>; // pieces that stay all the same: the locked ones
  weaponId: string | null;
  locked: Locked;
}

export interface Reply {
  id: number;
  sets: Build[];
  leftOut: number; // pieces the unslain monsters took out of the pool
}

// The catalog comes first, once, and every message after it is a search. Messages arrive in
// the order they were sent, so the catalog is always in place before a search needs it.
export type Message = { catalog: Catalog } | { id: number; query: Query };

let catalog: Catalog | undefined;

self.onmessage = ({ data }: MessageEvent<Message>) => {
  if ("catalog" in data) {
    catalog = data.catalog;
    return;
  }
  if (!catalog) throw new Error("search before the catalog");
  const { wanted, unslain, keep, weaponId, locked } = data.query;
  const pool = narrow(catalog, unslain, keep);
  const reply: Reply = {
    id: data.id,
    sets: recommend(wanted, pool, 10, weaponId, locked),
    leftOut: catalog.armors.size - pool.armors.size,
  };
  self.postMessage(reply);
};
