import { useEffect, useState } from 'react'
import { useSimulationStore } from '../store/useSimulationStore'
import { demandToSkuList } from '../store/domain/demandToSkuList'

const API_LIST   = '/api/v1/import/list'
const API_DETAIL = (id) => `/api/v1/import/${id}`

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

export default function DemandPanel({ compact = false }) {
  const { runSimulation, simulationLoading } = useSimulationStore()

  const [demands,    setDemands]    = useState([])
  const [listLoading, setListLoading] = useState(false)
  const [listError,   setListError]   = useState(null)
  const [selectedId,  setSelectedId]  = useState(null)
  const [loadError,   setLoadError]   = useState(null)

  useEffect(() => {
    setListLoading(true)
    fetch(API_LIST)
      .then((r) => r.ok ? r.json() : Promise.reject(r.status))
      .then((data) => { setDemands(data); if (data.length > 0) setSelectedId(data[0].id) })
      .catch(() => setListError('Не удалось загрузить список потребностей'))
      .finally(() => setListLoading(false))
  }, [])

  async function handleLoad() {
    if (!selectedId) return
    setLoadError(null)
    try {
      const res = await fetch(API_DETAIL(selectedId))
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const detail = await res.json()
      const skuList = demandToSkuList(detail.groups)
      if (skuList.length === 0) {
        setLoadError('В выбранной потребности нет вареных / варено-копчёных позиций')
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
    <div className={compact ? 'flex flex-col gap-3' : 'rounded-xl border border-slate-200 bg-white p-4 flex flex-col gap-3 w-full max-w-lg'}>
      {!compact && <p className="text-sm font-semibold text-slate-700">Потребность</p>}

      {listLoading ? (
        <p className="text-xs text-slate-400">Загружаем список…</p>
      ) : demands.length === 0 ? (
        <p className="text-xs text-slate-400">Нет сохранённых потребностей</p>
      ) : (
        <div className="flex flex-col gap-1 max-h-48 overflow-y-auto pr-1">
          {demands.map((d) => (
            <label
              key={d.id}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer text-sm transition-colors
                ${selectedId === d.id ? 'bg-blue-50 border border-blue-200' : 'hover:bg-slate-50 border border-transparent'}`}
            >
              <input
                type="radio"
                name="demand"
                value={d.id}
                checked={selectedId === d.id}
                onChange={() => setSelectedId(d.id)}
                className="accent-blue-600"
              />
              <span className="flex-1 truncate text-slate-700">{d.filename}</span>
              <span className="text-xs text-slate-400 shrink-0">{formatDate(d.created_at)}</span>
            </label>
          ))}
        </div>
      )}

      {loadError && (
        <p className="text-xs text-red-500">{loadError}</p>
      )}

      <button
        type="button"
        onClick={handleLoad}
        disabled={!selectedId || simulationLoading}
        className="self-start rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50 transition-colors"
      >
        {simulationLoading ? 'Считаем…' : 'Загрузить'}
      </button>
    </div>
  )
}
