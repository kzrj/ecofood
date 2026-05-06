import { nodeWidth, nodeHeight } from '../stationsConfig'

/** Узкая шапка — больше места под сетку ячеек */
const HEADER_H = 34
const ITEM_GAP = 3
const CONTENT_PAD = 8

const RECIPE_SHORT = {
  varenka: 'вар',
  polukopch: 'п/к',
}
const RECIPE_COLOR = {
  varenka: { fill: '#dbeafe', stroke: '#93c5fd', text: '#1e40af' },
  polukopch: { fill: '#fce7f3', stroke: '#f9a8d4', text: '#9d174d' },
  default: { fill: '#eff6ff', stroke: '#93c5fd', text: '#1d4ed8' },
}

function FrameRect({ x, y, w, h, item }) {
  const cx = x + w / 2
  const col = RECIPE_COLOR[item.recipe] ?? RECIPE_COLOR.default
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={4} fill={col.fill} stroke={col.stroke} strokeWidth={1.5} />
      <text x={cx} y={item.recipe ? y + h * 0.36 : y + h * 0.44} textAnchor="middle" fontSize={9} fontWeight="700" fill={col.text}>
        {item.sku}
      </text>
      {item.recipe && (
        <text x={cx} y={y + h * 0.58} textAnchor="middle" fontSize={7} fontWeight="600" fill={col.text}>
          {RECIPE_SHORT[item.recipe] ?? item.recipe}
        </text>
      )}
      <text x={cx} y={item.recipe ? y + h * 0.82 : y + h * 0.78} textAnchor="middle" fontSize={8} fill={col.text}>
        {item.weight}кг
      </text>
    </g>
  )
}

function shortLabel(s, maxLen = 22) {
  if (s == null || s === '') return ''
  const t = String(s)
  return t.length <= maxLen ? t : `${t.slice(0, maxLen - 1)}…`
}

/** Ячейка SKU: название · тип · вес · замес (без длинного id) */
function SkuTile({ x, y, w, h, item }) {
  const col = RECIPE_COLOR[item.recipe] ?? RECIPE_COLOR.default
  const title = shortLabel(item.name || item.sku, 24)
  const typeLine = item.sku_type ? shortLabel(item.sku_type, 24) : '—'
  const batchLine = item.batch_no != null && item.batch_no !== '' ? String(item.batch_no) : '—'
  const weightLine = `${item.weight ?? 0}кг`
  const line = (i) => y + 5 + i * ((h - 8) / 4)
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={4} fill={col.fill} stroke={col.stroke} strokeWidth={1} />
      <text x={x + w / 2} y={line(0)} textAnchor="middle" fontSize={6.5} fontWeight="700" fill={col.text}>
        {title}
      </text>
      <text x={x + w / 2} y={line(1)} textAnchor="middle" fontSize={6} fontWeight="600" fill={col.text}>
        {typeLine}
      </text>
      <text x={x + w / 2} y={line(2)} textAnchor="middle" fontSize={6.5} fontWeight="600" fill={col.text}>
        {weightLine}
      </text>
      <text x={x + w / 2} y={line(3)} textAnchor="middle" fontSize={6} fontWeight="500" fill={col.text}>
        {batchLine}
      </text>
    </g>
  )
}

