import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Trophy, Save, Trash2, AlertTriangle, Settings } from 'lucide-react'
import { Button } from './ui/Button'
import type { Stage, ScoringRules, MatchFormat } from '../types'

interface StageSettingsModalProps {
    stage: Stage
    onSave: (stageId: string, updates: Partial<Stage>) => Promise<void>
    onDelete: (stageId: string) => Promise<void>
    onClose: () => void
}

export function StageSettingsModal({ stage, onSave, onDelete, onClose }: StageSettingsModalProps) {
    const [name, setName] = useState(stage.name)
    // Default to existing rules or standard fallback if null (should not happen with new creation process)
    const [rules, setRules] = useState<ScoringRules>(stage.scoring_rules || { correct_winner_points: 3, exact_score_bonus: 1 })
    const [loading, setLoading] = useState(false)

    // Confirmation de suppression
    const [deleteConfirm, setDeleteConfirm] = useState(false)

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
            await onSave(stage.id, {
                name,
                scoring_rules: rules
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
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
                                    <Settings className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-white">
                                        Paramètres de la phase
                                    </h2>
                                    <p className="text-sm text-gray-400">
                                        Configuration de "{stage.name}"
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
                            <form className="relative p-6 space-y-6">
                                {/* NOM DE LA PHASE */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-300">Nom</label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 outline-none transition-all"
                                    />
                                </div>

                                <div className="h-px bg-white/10" />

                                {/* RÈGLES DE POINTS */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-bold text-white flex items-center gap-2">
                                            <Trophy className="w-4 h-4 text-yellow-400" /> Règles de points
                                        </label>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Bon vainqueur</label>
                                                <div className="relative group">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={rules.correct_winner_points}
                                                        onChange={(e) => setRules({ ...rules, correct_winner_points: parseInt(e.target.value) || 0 })}
                                                        className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white text-center font-mono text-lg focus:border-violet-500/50 outline-none transition-all group-hover:border-white/20"
                                                    />
                                                    <span className="absolute right-4 top-3.5 text-gray-600 text-xs font-medium">PTS</span>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Score exact (Bonus)</label>
                                                <div className="relative group">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={rules.exact_score_bonus}
                                                        onChange={(e) => setRules({ ...rules, exact_score_bonus: parseInt(e.target.value) || 0 })}
                                                        className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white text-center font-mono text-lg focus:border-cyan-500/50 outline-none transition-all group-hover:border-white/20"
                                                    />
                                                    <span className="absolute right-4 top-3.5 text-gray-600 text-xs font-medium">PTS</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Per-format overrides */}
                                    <label className="flex items-center gap-2 cursor-pointer mt-2">
                                        <input
                                            type="checkbox"
                                            checked={!!rules.per_format && Object.keys(rules.per_format).length > 0}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setRules(prev => ({ ...prev, per_format: prev.per_format || {} }))
                                                } else {
                                                    const { per_format: _, ...rest } = rules
                                                    setRules(rest as ScoringRules)
                                                }
                                            }}
                                            className="w-3.5 h-3.5 rounded accent-violet-500"
                                        />
                                        <span className="text-xs text-gray-400">Points differents par format (BO1/BO3/BO5/BO7)</span>
                                    </label>
                                    {rules.per_format !== undefined && (
                                        <div className="grid grid-cols-2 gap-2 mt-2">
                                            {(['BO1', 'BO3', 'BO5', 'BO7'] as MatchFormat[]).map(fmt => {
                                                const ov = rules.per_format?.[fmt]
                                                return (
                                                    <div key={fmt} className="flex items-center gap-1.5 text-xs">
                                                        <span className="text-gray-500 w-8 font-mono">{fmt}</span>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            placeholder={String(rules.correct_winner_points)}
                                                            value={ov?.correct_winner_points ?? ''}
                                                            onChange={(e) => {
                                                                const val = e.target.value
                                                                setRules(prev => {
                                                                    const pf = { ...prev.per_format }
                                                                    const cur = pf[fmt] || {}
                                                                    if (val === '') {
                                                                        const { correct_winner_points: _, ...rest } = cur
                                                                        if (Object.keys(rest).length === 0) delete pf[fmt]
                                                                        else pf[fmt] = rest
                                                                    } else {
                                                                        pf[fmt] = { ...cur, correct_winner_points: parseInt(val) || 0 }
                                                                    }
                                                                    return { ...prev, per_format: pf }
                                                                })
                                                            }}
                                                            className="w-14 bg-black/30 border border-white/10 rounded-lg px-2 py-1.5 text-center font-mono text-violet-400 focus:border-violet-500/50 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none placeholder:text-gray-700"
                                                        />
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            placeholder={String(rules.exact_score_bonus)}
                                                            value={ov?.exact_score_bonus ?? ''}
                                                            onChange={(e) => {
                                                                const val = e.target.value
                                                                setRules(prev => {
                                                                    const pf = { ...prev.per_format }
                                                                    const cur = pf[fmt] || {}
                                                                    if (val === '') {
                                                                        const { exact_score_bonus: _, ...rest } = cur
                                                                        if (Object.keys(rest).length === 0) delete pf[fmt]
                                                                        else pf[fmt] = rest
                                                                    } else {
                                                                        pf[fmt] = { ...cur, exact_score_bonus: parseInt(val) || 0 }
                                                                    }
                                                                    return { ...prev, per_format: pf }
                                                                })
                                                            }}
                                                            className="w-14 bg-black/30 border border-white/10 rounded-lg px-2 py-1.5 text-center font-mono text-cyan-400 focus:border-cyan-500/50 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none placeholder:text-gray-700"
                                                        />
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>

                                <div className="h-px bg-white/10" />

                                {/* ZONE DANGER */}
                                <div className="space-y-4 pt-2">
                                    {!deleteConfirm ? (
                                        <button
                                            type="button"
                                            onClick={() => setDeleteConfirm(true)}
                                            className="group flex items-center justify-center gap-2 text-red-400 hover:text-red-300 transition-all text-sm font-medium w-full p-3 rounded-xl hover:bg-red-500/10 border border-transparent hover:border-red-500/20"
                                        >
                                            <Trash2 className="w-4 h-4 transition-transform group-hover:scale-110" /> Supprimer cette phase uniquement
                                        </button>
                                    ) : (
                                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-5 space-y-4 animate-in zoom-in-95">
                                            <div className="flex items-start gap-4">
                                                <div className="p-2 bg-red-500/20 rounded-lg shrink-0">
                                                    <AlertTriangle className="w-6 h-6 text-red-500" />
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-base font-bold text-red-400">Supprimer la phase "{stage.name}" ?</p>
                                                    <p className="text-sm text-red-300/80 leading-relaxed">
                                                        Cette action est irréversible. Elle supprimera <strong>uniquement cette phase</strong> ainsi que ses matchs et pronostics.
                                                        <br /><br />
                                                        <span className="text-xs uppercase tracking-wide font-bold opacity-75">Le reste du tournoi ne sera pas affecté.</span>
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex justify-end gap-3 pt-2">
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

                                <div className="flex justify-end gap-3 pt-4 border-t border-white/10 mt-2">
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
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    )
}
