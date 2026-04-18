import { useState, useEffect } from "react"
import { useLocation } from 'react-router-dom'
import FilterPanel from '../components/FilterPanel'
import KPICards from '../components/KPICards'
import WorldMap from '../components/Charts/WorldMap'
import EvolutionChart from '../components/Charts/EvolutionChart'
import DistributionCharts from '../components/Charts/DistributionCharts'
import PivotTable from '../components/Charts/PivotTable'
import DataTable from '../components/DataTable'
import FinancesChart from '../components/Charts/FinancesChart'
import RentabiliteChart from '../components/Charts/RentabiliteChart'
import InactiveClients from './InactiveClients'
import { useAuth } from '../context/AuthContext'
import { Map, TrendingUp, PieChart, Table, FileText, Banknote, BarChart2, UserX, LayoutDashboard } from 'lucide-react'

const TABS = [
  { id: 'carte', label: 'Carte', icon: Map },
  { id: 'evolution', label: 'Évolution', icon: TrendingUp },
  { id: 'repartition', label: 'Répartition', icon: PieChart },
  { id: 'pivot', label: 'Tableau croisé', icon: Table },
  { id: 'contrats', label: 'Détail contrats', icon: FileText },
  { id: 'finances', label: 'Finances', icon: Banknote },
  { id: 'rentabilite', label: 'Rentabilité', icon: BarChart2 },
]

export default function Dashboard() {
  const { user } = useAuth()
  
  const visibleTabs = [...TABS]
  if (user?.role === 'admin' || user?.role === 'souscripteur') {
    visibleTabs.push({ id: 'inactifs', label: 'Inactifs', icon: UserX })
  }
  
  const [activeTab, setActiveTab] = useState('carte')

  useEffect(() => {
    const stored = sessionStorage.getItem('dashboard_tab')
    if (stored) {
      sessionStorage.removeItem('dashboard_tab')
      setActiveTab(stored)
    }
  }, [])

  return (
    <div className="flex h-full" style={{ minHeight: '100vh' }}>

      {/* ─── Filter Sidebar ─── */}
      <aside
        className="flex-shrink-0 sticky top-0"
        style={{ height: '100vh', overflowY: 'auto' }}
      >
        <FilterPanel />
      </aside>

      {/* ─── Main area ─── */}
      <div
        className="flex-1 overflow-y-auto p-5 space-y-5"
        style={{ minWidth: 0 }}
      >
        {/* ─── Page header ─── */}
        <div className="page-header animate-slide-up">
          <div className="page-header__icon">
            <LayoutDashboard size={22} />
          </div>
          <div className="page-header__content">
            <h1 className="page-header__title">Tableau de bord</h1>
            <p className="page-header__subtitle">
              Vue d'ensemble du portefeuille réassurance — Africa & Middle East
            </p>
          </div>
          <span className="page-header__badge hidden sm:inline-flex">Live</span>
        </div>

        {/* ─── KPI Cards ─── */}
        <div className="animate-slide-up stagger-2">
          <KPICards />
        </div>


        {/* ─── Charts / Table area ─── */}
        <div
          className="glass-card p-5 animate-slide-up stagger-3"
        >
          {/* Tab bar */}
          <div
            className="flex gap-0.5 mb-5 overflow-x-auto pb-0.5"
            style={{
              borderBottom: '1.5px solid var(--color-gray-100)',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
            {visibleTabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`tab-btn flex items-center gap-1.5 ${activeTab === id ? 'active' : ''}`}
              >
                <Icon size={13} className="flex-shrink-0" />
                {label}
              </button>
            ))}
          </div>

          {/* Tab content — animate on tab change */}
          <div key={activeTab} className="animate-scale-in">
            {activeTab === 'carte' && <WorldMap />}
            {activeTab === 'evolution' && <EvolutionChart />}
            {activeTab === 'repartition' && <DistributionCharts />}
            {activeTab === 'pivot' && <PivotTable />}
            {activeTab === 'contrats' && <DataTable />}
            {activeTab === 'finances' && <FinancesChart />}
            {activeTab === 'rentabilite' && <RentabiliteChart />}
            {activeTab === 'inactifs' && (user?.role === 'admin' || user?.role === 'souscripteur') && <InactiveClients />}
          </div>
        </div>
      </div>
    </div>
  )
}
