import { useCallback, useEffect, useState } from 'react'

const RECIPES_API = '/api/v1/recipes'

const STAGE_FIELDS = [
  { key: 'kuter',      label: 'Кутер, мин' },
  { key: 'shpric',     label: 'Шприц, мин' },
  { key: 'klipsator',  label: 'Клипсатор, мин' },
  { key: 'osadka',     label: 'Осадка, мин' },
  { key: 'termokamera',label: 'Термокамера, мин' },
  { key: 'ohlazdenie', label: 'Охлаждение, мин' },
  { key: 'upakovka',   label: 'Упаковка, мин' },
]

const emptyForm = () => ({
  code: '', name: '',
  kuter: '', shpric: '', klipsator: '',
  osadka: '', termokamera: '', ohlazdenie: '', upakovka: '',
})

function recipeToForm(r) {
  return {
    code: r.code,
    name: r.name ?? '',
    kuter: String(r.kuter),
    shpric: String(r.shpric),
    klipsator: String(r.klipsator),
    osadka: String(r.osadka),
    termokamera: String(r.termokamera),
    ohlazdenie: String(r.ohlazdenie),
    upakovka: String(r.upakovka),
  }
}

async function apiJson(url, method, body) {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    let detail = text
    try {
      const j = JSON.parse(text)
      if (j?.detail) {
        detail = typeof j.detail === 'string'
          ? j.detail
          : Array.isArray(j.detail)
            ? j.detail.map((x) => x.msg ?? JSON.stringify(x)).join('; ')
            : JSON.stringify(j.detail)
      }
    } catch { /* keep text */ }
    throw new Error(detail || `HTTP ${res.status}`)
  }
  return res.status === 204 ? null : res.json()
}

export default function RecipesPage() {
  const [recipes, setRecipes]       = useState([])
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)
  const [deleting, setDeleting]     = useState(null)  // code удаляемого
  const [error, setError]           = useState(null)
  const [form, setForm]             = useState(emptyForm)
  const [editingCode, setEditingCode] = useState(null) // null = создание, string = редактирование

  const loadRecipes = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(RECIPES_API)
      if (!res.ok) throw new Error(await res.text())
      setRecipes(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadRecipes() }, [loadRecipes])

  function startEdit(recipe) {
    setEditingCode(recipe.code)
    setForm(recipeToForm(recipe))
    setError(null)
  }

  function cancelEdit() {
    setEditingCode(null)
    setForm(emptyForm())
    setError(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      if (editingCode) {
        // PATCH — code не меняется, name + тайминги
        const body = {
          name: form.name.trim() || null,
          ...Object.fromEntries(STAGE_FIELDS.map(({ key }) => [key, Number(form[key])])),
        }
        await apiJson(`${RECIPES_API}/${editingCode}`, 'PATCH', body)
        setEditingCode(null)
        setForm(emptyForm())
      } else {
        // POST — создание
        const body = {
          code: form.code.trim(),
          name: form.name.trim() || null,
          ...Object.fromEntries(STAGE_FIELDS.map(({ key }) => [key, Number(form[key])])),
        }
        await apiJson(RECIPES_API, 'POST', body)
        setForm(emptyForm())
      }
      await loadRecipes()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(code) {
    if (!window.confirm(`Удалить рецепт «${code}»?`)) return
    setDeleting(code)
    setError(null)
    try {
      const res = await fetch(`${RECIPES_API}/${code}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      if (editingCode === code) cancelEdit()
      await loadRecipes()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setDeleting(null)
    }
  }

  const fieldClass =
    'mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm ' +
    'focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600 ' +
    'disabled:bg-gray-100 disabled:text-gray-500'
  const labelClass = 'block text-sm font-medium text-gray-700'

  return (
    <div className="p-6 flex flex-col lg:flex-row gap-10 max-w-6xl">

      {/* Список */}
      <section className="flex-1 min-w-0">
        <h2 className="text-xl font-semibold mb-4">Рецепты</h2>
        {loading && <p className="text-sm text-gray-500">Загрузка…</p>}
        {!loading && recipes.length === 0 && (
          <p className="text-sm text-gray-500">Пока нет рецептов в базе.</p>
        )}
        <ul className="space-y-3">
          {recipes.map((r) => (
            <li
              key={r.id}
              className={`rounded-lg border bg-white px-4 py-3 shadow-sm transition-colors ${
                editingCode === r.code ? 'border-green-400' : 'border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="font-medium text-gray-900">
                  <span className="text-green-800">{r.code}</span>
                  {r.name && <span className="text-gray-600 font-normal"> — {r.name}</span>}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => startEdit(r)}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    Редактировать
                  </button>
                  <button
                    onClick={() => handleDelete(r.code)}
                    disabled={deleting === r.code}
                    className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
                  >
                    {deleting === r.code ? '…' : 'Удалить'}
                  </button>
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-600 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1">
                <span>кутер: {r.kuter} мин</span>
                <span>шприц: {r.shpric} мин</span>
                <span>клипсатор: {r.klipsator} мин</span>
                <span>осадка: {r.osadka} мин</span>
                <span>термокамера: {r.termokamera} мин</span>
                <span>охлаждение: {r.ohlazdenie} мин</span>
                <span>упаковка: {r.upakovka} мин</span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Форма */}
      <section className="w-full lg:w-[380px] shrink-0">
        <h3 className="text-lg font-semibold mb-4">
          {editingCode ? `Редактирование: ${editingCode}` : 'Новый рецепт'}
        </h3>
        {error && (
          <p className="text-sm text-red-600 mb-3" role="alert">{error}</p>
        )}
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
        >
          {/* Код — только при создании */}
          {!editingCode && (
            <div>
              <label htmlFor="recipe-code" className={labelClass}>
                Код <span className="text-gray-500 font-normal">(латиница, как varenka)</span>
              </label>
              <input
                id="recipe-code"
                className={fieldClass}
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                required
                minLength={1}
                maxLength={64}
                pattern="[a-z0-9_\-]+"
                title="Строчные латинские буквы, цифры, _ и -"
                placeholder="varenka"
                autoComplete="off"
              />
            </div>
          )}

          <div>
            <label htmlFor="recipe-name" className={labelClass}>
              Название <span className="text-gray-500 font-normal">(необязательно)</span>
            </label>
            <input
              id="recipe-name"
              className={fieldClass}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              maxLength={256}
              placeholder="Варенка"
              autoComplete="off"
            />
          </div>

          {STAGE_FIELDS.map(({ key, label }) => (
            <div key={key}>
              <label htmlFor={`recipe-${key}`} className={labelClass}>{label}</label>
              <input
                id={`recipe-${key}`}
                type="number"
                className={fieldClass}
                value={form[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                required
                min={1}
                step={1}
              />
            </div>
          ))}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-md bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-600 disabled:opacity-50"
            >
              {saving ? 'Сохранение…' : editingCode ? 'Сохранить' : 'Создать рецепт'}
            </button>
            {editingCode && (
              <button
                type="button"
                onClick={cancelEdit}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                Отмена
              </button>
            )}
          </div>
        </form>
      </section>

    </div>
  )
}
