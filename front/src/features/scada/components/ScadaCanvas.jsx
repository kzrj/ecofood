import { STATIONS } from '../stationsConfig'
import StationNode from './StationNode'
import QueueNode from './QueueNode'
import ArrowsLayer from './ArrowsLayer'
import {
  SCADA_SCALE,
  getNodePos,
  getSceneSize,
} from './scadaLayout'

export default function ScadaCanvas({ statuses = {}, stationItems = {}, recipeBook = {} }) {
  const { renderW, renderH } = getSceneSize()

  return (
    <div className="overflow-auto">
      <svg width={renderW} height={renderH} style={{ minWidth: renderW }}>
        <g transform={`scale(${SCADA_SCALE})`}>
          <ArrowsLayer />

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
              recipeBook={recipeBook}
            />
          )
        )}
        </g>
      </svg>
    </div>
  )
}
