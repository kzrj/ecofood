"""
Шаг 5. Термокамера.
3 секции, каждая вмещает 2 рамы.
Диспетчер ждёт 2 рамы из Store, занимает 1 секцию, обрабатывает.
"""

import simpy
import math


RECIPES = {
    'varenka': {
        'steps':           [('kuter', 14), ('shpric', 8)],
        'osadka_time':     100,
        'termokamera_time': 60,
    },
    'polukopch': {
        'steps':           [('kuter', 10), ('shpric', 10)],
        'osadka_time':     240,
        'termokamera_time': 110,
    },
}

RAMA_CAPACITY = 150  # кг
SKU_WEIGHT    = 50   # кг


class Rama:
    _counter = 0

    def __init__(self, recipe_name):
        Rama._counter += 1
        self.id = Rama._counter
        self.recipe_name = recipe_name
        self.items = []
        self.weight = 0

    def add(self, sku_id, weight):
        self.items.append(sku_id)
        self.weight += weight

    @property
    def is_full(self):
        return self.weight >= RAMA_CAPACITY

    def __repr__(self):
        return f"Rama#{self.id}"


def log_event(log, t, subject, station, status, waited=0):
    log.append({'t': t, 'sku': subject, 'station': station, 'status': status, 'waited': waited})


def sku_pipeline(env, sku_id, recipe_name, recipe, stations, rama_state, collect_ramas_osadka, log):
    for station_name, duration in recipe['steps']:
        station = stations[station_name]
        wait_start = env.now
        with station.request() as req:
            yield req
            log_event(log, env.now, sku_id, station_name, 'start', env.now - wait_start)
            yield env.timeout(duration)
            log_event(log, env.now, sku_id, station_name, 'done')

    # Вешаем на раму после шприца — каждый тип на свою раму
    state = rama_state[recipe_name]

    if state['current'] is None:
        state['current'] = Rama(recipe_name)

    rama = state['current']
    rama.add(sku_id, SKU_WEIGHT)
    state['processed'] += 1
    log_event(log, env.now, sku_id, f"rama#{rama.id}", 'on_rama')

    if rama.is_full or state['processed'] == state['total']:
        state['current'] = None
        yield collect_ramas_osadka.put(rama)


def osadka_dispatcher(env, collect_ramas_osadka, collect_ramas_termokamera, osadka, log, total_ramas):
    """Ждёт рамы, отправляет на осадку, после кладёт в очередь к термокамере."""
    for _ in range(total_ramas):
        rama = yield collect_ramas_osadka.get()

        with osadka.request() as req:
            yield req
            osadka_time = RECIPES[rama.recipe_name]['osadka_time']
            log_event(log, env.now, str(rama), 'osadka', 'start')
            yield env.timeout(osadka_time)
            log_event(log, env.now, str(rama), 'osadka', 'done')

        # Осадка прошла — рама едет к термокамере
        yield collect_ramas_termokamera.put(rama)


def termokamera_dispatcher(env, collect_ramas_termokamera, termokamera, log, total_ramas):
    """Ждёт 2 рамы, занимает 1 секцию термокамеры, обрабатывает вместе."""
    processed  = 0
    section_num = 0

    while processed < total_ramas:
        section_num += 1
        ramas_in_section = []

        # Первая рама — всегда ждём
        rama1 = yield collect_ramas_termokamera.get()
        ramas_in_section.append(rama1)
        processed += 1

        # Вторая рама — только если есть ещё
        if processed < total_ramas:
            rama2 = yield collect_ramas_termokamera.get()
            ramas_in_section.append(rama2)
            processed += 1

        label = ' + '.join(str(r) for r in ramas_in_section)

        with termokamera.request() as req:
            yield req
            print(f"  t={env.now:>4}  Секция {section_num}: [{label}] -> термокамера начало")
            for rama in ramas_in_section:
                log_event(log, env.now, str(rama), 'termokamera', 'start')
            termokamera_time = max(RECIPES[r.recipe_name]['termokamera_time'] for r in ramas_in_section)
            yield env.timeout(termokamera_time)
            for rama in ramas_in_section:
                log_event(log, env.now, str(rama), 'termokamera', 'done')
            print(f"  t={env.now:>4}  Секция {section_num}: [{label}] -> термокамера готово")


def print_log(log):
    print(f"\n{'t':>5}  {'объект':<14} {'станция':<16} {'статус':<10} {'ожидание'}")
    print("-" * 62)
    for e in log:
        waited = f"ждал {e['waited']} мин" if e['waited'] > 0 else ''
        print(f"  {e['t']:>3}  {e['sku']:<14} {e['station']:<16} {e['status']:<10} {waited}")


def run():
    env = simpy.Environment()
    log = []

    stations = {
        'kuter':  simpy.Resource(env, capacity=1),
        'shpric': simpy.Resource(env, capacity=1),
    }

    osadka             = simpy.Resource(env, capacity=100)
    termokamera        = simpy.Resource(env, capacity=3)

    collect_ramas_osadka      = simpy.Store(env)   # рамы после шприца -> осадка
    collect_ramas_termokamera = simpy.Store(env)   # рамы после осадки -> термокамера

    sku_list = [
        ('var-1', 'varenka'),
        ('var-2', 'varenka'),
        ('var-3', 'varenka'),
        ('var-4', 'varenka'),
        ('pk-1',  'polukopch'),
        ('pk-2',  'polukopch'),
    ]

    # Считаем количество SKU и рам по каждому типу
    counts = {}
    for _, recipe_name in sku_list:
        counts[recipe_name] = counts.get(recipe_name, 0) + 1

    rama_state = {
        recipe_name: {
            'current':   None,
            'processed': 0,
            'total':     count,
        }
        for recipe_name, count in counts.items()
    }

    total_ramas = sum(
        math.ceil(count * SKU_WEIGHT / RAMA_CAPACITY)
        for count in counts.values()
    )

    print(f"\nЗапуск: {len(sku_list)} SKU -> {total_ramas} рамы")
    for recipe_name, count in counts.items():
        ramas = math.ceil(count * SKU_WEIGHT / RAMA_CAPACITY)
        print(f"  {recipe_name}: {count} SKU -> {ramas} рамы")
    print()

    env.process(osadka_dispatcher(env, collect_ramas_osadka, collect_ramas_termokamera, osadka, log, total_ramas))
    env.process(termokamera_dispatcher(env, collect_ramas_termokamera, termokamera, log, total_ramas))

    for sku_id, recipe_name in sku_list:
        recipe = RECIPES[recipe_name]
        env.process(sku_pipeline(env, sku_id, recipe_name, recipe, stations, rama_state, collect_ramas_osadka, log))

    env.run()

    print_log(log)
    print(f"\nОбщее время симуляции: {env.now} мин")


if __name__ == '__main__':
    run()
