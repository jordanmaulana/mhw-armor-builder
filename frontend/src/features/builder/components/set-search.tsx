import { useDeferredValue, useMemo, useState } from "react";
import { useAtom } from "jotai";
import { ChevronDown, ChevronUp, X } from "lucide-react";

import { Picker } from "@/features/builder/components/picker";
import { narrow } from "@/features/builder/hunts";
import { MAX_WANTED, recommend } from "@/features/builder/recommend";
import { unslainAtom, wantedAtom } from "@/features/builder/state";
import { computeTotals } from "@/features/builder/totals";
import {
  ARMOR_TYPES,
  type Build,
  type Catalog,
  type GrantedSkill,
  type Monster,
} from "@/features/builder/types";

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hunt";
const BAND = "mx-4 bg-plate py-1 text-center font-serif text-lg text-aqua/70";
const BUTTON = `rounded-sm border border-seam bg-hide px-3 py-1 hover:border-hunt disabled:opacity-40 disabled:hover:border-seam ${FOCUS}`;
const NUDGE = `grid size-7 shrink-0 place-items-center rounded-sm text-moss hover:bg-plate hover:text-bone disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-moss ${FOCUS}`;
// Every row opens with this column: the priority in the wanted list, the rank in the sets. It
// is the armor rows' label column again, and for the same reason: SoundToggle floats over the
// page's bottom-left corner, and what lies under it must not be something to tap.
const GUTTER = "w-12 shrink-0 pl-4 text-sm text-moss tabular-nums";

const NONE: GrantedSkill[] = [];

// What makes two builds the same set. Spelt out, not the whole build as it was saved: one
// from before weapons has no weapon key, and would never equal a set that says `weapon: null`.
const keyOf = (build: Build) =>
  JSON.stringify([build.pieces, build.charmId, build.weapon ?? null]);

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
// among the armor that can be forged without the monsters marked as not yet slain.
export function SetSearch({ catalog, build, onUse }: SetSearchProps) {
  const [saved, setSaved] = useAtom(wantedAtom);
  const [savedUnslain, setSavedUnslain] = useAtom(unslainAtom);
  const [adding, setAdding] = useState(false);
  const [marking, setMarking] = useState(false);

  // A list saved before the dataset was reloaded can name skills that are gone. Memoized
  // because useDeferredValue goes by identity: a new array each render never settles.
  const wanted = useMemo(
    () => saved.filter((target) => catalog.skills.has(target.skill)),
    [saved, catalog],
  );
  // The list repaints at once and the search follows it, so a control never waits on the
  // search. NONE is what the first render searches for: the page paints before any of it runs.
  const searched = useDeferredValue(wanted, NONE);

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
  // What the search may pick from. Deferred like the list, so a tap in the monster picker
  // repaints before the search it sets off. Totals still read the whole catalog.
  const narrowed = useMemo(() => narrow(catalog, unslain), [catalog, unslain]);
  const pool = useDeferredValue(narrowed);
  const leftOut = catalog.armors.size - pool.armors.size;
  // The weapon in hand is the search's too: its slots are filled with the armor's. Only the
  // weapon, not the jewels on it, so choosing a set never sets off another search. Deferred
  // for the reason the pool is: the weapon picker should close before the search starts.
  const weaponId = build.weapon?.weaponId ?? null;
  const searchedWeapon = useDeferredValue(weaponId);
  // The search runs a beat behind what was asked, by the three deferrals above, and until it
  // lands the sets on screen answer the old question. Never with an empty list: the first
  // render always starts from NONE, and nothing is on its way.
  const searching =
    wanted.length > 0 &&
    (searched !== wanted || pool !== narrowed || searchedWeapon !== weaponId);

  const sets = useMemo(
    () =>
      recommend(searched, pool, 10, searchedWeapon).map((set) => {
        const totals = computeTotals(set, catalog);
        const levels = new Map(totals.skills.map(({ skill, level }) => [skill.id, level]));
        return {
          set,
          key: keyOf(set),
          defense: totals.defense,
          short: searched.flatMap(({ skill, level: target }) => {
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
      }),
    [searched, pool, searchedWeapon, catalog],
  );
  const equipped = keyOf(build);

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
                      title={skill.description}
                      className="min-w-0 flex-1 basis-[calc(100%-3.25rem)] truncate font-medium @[22rem]:basis-0"
                    >
                      {skill.name}
                    </span>
                    <select
                      aria-label={`${skill.name} target level`}
                      value={Math.min(target.level, skill.max_level)}
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
                Choosing a set replaces the current one.
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
                      // A set found for the weapon held a beat ago keeps the one in hand now:
                      // its armor still stands, and the old weapon is not to come back.
                      onClick={() =>
                        onUse(
                          (set.weapon?.weaponId ?? null) === weaponId
                            ? set
                            : { ...set, weapon: build.weapon ?? null },
                        )
                      }
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
