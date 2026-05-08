/**
 * Время пребывания (мин) по станции — синхронно с v2/simulation/common/recipes.py и constants.py
 */
export const RECIPE_TIMES = {
  varenka: {
    kuter: 14,
    shpric: 8,
    klipsator: 8,
    osadka: 100,
    termokamera: 60,
    ohlazdenie: 30,
    upakovka: 50,
  },
  polukopch: {
    kuter: 10,
    shpric: 10,
    klipsator: 10,
    osadka: 240,
    termokamera: 110,
    ohlazdenie: 30,
    upakovka: 50,
  },
}

/** Переналадка станций (мин), синхронно с v2/simulation/common/constants.py */
export const RETOOL_TIMES = {
  kuter: 5,
  shpric: 5,
  klipsator: 5,
  termokamera: 5,
}

/** Станции без фиксированного времени в модели (очереди, склад) */
const NO_FIXED_TIME = new Set([
  'queue_kuter',
  'queue_osadka',
  'queue_termokamera',
  'queue_ohlazdenie',
  'sklad',
])

export function dwellMinutesForStation(stationId) {
  if (NO_FIXED_TIME.has(stationId)) return null
  const v = RECIPE_TIMES.varenka[stationId]
  const p = RECIPE_TIMES.polukopch[stationId]
  if (v == null && p == null) return null
  return { varenka: v ?? null, polukopch: p ?? null }
}
