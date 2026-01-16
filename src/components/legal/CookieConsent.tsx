
import { useState, useEffect } from 'react'
import { Button } from '../ui/Button'
import { Cookie } from 'lucide-react'

export function CookieConsent() {
    const [show, setShow] = useState(false)

    useEffect(() => {
        const consent = localStorage.getItem('cookie-consent')
        if (!consent) {
            setShow(true)
        }
    }, [])

    const handleAccept = () => {
        localStorage.setItem('cookie-consent', 'true')
        setShow(false)
    }

    if (!show) return null

    return (
        <div className="fixed bottom-0 left-0 right-0 z-[100] p-4 bg-[#0f0a1e]/95 backdrop-blur-md border-t border-white/10 shadow-2xl animate-slide-up">
            <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-2 bg-violet-500/20 rounded-lg">
                        <Cookie className="w-6 h-6 text-violet-400" />
                    </div>
                    <div className="text-sm text-gray-300">
                        <p className="font-semibold text-white mb-1">On utilise des cookies !</p>
                        <p>
                            Principalement pour que vous puissiez rester connecté. Pas de tracking publicitaire ici.
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Button size="sm" onClick={handleAccept} className="bg-violet-600 hover:bg-violet-700 text-white">
                        Compris !
                    </Button>
                </div>
            </div>
        </div>
    )
}
