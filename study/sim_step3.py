"""
Шаг 3. Лог событий вместо print.
Симуляция собирает все события в список.
После запуска можно делать что угодно с логом:
стримить на фронт, считать статистику, строить Gantt.
"""

import simpy


RECIPES = {
    'varenka': [
        ('kuter',  14),
        ('shpric',  8),
    ],
    'polukopch': [
        ('kuter',  10),
        ('shpric', 10),
    ],
    'syrokopchenaya': [
        ('shpric', 12),
    ],
}


def sku_pipeline(env, sku_id, recipe_name, steps, stations, log):
    for station_name, duration in steps:
        station = stations[station_name]

        wait_start = env.now
        with station.request() as req:
            yield req

            waited = env.now - wait_start
            log.append({
                't':        env.now,
                'sku':      sku_id,
                'recipe':   recipe_name,
                'station':  station_name,
                'status':   'start',
                'waited':   waited,
            })

            yield env.timeout(duration)

            log.append({
                't':        env.now,
                'sku':      sku_id,
                'recipe':   recipe_name,
                'station':  station_name,
                'status':   'done',
                'waited':   0,
            })

    log.append({
        't':      env.now,
        'sku':    sku_id,
        'recipe': recipe_name,
        'station': None,
        'status': 'finished',
        'waited': 0,
    })


def print_log(log):
    print(f"\n{'t':>5}  {'sku':<18} {'station':<14} {'status':<10} {'waited'}")
    print("-" * 60)
    for e in log:
        station = e['station'] or '---'
        waited  = f"ждал {e['waited']} мин" if e['waited'] > 0 else ''
        print(f"  {e['t']:>3}  {e['sku']:<18} {station:<14} {e['status']:<10} {waited}")


def print_stats(log, sku_list):
    print("\n--- Статистика ---")

    # Время завершения каждого SKU
    finish_times = {
        e['sku']: e['t']
        for e in log if e['status'] == 'finished'
    }
    for sku_id, t in finish_times.items():
        print(f"  {sku_id:<18} завершён в t={t}")

    # Суммарное ожидание по каждой станции
    waits = {}
    for e in log:
        if e['station'] and e['waited'] > 0:
            waits.setdefault(e['station'], []).append(e['waited'])

    print("\n  Очереди по станциям:")
    for station, times in waits.items():
        print(f"  {station:<12} ожиданий: {len(times)}, суммарно: {sum(times)} мин, макс: {max(times)} мин")


def run():
    env = simpy.Environment()
    log = []

    stations = {
        'kuter':  simpy.Resource(env, capacity=1),
        'shpric': simpy.Resource(env, capacity=1),
    }

    sku_list = [
        ('var-1',  'varenka'),
        ('var-2',  'varenka'),
        ('var-3',  'varenka'),
        ('pk-1',   'polukopch'),
        ('pk-2',   'polukopch'),
        ('syr-1',  'syrokopchenaya'),
    ]

    for sku_id, recipe_name in sku_list:
        steps = RECIPES[recipe_name]
        env.process(sku_pipeline(env, sku_id, recipe_name, steps, stations, log))

    env.run()

    print_log(log)
    print_stats(log, sku_list)
    print(f"\nОбщее время симуляции: {env.now} мин")

    return log


if __name__ == '__main__':
    run()
