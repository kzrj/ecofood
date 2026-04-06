import {
  STATIONS,
  SVG_W,
  SVG_H,
  MAIN_FLOW_Y,
  nodeX,
  nodeWidth,
  nodeHeight,
} from '../stationsConfig'
import StationNode from './StationNode'
import QueueNode from './QueueNode'

const QUEUE_ABOVE_GAP = 20

/** Основной поток — по центру MAIN_FLOW_Y; очередь «На вход» — над ним. */
function nodeY(station, index) {
  if (index === 0 && station.id === 'queue_kuter') {
    const h = nodeHeight(station)
    const kuterH = nodeHeight(STATIONS[1])
    return Math.round(MAIN_FLOW_Y - kuterH / 2 - QUEUE_ABOVE_GAP - h)
  }
  return Math.round(MAIN_FLOW_Y - nodeHeight(station) / 2)
}

function Arrow({ x1, x2 }) {
  return (
    <g>
      <line
        x1={x1} y1={MAIN_FLOW_Y}
        x2={x2 - 7} y2={MAIN_FLOW_Y}
        stroke="#94a3b8" strokeWidth={1.5}
      />
      <polygon
        points={`${x2},${MAIN_FLOW_Y} ${x2 - 8},${MAIN_FLOW_Y - 4} ${x2 - 8},${MAIN_FLOW_Y + 4}`}
        fill="#94a3b8"
      />
    </g>
  )
}

/** От нижнего центра очереди «На вход» вниз к линии потока и к левому краю кутера. */
function InletArrow({ queueStation }) {
  const x0 = nodeX(0)
  const wq = nodeWidth(queueStation)
  const y0 = nodeY(queueStation, 0)
  const hq = nodeHeight(queueStation)
  const xk = nodeX(1)
  const cx = x0 + wq / 2
  const yBottom = y0 + hq
  const d = `M ${cx} ${yBottom} L ${cx} ${MAIN_FLOW_Y} L ${xk - 7} ${MAIN_FLOW_Y}`
  return (
    <g>
      <path d={d} fill="none" stroke="#94a3b8" strokeWidth={1.5} />
      <polygon
        points={`${xk},${MAIN_FLOW_Y} ${xk - 8},${MAIN_FLOW_Y - 4} ${xk - 8},${MAIN_FLOW_Y + 4}`}
        fill="#94a3b8"
      />
    </g>
  )
}

export default function ScadaCanvas({ statuses = {}, stationItems = {} }) {
  return (
    <div className="overflow-x-auto">
      <svg width={SVG_W} height={SVG_H} style={{ minWidth: SVG_W }}>

        {/* Стрелки: вход — с «На вход» на кутер; остальные — по линии MAIN_FLOW_Y */}
        <InletArrow queueStation={STATIONS[0]} />
        {STATIONS.slice(1, -1).map((station, i) => {
          const idx = i + 1
          return (
            <Arrow
              key={station.id}
              x1={nodeX(idx) + nodeWidth(station)}
              x2={nodeX(idx + 1)}
            />
          )
        })}

        {/* Узлы */}
        {STATIONS.map((station, i) =>
          station.type === 'queue' ? (
            <QueueNode
              key={station.id}
              x={nodeX(i)}
              y={nodeY(station, i)}
              station={station}
              items={stationItems[station.id] ?? []}
            />
          ) : (
            <StationNode
              key={station.id}
              x={nodeX(i)}
              y={nodeY(station, i)}
              station={station}
              status={statuses[station.id] ?? 'idle'}
              items={stationItems[station.id] ?? []}
            />
          )
        )}
      </svg>
    </div>
  )
}
