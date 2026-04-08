import { dwellMinutesForStation } from '../recipeTiming'

const COL = {
  varenka: '#1d4ed8',
  polukopch: '#be185d',
  muted: '#94a3b8',
}

export default function DwellTimeLabel({ stationId, cx, yTop, ramaCapacityKg }) {
  if (ramaCapacityKg != null) {
    return (
      <text x={cx} y={yTop + 16} textAnchor="middle" fontSize={8} fontWeight="600" fill={COL.muted}>
        вместимость рамы {ramaCapacityKg} кг
      </text>
    )
  }

  const d = dwellMinutesForStation(stationId)
  if (!d) {
    return (
      <text x={cx} y={yTop + 16} textAnchor="middle" fontSize={8} fill={COL.muted}>
        без нормы
      </text>
    )
  }
  const fmt = (n) => (n != null ? `${n} мин` : '—')
  return (
    <g>
      <text x={cx} y={yTop + 10} textAnchor="middle" fontSize={8} fontWeight="600" fill={COL.varenka}>
        вар {fmt(d.varenka)}
      </text>
      <text x={cx} y={yTop + 22} textAnchor="middle" fontSize={8} fontWeight="600" fill={COL.polukopch}>
        п/к {fmt(d.polukopch)}
      </text>
    </g>
  )
}
