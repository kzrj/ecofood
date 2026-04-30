import { nodeWidth, nodeHeight } from '../stationsConfig'

const HEADER_H  = 46   // место под название + счётчик + разделитель
const SLOT_GAP  = 5
const CONTENT_PAD = 8

/** Термокамера: 3 секции (ресурс SimPy), в каждой до 2 рам */
const TERMO_SECTIONS = 3
const TERMO_FRAMES_PER_SECTION = 2
const TERMO_SECTION_GAP = 14
const TERMO_INNER_PAD_X = 8
const TERMO_FRAME_GAP = 8
const TERMO_LABEL_H = 12
const TERMO_PAD_Y = 4

/** Цвет рамы по типу продукта (как в очереди «На вход») */
const SLOT_BY_RECIPE = {
  varenka:   { fill: '#dbeafe', stroke: '#60a5fa', label: '#1e40af', sub: '#3b82f6' },
  polukopch: { fill: '#fce7f3', stroke: '#f472b6', label: '#9d174d', sub: '#db2777' },
  default:   { fill: '#dcfce7', stroke: '#4ade80', label: '#166534', sub: '#15803d' },
}

function slotStyle(item) {
  if (!item) return null
  const r = item.recipe
  return SLOT_BY_RECIPE[r] ?? SLOT_BY_RECIPE.default
}

const RECIPE_TAG = { varenka: 'вар', polukopch: 'п/к' }

// -----------------------------------------------------------------------
// Один слот — прямоугольник с подписью; цвет по рецепту рамы
// -----------------------------------------------------------------------
function Slot({ x, y, w, h, item }) {
  const filled = !!item
  const cx = x + w / 2
  const st = filled ? slotStyle(item) : null
  const isRetool = filled && item?.phase === 'retool'

  return (
    <g>
      <rect
        x={x} y={y} width={w} height={h} rx={5}
        fill={filled ? st.fill : '#f8fafc'}
        stroke={filled ? (isRetool ? '#f59e0b' : st.stroke) : '#e2e8f0'}
        strokeWidth={filled ? 1.5 : 1}
        strokeDasharray={filled ? (isRetool ? '4 2' : 'none') : '4 3'}
      />
      {filled && (
        <>
          <text x={cx} y={y + h * 0.36} textAnchor="middle" fontSize={9} fontWeight="700" fill={st.label}>
            {item.sku.replace(/\(.*\)/, '')}
          </text>
          {item.recipe && (
            <text x={cx} y={y + h * 0.58} textAnchor="middle" fontSize={7} fontWeight="600" fill={st.sub}>
              {RECIPE_TAG[item.recipe] ?? item.recipe}
            </text>
          )}
          {isRetool ? (
            <text x={cx} y={y + h * 0.82} textAnchor="middle" fontSize={8} fontWeight="700" fill="#92400e">
              перенал.
            </text>
          ) : item.weight > 0 ? (
            <text x={cx} y={y + h * 0.82} textAnchor="middle" fontSize={8} fill={st.sub}>
              {item.weight}кг
            </text>
          ) : null}
        </>
      )}
    </g>
  )
}

// -----------------------------------------------------------------------
// Вычисляем сетку слотов
// -----------------------------------------------------------------------
function slotGrid(capacity, items, contentW, contentH, showEmpty) {
  const totalSlots = showEmpty ? capacity : items.length
  if (totalSlots === 0) return []

  const cols = totalSlots === 1 ? 1 : totalSlots <= 3 ? 1 : 2
  const rows = Math.ceil(totalSlots / cols)
  const slotW = (contentW - (cols - 1) * SLOT_GAP) / cols
  const slotH = Math.max(24, Math.min(54, (contentH - (rows - 1) * SLOT_GAP) / rows))

  return Array.from({ length: totalSlots }, (_, i) => ({
    col: i % cols,
    row: Math.floor(i / cols),
    item: items[i] ?? null,
    slotW, slotH,
  }))
}

// -----------------------------------------------------------------------
// Контейнер-склад (визуализация уровня заполнения)
// -----------------------------------------------------------------------
function ContainerLevel({ x, y, w, h, level, capacity }) {
  const cap = capacity > 0 ? capacity : 1
  const pct = Math.min(level / cap, 1)
  const fillH = Math.max(4, h * pct)
  const narrow = w < 80
  const fs = narrow ? 7 : 9
  const label = `${level} кг`
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={4} fill="#f8fafc" stroke="#e2e8f0" strokeWidth={1} />
      <rect
        x={x} y={y + h - fillH} width={w} height={fillH} rx={4}
        fill="#fcd34d" stroke="none"
      />
      {narrow ? (
        <text
          x={x + w / 2}
          y={y + h / 2}
          textAnchor="middle"
          fontSize={fs}
          fontWeight="700"
          fill="#78350f"
          transform={`rotate(-90 ${x + w / 2} ${y + h / 2})`}
        >
          {label}
        </text>
      ) : (
        <text x={x + w / 2} y={y + h / 2 + 4} textAnchor="middle" fontSize={fs} fontWeight="700" fill="#78350f">
          {label}
        </text>
      )}
    </g>
  )
}

