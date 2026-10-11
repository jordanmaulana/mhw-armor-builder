import { useState } from "react";
import { useAtom } from "jotai";
import { RESET } from "jotai/utils";

import { EquipRow, SlotButton, SlotGem } from "@/features/builder/components/equip-row";
import { Picker } from "@/features/builder/components/picker";
import { SetSearch } from "@/features/builder/components/set-search";
import { SoundToggle } from "@/features/builder/components/sound-toggle";
import { Summary } from "@/features/builder/components/summary";
import { useCatalog } from "@/features/builder/hooks";
import { buildAtom } from "@/features/builder/state";
import { computeTotals } from "@/features/builder/totals";
import { ARMOR_TYPES, type Armor, type ArmorType, type Piece } from "@/features/builder/types";

const LABELS: Record<ArmorType, string> = {
  head: "Head",
  chest: "Chest",
  arms: "Arms",
  waist: "Waist",
  legs: "Legs",
};

const slotTotal = (armor: Armor) => armor.slots.reduce((sum, level) => sum + level, 0);

// The catalog arrives name-ordered and sort is stable, so ties stay alphabetical.
const ARMOR_SORTS: Record<string, (a: Armor, b: Armor) => number> = {
  Defense: (a, b) => b.defense - a.defense,
  // most slots first, then the bigger ones: [3, 2] before [1, 1]
  Slots: (a, b) => b.slots.length - a.slots.length || slotTotal(b) - slotTotal(a),
};

type Picking =
  | { kind: "armor"; type: ArmorType }
  | { kind: "slot"; type: ArmorType; index: number }
  | { kind: "charm" };

