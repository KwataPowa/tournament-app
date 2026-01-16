
import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from './Button'

interface Props {
    children: ReactNode
}

interface State {
    hasError: boolean
    error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    }

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error }
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo)
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex flex-col items-center justify-center bg-[#0f0a1e] p-4 text-center">
                    <div className="max-w-md w-full bg-[#1a1430] border border-white/5 rounded-2xl p-8 shadow-2xl relative overflow-hidden">

                        {/* Background Glow */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-2 bg-gradient-to-r from-red-500/0 via-red-500/50 to-red-500/0" />

                        <div className="mb-6 flex justify-center">
                            <div className="p-4 bg-red-500/10 rounded-full ring-1 ring-red-500/30">
                                <AlertTriangle className="w-12 h-12 text-red-400 animate-pulse" />
                            </div>
                        </div>

                        <h1 className="text-2xl font-bold text-white mb-2">
                            Aïe, coup dur !
                        </h1>

                        <p className="text-gray-400 mb-6 text-sm">
                            L'application a rencontré une erreur critique. Pas de panique, c'est sûrement temporaire.
                        </p>

                        <div className="bg-black/30 rounded-lg p-4 mb-6 text-left overflow-auto max-h-32 border border-white/5">
                            <code className="text-xs text-red-300 font-mono">
                                {this.state.error?.message || 'Erreur inconnue'}
                            </code>
                        </div>

                        <Button
                            onClick={() => window.location.reload()}
                            className="w-full bg-red-600 hover:bg-red-700 text-white gap-2"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Recharger la page
                        </Button>

                        <p className="mt-4 text-xs text-gray-500">
                            Si le problème persiste, contactez Miguel.
                        </p>
                    </div>
                </div>
            )
        }

        return this.props.children
    }
}
