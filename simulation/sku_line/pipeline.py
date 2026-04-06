from ..common.logging import log_event
from ..common.models import Rama
from ..common.recipes import get_prep_steps


def sku_pipeline(env, sku_id, recipe_name, weight, recipe, stations, rama_state, collect_ramas_osadka, log):
    for station_name, duration in get_prep_steps(recipe):
        station = stations[station_name]
        wait_start = env.now
        with station.request() as req:
            yield req
            log_event(log, env.now, sku_id, station_name, "start", env.now - wait_start, weight=weight)
            yield env.timeout(duration)
            log_event(log, env.now, sku_id, station_name, "done")

    state = rama_state[recipe_name]

    if state["current"] is None:
        state["current"] = Rama(recipe_name)

    rama = state["current"]
    rama.add(sku_id, weight)
    state["processed"] += 1
    log_event(log, env.now, sku_id, f"rama#{rama.id}", "on_rama", weight=rama.weight)

    if rama.is_full or state["processed"] == state["total"]:
        state["current"] = None
        log_event(log, env.now, str(rama), "queue_osadka", "entered", weight=rama.weight)
        yield collect_ramas_osadka.put(rama)
