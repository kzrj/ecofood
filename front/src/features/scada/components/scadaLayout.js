import {
  STATIONS,
  GAP,
  PAD,
  nodeWidth,
  nodeHeight,
} from '../stationsConfig'

export const SCADA_SCALE = 2
export const DWELL_LABEL_H = 28

/** Якорь центра линии верхнего ряда (как при узле высотой ~220) */
const NODE_H_REF = 110

/** Верхняя строка: очередь «На вход» — низкая, широкая */
const INPUT_TOP = PAD
export const INPUT_ROW_HEIGHT = 138
const BETWEEN_INPUT_AND_MAIN = 64

/** Нижняя полоса склада — низкая, широкая */
const SKLAD_GAP = 40
export const SKLAD_ROW_HEIGHT = 152

/** Очередь и склад шире основного ряда станций */
const LANE_EXTRA_W = 88

const MAIN_LIST = STATIONS.filter((s) => s.id !== 'queue_kuter' && s.id !== 'sklad')

const QUEUE_HEADER_H = 34
const QUEUE_CONTENT_PAD = 8
const QUEUE_SKU_LABEL_H = 10
const QUEUE_SKU_FOOTER_H = 11
const QUEUE_SKU_CELL_H = 30
const QUEUE_SKU_GAP = 3
const QUEUE_SKU_COL_MIN = 100

const SKLAD_ST_HEADER = 46
const SKLAD_ST_PAD = 8
const SKLAD_C_LABEL_H = 12
const SKLAD_C_FOOTER_H = 11
const SKLAD_C_CELL_H = 30
const SKLAD_C_GAP = 3
const SKLAD_C_COL_MIN = 98

function upperRowXMain(mainIdx) {
  let x = PAD
  for (let i = 0; i < mainIdx; i++) {
    x += nodeWidth(MAIN_LIST[i]) + GAP
  }
  return x
}

/** padding слева/справа контента внутри узла (QueueNode / StationNode CONTENT_PAD * 2) */
const NODE_CONTENT_INSET = 16

/**
 * Сколько SKU-ячеек помещается в очередь «На вход» при свёрнутой высоте.
 */
export function queueSkuVisibleCap(wideLaneWidth) {
  const contentW = wideLaneWidth - NODE_CONTENT_INSET
  const contentH = INPUT_ROW_HEIGHT - QUEUE_HEADER_H - QUEUE_CONTENT_PAD
  const innerH = Math.max(0, contentH - QUEUE_SKU_LABEL_H - QUEUE_SKU_FOOTER_H)
  const cols = skuQueueCols(contentW)
  const maxRows = Math.max(1, Math.floor((innerH + QUEUE_SKU_GAP) / (QUEUE_SKU_CELL_H + QUEUE_SKU_GAP)))
  return maxRows * cols
}

function skuQueueCols(contentW) {
  return Math.min(
    12,
    Math.max(3, Math.floor((contentW + QUEUE_SKU_GAP) / (QUEUE_SKU_GAP + QUEUE_SKU_COL_MIN)))
  )
}

function skuQueueInnerHeightForCount(contentW, itemCount) {
  if (itemCount <= 0) return QUEUE_SKU_LABEL_H + QUEUE_SKU_FOOTER_H + QUEUE_SKU_CELL_H
  const cols = skuQueueCols(contentW)
  const rows = Math.max(1, Math.ceil(itemCount / cols))
  const innerH = rows * (QUEUE_SKU_CELL_H + QUEUE_SKU_GAP) - QUEUE_SKU_GAP
  return innerH + QUEUE_SKU_LABEL_H + QUEUE_SKU_FOOTER_H
}

/** Полная высота узла очереди «На вход» при развороте (не ниже дефолта). */
export function skuQueueExpandedHeight(wideLaneWidth, itemCount) {
  const contentW = wideLaneWidth - NODE_CONTENT_INSET
  const inner = skuQueueInnerHeightForCount(contentW, itemCount)
  return Math.max(INPUT_ROW_HEIGHT, inner + QUEUE_HEADER_H + QUEUE_CONTENT_PAD)
}

function skladSkuAreaW(wideLaneWidth) {
  const contentW = wideLaneWidth - NODE_CONTENT_INSET
  const colGap = 10
  const totalW = Math.max(48, Math.min(68, Math.round(contentW * 0.2)))
  return Math.max(120, contentW - totalW - colGap)
}

function skladSkuCols(skuW) {
  return Math.min(
    12,
    Math.max(3, Math.floor((skuW + SKLAD_C_GAP) / (SKLAD_C_GAP + SKLAD_C_COL_MIN)))
  )
}

function skladSkuInnerHeightForCount(skuW, itemCount) {
  if (itemCount <= 0) return SKLAD_C_LABEL_H + SKLAD_C_FOOTER_H + SKLAD_C_CELL_H
  const cols = skladSkuCols(skuW)
  const rows = Math.max(1, Math.ceil(itemCount / cols))
  const innerH = rows * (SKLAD_C_CELL_H + SKLAD_C_GAP) - SKLAD_C_GAP
  return innerH + SKLAD_C_LABEL_H + SKLAD_C_FOOTER_H
}

/** Высота области ячеек склада при свёрнутом узле (как в StationNode). */
export function skladCellsAreaHeightCollapsed() {
  return SKLAD_ROW_HEIGHT - SKLAD_ST_HEADER - SKLAD_ST_PAD
}

