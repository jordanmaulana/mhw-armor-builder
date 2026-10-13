import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { Info } from "lucide-react";

import { levelLines } from "@/features/builder/totals";
import type { Skill } from "@/features/builder/types";

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hunt";

// What a skill does at every level, the reached one lit, behind an icon at the end of its name.
// A mouse opens it by hovering. A phone has no hover, so the icon is a button all the same: a
// tap or Enter toggles it, and a tap elsewhere, Escape or tabbing away closes it.
export function SkillInfo({ skill, level }: { skill: Skill; level: number }) {
  const [open, setOpen] = useState(false);
  const [above, setAbove] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const tip = useRef<HTMLDivElement>(null);
  const hovered = useRef(false);
  const id = useId();

  const lines = levelLines(skill);
  // the description leads, unless a level's line only says the same again (Coldproof)
  const lead = lines.some((row) => row.effect === skill.description) ? "" : skill.description;

  // On the document, not the button's blur: Safari does not focus a tapped button, so there
  // would be no blur to hear.
  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  // Below the icon, unless it would run off the screen and there is more room above: the Status
  // column can be taller than the screen, and its last rows then sit on the bottom edge.
  useLayoutEffect(() => {
    if (!open || !wrap.current || !tip.current) return;
    const { top, bottom } = wrap.current.getBoundingClientRect();
    const room = window.innerHeight - bottom;
    setAbove(tip.current.offsetHeight > room && top > room);
  }, [open]);

  // a skill a loader stubbed has neither a description nor lines
  if (!lead && lines.length === 0) return null;

  return (
    // -my-0.5: the 28px button in a 24px line, so the row is no taller for it. -mr-1.5 puts the
    // icon's edge, not the button's, under the edge of "Level N".
    <div
      ref={wrap}
      className="relative -my-0.5 -mr-1.5 shrink-0"
      onPointerEnter={(e) => {
        if (e.pointerType !== "mouse") return;
        hovered.current = true;
        setOpen(true);
      }}
      onPointerLeave={(e) => {
        if (e.pointerType !== "mouse") return;
        hovered.current = false;
        setOpen(false);
      }}
      // Only when the focus goes to something else (Tab). A press on the lines themselves takes
      // it from the button to nothing, and must not close them under the mouse.
      onBlur={(e) => {
        if (e.relatedTarget && !e.currentTarget.contains(e.relatedTarget)) setOpen(false);
      }}
    >
      <button
        type="button"
        aria-label={`What ${skill.name} does at each level`}
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        // under the mouse it is open already, and a click must not hide what the hover showed
        onClick={() => setOpen((was) => hovered.current || !was)}
        className={`grid size-7 place-items-center rounded-sm text-moss hover:text-bone aria-expanded:text-bone ${FOCUS}`}
      >
        <Info aria-hidden className="size-4" />
      </button>
      {open && (
        // The gap to the icon is padding, not margin, so the mouse can cross it onto the lines
        // without leaving. As wide as the Status column, or as the row on a 320px phone, where
        // the page and the panel take 4rem between them.
        <div
          ref={tip}
          id={id}
          // a tap on the lines puts them away: on a phone they lie over the icons of the rows
          // below, and the nearest thing to tap is the lines themselves
          onClick={() => {
            if (!hovered.current) setOpen(false);
          }}
          className={`absolute right-1.5 z-20 w-[min(18rem,calc(100vw-4rem))] ${
            above ? "bottom-full pb-1" : "top-full pt-1"
          }`}
        >
          <div className="border border-seam bg-hide p-3 text-sm shadow-[0_8px_24px_rgb(0_0_0/0.8)]">
            {lead && <p className="text-moss">{lead}</p>}
            {lines.length > 0 && (
              <ol className={lead ? "mt-2 border-t border-dashed border-seam pt-2" : ""}>
                {lines.map((row) => {
                  const reached = row.level === level;
                  return (
                    <li
                      key={row.level}
                      aria-current={reached ? "true" : undefined}
                      className={`flex items-start gap-2 px-1 py-1 ${
                        reached ? "bg-plate text-bone" : "text-moss"
                      }`}
                    >
                      {/* the level, boxed as a set bonus's piece count is */}
                      <span
                        aria-hidden
                        className={`grid size-5 shrink-0 place-items-center border text-xs font-semibold tabular-nums ${
                          reached ? "border-brass text-brass" : "border-seam"
                        }`}
                      >
                        {row.level}
                      </span>
                      <span>
                        <span className="sr-only">Level {row.level}: </span>
                        {row.effect}
                        {reached && <span className="sr-only">, current level</span>}
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
