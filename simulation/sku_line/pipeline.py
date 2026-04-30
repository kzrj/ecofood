from ..common.logging import log_event
from ..common.constants import RAMA_CAPACITY
from ..common.models import Rama
from ..common.recipes import get_prep_steps


def sku_pipeline(
    env,
    sku_id,
    recipe_name,
    weight,
    recipe,
    stations,
    rama_state,
    collect_ramas_osadka,
    log,
    *,
    prep_state=None,
    prep_retool_time_min: int = 0,
    start_after=None,
    release_next_start=None,
):
    if start_after is not None:
        yield start_after

    next_released = False

    for station_name, duration in get_prep_steps(recipe):
        station = stations[station_name]
        wait_start = env.now
        with station.request() as req:
            # Строгий FIFO на входе линии:
            # следующий SKU может встать в очередь только после того,
            # как предыдущий уже создал request на первую prep-станцию.
            if not next_released and release_next_start is not None:
                release_next_start.succeed()
                next_released = True
            yield req
            acquired_at = env.now
            queue_wait = acquired_at - wait_start

            if prep_state is not None and prep_retool_time_min > 0:
                last_recipe = prep_state.setdefault(station_name, {}).get("last_recipe")
                if last_recipe is not None and last_recipe != recipe_name:
                    log_event(
                        log,
                        env.now,
                        sku_id,
                        station_name,
                        "retool_start",
                        0,
                        weight=weight,
                        recipe=recipe_name,
                        section="prep",
                    )
                    yield env.timeout(prep_retool_time_min)
                    log_event(
                        log,
                        env.now,
                        sku_id,
                        station_name,
                        "retool_done",
                        0,
                        weight=weight,
                        recipe=recipe_name,
                        section="prep",
                    )

                prep_state[station_name]["last_recipe"] = recipe_name

            log_event(log, env.now, sku_id, station_name, "start", queue_wait, weight=weight)
            yield env.timeout(duration)
            log_event(log, env.now, sku_id, station_name, "done")

    state = rama_state[recipe_name]
    state["processed"] += 1
    is_last_sku = state["processed"] == state["total"]

    remaining = weight
    while remaining > 0:
        if state["current"] is None:
            state["current"] = Rama(recipe_name)

        rama = state["current"]
        space = RAMA_CAPACITY - rama.weight
        chunk = min(remaining, space)
        remaining -= chunk

        rama.add(sku_id, chunk)
        log_event(log, env.now, sku_id, f"rama#{rama.id}", "on_rama", weight=chunk, recipe=recipe_name)

        should_close = rama.is_full or (remaining == 0 and is_last_sku)
        if should_close:
            state["current"] = None
            log_event(log, env.now, str(rama), "queue_osadka", "entered", weight=rama.weight, recipe=rama.recipe_name)
            yield collect_ramas_osadka.put(rama)
