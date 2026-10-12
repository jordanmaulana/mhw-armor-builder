import { useState } from "react";
import { useAtom } from "jotai";
import { RESET } from "jotai/utils";
import { Heart, Sword } from "lucide-react";

import { LoadingScreen } from "@/components/loading-screen";
import {
  EquipRow,
  SlotButton,
  SlotGem,
} from "@/features/builder/components/equip-row";
import { Picker } from "@/features/builder/components/picker";
import { SetSearch } from "@/features/builder/components/set-search";
import { SoundToggle } from "@/features/builder/components/sound-toggle";
import { Summary } from "@/features/builder/components/summary";
import { useCatalog } from "@/features/builder/hooks";
import { buildAtom } from "@/features/builder/state";
import { computeTotals, describeWeapon } from "@/features/builder/totals";
import {
  ARMOR_TYPES,
  WEAPON_TYPES,
  type Armor,
  type ArmorType,
  type EquippedWeapon,
  type Piece,
  type Weapon,
  type WeaponType,
} from "@/features/builder/types";

const LABELS: Record<ArmorType, string> = {
  head: "Head",
  chest: "Chest",
  arms: "Arms",
  waist: "Waist",
  legs: "Legs",
};

const WEAPON_LABELS: Record<WeaponType, string> = {
  great_sword: "Great Sword",
  long_sword: "Long Sword",
  sword_and_shield: "Sword and Shield",
  dual_blades: "Dual Blades",
  hammer: "Hammer",
  hunting_horn: "Hunting Horn",
  lance: "Lance",
  gunlance: "Gunlance",
  switch_axe: "Switch Axe",
  charge_blade: "Charge Blade",
  insect_glaive: "Insect Glaive",
  light_bowgun: "Light Bowgun",
  heavy_bowgun: "Heavy Bowgun",
  bow: "Bow",
};
const WEAPON_TYPE_OPTIONS = WEAPON_TYPES.map((value) => ({
  value,
  label: WEAPON_LABELS[value],
}));
// The weapon picker's second line is what the weapon is, not the skills it grants. No
// "Search by": three things are searched, and on a 390px phone the box has room for some
// 150px of placeholder beside Remove and Close.
const WEAPON_SEARCH = {
  label: "Name, element or skill",
  hint: "Try part of a name or an element, like “dragon”.",
};

const KOFI_URL = "https://ko-fi.com/jordanmaulana";

const slotTotal = (slots: number[]) =>
  slots.reduce((sum, level) => sum + level, 0);
// most slots first, then the bigger ones: [3, 2] before [1, 1]
const bySlots = (a: { slots: number[] }, b: { slots: number[] }) =>
  b.slots.length - a.slots.length || slotTotal(b.slots) - slotTotal(a.slots);

// The catalog arrives name-ordered and sort is stable, so ties stay alphabetical.
const ARMOR_SORTS: Record<string, (a: Armor, b: Armor) => number> = {
  Defense: (a, b) => b.defense - a.defense,
  Slots: bySlots,
};
// Attack is the number the game shows, which only compares within a weapon type: the picker
// lists one type at a time.
const WEAPON_SORTS: Record<string, (a: Weapon, b: Weapon) => number> = {
  Attack: (a, b) => b.attack - a.attack,
  Slots: bySlots,
};

type Picking =
  | { kind: "armor"; type: ArmorType }
  | { kind: "slot"; type: ArmorType; index: number }
  | { kind: "weapon" }
  | { kind: "weapon-slot"; index: number }
  | { kind: "charm" };

