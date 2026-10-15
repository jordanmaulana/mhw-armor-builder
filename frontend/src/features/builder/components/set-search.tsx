import { useMemo, useState } from "react";
import { useAtom, useAtomValue } from "jotai";
import { ChevronDown, ChevronUp, X } from "lucide-react";

import { Picker } from "@/features/builder/components/picker";
import { MAX_WANTED, type Locked } from "@/features/builder/recommend";
import type { Query } from "@/features/builder/recommend.worker";
import { keyOf } from "@/features/builder/saved";
import { lockedAtom, unslainAtom, wantedAtom } from "@/features/builder/state";
import { computeTotals, effectAt } from "@/features/builder/totals";
import {
  ARMOR_TYPES,
  type Build,
  type Catalog,
  type Monster,
} from "@/features/builder/types";
import { useSets } from "@/features/builder/use-sets";

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hunt";
const BAND = "mx-4 bg-plate py-1 text-center font-serif text-lg text-aqua/70";
const BUTTON = `rounded-sm border border-seam bg-hide px-3 py-1 hover:border-hunt disabled:opacity-40 disabled:hover:border-seam ${FOCUS}`;
const NUDGE = `grid size-7 shrink-0 place-items-center rounded-sm text-moss hover:bg-plate hover:text-bone disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-moss ${FOCUS}`;
// Every row opens with this column: the priority in the wanted list, the rank in the sets. It
// is the armor rows' label column again, and for the same reason: SoundToggle floats over the
// page's bottom-left corner, and what lies under it must not be something to tap.
const GUTTER = "w-12 shrink-0 pl-4 text-sm text-moss tabular-nums";

const MONSTER_SEARCH = {
  label: "Search by name or species",
  hint: "Try part of a name or a species, like “elder”.",
};
// "elder_dragon" as the game writes a species: Elder Dragon
const species = (monster: Monster) =>
  monster.species.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

interface SetSearchProps {
  catalog: Catalog;
  build: Build; // what is equipped, to mark the set it came from
  onUse: (build: Build) => void;
}

