import json
from pathlib import Path

# v2/simulation/io/export.py -> v2
_V2_ROOT = Path(__file__).resolve().parent.parent.parent


def default_log_paths():
    return (
        _V2_ROOT / "simulation_log.json",
        _V2_ROOT / "front" / "public" / "simulation_log.json",
    )


def save_log(log, total_time, sku_list, paths=None):
    data = {
        "total_time": total_time,
        "sku_list": [{"id": s, "recipe": r, "weight": w} for s, r, w in sku_list],
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
