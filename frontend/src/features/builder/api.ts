import { api } from "@/lib/api";
import type {
  Armor,
  Catalog,
  Charm,
  Decoration,
  SetBonus,
  Skill,
} from "@/features/builder/types";

// skipAuth: the catalog is public, and a logged-out visitor may still carry a dead token
const list = <T>(path: string) => api<T[]>(path, { skipAuth: true });
const byId = <T extends { id: string }>(rows: T[]) => new Map(rows.map((row) => [row.id, row]));

export async function fetchCatalog(): Promise<Catalog> {
  const [skills, setBonuses, armors, decorations, charms] = await Promise.all([
    list<Skill>("/skills/"),
    list<SetBonus>("/set-bonuses/"),
    list<Armor>("/armors/"),
    list<Decoration>("/decorations/"),
    list<Charm>("/charms/"),
  ]);
  return {
    skills: byId(skills),
    setBonuses: byId(setBonuses),
    armors: byId(armors),
    decorations: byId(decorations),
    charms: byId(charms),
  };
}
