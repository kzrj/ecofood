/**
 * Простейшая “схема” входящих очередей.
 *
 * Когда станция получает событие start/retool_start — мы считаем, что она
 * “вытаскивает” элемент из своей входящей очереди, поэтому удаляем его из queue.
 *
 * В будущем (ветки/разные линии) это лучше заменить на конфиг графа/маршрутов.
 */
const UPSTREAM_QUEUE = {
  kuter: 'queue_kuter',
  osadka: 'queue_osadka',
  termokamera: 'queue_termokamera',
  ohlazdenie: 'queue_ohlazdenie',
}

/**
 * Термокамера: переналадка логируется как отдельный “SKU”-плейсхолдер на секцию.
 * Мы отличаем его по префиксу и по завершении удаляем.
 */
const TERMO_RETOOL_SKU_PREFIX = 'sec#'

/**
 * Контекст, который нужен при проигрывании событий.
 * initialSkus приходит из simulation_log.json → sku_list.
 */
function createCtx(initialSkus) {
  return {
    skuRecipeMap: new Map(initialSkus.map(({ id, recipe }) => [id, recipe])),
    skuMetaMap: new Map(
      initialSkus.map((row) => [
        row.id,
        {
          name: row.name ?? '',
          sku_type: row.sku_type ?? '',
          batch_no: row.batch_no ?? null,
        },
      ])
    ),
    plannedTotal: initialSkus.reduce((s, x) => s + (x.weight ?? 0), 0),
  }
}

/**
 * Базовое состояние симуляции “на момент проигрывания”.
 *
 * Здесь мы сознательно не формируем UI-структуры.
 * Это “внутреннее” состояние, из которого потом сделаем view-model.
 */
function createBaseState(initialSkus, ctx) {
  const inProgress = {}
  let skadLevel = 0
  const skladBySku = new Map()

  // В начале вся партия SKU лежит во входной очереди кутера
  if (initialSkus.length > 0) {
    const qk = new Map()
    for (const row of initialSkus) {
      const meta = ctx.skuMetaMap.get(row.id) ?? {}
      qk.set(row.id, {
        weight: row.weight,
        recipe: row.recipe,
        name: meta.name || row.name || '',
        sku_type: meta.sku_type || row.sku_type || '',
        batch_no: meta.batch_no ?? row.batch_no ?? null,
      })
    }
    inProgress.queue_kuter = qk
  }

  return { inProgress, skadLevel, skladBySku, ...ctx }
}

/**
 * “Слить” данные по элементу станции из нескольких событий.
 *
 * У нас одно и то же sku может встречаться в разных событиях:
 * - start может прийти без recipe → берем из прошлого или из skuRecipeMap
 * - weight может обновляться/не быть в event → сохраняем последнее известное
 * - section — для термокамеры (чтобы группировать 2 рамы в одну секцию)
 *
 * Важно: prev — это внутренний объект state.inProgress[station].get(sku)
 */
function mergeItem(prev, event, state) {
  const { sku, weight, recipe: evRecipe, section } = event
  const meta = state.skuMetaMap?.get(sku)
  const name = (prev?.name || meta?.name || '').trim()
  const sku_type = (prev?.sku_type || meta?.sku_type || '').trim()
  const batch_no = prev?.batch_no ?? meta?.batch_no ?? null
  return {
    weight: weight ?? prev?.weight ?? 0,
    recipe: evRecipe ?? prev?.recipe ?? state.skuRecipeMap.get(sku),
    section: section ?? prev?.section ?? null,
    phase: prev?.phase ?? null,
    name,
    sku_type,
    batch_no,
  }
}

/**
 * Гарантирует наличие Map для станции и возвращает её.
 * Внутри мы храним Map, чтобы:
 * - быстро добавлять/удалять по sku
 * - сохранять порядок вставки (который потом виден в UI)
 */
function ensureStationMap(state, station) {
  if (!state.inProgress[station]) state.inProgress[station] = new Map()
  return state.inProgress[station]
}

/**
 * Таблица обработчиков событий (движок редьюсеров).
 *
 * Каждый handler принимает:
 * - state: внутреннее состояние проигрывания
 * - event: текущая запись из лога
 *
 * Здесь мы не занимаемся рендером/форматом для UI — только изменяем state.
 */
