import { memo } from 'react'

function SkeletonBar({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-surface-200 ${className}`}
    />
  )
}

export const SkeletonLoader = memo(function SkeletonLoader() {
  return (
    <div className="space-y-4 p-4">
      <SkeletonBar className="h-6 w-3/4" />
      <SkeletonBar className="h-3 w-full" />
      <SkeletonBar className="h-3 w-5/6" />

      <div className="space-y-3 mt-6">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="rounded-xl border border-border overflow-hidden">
            <div className="px-4 py-3 bg-surface-150 border-b border-border">
              <SkeletonBar className="h-4 w-1/3" />
            </div>
            <div className="p-4 space-y-2">
              <SkeletonBar className="h-3 w-full" />
              <SkeletonBar className="h-3 w-4/5" />
              <SkeletonBar className="h-3 w-3/5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
})

export const SkeletonSection = memo(function SkeletonSection() {
  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="px-4 py-3 bg-surface-150 border-b border-border">
        <div className="h-4 w-1/4 animate-pulse rounded bg-surface-200" />
      </div>
      <div className="p-4 space-y-2">
        <div className="h-3 w-full animate-pulse rounded bg-surface-200" />
        <div className="h-3 w-4/5 animate-pulse rounded bg-surface-200" />
        <div className="h-3 w-3/5 animate-pulse rounded bg-surface-200" />
      </div>
    </div>
  )
})
