
import { Link } from 'react-router-dom'
import { Home, AlertTriangle } from 'lucide-react'

export function NotFoundPage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
            <div className="relative">
                <div className="absolute -inset-4 bg-violet-500/20 rounded-full blur-xl animate-pulse"></div>
                <AlertTriangle className="w-24 h-24 text-violet-400 relative z-10" />
            </div>

            <h1 className="text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-cyan-400">
                404
            </h1>

            <div className="space-y-2">
                <h2 className="text-2xl font-semibold text-white">Cette page a ragequit !</h2>
                <p className="text-gray-400 max-w-md mx-auto">
                    Il semble que le match que vous cherchez n'existe pas ou a été annulé.
                </p>
            </div>

            <Link
                to="/"
                className="flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl transition-all hover:scale-105 shadow-lg shadow-violet-500/20"
            >
                <Home className="w-5 h-5" />
                <span>Retour au QG</span>
            </Link>
        </div>
    )
}