/** Ячейки SKU на складе: накоплено / план (несколько приходов суммируются) */
function SkladSkuCells({ x, y, w, h, items }) {
  // Широкая колонка: больше колонок сетки и крупнее шрифт
  const cols = w >= 200 ? 3 : w >= 130 ? 2 : 1
  const labelH = 14
  const gap = 4
  const rows = Math.max(1, Math.ceil(items.length / cols))
  const innerH = Math.max(0, h - labelH)
  const cellH = Math.min(24, Math.max(14, (innerH - gap * (rows - 1)) / rows))
  const cellW = (w - gap * (cols - 1)) / cols
  return (
    <g>
      <text x={x} y={y + 11} fontSize={10} fontWeight="700" fill="#475569">
        SKU
      </text>
      {items.map((item, i) => {
        const col = i % cols
        const row = Math.floor(i / cols)
        const cx = x + col * (cellW + gap)
        const cy = y + labelH + row * (cellH + gap)
        const st = slotStyle(item)
        const has = (item.weight ?? 0) > 0
        const full = (item.planned ?? 0) > 0 && item.weight >= item.planned
        return (
          <g key={item.sku}>
            <rect
              x={cx}
              y={cy}
              width={cellW}
              height={cellH}
              rx={4}
              fill={has ? st?.fill ?? '#f1f5f9' : '#f8fafc'}
              stroke={full ? '#22c55e' : has ? st?.stroke ?? '#cbd5e1' : '#e2e8f0'}
              strokeWidth={1}
            />
            <text
              x={cx + cellW / 2}
              y={cy + cellH * 0.42}
              textAnchor="middle"
              fontSize={8}
              fontWeight="700"
              fill={has ? st?.label ?? '#334155' : '#94a3b8'}
            >
              {String(item.sku).replace(/^var-/, 'в').replace(/^pk-/, 'п')}
            </text>
            <text
              x={cx + cellW / 2}
              y={cy + cellH * 0.82}
              textAnchor="middle"
              fontSize={8}
              fontWeight="600"
              fill={full ? '#15803d' : '#64748b'}
            >
              {item.weight ?? 0}/{item.planned ?? '—'} кг
            </text>
          </g>
        )
      })}
    </g>
  )
}

// -----------------------------------------------------------------------
// Термокамера: три визуально разделённые секции, в каждой две рамы рядом
// -----------------------------------------------------------------------
function TermoKameraSections({ contentX, contentY, contentW, contentH, items }) {
  // Группируем рамы по section_id из лога; если section нет — каждая в своей группе
  const sectionMap = new Map()
  for (const item of items) {
    const key = item.section ?? `solo_${item.sku}`
    if (!sectionMap.has(key)) sectionMap.set(key, [])
    sectionMap.get(key).push(item)
  }
  const groups = Array.from(sectionMap.values())
  // Заполняем до TERMO_SECTIONS пустыми секциями для отображения
  while (groups.length < TERMO_SECTIONS) groups.push([])
  const slots = groups.slice(0, TERMO_SECTIONS).flatMap(g => {
    const pair = [g[0] ?? null, g[1] ?? null]
    return pair
  })

  const sectionH =
    (contentH - (TERMO_SECTIONS - 1) * TERMO_SECTION_GAP) / TERMO_SECTIONS
  const innerW = contentW - TERMO_INNER_PAD_X * 2
  const frameW = (innerW - TERMO_FRAME_GAP) / 2
  const frameH = Math.max(
    24,
    sectionH - TERMO_LABEL_H - TERMO_PAD_Y * 2,
  )

  return (
    <g>
      {Array.from({ length: TERMO_SECTIONS }, (_, s) => {
        const y0 = contentY + s * (sectionH + TERMO_SECTION_GAP)
        const idx0 = s * TERMO_FRAMES_PER_SECTION

        return (
          <g key={s}>
            <rect
              x={contentX}
              y={y0}
              width={contentW}
              height={sectionH}
              rx={7}
              fill="#eef2ff"
              stroke="#c7d2fe"
              strokeWidth={1.5}
            />
            <text
              x={contentX + TERMO_INNER_PAD_X}
              y={y0 + 11}
              fontSize={8}
              fontWeight="700"
              fill="#4338ca"
            >
              Секция {s + 1}
            </text>
            {Array.from({ length: TERMO_FRAMES_PER_SECTION }, (__, f) => {
              const i = idx0 + f
              const item = slots[i]
              const sx =
                contentX +
                TERMO_INNER_PAD_X +
                f * (frameW + TERMO_FRAME_GAP)
              const sy = y0 + TERMO_LABEL_H + TERMO_PAD_Y
              return (
                <Slot
                  key={`${s}-${f}`}
                  x={sx}
                  y={sy}
                  w={frameW}
                  h={frameH}
                  item={item}
                />
              )
            })}
          </g>
        )
      })}
    </g>
  )
}

