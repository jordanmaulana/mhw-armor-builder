// Self-check for the saved sets' rules, run by `pnpm test` with plain node like totals.test.ts.
import { isEmpty, keyOf, named, save } from "./saved.ts";
import type { Build, SavedSet } from "./types.ts";

function check(what: string, actual: unknown, expected: unknown) {
  const [a, e] = [JSON.stringify(actual), JSON.stringify(expected)];
  if (a !== e) throw new Error(`${what}: expected ${e}, got ${a}`);
}

const bare: Build = {
  pieces: { head: null, chest: null, arms: null, waist: null, legs: null },
  charmId: null,
  weapon: null,
};
const wearing = (armorId: string, decoIds: (string | null)[] = []): Build => ({
  ...bare,
  pieces: { ...bare.pieces, head: { armorId, decoIds } },
});
const names = (sets: SavedSet[]) => sets.map((set) => set.name);

{
  const one = save([], "Fatalis GS", wearing("dragonhead"));
  check("a set is saved under its name", names(one), ["Fatalis GS"]);
  check("with the build as it was", one[0].build, wearing("dragonhead"));

  const two = save(one, "Safi Bow", wearing("safi-crested"));
  check("the newest is first", names(two), ["Safi Bow", "Fatalis GS"]);
  check("saving leaves the list it was given alone", names(one), ["Fatalis GS"]);

  const again = save(two, "Fatalis GS", wearing("rath-helm"));
  check("a name already there replaces its set", names(again), ["Fatalis GS", "Safi Bow"]);
  check("with the new build", again[0].build, wearing("rath-helm"));

  // a phone capitalizes as it likes: "Safi bow" beside "Safi Bow" would be two of one set
  const cased = save(two, "  safi bow ", wearing("rath-helm"));
  check("whatever its case and the spaces around it", cased.length, 2);
  check("and the name is kept as it was typed, trimmed", names(cased), ["safi bow", "Fatalis GS"]);

  check("a set is found by its name", named(two, "Safi Bow")?.build, wearing("safi-crested"));
  check("in any case, with spaces around it", named(two, " FATALIS gs ")?.name, "Fatalis GS");
  check("and a name not in the list finds none", named(two, "Fatalis"), undefined);
}

{
  // a build saved before weapons has no such key, and it is read back as it was saved
  const { weapon, ...old } = wearing("dragonhead", ["attack-jewel"]);
  check("a build from before weapons was held as null", weapon, null);
  check(
    "is the same set as one that says it has none",
    keyOf(old as Build) === keyOf(wearing("dragonhead", ["attack-jewel"])),
    true,
  );
  check(
    "another jewel is another set",
    keyOf(wearing("dragonhead", ["attack-jewel"])) === keyOf(wearing("dragonhead", [null])),
    false,
  );
  check(
    "and so is a weapon",
    keyOf(wearing("dragonhead")) ===
      keyOf({ ...wearing("dragonhead"), weapon: { weaponId: "black-fatalis-blade", decoIds: [] } }),
    false,
  );
}

check("nothing equipped is nothing to save", isEmpty(bare), true);
check("nor is a build from before weapons with nothing on", isEmpty({ ...bare, weapon: undefined } as unknown as Build), true);
check("a piece is something", isEmpty(wearing("dragonhead")), false);
check("so is a charm alone", isEmpty({ ...bare, charmId: "attack-charm" }), false);
check(
  "and a weapon alone",
  isEmpty({ ...bare, weapon: { weaponId: "black-fatalis-blade", decoIds: [] } }),
  false,
);

console.log("saved ok");
