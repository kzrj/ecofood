import { useState } from 'react'

const STAGES = [
  { key: 'kuter',       label: 'Кутер' },
  { key: 'shpric',      label: 'Шприц' },
  { key: 'klipsator',   label: 'Клипсатор' },
  { key: 'osadka',      label: 'Осадка' },
  { key: 'termokamera', label: 'Термокамера' },
  { key: 'ohlazdenie',  label: 'Охлаждение' },
  { key: 'upakovka',    label: 'Упаковка' },
]

export default function RecipeNormsTable({ recipeBook }) {
  const [open, setOpen] = useState(false)
  const recipes = Object.values(recipeBook)

  return (
    <div className="border border-gray-200 rounded-lg bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg"
      >
        <span>Нормы по рецептам</span>
        <span className="text-gray-400 text-xs">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="overflow-x-auto border-t border-gray-100">
          {recipes.length === 0 ? (
            <p className="px-4 py-3 text-sm text-gray-500">Нет рецептов в базе.</p>
          ) : (
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 text-left font-medium text-gray-600 whitespace-nowrap">Рецепт</th>
                  {STAGES.map(({ key, label }) => (
                    <th key={key} className="px-3 py-2 text-right font-medium text-gray-600 whitespace-nowrap">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recipes.map((r) => (
                  <tr key={r.code} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium text-green-800 whitespace-nowrap">
                      {r.name ? `${r.name} (${r.code})` : r.code}
                    </td>
                    {STAGES.map(({ key }) => (
                      <td key={key} className="px-3 py-2 text-right text-gray-700 tabular-nums whitespace-nowrap">
                        {r[key] != null ? `${r[key]} мин` : '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
