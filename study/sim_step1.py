"""
Шаг 1. Минимальная симуляция.
Один тип продукта (варёнка), две станции: кутер и шприц.
Несколько SKU запускаются одновременно и толкаются в очереди.

Цель: почувствовать как работают Resource и Process в SimPy.
"""

import simpy


# --- Данные рецепта (минуты) ---
RECIPE = {
    'name': 'Варёнка',
    'kuter_time': 14,
    'shpric_time': 8,
}


def sku_pipeline(env, sku_id, kuter, shpric):
    """Один SKU проходит через кутер и шприц."""

    print(f"  t={env.now:>4}  SKU-{sku_id}  | очередь кутера")

    with kuter.request() as req:
        yield req
        print(f"  t={env.now:>4}  SKU-{sku_id}  | кутер начал")
        yield env.timeout(RECIPE['kuter_time'])
        print(f"  t={env.now:>4}  SKU-{sku_id}  | кутер готов")

    with shpric.request() as req:
        yield req
        print(f"  t={env.now:>4}  SKU-{sku_id}  | шприц начал")
        yield env.timeout(RECIPE['shpric_time'])
        print(f"  t={env.now:>4}  SKU-{sku_id}  | шприц готов")


def run(sku_count=5):
    env = simpy.Environment()

    kuter  = simpy.Resource(env, capacity=1)
    shpric = simpy.Resource(env, capacity=1)

    print(f"\nЗапуск симуляции: {sku_count} SKU «{RECIPE['name']}»")
    print(f"Кутер: {RECIPE['kuter_time']} мин | Шприц: {RECIPE['shpric_time']} мин\n")

    for i in range(1, sku_count + 1):
        env.process(sku_pipeline(env, i, kuter, shpric))

    env.run()

    print(f"\nВсё готово. Общее время: {env.now} мин")


if __name__ == '__main__':
    run(sku_count=5)
