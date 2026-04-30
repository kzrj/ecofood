import { create } from 'zustand'

// ---------------------------------------------------------------
// Вычисляем состояние всех станций на момент времени t
// ---------------------------------------------------------------
// Возвращает:
//   statuses     — { stationId: 'busy' | 'idle' | 'retool' }
//   stationItems — { stationId: [{sku, weight}] }  — что сейчас внутри
//   skadLevel    — накопленный вес на складе (кг)
// Связь: когда станция получает Start → она "вытаскивает" раму из своей входящей очереди
const UPSTREAM_QUEUE = {
  kuter:       'queue_kuter',
  osadka:      'queue_osadka',
  termokamera: 'queue_termokamera',
}

const TERMO_RETOOL_SKU_PREFIX = 'sec#'

// initialSkus = [{id, recipe, weight}] — список SKU из лога
function computeState(events, currentTime, initialSkus = []) {
  // inProgress[station] = Map<sku, {weight, recipe?, section?, phase?}>
  const inProgress = {}
  let skadLevel = 0
  /** накопленный вес на складе по каждому SKU (порции: 150 + 150 + …) */
  const skladBySku = new Map()
  const skuRecipeMap = new Map(initialSkus.map(({ id, recipe }) => [id, recipe]))
  const plannedTotal = initialSkus.reduce((s, x) => s + (x.weight ?? 0), 0)

  // Заполняем начальную очередь кутера всеми SKU
  if (initialSkus.length > 0) {
    const qk = new Map()
    for (const { id, recipe, weight } of initialSkus) {
      qk.set(id, { weight, recipe })
    }
    inProgress['queue_kuter'] = qk
  }

  for (const event of events) {
    if (event.t > currentTime) break   // события отсортированы по t

    const { station, sku, status, weight, recipe: evRecipe } = event
    if (!station) continue

    const evSection = event.section ?? null

    const mergeRecipe = (prev, w) => ({
      weight: w ?? prev?.weight ?? 0,
      recipe: evRecipe ?? prev?.recipe ?? skuRecipeMap.get(sku),
      section: evSection ?? prev?.section,
      phase: prev?.phase ?? null,
    })

    if (status === 'on_rama') {
      const frameId = station.replace('rama#', 'Rama#')
      if (!inProgress['queue_osadka']) inProgress['queue_osadka'] = new Map()
      inProgress['queue_osadka'].set(frameId, mergeRecipe(null, weight))

    } else if (status === 'entered') {
      if (station === 'queue_termokamera') {
        if (!inProgress[station]) inProgress[station] = new Map()
        const prev = inProgress[station].get(sku)
        inProgress[station].set(sku, mergeRecipe(prev, weight))
      }

    } else if (status === 'retool_start') {
      if (!inProgress[station]) inProgress[station] = new Map()
      const prev = inProgress[station].get(sku)
      inProgress[station].set(sku, { ...mergeRecipe(prev, weight), phase: 'retool' })

      // SKU уже захватил ресурс станции → уходит из входящей очереди
      const q = UPSTREAM_QUEUE[station]
      if (q) inProgress[q]?.delete(sku)

    } else if (status === 'retool_done') {
      // Термо: переналадка относится к секции, а не к SKU → убираем плейсхолдер.
      if (station === 'termokamera' && String(sku).startsWith(TERMO_RETOOL_SKU_PREFIX)) {
        inProgress[station]?.delete(sku)
      } else {
        // Prep: не удаляем item — сразу после этого обычно идёт 'start' (на том же t).
        // Если вдруг между done и start есть зазор — считаем, что станция занята.
        if (!inProgress[station]) inProgress[station] = new Map()
        const prev = inProgress[station].get(sku)
        if (prev) inProgress[station].set(sku, { ...prev, phase: prev.phase === 'retool' ? 'ready' : prev.phase })
      }

    } else if (status === 'start') {
      if (!inProgress[station]) inProgress[station] = new Map()
      const prev = inProgress[station].get(sku)
      inProgress[station].set(sku, { ...mergeRecipe(prev, weight), phase: 'process' })

      const q = UPSTREAM_QUEUE[station]
      if (q) inProgress[q]?.delete(sku)

    } else if (status === 'done') {
      inProgress[station]?.delete(sku)

    } else if (status === 'stored' && station === 'sklad') {
      const w = weight ?? 0
      skadLevel += w
      skladBySku.set(sku, (skladBySku.get(sku) ?? 0) + w)
    }
  }

  const statuses = {}
  const stationItems = {}

  for (const [station, map] of Object.entries(inProgress)) {
    const items = Array.from(map.entries()).map(([sku, data]) => ({
      sku,
      weight: data?.weight ?? data ?? 0,
      recipe: data?.recipe,
      section: data?.section,
      phase: data?.phase ?? null,
    }))
    stationItems[station] = items
    statuses[station] = items.some((it) => it.phase === 'retool') ? 'retool' : items.length > 0 ? 'busy' : 'idle'
  }

  // Склад: общий уровень + ячейки по SKU (частичные приходы суммируются)
  if (initialSkus.length > 0) {
    const skuRows = initialSkus.map(({ id, recipe, weight: planned }) => ({
      sku: id,
      recipe,
      weight: skladBySku.get(id) ?? 0,
      planned,
    }))
    stationItems['sklad'] = [
      { kind: 'total', weight: skadLevel, plannedTotal: plannedTotal || undefined },
      ...skuRows,
    ]
    statuses['sklad'] = skadLevel > 0 ? 'busy' : 'idle'
  } else if (skadLevel > 0) {
    stationItems['sklad'] = [{ kind: 'total', weight: skadLevel }]
    statuses['sklad'] = 'busy'
  }

  return { statuses, stationItems }
}

