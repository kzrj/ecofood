export const STATIONS = [
  { id: 'queue_kuter',       label: 'На вход',     type: 'queue',     width: 160, height: 560 },
  { id: 'kuter',             label: 'Кутер',        capacity: 1   },
  { id: 'shpric',            label: 'Шприц',        capacity: 1   },
  { id: 'klipsator',         label: 'Клипсатор',    capacity: 1   },
  { id: 'queue_osadka',      label: 'К осадке',     type: 'queue' },
  { id: 'osadka',            label: 'Осадка',       capacity: 100, height: 280 },
  { id: 'queue_termokamera', label: 'К термо',      type: 'queue' },
  { id: 'termokamera',       label: 'Термокамера',  capacity: 6, width: 200, height: 320 },
  { id: 'ohlazdenie',        label: 'Охлаждение',   capacity: 4   },
  { id: 'upakovka',          label: 'Упаковка',     capacity: 100 },
  { id: 'sklad',             label: 'Склад',        capacity: 10000, type: 'container' },
]

// Стандартные размеры
export const NODE_W = 140
export const NODE_H = 220
export const GAP    = 36
export const PAD    = 24

// Ширина и высота конкретного узла
export const nodeWidth  = (s) => s.width  ?? (s.type === 'queue' ? 90 : NODE_W)
export const nodeHeight = (s) => s.height ?? NODE_H

// Кумулятивные X-позиции
let _cx = PAD
const _xMap = {}
for (const s of STATIONS) {
  _xMap[s.id] = _cx
  _cx += nodeWidth(s) + GAP
}
export const nodeX = (index) => _xMap[STATIONS[index].id]

export const SVG_W = _cx - GAP + PAD

/** Центр основного потока; очередь «На вход» выше этой линии (высокий блок под SKU). */
export const MAIN_FLOW_Y = 700
export const SVG_H = 920
