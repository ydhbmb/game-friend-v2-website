interface CardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
  padded?: boolean
  as?: 'div' | 'section' | 'article'
}

export default function Card({
  children,
  className = '',
  hover = false,
  padded = true,
  as = 'div',
}: CardProps) {
  const Tag = as
  return (
    <Tag
      className={[
        'rounded-xl border border-white/[0.06] bg-[#0A111F]/70',
        padded ? 'p-4' : '',
        hover
          ? 'transition-colors hover:border-white/[0.12] hover:bg-[#0D1626]'
          : '',
        className,
      ].join(' ')}
    >
      {children}
    </Tag>
  )
}
