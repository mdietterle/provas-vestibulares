export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-gradient-to-r from-[#eef2ff] via-[#E2E8F0] to-[#eef2ff] dark:from-[#172440] dark:via-[#1e2e50] dark:to-[#172440] bg-[length:400%_100%] ${className}`}
      style={{ animation: 'skeleton-shine 1.4s ease infinite' }}
    />
  )
}

export function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-[#131f37] rounded-2xl border border-[#E2E8F0] dark:border-[#1e2d4a] p-5 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-5/6" />
    </div>
  )
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-5 py-3 border-b border-[#f3f4f6] dark:border-[#1e2d4a]">
      <Skeleton className="w-9 h-9 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-3 w-32" />
      </div>
      <Skeleton className="h-6 w-20 rounded-full" />
      <Skeleton className="h-8 w-16 rounded-lg" />
    </div>
  )
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-white dark:bg-[#131f37] rounded-2xl border border-[#E2E8F0] dark:border-[#1e2d4a] overflow-hidden">
      <div className="px-5 py-3 border-b border-[#E2E8F0] dark:border-[#1e2d4a] flex gap-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-24 ml-auto" />
      </div>
      {Array.from({ length: rows }).map((_, i) => <SkeletonRow key={i} />)}
    </div>
  )
}

export function SkeletonGrid({ cols = 4, rows = 2 }: { cols?: number; rows?: number }) {
  return (
    <div className={`grid grid-cols-${cols} gap-4`}>
      {Array.from({ length: cols * rows }).map((_, i) => <SkeletonCard key={i} />)}
    </div>
  )
}
