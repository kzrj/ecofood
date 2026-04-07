from ..common.logging import log_event
from ..common.recipes import RECIPES


def termo_section_process(env, ramas_in_section, termokamera, collect_ramas_ohlazdenie, log):
    with termokamera.request() as req:
        yield req
        for rama in ramas_in_section:
            log_event(log, env.now, str(rama), "termokamera", "start", weight=rama.weight, recipe=rama.recipe_name)
        termo_time = max(RECIPES[r.recipe_name]["termokamera_time"] for r in ramas_in_section)
        yield env.timeout(termo_time)
        for rama in ramas_in_section:
            log_event(log, env.now, str(rama), "termokamera", "done", recipe=rama.recipe_name)

    for rama in ramas_in_section:
        yield collect_ramas_ohlazdenie.put(rama)


def termokamera_dispatcher(env, collect_ramas_termokamera, collect_ramas_ohlazdenie, termokamera, log, total_ramas):
    processed = 0
    pending = {}  # recipe_name -> rama, ожидающая пару

    while processed < total_ramas:
        rama = yield collect_ramas_termokamera.get()
        processed += 1

        if rama.recipe_name in pending:
            partner = pending.pop(rama.recipe_name)
            env.process(
                termo_section_process(env, [partner, rama], termokamera, collect_ramas_ohlazdenie, log)
            )
        else:
            pending[rama.recipe_name] = rama

    # Рамы без пары запускаем по одной
    for rama in pending.values():
        env.process(
            termo_section_process(env, [rama], termokamera, collect_ramas_ohlazdenie, log)
        )
