/**
 * Преобразует данные потребности (DemandDetailDTO.groups) в список SKU для симуляции.
 *
 * Маппинг типов:
 *   "вареные"             → varenka
 *   "варено-копченые" / "варено-копченные" → polukopch
 *
 * Каждая строка товара → N замесов по 150 кг + M замесов по 100 кг.
 * ID SKU: "{наименование}-{N}-{рецепт}", пробелы заменяются на _.
 */

const TYPE_MAP = {
  varenka: ['вареные'],
  polukopch: ['варено-копченые', 'варено-копченные'],
}

/** Определяет рецепт по названию группы (нижний регистр, без пробелов по краям). */
function detectRecipe(groupName) {
  const lower = (groupName ?? '').trim().toLowerCase()
  for (const [recipe, prefixes] of Object.entries(TYPE_MAP)) {
    if (prefixes.some((p) => lower.startsWith(p))) return recipe
  }
  return null
}

/** Нормализует наименование для ID SKU: убирает лишние символы, пробелы → _ */
function slugify(name) {
  return (name ?? 'sku')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Zа-яА-ЯёЁ0-9_-]/g, '')
    .slice(0, 30)
}

/**
 * @param {Record<string, Array<{наименование: string, 'замесов 150': number, 'замесов 100': number}>>} groups
 * @returns {Array<{id: string, recipe: string, weight: number}>}
 */
export function demandToSkuList(groups) {
  const result = []

  for (const [groupName, rows] of Object.entries(groups ?? {})) {
    const recipe = detectRecipe(groupName)
    if (!recipe) continue

    for (const row of rows) {
      const name = slugify(row['наименование'] ?? 'sku')
      const b150 = Math.max(0, Math.round(row['замесов 150'] ?? 0))
      const b100 = Math.max(0, Math.round(row['замесов 100'] ?? 0))

      for (let i = 1; i <= b150; i++) {
        result.push({ id: `${name}-${i}-${recipe}`, recipe, weight: 150 })
      }
      for (let i = 1; i <= b100; i++) {
        result.push({ id: `${name}-${b150 + i}-${recipe}`, recipe, weight: 100 })
      }
    }
  }

  return result
}
