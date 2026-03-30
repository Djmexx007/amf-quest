interface ProgressBarProps {
  value: number        // 0–100
  max?: number
  color?: string
  height?: number
  showLabel?: boolean
  animated?: boolean
}

export default function ProgressBar({
  value,
  max = 100,
  color = '#D4A843',
  height = 8,
  showLabel = false,
  animated = true,
}: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))

  return (
    <div className="w-full">
      <div
        className="w-full rounded-full overflow-hidden"
        style={{ height, background: 'rgba(255,255,255,0.06)' }}
      >
        <div
          className="h-full rounded-full relative overflow-hidden transition-all duration-700 ease-out"
          style={{ width: `${pct}%`, background: color }}
        >
          {animated && (
            <div
              className="absolute inset-0 opacity-30"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
                animation: 'shimmer 2s infinite',
              }}
            />
          )}
        </div>
      </div>
      {showLabel && (
        <p className="text-right text-xs text-gray-500 mt-1">{Math.round(pct)}%</p>
      )}
    </div>
  )
}
