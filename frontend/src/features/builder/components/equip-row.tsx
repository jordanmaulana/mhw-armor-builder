import { useState, type ReactNode } from "react";
import { Lock, LockOpen } from "lucide-react";

import { describeSkills } from "@/features/builder/totals";
import type { Decoration, GrantedSkill, Skill } from "@/features/builder/types";

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hunt";

// The game tints an icon by its rarity; here the tile's border carries it. 1-8 are the hues the
// wiki names, 9-12 are read off Iceborne's forge list. The hexes are matched by eye.
const RARITY_COLOR: Record<number, string> = {
  1: "#b9bcb8",
  2: "#e6e8e4",
  3: "#d9d15a",
  4: "#6cc24a",
  5: "#7fd0ea",
  6: "#5b83e8",
  7: "#a57be6",
  8: "#e8923a",
  9: "#e2574c",
  10: "#4f95f0",
  11: "#e3c558",
  12: "#a9dcf2",
};

// Icons are hotlinked from the wiki the dataset was scraped from; show an empty plate if one
// is missing or the host refuses it. Give it key={src} so a new icon gets a fresh try.
// The plate is light because the wiki's armor renders are near-black.
// Inside a `group` it lights up with the game's green cursor.
// `glyph` stands on the plate of an item the dataset has no icon for at all.
function Icon({
  src,
  rarity,
  glyph,
}: {
  src?: string;
  rarity?: number | null;
  glyph?: ReactNode;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <span
      style={{ borderColor: RARITY_COLOR[rarity ?? 0] }} // no rarity: the seam border stays
      className={`grid size-11 shrink-0 place-items-center rounded-sm border border-seam group-hover:shadow-cursor group-focus-visible:shadow-cursor ${
        src && !failed ? "bg-moss/60" : "bg-hide"
      }`}
    >
      {src && !failed && (
        <img
          src={src}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="size-9 object-contain"
        />
      )}
      {!src && glyph}
    </span>
  );
}

// The game's socket icons, as the wiki's armor tables show them, one file for every slot level
// holding every jewel level it can: `4-2.svg` is a level 4 slot with a level 2 jewel in it,
// `4-0.svg` an empty one. The jewel lights as much of the icon as it uses of the slot, so the
// drawing is in the files and none of it is done here.
const SLOT_ICONS = import.meta.glob<string>("@/assets/slots/*.svg", {
  eager: true,
  import: "default",
});

// `filled` is the level of the jewel in the slot, 0 for none.
export function SlotGem({ level, filled = 0 }: { level: number; filled?: number }) {
  return (
    <img
      src={SLOT_ICONS[`/src/assets/slots/${level}-${Math.min(filled, level)}.svg`]}
      alt=""
      // An image stands on the text baseline, and at 24px it is taller than the line beside it.
      // The margin takes it back to the 16px a line has room for, the nudge re-centers it: a
      // picker row stays as tall with slots as without, and its numbers stay on the baseline.
      className="-mt-2 size-6 shrink-0 translate-y-1"
    />
  );
}

interface SlotButtonProps {
  level: number;
  decoration?: Decoration;
  skills: Map<string, Skill>;
  onClick: () => void;
}

export function SlotButton({ level, decoration, skills, onClick }: SlotButtonProps) {
  // a jewel smaller than its slot leaves the difference unused
  const wasted = decoration ? level - decoration.slot : 0;
  const wastedText = `${wasted} ${wasted === 1 ? "level" : "levels"} wasted`;
  return (
    <button
      type="button"
      onClick={onClick}
      title={decoration && describeSkills(decoration.skills, skills)}
      aria-label={`Level ${level} slot: ${decoration?.name ?? "empty"}${wasted > 0 ? `, ${wastedText}` : ""}`}
      // its own dark fill: the border has to read against something, and the backdrop varies
      className={`flex items-center gap-2.5 rounded-sm border border-seam bg-hide py-1 pr-3 pl-2.5 text-sm hover:border-hunt ${FOCUS}`}
    >
      <SlotGem level={level} filled={decoration?.slot} />
      {/* on a narrow screen the warning drops under the name, rather than both breaking mid-phrase */}
      <span className="flex min-w-0 flex-wrap items-baseline gap-x-2.5 text-left">
        <span className={decoration ? "" : "text-moss"}>{decoration?.name ?? "Empty slot"}</span>
        {wasted > 0 && <span className="text-xs whitespace-nowrap text-ember">{wastedText}</span>}
      </span>
    </button>
  );
}

