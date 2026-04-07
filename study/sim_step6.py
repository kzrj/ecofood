"""
Шаг 6. Полный пайплайн.
Станции: кутер -> шприц -> клипсатор -> [рама] -> осадка -> термокамера
         -> охлаждение -> упаковка -> склад
"""

import simpy
import random
import json


RECIPES = {
    'varenka': {
        'steps': [
            ('kuter',      14),
            ('shpric',      8),
            ('klipsator',   8),  # то же время что шприц
        ],
        'osadka_time':      100,
        'termokamera_time':  60,
    },
    'polukopch': {
        'steps': [
            ('kuter',      10),
            ('shpric',     10),
            ('klipsator',  10),
        ],
        'osadka_time':      240,
        'termokamera_time': 110,
    },
}

RAMA_CAPACITY  = 150   # кг
SKU_WEIGHT_MIN = 40    # кг
SKU_WEIGHT_MAX = 100   # кг
OHLAZDENIE_TIME = 30   # мин
UPAKOVKA_TIME  = 50    # мин на раму


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


def calculate_total_ramas(sku_list):
    """Считает реальное количество рам с учётом порядка заполнения."""
    per_type = {}
    for _, recipe_name, weight in sku_list:
        per_type.setdefault(recipe_name, []).append(weight)

    total = 0
    for weights_list in per_type.values():
        current = 0
        for w in weights_list:
            current += w
            if current >= RAMA_CAPACITY:
                total += 1
                current = 0
        if current > 0:
            total += 1  # последняя неполная рама
    return total


def log_event(log, t, subject, station, status, waited=0, weight=None):
    entry = {'t': t, 'sku': subject, 'station': station, 'status': status, 'waited': waited}
    if weight is not None:
        entry['weight'] = weight
    log.append(entry)


# ---------------------------------------------------------------
# SKU: кутер -> шприц -> клипсатор -> рама
# ---------------------------------------------------------------

def sku_pipeline(env, sku_id, recipe_name, weight, recipe, stations, rama_state, collect_ramas_osadka, log):
    for station_name, duration in recipe['steps']:
        station = stations[station_name]
        wait_start = env.now
        with station.request() as req:
            yield req
            log_event(log, env.now, sku_id, station_name, 'start', env.now - wait_start, weight=weight)
            yield env.timeout(duration)
            log_event(log, env.now, sku_id, station_name, 'done')

    # После клипсатора — вешаем на раму своего типа
    state = rama_state[recipe_name]

    if state['current'] is None:
        state['current'] = Rama(recipe_name)

    rama = state['current']
    rama.add(sku_id, weight)
    state['processed'] += 1
    # on_rama логирует текущий вес рамы — фронт использует это для показа буфера
    log_event(log, env.now, sku_id, f"rama#{rama.id}", 'on_rama', weight=rama.weight)

    if rama.is_full or state['processed'] == state['total']:
        state['current'] = None
        log_event(log, env.now, str(rama), 'queue_osadka', 'entered', weight=rama.weight)
        yield collect_ramas_osadka.put(rama)


# ---------------------------------------------------------------
# Рама: осадка -> термокамера
# ---------------------------------------------------------------

def osadka_slot(env, rama, collect_ramas_termokamera, osadka, log):
    """Обрабатывает одну раму на осадке независимо."""
    with osadka.request() as req:
        yield req
        log_event(log, env.now, str(rama), 'osadka', 'start', weight=rama.weight)
        yield env.timeout(RECIPES[rama.recipe_name]['osadka_time'])
        log_event(log, env.now, str(rama), 'osadka', 'done')
    log_event(log, env.now, str(rama), 'queue_termokamera', 'entered', weight=rama.weight)
    yield collect_ramas_termokamera.put(rama)


def osadka_dispatcher(env, collect_ramas_osadka, collect_ramas_termokamera, osadka, log, total_ramas):
    """Раздаёт рамы на осадку — каждая идёт параллельно."""
    for _ in range(total_ramas):
        rama = yield collect_ramas_osadka.get()
        env.process(osadka_slot(env, rama, collect_ramas_termokamera, osadka, log))


