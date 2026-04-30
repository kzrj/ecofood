import simpy

from .common import RECIPES, calculate_total_ramas
from .common.constants import PREP_RETOOL_TIME_MIN
from .common.constants import TERMO_RETOOL_TIME_MIN
from .io.export import print_log, save_log
from .osadka import osadka_dispatcher
from .ohlazdenie import ohlazdenie_dispatcher
from .sku_line import sku_pipeline
from .termokamera import termokamera_dispatcher
from .sku_list import SKU_LIST
from .upakovka_sklad import upakovka_dispatcher


def run(sku_list=None):
    env = simpy.Environment()
    log = []

    stations = {
        "kuter": simpy.Resource(env, capacity=1),
        "shpric": simpy.Resource(env, capacity=1),
        "klipsator": simpy.Resource(env, capacity=1),
    }
    prep_state = {name: {"last_recipe": None} for name in stations}

    osadka = simpy.Resource(env, capacity=100)
    termokamera = simpy.Resource(env, capacity=3)
    ohlazdenie = simpy.Resource(env, capacity=4)
    upakovka = simpy.Resource(env, capacity=100)

    collect_ramas_osadka = simpy.Store(env)
    collect_ramas_termokamera = simpy.Store(env)
    collect_ramas_ohlazdenie = simpy.Store(env)
    collect_ramas_upakovka = simpy.Store(env)

    if sku_list is None:
        sku_list = list(SKU_LIST)

    counts = {}
    weights = {}
    for _, recipe_name, weight in sku_list:
        counts[recipe_name] = counts.get(recipe_name, 0) + 1
        weights[recipe_name] = weights.get(recipe_name, 0) + weight

    rama_state = {recipe_name: {"current": None, "processed": 0, "total": count} for recipe_name, count in counts.items()}

    total_ramas = calculate_total_ramas(sku_list)

    total_weight = sum(w for _, _, w in sku_list)

    # Ёмкость склада = суммарный вес партии (склад не является узким местом)
    sklad = simpy.Container(env, capacity=total_weight)

    print(f"\nЗапуск: {len(sku_list)} SKU | {total_weight} кг | {total_ramas} рамы")
    for rn, cnt in counts.items():
        ramas_rn = calculate_total_ramas([(s, r, w) for s, r, w in sku_list if r == rn])
        print(f"  {rn}: {cnt} SKU, {weights[rn]} кг -> {ramas_rn} рамы")
    print(f"\n  {'id':<10} {'тип':<12} {'вес'}")
    print(f"  {'-' * 30}")
    for sku_id, recipe_name, weight in sku_list:
        print(f"  {sku_id:<10} {recipe_name:<12} {weight} кг")
    print()

    env.process(
        osadka_dispatcher(env, collect_ramas_osadka, collect_ramas_termokamera, osadka, log, total_ramas)
    )
    env.process(
        termokamera_dispatcher(
            env,
            collect_ramas_termokamera,
            collect_ramas_ohlazdenie,
            termokamera,
            log,
            total_ramas,
            retool_time_min=TERMO_RETOOL_TIME_MIN,
        )
    )
    env.process(
        ohlazdenie_dispatcher(env, collect_ramas_ohlazdenie, collect_ramas_upakovka, ohlazdenie, log, total_ramas)
    )
    env.process(upakovka_dispatcher(env, collect_ramas_upakovka, upakovka, sklad, log, total_ramas))

    # Строгий порядок запуска SKU по входному списку:
    # sku[i+1] может запросить первую prep-станцию только после sku[i].
    start_token = env.event()
    start_token.succeed()
    for sku_id, recipe_name, weight in sku_list:
        recipe = RECIPES[recipe_name]
        next_token = env.event()
        env.process(
            sku_pipeline(
                env,
                sku_id,
                recipe_name,
                weight,
                recipe,
                stations,
                rama_state,
                collect_ramas_osadka,
                log,
                prep_state=prep_state,
                prep_retool_time_min=PREP_RETOOL_TIME_MIN,
                start_after=start_token,
                release_next_start=next_token,
            )
        )
        start_token = next_token

    env.run()

    print_log(log)
    print(f"\nОбщее время: {env.now} мин")
    print(f"На складе:   {sklad.level} кг")

    save_log(log, env.now, sku_list)
    return env, log, sku_list


if __name__ == "__main__":
    run()
