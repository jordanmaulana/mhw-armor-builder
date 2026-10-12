from collections import defaultdict

from armors.models import ArmorMaterial
from monsters.models import MonsterDrop


def hunts_by_armor():
    """The hunts each piece's recipe asks for: {armor id: [[monster id, ...], ...]}.

    One list per material, naming the monsters that drop it: the piece can be forged once one
    monster of each list has been slain. A gathered material and one no monster drops (a ticket)
    add no list, so a piece that asks for no hunt is not in the dict at all.
    """
    # any rank, any method: a drop is a drop. order_by() because BaseModel orders by id, and an
    # ordering column in the SELECT would make every row distinct
    drops = defaultdict(set)
    pairs = MonsterDrop.objects.filter(item__gathered=False).order_by()
    for item_id, monster_id in pairs.values_list("item_id", "monster_id").distinct():
        drops[item_id].add(monster_id)

    hunts = defaultdict(set)
    for armor_id, item_id in ArmorMaterial.objects.values_list("armor_id", "item_id"):
        if item_id in drops:
            hunts[armor_id].add(frozenset(drops[item_id]))

    # a list that holds the whole of another says nothing: whoever has slain one of the smaller
    # list's monsters has one of the larger's too (Rath Wingtalon beside Rathalos Scale)
    return {
        armor_id: sorted(
            sorted(group) for group in groups if not any(other < group for other in groups)
        )
        for armor_id, groups in hunts.items()
    }
