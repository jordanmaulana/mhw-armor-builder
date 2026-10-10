import { useState } from "react";
import { useAtom } from "jotai";
import { RESET } from "jotai/utils";

import { EquipRow, SlotButton, SlotGem } from "@/features/builder/components/equip-row";
import { Picker } from "@/features/builder/components/picker";
import { Summary } from "@/features/builder/components/summary";
import { useCatalog } from "@/features/builder/hooks";
import { buildAtom } from "@/features/builder/state";
import { computeTotals } from "@/features/builder/totals";
import { ARMOR_TYPES, type ArmorType, type Piece } from "@/features/builder/types";

const LABELS: Record<ArmorType, string> = {
  head: "Head",
  chest: "Chest",
  arms: "Arms",
  waist: "Waist",
  legs: "Legs",
};

type Picking =
  | { kind: "armor"; type: ArmorType }
  | { kind: "slot"; type: ArmorType; index: number }
  | { kind: "charm" };

export function BuilderPage() {
  const { data: catalog, isError } = useCatalog();
  const [build, setBuild] = useAtom(buildAtom);
  const [picking, setPicking] = useState<Picking | null>(null);

  if (!catalog) {
    return (
      <main className="grid min-h-screen place-items-center bg-hide px-4 text-moss">
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
      return (
        <Picker
          title={`Choose ${type} armor`}
          items={[...catalog.armors.values()].filter((armor) => armor.type === type)}
          skills={catalog.skills}
          selectedId={piece?.armorId}
          onClose={close}
          meta={(armor) => (
            <span className="flex items-center gap-2.5 tabular-nums">
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
    <main className="min-h-screen bg-hide text-bone">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
        <header className="flex items-baseline justify-between gap-4 border-b border-seam pb-5">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Armor set builder</h1>
            <p className="mt-1 text-sm text-moss">Monster Hunter: World</p>
          </div>
          <button
            type="button"
            onClick={() => setBuild(RESET)}
            className="text-sm text-moss underline-offset-4 hover:text-bone hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
          >
            Clear set
          </button>
        </header>

        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-14">
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

          <div className="pt-4 lg:sticky lg:top-8 lg:self-start">
            <Summary totals={computeTotals(build, catalog)} />
          </div>
        </div>
      </div>

      {renderPicker()}
    </main>
  );
}
