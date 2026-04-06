import { useSimulationStore } from '../store/useSimulationStore'

// Форматируем минуты → "чч:мм"
function formatTime(minutes) {
  const h = Math.floor(minutes / 60)
  const m = Math.floor(minutes % 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

const SPEEDS = [1, 5, 10, 30, 60]

export default function Player() {
  const { currentTime, totalTime, playing, speed, play, pause, reset, seek, setSpeed } =
    useSimulationStore()

  const progress = totalTime > 0 ? currentTime / totalTime : 0

  return (
    <div className="flex flex-col gap-3 bg-white border border-gray-200 rounded-xl p-4 shadow-sm">

      {/* Прогресс-бар */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-mono text-gray-500 w-12 text-right">
          {formatTime(currentTime)}
        </span>

        <input
          type="range"
          min={0}
          max={totalTime}
          step={0.1}
          value={currentTime}
          onChange={(e) => seek(Number(e.target.value))}
          className="flex-1 accent-emerald-500"
        />

        <span className="text-sm font-mono text-gray-400 w-12">
          {formatTime(totalTime)}
        </span>
      </div>

      {/* Кнопки + скорость */}
      <div className="flex items-center gap-3">

        {/* Reset */}
        <button
          onClick={reset}
          className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm transition"
          title="В начало"
        >
          ⏮
        </button>

        {/* Play / Pause */}
        <button
          onClick={playing ? pause : play}
          disabled={totalTime === 0}
          className="px-5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40
                     text-white text-sm font-medium transition"
        >
          {playing ? '⏸ Пауза' : '▶ Старт'}
        </button>

        {/* Скорость */}
        <div className="flex items-center gap-1 ml-auto">
          <span className="text-xs text-gray-400 mr-1">×</span>
          {SPEEDS.map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={`px-2 py-1 rounded text-xs font-mono transition
                ${speed === s
                  ? 'bg-emerald-500 text-white'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
