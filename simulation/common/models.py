from dataclasses import dataclass

from .constants import RAMA_CAPACITY


@dataclass
class Sku:
    id: str
    recipe_name: str
    weight: float
    times: dict  # prep station -> duration (масштабировано по весу)


class Rama:
    _counter = 0

    def __init__(self, recipe_name, times):
        Rama._counter += 1
        self.id = Rama._counter
        self.recipe_name = recipe_name
        self.times = times  # post-prep stage -> duration
        self.items = []
        self.sku_chunks = []
        self.weight = 0

    def add(self, sku_id, weight):
        self.items.append(sku_id)
        self.sku_chunks.append({"sku": sku_id, "weight": weight})
        self.weight += weight

    @property
    def is_full(self):
        return self.weight >= RAMA_CAPACITY

    def __repr__(self):
        return f"Rama#{self.id}"


def calculate_total_ramas(sku_list):
    """Считает количество рам с учётом дробления SKU на границе 150 кг."""
    per_type = {}
    for sku in sku_list:
        per_type.setdefault(sku.recipe_name, []).append(sku.weight)

    total = 0
    for weights_list in per_type.values():
        current = 0
        for w in weights_list:
            remaining = w
            while remaining > 0:
                space = RAMA_CAPACITY - current
                chunk = min(remaining, space)
                current += chunk
                remaining -= chunk
                if current >= RAMA_CAPACITY:
                    total += 1
                    current = 0
        if current > 0:
            total += 1
    return total
