import { STATIONS, nodeWidth } from '../stationsConfig'
import { getFlowY, getNodePos } from './scadaLayout'

function Arrow({ x1, y1, x2, y2, viaX }) {
  const sameRow = y1 === y2
  const endX = x2 - 7
  const bendX = viaX ?? x1
  return (
    <g>
      {sameRow ? (
        <line x1={x1} y1={y1} x2={endX} y2={y2} stroke="#94a3b8" strokeWidth={1.5} />
      ) : (
        <path
          d={`M ${x1} ${y1} L ${bendX} ${y1} L ${bendX} ${y2} L ${endX} ${y2}`}
          fill="none"
          stroke="#94a3b8"
          strokeWidth={1.5}
        />
      )}
      <polygon points={`${x2},${y2} ${x2 - 8},${y2 - 4} ${x2 - 8},${y2 + 4}`} fill="#94a3b8" />
    </g>
  )
}

export default function ArrowsLayer() {
  return (
    <>
      {STATIONS.slice(0, -1).map((station, i) => {
        const from = getNodePos(station, i)
        const to = getNodePos(STATIONS[i + 1], i + 1)
        const isQueueToTermo =
          station.id === 'queue_termokamera' && STATIONS[i + 1].id === 'termokamera'
        return (
          <Arrow
            key={station.id}
            x1={from.x + nodeWidth(station)}
            y1={getFlowY(i)}
            x2={to.x}
            y2={getFlowY(i + 1)}
            viaX={isQueueToTermo ? to.x - 26 : undefined}
          />
        )
      })}
    </>
  )
}

