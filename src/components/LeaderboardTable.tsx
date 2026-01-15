import { useState } from 'react'
import type { LeaderboardEntry } from '../services/leaderboard'
import { Trophy, Medal, Trash2, Loader2 } from 'lucide-react'
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
}

export function LeaderboardTable({
  entries,
  loading,
  isAdmin = false,
  adminId,
  onRemoveParticipant,
}: LeaderboardTableProps) {
  const [removingUserId, setRemovingUserId] = useState<string | null>(null)

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

  return (
    <div className="overflow-hidden">
      {/* Top 3 Podium for larger lists */}
      {entries.length >= 3 && (
        <div className="hidden md:flex justify-center items-end gap-4 py-6 px-4 bg-gradient-to-b from-white/5 to-transparent border-b border-white/5">
          {/* Second place */}
          <div className="flex flex-col items-center animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <div className="relative">
              {getAvatarDisplay(entries[1])}
              <div className="absolute -bottom-2 -right-2 bg-gray-800 rounded-full p-0.5 border border-gray-700">
                <Medal className="w-4 h-4 text-gray-300" />
              </div>
            </div>
            <span className="mt-2 text-sm font-medium text-gray-300 truncate max-w-[80px]">
              {entries[1].username}
            </span>
            <span className="text-xs text-gray-500 font-mono">{entries[1].total_points} pts</span>
          </div>

          {/* First place */}
          <div className="flex flex-col items-center -mt-4 animate-slide-up" style={{ animationDelay: '0s' }}>
            <div className="relative">
              <div className="absolute -inset-3 bg-yellow-500/20 rounded-full blur-xl animate-pulse-glow" />
              <div className="relative">
                {getAvatarDisplay(entries[0])}
              </div>
              <div className="absolute -bottom-2 -right-2 bg-gray-800 rounded-full p-0.5 border border-yellow-900">
                <Trophy className="w-5 h-5 text-yellow-400" />
              </div>
            </div>
            <span className="mt-2 text-sm font-semibold text-white truncate max-w-[80px]">
              {entries[0].username}
            </span>
            <span className="text-sm text-yellow-400 font-mono font-bold text-glow-gold">
              {entries[0].total_points} pts
            </span>
          </div>

          {/* Third place */}
          <div className="flex flex-col items-center animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <div className="relative">
              {getAvatarDisplay(entries[2])}
              <div className="absolute -bottom-2 -right-2 bg-gray-800 rounded-full p-0.5 border border-amber-900">
                <Medal className="w-4 h-4 text-amber-600" />
              </div>
            </div>
            <span className="mt-2 text-sm font-medium text-gray-300 truncate max-w-[80px]">
              {entries[2].username}
            </span>
            <span className="text-xs text-gray-500 font-mono">{entries[2].total_points} pts</span>
          </div>
        </div>
      )}

      {/* Full table */}
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider w-16">
                #
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Joueur
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider w-28">
                Points
              </th>
              {isAdmin && onRemoveParticipant && (
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider w-20">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5" data-stagger>
            {entries.map((entry, index) => (
              <tr
                key={entry.user_id}
                className={`transition-all duration-300 ${getRowStyle(entry)}`}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <td className="px-4 py-3.5 whitespace-nowrap">
                  <div className="flex items-center justify-center">
                    {getRankDisplay(entry.rank ?? 0)}
                  </div>
                </td>
                <td className="px-4 py-3.5 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    {getAvatarDisplay(entry)}
                    <div className="flex flex-col">
                      <span className={`font-semibold ${entry.isCurrentUser ? 'text-violet-300' : 'text-gray-100'}`}>
                        {entry.username}
                      </span>
                      {entry.isCurrentUser && (
                        <span className="text-[10px] text-violet-400 uppercase tracking-wider font-semibold">
                          C'est toi !
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3.5 whitespace-nowrap text-right">
                  <div className="flex items-center justify-end gap-2">
                    <span className={`
                      font-mono font-bold text-xl
                      ${entry.rank === 1 ? 'text-yellow-400 text-glow-gold' :
                        entry.rank === 2 ? 'text-gray-300' :
                          entry.rank === 3 ? 'text-amber-500' :
                            entry.isCurrentUser ? 'text-violet-400' :
                              'text-white'
                      }
                    `}>
                      {entry.total_points}
                    </span>
                    <span className="text-xs text-gray-500 font-medium">pts</span>
                  </div>
                </td>
                {isAdmin && onRemoveParticipant && (
                  <td className="px-4 py-3.5 whitespace-nowrap text-center">
                    {entry.user_id !== adminId ? (
                      <button
                        onClick={() => handleRemove(entry.user_id, entry.username)}
                        disabled={removingUserId === entry.user_id}
                        className="p-2 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        title={`Exclure ${entry.username}`}
                      >
                        {removingUserId === entry.user_id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    ) : (
                      <span className="text-xs text-gray-600 italic">Admin</span>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
