interface ButtonProps {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md'
  disabled?: boolean
  loading?: boolean
  full?: boolean
  type?: 'button' | 'submit'
  title?: string
  className?: string
}

const base =
  'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap'

const sizes = {
  sm: 'h-8 px-3 text-[12px]',
  md: 'h-10 px-4 text-[13px]',
}

const variants = {
  primary: 'bg-cyan-600 text-white hover:bg-cyan-500',
  secondary:
    'bg-white/[0.05] text-[#E8EFF7] border border-white/[0.1] hover:bg-white/[0.09]',
  ghost:
    'bg-transparent text-[#94A3B8] hover:bg-white/[0.05] hover:text-[#E8EFF7]',
  danger:
    'bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20',
}

export default function Button({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  full = false,
  type = 'button',
  title,
  className = '',
}: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      title={title}
      className={[
        base,
        sizes[size],
        variants[variant],
        full ? 'w-full' : '',
        className,
      ].join(' ')}
    >
      {loading ? '处理中…' : children}
    </button>
  )
}