export default function QueueNode({ x, y, station, items = [], expanded = false, onToggleExpand }) {
  const W = nodeWidth(station)
  const H = nodeHeight(station)
  const cx = x + W / 2
  const count = items.length
  const totalKg = items.reduce((s, i) => s + (i.weight ?? 0), 0)
  const hasItems = count > 0

  const isSkuQueue = items.some((i) => i.recipe)

  const contentX = x + CONTENT_PAD
  const contentY = y + HEADER_H
  const contentW = W - CONTENT_PAD * 2
  const contentH = H - HEADER_H - CONTENT_PAD

  let visible = items
  let overflow = 0

  if (isSkuQueue) {
    const labelH = 10
    const footerH = 11
    const gap = ITEM_GAP
    const cellH = 30
    const innerH = Math.max(0, contentH - labelH - footerH)
    const cols = Math.min(12, Math.max(3, Math.floor((contentW + gap) / (gap + 100))))
    const cellW = (contentW - gap * (cols - 1)) / cols
    const maxRows = Math.max(1, Math.floor((innerH + gap) / (cellH + gap)))
    const maxVisible = maxRows * cols
    const expandAll = !!expanded
    visible = expandAll ? items : items.slice(0, maxVisible)
    overflow = expandAll ? 0 : count - visible.length

    const showGridToggle = typeof onToggleExpand === 'function' && (overflow > 0 || expanded)

    return (
      <g>
        <rect x={x} y={y} width={W} height={H} rx={7} fill={hasItems ? '#eff6ff' : '#f8fafc'} stroke={hasItems ? '#93c5fd' : '#e2e8f0'} strokeWidth={1.5} strokeDasharray="5 3" />

        <text x={cx} y={y + 13} textAnchor="middle" fontSize={9} fontWeight="700" fill="#64748b">
          {station.label}
        </text>
        {hasItems && (
          <text x={cx} y={y + 26} textAnchor="middle" fontSize={9} fontWeight="700" fill="#1d4ed8">
            {count} SKU · {totalKg}кг
          </text>
        )}
        <line x1={x + 5} y1={y + 30} x2={x + W - 5} y2={y + 30} stroke="#dbeafe" strokeWidth={0.8} />

        <text x={contentX} y={contentY + 9} fontSize={8} fontWeight="700" fill="#475569">
          очередь · {count}
        </text>

        {visible.map((item, i) => {
          const col = i % cols
          const row = Math.floor(i / cols)
          const ix = contentX + col * (cellW + gap)
          const iy = contentY + labelH + row * (cellH + gap)
          return <SkuTile key={item.sku} x={ix} y={iy} w={cellW} h={cellH} item={item} />
        })}

        {showGridToggle && (
          <g
            onClick={(e) => {
              e.stopPropagation()
              onToggleExpand()
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onToggleExpand()
              }
            }}
            style={{ cursor: 'pointer' }}
            role="button"
            tabIndex={0}
          >
            <text x={cx} y={y + H - 4} textAnchor="middle" fontSize={7.5} fontWeight="600" fill="#2563eb">
              {expanded ? 'свернуть' : `+${overflow} ещё · развернуть`}
            </text>
          </g>
        )}

        {!hasItems && (
          <text x={cx} y={y + H / 2 + 4} textAnchor="middle" fontSize={9} fill="#cbd5e1">
            пусто
          </text>
        )}
      </g>
    )
  }

  const cols = 1
  const colW = contentW
  const rows = Math.ceil(count / cols)
  const itemH = Math.max(22, Math.min(34, rows > 0 ? (contentH - (rows - 1) * ITEM_GAP) / rows : 34))
  const maxVisible = Math.max(0, Math.floor((contentH + ITEM_GAP) / (itemH + ITEM_GAP)) * cols)
  visible = items.slice(0, maxVisible)
  overflow = count - visible.length

  return (
    <g>
      <rect x={x} y={y} width={W} height={H} rx={7} fill={hasItems ? '#eff6ff' : '#f8fafc'} stroke={hasItems ? '#93c5fd' : '#e2e8f0'} strokeWidth={1.5} strokeDasharray="5 3" />

      <text x={cx} y={y + 13} textAnchor="middle" fontSize={9} fontWeight="700" fill="#64748b">
        {station.label}
      </text>
      {hasItems && (
        <text x={cx} y={y + 26} textAnchor="middle" fontSize={10} fontWeight="700" fill="#1d4ed8">
          {count} {count === 1 ? 'рама' : count < 5 ? 'рамы' : 'рам'} · {totalKg}кг
        </text>
      )}
      <line x1={x + 5} y1={y + 30} x2={x + W - 5} y2={y + 30} stroke="#dbeafe" strokeWidth={0.8} />

      {visible.map((item, i) => {
        const col = i % cols
        const row = Math.floor(i / cols)
        const ix = contentX + col * (colW + ITEM_GAP)
        const iy = contentY + row * (itemH + ITEM_GAP)
        return <FrameRect key={item.sku} x={ix} y={iy} w={colW} h={itemH} item={item} />
      })}

      {overflow > 0 && (
        <text x={cx} y={y + H - 5} textAnchor="middle" fontSize={8} fill="#3b82f6">
          +{overflow} ещё
        </text>
      )}

      {!hasItems && (
        <text x={cx} y={y + H / 2 + 5} textAnchor="middle" fontSize={9} fill="#cbd5e1">
          пусто
        </text>
      )}
    </g>
  )
}
