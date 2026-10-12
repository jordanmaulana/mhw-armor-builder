// Self-check for the unslain-monster rule, run by `pnpm test` with plain node like
// totals.test.ts. The last checks put it in front of recommend, which is how the page uses it.
import { forgeable, narrow } from "./hunts.ts";
import { recommend } from "./recommend.ts";
import type { Armor, Catalog } from "./types.ts";

function check(what: string, actual: unknown, expected: unknown) {
  const [a, e] = [JSON.stringify(actual), JSON.stringify(expected)];
  if (a !== e) throw new Error(`${what}: expected ${e}, got ${a}`);
}

const byId = <T extends { id: string }>(rows: T[]) => new Map(rows.map((r) => [r.id, r]));

const armor = (id: string, over: Partial<Armor>): Armor => ({
  id,
  name: id,
  type: "head",
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
const unslain = (...monsters: string[]) => new Set(monsters);
const asking = (...hunts: string[][]) => armor("piece", { hunts });

check(
  "a piece that asks for no hunt is forged whatever is unslain",
  forgeable(asking(), unslain("rathalos")),
  true,
);
check(
  "a piece of an unslain monster is not",
  forgeable(asking(["rathalos"]), unslain("rathalos")),
  false,
);
check(
  "another monster being unslain does not touch it",
  forgeable(asking(["rathalos"]), unslain("teostra")),
  true,
);
check(
  "a material two monsters drop needs only one of them slain",
  forgeable(asking(["rathalos", "rathian"]), unslain("rathalos")),
  true,
);
check(
  "and can't be had when neither is",
  forgeable(asking(["rathalos", "rathian"]), unslain("rathalos", "rathian")),
  false,
);
check(
  "every material has to be had: one out of reach rules the piece out",
  forgeable(asking(["girros", "vespoid"], ["rathalos"]), unslain("rathalos")),
  false,
);

{
  const attack = { id: "attack", name: "Attack Boost", icon_url: "", description: "", max_level: 7 };
  const catalog: Catalog = {
    skills: byId([attack]),
    setBonuses: new Map(),
    armors: byId([
      armor("rath-helm", {
        defense: 90,
        skills: [{ skill: "attack", level: 2 }],
        hunts: [["rathalos"]],
      }),
      armor("alloy-helm", { defense: 50, skills: [{ skill: "attack", level: 1 }] }),
    ]),
    decorations: new Map(),
    charms: new Map(),
    monsters: new Map(),
  };
  const head = (from: Catalog) =>
    recommend([{ skill: "attack", level: 2 }], from)[0].pieces.head?.armorId;

  // the set search goes by identity: a copy would send it searching again for nothing
  check("nothing unslain: the catalog itself, not a copy", narrow(catalog, unslain()) === catalog, true);

  const left = narrow(catalog, unslain("rathalos"));
  check("an unslain monster's pieces leave the catalog", [...left.armors.keys()], ["alloy-helm"]);
  check("the catalog it was made from keeps them", [...catalog.armors.keys()], [
    "rath-helm",
    "alloy-helm",
  ]);
  check("everything else is the same catalog", left.skills === catalog.skills, true);

  check("with the monster slain the search takes its piece", head(catalog), "rath-helm");
  check("and with it unslain the best of what is left", head(left), "alloy-helm");
}

console.log("hunts ok");
