import { useState } from 'react'
import type { LeaderboardEntry } from '../services/leaderboard'
import { Trophy, Medal, Trash2, Loader2, Edit2, Check, X, Minus, Plus } from 'lucide-react'
import { AvatarDisplay } from './AvatarDisplay'

type LeaderboardTableProps = {
  entries: LeaderboardEntry[]
  loading?: boolean
  /** Si l'utilisateur courant est admin du tournoi */
  isAdmin?: boolean
  /** ID de l'admin du tournoi (pour empêcher son exclusion) */
  adminId?: string
  /** Callback pour exclure un participant */
  onRemoveParticipant?: (userId: string, username: string) => Promise<void>
  /** Callback pour modifier les points bonus */
  onUpdateBonus?: (userId: string, currentBonus: number) => Promise<void>
  /** Mode compact pour sidebar */
  compact?: boolean
}

export function LeaderboardTable({
  entries,
  loading,
  isAdmin = false,
  adminId,
  onRemoveParticipant,
  onUpdateBonus,
  compact = false,
}: LeaderboardTableProps) {
  const [removingUserId, setRemovingUserId] = useState<string | null>(null)

  // Bonus editing state
  const [editingBonusUser, setEditingBonusUser] = useState<string | null>(null)
  const [bonusValue, setBonusValue] = useState<number>(0)
  const [bonusLoading, setBonusLoading] = useState(false)

  const handleEditBonus = (entry: LeaderboardEntry) => {
    setEditingBonusUser(entry.user_id)
    setBonusValue(entry.bonus_points || 0)
  }

  const handleSaveBonus = async () => {
    if (!editingBonusUser || !onUpdateBonus) return
    setBonusLoading(true)
    try {
      await onUpdateBonus(editingBonusUser, bonusValue)
      setEditingBonusUser(null)
    } catch (err) {
      console.error(err)
      alert("Erreur lors de la mise à jour des points bonus")
    } finally {
      setBonusLoading(false)
    }
  }

  // Composant inline pour éditer le bonus
  const BonusEditor = ({ entry }: { entry: LeaderboardEntry }) => {
    if (editingBonusUser !== entry.user_id) return null

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setEditingBonusUser(null)}>
        <div className="absolute inset-0 bg-black/60" />
        <div
          className="relative bg-slate-900 border border-white/10 rounded-xl p-4 shadow-2xl w-64"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-400">Bonus pour</span>
            <span className="text-sm font-medium text-white truncate max-w-[120px]">{entry.username}</span>
          </div>

          <div className="flex items-center justify-center gap-3 mb-4">
            <button
              onClick={() => setBonusValue(prev => prev - 1)}
              className="w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all"
            >
              <Minus className="w-4 h-4" />
            </button>

            <input
              type="number"
              value={bonusValue}
              onChange={(e) => setBonusValue(parseInt(e.target.value) || 0)}
              className="w-16 h-10 bg-black/50 border border-white/10 rounded-lg text-center text-xl font-bold text-white focus:border-violet-500 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              autoFocus
            />

            <button
              onClick={() => setBonusValue(prev => prev + 1)}
              className="w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setEditingBonusUser(null)}
              disabled={bonusLoading}
              className="flex-1 py-2 px-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white text-sm font-medium transition-all flex items-center justify-center gap-1.5"
            >
              <X className="w-3.5 h-3.5" /> Annuler
            </button>
            <button
              onClick={handleSaveBonus}
              disabled={bonusLoading}
              className="flex-1 py-2 px-3 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {bonusLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              OK
            </button>
          </div>
        </div>
      </div>
    )
  }

  const handleRemove = async (userId: string, username: string) => {
    if (!onRemoveParticipant) return

    const confirmed = window.confirm(
      `Voulez-vous vraiment exclure ${username} ? Ses pronostics seront effacés.`
    )
    if (!confirmed) return

    setRemovingUserId(userId)
    try {
      await onRemoveParticipant(userId, username)
    } finally {
      setRemovingUserId(null)
    }
  }

  if (loading) {
    return (
<div className="text-center py-12">
        <div className="inline-flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
          <span className="text-gray-400">Chargement du classement...</span>
        </div>
      </div>
    )
  }

  if (entries.length === 0) {
    return (
<div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
          <Trophy className="w-8 h-8 text-white/50" />
        </div>
        <p className="text-gray-400">Aucun participant pour le moment.</p>
      </div>
    )
  }

  // Icône de médaille pour les 3 premiers
  function getRankDisplay(rank: number): React.ReactNode {
    switch (rank) {
      case 1:
        return <Trophy className="w-6 h-6 text-yellow-400 drop-shadow-lg" />
      case 2:
        return <Medal className="w-6 h-6 text-gray-300 drop-shadow-lg" />
      case 3:
        return <Medal className="w-6 h-6 text-amber-600 drop-shadow-lg" />
      default:
        return (
          <span className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-gray-500 font-mono font-bold text-xs">
            {rank}
          </span>
        )
    }
  }

  // Afficher l'avatar (utilisant AvatarDisplay)
  function getAvatarDisplay(entry: LeaderboardEntry): React.ReactNode {
    const ringColor = entry.rank === 1 ? 'ring-yellow-500/50' :
      entry.rank === 2 ? 'ring-gray-400/50' :
        entry.rank === 3 ? 'ring-amber-600/50' :
          entry.isCurrentUser ? 'ring-violet-500/50' : 'ring-white/10'

    // Background gradient based on rank or user
    const bgClass = entry.rank === 1 ? 'bg-gradient-to-br from-yellow-500/20 to-yellow-900/20' :
      entry.rank === 2 ? 'bg-gradient-to-br from-gray-500/20 to-gray-900/20' :
        entry.rank === 3 ? 'bg-gradient-to-br from-amber-500/20 to-amber-900/20' :
          'bg-gradient-to-br from-white/10 to-white/5'

    return (
      <div className={`
        w-10 h-10 flex items-center justify-center
        rounded-full ring-2 ${ringColor} shadow-lg overflow-hidden
        ${bgClass}
      `}>
        <AvatarDisplay
          avatar={entry.avatar_url}
          fallbackText={entry.username.charAt(0).toUpperCase()}
          className="w-5 h-5" // Icon size
        />
      </div>
    )
  }

  // Get row styling based on rank
  function getRowStyle(entry: LeaderboardEntry): string {
    if (entry.isCurrentUser && entry.rank && entry.rank <= 3) {
      // Current user in top 3 - combine both styles
      return entry.rank === 1 ? 'leaderboard-row-1 leaderboard-row-current' :
        entry.rank === 2 ? 'leaderboard-row-2 leaderboard-row-current' :
          'leaderboard-row-3 leaderboard-row-current'
    }

    if (entry.rank === 1) return 'leaderboard-row-1'
    if (entry.rank === 2) return 'leaderboard-row-2'
    if (entry.rank === 3) return 'leaderboard-row-3'
    if (entry.isCurrentUser) return 'leaderboard-row-current'

    return 'hover:bg-white/5'
  }

  // Mode compact pour sidebar
  if (compact) {
    const showActions = isAdmin && onUpdateBonus

    return (
      <div className="overflow-hidden bg-white/5 rounded-lg border border-white/5">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/5 text-gray-400 font-medium">
              <th className="px-3 py-2 text-left w-10">#</th>
              <th className="px-3 py-2 text-left">Joueur</th>
              <th className="px-3 py-2 text-center w-12 text-violet-400" title="Bonus">Bon.</th>
              <th className="px-3 py-2 text-center w-14 text-white font-bold" title="Points">Pts</th>
              {showActions && <th className="px-2 py-2 w-10"></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {entries.map((entry) => {
              let rankIcon = null
              let rowClass = "hover:bg-white/5 transition-colors"

              if (entry.rank === 1) {
                rankIcon = <Trophy className="w-3.5 h-3.5 text-yellow-400" />
                rowClass += " bg-yellow-500/5 hover:bg-yellow-500/10"
              } else if (entry.rank === 2) {
                rankIcon = <Medal className="w-3.5 h-3.5 text-gray-300" />
              } else if (entry.rank === 3) {
                rankIcon = <Medal className="w-3.5 h-3.5 text-amber-600" />
              }

              if (entry.isCurrentUser) {
                rowClass += " bg-violet-500/10"
              }

              return (
                <tr key={entry.user_id} className={rowClass}>
                  <td className="px-3 py-2 font-mono text-gray-500">
                    <div className="flex items-center justify-center">
                      {rankIcon || entry.rank}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className={`
                        w-5 h-5 flex-shrink-0 flex items-center justify-center rounded-full overflow-hidden
                        ${entry.rank === 1 ? 'ring-1 ring-yellow-500/50 bg-yellow-500/10' :
                          entry.rank === 2 ? 'ring-1 ring-gray-400/50 bg-gray-500/10' :
                            entry.rank === 3 ? 'ring-1 ring-amber-500/50 bg-amber-500/10' :
                              entry.isCurrentUser ? 'ring-1 ring-violet-500/50 bg-violet-500/10' :
                                'bg-white/10'
                        }
                      `}>
                        <AvatarDisplay
                          avatar={entry.avatar_url}
                          fallbackText={entry.username.charAt(0).toUpperCase()}
                          className="w-3.5 h-3.5"
                        />
                      </div>
                      <span className={`truncate max-w-[100px] ${entry.isCurrentUser ? 'text-violet-300 font-semibold' : entry.rank === 1 ? 'font-semibold text-white' : 'text-gray-300'}`}>
                        {entry.username}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className={`font-mono ${entry.bonus_points !== 0 ? (entry.bonus_points > 0 ? 'text-green-400' : 'text-red-400') : 'text-gray-500'}`}>
                      {entry.bonus_points !== 0 ? (entry.bonus_points > 0 ? `+${entry.bonus_points}` : entry.bonus_points) : '-'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className={`font-bold font-mono ${entry.rank === 1 ? 'text-yellow-400' : entry.isCurrentUser ? 'text-violet-400' : 'text-white'}`}>
                      {entry.total_points}
                    </span>
                  </td>
                  {showActions && (
                    <td className="px-2 py-2">
                      <button
                        onClick={() => handleEditBonus(entry)}
                        className="p-1 rounded text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 transition-all"
                        title="Modifier bonus"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>

        {/* Bonus Editor */}
        {entries.map(entry => <BonusEditor key={`bonus-${entry.user_id}`} entry={entry} />)}
      </div>
    )
  }

  // Mode normal (full width)
  return (
    <div className="overflow-hidden bg-white/5 rounded-lg border border-white/5">
      <div className="overflow-x-auto scrollbar-hide">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-white/10 bg-white/5">
              <th className="px-2 md:px-4 py-3 text-left text-[10px] md:text-xs font-semibold text-gray-400 uppercase tracking-wider w-12 md:w-16">
                #
              </th>
              <th className="px-2 md:px-4 py-3 text-left text-[10px] md:text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Joueur
              </th>
              <th className="px-2 md:px-4 py-3 text-right text-[10px] md:text-xs font-semibold text-gray-400 uppercase tracking-wider w-20 md:w-28">
                Pts
              </th>
              {(isAdmin && (onRemoveParticipant || onUpdateBonus)) && (
                <th className="px-2 md:px-4 py-3 text-center text-[10px] md:text-xs font-semibold text-gray-400 uppercase tracking-wider w-16 md:w-24">
                  <span className="hidden md:inline">Actions</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {entries.map((entry, index) => (
              <tr
                key={entry.user_id}
                className={`transition-all duration-300 ${getRowStyle(entry)}`}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <td className="px-2 md:px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center justify-center">
                    {getRankDisplay(entry.rank ?? 0)}
                  </div>
                </td>
                <td className="px-2 md:px-4 py-3 whitespace-nowrap overflow-hidden">
                  <div className="flex items-center gap-2 md:gap-3">
                    {getAvatarDisplay(entry)}
                    <div className="flex flex-col min-w-0">
                      <span className={`font-semibold text-sm md:text-base truncate max-w-[100px] xs:max-w-[140px] md:max-w-none block ${entry.isCurrentUser ? 'text-violet-300' : 'text-gray-100'}`}>
                        {entry.username}
                      </span>
                      {entry.isCurrentUser && (
                        <span className="text-[9px] md:text-[10px] text-violet-400 uppercase tracking-wider font-semibold">
                          Moi
                        </span>
                      )}
                    </div>
                  </div>
                </td>

                <td className="px-2 md:px-4 py-3 whitespace-nowrap text-right">
                  <div className="flex items-center justify-end gap-0.5 md:gap-2">
                    {entry.bonus_points !== 0 && (
                      <span className="text-[9px] md:text-xs text-green-400 font-mono mr-0.5 md:mr-1" title="Points bonus admin">
                        ({entry.bonus_points > 0 ? '+' : ''}{entry.bonus_points})
                      </span>
                    )}
                    <span className={`
                      font-mono font-bold text-lg md:text-xl
                      ${entry.rank === 1 ? 'text-yellow-400 text-glow-gold' :
                        entry.rank === 2 ? 'text-gray-300' :
                          entry.rank === 3 ? 'text-amber-500' :
                            entry.isCurrentUser ? 'text-violet-400' :
                              'text-white'
                      }
                    `}>
                      {entry.total_points}
                    </span>
                    <span className="hidden md:inline text-xs text-gray-500 font-medium ml-1">pts</span>
                  </div>
                </td>
                {(isAdmin && (onRemoveParticipant || onUpdateBonus)) && (
                  <td className="px-2 md:px-4 py-3 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center gap-1 md:gap-2">
                      {onUpdateBonus && (
                        <button
                          onClick={() => handleEditBonus(entry)}
                          className="p-1.5 rounded-lg text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 transition-all"
                          title="Modifier bonus points"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}

                      {onRemoveParticipant && (
                        entry.user_id !== adminId ? (
                          <button
                            onClick={() => handleRemove(entry.user_id, entry.username)}
                            disabled={removingUserId === entry.user_id}
                            className="p-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            title={`Exclure ${entry.username}`}
                          >
                            {removingUserId === entry.user_id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        ) : (
                          <div className="w-7 h-7" />
                        )
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bonus Editor */}
      {entries.map(entry => <BonusEditor key={`bonus-${entry.user_id}`} entry={entry} />)}
    </div>
  )
}