def termo_section_process(env, ramas_in_section, termokamera, collect_ramas_ohlazdenie, log):
    """Одна секция термокамеры (1–2 рамы). До 3 таких процессов параллельно — ресурс capacity=3."""
    with termokamera.request() as req:
        yield req
        for rama in ramas_in_section:
            log_event(log, env.now, str(rama), 'termokamera', 'start', weight=rama.weight)
        termo_time = max(RECIPES[r.recipe_name]['termokamera_time'] for r in ramas_in_section)
        yield env.timeout(termo_time)
        for rama in ramas_in_section:
            log_event(log, env.now, str(rama), 'termokamera', 'done')

    for rama in ramas_in_section:
        yield collect_ramas_ohlazdenie.put(rama)


def termokamera_dispatcher(env, collect_ramas_termokamera, collect_ramas_ohlazdenie,
                            termokamera, log, total_ramas):
    """Берёт пары рам из очереди и запускает секции параллельно (не ждёт конца термоцикла)."""
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


# ---------------------------------------------------------------
# Рама: охлаждение (4 слота, параллельно)
# После охлаждения — SKU по весу идут на упаковку
# ---------------------------------------------------------------

def ohlazdenie_slot(env, rama, ohlazdenie, collect_ramas_upakovka, log):
    """Один слот охлаждения для одной рамы."""
    with ohlazdenie.request() as req:
        yield req
        log_event(log, env.now, str(rama), 'ohlazdenie', 'start', weight=rama.weight)
        yield env.timeout(OHLAZDENIE_TIME)
        log_event(log, env.now, str(rama), 'ohlazdenie', 'done')

    yield collect_ramas_upakovka.put(rama)


def ohlazdenie_dispatcher(env, collect_ramas_ohlazdenie, collect_ramas_upakovka,
                           ohlazdenie, log, total_ramas):
    """Тянет рамы и запускает каждую в отдельный слот охлаждения."""
    for _ in range(total_ramas):
        rama = yield collect_ramas_ohlazdenie.get()
        env.process(ohlazdenie_slot(env, rama, ohlazdenie, collect_ramas_upakovka, log))


# ---------------------------------------------------------------
# Упаковка: каждая рама — отдельный слот, 50 мин
# ---------------------------------------------------------------

def upakovka_slot(env, rama, upakovka, sklad, log):
    with upakovka.request() as req:
        yield req
        log_event(log, env.now, str(rama), 'upakovka', 'start', weight=rama.weight)
        yield env.timeout(UPAKOVKA_TIME)
        log_event(log, env.now, str(rama), 'upakovka', 'done')

    yield sklad.put(rama.weight)
    log_event(log, env.now, str(rama), 'sklad', 'stored', weight=rama.weight)


def upakovka_dispatcher(env, collect_ramas_upakovka, upakovka, sklad, log, total_ramas):
    for _ in range(total_ramas):
        rama = yield collect_ramas_upakovka.get()
        env.process(upakovka_slot(env, rama, upakovka, sklad, log))


# ---------------------------------------------------------------
# Вывод
# ---------------------------------------------------------------

def print_log(log):
    print(f"\n{'t':>5}  {'объект':<20} {'станция':<14} {'статус':<10} {'ожидание'}")
    print("-" * 68)
    for e in log:
        waited = f"ждал {e['waited']} мин" if e['waited'] > 0 else ''
        print(f"  {e['t']:>4}  {e['sku']:<20} {e['station']:<14} {e['status']:<10} {waited}")


# ---------------------------------------------------------------
# Сохранение лога
# ---------------------------------------------------------------

def save_log(log, total_time, sku_list):
    data = {
        'total_time': total_time,
        'sku_list':   [{'id': s, 'recipe': r, 'weight': w} for s, r, w in sku_list],
        'events':     log,
    }
    paths = [
        'simulation_log.json',                    # рядом со скриптом
        '../front/public/simulation_log.json',    # для фронта
    ]
    for path in paths:
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"\nЛог сохранён ({len(log)} событий)")