// The skills to aim for, most important first, and under them the sets `recommend` finds
// among the armor that can be forged without the monsters marked as not yet slain. A locked
// row of the equipment list is in every one of them, as it is.
export function SetSearch({ catalog, build, onUse }: SetSearchProps) {
  const [saved, setSaved] = useAtom(wantedAtom);
  const [savedUnslain, setSavedUnslain] = useAtom(unslainAtom);
  const lockedRows = useAtomValue(lockedAtom);
  const [adding, setAdding] = useState(false);
  const [marking, setMarking] = useState(false);

  // A list saved before the dataset was reloaded can name skills that are gone. Memoized
  // because the search goes by identity: a new array each render would search each render.
  const wanted = useMemo(
    () => saved.filter((target) => catalog.skills.has(target.skill)),
    [saved, catalog],
  );

  // Only a large monster can be marked: the small ones are slain on the way to anything.
  const monsters = useMemo(
    () => [...catalog.monsters.values()].filter((monster) => monster.type === "large"),
    [catalog],
  );
  // The saved ids get the same two cares as the saved skills: one may be gone from the dataset,
  // and the set is memoized because the pool, and so the search, goes by identity.
  const unslain = useMemo(
    () => new Set(savedUnslain.filter((id) => catalog.monsters.has(id))),
    [savedUnslain, catalog],
  );
  // What is locked, as the search takes it: the rows themselves, with the jewels on them. A
  // row the catalog lost locks nothing. It goes through a string because the search goes by
  // identity and `build` is a new object on every edit: this way only a change to a locked
  // row is a change, and choosing a set that leaves them alone sets off no search.
  const lockedKey = JSON.stringify({
    pieces: Object.fromEntries(
      ARMOR_TYPES.flatMap((type) => {
        const piece = build.pieces[type];
        return lockedRows.includes(type) && piece && catalog.armors.has(piece.armorId)
          ? [[type, piece]]
          : [];
      }),
    ),
    charmId:
      lockedRows.includes("charm") && catalog.charms.has(build.charmId ?? "")
        ? build.charmId
        : null,
    weapon:
      lockedRows.includes("weapon") && catalog.weapons.has(build.weapon?.weaponId ?? "")
        ? build.weapon
        : null,
  } satisfies Locked);
  const held = useMemo(() => JSON.parse(lockedKey) as Locked, [lockedKey]);
  const locks =
    Object.keys(held.pieces ?? {}).length + (held.charmId ? 1 : 0) + (held.weapon ? 1 : 0);
  // A locked piece is worn, so it stays in the pool whatever monster it is made of.
  const keep = useMemo(
    () => new Set(Object.values(held.pieces ?? {}).flatMap((piece) => piece?.armorId ?? [])),
    [held],
  );
  // The weapon in hand is the search's too: its slots are filled with the armor's. Only the
  // weapon, not the jewels on it, so choosing a set never sets off another search.
  const weaponId = build.weapon?.weaponId ?? null;
  // What the search is asked, one object so that it is asked again only when a part of it
  // changes. The worker leaves the unslain monsters' armor out of the pool, but for `keep`;
  // totals still read the whole catalog.
  const query = useMemo<Query>(
    () => ({ wanted, unslain, keep, weaponId, locked: held }),
    [wanted, unslain, keep, weaponId, held],
  );
  const answer = useSets(catalog, query);
  // Until the answer to this query lands, the sets on screen answer the one before. Never with
  // an empty list, which needs no search.
  const searching = answer?.query !== query;
  const leftOut = answer?.leftOut ?? 0;

  const sets = useMemo(
    () =>
      answer?.sets.map((set) => {
        const totals = computeTotals(set, catalog);
        const levels = new Map(totals.skills.map(({ skill, level }) => [skill.id, level]));
        return {
          set,
          key: keyOf(set),
          defense: totals.defense,
          short: answer.query.wanted.flatMap(({ skill, level: target }) => {
            const level = levels.get(skill) ?? 0;
            return level < target ? [{ skill, level, target }] : [];
          }),
          jewels: [...Object.values(set.pieces), set.weapon].flatMap(
            (piece) => piece?.decoIds.filter(Boolean) ?? [],
          ).length,
          names: [
            ...ARMOR_TYPES.map((type) => catalog.armors.get(set.pieces[type]?.armorId ?? "")?.name),
            catalog.charms.get(set.charmId ?? "")?.name,
          ].filter(Boolean),
        };
      }) ?? [],
    [answer, catalog],
  );
  const equipped = keyOf(build);
  // A set found a beat ago, for another weapon or other locks, keeps what is in hand now: its
  // armor still stands, but the old weapon is not to come back, nor is a row locked since.
  const pick = (set: Build): Build =>
    answer?.query.locked === held && (set.weapon?.weaponId ?? null) === weaponId
      ? set
      : {
          pieces: { ...set.pieces, ...held.pieces },
          charmId: held.charmId ?? set.charmId,
          weapon: build.weapon ?? null,
        };

  return (
    <>
      {/* It scrolls within itself, so ten sets never push the armor they fill out of reach:
          stacked above the armor it stops at three quarters of the screen, and beside it (xl)
          it sticks and fills the height. mt-4 and top-12 line its frame up with the Status
          panel's. The scrolling is the inner div's job: `frame` draws its brackets on this
          element, and they would scroll away with the content. */}
      <section
        aria-labelledby="search-title"
        className="frame @container relative mt-4 flex max-h-[75dvh] flex-col pb-2.5 xl:sticky xl:top-12 xl:max-h-[calc(100dvh-5rem)] xl:self-start"
      >
        <h2 id="search-title" className="pt-5 pb-4 text-center font-serif text-2xl text-aqua">
          Set Search
        </h2>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <h3 className={BAND}>Wanted Skills</h3>
          {wanted.length === 0 ? (
            <p className="px-4 pt-3 text-sm text-moss">
              Add the skills you want, most important first. Sets that reach them show up here.
            </p>
          ) : (
            <ol>
              {wanted.map((target, i) => {
                const skill = catalog.skills.get(target.skill);
                if (!skill) return null;
                const level = Math.min(target.level, skill.max_level);
                const effect = effectAt(skill, level);
                // The target's own line, under the description unless it only says the same
                // again (Coldproof). In the tooltip, not on the row: the row is sized to stay
                // one line.
                const hint =
                  effect && effect !== skill.description
                    ? `${skill.description}\nLevel ${level}: ${effect}`
                    : skill.description;
                return (
                  // One line down to a 22rem panel, which the column beside the armor clears. On a
                  // smaller phone the name takes the first line whole and the controls wrap under
                  // it: sharing one line there cut "Critical Eye" and "Critical Boost" to the
                  // same stub. The controls are as small as they are to make that one line fit.
                  <li
                    key={skill.id}
                    className="flex flex-wrap items-center justify-end gap-1 border-b border-dashed border-seam/60 pt-1.5 pr-2 pb-0.5 @[22rem]:pt-0.5"
                  >
                    <span aria-hidden className={GUTTER}>
                      {i + 1}
                    </span>
                    <span
                      title={hint}
                      className="min-w-0 flex-1 basis-[calc(100%-3.25rem)] truncate font-medium @[22rem]:basis-0"
                    >
                      {skill.name}
                    </span>
                    <select
                      aria-label={`${skill.name} target level`}
                      value={level}
                      onChange={(e) =>
                        setSaved(wanted.with(i, { ...target, level: Number(e.target.value) }))
                      }
                      className={`rounded-sm border border-seam bg-hide px-1 py-0.5 text-sm tabular-nums ${FOCUS}`}
                    >
                      {Array.from({ length: skill.max_level }, (_, n) => (
                        <option key={n}>{n + 1}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      aria-label={`Move ${skill.name} up`}
                      disabled={i === 0}
                      onClick={() => setSaved(wanted.with(i, wanted[i - 1]).with(i - 1, target))}
                      className={NUDGE}
                    >
                      <ChevronUp aria-hidden className="size-4" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Move ${skill.name} down`}
                      disabled={i === wanted.length - 1}
                      onClick={() => setSaved(wanted.with(i, wanted[i + 1]).with(i + 1, target))}
                      className={NUDGE}
                    >
                      <ChevronDown aria-hidden className="size-4" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Remove ${skill.name}`}
                      onClick={() => setSaved(wanted.toSpliced(i, 1))}
                      className={`${NUDGE} hover:text-ember`}
                    >
                      <X aria-hidden className="size-4" />
                    </button>
                  </li>
                );
              })}
            </ol>
          )}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2 pr-4 pl-12 text-sm">
            <button
              type="button"
              disabled={wanted.length >= MAX_WANTED}
              onClick={() => setAdding(true)}
              className={BUTTON}
            >
              Add skill
            </button>
            <button type="button" onClick={() => setMarking(true)} className={BUTTON}>
              Unslain monsters
              {unslain.size > 0 && <span className="tabular-nums"> ({unslain.size})</span>}
            </button>
            {wanted.length >= MAX_WANTED && (
              <span className="text-moss">{MAX_WANTED} is the most one search takes.</span>
            )}
          </div>

          {/* Both signs of a search wait 200ms before they show: most searches are done by
              then, and a sign that comes and goes in a frame is a flicker, not a message. */}
          {sets.length === 0 && searching && (
            <p
              role="status"
              className="animate-in px-4 pt-1 pb-3 text-sm text-moss delay-200 duration-200 fill-mode-backwards fade-in"
            >
              Searching for sets…
            </p>
          )}
          {sets.length > 0 && (
            <>
              <h3 id="sets-title" className={`${BAND} mt-2`}>
                Recommended Sets
              </h3>
              <p className="px-4 py-3 text-sm text-moss">
                {sets[0].short.length > 0 && "No set reaches every target. Closest first. "}
                {leftOut > 0 &&
                  `Not counting ${leftOut} ${leftOut === 1 ? "piece" : "pieces"} of monsters not yet slain. `}
                Choosing a set replaces the current one{locks > 0 && ", except what is locked"}.
              </p>
              {/* dimmed while they are the old answer; back at once when the new one lands */}
              <ol
                aria-labelledby="sets-title"
                aria-busy={searching}
                className={searching ? "opacity-60 transition-opacity delay-200 duration-200" : ""}
              >
                {sets.map(({ set, key, defense, short, jewels, names }, n) => (
                  <li key={n} className="flex border-t border-dashed border-seam/60 even:bg-plate/40">
                    <span aria-hidden className={`${GUTTER} pt-2.5`}>
                      {n + 1}
                    </span>
                    {/* the set the armor rows are showing wears the game's green selection band */}
                    <button
                      type="button"
                      onClick={() => onUse(pick(set))}
                      aria-current={key === equipped || undefined}
                      className="flex min-w-0 flex-1 flex-col gap-1 border-l-2 border-transparent py-2.5 pr-4 pl-2 text-left hover:bg-plate focus-visible:bg-plate focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-hunt aria-[current]:border-hunt aria-[current]:bg-linear-to-r aria-[current]:from-hunt/30 aria-[current]:to-transparent"
                    >
                      <span className="flex items-baseline justify-between gap-4">
                        {/* what it falls short on, in priority order. Two are named: a list asked
                            too much of misses most of its tail, the same in every set */}
                        <span className="flex flex-wrap gap-x-3 gap-y-0.5 font-medium">
                          {short.length === 0
                            ? "Every target met"
                            : short.slice(0, 2).map(({ skill, level, target }) => (
                                <span key={skill} className="text-ember">
                                  {catalog.skills.get(skill)?.name}{" "}
                                  <span className="tabular-nums">
                                    {level}/{target}
                                  </span>
                                </span>
                              ))}
                          {short.length > 2 && (
                            <span
                              title={short
                                .slice(2)
                                .map((s) => `${catalog.skills.get(s.skill)?.name} ${s.level}/${s.target}`)
                                .join(", ")}
                              className="text-ember"
                            >
                              +{short.length - 2} more
                            </span>
                          )}
                        </span>
                        <span className="shrink-0 text-sm text-moss tabular-nums">
                          Def {defense}
                        </span>
                      </span>
                      <span className="text-sm text-moss">
                        {names.join(" · ")}
                        {jewels > 0 && ` · ${jewels} ${jewels === 1 ? "jewel" : "jewels"}`}
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
            </>
          )}
        </div>
      </section>

      {adding && (
        <Picker
          title="Choose a skill"
          items={[...catalog.skills.values()].filter(
            (skill) => !wanted.some((target) => target.skill === skill.id),
          )}
          skills={catalog.skills}
          detail={(skill) => skill.description}
          meta={(skill) => `Max ${skill.max_level}`}
          onClose={() => setAdding(false)}
          onPick={(skill) => {
            // a new skill aims for its cap; lower it in the list
            if (skill) setSaved([...wanted, { skill: skill.id, level: skill.max_level }]);
            setAdding(false);
          }}
        />
      )}

      {marking && (
        <Picker
          title="Monsters not yet slain"
          note="Armor forged from a marked monster’s materials is left out of the recommended sets."
          items={monsters}
          skills={catalog.skills}
          chosen={unslain}
          search={MONSTER_SEARCH}
          detail={species}
          onClose={() => setMarking(false)}
          // It stays open: a hunter early in the game has many to mark. null is Clear. The
          // list is taken from the setter, not from this render, so two taps landing before a
          // repaint both count.
          onPick={(monster) =>
            setSavedUnslain((ids) => {
              if (!monster) return [];
              const rest = ids.filter((id) => id !== monster.id);
              return rest.length < ids.length ? rest : [...ids, monster.id];
            })
          }
        />
      )}
    </>
  );
}