// ---------------------------------------------------------------
// Стор
// ---------------------------------------------------------------
let _intervalId = null   // живёт вне стора, чтобы не было проблем с сериализацией

export const useSimulationStore = create((set, get) => ({
  // -- данные симуляции --
  events: [],
  totalTime: 0,
  skuList: [],   // [{id, recipe, weight}] — исходный список SKU

  // -- плеер --
  currentTime: 0,
  playing: false,
  speed: 10,          // во сколько раз быстрее реального времени

  // -- дериват --
  statuses: {},       // { kuter: 'busy' | 'idle', ... }
  stationItems: {},   // { kuter: [{sku, weight}], ... }

  // ---------------------------------------------------------------
  async loadLog() {
    try {
      const res = await fetch('/simulation_log.json')
      const data = await res.json()
      set({
        events:   data.events,
        totalTime: data.total_time,
        skuList:  data.sku_list ?? [],
        currentTime: 0,
        statuses: {},
        stationItems: {},
        playing: false,
      })
    } catch (e) {
      console.error('Не удалось загрузить simulation_log.json', e)
    }
  },

  // ---------------------------------------------------------------
  seek(t) {
    const { events, totalTime, skuList } = get()
    const clamped = Math.min(Math.max(t, 0), totalTime)
    const { statuses, stationItems } = computeState(events, clamped, skuList)
    set({ currentTime: clamped, statuses, stationItems })
  },

  setSpeed(speed) { set({ speed }) },

  // ---------------------------------------------------------------
  play() {
    if (get().playing) return
    if (get().currentTime >= get().totalTime) get().seek(0)   // перемотка в начало

    set({ playing: true })

    // Каждые 100мс продвигаем время на speed*0.1 мин симуляции
    _intervalId = setInterval(() => {
      const { currentTime, totalTime, speed } = get()
      const next = currentTime + speed * 0.1

      if (next >= totalTime) {
        get().seek(totalTime)
        get().pause()
        return
      }
      get().seek(next)
    }, 100)
  },

  pause() {
    if (_intervalId) {
      clearInterval(_intervalId)
      _intervalId = null
    }
    set({ playing: false })
  },

  reset() {
    if (_intervalId) {
      clearInterval(_intervalId)
      _intervalId = null
    }
    set({ playing: false })
    get().seek(0)
  },
}))