const handlers = {
  /**
   * SKU вешается на раму. В логах это событие приходит со station = "rama#N".
   * Мы показываем это как элемент в очереди "К осадке".
   */
  on_rama(state, event) {
    const frameId = event.station.replace('rama#', 'Rama#')
    const map = ensureStationMap(state, 'queue_osadka')
    map.set(frameId, mergeItem(null, event, state))
  },

  /**
   * Элемент вошёл в очередь.
   * Сейчас журнал симуляции явно логирует вход в post-prep очереди
   * (queue_termokamera, queue_ohlazdenie и т.д.), поэтому принимаем
   * любые queue_* события.
   */
  entered(state, event) {
    if (!String(event.station).startsWith('queue_')) return
    const map = ensureStationMap(state, event.station)
    map.set(event.sku, mergeItem(map.get(event.sku), event, state))
  },

  /**
   * Переналадка (retool) перед работой станции.
   * Мы помечаем элемент phase='retool' и считаем, что он уже занял ресурс
   * → удаляем из входящей очереди.
   */
  retool_start(state, event) {
    const map = ensureStationMap(state, event.station)
    map.set(event.sku, { ...mergeItem(map.get(event.sku), event, state), phase: 'retool' })
    const q = UPSTREAM_QUEUE[event.station]
    if (q) state.inProgress[q]?.delete(event.sku)
  },

  /**
   * Переналадка завершилась.
   * Для prep-станций мы не удаляем элемент, потому что часто сразу же идёт start
   * на том же timestamp.
   */
  retool_done(state, event) {
    if (event.station === 'termokamera' && String(event.sku).startsWith(TERMO_RETOOL_SKU_PREFIX)) {
      state.inProgress[event.station]?.delete(event.sku)
      return
    }
    const map = ensureStationMap(state, event.station)
    const prev = map.get(event.sku)
    if (prev) map.set(event.sku, { ...prev, phase: prev.phase === 'retool' ? 'ready' : prev.phase })
  },

  /**
   * Старт обработки на станции.
   * Ставим phase='process' и удаляем элемент из входящей очереди.
   */
  start(state, event) {
    const map = ensureStationMap(state, event.station)
    map.set(event.sku, { ...mergeItem(map.get(event.sku), event, state), phase: 'process' })
    const q = UPSTREAM_QUEUE[event.station]
    if (q) state.inProgress[q]?.delete(event.sku)
  },

  /** Обработка закончилась — элемент покинул станцию. */
  done(state, event) {
    state.inProgress[event.station]?.delete(event.sku)
  },

  /**
   * Приход на склад. Мы агрегируем:
   * - общий уровень
   * - по каждому SKU отдельно (частичные приходы суммируются)
   */
  stored(state, event) {
    if (event.station !== 'sklad') return
    const w = event.weight ?? 0
    state.skadLevel += w
    state.skladBySku.set(event.sku, (state.skladBySku.get(event.sku) ?? 0) + w)
  },
}

/**
 * Превращаем внутреннее state в удобный формат для UI.
 *
 * UI контракт:
 * - statuses: idle|busy|retool по каждой станции
 * - stationItems: массив items по каждой станции (sku/recipe/weight/section/phase)
 */
function deriveViewModel(state, initialSkus) {
  const statuses = {}
  const stationItems = {}

  for (const [station, map] of Object.entries(state.inProgress)) {
    const items = Array.from(map.entries()).map(([sku, data]) => ({
      sku,
      weight: data?.weight ?? data ?? 0,
      recipe: data?.recipe,
      section: data?.section,
      phase: data?.phase ?? null,
      name: (data?.name || state.skuMetaMap?.get(sku)?.name || '').trim(),
      sku_type: (data?.sku_type || state.skuMetaMap?.get(sku)?.sku_type || '').trim(),
      batch_no: data?.batch_no ?? state.skuMetaMap?.get(sku)?.batch_no ?? null,
    }))
    stationItems[station] = items
    statuses[station] = items.some((it) => it.phase === 'retool') ? 'retool' : items.length > 0 ? 'busy' : 'idle'
  }

  // Склад рисуем даже когда он “пустой”, чтобы показывать план/факт по SKU
  if (initialSkus.length > 0) {
    const skuRows = initialSkus.map((row) => {
      const meta = state.skuMetaMap?.get(row.id) ?? {}
      return {
        sku: row.id,
        recipe: row.recipe,
        weight: state.skladBySku.get(row.id) ?? 0,
        planned: row.weight,
        name: (meta.name || row.name || '').trim(),
        sku_type: (meta.sku_type || row.sku_type || '').trim(),
        batch_no: meta.batch_no ?? row.batch_no ?? null,
      }
    })
    stationItems.sklad = [{ kind: 'total', weight: state.skadLevel, plannedTotal: state.plannedTotal || undefined }, ...skuRows]
    statuses.sklad = state.skadLevel > 0 ? 'busy' : 'idle'
  } else if (state.skadLevel > 0) {
    stationItems.sklad = [{ kind: 'total', weight: state.skadLevel }]
    statuses.sklad = 'busy'
  }

  return { statuses, stationItems }
}

/**
 * Главная функция: проиграть events до времени currentTime и вернуть snapshot для UI.
 *
 * Требование к events: отсортированы по `t` по возрастанию.
 * Мы просто идём с начала и останавливаемся на первом event.t > currentTime.
 */
export function computeState(events, currentTime, initialSkus = []) {
  const ctx = createCtx(initialSkus)
  const state = createBaseState(initialSkus, ctx)

  for (const event of events) {
    if (event.t > currentTime) break
    if (!event.station) continue
    const handler = handlers[event.status]
    if (handler) handler(state, event)
  }

  return deriveViewModel(state, initialSkus)
}

