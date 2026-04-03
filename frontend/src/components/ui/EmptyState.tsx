import { FolderOpen } from 'lucide-react'

interface EmptyStateProps {
  title?: string
  message?: string
  icon?: React.ReactNode
}

export function EmptyState({ 
  title = "Aucune donnée", 
  message = "Aucun résultat trouvé pour cette sélection. Veuillez modifier vos filtres.",
  icon = <FolderOpen size={48} className="text-[var(--color-navy)] opacity-20 mx-auto mb-4" />
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center rounded-xl border border-dashed border-[var(--color-gray-200)] bg-[hsla(209,28%,24%,0.02)]">
      {icon}
      <h3 className="text-sm font-bold text-[var(--color-navy)] mb-1">{title}</h3>
      <p className="text-xs text-[var(--color-gray-500)] max-w-sm mx-auto">{message}</p>
    </div>
  )
}
