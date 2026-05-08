import ScadaCanvas from './components/ScadaCanvas'
import Player from './components/Player'
import RecipeNormsTable from './components/RecipeNormsTable'
import SkuListLoadPanel from './components/SkuListLoadPanel'
import { useSimulationStore } from './store/useSimulationStore'
import { useRecipeBook } from './hooks/useRecipeBook'

export default function ScadaPage() {
  const {
    statuses,
    stationItems,
    totalTime,
    simulationError,
  } = useSimulationStore()

  const recipeBook = useRecipeBook()

  return (
    <div className="p-6 flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-4">
        <h2 className="text-xl font-semibold">Производство</h2>
        <SkuListLoadPanel />
      </div>
      {simulationError && (
        <p className="text-sm text-red-600" role="alert">
          {simulationError}
        </p>
      )}

      {/* Меню управления временем (наверх) */}
      {totalTime > 0 && <Player />}

      {/* Нормы по рецептам (наверх) */}
      <RecipeNormsTable recipeBook={recipeBook} />

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

      <ScadaCanvas statuses={statuses} stationItems={stationItems} recipeBook={recipeBook} />

    </div>
  )
}
