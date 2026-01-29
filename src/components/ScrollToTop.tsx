import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

export function ScrollToTop() {
    const { pathname, search } = useLocation()
    const lastPathnameRef = useRef(pathname)

    useEffect(() => {
        // Only scroll on actual pathname change (not query param changes)
        if (pathname !== lastPathnameRef.current) {
            lastPathnameRef.current = pathname

            // Don't scroll to top if there are query params for deep linking
            const params = new URLSearchParams(search)
            const hasDeepLink = params.has('matchId') || params.has('round')

            if (!hasDeepLink) {
                window.scrollTo(0, 0)
            }
        }
    }, [pathname, search])

    return null
}
