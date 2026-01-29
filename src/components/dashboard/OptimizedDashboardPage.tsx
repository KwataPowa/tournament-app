import React, { Suspense, lazy } from 'react'
import { useAuthContext } from '../../lib/AuthContext'
import { LoadingSkeleton } from '../ui/LoadingSkeleton'

// Lazy load dashboard components for better performance
const DashboardContent = lazy(() => import('../../pages/DashboardPage').then(module => ({ default: module.DashboardPage })))

// Enhanced loading skeleton
function DashboardLoader() {
  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
      {/* Header skeleton */}
      <div className="glass-elevated rounded-2xl p-8 border border-white/10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="h-10 w-64 loading-skeleton skeleton-wave rounded-lg" />
            <div className="h-6 w-48 loading-skeleton skeleton-wave rounded-lg" />
          </div>
          <div className="flex gap-3">
            <div className="h-10 w-24 loading-skeleton skeleton-wave rounded-lg" />
            <div className="h-10 w-40 loading-skeleton skeleton-wave rounded-lg" />
          </div>
        </div>
      </div>

      {/* Stats skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="stats-card">
            <div className="w-12 h-12 rounded-xl loading-skeleton skeleton-wave" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-24 loading-skeleton skeleton-wave rounded" />
              <div className="h-8 w-16 loading-skeleton skeleton-wave rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* Main content skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="loading-skeleton h-80 skeleton-wave rounded-xl" />
          <div className="loading-skeleton h-64 skeleton-wave rounded-xl" />
        </div>
        <div className="space-y-6">
          <div className="loading-skeleton h-96 skeleton-wave rounded-xl" />
        </div>
      </div>
    </div>
  )
}

// Performance monitoring wrapper
function PerformanceMonitor({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    // Log performance metrics in development
    if (import.meta.env.DEV) {
      const startTime = performance.now()

      return () => {
        const endTime = performance.now()
        console.log(`Dashboard render time: ${endTime - startTime}ms`)
      }
    }
  }, [])

  return <>{children}</>
}

export function OptimizedDashboardPage() {
  const { user } = useAuthContext()

  if (!user) {
    return <LoadingSkeleton />
  }

  return (
    <PerformanceMonitor>
      <Suspense fallback={<DashboardLoader />}>
        <DashboardContent />
      </Suspense>
    </PerformanceMonitor>
  )
}