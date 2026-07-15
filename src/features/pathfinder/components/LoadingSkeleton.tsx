export function HeroSkeleton() {
  return (
    <div className="bg-gray-50 dark:bg-brand-dark-card border-b border-gray-100 dark:border-brand-dark-border py-12 px-4 pt-28">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-[1.05fr_0.95fr] gap-8 items-center">
        <div>
          <div className="h-7 w-44 rounded-full bg-gray-200 dark:bg-white/10 animate-pulse mb-5" />
          <div className="h-12 w-3/4 rounded-xl bg-gray-200 dark:bg-white/10 animate-pulse mb-4" />
          <div className="h-5 w-full max-w-xl rounded-lg bg-gray-200 dark:bg-white/10 animate-pulse mb-3" />
          <div className="h-5 w-2/3 rounded-lg bg-gray-200 dark:bg-white/10 animate-pulse mb-8" />
          <div className="h-14 max-w-xl rounded-2xl bg-gray-200 dark:bg-white/10 animate-pulse" />
        </div>
        <div className="h-72 rounded-2xl bg-gray-200 dark:bg-white/10 animate-pulse" />
      </div>
    </div>
  )
}

export function CardSkeletonGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="card p-5">
          <div className="h-12 w-12 rounded-xl bg-gray-200 dark:bg-white/10 animate-pulse mb-4" />
          <div className="h-5 w-3/4 rounded-lg bg-gray-200 dark:bg-white/10 animate-pulse mb-3" />
          <div className="h-4 w-full rounded-lg bg-gray-200 dark:bg-white/10 animate-pulse mb-2" />
          <div className="h-4 w-2/3 rounded-lg bg-gray-200 dark:bg-white/10 animate-pulse" />
        </div>
      ))}
    </div>
  )
}

export function FilterSkeleton() {
  return (
    <div className="bg-white dark:bg-brand-dark-card rounded-2xl border border-gray-100 dark:border-brand-dark-border p-4">
      <div className="h-4 w-24 rounded bg-gray-200 dark:bg-white/10 animate-pulse mb-4" />
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="h-9 rounded-xl bg-gray-100 dark:bg-white/10 animate-pulse mb-2" />
      ))}
    </div>
  )
}

export function ExamSkeletonGrid() {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="card p-5">
          <div className="flex justify-between mb-5">
            <div className="h-6 w-48 rounded-lg bg-gray-200 dark:bg-white/10 animate-pulse" />
            <div className="h-6 w-20 rounded-full bg-gray-200 dark:bg-white/10 animate-pulse" />
          </div>
          <div className="grid grid-cols-2 gap-3 mb-5">
            {Array.from({ length: 4 }).map((__, i) => (
              <div key={i} className="h-14 rounded-xl bg-gray-100 dark:bg-white/10 animate-pulse" />
            ))}
          </div>
          <div className="h-10 rounded-xl bg-gray-200 dark:bg-white/10 animate-pulse" />
        </div>
      ))}
    </div>
  )
}

