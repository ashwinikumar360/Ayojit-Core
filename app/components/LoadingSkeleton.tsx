'use client'

/**
 * LoadingSkeleton — Neo-Brutalism styled loading placeholder.
 *
 * Variants:
 * - card: Full card with border and shadow
 * - table-row: Single table row placeholder
 * - text-block: Multi-line text area
 * - stat-card: Small metric card
 */

interface SkeletonProps {
  variant?: 'card' | 'table-row' | 'text-block' | 'stat-card'
  count?: number
}

function SkeletonPulse({ className = '' }: { className?: string }) {
  return (
    <div
      className={`bg-zinc-200 animate-skeleton-pulse ${className}`}
      aria-hidden="true"
    />
  )
}

export default function LoadingSkeleton({ variant = 'card', count = 1 }: SkeletonProps) {
  const items = Array.from({ length: count }, (_, i) => i)

  if (variant === 'stat-card') {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {items.map((i) => (
          <div
            key={i}
            className="border-4 border-black bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
          >
            <SkeletonPulse className="h-3 w-20 mb-3" />
            <SkeletonPulse className="h-8 w-16 mb-2" />
            <SkeletonPulse className="h-2 w-24" />
          </div>
        ))}
      </div>
    )
  }

  if (variant === 'table-row') {
    return (
      <div className="space-y-2">
        {items.map((i) => (
          <div
            key={i}
            className="border-2 border-black bg-white p-3 flex gap-4 items-center"
          >
            <SkeletonPulse className="h-4 w-4 flex-shrink-0" />
            <SkeletonPulse className="h-4 flex-1" />
            <SkeletonPulse className="h-4 w-20" />
            <SkeletonPulse className="h-4 w-16" />
          </div>
        ))}
      </div>
    )
  }

  if (variant === 'text-block') {
    return (
      <div className="space-y-3">
        {items.map((i) => (
          <div key={i}>
            <SkeletonPulse className="h-4 w-full mb-2" />
            <SkeletonPulse className="h-4 w-5/6 mb-2" />
            <SkeletonPulse className="h-4 w-4/6" />
          </div>
        ))}
      </div>
    )
  }

  // Default: card variant
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {items.map((i) => (
        <div
          key={i}
          className="border-4 border-black bg-white p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
        >
          <div className="flex justify-between items-start mb-4">
            <div>
              <SkeletonPulse className="h-10 w-10 mb-3" />
              <SkeletonPulse className="h-6 w-32 mb-2" />
              <SkeletonPulse className="h-3 w-20" />
            </div>
            <SkeletonPulse className="h-8 w-20" />
          </div>
          <SkeletonPulse className="h-3 w-28" />
        </div>
      ))}
    </div>
  )
}
