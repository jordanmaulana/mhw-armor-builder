import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { describeSkills } from "@/features/builder/totals";
import type { GrantedSkill, Skill } from "@/features/builder/types";

interface Pickable {
  id: string;
  name: string;
  skills: GrantedSkill[];
}

interface PickerProps<T extends Pickable> {
  title: string;
  items: T[];
  skills: Map<string, Skill>;
  selectedId?: string | null;
  meta?: (item: T) => ReactNode;
  onPick: (item: T | null) => void; // null = remove what's equipped
  onClose: () => void;
}

// Mount it to open it. Native <dialog> gives the focus trap, Esc and backdrop for free.
export function Picker<T extends Pickable>({
  title,
  items,
  skills,
  selectedId,
  meta,
  onPick,
  onClose,
}: PickerProps<T>) {
  const ref = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    // StrictMode runs this twice; showModal() on an open dialog throws in older browsers
    if (!ref.current?.open) ref.current?.showModal();
  }, []);

  const rows = useMemo(
    () =>
      items.map((item) => {
        const granted = describeSkills(item.skills, skills);
        return { item, granted, haystack: `${item.name} ${granted}`.toLowerCase() };
      }),
    [items, skills],
  );
  const needle = query.trim().toLowerCase();
  // ponytail: plain substring scan and no list virtualization; fine for the ~400 rows a picker
  // holds at most, revisit both if a list reaches the thousands
  const shown = needle ? rows.filter((row) => row.haystack.includes(needle)) : rows;

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose(); // the backdrop is the dialog itself
      }}
      className="m-auto h-[min(40rem,85vh)] w-[min(36rem,calc(100vw-2rem))] rounded-md border border-seam bg-plate p-0 text-bone backdrop:bg-black/60"
    >
      <div className="flex h-full flex-col">
        <div className="flex flex-col gap-3 border-b border-seam p-4">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-lg font-semibold">{title}</h2>
            <div className="flex gap-4 text-sm">
              {selectedId && (
                <button
                  type="button"
                  onClick={() => onPick(null)}
                  className="text-ember underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
                >
                  Remove
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="text-moss underline-offset-4 hover:text-bone hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
              >
                Close
              </button>
            </div>
          </div>
          <input
            type="search"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or skill"
            aria-label="Search by name or skill"
            className="w-full rounded-sm border border-seam bg-hide px-3 py-2 text-sm placeholder:text-moss focus-visible:outline-2 focus-visible:outline-brass"
          />
        </div>

        {shown.length === 0 ? (
          <p className="p-4 text-sm text-moss">
            Nothing matches “{query.trim()}”. Try part of a name or a skill, like “attack”.
          </p>
        ) : (
          <ul className="flex-1 overflow-y-auto overscroll-contain">
            {shown.map(({ item, granted }) => (
              <li key={item.id} className="border-b border-seam/60 last:border-b-0">
                <button
                  type="button"
                  onClick={() => onPick(item)}
                  aria-current={item.id === selectedId || undefined}
                  className="flex w-full flex-col gap-0.5 border-l-2 border-transparent px-4 py-2.5 text-left hover:bg-hide focus-visible:bg-hide focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brass aria-[current]:border-brass"
                >
                  <span className="flex items-baseline justify-between gap-4">
                    <span className="font-medium">{item.name}</span>
                    {meta && <span className="shrink-0 text-sm text-moss">{meta(item)}</span>}
                  </span>
                  <span className="text-sm text-moss">{granted || "No skills"}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </dialog>
  );
}
