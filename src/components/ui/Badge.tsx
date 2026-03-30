interface BadgeProps {
  children: React.ReactNode
  color?: string
  size?: 'sm' | 'md'
}

export default function Badge({ children, color = '#D4A843', size = 'sm' }: BadgeProps) {
  const padding = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold uppercase tracking-wider ${padding}`}
      style={{ color, background: `${color}18`, border: `1px solid ${color}30` }}
    >
      {children}
    </span>
  )
}
