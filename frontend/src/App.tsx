import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import { DataProvider } from './context/DataContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import MarketSelection from './pages/MarketSelection'
import Comparison from './pages/Comparison'
import Recommendations from './pages/Recommendations'
import Admin from './pages/Admin'
import ResetPassword from './pages/ResetPassword'
import ChangePassword from './pages/ChangePassword'
import InactiveClients from './pages/InactiveClients'
import Analysis from './pages/Analysis'
import ExpositionRisques from './pages/ExpositionRisques'

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { isAuthenticated, user } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (allowedRoles && user && !allowedRoles.includes(user.role)) return <Navigate to="/" replace />
  return <>{children}</>
}

function AppRoutes() {
  const { isAuthenticated } = useAuth()
  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/change-password" element={<ChangePassword />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DataProvider>
              <Layout />
            </DataProvider>
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="scoring" element={<MarketSelection />} />
        <Route path="comparaison" element={<Comparison />} />
        <Route path="recommandations" element={<Recommendations />} />
        <Route path="analyse" element={<Analysis />} />
        <Route path="exposition" element={<ExpositionRisques />} />
        <Route
          path="inactive-clients"
          element={
            <ProtectedRoute allowedRoles={['admin', 'souscripteur']}>
              <InactiveClients />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Admin />
            </ProtectedRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#16213e',
              color: '#e2e8f0',
              border: '1px solid #2a2a4a',
              borderRadius: '10px',
              fontSize: '13px',
            },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  )
}