export function BuilderPage() {
  const { data: catalog, isError } = useCatalog();
  const [build, setBuild] = useAtom(buildAtom);
  const [picking, setPicking] = useState<Picking | null>(null);
  // held here, not in Picker: the picker unmounts on close, and the choice should outlive it
  const [armorSort, setArmorSort] = useState("Defense");
  const [weaponSort, setWeaponSort] = useState("Attack");
  // the type the weapon picker lists: null until one is chosen there, and then it stays
  const [weaponType, setWeaponType] = useState<WeaponType | null>(null);

  if (!catalog) {
    return (
      <LoadingScreen>
        {isError
          ? "Couldn't load the armor list. Check your connection, then reload the page."
          : "Loading the armor list…"}
      </LoadingScreen>
    );
  }

  const close = () => setPicking(null);
  const setPiece = (type: ArmorType, piece: Piece | null) =>
    setBuild({ ...build, pieces: { ...build.pieces, [type]: piece } });
  const setWeapon = (weapon: EquippedWeapon | null) =>
    setBuild({ ...build, weapon });
  // `?.` on build.weapon throughout: a build saved before weapons has no such key
  const held = catalog.weapons.get(build.weapon?.weaponId ?? "");

  function renderPicker() {
    if (!picking || !catalog) return null;

    // a slot is a slot, on a piece of armor or on the weapon
    const decorationPicker = (
      level: number,
      selectedId: string | null | undefined,
      onPick: (id: string | null) => void,
    ) => (
      <Picker
        title={`Choose a decoration for the level ${level} slot`}
        items={[...catalog.decorations.values()].filter(
          (decoration) => decoration.slot <= level,
        )}
        skills={catalog.skills}
        selectedId={selectedId}
        onClose={close}
        meta={(decoration) => <SlotGem level={decoration.slot} />}
        onPick={(decoration) => {
          onPick(decoration?.id ?? null);
          close();
        }}
      />
    );

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

    if (picking.kind === "weapon") {
      // the type last listed, else the one in hand
      const type = weaponType ?? held?.type ?? WEAPON_TYPES[0];
      const weapons = [...catalog.weapons.values()]
        .filter((weapon) => weapon.type === type)
        .sort(WEAPON_SORTS[weaponSort]);
      return (
        <Picker
          title="Choose a weapon"
          items={weapons}
          skills={catalog.skills}
          selectedId={build.weapon?.weaponId}
          search={WEAPON_SEARCH}
          filter={{
            label: "Weapon type",
            options: WEAPON_TYPE_OPTIONS,
            value: type,
            onChange: (value) => setWeaponType(value as WeaponType),
          }}
          sort={{
            options: Object.keys(WEAPON_SORTS),
            value: weaponSort,
            onChange: setWeaponSort,
          }}
          detail={describeWeapon}
          onClose={close}
          meta={(weapon) => (
            <span className="flex items-baseline gap-0.5 tabular-nums">
              {weapon.slots.map((level, i) => (
                <SlotGem key={i} level={level} />
              ))}
              <span className="w-16 text-right">Atk {weapon.attack}</span>
            </span>
          )}
          onPick={(weapon) => {
            // another weapon has other slots, so its decorations can't carry over
            if (weapon?.id !== build.weapon?.weaponId) {
              setWeapon(
                weapon && {
                  weaponId: weapon.id,
                  decoIds: weapon.slots.map(() => null),
                },
              );
            }
            close();
          }}
        />
      );
    }

    if (picking.kind === "weapon-slot") {
      const equipped = build.weapon;
      return decorationPicker(
        held?.slots[picking.index] ?? 0,
        equipped?.decoIds[picking.index],
        (id) => {
          if (equipped) {
            setWeapon({
              ...equipped,
              decoIds: equipped.decoIds.with(picking.index, id),
            });
          }
        },
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
          sort={{
            options: Object.keys(ARMOR_SORTS),
            value: armorSort,
            onChange: setArmorSort,
          }}
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
              setPiece(
                type,
                armor && {
                  armorId: armor.id,
                  decoIds: armor.slots.map(() => null),
                },
              );
            }
            close();
          }}
        />
      );
    }

    return decorationPicker(
      (piece && catalog.armors.get(piece.armorId)?.slots[picking.index]) ?? 0,
      piece?.decoIds[picking.index],
      (id) => {
        if (piece) {
          setPiece(type, {
            ...piece,
            decoIds: piece.decoIds.with(picking.index, id),
          });
        }
      },
    );
  }

  const charm = build.charmId ? catalog.charms.get(build.charmId) : undefined;

  return (
    <main className="smithy min-h-screen text-bone">
      {/* pb-20: the footer has to clear the floating SoundToggle */}
      {/* wider at xl, where the set search takes a column of its own */}
      <div className="mx-auto max-w-6xl px-4 pt-8 pb-20 sm:px-6 lg:pt-12 xl:max-w-360">
        <header className="flex items-baseline justify-between gap-4 pb-4">
          {/* the game titles a screen with its path: "Smithy ▸ Change Equipment" */}
          <h1 className="font-serif text-2xl text-aqua text-shadow-glow sm:text-3xl">
            <span className="block text-lg text-aqua/80 sm:inline sm:text-3xl">
              Monster Hunter: World
            </span>
            <span
              aria-hidden
              className="mx-3 hidden text-xl text-aqua/80 sm:inline"
            >
              ▸
            </span>
            Armor set builder
          </h1>
          <div className="flex shrink-0 items-baseline gap-4">
            {/* the word only from md: the title holds one line beside it from 740px up.
                -m-2 p-2 is the tap area, kept off "Clear set", which has no undo */}
            <a
              href={KOFI_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Support this tool on Ko-fi (opens in a new tab)"
              className="-m-2 flex items-baseline gap-1.5 p-2 text-sm text-moss underline-offset-4 hover:text-bone hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hunt"
            >
              {/* brass, not ember: alone on a phone, it has to hold 3:1 on the backdrop */}
              <Heart aria-hidden className="size-4 translate-y-0.5 text-brass" />
              <span className="hidden md:inline">Support</span>
            </a>
            <button
              type="button"
              onClick={() => setBuild(RESET)}
              className="text-sm text-moss underline-offset-4 hover:text-bone hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hunt"
            >
              Clear set
            </button>
          </div>
        </header>

        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-14 xl:grid-cols-[24rem_minmax(0,1fr)_20rem] xl:gap-10">
          {/* one stacked column until xl, where its two children become grid columns of their own */}
          <div className="flex min-w-0 flex-col gap-6 xl:contents">
            <SetSearch catalog={catalog} build={build} onUse={setBuild} />
            <ul aria-label="Equipment">
              {/* first, as on the game's equipment screen */}
              <EquipRow
                label="Weapon"
                emptyText="Choose a weapon"
                item={held}
                // the dataset has no weapon icons
                glyph={<Sword aria-hidden className="size-6 text-moss" />}
                meta={held && `Attack ${held.attack}`}
                detail={held && describeWeapon(held)}
                skills={catalog.skills}
                onChoose={() => setPicking({ kind: "weapon" })}
              >
                {held?.slots.length
                  ? held.slots.map((level, index) => (
                      <SlotButton
                        key={index}
                        level={level}
                        decoration={catalog.decorations.get(
                          build.weapon?.decoIds[index] ?? "",
                        )}
                        skills={catalog.skills}
                        onClick={() =>
                          setPicking({ kind: "weapon-slot", index })
                        }
                      />
                    ))
                  : null}
              </EquipRow>
              {ARMOR_TYPES.map((type) => {
                const piece = build.pieces[type];
                const armor = piece
                  ? catalog.armors.get(piece.armorId)
                  : undefined;
                return (
                  <EquipRow
                    key={type}
                    label={LABELS[type]}
                    emptyText={`Choose ${type} armor`}
                    item={armor}
                    icon={
                      armor && (armor.icon_url_male || armor.icon_url_female)
                    }
                    meta={armor && `Defense ${armor.defense}`}
                    skills={catalog.skills}
                    onChoose={() => setPicking({ kind: "armor", type })}
                  >
                    {armor?.slots.length
                      ? armor.slots.map((level, index) => (
                          <SlotButton
                            key={index}
                            level={level}
                            decoration={catalog.decorations.get(
                              piece?.decoIds[index] ?? "",
                            )}
                            skills={catalog.skills}
                            onClick={() =>
                              setPicking({ kind: "slot", type, index })
                            }
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
