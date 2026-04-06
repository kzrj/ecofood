from ..common.logging import log_event
from ..common.recipes import RECIPES


def termo_section_process(env, ramas_in_section, termokamera, collect_ramas_ohlazdenie, log):
    with termokamera.request() as req:
        yield req
        for rama in ramas_in_section:
            log_event(log, env.now, str(rama), "termokamera", "start", weight=rama.weight)
        termo_time = max(RECIPES[r.recipe_name]["termokamera_time"] for r in ramas_in_section)
        yield env.timeout(termo_time)
        for rama in ramas_in_section:
            log_event(log, env.now, str(rama), "termokamera", "done")

    for rama in ramas_in_section:
        yield collect_ramas_ohlazdenie.put(rama)


def termokamera_dispatcher(env, collect_ramas_termokamera, collect_ramas_ohlazdenie, termokamera, log, total_ramas):
    processed = 0
    while processed < total_ramas:
        rama1 = yield collect_ramas_termokamera.get()
        ramas_in_section = [rama1]
        processed += 1

        if processed < total_ramas:
            rama2 = yield collect_ramas_termokamera.get()
            ramas_in_section.append(rama2)
            processed += 1

        env.process(
            termo_section_process(env, ramas_in_section, termokamera, collect_ramas_ohlazdenie, log)
        )
