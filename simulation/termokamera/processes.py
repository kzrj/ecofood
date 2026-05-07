from ..common.logging import log_event


def termo_section_process(
    env,
    ramas_in_section,
    termokamera,
    collect_ramas_ohlazdenie,
    log,
    section_id,
    *,
    retool_time_min: int = 0,
):
    with termokamera.request() as req:
        yield req
        termo_time = max(r.times["termokamera"] for r in ramas_in_section)
        for rama in ramas_in_section:
            log_event(
                log,
                env.now,
                str(rama),
                "termokamera",
                "start",
                weight=rama.weight,
                recipe=rama.recipe_name,
                section=section_id,
            )
        yield env.timeout(termo_time)
        for rama in ramas_in_section:
            log_event(log, env.now, str(rama), "termokamera", "done", recipe=rama.recipe_name, section=section_id)

        if retool_time_min and retool_time_min > 0:
            sec = f"sec#{section_id}"
            log_event(log, env.now, sec, "termokamera", "retool_start", section=section_id)
            yield env.timeout(retool_time_min)
            log_event(log, env.now, sec, "termokamera", "retool_done", section=section_id)

    for rama in ramas_in_section:
        log_event(
            log,
            env.now,
            str(rama),
            "queue_ohlazdenie",
            "entered",
            weight=rama.weight,
            recipe=rama.recipe_name,
            section=section_id,
        )
        yield collect_ramas_ohlazdenie.put(rama)


def termokamera_dispatcher(
    env,
    collect_ramas_termokamera,
    collect_ramas_ohlazdenie,
    termokamera,
    log,
    total_ramas,
    *,
    retool_time_min: int = 0,
):
    processed = 0
    pending = {}  # recipe_name -> rama, ожидающая пару
    section_counter = 0

    while processed < total_ramas:
        rama = yield collect_ramas_termokamera.get()
        processed += 1

        if rama.recipe_name in pending:
            partner = pending.pop(rama.recipe_name)
            section_counter += 1
            env.process(
                termo_section_process(
                    env,
                    [partner, rama],
                    termokamera,
                    collect_ramas_ohlazdenie,
                    log,
                    section_counter,
                    retool_time_min=retool_time_min,
                )
            )
        else:
            pending[rama.recipe_name] = rama

    # Рамы без пары запускаем по одной
    for rama in pending.values():
        section_counter += 1
        env.process(
            termo_section_process(
                env,
                [rama],
                termokamera,
                collect_ramas_ohlazdenie,
                log,
                section_counter,
                retool_time_min=retool_time_min,
            )
        )