interface EquipRowProps {
  label: string;
  emptyText: string;
  item?: { name: string; rarity: number | null; skills?: GrantedSkill[] };
  icon?: string;
  glyph?: ReactNode; // on the icon plate, for an item with no icon
  meta?: ReactNode;
  detail?: string; // the line under the name, for an item that grants no skills
  skills: Map<string, Skill>;
  onChoose: () => void;
  locked?: boolean; // the set search keeps the row as it is, jewels and all
  onLock?: () => void;
  children?: ReactNode; // decoration slots
}

export function EquipRow({
  label,
  emptyText,
  item,
  icon,
  glyph,
  meta,
  detail,
  skills,
  onChoose,
  locked = false,
  onLock,
  children,
}: EquipRowProps) {
  const lockable = item && onLock;
  return (
    <li className="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-x-4 gap-y-3 border-b border-dashed border-seam py-4 last:border-b-0">
      <span className="pt-3 text-sm text-moss">{label}</span>
      <button
        type="button"
        onClick={onChoose}
        aria-label={item ? `${label}: ${item.name}. Change` : emptyText}
        className={`group col-start-2 row-start-1 -m-1.5 flex items-center gap-3 rounded-sm p-1.5 text-left hover:bg-plate ${FOCUS}`}
      >
        <Icon key={icon} src={icon} rarity={item?.rarity} glyph={item && glyph} />
        {item ? (
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="flex items-baseline justify-between gap-4">
              <span className="truncate font-medium">{item.name}</span>
              {meta && <span className="shrink-0 text-sm text-moss tabular-nums">{meta}</span>}
            </span>
            {/* pr-6: the lock stands on this line's last 1.5rem */}
            <span className={`text-sm text-moss ${lockable ? "pr-6" : ""}`}>
              {detail ?? (describeSkills(item.skills ?? [], skills) || "No skills")}
            </span>
          </span>
        ) : (
          <span className="text-moss underline decoration-seam underline-offset-4">
            {emptyText}
          </span>
        )}
      </button>
      {/* In the choose button's own cell, over the corner of its last line. Not beside the
          name: on a phone that is the room the name ends in, and a piece's name ends in what
          tells it from its twin ("Alpha +", "Beta +"). Not in the label column: SoundToggle
          floats over that. The nudges put it flush in the corner of the hover plate, its icon
          under the right edge of the number above. */}
      {lockable && (
        <button
          type="button"
          onClick={onLock}
          aria-pressed={locked}
          aria-label={`Lock ${label.toLowerCase()}`}
          title={
            locked
              ? "Locked: recommended sets keep this, with the jewels on it"
              : "Lock, so recommended sets keep this, with the jewels on it"
          }
          // brass, not the green of a row switched on: a green edge here reads as the focus ring
          className={`col-start-2 row-start-1 grid size-7 translate-x-1.5 translate-y-1.5 place-items-center self-end justify-self-end rounded-sm text-moss hover:bg-seam/40 hover:text-bone aria-pressed:text-brass ${FOCUS}`}
        >
          {locked ? (
            <Lock aria-hidden className="size-4" />
          ) : (
            <LockOpen aria-hidden className="size-4" />
          )}
        </button>
      )}
      {children && <div className="col-start-2 row-start-2 flex flex-wrap gap-2">{children}</div>}
    </li>
  );
}
