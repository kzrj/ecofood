"""
Шаг 2. Универсальный пайплайн + два типа продукта.
Рецепт — просто данные (список шагов).
Один пайплайн обслуживает любой тип продукта.
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
        ('shpric', 12),   # кутер не нужен
    ],
}


def sku_pipeline(env, sku_id, recipe_name, steps, stations):
    for station_name, duration in steps:
        station = stations[station_name]
        print(f"  t={env.now:>4}  {sku_id:<18} | {station_name} ожидает")
        with station.request() as req:
            yield req
            print(f"  t={env.now:>4}  {sku_id:<18} | {station_name} начал")
            yield env.timeout(duration)
            print(f"  t={env.now:>4}  {sku_id:<18} | {station_name} готов")

    print(f"  t={env.now:>4}  {sku_id:<18} | ГОТОВО")


def run():
    env = simpy.Environment()

    stations = {
        'kuter':  simpy.Resource(env, capacity=1),
        'shpric': simpy.Resource(env, capacity=1),
    }

    # Список SKU которые нужно запустить сегодня
    sku_list = [
        ('var-1',  'varenka'),
        ('var-2',  'varenka'),
        ('var-3',  'varenka'),
        ('pk-1',   'polukopch'),
        ('pk-2',   'polukopch'),
        ('syr-1',  'syrokopchenaya'),
    ]

    print(f"\nЗапуск: {len(sku_list)} SKU\n")

    for sku_id, recipe_name in sku_list:
        steps = RECIPES[recipe_name]
        env.process(sku_pipeline(env, sku_id, recipe_name, steps, stations))

    env.run()

    print(f"\nВсе готово. Общее время: {env.now} мин")


if __name__ == '__main__':
    run()
