import { useEffect, useMemo, useState } from 'react'

import { STATIONS } from '../stationsConfig'
import StationNode from './StationNode'
import QueueNode from './QueueNode'
import ArrowsLayer from './ArrowsLayer'
import { ScadaLayoutMetricsContext } from './ScadaLayoutMetricsContext'
import {
  SCADA_SCALE,
  createLayoutMetrics,
  getNodePos,
  getSceneSize,
  getStationRenderProps,
} from './scadaLayout'
import { RETOOL_TIMES } from '../recipeTiming'

const RETOOL_LABEL_IDS = new Set(['kuter', 'shpric', 'klipsator', 'termokamera'])

export default function ScadaCanvas({ statuses = {}, stationItems = {}, recipeBook = {} }) {
  const [queueExpanded, setQueueExpanded] = useState(false)
  const [skladExpanded, setSkladExpanded] = useState(false)

  const queueItems = stationItems.queue_kuter ?? []
  const queueIsSku = queueItems.some((i) => i.recipe)
  const queueSkuCount = queueIsSku ? queueItems.length : 0

  const skladSkuItems = (stationItems.sklad ?? []).filter((it) => it.kind !== 'total')
  const skladSkuCount = skladSkuItems.length

  const layoutM = useMemo(
    () =>
      createLayoutMetrics({
        queueExpanded,
        skladExpanded,
        queueSkuCount,
        skladSkuCount,
      }),
    [queueExpanded, skladExpanded, queueSkuCount, skladSkuCount]
  )

  useEffect(() => {
    if (queueSkuCount === 0 && queueExpanded) setQueueExpanded(false)
  }, [queueSkuCount, queueExpanded])

  useEffect(() => {
    if (skladSkuCount === 0 && skladExpanded) setSkladExpanded(false)
  }, [skladSkuCount, skladExpanded])

  const { renderW, renderH } = getSceneSize(layoutM)

  return (
    <ScadaLayoutMetricsContext.Provider value={layoutM}>
      <div className="overflow-auto">
        <svg width={renderW} height={renderH} style={{ minWidth: renderW }}>
          <g transform={`scale(${SCADA_SCALE})}`}>
            <ArrowsLayer />

            {/* Подписи переналадки над ключевыми станциями */}
            {STATIONS.map((station, i) => {
              if (!RETOOL_LABEL_IDS.has(station.id)) return null
              const retoolMin = RETOOL_TIMES[station.id]
              if (station.id !== 'termokamera' && retoolMin == null) return null
              const stationForRender = getStationRenderProps(station, layoutM)
              const p = getNodePos(station, i, layoutM)
              const cx = p.x + stationForRender.width / 2
              const label =
                station.id === 'termokamera'
                  ? 'Переналадка секции'
                  : `Переналадка ${retoolMin} мин`
              return (
                <text
                  key={`retool-${station.id}`}
                  x={cx}
                  y={p.y - 14}
                  textAnchor="middle"
                  fontSize={11}
                  fontWeight="700"
                  fill="#b45309"
                >
                  {label}
                </text>
              )
            })}

            {STATIONS.map((station, i) => {
              const stationForRender = getStationRenderProps(station, layoutM)
              return station.type === 'queue' ? (
                <QueueNode
                  key={station.id}
                  x={getNodePos(station, i, layoutM).x}
                  y={getNodePos(station, i, layoutM).y}
                  station={stationForRender}
                  items={stationItems[station.id] ?? []}
                  expanded={station.id === 'queue_kuter' ? queueExpanded : false}
                  onToggleExpand={
                    station.id === 'queue_kuter' && queueIsSku
                      ? () => setQueueExpanded((v) => !v)
                      : undefined
                  }
                />
              ) : (
                <StationNode
                  key={station.id}
                  x={getNodePos(station, i, layoutM).x}
                  y={getNodePos(station, i, layoutM).y}
                  station={stationForRender}
                  status={statuses[station.id] ?? 'idle'}
                  items={stationItems[station.id] ?? []}
                  recipeBook={recipeBook}
                  skladGridExpanded={station.id === 'sklad' ? skladExpanded : false}
                  onSkladGridToggle={
                    station.id === 'sklad' ? () => setSkladExpanded((v) => !v) : undefined
                  }
                />
              )
            })}
          </g>
        </svg>
      </div>
    </ScadaLayoutMetricsContext.Provider>
  )
}
