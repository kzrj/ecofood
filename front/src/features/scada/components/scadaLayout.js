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

export const SCADA_SCALE = 1.3
export const DWELL_LABEL_H = 28

const LOWER_FROM_STATION_ID = 'termokamera'
const LOWER_ANCHOR_STATION_ID = 'kuter'
const SECOND_FLOW_Y = MAIN_FLOW_Y + 340

const indexById = new Map(STATIONS.map((s, i) => [s.id, i]))
const LOWER_FROM_INDEX = indexById.get(LOWER_FROM_STATION_ID) ?? 7
const LOWER_ANCHOR_INDEX = indexById.get(LOWER_ANCHOR_STATION_ID) ?? 1

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

export function getNodePos(station, index) {
  const x = index >= LOWER_FROM_INDEX ? lowerRowX(index) : nodeX(index)
  const y = Math.round(flowYByIndex(index) - nodeHeight(station) / 2)
  return { x, y }
}

export function getFlowY(index) {
  return flowYByIndex(index)
}

export function getSceneSize() {
  const logicalW =
    STATIONS.reduce((max, station, i) => {
      const p = getNodePos(station, i)
      return Math.max(max, p.x + nodeWidth(station))
    }, 0) + PAD

  const logicalH = Math.max(
    SVG_H,
    STATIONS.reduce((max, station, i) => {
      const p = getNodePos(station, i)
      return Math.max(max, p.y + nodeHeight(station))
    }, 0) + PAD,
  )

  return {
    logicalW,
    logicalH,
    renderW: Math.round(logicalW * SCADA_SCALE),
    renderH: Math.round(logicalH * SCADA_SCALE),
  }
}