// -----------------------------------------------------------------------
// Главный компонент
// -----------------------------------------------------------------------
export default function StationNode({ x, y, station, status = 'idle', items = [] }) {
  const W  = nodeWidth(station)
  const H  = nodeHeight(station)
  const cx = x + W / 2

  const isRetool = status === 'retool'
  const busy = status !== 'idle'
  const bgFill = isRetool ? '#fffbeb' : busy ? '#f0fdf4' : '#f8fafc'
  const border = isRetool ? '#f59e0b' : busy ? '#4ade80' : '#e2e8f0'

  const contentX = x + CONTENT_PAD
  const contentY = y + HEADER_H
  const contentW = W - CONTENT_PAD * 2
  const contentH = H - HEADER_H - CONTENT_PAD

  // Склад-контейнер рисуем иначе
  const isContainer = station.type === 'container'
  const isTermo = station.id === 'termokamera'
  const isSklad = station.id === 'sklad'
  const totalItem = isContainer && items.find((it) => it.kind === 'total')
  const level = isContainer
    ? (totalItem?.weight ?? items[0]?.weight ?? 0)
    : 0
  const plannedCapacity = totalItem?.plannedTotal ?? station.capacity
  const skladSkuItems = isSklad ? items.filter((it) => it.kind !== 'total') : []

  // Слоты: показываем пустые если ёмкость маленькая (≤8), иначе только занятые
  const showEmpty = !isContainer && (station.capacity ?? 0) <= 8
  const grid =
    isContainer || isTermo
      ? []
      : slotGrid(station.capacity, items, contentW, contentH, showEmpty)

  return (
    <g>
      {/* Фон */}
      <rect x={x} y={y} width={W} height={H} rx={8}
        fill={bgFill} stroke={border} strokeWidth={1.5} />

      {/* Название */}
      <text x={cx} y={y + 18} textAnchor="middle" fontSize={13} fontWeight="700" fill="#1e293b">
        {station.label}
      </text>

      {/* Заполненность */}
      <text x={cx} y={y + 34} textAnchor="middle" fontSize={9} fill="#94a3b8">
        {isContainer
          ? `${level} / ${plannedCapacity} кг`
          : `${items.length} / ${station.capacity}${isRetool ? ' · переналадка' : ''}`}
      </text>

      {/* Разделитель */}
      <line x1={x + 6} y1={y + 40} x2={x + W - 6} y2={y + 40} stroke="#e2e8f0" strokeWidth={1} />

      {/* Контейнер (склад): сверху — всего, снизу — ячейки по SKU */}
      {isContainer && !isSklad && (
        <ContainerLevel
          x={contentX} y={contentY}
          w={contentW} h={contentH}
          level={level} capacity={plannedCapacity}
        />
      )}
      {isContainer && isSklad && (
        <g>
          {(() => {
            const colGap = 10
            // Слева — узкая колонка «всего», справа — основная ширина под SKU
            const totalW = Math.max(48, Math.min(68, Math.round(contentW * 0.2)))
            const skuX = contentX + totalW + colGap
            const skuW = Math.max(120, contentW - totalW - colGap)
            return (
              <>
                <text
                  x={contentX + totalW / 2}
                  y={contentY + 11}
                  textAnchor="middle"
                  fontSize={9}
                  fontWeight="700"
                  fill="#64748b"
                >
                  всего
                </text>
                <ContainerLevel
                  x={contentX}
                  y={contentY + 16}
                  w={totalW}
                  h={contentH - 16}
                  level={level}
                  capacity={plannedCapacity}
                />
                <line
                  x1={skuX - colGap / 2}
                  y1={contentY}
                  x2={skuX - colGap / 2}
                  y2={contentY + contentH}
                  stroke="#e2e8f0"
                  strokeWidth={1}
                />
                {skladSkuItems.length > 0 && (
                  <SkladSkuCells
                    x={skuX}
                    y={contentY}
                    w={skuW}
                    h={contentH}
                    items={skladSkuItems}
                  />
                )}
              </>
            )
          })()}
        </g>
      )}

      {/* Термокамера: 3 секции × 2 рамы */}
      {isTermo && (
        <TermoKameraSections
          contentX={contentX}
          contentY={contentY}
          contentW={contentW}
          contentH={contentH}
          items={items}
        />
      )}

      {/* Слоты */}
      {grid.map(({ col, row, item, slotW, slotH }, i) => {
        const sx = contentX + col * (slotW + SLOT_GAP)
        const sy = contentY + row * (slotH + SLOT_GAP)
        if (sy + slotH > y + H - 4) return null
        return <Slot key={i} x={sx} y={sy} w={slotW} h={slotH} item={item} />
      })}

      {/* Для большой ёмкости: индикатор свободных слотов */}
      {!showEmpty && !isContainer && !isTermo && station.capacity > 8 && items.length < station.capacity && (
        <text x={cx} y={y + H - 6} textAnchor="middle" fontSize={8} fill="#94a3b8">
          свободно: {station.capacity - items.length}
        </text>
      )}
    </g>
  )
}
