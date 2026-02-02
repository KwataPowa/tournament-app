import { useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { X, Users, Check, AlertTriangle, Shuffle } from 'lucide-react'
import { Button } from './ui/Button'
import type { Match, Team, MatchFormat } from '../types'
import { calculateSwissStandings, type SwissStanding } from '../services/swiss'

type SwissPairingAssistantProps = {
    teams: Team[]
    matches: Match[]
    opponentHistory: Record<string, string[]>
    roundNumber: number
    defaultMatchFormat: MatchFormat
    onCreateMatches: (pairings: { team_a: string; team_b: string | null; is_bye: boolean }[]) => Promise<void>
    onClose: () => void
}

type Pairing = {
    team_a: string
    team_b: string | null
    is_bye: boolean
}

export function SwissPairingAssistant({
    teams,
    matches,
    opponentHistory,
    roundNumber,
    defaultMatchFormat: _defaultMatchFormat,
    onCreateMatches,
    onClose
}: SwissPairingAssistantProps) {
    const [selectedTeamA, setSelectedTeamA] = useState<string | null>(null)
    const [pairings, setPairings] = useState<Pairing[]>([])
    const [loading, setLoading] = useState(false)

    // Calculer les standings actuels
    const standings = useMemo(() => {
        const teamNames = teams.map(t => t.name)
        return calculateSwissStandings(teamNames, matches, opponentHistory)
    }, [teams, matches, opponentHistory])

    // Grouper par score
    const teamsByScore = useMemo(() => {
        const groups = new Map<number, SwissStanding[]>()
        standings.forEach(s => {
            const group = groups.get(s.points) || []
            group.push(s)
            groups.set(s.points, group)
        })
        // Trier par score décroissant
        return Array.from(groups.entries())
            .sort((a, b) => b[0] - a[0])
            .map(([score, teams]) => ({ score, teams }))
    }, [standings])

    // Équipes déjà pairées dans cette session
    const pairedTeams = useMemo(() => {
        const set = new Set<string>()
        pairings.forEach(p => {
            set.add(p.team_a)
            if (p.team_b) set.add(p.team_b)
        })
        return set
    }, [pairings])

    // Équipes disponibles (non pairées)
    const availableTeams = useMemo(() => {
        return standings.filter(s => !pairedTeams.has(s.team))
    }, [standings, pairedTeams])

    // Vérifier si deux équipes se sont déjà affrontées
    const hasPlayed = (teamA: string, teamB: string) => {
        return opponentHistory[teamA]?.includes(teamB) || false
    }

    // Sélectionner une équipe
    const handleSelectTeam = (teamName: string) => {
        if (pairedTeams.has(teamName)) return

        if (!selectedTeamA) {
            setSelectedTeamA(teamName)
        } else if (selectedTeamA === teamName) {
            setSelectedTeamA(null)
        } else {
            // Créer le pairing
            setPairings([...pairings, {
                team_a: selectedTeamA,
                team_b: teamName,
                is_bye: false
            }])
            setSelectedTeamA(null)
        }
    }

    // Assigner un BYE
    const handleAssignBye = (teamName: string) => {
        if (pairedTeams.has(teamName)) return
        setPairings([...pairings, {
            team_a: teamName,
            team_b: null,
            is_bye: true
        }])
        setSelectedTeamA(null)
    }

    // Retirer un pairing
    const handleRemovePairing = (index: number) => {
        setPairings(pairings.filter((_, i) => i !== index))
    }

    // Valider et créer les matchs
    const handleConfirm = async () => {
        if (pairings.length === 0) return
        setLoading(true)
        try {
            await onCreateMatches(pairings)
            onClose()
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    // Vérifier si la ronde est complète (toutes les équipes pairées)
    const isRoundComplete = availableTeams.length === 0 ||
        (availableTeams.length === 1 && pairings.some(p => p.is_bye))

    // Obtenir le logo d'une équipe
    const getTeamLogo = (name: string) => teams.find(t => t.name === name)?.logo

    return createPortal(
        <div className="fixed inset-0 z-[9999]">
            <div
                className="fixed inset-0 bg-black/80 backdrop-blur-sm"
                onClick={onClose}
            />

            <div className="fixed inset-0 z-10 overflow-y-auto" onClick={onClose}>
                <div className="flex min-h-full items-center justify-center p-4">
                    <div
                        className="relative w-full max-w-4xl bg-gray-900 border border-white/10 rounded-2xl shadow-2xl my-8"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="px-6 py-5 border-b border-white/10">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                                    <Shuffle className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-white">
                                        Pairages Ronde {roundNumber}
                                    </h2>
                                    <p className="text-sm text-gray-400">
                                        Sélectionne deux équipes du même niveau pour créer un match
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
                        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Left: Teams by score */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2">
                                    <Users className="w-4 h-4" />
                                    Équipes par score
                                </h3>

                                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                                    {teamsByScore.map(({ score, teams: groupTeams }) => (
                                        <div key={score} className="bg-white/5 rounded-lg p-3 border border-white/5">
                                            <div className="text-xs font-medium text-emerald-400 mb-2">
                                                Score: {score} point{score !== 1 ? 's' : ''} ({groupTeams.length} équipe{groupTeams.length > 1 ? 's' : ''})
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {groupTeams.map(team => {
                                                    const isPaired = pairedTeams.has(team.team)
                                                    const isSelected = selectedTeamA === team.team
                                                    const wouldBeRematch = selectedTeamA && hasPlayed(selectedTeamA, team.team)

                                                    return (
                                                        <button
                                                            key={team.team}
                                                            onClick={() => handleSelectTeam(team.team)}
                                                            disabled={isPaired}
                                                            className={`
                                                                flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all
                                                                ${isPaired
                                                                    ? 'bg-gray-700/50 text-gray-500 cursor-not-allowed opacity-50'
                                                                    : isSelected
                                                                        ? 'bg-emerald-500 text-white ring-2 ring-emerald-400'
                                                                        : wouldBeRematch
                                                                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30'
                                                                            : 'bg-white/10 text-white hover:bg-white/20 border border-transparent'
                                                                }
                                                            `}
                                                            title={wouldBeRematch ? 'Attention: rematch' : undefined}
                                                        >
                                                            {getTeamLogo(team.team) ? (
                                                                <img src={getTeamLogo(team.team)} className="w-4 h-4 object-contain" />
                                                            ) : (
                                                                <div className="w-4 h-4 rounded bg-gray-600 flex items-center justify-center text-[8px]">
                                                                    {team.team.charAt(0)}
                                                                </div>
                                                            )}
                                                            {team.team}
                                                            {isPaired && <Check className="w-3 h-3 text-emerald-400" />}
                                                            {wouldBeRematch && !isPaired && <AlertTriangle className="w-3 h-3" />}
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* BYE option si nombre impair */}
                                {availableTeams.length === 1 && !pairings.some(p => p.is_bye) && (
                                    <div className="p-3 bg-violet-500/10 border border-violet-500/20 rounded-lg">
                                        <p className="text-sm text-violet-300 mb-2">
                                            Une équipe reste sans adversaire
                                        </p>
                                        <Button
                                            size="sm"
                                            onClick={() => handleAssignBye(availableTeams[0].team)}
                                        >
                                            Assigner BYE à {availableTeams[0].team}
                                        </Button>
                                    </div>
                                )}
                            </div>

                            {/* Right: Created pairings */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-medium text-gray-300">
                                    Matchs créés ({pairings.length})
                                </h3>

                                {pairings.length === 0 ? (
                                    <div className="text-center py-12 text-gray-500 bg-white/5 rounded-lg border border-dashed border-white/10">
                                        <p>Sélectionne deux équipes pour créer un match</p>
                                        <p className="text-xs mt-1">Clique sur une équipe, puis sur son adversaire</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                                        {pairings.map((pairing, index) => (
                                            <div
                                                key={index}
                                                className={`
                                                    flex items-center justify-between p-3 rounded-lg border
                                                    ${pairing.is_bye
                                                        ? 'bg-violet-500/10 border-violet-500/20'
                                                        : hasPlayed(pairing.team_a, pairing.team_b!)
                                                            ? 'bg-amber-500/10 border-amber-500/20'
                                                            : 'bg-emerald-500/10 border-emerald-500/20'
                                                    }
                                                `}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-center gap-2">
                                                        {getTeamLogo(pairing.team_a) ? (
                                                            <img src={getTeamLogo(pairing.team_a)} className="w-5 h-5 object-contain" />
                                                        ) : (
                                                            <div className="w-5 h-5 rounded bg-gray-600 flex items-center justify-center text-[10px]">
                                                                {pairing.team_a.charAt(0)}
                                                            </div>
                                                        )}
                                                        <span className="text-white font-medium">{pairing.team_a}</span>
                                                    </div>

                                                    <span className="text-gray-500 text-sm">vs</span>

                                                    {pairing.is_bye ? (
                                                        <span className="text-violet-400 font-medium">BYE</span>
                                                    ) : (
                                                        <div className="flex items-center gap-2">
                                                            {getTeamLogo(pairing.team_b!) ? (
                                                                <img src={getTeamLogo(pairing.team_b!)} className="w-5 h-5 object-contain" />
                                                            ) : (
                                                                <div className="w-5 h-5 rounded bg-gray-600 flex items-center justify-center text-[10px]">
                                                                    {pairing.team_b!.charAt(0)}
                                                                </div>
                                                            )}
                                                            <span className="text-white font-medium">{pairing.team_b}</span>
                                                        </div>
                                                    )}

                                                    {!pairing.is_bye && hasPlayed(pairing.team_a, pairing.team_b!) && (
                                                        <span className="text-xs text-amber-400 flex items-center gap-1">
                                                            <AlertTriangle className="w-3 h-3" /> Rematch
                                                        </span>
                                                    )}
                                                </div>

                                                <button
                                                    onClick={() => handleRemovePairing(index)}
                                                    className="text-gray-400 hover:text-red-400 transition-colors"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Status */}
                                <div className={`p-3 rounded-lg text-sm ${isRoundComplete ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-gray-400'}`}>
                                    {isRoundComplete ? (
                                        <span className="flex items-center gap-2">
                                            <Check className="w-4 h-4" />
                                            Toutes les équipes ont un match
                                        </span>
                                    ) : (
                                        <span>
                                            {availableTeams.length} équipe{availableTeams.length > 1 ? 's' : ''} sans match
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-white/10 flex justify-end gap-3">
                            <Button variant="secondary" onClick={onClose} disabled={loading}>
                                Annuler
                            </Button>
                            <Button
                                onClick={handleConfirm}
                                disabled={pairings.length === 0 || loading}
                                isLoading={loading}
                                className="bg-emerald-600 hover:bg-emerald-500"
                            >
                                Créer {pairings.length} match{pairings.length > 1 ? 's' : ''}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    )
}
