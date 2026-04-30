import { STATIONS, nodeWidth } from '../stationsConfig'
import StationNode from './StationNode'
import QueueNode from './QueueNode'
import DwellTimeLabel from './DwellTimeLabel'
import ArrowsLayer from './ArrowsLayer'
import {
  SCADA_SCALE,
  DWELL_LABEL_H,
  getNodePos,
  getSceneSize,
} from './scadaLayout'

export default function ScadaCanvas({ statuses = {}, stationItems = {} }) {
  const { renderW, renderH } = getSceneSize()

  return (
    <div className="overflow-auto">
      <svg width={renderW} height={renderH} style={{ minWidth: renderW }}>
        <g transform={`scale(${SCADA_SCALE})`}>
          <ArrowsLayer />

        {STATIONS.map((station, i) => {
          const p = getNodePos(station, i)
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
              x={getNodePos(station, i).x}
              y={getNodePos(station, i).y}
              station={station}
              items={stationItems[station.id] ?? []}
            />
          ) : (
            <StationNode
              key={station.id}
              x={getNodePos(station, i).x}
              y={getNodePos(station, i).y}
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