# ---------------------------------------------------------------
# Запуск
# ---------------------------------------------------------------

def run():
    env = simpy.Environment()
    log = []

    stations = {
        'kuter':     simpy.Resource(env, capacity=1),
        'shpric':    simpy.Resource(env, capacity=1),
        'klipsator': simpy.Resource(env, capacity=1),
    }

    osadka      = simpy.Resource(env, capacity=100)
    termokamera = simpy.Resource(env, capacity=3)
    ohlazdenie  = simpy.Resource(env, capacity=4)
    upakovka    = simpy.Resource(env, capacity=100)
    sklad       = simpy.Container(env, capacity=1000)

    collect_ramas_osadka      = simpy.Store(env)
    collect_ramas_termokamera = simpy.Store(env)
    collect_ramas_ohlazdenie  = simpy.Store(env)
    collect_ramas_upakovka    = simpy.Store(env)

    sku_list = [
        ('var-1', 'varenka',  random.randint(SKU_WEIGHT_MIN, SKU_WEIGHT_MAX)),
        ('var-2', 'varenka',  random.randint(SKU_WEIGHT_MIN, SKU_WEIGHT_MAX)),
        ('var-3', 'varenka',  random.randint(SKU_WEIGHT_MIN, SKU_WEIGHT_MAX)),
        ('var-4', 'varenka',  random.randint(SKU_WEIGHT_MIN, SKU_WEIGHT_MAX)),
        ('pk-1',  'polukopch', random.randint(SKU_WEIGHT_MIN, SKU_WEIGHT_MAX)),
        ('pk-2',  'polukopch', random.randint(SKU_WEIGHT_MIN, SKU_WEIGHT_MAX)),
    ]

    # Считаем количество SKU и суммарный вес по каждому типу
    counts  = {}
    weights = {}
    for _, recipe_name, weight in sku_list:
        counts[recipe_name]  = counts.get(recipe_name, 0) + 1
        weights[recipe_name] = weights.get(recipe_name, 0) + weight

    rama_state = {
        recipe_name: {'current': None, 'processed': 0, 'total': count}
        for recipe_name, count in counts.items()
    }

    total_ramas = calculate_total_ramas(sku_list)

    total_weight = sum(w for _, _, w in sku_list)

    print(f"\nЗапуск: {len(sku_list)} SKU | {total_weight} кг | {total_ramas} рамы")
    for rn, cnt in counts.items():
        ramas_rn = calculate_total_ramas([(s, r, w) for s, r, w in sku_list if r == rn])
        print(f"  {rn}: {cnt} SKU, {weights[rn]} кг -> {ramas_rn} рамы")
    print(f"\n  {'id':<10} {'тип':<12} {'вес'}")
    print(f"  {'-'*30}")
    for sku_id, recipe_name, weight in sku_list:
        print(f"  {sku_id:<10} {recipe_name:<12} {weight} кг")
    print()

    env.process(osadka_dispatcher(env, collect_ramas_osadka, collect_ramas_termokamera,
                                   osadka, log, total_ramas))
    env.process(termokamera_dispatcher(env, collect_ramas_termokamera, collect_ramas_ohlazdenie,
                                        termokamera, log, total_ramas))
    env.process(ohlazdenie_dispatcher(env, collect_ramas_ohlazdenie, collect_ramas_upakovka,
                                       ohlazdenie, log, total_ramas))
    env.process(upakovka_dispatcher(env, collect_ramas_upakovka, upakovka, sklad, log, total_ramas))

    for sku_id, recipe_name, weight in sku_list:
        recipe = RECIPES[recipe_name]
        env.process(sku_pipeline(env, sku_id, recipe_name, weight, recipe, stations,
                                  rama_state, collect_ramas_osadka, log))

    env.run()

    print_log(log)
    print(f"\nОбщее время: {env.now} мин")
    print(f"На складе:   {sklad.level} кг")

    save_log(log, env.now, sku_list)


if __name__ == '__main__':
    run()
