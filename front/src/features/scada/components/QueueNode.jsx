import { nodeWidth, nodeHeight } from '../stationsConfig'

const HEADER_H   = 40
const ITEM_GAP   = 4
const CONTENT_PAD = 7

const RECIPE_SHORT = {
  varenka:   'вар',
  polukopch: 'п/к',
}
const RECIPE_COLOR = {
  varenka:   { fill: '#dbeafe', stroke: '#93c5fd', text: '#1e40af' },
  polukopch: { fill: '#fce7f3', stroke: '#f9a8d4', text: '#9d174d' },
  default:   { fill: '#eff6ff', stroke: '#93c5fd', text: '#1d4ed8' },
}

// -----------------------------------------------------------------------
// Рама — прямоугольник с ID и весом
// -----------------------------------------------------------------------
function FrameRect({ x, y, w, h, item }) {
  const cx = x + w / 2
  const col = RECIPE_COLOR[item.recipe] ?? RECIPE_COLOR.default
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={4}
        fill={col.fill} stroke={col.stroke} strokeWidth={1.5} />
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

// -----------------------------------------------------------------------
// Одна строка SKU (для очереди «На вход»)
// -----------------------------------------------------------------------
function SkuRow({ x, y, w, h, item }) {
  const col = RECIPE_COLOR[item.recipe] ?? RECIPE_COLOR.default
  const short = RECIPE_SHORT[item.recipe] ?? (item.recipe ?? '')
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={3}
        fill={col.fill} stroke={col.stroke} strokeWidth={1} />
      <text x={x + 5} y={y + h * 0.72} fontSize={8} fontWeight="600" fill={col.text}>
        {item.sku}
      </text>
      <text x={x + w - 4} y={y + h * 0.72} textAnchor="end" fontSize={8} fill={col.text}>
        {short} {item.weight}кг
      </text>
    </g>
  )
}

// -----------------------------------------------------------------------
// Главный компонент — вертикальный список в секции
// -----------------------------------------------------------------------
export default function QueueNode({ x, y, station, items = [] }) {
  const W = nodeWidth(station)
  const H = nodeHeight(station)
  const cx = x + W / 2
  const count = items.length
  const totalKg = items.reduce((s, i) => s + (i.weight ?? 0), 0)
  const hasItems = count > 0

  const isSkuQueue = items.some(i => i.recipe)

  const contentX = x + CONTENT_PAD
  const contentY = y + HEADER_H
  const contentW = W - CONTENT_PAD * 2
  const contentH = H - HEADER_H - CONTENT_PAD

  const cols = isSkuQueue && count > 14 ? 2 : 1
  const colW = cols === 2 ? (contentW - ITEM_GAP) / 2 : contentW

  const rows = Math.ceil(count / cols)
  const itemH = isSkuQueue
    ? Math.max(14, Math.min(20, (contentH - (rows - 1) * ITEM_GAP) / rows))
    : 34

  const maxVisible = Math.floor((contentH + ITEM_GAP) / (itemH + ITEM_GAP)) * cols
  const visible = items.slice(0, maxVisible)
  const overflow = count - visible.length

  return (
    <g>
      <rect x={x} y={y} width={W} height={H} rx={7}
        fill={hasItems ? '#eff6ff' : '#f8fafc'}
        stroke={hasItems ? '#93c5fd' : '#e2e8f0'}
        strokeWidth={1.5}
        strokeDasharray="5 3"
      />

      <text x={cx} y={y + 14} textAnchor="middle" fontSize={9} fontWeight="700" fill="#64748b">
        {station.label}
      </text>

      {hasItems && (
        <text x={cx} y={y + 28} textAnchor="middle" fontSize={10} fontWeight="700" fill="#1d4ed8">
          {count} {isSkuQueue ? 'SKU' : count === 1 ? 'рама' : count < 5 ? 'рамы' : 'рам'} · {totalKg}кг
        </text>
      )}

      <line x1={x + 5} y1={y + 33} x2={x + W - 5} y2={y + 33} stroke="#dbeafe" strokeWidth={0.8} />

      {visible.map((item, i) => {
        const col = cols === 2 ? i % 2 : 0
        const row = cols === 2 ? Math.floor(i / 2) : i
        const ix = contentX + col * (colW + ITEM_GAP)
        const iy = contentY + row * (itemH + ITEM_GAP)
        return isSkuQueue
          ? <SkuRow key={item.sku} x={ix} y={iy} w={colW} h={itemH} item={item} />
          : <FrameRect key={item.sku} x={ix} y={iy} w={colW} h={itemH} item={item} />
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