export function BuilderPage() {
  const { data: catalog, isError } = useCatalog();
  const [build, setBuild] = useAtom(buildAtom);
  const [picking, setPicking] = useState<Picking | null>(null);
  // held here, not in Picker: the picker unmounts on close, and the choice should outlive it
  const [armorSort, setArmorSort] = useState("Defense");

  if (!catalog) {
    return (
      <main className="smithy grid min-h-screen place-items-center px-4 text-moss">
        <p role="status">
          {isError
            ? "Couldn't load the armor list. Check your connection, then reload the page."
            : "Loading the armor list…"}
        </p>
      </main>
    );
  }

  const close = () => setPicking(null);
  const setPiece = (type: ArmorType, piece: Piece | null) =>
    setBuild({ ...build, pieces: { ...build.pieces, [type]: piece } });

  function renderPicker() {
    if (!picking || !catalog) return null;

    if (picking.kind === "charm") {
      return (
        <Picker
          title="Choose a charm"
          items={[...catalog.charms.values()]}
          skills={catalog.skills}
          selectedId={build.charmId}
          onClose={close}
          onPick={(charm) => {
            setBuild({ ...build, charmId: charm?.id ?? null });
            close();
          }}
        />
      );
    }

    const { type } = picking;
    const piece = build.pieces[type];

    if (picking.kind === "armor") {
      const armors = [...catalog.armors.values()]
        .filter((armor) => armor.type === type)
        .sort(ARMOR_SORTS[armorSort]);
      return (
        <Picker
          title={`Choose ${type} armor`}
          items={armors}
          skills={catalog.skills}
          selectedId={piece?.armorId}
          sort={{ options: Object.keys(ARMOR_SORTS), value: armorSort, onChange: setArmorSort }}
          onClose={close}
          meta={(armor) => (
            <span className="flex items-baseline gap-0.5 tabular-nums">
              {armor.slots.map((level, i) => (
                <SlotGem key={i} level={level} />
              ))}
              <span className="w-14 text-right">Def {armor.defense}</span>
            </span>
          )}
          onPick={(armor) => {
            // a different piece has different slots, so its decorations can't carry over
            if (armor?.id !== piece?.armorId) {
              setPiece(type, armor && { armorId: armor.id, decoIds: armor.slots.map(() => null) });
            }
            close();
          }}
        />
      );
    }

    const level = (piece && catalog.armors.get(piece.armorId)?.slots[picking.index]) ?? 0;
    return (
      <Picker
        title={`Choose a decoration for the level ${level} slot`}
        items={[...catalog.decorations.values()].filter((decoration) => decoration.slot <= level)}
        skills={catalog.skills}
        selectedId={piece?.decoIds[picking.index]}
        onClose={close}
        meta={(decoration) => <SlotGem level={decoration.slot} />}
        onPick={(decoration) => {
          if (piece) {
            setPiece(type, {
              ...piece,
              decoIds: piece.decoIds.with(picking.index, decoration?.id ?? null),
            });
          }
          close();
        }}
      />
    );
  }

  const charm = build.charmId ? catalog.charms.get(build.charmId) : undefined;

  return (
    <main className="smithy min-h-screen text-bone">
      {/* pb-20: the footer has to clear the floating SoundToggle */}
      {/* wider at xl, where the set search takes a column of its own */}
      <div className="mx-auto max-w-6xl px-4 pt-8 pb-20 sm:px-6 lg:pt-12 xl:max-w-[90rem]">
        <header className="flex items-baseline justify-between gap-4 pb-4">
          {/* the game titles a screen with its path: "Smithy ▸ Change Equipment" */}
          <h1 className="font-serif text-2xl text-aqua text-shadow-glow sm:text-3xl">
            <span className="block text-lg text-aqua/80 sm:inline sm:text-3xl">
              Monster Hunter: World
            </span>
            <span aria-hidden className="mx-3 hidden text-xl text-aqua/80 sm:inline">
              ▸
            </span>
            Armor set builder
          </h1>
          <button
            type="button"
            onClick={() => setBuild(RESET)}
            className="shrink-0 text-sm text-moss underline-offset-4 hover:text-bone hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hunt"
          >
            Clear set
          </button>
        </header>

        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-14 xl:grid-cols-[24rem_minmax(0,1fr)_20rem] xl:gap-10">
          {/* one stacked column until xl, where its two children become grid columns of their own */}
          <div className="flex min-w-0 flex-col gap-6 xl:contents">
            <SetSearch catalog={catalog} build={build} onUse={setBuild} />
            <ul aria-label="Equipment">
              {ARMOR_TYPES.map((type) => {
                const piece = build.pieces[type];
                const armor = piece ? catalog.armors.get(piece.armorId) : undefined;
                return (
                  <EquipRow
                    key={type}
                    label={LABELS[type]}
                    emptyText={`Choose ${type} armor`}
                    item={armor}
                    icon={armor && (armor.icon_url_male || armor.icon_url_female)}
                    meta={armor && `Defense ${armor.defense}`}
                    skills={catalog.skills}
                    onChoose={() => setPicking({ kind: "armor", type })}
                  >
                    {armor?.slots.length
                      ? armor.slots.map((level, index) => (
                          <SlotButton
                            key={index}
                            level={level}
                            decoration={catalog.decorations.get(piece?.decoIds[index] ?? "")}
                            skills={catalog.skills}
                            onClick={() => setPicking({ kind: "slot", type, index })}
                          />
                        ))
                      : null}
                  </EquipRow>
                );
              })}
              <EquipRow
                label="Charm"
                emptyText="Choose a charm"
                item={charm}
                icon={charm?.icon_url}
                skills={catalog.skills}
                onChoose={() => setPicking({ kind: "charm" })}
              />
            </ul>
          </div>

          <div className="pt-4 lg:sticky lg:top-8 lg:self-start">
            <Summary totals={computeTotals(build, catalog)} />
          </div>
        </div>

        <footer className="pt-12 text-center text-xs text-moss">
          Fan-made tool. Not affiliated with or endorsed by Capcom.
        </footer>
      </div>

      <SoundToggle />
      {renderPicker()}
    </main>
  );
}
