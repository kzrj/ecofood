from ..common.constants import UPAKOVKA_TIME
from ..common.logging import log_event


def upakovka_slot(env, rama, upakovka, sklad, log):
    with upakovka.request() as req:
        yield req
        log_event(log, env.now, str(rama), "upakovka", "start", weight=rama.weight, recipe=rama.recipe_name)
        yield env.timeout(UPAKOVKA_TIME)
        log_event(log, env.now, str(rama), "upakovka", "done")

    yield sklad.put(rama.weight)
    log_event(log, env.now, str(rama), "sklad", "stored", weight=rama.weight)


def upakovka_dispatcher(env, collect_ramas_upakovka, upakovka, sklad, log, total_ramas):
    for _ in range(total_ramas):
        rama = yield collect_ramas_upakovka.get()
        env.process(upakovka_slot(env, rama, upakovka, sklad, log))
