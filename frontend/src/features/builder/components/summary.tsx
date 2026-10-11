import dragon from "@/assets/elements/dragon.png";
import fire from "@/assets/elements/fire.png";
import ice from "@/assets/elements/ice.png";
import thunder from "@/assets/elements/thunder.png";
import water from "@/assets/elements/water.png";
import { ELEMENTS, type Element, type Totals } from "@/features/builder/totals";

// the game's own element icons, so the row reads without its labels
const ELEMENT_STYLE: Record<Element, { label: string; icon: string }> = {
  fire: { label: "Fire", icon: fire },
  water: { label: "Water", icon: water },
  thunder: { label: "Thunder", icon: thunder },
  ice: { label: "Ice", icon: ice },
  dragon: { label: "Dragon", icon: dragon },
};

const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);

export function Summary({ totals }: { totals: Totals }) {
  return (
    <section aria-label="Set totals" className="flex flex-col gap-6">
      <div className="flex items-baseline justify-between border-b border-seam pb-3">
        <h2 className="text-sm text-moss">Defense</h2>
        <p className="text-3xl font-semibold tabular-nums">{totals.defense}</p>
      </div>

      <dl className="grid grid-cols-5 gap-2 text-center">
        {ELEMENTS.map((element) => {
          const { label, icon } = ELEMENT_STYLE[element];
          const value = totals.resistances[element];
          return (
            <div key={element} className="flex flex-col items-center gap-1">
              <dt className="flex flex-col items-center gap-1.5 text-xs text-moss">
                <img src={icon} alt="" className="size-6" />
                {label}
              </dt>
              <dd className={`font-medium tabular-nums ${value < 0 ? "text-ember" : ""}`}>
                {signed(value)}
              </dd>
            </div>
          );
        })}
      </dl>

      <div>
        <h2 className="border-b border-seam pb-2 text-sm text-moss">Skills</h2>
        {totals.skills.length === 0 ? (
          <p className="pt-3 text-sm text-moss">
            No skills yet. Choose armor, decorations or a charm to build some.
          </p>
        ) : (
          <ul>
            {totals.skills.map(({ skill, points, level }) => (
              <li
                key={skill.id}
                title={skill.description}
                className="flex flex-col gap-1.5 border-b border-seam/60 py-2.5 last:border-b-0"
              >
                <span className="flex items-baseline justify-between gap-3">
                  <span className="font-medium">{skill.name}</span>
                  <span className="shrink-0 text-sm text-moss tabular-nums">
                    {level}/{skill.max_level}
                  </span>
                </span>
                <span className="flex items-center gap-3">
                  <span aria-hidden className="flex gap-0.5">
                    {Array.from({ length: skill.max_level }, (_, i) => (
                      <span
                        key={i}
                        className={`h-3 w-2 ${i < level ? "bg-brass" : "border border-moss/50"}`}
                      />
                    ))}
                  </span>
                  {points > level && (
                    <span className="text-xs text-ember">{points - level} over the cap</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {totals.setBonuses.length > 0 && (
        <div>
          <h2 className="border-b border-seam pb-2 text-sm text-moss">Set bonuses</h2>
          <ul>
            {totals.setBonuses.map(({ bonus, pieces, tiers }) => (
              <li
                key={bonus.id}
                className="flex flex-col gap-1.5 border-b border-seam/60 py-2.5 last:border-b-0"
              >
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
                      className={`flex items-baseline justify-between gap-3 ${tier.active ? "" : "text-moss"}`}
                    >
                      <span className="flex items-center gap-2">
                        <span
                          aria-hidden
                          className={`size-2 shrink-0 ${tier.active ? "bg-brass" : "border border-moss/50"}`}
                        />
                        {tier.skill}
                      </span>
                      <span className="shrink-0 tabular-nums">
                        {tier.active ? "Active" : `at ${tier.pieces} pieces`}
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
