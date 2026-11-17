interface EmptyStateProps {
  title: string
  description?: string
  action?: React.ReactNode
  compact?: boolean
}

export default function EmptyState({
  title,
  description,
  action,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={`rounded-xl border border-dashed border-white/[0.08] text-center ${
        compact ? 'py-8' : 'py-16'
      }`}
    >
      <p className="text-[13px] text-[#5C6B7F]">{title}</p>
      {description && (
        <p className="text-[11.5px] text-[#4A5768] mt-1.5">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
