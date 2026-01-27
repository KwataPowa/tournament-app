import { useState } from 'react'
import { X, Users, Check, Trophy, Shuffle, Hand } from 'lucide-react'
import { Card } from './ui/Card'
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

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <Card className="w-full max-w-lg relative overflow-hidden flex flex-col max-h-[90vh]">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
                    <Users className="w-5 h-5 text-violet-400" />
                    Sélection des participants
                </h2>
                <p className="text-sm text-gray-400 mb-4">
                    Choisissez les équipes qui participeront à la phase "{stage.name}".
                </p>

                {/* Mode de génération - AVANT la liste pour clarté */}
                {stage.type !== 'league' && (
                    <div className="mb-4 space-y-2">
                        <label className="text-sm font-medium text-gray-300">Mode de placement</label>
                        <div className="grid grid-cols-2 gap-3">
                            <div
                                onClick={() => setGenerationMode('auto')}
                                className={`p-3 rounded-lg border cursor-pointer transition-all ${generationMode === 'auto'
                                    ? 'bg-cyan-600/20 border-cyan-500/50'
                                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                                    }`}
                            >
                                <div className="text-sm font-medium text-white mb-1 flex items-center gap-1.5"><Shuffle className="w-4 h-4" /> Aléatoire</div>
                                <div className="text-xs text-gray-400">Les équipes sont mélangées au hasard.</div>
                            </div>
                            <div
                                onClick={() => setGenerationMode('manual')}
                                className={`p-3 rounded-lg border cursor-pointer transition-all ${generationMode === 'manual'
                                    ? 'bg-violet-600/20 border-violet-500/50'
                                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                                    }`}
                            >
                                <div className="text-sm font-medium text-white mb-1 flex items-center gap-1.5"><Hand className="w-4 h-4" /> Manuel</div>
                                <div className="text-xs text-gray-400">Tu places les équipes toi-même.</div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-white">{selectedTeams.length} équipes sélectionnées</span>
                    <button
                        onClick={toggleAll}
                        className="text-xs text-violet-400 hover:text-violet-300 font-medium"
                    >
                        {selectedTeams.length === allTeams.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto bg-black/20 rounded-lg border border-white/5 p-2 space-y-1">
                    {allTeams.map((team) => {
                        const isSelected = selectedTeams.includes(team.name)
                        return (
                            <div
                                key={team.name}
                                onClick={() => toggleTeam(team.name)}
                                className={`flex items-center gap-3 p-3 rounded-md cursor-pointer transition-colors ${isSelected
                                    ? 'bg-violet-600/20 border border-violet-500/30'
                                    : 'hover:bg-white/5 border border-transparent'
                                    }`}
                            >
                                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-violet-600 border-violet-600' : 'border-gray-500'
                                    }`}>
                                    {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                                </div>

                                {team.logo && (
                                    <img src={team.logo} alt={team.name} className="w-6 h-6 object-contain" />
                                )}
                                <span className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-gray-400'}`}>
                                    {team.name}
                                </span>
                            </div>
                        )
                    })}
                </div>

                {stage.type !== 'league' && (
                    <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-start gap-2">
                        <Trophy className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                        <div className="text-xs text-blue-200">
                            <p className="font-semibold mb-0.5">Note importante</p>
                            Un arbre de tournoi sera automatiquement généré avec ces équipes.
                            Si le nombre d'équipe n'est pas une puissance de 2 (4, 8, 16...), des "BYE" (tours exemptés) seront ajoutés automatiquement.
                        </div>
                    </div>
                )}


                <div className="flex justify-end gap-3 pt-6 mt-2 border-t border-white/10">
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
                        Valider ({selectedTeams.length})
                    </Button>
                </div>
            </Card>
        </div>
    )
}
