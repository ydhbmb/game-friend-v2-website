interface InputProps {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  label?: string
  hint?: string
  error?: string
  maxLength?: number
  disabled?: boolean
  onEnter?: () => void
  className?: string
}

export default function Input({
  value,
  onChange,
  placeholder,
  type = 'text',
  label,
  hint,
  error,
  maxLength,
  disabled,
  onEnter,
  className = '',
}: InputProps) {
  return (
    <div className={className}>
      {label && (
        <label className="block text-[11px] text-[#5C6B7F] mb-1.5">{label}</label>
      )}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onEnter?.()}
        placeholder={placeholder}
        maxLength={maxLength}
        disabled={disabled}
        className={`w-full h-10 rounded-lg bg-white/[0.03] border px-3 text-[13px] text-[#E8EFF7] placeholder-[#4A5768] outline-none transition-colors disabled:opacity-50 ${
          error
            ? 'border-red-500/50 focus:border-red-500'
            : 'border-white/[0.08] focus:border-cyan-500/50'
        }`}
      />
      {error ? (
        <p className="text-[11px] text-red-400 mt-1">{error}</p>
      ) : hint ? (
        <p className="text-[11px] text-[#5C6B7F] mt-1">{hint}</p>
      ) : null}
    </div>
  )
}
