"""
Алгоритм максимального покрытия потребности замесами 100 и 150 кг.

Производство НЕ превышает потребность: a×150 + b×100 ≤ need.
Излишек — некрытый остаток (кг, не влезающие ни в один замес), всегда < 50.
При равном покрытии предпочитаем максимальное число замесов по 150 кг.

Примеры:
    need=455  → замесов 150: 3, замесов 100: 0, излишек:  5  (3×150=450)
    need=950  → замесов 150: 5, замесов 100: 2, излишек:  0  (5×150+2×100=950)
    need=730  → замесов 150: 4, замесов 100: 1, излишек: 30  (4×150+1×100=700)
"""
from __future__ import annotations

_KEY_B150 = "замесов 150"
_KEY_B100 = "замесов 100"
_KEY_SURPLUS = "излишек"


def split_batches(need: float | int | None) -> dict[str, int | float]:
    """
    Максимально покрывает потребность (кг) замесами 100 и 150 кг, не превышая её.

    Алгоритм:
      1. V = наибольшее кратное 50 ≤ need, выражаемое как 150·a + 100·b
         (50 не достижимо — минимальный замес 100 кг; в этом случае V=0)
      2. Раскладываем V = 150·a + 100·b, максимизируя a
      3. излишек = need − V  (некрытый остаток, < 50 кг)

    Возвращает:
        {
            'замесов 150': int,    # кол-во замесов по 150 кг
            'замесов 100': int,    # кол-во замесов по 100 кг
            'излишек':    float,   # некрытый остаток, кг (< 50)
        }
    """
    if need is None or not isinstance(need, (int, float)) or need <= 0:
        return {_KEY_B150: 0, _KEY_B100: 0, _KEY_SURPLUS: 0}

    need_f = float(need)

    # Наибольшее кратное 50, не превышающее need
    v50 = int(need_f) // 50 * 50

    # 50 — единственное положительное кратное 50, не выражаемое через 100/150
    if v50 == 50:
        v50 = 0

    if v50 == 0:
        return {_KEY_B150: 0, _KEY_B100: 0, _KEY_SURPLUS: round(need_f, 3)}

    # Разложить v50 = 150·a + 100·b с максимальным a
    # Делим на 50: k = 3·a + 2·b  →  b = (k − 3·a) / 2
    # b ≥ 0 и целое  →  (k − 3·a) ≥ 0 и чётное
    k = v50 // 50
    a = k // 3
    while a >= 0:
        rem = k - 3 * a
        if rem >= 0 and rem % 2 == 0:
            b = rem // 2
            break
        a -= 1
    else:
        a, b = 0, v50 // 100  # страховочная ветка (не достижима)

    return {_KEY_B150: a, _KEY_B100: b, _KEY_SURPLUS: round(need_f - v50, 3)}


def enrich_row(row: dict) -> dict:
    """
    Принимает строку из Excel-парсера и добавляет три вычисленных поля:
    'замесов 150', 'замесов 100', 'излишек'.
    """
    return {**row, **split_batches(row.get("потребность"))}


def enrich_row_with_need(name: str | None, need: float | int | None) -> dict:
    """Формирует строку для дневной потребности (старый режим, кг)."""
    return {
        "потребность": need,
        "наименование": name,
        **split_batches(need),
    }


def split_batches_units(
    need_units: float | int | None,
    per_100: float | int | None,
    per_150: float | int | None,
) -> dict[str, int | float]:
    """
    Расчет для дневных колонок (значения в штуках, не в кг).
    per_100/per_150 — сколько штук выпускает 1 замес 100/150 кг для конкретного SKU.
    """
    if need_units is None or not isinstance(need_units, (int, float)) or need_units <= 0:
        return {_KEY_B150: 0, _KEY_B100: 0, _KEY_SURPLUS: 0}

    need = float(need_units)
    c100 = float(per_100) if isinstance(per_100, (int, float)) and per_100 > 0 else 0.0
    c150 = float(per_150) if isinstance(per_150, (int, float)) and per_150 > 0 else 0.0

    if c100 <= 0 and c150 <= 0:
        return {_KEY_B150: 0, _KEY_B100: 0, _KEY_SURPLUS: round(need, 3)}

    best_a = 0
    best_b = 0
    best_produced = 0.0

    max_a = int(need // c150) if c150 > 0 else 0
    for a in range(max_a + 1):
        produced_by_a = a * c150
        rem = need - produced_by_a
        if rem < 0:
            continue
        b = int(rem // c100) if c100 > 0 else 0
        produced = produced_by_a + b * c100
        if produced > best_produced or (produced == best_produced and a > best_a):
            best_produced = produced
            best_a = a
            best_b = b

    # Отдельно вариант только 100-кг замесов (когда c150==0 или просто лучше)
    if c100 > 0:
        b_only = int(need // c100)
        produced_only = b_only * c100
        if produced_only > best_produced:
            best_produced = produced_only
            best_a = 0
            best_b = b_only

    return {
        _KEY_B150: best_a,
        _KEY_B100: best_b,
        _KEY_SURPLUS: round(need - best_produced, 3),
    }


def enrich_day_row(row: dict) -> dict:
    """Дневная строка: считаем замесы из штук (по per_100/per_150), не из кг."""
    need = row.get("потребность")
    name = row.get("наименование")
    per100 = row.get("замес на 100")
    per150 = row.get("замес на 150")
    return {
        "потребность": need,
        "наименование": name,
        **split_batches_units(need, per100, per150),
    }
