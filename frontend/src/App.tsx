import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { MotionProvider } from './lib/MotionProvider'
import Layout from './components/Layout'
import { LocationProvider } from './components/LocationProvider'
import Home from './pages/Home'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const FloodGuard = lazy(() => import('./pages/FloodGuard'))
const HeatGuard = lazy(() => import('./pages/HeatGuard'))
const FireGuard = lazy(() => import('./pages/FireGuard'))
const CropShield = lazy(() => import('./pages/CropShield'))
const Drainage = lazy(() => import('./pages/Drainage'))
const Simulation = lazy(() => import('./pages/Simulation'))
const Methodology = lazy(() => import('./pages/Methodology'))
const Roadmap = lazy(() => import('./pages/Roadmap'))
const About = lazy(() => import('./pages/About'))
const DataSources = lazy(() => import('./pages/DataSources'))
const Alerts = lazy(() => import('./pages/Alerts'))
const NotFound = lazy(() => import('./pages/NotFound'))

export default function App() {
  return (
    <MotionProvider>
      <LocationProvider>
        <Suspense
          fallback={
            <div
              className="min-h-[60vh] flex items-center justify-center text-sm text-white/70"
              role="status"
            >
              Loading climate risk view…
            </div>
          }
        >
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="flood" element={<FloodGuard />} />
              <Route path="heat" element={<HeatGuard />} />
              <Route path="fire" element={<FireGuard />} />
              <Route path="crop" element={<CropShield />} />
              <Route path="drainage" element={<Drainage />} />
              <Route path="simulation" element={<Simulation />} />
              <Route path="methodology" element={<Methodology />} />
              <Route path="roadmap" element={<Roadmap />} />
              <Route path="about" element={<About />} />
              <Route path="data-sources" element={<DataSources />} />
              <Route path="alerts" element={<Alerts />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </Suspense>
      </LocationProvider>
    </MotionProvider>
  )
}
