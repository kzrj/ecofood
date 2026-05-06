import ScadaCanvas from './components/ScadaCanvas'
import Player from './components/Player'
import RecipeNormsTable from './components/RecipeNormsTable'
import DemandPanel from './components/DemandPanel'
import { useSimulationStore } from './store/useSimulationStore'
import { useRecipeBook } from './hooks/useRecipeBook'

export default function ScadaPage() {
  const {
    statuses,
    stationItems,
    totalTime,
    runSimulation,
    simulationLoading,
    simulationError,
  } = useSimulationStore()

  const recipeBook = useRecipeBook()

  return (
    <div className="p-6 flex flex-col gap-6">
      <div className="flex flex-wrap items-start gap-6">
        <div className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold">Производство</h2>
          <button
            type="button"
            onClick={() => runSimulation()}
            disabled={simulationLoading}
            className="self-start rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {simulationLoading ? 'Считаем…' : 'Случайная партия'}
          </button>
        </div>
        <DemandPanel />
      </div>
      {simulationError && (
        <p className="text-sm text-red-600" role="alert">
          {simulationError}
        </p>
      )}

      <ScadaCanvas statuses={statuses} stationItems={stationItems} recipeBook={recipeBook} />

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

      {/* Нормы по рецептам */}
      <RecipeNormsTable recipeBook={recipeBook} />
    </div>
  )
}
