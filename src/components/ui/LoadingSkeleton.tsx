export function LoadingSkeleton() {
  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
      <div className="h-64 loading-skeleton skeleton-wave rounded-xl" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 loading-skeleton skeleton-wave rounded-xl" />
        ))}
      </div>
      <div className="h-96 loading-skeleton skeleton-wave rounded-xl" />
    </div>
  )
}