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
    sku_meta = {sku_id: {"recipe": r, "planned_kg": w} for sku_id, r, w in sku_list}
    arrivals = {sku_id: [] for sku_id in sku_meta}
    total_kg = 0

    for event in log:
        if event.get("station") != "sklad" or event.get("status") != "stored":
            continue
        sku = event.get("sku")
        if sku not in sku_meta:
            continue
        w = event.get("weight", 0) or 0
        t = event.get("t")
        total_kg += w
        arrivals[sku].append({"t": t, "weight": w})

    sku_cells = []
    for sku_id, info in sku_meta.items():
        arr = arrivals[sku_id]
        stored_kg = sum(a["weight"] for a in arr)
        sku_cells.append(
            {
                "id": sku_id,
                "recipe": info["recipe"],
                "planned_kg": info["planned_kg"],
                "stored_kg": stored_kg,
                "arrivals": arr,
            }
        )

    return {"total_kg": total_kg, "sku_cells": sku_cells}


def _build_sku_metrics(log, sku_list):
    sku_info = {sku_id: {"recipe": recipe, "weight": weight} for sku_id, recipe, weight in sku_list}
    started_at = {}
    finished_at = {}
    stored_weight = {}

    for event in log:
        sku = event.get("sku")
        if sku not in sku_info:
            continue

        t = event.get("t")
        station = event.get("station")
        status = event.get("status")
        weight = event.get("weight", 0) or 0

        if status == "start" and station == "kuter" and sku not in started_at:
            started_at[sku] = t

        if status == "stored" and station == "sklad":
            finished_at[sku] = max(finished_at.get(sku, t), t)
            stored_weight[sku] = stored_weight.get(sku, 0) + weight

    result = []
    for sku_id, info in sku_info.items():
        start = started_at.get(sku_id)
        finish = finished_at.get(sku_id)
        duration = (finish - start) if start is not None and finish is not None else None
        weight = info["weight"]
        result.append(
            {
                "id": sku_id,
                "recipe": info["recipe"],
                "weight": weight,
                "started_at": start,
                "finished_at": finish,
                "duration_min": duration,
                "stored_weight": stored_weight.get(sku_id, 0),
                "min_per_kg": (duration / weight) if duration is not None and weight else None,
            }
        )

    return result


def save_log(log, total_time, sku_list, paths=None):
    data = {
        "total_time": total_time,
        "sku_list": [{"id": s, "recipe": r, "weight": w} for s, r, w in sku_list],
        "sku_metrics": _build_sku_metrics(log, sku_list),
        "sklad": _build_sklad_summary(log, sku_list),
        "events": log,
    }
    for path in paths or default_log_paths():
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"\nЛог сохранён ({len(log)} событий)")


def print_log(log):
    print(f"\n{'t':>5}  {'объект':<20} {'станция':<14} {'статус':<10} {'ожидание'}")
    print("-" * 68)
    for e in log:
        waited = f"ждал {e['waited']} мин" if e["waited"] > 0 else ""
        print(f"  {e['t']:>4}  {e['sku']:<20} {e['station']:<14} {e['status']:<10} {waited}")
