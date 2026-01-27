import { useState } from 'react'
import { X, Trophy, List, GitCommit } from 'lucide-react'
import { Card } from './ui/Card'
import { Button } from './ui/Button'
import type { TournamentFormat } from '../types'

interface StageCreateModalProps {
    onSave: (name: string, type: TournamentFormat) => Promise<void>
    onClose: () => void
}

export function StageCreateModal({ onSave, onClose }: StageCreateModalProps) {
    const [name, setName] = useState('')
    const [type, setType] = useState<TournamentFormat>('league')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim()) return

        setLoading(true)
        try {
            await onSave(name, type)
            onClose()
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const formats: { id: TournamentFormat; label: string; icon: React.ReactNode; desc: string }[] = [
        {
            id: 'league',
            label: 'Championnat',
            icon: <List className="w-4 h-4" />,
            desc: 'Tous les participants s\'affrontent dans un classement unique.'
        },
        {
            id: 'single_elimination',
            label: 'Élimination Directe',
            icon: <Trophy className="w-4 h-4" />,
            desc: 'Arbre de tournoi classique. Une défaite est éliminatoire.'
        },
        {
            id: 'double_elimination',
            label: 'Double Élimination',
            icon: <GitCommit className="w-4 h-4" />,
            desc: 'Arbre avec Winner et Loser bracket. Deux défaites pour être éliminé.'
        },
        {
            id: 'swiss',
            label: 'Rondes Suisses',
            icon: <List className="w-4 h-4" />,
            desc: 'Affrontements par niveau de score similaire à chaque round.'
        }
    ]

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <Card className="w-full max-w-md relative overflow-hidden">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                <h2 className="text-xl font-bold text-white mb-6">Ajouter une phase</h2>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">Nom de la phase</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ex: Playoffs, Phase de Groupes"
                            className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 outline-none transition-all"
                            autoFocus
                        />
                    </div>

                    <div className="space-y-3">
                        <label className="text-sm font-medium text-gray-300">Format</label>
                        <div className="grid gap-3">
                            {formats.map((fmt) => (
                                <div
                                    key={fmt.id}
                                    onClick={() => setType(fmt.id)}
                                    className={`
                    cursor-pointer p-3 rounded-lg border transition-all relative overflow-hidden group
                    ${type === fmt.id
                                            ? 'bg-violet-600/20 border-violet-500/50'
                                            : 'bg-white/5 border-white/5 hover:bg-white/10'
                                        }
                  `}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className={`mt-0.5 p-1.5 rounded-full ${type === fmt.id ? 'bg-violet-500 text-white' : 'bg-gray-800 text-gray-400'}`}>
                                            {fmt.icon}
                                        </div>
                                        <div>
                                            <div className={`text-sm font-medium mb-0.5 ${type === fmt.id ? 'text-white' : 'text-gray-300'}`}>
                                                {fmt.label}
                                            </div>
                                            <div className="text-xs text-gray-500 leading-relaxed">
                                                {fmt.desc}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={onClose}
                            disabled={loading}
                        >
                            Annuler
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            disabled={loading || !name.trim()}
                            isLoading={loading}
                        >
                            Créer la phase
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    )
}
