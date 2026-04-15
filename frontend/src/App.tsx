import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import { DataProvider } from './context/DataContext'
import Layout from './components/Layout'
import ErrorBoundary from './components/ErrorBoundary'

// ── Lazy-loaded pages (P6 — code splitting) ───────────────────────────────────
const Home = lazy(() => import('./pages/Home'))
const ModelisationHome = lazy(() => import('./pages/ModelisationHome'))
const Login = lazy(() => import('./pages/Login'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const MarketSelection = lazy(() => import('./pages/MarketSelection'))
const Comparison = lazy(() => import('./pages/Comparison'))
const Recommendations = lazy(() => import('./pages/Recommendations'))
const Admin = lazy(() => import('./pages/Admin'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))
const ChangePassword = lazy(() => import('./pages/ChangePassword'))
const Analysis = lazy(() => import('./pages/Analysis'))
const ExpositionRisques = lazy(() => import('./pages/ExpositionRisques'))
const CedanteAnalysis = lazy(() => import('./pages/CedanteAnalysis'))
const TargetShare = lazy(() => import('./pages/TargetShare'))
const FacSaturation = lazy(() => import('./pages/FacSaturation'))
const BrokerAnalysis = lazy(() => import('./pages/BrokerAnalysis'))
const BrokerDetail = lazy(() => import('./pages/BrokerDetail'))
const AffairesTraites = lazy(() => import('./pages/AffairesTraites'))
const PanelSecurites = lazy(() => import('./pages/PanelSecurites'))
const FacToFac = lazy(() => import('./pages/FacToFac'))
const ScarLayout = lazy(() => import('./components/cartographie/ScarLayout'))
const CartographieNonVie = lazy(() => import('./pages/CartographieNonVie'))
const CartographieVie = lazy(() => import('./pages/CartographieVie'))
const CartographieMacro = lazy(() => import('./pages/CartographieMacro'))
const CartographieGouvernance = lazy(() => import('./pages/CartographieGouvernance'))

// ── Loading fallback ──────────────────────────────────────────────────────────
function LoadingFallback() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '50vh',
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          border: '3px solid hsl(83,52%,36%)',
          borderTopColor: 'transparent',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

// ── Protected Route ───────────────────────────────────────────────────────────
function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { isAuthenticated, user } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (allowedRoles && user && !allowedRoles.includes(user.role)) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

function AppRoutes() {
  const { isAuthenticated } = useAuth()
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        {/* ── Public landing routes (Axe 1 / Axe 2 entry) ── */}
        <Route path="/" element={<Home />} />
        <Route path="/modelisation" element={<ModelisationHome />} />

        {/* ── Cartographie SCAR (Axe 2) — public, olive navbar ── */}
        <Route element={<ScarLayout />}>
          <Route path="/modelisation/cartographie/non-vie" element={<ErrorBoundary><CartographieNonVie /></ErrorBoundary>} />
          <Route path="/modelisation/cartographie/vie" element={<ErrorBoundary><CartographieVie /></ErrorBoundary>} />
          <Route path="/modelisation/cartographie/macroeconomie" element={<ErrorBoundary><CartographieMacro /></ErrorBoundary>} />
          <Route path="/modelisation/cartographie/gouvernance" element={<ErrorBoundary><CartographieGouvernance /></ErrorBoundary>} />
        </Route>

        <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/change-password" element={<ChangePassword />} />
        <Route
          element={
            <ProtectedRoute>
              <DataProvider>
                <Layout />
              </DataProvider>
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
          <Route path="/scoring" element={<ErrorBoundary><MarketSelection /></ErrorBoundary>} />
          <Route path="/comparaison" element={<ErrorBoundary><Comparison /></ErrorBoundary>} />
          <Route path="/recommandations" element={<ErrorBoundary><Recommendations /></ErrorBoundary>} />
          <Route path="/analyse" element={<ErrorBoundary><Analysis /></ErrorBoundary>} />
          <Route path="/analyse/:pays" element={<ErrorBoundary><Analysis /></ErrorBoundary>} />
          <Route path="/analyse-cedante" element={<ErrorBoundary><CedanteAnalysis /></ErrorBoundary>} />
          <Route path="/analyse-cedante/:cedante" element={<ErrorBoundary><CedanteAnalysis /></ErrorBoundary>} />
          <Route path="/cibles-tty" element={<ErrorBoundary><TargetShare /></ErrorBoundary>} />
          <Route path="/exposition" element={<ErrorBoundary><ExpositionRisques /></ErrorBoundary>} />
          <Route path="/fac-saturation" element={<ErrorBoundary><FacSaturation /></ErrorBoundary>} />
          <Route path="/top-brokers" element={<ErrorBoundary><BrokerAnalysis /></ErrorBoundary>} />
          <Route path="/analyse-courtiers" element={<ErrorBoundary><BrokerAnalysis /></ErrorBoundary>} />
          <Route path="/analyse-courtiers/:brokerName" element={<ErrorBoundary><BrokerDetail /></ErrorBoundary>} />
          <Route path="/retrocession/traites" element={<ErrorBoundary><AffairesTraites /></ErrorBoundary>} />
          <Route path="/retrocession/securites" element={<ErrorBoundary><PanelSecurites /></ErrorBoundary>} />
          <Route path="/retrocession/fac-to-fac" element={<ErrorBoundary><FacToFac /></ErrorBoundary>} />

          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <ErrorBoundary><Admin /></ErrorBoundary>
              </ProtectedRoute>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
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
