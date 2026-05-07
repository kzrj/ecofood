import { useEffect, useState } from 'react'
import { useSimulationStore } from '../store/useSimulationStore'

const API_SIMULATION = '/api/v1/sku-lists/simulation'

export default function SkuListLoadPanel() {
  const { runSimulation, simulationLoading } = useSimulationStore()
  const [simulationList, setSimulationList] = useState(null)
  const [listLoading, setListLoading] = useState(false)
  const [listError, setListError] = useState(null)
  const [loadError, setLoadError] = useState(null)

  useEffect(() => {
    setListLoading(true)
    fetch(API_SIMULATION)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data) => setSimulationList(data))
      .catch(() => setListError('Не найден список, отмеченный "на симуляцию"'))
      .finally(() => setListLoading(false))
  }, [])

  async function handleLoad() {
    if (!simulationList?.id) return
    setLoadError(null)
    try {
      const skuList = Array.isArray(simulationList?.items) ? simulationList.items : []
      if (skuList.length === 0) {
        setLoadError('В списке "на симуляцию" нет SKU')
        return
      }
      await runSimulation(skuList)
    } catch (e) {
      setLoadError(e.message)
    }
  }

  if (listError) {
    return <p className="text-sm text-red-500">{listError}</p>
  }

  return (
    <div className="flex items-center gap-3">
      {listLoading ? (
        <p className="text-xs text-slate-400">Загружаем список…</p>
      ) : !simulationList ? (
        <p className="text-xs text-slate-400">Список не выбран</p>
      ) : (
        <div className="min-w-0">
          <p className="text-sm text-slate-800">
            <span className="font-medium">{simulationList.name}</span>
            <span className="text-slate-500"> — {Array.isArray(simulationList.items) ? simulationList.items.length : 0} SKU</span>
          </p>
        </div>
      )}

      {loadError && (
        <p className="text-xs text-red-500">{loadError}</p>
      )}

      <button
        type="button"
        onClick={handleLoad}
        disabled={!simulationList?.id || simulationLoading}
        className="shrink-0 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50 transition-colors"
      >
        {simulationLoading ? 'Считаем…' : 'Загрузить список'}
      </button>
    </div>
  )
}
