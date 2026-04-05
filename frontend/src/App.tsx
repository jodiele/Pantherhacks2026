import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { SuntologyProvider } from './context/SuntologyContext'
import { AppLayout } from './layout/AppLayout'
import { HomePage } from './pages/HomePage'
import { LearnPage } from './pages/LearnPage'
import { ResourcesPage } from './pages/ResourcesPage'
import { CoveragePage } from './pages/CoveragePage'
import { ScanPage } from './pages/ScanPage'
import { UvPage } from './pages/UvPage'
import { AuthPage } from './pages/AuthPage'
import './App.css'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SuntologyProvider>
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route element={<AppLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/uv" element={<UvPage />} />
              <Route path="/scan" element={<ScanPage />} />
              <Route path="/coverage" element={<CoveragePage />} />
              <Route path="/learn" element={<LearnPage />} />
              <Route path="/resources" element={<ResourcesPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </SuntologyProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
