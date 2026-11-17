interface BadgeProps {
  children: React.ReactNode
  tone?: 'neutral' | 'accent' | 'success' | 'warn' | 'danger'
  className?: string
}

const tones = {
  neutral: 'bg-white/[0.06] text-[#94A3B8] border-white/[0.08]',
  accent: 'bg-cyan-500/12 text-cyan-300 border-cyan-500/25',
  success: 'bg-green-500/12 text-green-400 border-green-500/25',
  warn: 'bg-amber-500/12 text-amber-400 border-amber-500/25',
  danger: 'bg-red-500/12 text-red-400 border-red-500/25',
}

export default function Badge({ children, tone = 'neutral', className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center h-[19px] px-1.5 rounded border text-[10.5px] font-medium leading-none ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  )
}
