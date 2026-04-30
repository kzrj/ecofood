from ..common.logging import log_event
from ..common.recipes import RECIPES


def osadka_slot(env, rama, collect_ramas_termokamera, osadka, log):
    with osadka.request() as req:
        yield req
        log_event(log, env.now, str(rama), "osadka", "start", weight=rama.weight, recipe=rama.recipe_name)
        yield env.timeout(RECIPES[rama.recipe_name]["osadka"])
        log_event(log, env.now, str(rama), "osadka", "done", recipe=rama.recipe_name)
    log_event(
        log, env.now, str(rama), "queue_termokamera", "entered", weight=rama.weight, recipe=rama.recipe_name
    )
    yield collect_ramas_termokamera.put(rama)


def osadka_dispatcher(env, collect_ramas_osadka, collect_ramas_termokamera, osadka, log, total_ramas):
    for _ in range(total_ramas):
        rama = yield collect_ramas_osadka.get()
        env.process(osadka_slot(env, rama, collect_ramas_termokamera, osadka, log))
