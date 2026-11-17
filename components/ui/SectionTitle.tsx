interface SectionTitleProps {
  children: React.ReactNode
  count?: number | string
  action?: React.ReactNode
  className?: string
}

export default function SectionTitle({
  children,
  count,
  action,
  className = '',
}: SectionTitleProps) {
  return (
    <div className={`flex items-baseline justify-between gap-3 mb-3 ${className}`}>
      <h2 className="flex items-center gap-2 text-[15px] font-semibold text-[#E8EFF7]">
        <span className="w-[3px] h-[14px] rounded-full bg-cyan-400/80" />
        {children}
      </h2>
      <div className="flex items-center gap-2 shrink-0">
        {count !== undefined && (
          <span className="text-[11px] text-[#5C6B7F] tabular-nums">{count}</span>
        )}
        {action}
      </div>
    </div>
  )
}
