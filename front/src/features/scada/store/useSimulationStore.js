import { create } from 'zustand'
import { computeState } from './domain/computeState'

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
