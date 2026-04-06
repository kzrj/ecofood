import { RouterProvider } from 'react-router-dom'
import { router } from './app/router'

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-8">
        <span className="text-lg font-bold text-green-700">Экофуд</span>
        <nav className="flex gap-6">
          <a href="/" className="text-sm text-gray-600 hover:text-gray-900">Производство</a>
          <a href="/simulation" className="text-sm text-gray-600 hover:text-gray-900">Симуляция</a>
        </nav>
      </header>
      <main>
        <RouterProvider router={router} />
      </main>
    </div>
  )
}
