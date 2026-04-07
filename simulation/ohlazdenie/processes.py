from ..common.constants import OHLAZDENIE_TIME, UPAKOVKA_CAPACITY
from ..common.logging import log_event


def ohlazdenie_slot(env, rama, ohlazdenie, collect_batches_upakovka, log, upakovka_state):
    with ohlazdenie.request() as req:
        yield req
        log_event(log, env.now, str(rama), "ohlazdenie", "start", weight=rama.weight, recipe=rama.recipe_name)
        yield env.timeout(OHLAZDENIE_TIME)
        log_event(log, env.now, str(rama), "ohlazdenie", "done", recipe=rama.recipe_name)

    upakovka_state["current_weight"] += rama.weight
    upakovka_state["processed_ramas"] += 1

    if (
        upakovka_state["current_weight"] >= UPAKOVKA_CAPACITY
        or upakovka_state["processed_ramas"] == upakovka_state["total_ramas"]
    ):
        batch_weight = upakovka_state["current_weight"]
        upakovka_state["current_weight"] = 0
        yield collect_batches_upakovka.put(batch_weight)


def ohlazdenie_dispatcher(
    env, collect_ramas_ohlazdenie, collect_batches_upakovka, ohlazdenie, log, total_ramas, upakovka_state
):
    for _ in range(total_ramas):
        rama = yield collect_ramas_ohlazdenie.get()
        env.process(ohlazdenie_slot(env, rama, ohlazdenie, collect_batches_upakovka, log, upakovka_state))
