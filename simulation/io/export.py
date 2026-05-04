import json
from pathlib import Path

# v2/simulation/io/export.py -> v2
_V2_ROOT = Path(__file__).resolve().parent.parent.parent


def default_log_paths():
    return (
        _V2_ROOT / "simulation_log.json",
        _V2_ROOT / "front" / "public" / "simulation_log.json",
    )


def _build_sklad_summary(log, sku_list):
    """Итог по складу: общий вес и ячейки по SKU (план, накоплено, порции прихода)."""
    sku_meta = {sku.id: {"recipe": sku.recipe_name, "planned_kg": sku.weight} for sku in sku_list}
    arrivals = {sku.id: [] for sku in sku_list}
    total_kg = 0

    for event in log:
        if event.get("station") != "sklad" or event.get("status") != "stored":
            continue
        sku_id = event.get("sku")
        if sku_id not in sku_meta:
            continue
        w = event.get("weight", 0) or 0
        t = event.get("t")
        total_kg += w
        arrivals[sku_id].append({"t": t, "weight": w})

    sku_cells = []
    for sku in sku_list:
        arr = arrivals[sku.id]
        stored_kg = sum(a["weight"] for a in arr)
        sku_cells.append(
            {
                "id": sku.id,
                "recipe": sku.recipe_name,
                "planned_kg": sku.weight,
                "stored_kg": stored_kg,
                "arrivals": arr,
            }
        )

    return {"total_kg": total_kg, "sku_cells": sku_cells}


def _build_sku_metrics(log, sku_list):
    sku_info = {sku.id: {"recipe": sku.recipe_name, "weight": sku.weight} for sku in sku_list}
    started_at = {}
    finished_at = {}
    stored_weight = {}

    for event in log:
        sku_id = event.get("sku")
        if sku_id not in sku_info:
            continue

        t = event.get("t")
        station = event.get("station")
        status = event.get("status")
        weight = event.get("weight", 0) or 0

        if status == "start" and station == "kuter" and sku_id not in started_at:
            started_at[sku_id] = t

        if status == "stored" and station == "sklad":
            finished_at[sku_id] = max(finished_at.get(sku_id, t), t)
            stored_weight[sku_id] = stored_weight.get(sku_id, 0) + weight

    result = []
    for sku in sku_list:
        start = started_at.get(sku.id)
        finish = finished_at.get(sku.id)
        duration = (finish - start) if start is not None and finish is not None else None
        result.append(
            {
                "id": sku.id,
                "recipe": sku.recipe_name,
                "weight": sku.weight,
                "started_at": start,
                "finished_at": finish,
                "duration_min": duration,
                "stored_weight": stored_weight.get(sku.id, 0),
                "min_per_kg": (duration / sku.weight) if duration is not None and sku.weight else None,
            }
        )

    return result


def build_log_payload(log, total_time, sku_list):
    """Тот же JSON, что пишется в simulation_log.json (для файла или HTTP)."""
    return {
        "total_time": total_time,
        "sku_list": [{"id": sku.id, "recipe": sku.recipe_name, "weight": sku.weight} for sku in sku_list],
        "sku_metrics": _build_sku_metrics(log, sku_list),
        "sklad": _build_sklad_summary(log, sku_list),
        "events": log,
    }


def write_log_payload(data, paths=None):
    for path in paths or default_log_paths():
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)


def save_log(log, total_time, sku_list, paths=None):
    data = build_log_payload(log, total_time, sku_list)
    write_log_payload(data, paths)
    print(f"\nЛог сохранён ({len(log)} событий)")


def print_log(log):
    print(f"\n{'t':>5}  {'объект':<20} {'станция':<14} {'статус':<10} {'ожидание'}")
    print("-" * 68)
    for e in log:
        waited = f"ждал {e['waited']} мин" if e["waited"] > 0 else ""
        print(f"  {e['t']:>4}  {e['sku']:<20} {e['station']:<14} {e['status']:<10} {waited}")
