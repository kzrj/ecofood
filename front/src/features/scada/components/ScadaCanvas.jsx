import {
  STATIONS,
  SVG_H,
  MAIN_FLOW_Y,
  GAP,
  PAD,
  nodeX,
  nodeWidth,
  nodeHeight,
} from '../stationsConfig'
import StationNode from './StationNode'
import QueueNode from './QueueNode'
import DwellTimeLabel from './DwellTimeLabel'

const SCADA_SCALE = 1.3
/** Место над узлом под две строки «вар / п/к … мин» */
const DWELL_LABEL_H = 28
const LOWER_FROM_INDEX = 7 // termokamera и все станции после нее
const LOWER_ANCHOR_INDEX = 1 // старт нижнего ряда под кутером
const SECOND_FLOW_Y = MAIN_FLOW_Y + 340

function flowYByIndex(index) {
  return index >= LOWER_FROM_INDEX ? SECOND_FLOW_Y : MAIN_FLOW_Y
}

function lowerRowX(index) {
  let x = nodeX(LOWER_ANCHOR_INDEX)
  for (let i = LOWER_FROM_INDEX; i < index; i += 1) {
    x += nodeWidth(STATIONS[i]) + GAP
  }
  return x
}

function nodePos(station, index) {
  const x = index >= LOWER_FROM_INDEX ? lowerRowX(index) : nodeX(index)
  const y = Math.round(flowYByIndex(index) - nodeHeight(station) / 2)
  return { x, y }
}

function Arrow({ x1, y1, x2, y2, viaX }) {
  const sameRow = y1 === y2
  const endX = x2 - 7
  const bendX = viaX ?? x1
  return (
    <g>
      {sameRow ? (
        <line x1={x1} y1={y1} x2={endX} y2={y2} stroke="#94a3b8" strokeWidth={1.5} />
      ) : (
        <path d={`M ${x1} ${y1} L ${bendX} ${y1} L ${bendX} ${y2} L ${endX} ${y2}`} fill="none" stroke="#94a3b8" strokeWidth={1.5} />
      )}
      <polygon
        points={`${x2},${y2} ${x2 - 8},${y2 - 4} ${x2 - 8},${y2 + 4}`}
        fill="#94a3b8"
      />
    </g>
  )
}

export default function ScadaCanvas({ statuses = {}, stationItems = {} }) {
  const logicalW = STATIONS.reduce((max, station, i) => {
    const p = nodePos(station, i)
    return Math.max(max, p.x + nodeWidth(station))
  }, 0) + PAD
  const logicalH = Math.max(
    SVG_H,
    STATIONS.reduce((max, station, i) => {
      const p = nodePos(station, i)
      return Math.max(max, p.y + nodeHeight(station))
    }, 0) + PAD,
  )
  const renderW = Math.round(logicalW * SCADA_SCALE)
  const renderH = Math.round(logicalH * SCADA_SCALE)

  return (
    <div className="overflow-auto">
      <svg width={renderW} height={renderH} style={{ minWidth: renderW }}>
        <g transform={`scale(${SCADA_SCALE})`}>

        {STATIONS.slice(0, -1).map((station, i) => {
          const from = nodePos(station, i)
          const to = nodePos(STATIONS[i + 1], i + 1)
          const isQueueToTermo = station.id === 'queue_termokamera' && STATIONS[i + 1].id === 'termokamera'
          return (
            <Arrow
              key={station.id}
              x1={from.x + nodeWidth(station)}
              y1={flowYByIndex(i)}
              x2={to.x}
              y2={flowYByIndex(i + 1)}
              viaX={isQueueToTermo ? to.x - 26 : undefined}
            />
          )
        })}

        {STATIONS.map((station, i) => {
          const p = nodePos(station, i)
          const nx = p.x
          const ny = p.y
          const nw = nodeWidth(station)
          return (
            <g key={`dwell-${station.id}`}>
              <DwellTimeLabel
                stationId={station.id}
                cx={nx + nw / 2}
                yTop={ny - DWELL_LABEL_H}
                ramaCapacityKg={station.ramaCapacityKg}
              />
            </g>
          )
        })}

        {STATIONS.map((station, i) =>
          station.type === 'queue' ? (
            <QueueNode
              key={station.id}
              x={nodePos(station, i).x}
              y={nodePos(station, i).y}
              station={station}
              items={stationItems[station.id] ?? []}
            />
          ) : (
            <StationNode
              key={station.id}
              x={nodePos(station, i).x}
              y={nodePos(station, i).y}
              station={station}
              status={statuses[station.id] ?? 'idle'}
              items={stationItems[station.id] ?? []}
            />
          )
        )}
        </g>
      </svg>
    </div>
  )
}
