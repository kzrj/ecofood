import { useEffect, useMemo, useRef, useState } from 'react'
import { useSimulationStore } from '../store/useSimulationStore'
import { demandToSkuList } from '../store/domain/demandToSkuList'

const BASE_TYPE_OPTIONS = [
  { value: 'varenka', label: 'Варенка' },
  { value: 'polukopch', label: 'Копченка' },
]

/** Сортировка ключей дней вида «ПН 25.03» / «25.03.2026» для стабильного порядка в UI */
function sortDemandDayKeys(keys) {
  return [...keys].sort((a, b) => {
    const ma = a.match(/(\d{2})\.(\d{2})(?:\.(\d{4}))?/)
    const mb = b.match(/(\d{2})\.(\d{2})(?:\.(\d{4}))?/)
    if (ma && mb) {
      const ya = ma[3] ? parseInt(ma[3], 10) : 0
      const yb = mb[3] ? parseInt(mb[3], 10) : 0
      if (ya !== yb) return ya - yb
      const da = parseInt(ma[1], 10)
      const ma_m = parseInt(ma[2], 10)
      const db = parseInt(mb[1], 10)
      const mb_m = parseInt(mb[2], 10)
      if (ma_m !== mb_m) return ma_m - mb_m
      return da - db
    }
    return a.localeCompare(b, 'ru')
  })
}

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
  /** Кэш полной потребности по id (groups + days) */
  const [demandDetailCache, setDemandDetailCache] = useState({})
  const [demandDetailLoadingId, setDemandDetailLoadingId] = useState(null)
  const [selectedDayKey, setSelectedDayKey] = useState(null)
  const [buildLoading, setBuildLoading] = useState(false)
  const [actionError, setActionError] = useState(null)
  /** Перетаскивание строк очереди: индекс источника (null когда не тянем) */
  const [dragFromIndex, setDragFromIndex] = useState(null)
  const dragFromRef = useRef(null)
  /** Уже успешно загруженные потребности (не дёргаем API повторно при том же id) */
  const demandLoadedIdsRef = useRef(new Set())

  const recipeOptions = useMemo(() => {
    const allowed = BASE_TYPE_OPTIONS.filter((opt) => recipeBook?.[opt.value])
    return allowed.length > 0 ? allowed : BASE_TYPE_OPTIONS
  }, [recipeBook])
  const activeListMeta = useMemo(
    () => savedLists.find((x) => x.id === activeListId) ?? null,
    [savedLists, activeListId],
  )

  const sortedDayKeysForSelected = useMemo(() => {
    const detail = selectedDemandId ? demandDetailCache[selectedDemandId] : null
    const days = detail?.days
    if (!days || typeof days !== 'object') return []
    return sortDemandDayKeys(Object.keys(days))
  }, [selectedDemandId, demandDetailCache])

  useEffect(() => {
    loadSavedLists()
    loadDemands()
  }, [])

  useEffect(() => {
    if (!selectedDemandId) return
    if (demandLoadedIdsRef.current.has(selectedDemandId)) return

    const id = selectedDemandId
    let cancelled = false
    setDemandDetailLoadingId(id)
    fetch(`/api/v1/import/${id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((detail) => {
        if (!cancelled) {
          demandLoadedIdsRef.current.add(id)
          setDemandDetailCache((prev) => ({ ...prev, [id]: detail }))
        }
      })
      .catch(() => {
        if (!cancelled) setActionError('Не удалось загрузить потребность')
      })
      .finally(() => {
        if (!cancelled) setDemandDetailLoadingId(null)
      })

    return () => {
      cancelled = true
    }
  }, [selectedDemandId])

  useEffect(() => {
    setSelectedDayKey(null)
  }, [selectedDemandId])

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
      if (rows.length > 0) {
        setSelectedDemandId((prev) => prev ?? rows[0].id)
      }
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
    if (!selectedDemandId || !selectedDayKey) return
    setActionError(null)
    setBuildLoading(true)
    try {
      const selectedDemand = demands.find((d) => d.id === selectedDemandId)
      let detail = demandDetailCache[selectedDemandId]
      if (!detail) {
        const res = await fetch(`/api/v1/import/${selectedDemandId}`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        detail = await res.json()
        demandLoadedIdsRef.current.add(selectedDemandId)
        setDemandDetailCache((prev) => ({ ...prev, [selectedDemandId]: detail }))
      }
      const dayGroups = detail.days?.[selectedDayKey]
      if (!dayGroups || typeof dayGroups !== 'object') {
        setActionError('Нет данных за выбранный день')
        return
      }
      const builtQueue = demandToSkuList(dayGroups)
      if (builtQueue.length === 0) {
        setActionError('За этот день нет варёных / варено-копчёных позиций')
        return
      }
      setActiveListId(null)
      setQueue(builtQueue)
      const baseName = detail?.filename || selectedDemand?.filename || ''
      setListName(`${baseName} — ${selectedDayKey}`)
    } catch (e) {
      setActionError(e.message ?? 'Ошибка формирования списка из потребности')
    } finally {
      setBuildLoading(false)
    }
  }

  function handleSelectDemand(id) {
    setSelectedDemandId(id)
    setSelectedDayKey(null)
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
    <div className="flex h-[calc(100vh-120px)] min-h-0 border border-slate-200 rounded-xl overflow-hidden bg-white">
      <aside className="w-48 shrink-0 min-h-0 border-r border-slate-200 bg-slate-50 flex flex-col">
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

      <aside className="w-[200px] shrink-0 min-h-0 border-r border-slate-200 bg-slate-50 p-2.5 flex flex-col gap-2">
        <div>
          <p className="text-sm font-medium text-slate-700">Сформировать из потребности</p>
          <p className="text-xs text-slate-500 mt-0.5">Выберите файл и один день.</p>
        </div>
        {demandsLoading ? (
          <p className="text-xs text-slate-400">Загружаем потребности...</p>
        ) : demands.length === 0 ? (
          <p className="text-xs text-slate-400">Нет сохраненных потребностей</p>
        ) : (
          <div className="flex-1 min-h-0 flex flex-col gap-2 overflow-y-auto pr-1">
            {demands.map((item) => (
              <div
                key={item.id}
                className={`rounded-lg border transition-colors ${
                  selectedDemandId === item.id
                    ? 'border-blue-200 bg-white shadow-sm'
                    : 'border-slate-200/80 bg-white/60'
                }`}
              >
                <label className="flex items-center gap-2 px-2 py-2 cursor-pointer text-sm">
                  <input
                    type="radio"
                    name="demand-for-build"
                    value={item.id}
                    checked={selectedDemandId === item.id}
                    onChange={() => handleSelectDemand(item.id)}
                    className="accent-blue-600 shrink-0"
                  />
                  <span className="flex-1 truncate text-slate-800">{item.filename}</span>
                </label>
                {selectedDemandId === item.id && (
                  <div className="border-t border-slate-100 px-2 pb-2 pt-1 space-y-1">
                    {demandDetailLoadingId === item.id ? (
                      <p className="text-xs text-slate-400 px-1">Загрузка дней…</p>
                    ) : sortedDayKeysForSelected.length === 0 ? (
                      <p className="text-xs text-amber-700 px-1">
                        Нет разбивки по дням в файле
                      </p>
                    ) : (
                      sortedDayKeysForSelected.map((dayKey) => (
                        <label
                          key={dayKey}
                          className={`flex items-center gap-2 rounded-md px-2 py-1.5 cursor-pointer text-xs transition-colors ${
                            selectedDayKey === dayKey
                              ? 'bg-blue-50 text-slate-800'
                              : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <input
                            type="radio"
                            name="demand-day-key"
                            value={dayKey}
                            checked={selectedDayKey === dayKey}
                            onChange={() => setSelectedDayKey(dayKey)}
                            className="accent-blue-600 shrink-0"
                          />
                          <span className="truncate">{dayKey}</span>
                        </label>
                      ))
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={handleBuildFromDemand}
          disabled={
            !selectedDemandId ||
            !selectedDayKey ||
            buildLoading ||
            demandDetailLoadingId === selectedDemandId
          }
          className="self-start rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
        >
          {buildLoading ? 'Формируем...' : 'Сформировать новый список'}
        </button>
      </aside>

      <div className="flex-1 min-w-0 min-h-0 flex flex-col gap-4 p-4 overflow-hidden bg-white">
        <div className="shrink-0 grid gap-4 lg:grid-cols-2 lg:items-start">
          <div className="rounded-lg border border-slate-200 p-3 flex flex-col gap-3 min-w-0">
            <p className="text-sm font-medium text-slate-700">Параметры списка</p>
            <label className="flex flex-col gap-1 text-sm text-slate-600">
              Название списка
              <input
                type="text"
                value={listName}
                onChange={(e) => setListName(e.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-slate-800 outline-none focus:border-blue-400"
                placeholder="Например, Смена 1"
              />
            </label>
            <div className="flex flex-wrap items-center gap-2">
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

          <div className="rounded-lg border border-slate-200 p-3 flex flex-col gap-3 min-w-0">
            <p className="text-sm font-medium text-slate-700">Создание SKU</p>
            <div className="grid gap-3 sm:grid-cols-3">
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
        </div>

        {actionError && <p className="shrink-0 text-xs text-red-500">{actionError}</p>}

        <div className="flex-1 min-h-0 flex flex-col rounded-lg border border-slate-200 p-3 gap-3 min-w-0">
          <div className="shrink-0 flex flex-col gap-0.5">
            <p className="text-sm font-medium text-slate-700">Очередность SKU на вход</p>
            <p className="text-xs text-slate-400">
              Перетащите строку за ручку, чтобы изменить порядок. Две колонки: нумерация идёт строка за строкой слева направо. После изменений нажмите «Сохранить».
            </p>
          </div>
          {queue.length === 0 ? (
            <p className="text-xs text-slate-400 shrink-0">Список пуст</p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 flex-1 min-h-0 overflow-y-auto pr-1 content-start auto-rows-min">
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
                  className={`flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-sm transition-opacity cursor-grab active:cursor-grabbing min-w-0 ${
                    dragFromIndex === index
                      ? 'border-blue-300 bg-blue-50/80 opacity-60'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span
                    className="shrink-0 select-none text-slate-400 text-base leading-none"
                    title="Потянуть для перемещения"
                    aria-hidden
                  >
                    ⠿
                  </span>
                  <span className="w-5 shrink-0 text-slate-400 tabular-nums text-[11px]">{index + 1}.</span>
                  <span className="flex-1 min-w-0 truncate text-slate-700 text-xs sm:text-sm">{item.name || 'Без названия'}</span>
                  <span className="shrink-0 truncate max-w-[4.5rem] text-right text-slate-500 text-[11px] tabular-nums">
                    {recipeOptions.find((x) => x.value === item.recipe)?.label ?? item.recipe}
                  </span>
                  <span className="shrink-0 text-slate-500 text-[11px] tabular-nums">{item.weight}кг</span>
                  <button
                    type="button"
                    draggable={false}
                    onDragStart={(e) => e.stopPropagation()}
                    onClick={() => handleDelete(item.id)}
                    className="shrink-0 inline-flex h-7 w-7 items-center justify-center rounded text-red-600 hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-red-400"
                    aria-label="Удалить из очереди"
                    title="Удалить"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden>
                      <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                    </svg>
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="col-span-full w-full rounded border border-dashed border-slate-200 py-2 text-xs text-slate-400 hover:border-slate-300 hover:bg-slate-50"
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
            className="shrink-0 self-start rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {simulationLoading ? 'Считаем…' : 'Запустить по списку'}
          </button>
        </div>
      </div>
    </div>
  )
}
