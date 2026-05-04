import { createBrowserRouter, NavLink, Outlet } from 'react-router-dom'
import ImportPage from '../features/import/ImportPage'
import RecipesPage from '../features/recipes/RecipesPage'
import ScadaPage from '../features/scada/ScadaPage'
import SimulationPage from '../features/simulation/SimulationPage'

const navClass = ({ isActive }) =>
  isActive ? 'text-sm font-medium text-green-800' : 'text-sm text-gray-600 hover:text-gray-900'

function AppLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-8">
        <span className="text-lg font-bold text-green-700">Экофуд</span>
        <nav className="flex gap-6">
          <NavLink to="/" end className={navClass}>
            Производство
          </NavLink>
          <NavLink to="/recipes" className={navClass}>
            Рецепты
          </NavLink>
          <NavLink to="/simulation" className={navClass}>
            Симуляция
          </NavLink>
          <NavLink to="/import" className={navClass}>
            Импорт
          </NavLink>
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  )
}

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <ScadaPage /> },
      { path: '/recipes', element: <RecipesPage /> },
      { path: '/simulation', element: <SimulationPage /> },
      { path: '/import', element: <ImportPage /> },
    ],
  },
])
