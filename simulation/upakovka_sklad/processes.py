from ..common.constants import UPAKOVKA_KG_PER_HOUR
from ..common.logging import log_event


def upakovka_dispatcher(env, collect_batches_upakovka, upakovka, sklad, log, total_batches):
    for batch_num in range(1, total_batches + 1):
        batch_weight = yield collect_batches_upakovka.get()

        with upakovka.request() as req:
            yield req
            upakovka_time = round(batch_weight / UPAKOVKA_KG_PER_HOUR * 60, 1)
            label = f"batch{batch_num}({batch_weight}kg)"
            log_event(log, env.now, label, "upakovka", "start", weight=batch_weight)
            yield env.timeout(upakovka_time)
            log_event(log, env.now, label, "upakovka", "done")

        yield sklad.put(batch_weight)
        log_event(log, env.now, label, "sklad", "stored", weight=batch_weight)
