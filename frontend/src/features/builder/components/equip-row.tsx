import { useState, type ReactNode } from "react";

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
function Icon({ src, rarity }: { src?: string; rarity?: number | null }) {
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
    </span>
  );
}

// The diamond the game draws for a decoration slot, with the slot's level inside.
export function SlotGem({ level, filled = false }: { level: number; filled?: boolean }) {
  return (
    <span
      aria-hidden
      className={`grid size-4 shrink-0 rotate-45 place-items-center border ${
        filled ? "border-brass bg-brass text-hide" : "border-moss text-moss"
      }`}
    >
      <span className="-rotate-45 text-[0.625rem] leading-none font-semibold">{level}</span>
    </span>
  );
}

interface SlotButtonProps {
  level: number;
  decoration?: Decoration;
  skills: Map<string, Skill>;
  onClick: () => void;
}

export function SlotButton({ level, decoration, skills, onClick }: SlotButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={decoration && describeSkills(decoration.skills, skills)}
      aria-label={`Level ${level} slot: ${decoration?.name ?? "empty"}`}
      // its own dark fill: the border has to read against something, and the backdrop varies
      className={`flex items-center gap-2.5 rounded-sm border border-seam bg-hide py-1 pr-3 pl-2.5 text-sm hover:border-hunt ${FOCUS}`}
    >
      <SlotGem level={level} filled={!!decoration} />
      <span className={decoration ? "" : "text-moss"}>{decoration?.name ?? "Empty slot"}</span>
    </button>
  );
}

interface EquipRowProps {
  label: string;
  emptyText: string;
  item?: { name: string; rarity: number | null; skills: GrantedSkill[] };
  icon?: string;
  meta?: ReactNode;
  skills: Map<string, Skill>;
  onChoose: () => void;
  children?: ReactNode; // decoration slots
}

export function EquipRow({
  label,
  emptyText,
  item,
  icon,
  meta,
  skills,
  onChoose,
  children,
}: EquipRowProps) {
  return (
    <li className="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-x-4 gap-y-3 border-b border-dashed border-seam py-4 last:border-b-0">
      <span className="pt-3 text-sm text-moss">{label}</span>
      <button
        type="button"
        onClick={onChoose}
        aria-label={item ? `${label}: ${item.name}. Change` : emptyText}
        className={`group -m-1.5 flex items-center gap-3 rounded-sm p-1.5 text-left hover:bg-plate ${FOCUS}`}
      >
        <Icon key={icon} src={icon} rarity={item?.rarity} />
        {item ? (
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="flex items-baseline justify-between gap-4">
              <span className="truncate font-medium">{item.name}</span>
              {meta && <span className="shrink-0 text-sm text-moss tabular-nums">{meta}</span>}
            </span>
            <span className="text-sm text-moss">
              {describeSkills(item.skills, skills) || "No skills"}
            </span>
          </span>
        ) : (
          <span className="text-moss underline decoration-seam underline-offset-4">
            {emptyText}
          </span>
        )}
      </button>
      {children && <div className="col-start-2 flex flex-wrap gap-2">{children}</div>}
    </li>
  );
}
