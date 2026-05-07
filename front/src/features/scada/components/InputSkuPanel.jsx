import { useEffect, useMemo, useRef, useState } from 'react'
import { useSimulationStore } from '../store/useSimulationStore'
import { demandToSkuList } from '../store/domain/demandToSkuList'

const BASE_TYPE_OPTIONS = [
  { value: 'varenka', label: 'Варенка' },
  { value: 'polukopch', label: 'Копченка' },
]

export default function InputSkuPanel({ recipeBook }) {
  const { runSimulation, simulationLoading } = useSimulationStore()
  const [listName, setListName] = useState('')
  const [name, setName] = useState('')
  const [recipe, setRecipe] = useState('varenka')
  const [weight, setWeight] = useState('100')
  const [queue, setQueue] = useState([])
  const [savedLists, setSavedLists] = useState([])
  const [activeListId, setActiveListId] = useState(null)
  const [listLoading, setListLoading] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [setSimulationLoading, setSetSimulationLoading] = useState(false)
  const [demands, setDemands] = useState([])
  const [demandsLoading, setDemandsLoading] = useState(false)
  const [selectedDemandId, setSelectedDemandId] = useState(null)
  const [buildLoading, setBuildLoading] = useState(false)
  const [actionError, setActionError] = useState(null)
  /** Перетаскивание строк очереди: индекс источника (null когда не тянем) */
  const [dragFromIndex, setDragFromIndex] = useState(null)
  const dragFromRef = useRef(null)

  const recipeOptions = useMemo(() => {
    const allowed = BASE_TYPE_OPTIONS.filter((opt) => recipeBook?.[opt.value])
    return allowed.length > 0 ? allowed : BASE_TYPE_OPTIONS
  }, [recipeBook])
  const activeListMeta = useMemo(
    () => savedLists.find((x) => x.id === activeListId) ?? null,
    [savedLists, activeListId],
  )

  useEffect(() => {
    loadSavedLists()
    loadDemands()
  }, [])

  async function loadSavedLists() {
    setListLoading(true)
    try {
      const res = await fetch('/api/v1/sku-lists')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setSavedLists(Array.isArray(data) ? data : [])
    } catch (e) {
      setActionError(e.message ?? 'Ошибка загрузки списков')
    } finally {
      setListLoading(false)
    }
  }

  async function loadDemands() {
    setDemandsLoading(true)
    try {
      const res = await fetch('/api/v1/import/list')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const rows = Array.isArray(data) ? data : []
      setDemands(rows)
      if (rows.length > 0) setSelectedDemandId(rows[0].id)
    } catch (e) {
      setActionError(e.message ?? 'Ошибка загрузки потребностей')
    } finally {
      setDemandsLoading(false)
    }
  }

  async function handleOpenSavedList(id) {
    if (!id || id === activeListId) return
    setActionError(null)
    try {
      const res = await fetch(`/api/v1/sku-lists/${id}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setActiveListId(data.id)
      setListName(data.name ?? '')
      setQueue(Array.isArray(data.items) ? data.items : [])
    } catch (e) {
      setActionError(e.message ?? 'Ошибка загрузки списка')
    }
  }

  async function handleSaveList() {
    setActionError(null)
    setSaveLoading(true)
    try {
      const current = savedLists.find((x) => x.id === activeListId)
      const body = {
        name: listName.trim() || 'Без названия',
        items: queue,
        for_simulation: current?.for_simulation ?? false,
      }
      const res = await fetch(
        activeListId ? `/api/v1/sku-lists/${activeListId}` : '/api/v1/sku-lists',
        {
          method: activeListId ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data?.detail ?? `HTTP ${res.status}`)
      setActiveListId(data.id)
      setListName(data.name ?? '')
      await loadSavedLists()
    } catch (e) {
      setActionError(e.message ?? 'Ошибка сохранения')
    } finally {
      setSaveLoading(false)
    }
  }

  async function handleSetForSimulation(value) {
    if (!activeListId) return
    setActionError(null)
    setSetSimulationLoading(true)
    try {
      const body = {
        name: listName.trim() || 'Без названия',
        items: queue,
        for_simulation: value,
      }
      const res = await fetch(`/api/v1/sku-lists/${activeListId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.detail ?? `HTTP ${res.status}`)
      await loadSavedLists()
    } catch (e) {
      setActionError(e.message ?? 'Ошибка установки флага "на симуляцию"')
    } finally {
      setSetSimulationLoading(false)
    }
  }

  async function handleDeleteList() {
    if (!activeListId) return
    setActionError(null)
    setDeleteLoading(true)
    try {
      const res = await fetch(`/api/v1/sku-lists/${activeListId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setActiveListId(null)
      setListName('')
      setQueue([])
      await loadSavedLists()
    } catch (e) {
      setActionError(e.message ?? 'Ошибка удаления')
    } finally {
      setDeleteLoading(false)
    }
  }

  async function handleBuildFromDemand() {
    if (!selectedDemandId) return
    setActionError(null)
    setBuildLoading(true)
    try {
      const selectedDemand = demands.find((d) => d.id === selectedDemandId)
      const res = await fetch(`/api/v1/import/${selectedDemandId}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const detail = await res.json()
      const builtQueue = demandToSkuList(detail?.groups ?? {})
      setActiveListId(null)
      setQueue(builtQueue)
      setListName(detail?.filename || selectedDemand?.filename || '')
    } catch (e) {
      setActionError(e.message ?? 'Ошибка формирования списка из потребности')
    } finally {
      setBuildLoading(false)
    }
  }

  function handleNewList() {
    setActiveListId(null)
    setListName('')
    setQueue([])
    setName('')
    setWeight('100')
    setActionError(null)
  }

  function handleAddSku() {
    const id = `manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const parsedWeight = Number(weight)
    setQueue((prev) => [
      ...prev,
      {
        id,
        recipe,
        weight: Number.isFinite(parsedWeight) ? parsedWeight : 0,
        name: name.trim(),
        sku_type: recipeOptions.find((x) => x.value === recipe)?.label ?? recipe,
      },
    ])
    setName('')
    setWeight('100')
  }

  function handleDelete(id) {
    setQueue((prev) => prev.filter((item) => item.id !== id))
  }

  /** Вставить элемент с индекса `from` перед строкой с индексом `to` */
  function moveQueueItem(items, from, to) {
    if (from === to || from < 0 || to < 0 || from >= items.length || to > items.length) {
      return items
    }
    const next = [...items]
    const [removed] = next.splice(from, 1)
    const insertAt = from < to ? to - 1 : to
    next.splice(insertAt, 0, removed)
    return next
  }

  function handleQueueDragStart(index) {
    dragFromRef.current = index
    setDragFromIndex(index)
  }

  function handleQueueDragEnd() {
    dragFromRef.current = null
    setDragFromIndex(null)
  }

  function handleQueueDragOver(e) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  function handleQueueDrop(toIndex) {
    const from = dragFromRef.current
    dragFromRef.current = null
    setDragFromIndex(null)
    if (from === null || from === toIndex) return
    setQueue((prev) => moveQueueItem(prev, from, toIndex))
  }

  function handleQueueDropAtEnd(e) {
    e.preventDefault()
    const from = dragFromRef.current
    dragFromRef.current = null
    setDragFromIndex(null)
    if (from === null) return
    setQueue((prev) => {
      const to = prev.length
      if (from === to - 1) return prev
      return moveQueueItem(prev, from, to)
    })
  }

  return (
    <div className="flex h-[calc(100vh-120px)] border border-slate-200 rounded-xl overflow-hidden bg-white">
      <aside className="w-64 shrink-0 border-r border-slate-200 bg-slate-50 flex flex-col">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-700">Сохраненные списки</p>
          {listLoading && <span className="text-xs text-slate-400">...</span>}
        </div>
        <div className="p-2">
          <button
            type="button"
            onClick={handleNewList}
            className="w-full rounded-md bg-slate-800 px-3 py-2 text-sm text-white hover:bg-slate-700"
          >
            Новый список
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {savedLists.length === 0 && !listLoading ? (
            <p className="px-2 py-3 text-xs text-slate-400">Пока нет сохраненных списков</p>
          ) : (
            savedLists.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleOpenSavedList(item.id)}
                className={`w-full rounded-md border px-3 py-2 text-left text-sm ${
                  activeListId === item.id
                    ? 'border-blue-300 bg-blue-50'
                    : 'border-transparent hover:border-slate-200 hover:bg-white'
                }`}
              >
                <p className="truncate font-medium text-slate-700">{item.name}</p>
                <p className="text-xs text-slate-400 mt-0.5">{item.count} SKU</p>
                {item.for_simulation && (
                  <span className="inline-block mt-1 rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
                    На симуляцию
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </aside>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          <div className="rounded-lg border border-slate-200 p-3 flex flex-col gap-3">
            <p className="text-sm font-medium text-slate-700">Параметры списка</p>
            <label className="flex flex-col gap-1 text-sm text-slate-600 max-w-xl">
              Название списка
              <input
                type="text"
                value={listName}
                onChange={(e) => setListName(e.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-slate-800 outline-none focus:border-blue-400"
                placeholder="Например, Смена 1"
              />
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSaveList}
                disabled={saveLoading}
                className="rounded-md bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-600 disabled:opacity-50"
              >
                {saveLoading ? 'Сохраняем...' : activeListId ? 'Сохранить изменения' : 'Сохранить'}
              </button>
              <button
                type="button"
                onClick={handleDeleteList}
                disabled={!activeListId || deleteLoading}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50"
              >
                {deleteLoading ? 'Удаляем...' : 'Удалить'}
              </button>
              <button
                type="button"
                onClick={() => handleSetForSimulation(!activeListMeta?.for_simulation)}
                disabled={!activeListId || setSimulationLoading}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
              >
                {setSimulationLoading
                  ? 'Обновляем флаг...'
                  : activeListMeta?.for_simulation
                    ? 'Убрать с симуляции'
                    : 'На симуляцию'}
              </button>
            </div>
          </div>
          {actionError && <p className="text-xs text-red-500">{actionError}</p>}

        <div className="rounded-lg border border-slate-200 p-3 flex flex-col gap-3">
          <p className="text-sm font-medium text-slate-700">Создание SKU</p>
          <div className="grid gap-3 md:grid-cols-3">
            <label className="flex flex-col gap-1 text-sm text-slate-600">
              Название
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-slate-800 outline-none focus:border-blue-400"
                placeholder="Например, Докторская"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-slate-600">
              Тип
              <select
                value={recipe}
                onChange={(e) => setRecipe(e.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-slate-800 outline-none focus:border-blue-400"
              >
                {recipeOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm text-slate-600">
              Вес
              <input
                type="number"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-slate-800 outline-none focus:border-blue-400"
                placeholder="100"
              />
            </label>
          </div>
          <button
            type="button"
            onClick={handleAddSku}
            className="self-start rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Добавить
          </button>
        </div>

        <div className="rounded-lg border border-slate-200 p-3 flex flex-col gap-3">
          <div className="flex flex-col gap-0.5">
            <p className="text-sm font-medium text-slate-700">Очередность SKU на вход</p>
            <p className="text-xs text-slate-400">Перетащите строку за ручку, чтобы изменить порядок. После изменений нажмите «Сохранить».</p>
          </div>
          {queue.length === 0 ? (
            <p className="text-xs text-slate-400">Список пуст</p>
          ) : (
            <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
              {queue.map((item, index) => (
                <div
                  key={item.id}
                  role="listitem"
                  draggable
                  onDragStart={(e) => {
                    handleQueueDragStart(index)
                    e.dataTransfer.effectAllowed = 'move'
                    e.dataTransfer.setData('text/plain', String(index))
                  }}
                  onDragEnd={handleQueueDragEnd}
                  onDragOver={handleQueueDragOver}
                  onDrop={(e) => {
                    e.preventDefault()
                    handleQueueDrop(index)
                  }}
                  className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-opacity cursor-grab active:cursor-grabbing ${
                    dragFromIndex === index
                      ? 'border-blue-300 bg-blue-50/80 opacity-60'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span
                    className="shrink-0 select-none text-slate-400 text-lg leading-none px-0.5"
                    title="Потянуть для перемещения"
                    aria-hidden
                  >
                    ⠿
                  </span>
                  <span className="w-5 shrink-0 text-slate-400 tabular-nums">{index + 1}.</span>
                  <span className="flex-1 min-w-0 truncate text-slate-700">{item.name || 'Без названия'}</span>
                  <span className="shrink-0 text-slate-500">{recipeOptions.find((x) => x.value === item.recipe)?.label ?? item.recipe}</span>
                  <span className="shrink-0 text-slate-500">{item.weight} кг</span>
                  <button
                    type="button"
                    draggable={false}
                    onDragStart={(e) => e.stopPropagation()}
                    onClick={() => handleDelete(item.id)}
                    className="shrink-0 rounded-md px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                  >
                    Удалить
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="w-full rounded border border-dashed border-slate-200 py-2 text-xs text-slate-400 hover:border-slate-300 hover:bg-slate-50"
                onDragOver={handleQueueDragOver}
                onDrop={handleQueueDropAtEnd}
              >
                В конец списка
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={() => runSimulation(queue)}
            disabled={queue.length === 0 || simulationLoading}
            className="self-start rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {simulationLoading ? 'Считаем…' : 'Запустить по списку'}
          </button>
        </div>
      </div>

      <aside className="w-[280px] shrink-0 border-l border-slate-200 bg-slate-50 p-3 flex flex-col gap-3">
        <p className="text-sm font-medium text-slate-700">Сформировать из потребности</p>
        {demandsLoading ? (
          <p className="text-xs text-slate-400">Загружаем потребности...</p>
        ) : demands.length === 0 ? (
          <p className="text-xs text-slate-400">Нет сохраненных потребностей</p>
        ) : (
          <div className="flex-1 min-h-0 flex flex-col gap-1 overflow-y-auto pr-1">
            {demands.map((item) => (
              <label
                key={item.id}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer text-sm transition-colors
                  ${selectedDemandId === item.id ? 'bg-blue-50 border border-blue-200' : 'hover:bg-white border border-transparent'}`}
              >
                <input
                  type="radio"
                  name="demand-for-build"
                  value={item.id}
                  checked={selectedDemandId === item.id}
                  onChange={() => setSelectedDemandId(item.id)}
                  className="accent-blue-600"
                />
                <span className="flex-1 truncate text-slate-700">{item.filename}</span>
              </label>
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={handleBuildFromDemand}
          disabled={!selectedDemandId || buildLoading}
          className="self-start rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
        >
          {buildLoading ? 'Формируем...' : 'Сформировать новый список'}
        </button>
      </aside>
    </div>
  )
}
