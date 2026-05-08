import { useCallback, useEffect, useRef, useState } from 'react'

const API = {
  upload: '/api/v1/import/excel',
  save:   '/api/v1/import/save',
  list:   '/api/v1/import/list',
  get:    (id) => `/api/v1/import/${id}`,
  del:    (id) => `/api/v1/import/${id}`,
}

// ─── helpers ────────────────────────────────────────────────────────────────

const BATCH_COLS = new Set(['замесов 150', 'замесов 100', 'излишек'])

function headerClass(h) {
  if (h === 'замесов 150') return 'px-3 py-2 text-left font-semibold text-blue-700 whitespace-nowrap bg-blue-50'
  if (h === 'замесов 100') return 'px-3 py-2 text-left font-semibold text-indigo-700 whitespace-nowrap bg-indigo-50'
  if (h === 'излишек')     return 'px-3 py-2 text-left font-semibold text-amber-700 whitespace-nowrap bg-amber-50'
  return 'px-3 py-2 text-left font-medium text-gray-500 whitespace-nowrap'
}

function cellClass(h) {
  if (h === 'замесов 150') return 'px-3 py-1.5 whitespace-nowrap font-semibold text-blue-700 bg-blue-50'
  if (h === 'замесов 100') return 'px-3 py-1.5 whitespace-nowrap font-semibold text-indigo-700 bg-indigo-50'
  if (h === 'излишек')     return 'px-3 py-1.5 whitespace-nowrap font-semibold text-amber-700 bg-amber-50'
  return 'px-3 py-1.5 text-gray-700 whitespace-nowrap'
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// ─── sub-components ──────────────────────────────────────────────────────────

function BatchSummary({ rows }) {
  const total150    = rows.reduce((s, r) => s + (r['замесов 150'] ?? 0), 0)
  const total100    = rows.reduce((s, r) => s + (r['замесов 100'] ?? 0), 0)
  const totalSurplus = rows.reduce((s, r) => s + (r['излишек'] ?? 0), 0)
  return (
    <div className="flex flex-wrap gap-3 px-4 py-2 border-t border-gray-100 bg-gray-50 text-xs">
      <span className="text-blue-700 font-medium">Замесов 150 кг: <strong>{total150}</strong></span>
      <span className="text-indigo-700 font-medium">Замесов 100 кг: <strong>{total100}</strong></span>
      <span className="text-amber-700 font-medium">Излишек: <strong>{totalSurplus.toFixed(1)} кг</strong></span>
    </div>
  )
}

function GroupsView({ result, saveStatus, onSave, selectedDay, onSelectDay }) {
  if (!result) return null
  const isSaved = saveStatus === 'saved'
  const dayKeys = Object.keys(result.days ?? {})
  const activeGroups = selectedDay === '__total'
    ? (result.groups ?? {})
    : (result.days?.[selectedDay] ?? {})
  const activeCounts = Object.fromEntries(
    Object.entries(activeGroups).map(([k, rows]) => [k, Array.isArray(rows) ? rows.length : 0]),
  )
  const activeTotal = Object.values(activeCounts).reduce((s, n) => s + n, 0)
  return (
    <div className="space-y-5">
      {/* summary bar */}
      <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-green-800">{result.filename}</p>
          <p className="text-xs text-green-600 mt-0.5">
            {activeTotal} товаров · {Object.keys(activeGroups).length} типов
            {result.created_at && <span className="ml-2 text-green-500">{formatDate(result.created_at)}</span>}
          </p>
        </div>
        {onSave && (
          <div className="flex items-center gap-3 shrink-0">
            {saveStatus === 'error' && <span className="text-xs text-red-600">Ошибка сохранения</span>}
            {isSaved
              ? <span className="text-xs text-green-700">Сохранено ✓</span>
              : (
                <button
                  onClick={onSave}
                  disabled={saveStatus === 'saving'}
                  className="text-xs px-3 py-1.5 rounded-md bg-green-700 text-white hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saveStatus === 'saving' ? 'Сохранение…' : 'Сохранить'}
                </button>
              )
            }
          </div>
        )}
      </div>

      {/* days selector */}
      {dayKeys.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onSelectDay('__total')}
            className={[
              'text-xs px-3 py-1.5 rounded-md border transition-colors',
              selectedDay === '__total'
                ? 'bg-green-700 text-white border-green-700'
                : 'bg-white text-gray-600 border-gray-300 hover:border-green-400',
            ].join(' ')}
          >
            Общая
          </button>
          {dayKeys.map((day) => (
            <button
              key={day}
              onClick={() => onSelectDay(day)}
              className={[
                'text-xs px-3 py-1.5 rounded-md border transition-colors',
                selectedDay === day
                  ? 'bg-green-700 text-white border-green-700'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-green-400',
              ].join(' ')}
            >
              {day}
            </button>
          ))}
        </div>
      )}

      {/* groups */}
      {Object.entries(activeGroups).map(([typeName, rows]) => {
        const safeRows = Array.isArray(rows) ? rows : []
        const headers  = safeRows.length > 0 && safeRows[0] ? Object.keys(safeRows[0]) : []
        return (
          <div key={typeName} className="rounded-lg border border-gray-200 overflow-hidden">
            <div className="bg-gray-100 px-4 py-2 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700">{typeName}</span>
              <span className="text-xs text-gray-500">{activeCounts[typeName]} товаров</span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead className="border-b border-gray-200">
                  <tr>{headers.map(h => <th key={h} className={headerClass(h)}>{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {safeRows.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      {headers.map(h => <td key={h} className={cellClass(h)}>{row?.[h] ?? '—'}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <BatchSummary rows={safeRows} />
          </div>
        )
      })}
    </div>
  )
}

// ─── main page ───────────────────────────────────────────────────────────────

export default function ImportPage() {
  const fileRef = useRef(null)

  // upload flow
  const [uploadStatus, setUploadStatus] = useState('idle') // idle|loading|success|error
  const [uploadError, setUploadError]   = useState(null)
  const [dragOver, setDragOver]         = useState(false)

  // right-panel data (from upload OR from list click)
  const [result, setResult]         = useState(null)
  const [saveStatus, setSaveStatus] = useState('idle') // idle|saving|saved|error
  const [isFromSaved, setIsFromSaved] = useState(false) // true → already in DB, hide save btn
  const [selectedDay, setSelectedDay] = useState('__total')

  // left list
  const [list, setList]           = useState([])
  const [listLoading, setListLoading] = useState(false)
  const [activeId, setActiveId]   = useState(null)

  // ── load list ──────────────────────────────────────────────────────────────
  const loadList = useCallback(async () => {
    setListLoading(true)
    try {
      const res = await fetch(API.list)
      if (res.ok) setList(await res.json())
    } finally {
      setListLoading(false)
    }
  }, [])

  useEffect(() => { loadList() }, [loadList])

  // ── upload ─────────────────────────────────────────────────────────────────
  async function handleUpload(file) {
    if (!file) return
    if (!file.name.match(/\.xlsx?$/i)) { setUploadError('Выберите файл формата .xlsx'); return }

    setUploadStatus('loading')
    setUploadError(null)
    setResult(null)
    setActiveId(null)
    setIsFromSaved(false)
    setSaveStatus('idle')
    setSelectedDay('__total')

    const form = new FormData()
    form.append('file', file)
    try {
      const res  = await fetch(API.upload, { method: 'POST', body: form })
      const json = await res.json()
      if (!res.ok) throw new Error(json.detail ?? `HTTP ${res.status}`)
      setResult(json)
      setUploadStatus('success')
    } catch (e) {
      setUploadError(e.message)
      setUploadStatus('error')
    }
  }

  // ── save ───────────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!result) return
    setSaveStatus('saving')
    try {
      const res  = await fetch(API.save, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.detail ?? `HTTP ${res.status}`)
      setSaveStatus('saved')
      loadList()
    } catch {
      setSaveStatus('error')
    }
  }

  // ── open from list ─────────────────────────────────────────────────────────
  async function handleListClick(item) {
    if (activeId === item.id) return
    setActiveId(item.id)
    setResult(null)
    setIsFromSaved(true)
    setSaveStatus('idle')
    setUploadStatus('idle')
    setSelectedDay('__total')
    try {
      const res  = await fetch(API.get(item.id))
      const json = await res.json()
      if (!res.ok) throw new Error()
      setResult(json)
    } catch {
      setResult(null)
    }
  }

  async function handleDelete(item, e) {
    e.stopPropagation()
    const ok = window.confirm(`Удалить "${item.filename}"?`)
    if (!ok) return

    try {
      const res = await fetch(API.del(item.id), { method: 'DELETE' })
      if (!res.ok && res.status !== 404) throw new Error()

      // Если удалили открытую запись — очищаем правую панель
      if (activeId === item.id) {
        setResult(null)
        setActiveId(null)
        setIsFromSaved(false)
        setSaveStatus('idle')
        setSelectedDay('__total')
      }
      await loadList()
    } catch {
      // минимально-инвазивно: можно добавить toast позже
    }
  }

  function resetUpload() {
    setUploadStatus('idle')
    setUploadError(null)
    setResult(null)
    setActiveId(null)
    setIsFromSaved(false)
    setSaveStatus('idle')
    setSelectedDay('__total')
    if (fileRef.current) fileRef.current.value = ''
  }

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-[calc(100vh-57px)]">

      {/* ── LEFT SIDEBAR ── */}
      <aside className="w-64 shrink-0 border-r border-gray-200 bg-white flex flex-col">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-700">Сохранённые</span>
          {listLoading && (
            <svg className="animate-spin w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
          )}
        </div>
        <ul className="flex-1 overflow-y-auto divide-y divide-gray-100">
          {list.length === 0 && !listLoading && (
            <li className="px-4 py-3 text-xs text-gray-400">Пока ничего нет</li>
          )}
          {list.map(item => (
            <li key={item.id}>
              <div
                className={[
                  'px-4 py-3 hover:bg-gray-50 transition-colors',
                  activeId === item.id ? 'bg-green-50 border-l-2 border-green-600' : '',
                ].join(' ')}
              >
                <div className="flex items-start justify-between gap-2">
                  <button onClick={() => handleListClick(item)} className="min-w-0 text-left flex-1">
                    <p className="text-xs font-medium text-gray-800 truncate">{item.filename}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDate(item.created_at)}</p>
                  </button>
                  <button
                    onClick={(e) => handleDelete(item, e)}
                    className="text-[11px] text-red-400 hover:text-red-600 shrink-0"
                    title="Удалить"
                  >
                    Удалить
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </aside>

      {/* ── RIGHT PANEL ── */}
      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-800">Импорт из Excel</h1>
            <p className="text-sm text-gray-500 mt-1">Загрузите файл .xlsx — лист «Завод план»</p>
          </div>
          {(uploadStatus === 'success' || isFromSaved) && (
            <button onClick={resetUpload} className="text-xs text-gray-500 hover:text-gray-700 underline shrink-0 mt-1">
              Загрузить другой
            </button>
          )}
        </div>

        {/* drop zone — показываем только когда нет результата */}
        {!result && uploadStatus !== 'loading' && (
          <div
            onDrop={e => { e.preventDefault(); setDragOver(false); handleUpload(e.dataTransfer.files?.[0]) }}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onClick={() => fileRef.current?.click()}
            className={[
              'border-2 border-dashed rounded-xl p-10 flex flex-col items-center gap-3 cursor-pointer transition-colors',
              dragOver ? 'border-green-500 bg-green-50' : 'border-gray-300 bg-white hover:border-green-400 hover:bg-green-50',
            ].join(' ')}
          >
            <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0119 9.414V19a2 2 0 01-2 2z"/>
            </svg>
            <span className="text-sm text-gray-500">
              Перетащите файл сюда или <span className="text-green-700 font-medium">выберите</span>
            </span>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={e => handleUpload(e.target.files?.[0])}/>
          </div>
        )}

        {/* loading */}
        {uploadStatus === 'loading' && (
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <svg className="animate-spin w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
            Загрузка и парсинг…
          </div>
        )}

        {/* upload error */}
        {uploadStatus === 'error' && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-3">
            <span className="text-red-500 mt-0.5">✕</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-red-700">Ошибка</p>
              <p className="text-sm text-red-600">{uploadError}</p>
            </div>
            <button onClick={resetUpload} className="text-xs text-red-400 hover:text-red-600">Сбросить</button>
          </div>
        )}

        {/* groups */}
        <GroupsView
          result={result}
          saveStatus={isFromSaved ? 'saved' : saveStatus}
          onSave={isFromSaved ? null : handleSave}
          selectedDay={selectedDay}
          onSelectDay={setSelectedDay}
        />
      </main>
    </div>
  )
}
