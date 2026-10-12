import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";

import { describeSkills } from "@/features/builder/totals";
import type { GrantedSkill, Skill } from "@/features/builder/types";

interface Pickable {
  id: string;
  name: string;
  skills?: GrantedSkill[];
}

// what the search box says it looks through, and what to try when it finds nothing
const SEARCH = {
  label: "Search by name or skill",
  hint: "Try part of a name or a skill, like “attack”.",
};

interface PickerProps<T extends Pickable> {
  title: string;
  // a line under the title, for a list whose choice does something the title doesn't say
  note?: string;
  items: T[];
  skills: Map<string, Skill>;
  selectedId?: string | null;
  // for picking several: each row is a switch, and the header's button clears them all. The
  // picker stays open only because the caller doesn't close it: closing was always its job
  chosen?: ReadonlySet<string>;
  search?: typeof SEARCH;
  // the caller orders `items`; this only draws the choice
  sort?: { options: string[]; value: string; onChange: (value: string) => void };
  meta?: (item: T) => ReactNode;
  // the line under the name, for items that don't grant skills; it is searched too
  detail?: (item: T) => string;
  onPick: (item: T | null) => void; // null = remove what's equipped, or clear what's chosen
  onClose: () => void;
}

// Mount it to open it. Native <dialog> gives the focus trap, Esc and backdrop for free.
export function Picker<T extends Pickable>({
  title,
  note,
  items,
  skills,
  selectedId,
  chosen,
  search = SEARCH,
  sort,
  meta,
  detail,
  onPick,
  onClose,
}: PickerProps<T>) {
  const ref = useRef<HTMLDialogElement>(null);
  const noteId = useId();
  const [query, setQuery] = useState("");

  useEffect(() => {
    // StrictMode runs this twice; showModal() on an open dialog throws in older browsers
    if (!ref.current?.open) ref.current?.showModal();
  }, []);

  const rows = useMemo(
    () =>
      items.map((item) => {
        const granted = detail ? detail(item) : describeSkills(item.skills ?? [], skills);
        return { item, granted, haystack: `${item.name} ${granted}`.toLowerCase() };
      }),
    [items, skills, detail],
  );
  const needle = query.trim().toLowerCase();
  // ponytail: plain substring scan and no list virtualization; fine for the ~400 rows a picker
  // holds at most, revisit both if a list reaches the thousands
  const shown = needle ? rows.filter((row) => row.haystack.includes(needle)) : rows;

  return (
    <dialog
      ref={ref}
      aria-label={title}
      aria-describedby={note && noteId}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose(); // the backdrop is the dialog itself
      }}
      className="m-auto h-[min(40rem,85vh)] w-[min(36rem,calc(100vw-2rem))] bg-transparent p-0 text-bone backdrop:bg-black/70"
    >
      {/* the frame goes on this child: on the dialog its `relative` would unseat the modal */}
      <div className="frame relative flex h-full flex-col pb-2.5">
        <div className="flex flex-col gap-3 border-b border-dashed border-seam px-4 pt-5 pb-4">
          <h2 className="text-center font-serif text-2xl text-balance text-aqua">{title}</h2>
          {/* -mt-2: it belongs to the title, not to the search box under it */}
          {note && (
            <p id={noteId} className="-mt-2 text-center text-sm text-balance text-moss">
              {note}
            </p>
          )}
          <div className="flex items-center gap-4 text-sm">
            <input
              type="search"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={search.label}
              aria-label={search.label}
              className="min-w-0 flex-1 rounded-sm border border-seam bg-hide px-3 py-2 placeholder:text-moss focus-visible:outline-2 focus-visible:outline-hunt"
            />
            {(chosen ? chosen.size > 0 : selectedId) && (
              <button
                type="button"
                onClick={() => onPick(null)}
                className="text-ember underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hunt"
              >
                {chosen ? "Clear" : "Remove"}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="text-moss underline-offset-4 hover:text-bone hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hunt"
            >
              Close
            </button>
          </div>
          {/* right-aligned: it sits over the columns it sorts */}
          {sort && (
            <div role="group" aria-label="Sort by" className="flex justify-end gap-4 text-sm">
              <span aria-hidden className="text-moss">
                Sort by
              </span>
              {/* underline means "active" here, so unlike Close these don't underline on hover */}
              {sort.options.map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={option === sort.value}
                  onClick={() => sort.onChange(option)}
                  className="text-moss decoration-hunt underline-offset-4 hover:text-bone focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hunt aria-pressed:text-bone aria-pressed:underline"
                >
                  {option}
                </button>
              ))}
            </div>
          )}
        </div>

        {shown.length === 0 ? (
          <p className="p-4 text-sm text-moss">
            Nothing matches “{query.trim()}”. {search.hint}
          </p>
        ) : (
          // keyed on the sort so a new order remounts the list and starts from the top
          <ul key={sort?.value} className="flex-1 overflow-y-auto overscroll-contain">
            {shown.map(({ item, granted }) => (
              <li
                key={item.id}
                className="border-b border-dashed border-seam/60 last:border-b-0 even:bg-plate/40"
              >
                {/* what's equipped, or switched on, wears the game's green selection band */}
                <button
                  type="button"
                  onClick={() => onPick(item)}
                  aria-current={item.id === selectedId || undefined}
                  aria-pressed={chosen?.has(item.id)}
                  className="flex w-full flex-col gap-0.5 border-l-2 border-transparent px-4 py-2.5 text-left hover:bg-plate focus-visible:bg-plate focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-hunt aria-pressed:border-hunt aria-pressed:bg-linear-to-r aria-pressed:from-hunt/30 aria-pressed:to-transparent aria-[current]:border-hunt aria-[current]:bg-linear-to-r aria-[current]:from-hunt/30 aria-[current]:to-transparent"
                >
                  <span className="flex items-baseline justify-between gap-4">
                    <span className="font-medium">{item.name}</span>
                    {meta && <span className="shrink-0 text-sm text-moss">{meta(item)}</span>}
                  </span>
                  <span className="text-sm text-moss">
                    {granted || (detail ? "" : "No skills")}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </dialog>
  );
}
