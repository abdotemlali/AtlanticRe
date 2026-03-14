// 🎨 STYLE UPDATED — Dashboard : layout propre, header premium, tabs pill, tab-content avec animate-scale-in
import React, { useState } from 'react'
import FilterPanel from '../components/FilterPanel'
import KPICards from '../components/KPICards'
import WorldMap from '../components/Charts/WorldMap'
import EvolutionChart from '../components/Charts/EvolutionChart'
import DistributionCharts from '../components/Charts/DistributionCharts'
import PivotTable from '../components/Charts/PivotTable'
import DataTable from '../components/DataTable'
import { Map, TrendingUp, PieChart, Table, FileText } from 'lucide-react'

const TABS = [
  { id: 'carte', label: 'Carte', icon: Map },
  { id: 'evolution', label: 'Évolution', icon: TrendingUp },
  { id: 'repartition', label: 'Répartition', icon: PieChart },
  { id: 'pivot', label: 'Tableau croisé', icon: Table },
  { id: 'contrats', label: 'Détail contrats', icon: FileText },
]

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('carte')

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
        <div className="animate-slide-up">
          <h1 className="text-lg font-bold text-navy">Tableau de bord</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Vue d'ensemble du portefeuille réassurance — Africa &amp; Middle East
          </p>
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
            {TABS.map(({ id, label, icon: Icon }) => (
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
          </div>
        </div>
      </div>
    </div>
  )
}
