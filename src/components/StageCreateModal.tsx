import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Trophy, List, GitCommit, Plus, ChevronUp, ChevronDown, Shuffle } from 'lucide-react'
import { Button } from './ui/Button'
import type { TournamentFormat, ScoringRules } from '../types'

interface StageCreateModalProps {
    onSave: (name: string, type: TournamentFormat, rules: { correct_winner_points: number, exact_score_bonus: number }, swissConfig?: { total_rounds: number, wins_to_qualify: number, losses_to_eliminate: number }) => Promise<void>
    onClose: () => void
    defaultRules?: ScoringRules
}

export function StageCreateModal({ onSave, onClose, defaultRules }: StageCreateModalProps) {
    const [name, setName] = useState('')
    const [type, setType] = useState<TournamentFormat>('league')
    const [rules, setRules] = useState({
        correct_winner_points: defaultRules?.correct_winner_points ?? 3,
        exact_score_bonus: defaultRules?.exact_score_bonus ?? 1
    })
    const [swissRounds, setSwissRounds] = useState(5)
    const [swissWinsToQualify, setSwissWinsToQualify] = useState(3)
    const [swissLossesToEliminate, setSwissLossesToEliminate] = useState(3)
    const [loading, setLoading] = useState(false)

    // Validation Swiss config
    const isSwissConfigValid = type !== 'swiss' || swissRounds >= (swissWinsToQualify + swissLossesToEliminate - 1)

    // Prevent Body Scroll when modal is open
    useEffect(() => {
        document.body.style.overflow = 'hidden'
        return () => {
            document.body.style.overflow = 'unset'
        }
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim()) return

        setLoading(true)
        try {
            const swissConfig = type === 'swiss' ? {
                total_rounds: swissRounds,
                wins_to_qualify: swissWinsToQualify,
                losses_to_eliminate: swissLossesToEliminate
            } : undefined
            await onSave(name, type, rules, swissConfig)
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
            icon: <List className="w-5 h-5" />,
            desc: 'Tous les participants s\'affrontent dans un classement unique.'
        },
        {
            id: 'single_elimination',
            label: 'Élimination Directe',
            icon: <Trophy className="w-5 h-5" />,
            desc: 'Arbre de tournoi classique. Une défaite est éliminatoire.'
        },
        {
            id: 'double_elimination',
            label: 'Double Élimination',
            icon: <GitCommit className="w-5 h-5" />,
            desc: 'Arbre avec Winner et Loser bracket. Deux défaites pour être éliminé.'
        },
        {
            id: 'swiss',
            label: 'Rondes Suisses',
            icon: <Shuffle className="w-5 h-5" />,
            desc: 'Affrontements par niveau de score similaire à chaque round.'
        }
    ]

    return createPortal(
        <div className="fixed inset-0 z-[9999]">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/80 backdrop-blur-sm modal-backdrop modal-backdrop-enter"
                onClick={onClose}
            />

            {/* Scroll Wrapper */}
            <div
                className="fixed inset-0 z-10 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                onClick={onClose}
            >
                <div className="flex min-h-full items-center justify-center p-4">
                    {/* Modal */}
                    <div
                        className="relative w-full max-w-lg glass-modal rounded-2xl modal-enter my-8"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Decorative glow */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[100px] bg-cyan-600/20 blur-[60px] pointer-events-none" />

                        {/* Header */}
                        <div className="relative px-6 py-5 border-b border-white/10 flex-shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/25">
                                    <Plus className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-white">
                                        Nouvelle Phase
                                    </h2>
                                    <p className="text-sm text-gray-400">
                                        Définissez le format et les règles de points
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="absolute top-5 right-5 text-gray-400 hover:text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="overflow-y-auto custom-scrollbar">
                            <form onSubmit={handleSubmit} className="relative p-6 space-y-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-300">Nom de la phase</label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Ex: Playoffs, Phase de Groupes"
                                        className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 outline-none transition-all"
                                        autoFocus
                                    />
                                </div>

                                <div className="h-px bg-white/10" />

                                <div className="space-y-3">
                                    <label className="text-sm font-medium text-gray-300">Format de la compétition</label>
                                    <div className="grid gap-3">
                                        {formats.map((fmt) => (
                                            <div
                                                key={fmt.id}
                                                onClick={() => setType(fmt.id)}
                                                className={`
                                                    cursor-pointer p-4 rounded-xl border transition-all relative overflow-hidden group
                                                    ${type === fmt.id
                                                        ? 'bg-violet-600/20 border-violet-500/50 shadow-lg shadow-violet-900/20'
                                                        : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'
                                                    }
                                                `}
                                            >
                                                <div className="flex items-start gap-4">
                                                    <div className={`mt-0.5 p-2 rounded-lg transition-colors ${type === fmt.id ? 'bg-violet-500 text-white' : 'bg-white/10 text-gray-400'}`}>
                                                        {fmt.icon}
                                                    </div>
                                                    <div>
                                                        <div className={`text-sm font-bold mb-1 ${type === fmt.id ? 'text-white' : 'text-gray-200'}`}>
                                                            {fmt.label}
                                                        </div>
                                                        <div className="text-xs text-gray-400 leading-relaxed">
                                                            {fmt.desc}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Swiss-specific config */}
                                {type === 'swiss' && (
                                    <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl space-y-3">
                                        <label className="text-sm font-medium text-emerald-400 flex items-center gap-2">
                                            <Shuffle className="w-4 h-4" />
                                            Configuration Suisse
                                        </label>
                                        <div className="flex items-center gap-4">
                                            <div className="space-y-1">
                                                <label className="text-xs text-gray-400">Nombre de rondes</label>
                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        max="15"
                                                        value={swissRounds}
                                                        onChange={(e) => setSwissRounds(parseInt(e.target.value) || 5)}
                                                        className="w-20 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-emerald-400 text-center font-mono font-bold focus:border-emerald-500/50 outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                    />
                                                </div>
                                            </div>
                                            <p className="text-xs text-gray-500 flex-1">
                                                Les matchs seront générés automatiquement à chaque ronde basés sur le classement.
                                            </p>
                                        </div>

                                        {/* Qualification criteria */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <label className="text-xs text-emerald-400">Wins to Qualify</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="10"
                                                    value={swissWinsToQualify}
                                                    onChange={(e) => setSwissWinsToQualify(parseInt(e.target.value) || 3)}
                                                    className="w-full bg-black/30 border border-emerald-500/20 rounded-lg px-3 py-2 text-emerald-400 text-center font-mono"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs text-red-400">Losses to Eliminate</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="10"
                                                    value={swissLossesToEliminate}
                                                    onChange={(e) => setSwissLossesToEliminate(parseInt(e.target.value) || 3)}
                                                    className="w-full bg-black/30 border border-red-500/20 rounded-lg px-3 py-2 text-red-400 text-center font-mono"
                                                />
                                            </div>
                                        </div>

                                        {!isSwissConfigValid && (
                                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
                                                Besoin d'au moins {swissWinsToQualify + swissLossesToEliminate - 1} rounds pour {swissWinsToQualify} wins / {swissLossesToEliminate} losses
                                            </div>
                                        )}

                                        <div className="p-3 bg-violet-500/10 border border-violet-500/20 rounded-lg text-xs text-gray-400">
                                            Teams need <span className="text-emerald-400 font-bold">{swissWinsToQualify} wins</span> to qualify or
                                            <span className="text-red-400 font-bold"> {swissLossesToEliminate} losses</span> to be eliminated.
                                        </div>
                                    </div>
                                )}

                                <div className="h-px bg-white/10" />

                                <div className="space-y-4">
                                    <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                                        <Trophy className="w-4 h-4 text-yellow-500" />
                                        Règles de points spécifiques
                                    </label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Bon vainqueur</label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={rules.correct_winner_points}
                                                    onChange={(e) => setRules({ ...rules, correct_winner_points: parseInt(e.target.value) || 0 })}
                                                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 pr-10 text-violet-400 text-center font-mono text-lg font-bold focus:border-violet-500/50 outline-none transition-all hover:border-white/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                />
                                                <div className="absolute right-0 top-0 bottom-0 flex flex-col border-l border-white/10">
                                                    <button
                                                        type="button"
                                                        onClick={() => setRules(prev => ({ ...prev, correct_winner_points: prev.correct_winner_points + 1 }))}
                                                        className="flex-1 px-2.5 hover:bg-white/10 text-gray-400 hover:text-violet-400 transition-colors rounded-tr-xl flex items-center justify-center"
                                                        tabIndex={-1}
                                                    >
                                                        <ChevronUp className="w-3 h-3" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setRules(prev => ({ ...prev, correct_winner_points: Math.max(0, prev.correct_winner_points - 1) }))}
                                                        className="flex-1 px-2.5 hover:bg-white/10 text-gray-400 hover:text-violet-400 transition-colors border-t border-white/10 rounded-br-xl flex items-center justify-center"
                                                        tabIndex={-1}
                                                    >
                                                        <ChevronDown className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Score exact (Bonus)</label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={rules.exact_score_bonus}
                                                    onChange={(e) => setRules({ ...rules, exact_score_bonus: parseInt(e.target.value) || 0 })}
                                                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 pr-10 text-cyan-400 text-center font-mono text-lg font-bold focus:border-cyan-500/50 outline-none transition-all hover:border-white/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                />
                                                <div className="absolute right-0 top-0 bottom-0 flex flex-col border-l border-white/10">
                                                    <button
                                                        type="button"
                                                        onClick={() => setRules(prev => ({ ...prev, exact_score_bonus: prev.exact_score_bonus + 1 }))}
                                                        className="flex-1 px-2.5 hover:bg-white/10 text-gray-400 hover:text-cyan-400 transition-colors rounded-tr-xl flex items-center justify-center"
                                                        tabIndex={-1}
                                                    >
                                                        <ChevronUp className="w-3 h-3" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setRules(prev => ({ ...prev, exact_score_bonus: Math.max(0, prev.exact_score_bonus - 1) }))}
                                                        className="flex-1 px-2.5 hover:bg-white/10 text-gray-400 hover:text-cyan-400 transition-colors border-t border-white/10 rounded-br-xl flex items-center justify-center"
                                                        tabIndex={-1}
                                                    >
                                                        <ChevronDown className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
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
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    )
}
