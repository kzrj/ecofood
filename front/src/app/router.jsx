import { createBrowserRouter } from 'react-router-dom'
import ScadaPage from '../features/scada/ScadaPage'
import SimulationPage from '../features/simulation/SimulationPage'

export const router = createBrowserRouter([
  { path: '/',           element: <ScadaPage /> },
  { path: '/simulation', element: <SimulationPage /> },
])
