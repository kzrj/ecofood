from ..common.constants import OHLAZDENIE_TIME
from ..common.logging import log_event


def ohlazdenie_slot(env, rama, ohlazdenie, collect_ramas_upakovka, log):
    with ohlazdenie.request() as req:
        yield req
        log_event(log, env.now, str(rama), "ohlazdenie", "start", weight=rama.weight, recipe=rama.recipe_name)
        yield env.timeout(OHLAZDENIE_TIME)
        log_event(log, env.now, str(rama), "ohlazdenie", "done", recipe=rama.recipe_name)

    yield collect_ramas_upakovka.put(rama)


def ohlazdenie_dispatcher(
    env, collect_ramas_ohlazdenie, collect_ramas_upakovka, ohlazdenie, log, total_ramas
):
    for _ in range(total_ramas):
        rama = yield collect_ramas_ohlazdenie.get()
        env.process(ohlazdenie_slot(env, rama, ohlazdenie, collect_ramas_upakovka, log))
