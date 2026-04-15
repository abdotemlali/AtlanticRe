import { ReactNode } from 'react'

export interface NavSection {
  id: string
  label: string
}

interface Props {
  title: string
  subtitle: string
  dataSource: string
  navItems: NavSection[]
  children: ReactNode
}

export default function CartographieLayout({ title, subtitle, dataSource, navItems, children }: Props) {
  const scrollTo = (id: string) => {
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="px-8 py-8 max-w-[1400px] mx-auto space-y-10">
      {/* Header */}
      <section>
        <div
          className="bg-white rounded-xl px-7 py-5 flex items-start justify-between gap-4 flex-wrap"
          style={{
            border: '1px solid hsl(0,0%,92%)',
            boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
          }}
        >
          <div className="space-y-1.5">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-800">{title}</h1>
            </div>
            <p className="text-sm text-gray-500 max-w-3xl leading-relaxed">{subtitle}</p>
          </div>
          <span
            className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex-shrink-0 self-start mt-1"
            style={{
              background: 'hsla(83,52%,42%,0.12)',
              color: 'hsl(83,52%,30%)',
              border: '1px solid hsla(83,52%,42%,0.30)',
            }}
          >
            {dataSource}
          </span>
        </div>
      </section>

      {/* Nav sticky */}
      <nav
        className="sticky top-0 z-30 -mx-2 px-2 py-2 flex gap-2 overflow-x-auto"
        style={{
          background: 'hsla(0,0%,100%,0.92)',
          backdropFilter: 'blur(8px)',
          borderBottom: '1px solid hsl(0,0%,92%)',
        }}
      >
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => scrollTo(item.id)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all"
            style={{
              background: 'hsla(83,52%,42%,0.08)',
              color: 'hsl(83,52%,30%)',
              border: '1px solid hsla(83,52%,42%,0.20)',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'hsla(83,52%,42%,0.18)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'hsla(83,52%,42%,0.08)' }}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {children}
    </div>
  )
}
