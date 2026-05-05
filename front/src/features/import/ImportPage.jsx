import { useRef, useState } from 'react'

const IMPORT_API = '/api/v1/import/excel'

export default function ImportPage() {
  const fileRef = useRef(null)
  const [status, setStatus] = useState('idle') // idle | loading | success | error
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [dragOver, setDragOver] = useState(false)

  async function handleUpload(file) {
    if (!file) return
    if (!file.name.match(/\.xlsx?$/i)) {
      setError('Выберите файл формата .xlsx')
      return
    }

    setStatus('loading')
    setError(null)
    setResult(null)

    const form = new FormData()
    form.append('file', file)

    try {
      const res = await fetch(IMPORT_API, { method: 'POST', body: form })
      const json = await res.json()
      if (!res.ok) throw new Error(json.detail ?? `HTTP ${res.status}`)
      setResult(json)
      setStatus('success')
    } catch (e) {
      setError(e.message)
      setStatus('error')
    }
  }

  function onFileChange(e) {
    handleUpload(e.target.files?.[0])
  }

  function onDrop(e) {
    e.preventDefault()
    setDragOver(false)
    handleUpload(e.dataTransfer.files?.[0])
  }

  function onDragOver(e) {
    e.preventDefault()
    setDragOver(true)
  }

  function reset() {
    setStatus('idle')
    setResult(null)
    setError(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-800">Импорт из Excel</h1>
        <p className="text-sm text-gray-500 mt-1">Загрузите файл .xlsx — первая строка должна содержать заголовки.</p>
      </div>

      {/* Drop zone */}
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={() => setDragOver(false)}
        onClick={() => fileRef.current?.click()}
        className={[
          'border-2 border-dashed rounded-xl p-10 flex flex-col items-center gap-3 cursor-pointer transition-colors',
          dragOver
            ? 'border-green-500 bg-green-50'
            : 'border-gray-300 bg-white hover:border-green-400 hover:bg-green-50',
        ].join(' ')}
      >
        <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0119 9.414V19a2 2 0 01-2 2z" />
        </svg>
        <span className="text-sm text-gray-500">
          Перетащите файл сюда или <span className="text-green-700 font-medium">выберите</span>
        </span>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={onFileChange}
        />
      </div>

      {/* Loading */}
      {status === 'loading' && (
        <div className="flex items-center gap-3 text-sm text-gray-600">
          <svg className="animate-spin w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          Загрузка и парсинг…
        </div>
      )}

      {/* Error */}
      {status === 'error' && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-3">
          <span className="text-red-500 mt-0.5">✕</span>
          <div className="flex-1">
            <p className="text-sm font-medium text-red-700">Ошибка</p>
            <p className="text-sm text-red-600">{error}</p>
          </div>
          <button onClick={reset} className="text-xs text-red-400 hover:text-red-600">Сбросить</button>
        </div>
      )}

      {/* Result */}
      {status === 'success' && result && (
        <div className="space-y-5">
          {/* Summary bar */}
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-800">{result.filename}</p>
              <p className="text-xs text-green-600 mt-0.5">
                {result.total} товаров · {Object.keys(result.groups).length} типов
              </p>
            </div>
            <button onClick={reset} className="text-xs text-green-600 hover:text-green-800 underline">
              Загрузить другой
            </button>
          </div>

          {/* Groups */}
          {Object.entries(result.groups ?? {}).map(([typeName, rows]) => {
            const safeRows = Array.isArray(rows) ? rows : []
            const headers = safeRows.length > 0 && safeRows[0] ? Object.keys(safeRows[0]) : []
            return (
              <div key={typeName} className="rounded-lg border border-gray-200 overflow-hidden">
                <div className="bg-gray-100 px-4 py-2 flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700">{typeName}</span>
                  <span className="text-xs text-gray-500">{result.counts[typeName]} товаров</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        {headers.map((h) => (
                          <th key={h} className="px-3 py-2 text-left font-medium text-gray-500 whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {safeRows.map((row, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          {headers.map((h) => (
                            <td key={h} className="px-3 py-1.5 text-gray-700 whitespace-nowrap">
                              {row?.[h] ?? '—'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
