"""
Шаг 4. Рама.
После шприца SKU вешается на раму (150 кг, по 50 кг каждый).
Рама заполнилась -> едет на осадку.
Осадка - отдельный процесс, тянет рамы из Store.
"""

import simpy
import math


RECIPES = {
    'varenka': [
        ('kuter',  14),
        ('shpric',  8),
    ],
    'polukopch': [
        ('kuter',  10),
        ('shpric', 10),
    ],
}

RAMA_CAPACITY  = 150   # кг
SKU_WEIGHT     = 50    # кг каждый SKU
OSADKA_TIME    = 60    # мин (упрощённо, чтоб видеть в выводе)


class Rama:
    _counter = 0

    def __init__(self):
        Rama._counter += 1
        self.id = Rama._counter
        self.items = []
        self.weight = 0

    def add(self, sku_id, weight):
        self.items.append(sku_id)
        self.weight += weight

    @property
    def is_full(self):
        return self.weight >= RAMA_CAPACITY

    def __repr__(self):
        return f"Rama#{self.id}({self.weight}кг, {len(self.items)} шт)"


def sku_pipeline(env, sku_id, recipe_name, steps, stations, rama_state, ready_ramas, log):
    for station_name, duration in steps:
        station = stations[station_name]
        wait_start = env.now
        with station.request() as req:
            yield req
            waited = env.now - wait_start
            log.append({'t': env.now, 'sku': sku_id, 'station': station_name, 'status': 'start', 'waited': waited})
            yield env.timeout(duration)
            log.append({'t': env.now, 'sku': sku_id, 'station': station_name, 'status': 'done', 'waited': 0})

    # --- После шприца: вешаем на раму ---
    if rama_state['current'] is None:
        rama_state['current'] = Rama()

    rama = rama_state['current']
    rama.add(sku_id, SKU_WEIGHT)
    rama_state['processed'] += 1

    log.append({'t': env.now, 'sku': sku_id, 'station': f"rama#{rama.id}", 'status': 'on_rama', 'waited': 0})
    print(f"  t={env.now:>4}  {sku_id:<12} повешен на {rama}  (осталось мест: {(RAMA_CAPACITY - rama.weight) // SKU_WEIGHT})")

    # Рама заполнена или это последний SKU
    if rama.is_full or rama_state['processed'] == rama_state['total']:
        rama_state['current'] = None
        print(f"  t={env.now:>4}  {rama} -> едет на осадку")
        yield ready_ramas.put(rama)


def osadka_dispatcher(env, ready_ramas, osadka, log, total_ramas):
    """Ждёт рамы из Store и отправляет их на станцию осадки."""
    for _ in range(total_ramas):
        rama = yield ready_ramas.get()
        print(f"  t={env.now:>4}  Осадка взяла {rama}")

        with osadka.request() as req:
            yield req
            log.append({'t': env.now, 'sku': str(rama), 'station': 'osadka', 'status': 'start', 'waited': 0})
            yield env.timeout(OSADKA_TIME)
            log.append({'t': env.now, 'sku': str(rama), 'station': 'osadka', 'status': 'done', 'waited': 0})
            print(f"  t={env.now:>4}  Осадка готова: {rama}")


def print_log(log):
    print(f"\n{'t':>5}  {'sku':<14} {'station':<16} {'status':<10} {'ожидание'}")
    print("-" * 62)
    for e in log:
        waited = f"ждал {e['waited']} мин" if e['waited'] > 0 else ''
        print(f"  {e['t']:>3}  {e['sku']:<14} {e['station'] or '---':<16} {e['status']:<10} {waited}")


def print_stats(log):
    print("\n--- Статистика по SKU ---")
    skus = {}
    for e in log:
        if e['status'] == 'start':
            skus.setdefault(e['sku'], {})['start_first'] = skus.get(e['sku'], {}).get('start_first', e['t'])
        if e['status'] in ('done', 'on_rama'):
            skus.setdefault(e['sku'], {})['last_t'] = e['t']

    for sku, times in skus.items():
        start = times.get('start_first', '?')
        end   = times.get('last_t', '?')
        total = end - start if isinstance(end, int) and isinstance(start, int) else '?'
        print(f"  {sku:<14} начало: t={start:<4} конец: t={end:<4} всего: {total} мин")

    print("\n--- Ожидание в очередях ---")
    waits = {}
    for e in log:
        if e['waited'] > 0:
            waits.setdefault(e['station'], []).append(e['waited'])
    for station, times in waits.items():
        print(f"  {station:<14} ожиданий: {len(times)}, сумма: {sum(times)} мин, макс: {max(times)} мин")


def run():
    env = simpy.Environment()
    log = []

    stations = {
        'kuter':  simpy.Resource(env, capacity=1),
        'shpric': simpy.Resource(env, capacity=1),
    }

    osadka      = simpy.Resource(env, capacity=100)
    ready_ramas = simpy.Store(env)

    sku_list = [
        ('var-1', 'varenka'),
        ('var-2', 'varenka'),
        ('var-3', 'varenka'),
        ('pk-1',  'polukopch'),
        ('pk-2',  'polukopch'),
        ('pk-3',  'polukopch'),
    ]

    total_ramas = math.ceil(len(sku_list) * SKU_WEIGHT / RAMA_CAPACITY)

    rama_state = {
        'current':   None,
        'processed': 0,
        'total':     len(sku_list),
    }

    print(f"\nЗапуск: {len(sku_list)} SKU -> {total_ramas} рамы\n")

    env.process(osadka_dispatcher(env, ready_ramas, osadka, log, total_ramas))

    for sku_id, recipe_name in sku_list:
        steps = RECIPES[recipe_name]
        env.process(sku_pipeline(env, sku_id, recipe_name, steps, stations, rama_state, ready_ramas, log))

    env.run()

    print_log(log)
    print_stats(log)
    print(f"\nОбщее время симуляции: {env.now} мин")


if __name__ == '__main__':
    run()