/**
 * Сколько SKU помещается на складу при свёрнутой высоте.
 */
export function skladSkuVisibleCap(wideLaneWidth) {
  const skuW = skladSkuAreaW(wideLaneWidth)
  const innerH = Math.max(0, skladCellsAreaHeightCollapsed() - SKLAD_C_LABEL_H - SKLAD_C_FOOTER_H)
  const cols = skladSkuCols(skuW)
  const maxRows = Math.max(1, Math.floor((innerH + SKLAD_C_GAP) / (SKLAD_C_CELL_H + SKLAD_C_GAP)))
  return maxRows * cols
}

/** Полная высота узла «Склад» при развороте. */
export function skladExpandedHeight(wideLaneWidth, itemCount) {
  const skuW = skladSkuAreaW(wideLaneWidth)
  const inner = skladSkuInnerHeightForCount(skuW, itemCount)
  const stationContent = inner
  return Math.max(SKLAD_ROW_HEIGHT, stationContent + SKLAD_ST_HEADER + SKLAD_ST_PAD)
}

function buildLayoutMetrics({ inputRowHeight, skladRowHeight }) {
  const mainYUpper = INPUT_TOP + inputRowHeight + BETWEEN_INPUT_AND_MAIN + NODE_H_REF

  function mainStationPos(mainIdx) {
    const station = MAIN_LIST[mainIdx]
    const x = upperRowXMain(mainIdx)
    const y = Math.round(mainYUpper - nodeHeight(station) / 2)
    return { x, y, station }
  }

  const lastIdx = MAIN_LIST.length - 1
  const mainRight = upperRowXMain(lastIdx) + nodeWidth(MAIN_LIST[lastIdx])
  const mainContentWidth = mainRight - PAD

  const mainPositions = {}
  MAIN_LIST.forEach((s, i) => {
    const p = mainStationPos(i)
    mainPositions[s.id] = { x: p.x, y: p.y }
  })

  let maxBottom = 0
  MAIN_LIST.forEach((s) => {
    const p = mainPositions[s.id]
    maxBottom = Math.max(maxBottom, p.y + nodeHeight(s))
  })

  const skladScheduledY = maxBottom + SKLAD_GAP
  const wideLaneWidth = mainContentWidth + LANE_EXTRA_W

  return {
    mainContentWidth,
    wideLaneWidth,
    inputRowHeight,
    skladRowHeight,
    skladY: skladScheduledY,
    mainPositions,
    mainYUpper,
    logicalH: skladScheduledY + skladRowHeight + PAD,
    logicalW: Math.max(wideLaneWidth + PAD * 2, mainRight + PAD),
  }
}

/**
 * Метрики сцены с учётом разворота широких узлов (очередь на вход, склад).
 */
export function createLayoutMetrics({
  queueExpanded = false,
  skladExpanded = false,
  queueSkuCount = 0,
  skladSkuCount = 0,
} = {}) {
  const base = buildLayoutMetrics({
    inputRowHeight: INPUT_ROW_HEIGHT,
    skladRowHeight: SKLAD_ROW_HEIGHT,
  })
  const { wideLaneWidth } = base

  const inputRowHeight =
    queueExpanded && queueSkuCount > 0
      ? skuQueueExpandedHeight(wideLaneWidth, queueSkuCount)
      : INPUT_ROW_HEIGHT

  const skladRowHeight =
    skladExpanded && skladSkuCount > 0
      ? skladExpandedHeight(wideLaneWidth, skladSkuCount)
      : SKLAD_ROW_HEIGHT

  return buildLayoutMetrics({ inputRowHeight, skladRowHeight })
}

/** Статический layout (без разворота). */
export function getDefaultLayoutMetrics() {
  return buildLayoutMetrics({
    inputRowHeight: INPUT_ROW_HEIGHT,
    skladRowHeight: SKLAD_ROW_HEIGHT,
  })
}

/**
 * «На вход» и «Склад»: шире основного ряда (wideLaneWidth), высота из метрик.
 * @param {ReturnType<createLayoutMetrics>} m
 */
export function getStationRenderProps(station, m = getDefaultLayoutMetrics()) {
  if (station.id === 'queue_kuter') {
    return { ...station, width: m.wideLaneWidth, height: m.inputRowHeight }
  }
  if (station.id === 'sklad') {
    return { ...station, width: m.wideLaneWidth, height: m.skladRowHeight }
  }
  return station
}

/** @param {ReturnType<createLayoutMetrics>} m */
export function getNodePos(station, _index, m = getDefaultLayoutMetrics()) {
  if (station.id === 'queue_kuter') {
    return { x: PAD, y: INPUT_TOP }
  }
  if (station.id === 'sklad') {
    return { x: PAD, y: m.skladY }
  }
  const p = m.mainPositions[station.id]
  if (!p) return { x: PAD, y: m.mainYUpper }
  return { x: p.x, y: p.y }
}

/** @param {ReturnType<createLayoutMetrics>} m */
export function getSceneSize(m = getDefaultLayoutMetrics()) {
  const logicalW = m.logicalW
  const logicalH = Math.max(m.logicalH, m.skladY + m.skladRowHeight + PAD)

  return {
    logicalW,
    logicalH,
    renderW: Math.round(logicalW * SCADA_SCALE),
    renderH: Math.round(logicalH * SCADA_SCALE),
  }
}

/** @deprecated кэш больше не используется */
export function resetScadaLayoutCache() {}
