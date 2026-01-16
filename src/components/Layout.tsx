import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuthContext } from '../lib/AuthContext'
import { useProfile } from '../hooks/useProfile'
import { Button } from './ui/Button'
import { useState, useEffect } from 'react'
import {
  LayoutDashboard,
  Trophy,
  Link as LinkIcon,
  Plus,
  LogOut,
  Swords,
} from 'lucide-react'
import { AvatarDisplay } from './AvatarDisplay'
import { Footer } from './layout/Footer'
import { CookieConsent } from './legal/CookieConsent'

export function Layout() {
  const { signOut } = useAuthContext()
  const { profile, hasProfile } = useProfile()
  const location = useLocation()
  const [scrolled, setScrolled] = useState(false)

  // Handle scroll effect for navbar
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleSignOut = async () => {
    await signOut()
  }

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/'
    }
    // Empêcher /tournaments d'être actif si on est sur /tournaments/join
    if (path === '/tournaments' && location.pathname.startsWith('/tournaments/join')) {
      return false
    }
    return location.pathname.startsWith(path)
  }

  const NAV_ITEMS = [
    { path: '/', icon: <LayoutDashboard className="w-5 h-5" />, label: 'Tableau de bord', tooltip: 'Dashboard' },
    { path: '/tournaments', icon: <Swords className="w-5 h-5" />, label: 'Mes Tournois', tooltip: 'Tournois' },
    { path: '/tournaments/join', icon: <LinkIcon className="w-5 h-5" />, label: 'Rejoindre', tooltip: 'Rejoindre' },
  ]

  return (
    <div className="min-h-screen bg-[#0f0a1e] text-white flex flex-col font-sans selection:bg-violet-500/30">
      {/* Background Atmosphere */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-grid-pattern opacity-30" />

        {/* Primary glow - violet */}
        <div
          className="absolute w-[1000px] h-[1000px] rounded-full animate-gradient"
          style={{
            background: 'radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 70%)',
            top: '-200px',
            left: '-200px',
          }}
        />

        {/* Secondary glow - cyan */}
        <div
          className="absolute w-[800px] h-[800px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(34, 211, 238, 0.08) 0%, transparent 70%)',
            bottom: '-200px',
            right: '-200px',
          }}
        />

        {/* Top center glow */}
        <div
          className="absolute w-[800px] h-[400px] rounded-full opacity-40"
          style={{
            background: 'radial-gradient(circle, rgba(139, 92, 246, 0.1) 0%, transparent 70%)',
            top: '-100px',
            left: '50%',
            transform: 'translateX(-50%)',
          }}
        />

        {/* Noise overlay for texture */}
        <div className="absolute inset-0 bg-noise" />
      </div>

      {/* Top Navigation Bar */}
      <header
        className={`
          fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b border-transparent
          ${scrolled
            ? 'h-16 bg-[#0f0a1e]/80 backdrop-blur-md border-white/5 shadow-lg shadow-black/20'
            : 'h-20 bg-transparent'
          }
        `}
      >
        <div className="max-w-[1600px] mx-auto px-4 lg:px-8 h-full flex items-center justify-between">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="absolute -inset-2 bg-violet-500/20 rounded-full blur-lg group-hover:bg-violet-500/30 transition-all duration-500" />
              <div className="relative p-1">
                <Trophy className="w-8 h-8 text-violet-400 animate-float drop-shadow-lg" />
              </div>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold text-white tracking-tight group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-violet-400 group-hover:to-cyan-400 transition-all duration-300">
                Tournastic
              </h1>
            </div>
          </Link>

          {/* Center Navigation - Desktop */}
          <nav className="hidden md:flex items-center gap-1 absolute left-1/2 transform -translate-x-1/2 p-1.5 rounded-full bg-white/5 border border-white/5 backdrop-blur-sm shadow-xl shadow-black/10">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.path)
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`
                    relative px-5 py-2 rounded-full flex items-center gap-2 transition-all duration-300 overflow-hidden
                    ${active
                      ? 'text-white'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }
                  `}
                >
                  {active && (
                    <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-violet-500 rounded-full -z-10 animate-fade-scale shadow-[0_0_15px_rgba(139,92,246,0.5)]" />
                  )}
                  <div className={`transition-transform duration-300 ${active ? 'scale-110' : ''}`}>
                    {item.icon}
                  </div>
                  <span className="text-sm font-medium relative z-10">{item.label}</span>
                </Link>
              )
            })}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-4">

            {/* Create Tournament Button */}
            <Link
              to="/tournaments/new"
              className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-600/20 to-cyan-500/10 hover:from-cyan-600/30 hover:to-cyan-500/20 text-cyan-400 hover:text-cyan-300 border border-cyan-500/20 hover:border-cyan-500/40 transition-all duration-300 shadow-lg shadow-cyan-900/10 group active:scale-95"
            >
              <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
              <span className="font-medium text-sm">Créer un tournoi</span>
            </Link>

            {/* Profile Menu */}
            <div className="flex items-center gap-3 pl-4 border-l border-white/10">
              <Link
                to="/profile"
                className="flex items-center gap-3 group"
                title="Mon profil"
              >
                <div className="relative">
                  <div className={`
                    w-9 h-9 flex items-center justify-center rounded-full
                    ${hasProfile ? 'bg-gradient-to-br from-violet-500/20 to-violet-600/10 border border-violet-500/30' : 'bg-white/5 border border-white/10'}
                    shadow-lg shadow-violet-500/20 group-hover:border-violet-400 group-hover:scale-105 transition-all duration-300 overflow-hidden
                  `}>
                    <AvatarDisplay
                      avatar={profile?.avatar_url}
                      className={profile?.avatar_url?.startsWith('http') ? 'w-full h-full' : 'w-5 h-5'}
                    />
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-[#0f0a1e] rounded-full shadow-lg shadow-emerald-500/50" />
                </div>
                <div className="hidden lg:flex flex-col">
                  <span className="text-sm font-semibold text-white group-hover:text-violet-300 transition-colors">
                    {hasProfile ? profile?.username : 'Compte'}
                  </span>
                </div>
              </Link>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="w-8 h-8 p-0 rounded-full hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-colors flex items-center justify-center"
                title="Déconnexion"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full pt-28 px-4 md:px-8 lg:px-10 pb-10 relative z-10 flex flex-col items-center">
        <div className="w-full max-w-[1400px] animate-fade-scale">
          <Outlet />
        </div>
      </main>

      <Footer />
      <CookieConsent />

      {/* Mobile Navigation (Bottom Bar) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0f0a1e]/90 backdrop-blur-xl border-t border-white/10 pb-6">
        <div className="flex items-center justify-around p-2">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.path)
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`
                   flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-300 w-16
                   ${active
                    ? 'text-violet-400'
                    : 'text-gray-500 hover:text-gray-300'
                  }
                 `}
              >
                <span className={`transition-transform duration-300 ${active ? '-translate-y-1' : ''}`}>
                  {item.icon}
                </span>
                <span className="text-[10px] font-medium">{item.label}</span>
                {active && (
                  <span className="absolute bottom-1 w-1 h-1 rounded-full bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.8)]" />
                )}
              </Link>
            )
          })}

          <Link
            to="/tournaments/new"
            className={`
               flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-300 w-16
               ${isActive('/tournaments/new')
                ? 'text-cyan-400'
                : 'text-gray-500 hover:text-gray-300'
              }
             `}
          >
            <span className={`transition-transform duration-300 ${isActive('/tournaments/new') ? '-translate-y-1' : ''}`}>
              <Plus className="w-6 h-6" />
            </span>
            <span className="text-[10px] font-medium">Créer</span>
          </Link>
        </div>
      </nav>
    </div>
  )
}
