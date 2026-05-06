import { createContext, useContext } from 'react'

import { getDefaultLayoutMetrics } from './scadaLayout'

/** Метрики сцены (позиции узлов, высоты «На вход» / «Склад» при развороте). */
export const ScadaLayoutMetricsContext = createContext(getDefaultLayoutMetrics())

export function useScadaLayoutMetrics() {
  return useContext(ScadaLayoutMetricsContext)
}
