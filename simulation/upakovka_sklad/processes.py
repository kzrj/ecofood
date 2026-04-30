from ..common.recipes import RECIPES
from ..common.logging import log_event


def upakovka_slot(env, rama, upakovka, sklad, log):
    with upakovka.request() as req:
        yield req
        log_event(log, env.now, str(rama), "upakovka", "start", weight=rama.weight, recipe=rama.recipe_name)
        yield env.timeout(RECIPES[rama.recipe_name]["upakovka"])
        log_event(log, env.now, str(rama), "upakovka", "done")

    yield sklad.put(rama.weight)
    # Фиксируем складирование по каждому SKU-куску, чтобы считать lead time на SKU.
    for chunk in rama.sku_chunks:
        log_event(
            log,
            env.now,
            chunk["sku"],
            "sklad",
            "stored",
            weight=chunk["weight"],
            recipe=rama.recipe_name,
        )


def upakovka_dispatcher(env, collect_ramas_upakovka, upakovka, sklad, log, total_ramas):
    for _ in range(total_ramas):
        rama = yield collect_ramas_upakovka.get()
        env.process(upakovka_slot(env, rama, upakovka, sklad, log))
