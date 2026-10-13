import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useAtom } from "jotai";

import { Picker } from "@/features/builder/components/picker";
import { isEmpty, keyOf, named, save } from "@/features/builder/saved";
import { savedSetsAtom } from "@/features/builder/state";
import { computeTotals } from "@/features/builder/totals";
import {
  ARMOR_TYPES,
  type Build,
  type Catalog,
  type SavedSet,
} from "@/features/builder/types";

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hunt";
const BUTTON = `rounded-sm border border-seam bg-hide px-3 py-1 hover:border-hunt disabled:opacity-40 disabled:hover:border-seam ${FOCUS}`;

const SET_SEARCH = {
  label: "Search by name or equipment",
  hint: "Try part of a set’s name, or of a piece in it.",
};

// a saved set as the picker lists it: its name is its id, since no two are alike
interface Row extends SavedSet {
  id: string;
  key: string; // keyOf its build, to know it when it is the one on screen
  wearing: string; // "Weapon · Head · … · Charm", what the catalog still has of it
  defense: number;
}
const wearing = (row: Row) => row.wearing;

interface SavedSetsProps {
  catalog: Catalog;
  build: Build; // what is equipped: what gets saved, and the saved set it may be
  onLoad: (build: Build) => void;
}

// Under the equipment: saving the set on screen under a name, and the sets saved so far. They
// are kept in this browser and nowhere else.
export function SavedSets({ catalog, build, onLoad }: SavedSetsProps) {
  const [sets, setSets] = useAtom(savedSetsAtom);
  // the name box's text while a name is being typed, null when the buttons are showing
  const [name, setName] = useState<string | null>(null);
  const [listing, setListing] = useState(false);
  const namesId = useId();
  const opener = useRef<HTMLButtonElement>(null);
  const returning = useRef(false);

  // The name box takes the focus with it when it goes: hand it back to the button it came
  // from, which is only there again once this render is on screen.
  useEffect(() => {
    if (name === null && returning.current) {
      returning.current = false;
      opener.current?.focus();
    }
  }, [name]);
  const stop = () => {
    returning.current = true;
    setName(null);
  };

  const rows = useMemo(
    () =>
      sets.map(
        (set): Row => ({
          ...set,
          id: set.name,
          key: keyOf(set.build),
          // ids the catalog no longer has are left out, as the totals leave them out
          wearing: [
            catalog.weapons.get(set.build.weapon?.weaponId ?? "")?.name,
            ...ARMOR_TYPES.map(
              (type) => catalog.armors.get(set.build.pieces[type]?.armorId ?? "")?.name,
            ),
            catalog.charms.get(set.build.charmId ?? "")?.name,
          ]
            .filter(Boolean)
            .join(" · "),
          defense: computeTotals(set.build, catalog).defense,
        }),
      ),
    [sets, catalog],
  );
  // the saved set the equipment is showing, if it is one: gone at the first change to it
  const equipped = keyOf(build);
  const current = rows.find((row) => row.key === equipped);

  const typed = name?.trim() ?? "";

  return (
    // pl-18 is the equipment rows' label column and its gap: SoundToggle floats over that
    // column, and what lies under it must not be something to tap
    <div className="border-t border-dashed border-seam pt-4 pl-18 text-sm">
      {name === null ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <button
            ref={opener}
            type="button"
            disabled={isEmpty(build)}
            onClick={() => setName(current?.name ?? "")}
            className={BUTTON}
          >
            Save set
          </button>
          {sets.length > 0 && (
            <button type="button" onClick={() => setListing(true)} className={BUTTON}>
              Saved sets<span className="tabular-nums"> ({sets.length})</span>
            </button>
          )}
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!typed) return;
            // from the setter's own list, as the unslain monsters are: another tab may have
            // saved one since this render
            setSets((list) => save(list, typed, build));
            stop();
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") stop();
          }}
          className="flex flex-wrap items-center gap-x-3 gap-y-2"
        >
          {/* basis-40: on a narrow phone the buttons drop under the box, which keeps its width.
              The names saved so far are offered, since saving under one is how a set is updated;
              a name already in the box is selected, so typing replaces it. */}
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onFocus={(e) => e.target.select()}
            maxLength={40}
            placeholder="Name this set"
            aria-label="Set name"
            list={namesId}
            autoComplete="off"
            className="min-w-0 flex-1 basis-40 rounded-sm border border-seam bg-hide px-3 py-1 placeholder:text-moss focus-visible:outline-2 focus-visible:outline-hunt"
          />
          <datalist id={namesId}>
            {sets.map((set) => (
              <option key={set.name} value={set.name} />
            ))}
          </datalist>
          {/* The two wrap as one, and Save is as wide as Replace: the row is laid out the same
              whichever the button says. Without that, typing a name already saved sent Cancel
              to a line of its own on a 390px phone. */}
          <span className="flex items-center gap-3">
            <button type="submit" disabled={!typed} className={`${BUTTON} min-w-22`}>
              {typed && named(sets, typed) ? "Replace" : "Save"}
            </button>
            <button
              type="button"
              onClick={stop}
              className={`text-moss underline-offset-4 hover:text-bone hover:underline ${FOCUS}`}
            >
              Cancel
            </button>
          </span>
        </form>
      )}
      {current && (
        <p role="status" className="pt-2 text-moss">
          Saved as “{current.name}”
        </p>
      )}

      {listing && (
        <Picker
          title="Saved sets"
          items={rows}
          skills={catalog.skills}
          selectedId={current?.id}
          search={SET_SEARCH}
          detail={wearing}
          meta={(row) => <span className="tabular-nums">Def {row.defense}</span>}
          onClose={() => setListing(false)}
          onPick={(row) => {
            if (row) onLoad(row.build);
            setListing(false);
          }}
          onDelete={(row) => {
            // with the last one gone there is no list to show
            if (sets.length === 1) setListing(false);
            setSets((list) => list.filter((set) => set.name !== row.name));
          }}
        />
      )}
    </div>
  );
}
