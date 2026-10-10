import { useState, type ReactNode } from "react";

import { describeSkills } from "@/features/builder/totals";
import type { Decoration, GrantedSkill, Skill } from "@/features/builder/types";

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass";

// Icons are hotlinked from the wiki the dataset was scraped from; show an empty plate if one
// is missing or the host refuses it. Give it key={src} so a new icon gets a fresh try.
// The plate is light because the wiki's armor renders are near-black.
function Icon({ src }: { src?: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <span
      className={`grid size-11 shrink-0 place-items-center rounded-sm border border-seam ${
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
      className={`flex items-center gap-2.5 rounded-sm border border-seam py-1 pr-3 pl-2.5 text-sm hover:border-moss ${FOCUS}`}
    >
      <SlotGem level={level} filled={!!decoration} />
      <span className={decoration ? "" : "text-moss"}>{decoration?.name ?? "Empty slot"}</span>
    </button>
  );
}

interface EquipRowProps {
  label: string;
  emptyText: string;
  item?: { name: string; skills: GrantedSkill[] };
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
    <li className="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-x-4 gap-y-3 border-b border-seam py-4 last:border-b-0">
      <span className="pt-3 text-sm text-moss">{label}</span>
      <button
        type="button"
        onClick={onChoose}
        aria-label={item ? `${label}: ${item.name}. Change` : emptyText}
        className={`-m-1.5 flex items-center gap-3 rounded-sm p-1.5 text-left hover:bg-plate ${FOCUS}`}
      >
        <Icon key={icon} src={icon} />
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
