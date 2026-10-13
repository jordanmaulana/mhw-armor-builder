import type { ReactNode } from "react";
import { Shield } from "lucide-react";

import dragon from "@/assets/elements/dragon.png";
import fire from "@/assets/elements/fire.png";
import ice from "@/assets/elements/ice.png";
import thunder from "@/assets/elements/thunder.png";
import water from "@/assets/elements/water.png";
import { SkillInfo } from "@/features/builder/components/skill-info";
import { ELEMENTS, type Element, type Totals } from "@/features/builder/totals";

// the game's own element icons, so the row reads without its labels
const ELEMENT_STYLE: Record<Element, { label: string; icon: string }> = {
  fire: { label: "Fire", icon: fire },
  water: { label: "Water", icon: water },
  thunder: { label: "Thunder", icon: thunder },
  ice: { label: "Ice", icon: ice },
  dragon: { label: "Dragon", icon: dragon },
};

// a section header the way the game draws one: serif, centred, on a grey band
const BAND = "bg-plate py-1 text-center font-serif text-lg text-aqua/70";
const RULE = "border-b border-dashed border-seam";

function StatRow({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <div className={`flex items-center justify-between gap-3 py-1.5 ${RULE}`}>
      <dt className="flex items-center gap-2 text-moss">
        {icon}
        {label}
      </dt>
      <dd className={`font-medium tabular-nums ${value < 0 ? "text-ember" : ""}`}>{value}</dd>
    </div>
  );
}

export function Summary({ totals }: { totals: Totals }) {
  return (
    <section
      aria-labelledby="status-title"
      className="frame relative flex flex-col gap-5 px-4 pt-5 pb-6"
    >
      <h2 id="status-title" className="text-center font-serif text-2xl text-aqua">
        Status
      </h2>

      <div>
        <h3 className={BAND}>Defense Status</h3>
        <dl>
          <StatRow
            icon={<Shield aria-hidden className="size-5 text-brass" />}
            label="Defense"
            value={totals.defense}
          />
          {ELEMENTS.map((element) => {
            const { label, icon } = ELEMENT_STYLE[element];
            return (
              <StatRow
                key={element}
                icon={<img src={icon} alt="" className="size-5" />}
                label={`Vs. ${label}`}
                value={totals.resistances[element]}
              />
            );
          })}
        </dl>
      </div>

      <div>
        <h3 className={BAND}>Skills</h3>
        {totals.skills.length === 0 ? (
          <p className="pt-3 text-sm text-moss">
            No skills yet. Choose armor, decorations or a charm to build some.
          </p>
        ) : (
          <ul>
            {totals.skills.map(({ skill, points, level }) => (
              <li key={skill.id} className={`flex items-center gap-3 py-2 ${RULE}`}>
                <img
                  src={skill.icon_url}
                  alt=""
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  // hotlinked from the wiki: if it fails, keep its box so the names stay aligned
                  onError={(e) => {
                    e.currentTarget.style.visibility = "hidden";
                  }}
                  className="size-8 shrink-0"
                />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  {/* what each level does is behind the icon, not on the row: one line a skill
                      made the list three times as long */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="min-w-0 font-medium">{skill.name}</span>
                    <SkillInfo skill={skill} level={level} />
                  </div>
                  <span className="flex items-center gap-3">
                    {/* the pips sit on a hairline that runs out to the level */}
                    <span
                      aria-hidden
                      className="flex flex-1 items-center gap-[3px] after:h-px after:flex-1 after:bg-seam"
                    >
                      {Array.from({ length: skill.max_level }, (_, i) => (
                        <span
                          key={i}
                          className={`size-2.5 ${i < level ? "bg-brass" : "border border-seam bg-plate"}`}
                        />
                      ))}
                    </span>
                    {points > level && (
                      <span className="text-xs text-ember">{points - level} over the cap</span>
                    )}
                    <span className="shrink-0 text-sm tabular-nums">
                      Level {level}
                      <span className="sr-only"> of {skill.max_level}</span>
                    </span>
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {totals.setBonuses.length > 0 && (
        <div>
          <h3 className={BAND}>Set Bonus Skills</h3>
          <ul>
            {totals.setBonuses.map(({ bonus, pieces, tiers }) => (
              <li key={bonus.id} className={`flex flex-col gap-1.5 py-2 ${RULE}`}>
                <span className="flex items-baseline justify-between gap-3">
                  <span className="font-medium">{bonus.name}</span>
                  <span className="shrink-0 text-sm text-moss tabular-nums">
                    {pieces} {pieces === 1 ? "piece" : "pieces"}
                  </span>
                </span>
                <ul className="flex flex-col gap-1 text-sm">
                  {tiers.map((tier) => (
                    <li
                      key={tier.pieces}
                      title={tier.effect}
                      className={`flex items-center gap-1.5 ${tier.active ? "" : "text-moss/70"}`}
                    >
                      {/* the piece count that unlocks the tier, boxed as in the game */}
                      <span
                        aria-hidden
                        className={`grid size-5 shrink-0 place-items-center border text-xs font-semibold tabular-nums ${
                          tier.active ? "border-brass text-brass" : "border-seam"
                        }`}
                      >
                        {tier.pieces}
                      </span>
                      <span aria-hidden>▸</span>
                      {tier.skill}
                      <span className="sr-only">
                        , {tier.active ? "active" : "not active"}, needs {tier.pieces} pieces
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
