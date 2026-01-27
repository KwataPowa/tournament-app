import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Users, Check, Trophy, Shuffle, Hand } from 'lucide-react'
import { Button } from './ui/Button'
import type { Team, Stage } from '../types'

interface StageSeedingModalProps {
    stage: Stage
    allTeams: Team[]
    onSave: (selectedTeams: Team[], generationMode: 'auto' | 'manual') => Promise<void>
    onClose: () => void
}

export function StageSeedingModal({ stage, allTeams, onSave, onClose }: StageSeedingModalProps) {
    // Par défaut, sélectionner toutes les équipes (ou aucune si liste trop longue ?)
    const [selectedTeams, setSelectedTeams] = useState<string[]>(allTeams.map(t => t.name))
    const [generationMode, setGenerationMode] = useState<'auto' | 'manual'>('auto')
    const [loading, setLoading] = useState(false)

    // Prevent Body Scroll when modal is open
    useEffect(() => {
        document.body.style.overflow = 'hidden'
        return () => {
            document.body.style.overflow = 'unset'
        }
    }, [])

    const toggleTeam = (teamName: string) => {
        setSelectedTeams(prev =>
            prev.includes(teamName)
                ? prev.filter(t => t !== teamName)
                : [...prev, teamName]
        )
    }

    const toggleAll = () => {
        if (selectedTeams.length === allTeams.length) {
            setSelectedTeams([])
        } else {
            setSelectedTeams(allTeams.map(t => t.name))
        }
    }

    const handleSubmit = async () => {
        setLoading(true)
        try {
            const teamsToSave = allTeams.filter(t => selectedTeams.includes(t.name))
            await onSave(teamsToSave, generationMode)
            onClose()
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

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
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-violet-500/25">
                                    <Users className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-white">
                                        Participants
                                    </h2>
                                    <p className="text-sm text-gray-400">
                                        Sélectionner les équipes pour "{stage.name}"
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
                            <div className="relative p-6 space-y-6">

                                {/* Mode de génération */}
                                {stage.type !== 'league' && (
                                    <div className="space-y-3">
                                        <label className="text-sm font-medium text-gray-300">Mode de placement</label>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div
                                                onClick={() => setGenerationMode('auto')}
                                                className={`p-3 rounded-xl border cursor-pointer transition-all relative overflow-hidden group ${generationMode === 'auto'
                                                    ? 'bg-cyan-600/20 border-cyan-500/50'
                                                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                                                    }`}
                                            >
                                                <div className="text-sm font-bold text-white mb-1 flex items-center gap-2"><Shuffle className="w-4 h-4" /> Aléatoire</div>
                                                <div className="text-xs text-gray-400 leading-relaxed">Mélange aléatoire des équipes.</div>
                                            </div>
                                            <div
                                                onClick={() => setGenerationMode('manual')}
                                                className={`p-3 rounded-xl border cursor-pointer transition-all relative overflow-hidden group ${generationMode === 'manual'
                                                    ? 'bg-violet-600/20 border-violet-500/50'
                                                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                                                    }`}
                                            >
                                                <div className="text-sm font-bold text-white mb-1 flex items-center gap-2"><Hand className="w-4 h-4" /> Manuel</div>
                                                <div className="text-xs text-gray-400 leading-relaxed">Placement manuel dans l'arbre.</div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Liste des équipes */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-medium text-gray-300">
                                            Équipes ({selectedTeams.length}/{allTeams.length})
                                        </label>
                                        <button
                                            onClick={toggleAll}
                                            className="text-xs text-violet-400 hover:text-violet-300 font-medium transition-colors"
                                        >
                                            {selectedTeams.length === allTeams.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                                        </button>
                                    </div>

                                    <div className="max-h-[300px] overflow-y-auto pr-1 space-y-1 custom-scrollbar">
                                        {allTeams.map((team) => {
                                            const isSelected = selectedTeams.includes(team.name)
                                            return (
                                                <div
                                                    key={team.name}
                                                    onClick={() => toggleTeam(team.name)}
                                                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border ${isSelected
                                                        ? 'bg-violet-600/20 border-violet-500/30'
                                                        : 'bg-white/5 border-transparent hover:bg-white/10'
                                                        }`}
                                                >
                                                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-violet-600 border-violet-600' : 'border-gray-600 bg-black/20'
                                                        }`}>
                                                        {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                                                    </div>

                                                    {team.logo && (
                                                        <img src={team.logo} alt={team.name} className="w-8 h-8 object-contain" />
                                                    )}
                                                    <span className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-gray-400'}`}>
                                                        {team.name}
                                                    </span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>

                                {stage.type !== 'league' && (
                                    <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-start gap-3">
                                        <Trophy className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                                        <div className="text-xs text-blue-200">
                                            <p className="font-bold mb-1 text-blue-300">Génération automatique</p>
                                            Un arbre de tournoi sera généré. Si le nombre d'équipes ({selectedTeams.length}) n'est pas une puissance de 2, des "BYE" seront insérés.
                                        </div>
                                    </div>
                                )}

                                <div className="flex justify-end gap-3 pt-2 border-t border-white/10">
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={onClose}
                                        disabled={loading}
                                    >
                                        Annuler
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="primary"
                                        onClick={handleSubmit}
                                        disabled={loading || selectedTeams.length < 2}
                                        isLoading={loading}
                                    >
                                        Valider la sélection
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    )
}
