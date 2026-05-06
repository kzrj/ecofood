import { STATIONS, nodeWidth, nodeHeight } from '../stationsConfig'
import { getNodePos, getStationRenderProps } from './scadaLayout'
import { useScadaLayoutMetrics } from './ScadaLayoutMetricsContext'

function Arrow({ x1, y1, x2, y2, viaX }) {
  const sameRow = Math.abs(y1 - y2) < 1
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
  const m = useScadaLayoutMetrics()
  return (
    <>
      {STATIONS.slice(0, -1).map((station, i) => {
        const next = STATIONS[i + 1]
        if (station.id === 'queue_kuter') return null
        if (next.id === 'sklad') return null
        const stFrom = getStationRenderProps(station, m)
        const stTo = getStationRenderProps(next, m)
        const from = getNodePos(station, i, m)
        const to = getNodePos(next, i + 1, m)
        const wf = nodeWidth(stFrom)
        const hf = nodeHeight(stFrom)
        const wt = nodeWidth(stTo)
        const ht = nodeHeight(stTo)
        const isQueueToTermo =
          station.id === 'queue_termokamera' && next.id === 'termokamera'

        let x1
        let y1
        let x2
        let y2
        let viaX

        if (station.id === 'queue_kuter') {
          x1 = from.x + wf / 2
          y1 = from.y + hf
          x2 = to.x
          y2 = to.y + ht / 2
          viaX = x1
        } else if (next.id === 'sklad') {
          x1 = from.x + wf / 2
          y1 = from.y + hf
          x2 = to.x + wt / 2
          y2 = to.y
          viaX = x1
        } else {
          x1 = from.x + wf
          y1 = from.y + hf / 2
          x2 = to.x
          y2 = to.y + ht / 2
          viaX = isQueueToTermo ? to.x - 26 : x1
        }

        return (
          <Arrow
            key={station.id}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            viaX={viaX}
          />
        )
      })}
    </>
  )
}
