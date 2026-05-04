import { create } from 'zustand'

import { computeState } from './domain/computeState'

const SIMULATION_RUN = '/api/v1/simulation/run'

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

  simulationLoading: false,
  simulationError: null,

  // -- дериват --
  statuses: {},       // { kuter: 'busy' | 'idle', ... }
  stationItems: {},   // { kuter: [{sku, weight}], ... }

  // ---------------------------------------------------------------
  applyLogPayload(data) {
    set({
      events: data.events,
      totalTime: data.total_time,
      skuList: data.sku_list ?? [],
      currentTime: 0,
      statuses: {},
      stationItems: {},
      playing: false,
    })
    get().seek(0)
  },

  async runSimulation() {
    set({ simulationLoading: true, simulationError: null })
    try {
      const res = await fetch(SIMULATION_RUN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (!res.ok) {
        const text = await res.text()
        let detail = text
        try {
          const j = JSON.parse(text)
          if (j?.detail) detail = typeof j.detail === 'string' ? j.detail : JSON.stringify(j.detail)
        } catch {
          /* keep text */
        }
        throw new Error(detail || `HTTP ${res.status}`)
      }
      const data = await res.json()
      get().applyLogPayload(data)
      set({ simulationLoading: false })
    } catch (e) {
      console.error('Симуляция не выполнена', e)
      set({
        simulationLoading: false,
        simulationError: e instanceof Error ? e.message : String(e),
      })
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
