import { useState } from 'react'
import { X, Trophy, Save, Trash2, AlertTriangle, Settings } from 'lucide-react'
import { Card } from './ui/Card'
import { Button } from './ui/Button'
import type { Stage, ScoringRules } from '../types'

interface StageSettingsModalProps {
    stage: Stage
    globalRules: ScoringRules
    onSave: (stageId: string, updates: Partial<Stage>) => Promise<void>
    onDelete: (stageId: string) => Promise<void>
    onClose: () => void
}

export function StageSettingsModal({ stage, globalRules, onSave, onDelete, onClose }: StageSettingsModalProps) {
    const [name, setName] = useState(stage.name)
    const [overrideRules, setOverrideRules] = useState(!!stage.scoring_rules)
    const [rules, setRules] = useState<ScoringRules>(stage.scoring_rules || globalRules)
    const [loading, setLoading] = useState(false)

    // Confirmation de suppression
    const [deleteConfirm, setDeleteConfirm] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim()) return

        setLoading(true)
        try {
            await onSave(stage.id, {
                name,
                scoring_rules: overrideRules ? rules : null
            })
            onClose()
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async () => {
        setLoading(true)
        try {
            await onDelete(stage.id)
            onClose()
        } catch (err) {
            console.error(err)
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <Card className="w-full max-w-md relative overflow-hidden flex flex-col max-h-[90vh]">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
                    <Settings className="w-5 h-5 text-gray-400" />
                    Paramètres de la phase
                </h2>
                <p className="text-sm text-gray-400 mb-6">Configuration de "{stage.name}"</p>

                <div className="flex-1 overflow-y-auto pr-2 space-y-6">
                    {/* NOM DE LA PHASE */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">Nom</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 outline-none transition-all"
                        />
                    </div>

                    <div className="h-px bg-white/10" />

                    {/* RÈGLES DE POINTS */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-bold text-white flex items-center gap-2">
                                <Trophy className="w-4 h-4 text-yellow-400" /> Règles de points
                            </label>
                            <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
                                <span className={overrideRules ? 'text-white' : 'text-gray-500'}>Personnaliser</span>
                                <input
                                    type="checkbox"
                                    checked={overrideRules}
                                    onChange={(e) => setOverrideRules(e.target.checked)}
                                    className="accent-violet-600"
                                />
                            </label>
                        </div>

                        {!overrideRules && (
                            <div className="bg-white/5 rounded-lg p-3 text-sm text-gray-400 italic border border-white/5">
                                Utilise les règles par défaut du tournoi.
                            </div>
                        )}

                        <div className={`space-y-3 transition-opacity duration-200 ${overrideRules ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs text-gray-400">Bon vainqueur</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            min="0"
                                            value={rules.correct_winner_points}
                                            onChange={(e) => setRules({ ...rules, correct_winner_points: parseInt(e.target.value) || 0 })}
                                            className="w-full bg-black/30 border border-white/10 rounded px-3 py-2 text-white text-center font-mono focus:border-violet-500/50 outline-none"
                                        />
                                        <span className="absolute right-3 top-2 text-gray-500 text-xs mt-0.5">pts</span>
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs text-gray-400">Score exact (Bonus)</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            min="0"
                                            value={rules.exact_score_bonus}
                                            onChange={(e) => setRules({ ...rules, exact_score_bonus: parseInt(e.target.value) || 0 })}
                                            className="w-full bg-black/30 border border-white/10 rounded px-3 py-2 text-white text-center font-mono focus:border-cyan-500/50 outline-none"
                                        />
                                        <span className="absolute right-3 top-2 text-gray-500 text-xs mt-0.5">pts</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-white/10" />

                    {/* ZONE DANGER */}
                    <div className="space-y-4 pt-2">
                        {!deleteConfirm ? (
                            <button
                                type="button"
                                onClick={() => setDeleteConfirm(true)}
                                className="flex items-center gap-2 text-red-400 hover:text-red-300 transition-colors text-sm font-medium w-full p-2 rounded hover:bg-red-500/10"
                            >
                                <Trash2 className="w-4 h-4" /> Supprimer cette phase
                            </button>
                        ) : (
                            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 space-y-3 animate-in zoom-in-95">
                                <div className="flex items-start gap-3">
                                    <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                                    <div className="space-y-1">
                                        <p className="text-sm font-bold text-red-400">Êtes-vous sûr ?</p>
                                        <p className="text-xs text-red-300/80 leading-relaxed">
                                            Cette action supprimera définitivement la phase "{stage.name}" et <strong>tous les matchs et pronostics associés</strong>.
                                            Les points gagnés dans cette phase seront perdus.
                                        </p>
                                    </div>
                                </div>
                                <div className="flex justify-end gap-2 pt-1">
                                    <Button size="sm" variant="secondary" onClick={() => setDeleteConfirm(false)}>
                                        Annuler
                                    </Button>
                                    <Button size="sm" variant="danger" onClick={handleDelete} isLoading={loading}>
                                        Confirmer suppression
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-white/10 mt-2">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={onClose}
                        disabled={loading}
                    >
                        Fermer
                    </Button>
                    <Button
                        type="button"
                        variant="primary"
                        onClick={handleSubmit}
                        disabled={loading || !name.trim()}
                        isLoading={loading}
                        icon={<Save className="w-4 h-4" />}
                    >
                        Enregistrer
                    </Button>
                </div>
            </Card>
        </div>
    )
}
