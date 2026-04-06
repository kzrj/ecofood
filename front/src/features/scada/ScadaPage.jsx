import { useEffect } from 'react'
import ScadaCanvas from './components/ScadaCanvas'
import Player from './components/Player'
import { useSimulationStore } from './store/useSimulationStore'

export default function ScadaPage() {
  const { statuses, stationItems, loadLog, totalTime } = useSimulationStore()

  // Загружаем лог при монтировании страницы
  useEffect(() => { loadLog() }, [])

  return (
    <div className="p-6 flex flex-col gap-6">
      <h2 className="text-xl font-semibold">Производство</h2>

      <ScadaCanvas statuses={statuses} stationItems={stationItems} />

      {/* Легенда */}
      <div className="flex gap-6">
        {[
          { color: '#e2e8f0', label: 'Свободен' },
          { color: '#86efac', label: 'Работает' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ background: color, border: '1px solid #94a3b8' }} />
            <span className="text-sm text-gray-600">{label}</span>
          </div>
        ))}
      </div>

      {/* Плеер */}
      {totalTime > 0 && <Player />}
    </div>
  )
}
