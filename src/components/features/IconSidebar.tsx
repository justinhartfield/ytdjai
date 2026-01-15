'use client'

import { useState, useRef, useEffect } from 'react'
import { useSession, signIn, signOut } from 'next-auth/react'
import { Settings2, FolderOpen, LayoutGrid, GitBranch, Home, LogOut, User, Circle, Camera, LogIn, Cloud, CloudOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useYTDJStore } from '@/store'

type SidebarPanel = 'arrangement' | 'constraints' | 'sets'

interface IconSidebarProps {
  className?: string
  onViewChange?: (view: 'arrangement' | 'session') => void
  currentView?: 'arrangement' | 'session'
  onGoHome?: () => void
}

export function IconSidebar({ className, onViewChange, currentView, onGoHome }: IconSidebarProps) {
  const { data: session, status } = useSession()
  const { ui, setLeftSidebarPanel, isSyncing } = useYTDJStore()
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)
  const activePanel = ui.leftSidebarPanel

  const isAuthenticated = status === 'authenticated'
  const isLoading = status === 'loading'

  // Close profile menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const viewIcons = [
    {
      id: 'arrangement' as const,
      icon: GitBranch,
      label: 'Arrangement View',
      shortcut: 'A'
    },
    {
      id: 'session' as const,
      icon: LayoutGrid,
      label: 'Session View',
      shortcut: 'S'
    }
  ]

  const panelIcons = [
    {
      id: 'constraints' as SidebarPanel,
      icon: Settings2,
      label: 'AI Settings',
      shortcut: '1'
    },
    {
      id: 'sets' as SidebarPanel,
      icon: FolderOpen,
      label: 'My Sets',
      shortcut: '2'
    }
  ]

  const handleSignIn = () => {
    setIsProfileOpen(false)
    signIn('google')
  }

  const handleSignOut = () => {
    setIsProfileOpen(false)
    signOut()
  }

  return (
    <aside className={cn(
      "w-16 bg-[#070815] border-r border-white/5 flex flex-col items-center py-4 gap-2",
      className
    )}>
      {/* Home Button */}
      {onGoHome && (
        <button
          onClick={onGoHome}
          className="w-12 h-12 rounded-xl flex items-center justify-center transition-all group relative text-gray-500 hover:text-cyan-400 hover:bg-cyan-500/10 mb-2"
          title="Back to LaunchPad (H)"
        >
          <Home className="w-5 h-5" />

          {/* Tooltip */}
          <div className="absolute left-full ml-2 px-2 py-1 bg-black/90 border border-white/10 rounded text-[10px] font-bold text-white whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
            New Set
            <span className="ml-2 text-gray-500">H</span>
          </div>
        </button>
      )}

      {/* View Switcher Icons */}
      {onViewChange && (
        <nav className="flex flex-col items-center gap-1 pb-3 border-b border-white/5 mb-3">
          {viewIcons.map(({ id, icon: Icon, label, shortcut }) => (
            <button
              key={id}
              onClick={() => onViewChange(id)}
              className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center transition-all group relative",
                currentView === id
                  ? "bg-cyan-500/20 text-cyan-400"
                  : "text-gray-500 hover:text-white hover:bg-white/5"
              )}
              title={`${label} (${shortcut})`}
            >
              <Icon className="w-5 h-5" />

              {/* Active indicator */}
              {currentView === id && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-cyan-500 rounded-r" />
              )}

              {/* Tooltip */}
              <div className="absolute left-full ml-2 px-2 py-1 bg-black/90 border border-white/10 rounded text-[10px] font-bold text-white whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                {label}
                <span className="ml-2 text-gray-500">{shortcut}</span>
              </div>
            </button>
          ))}
        </nav>
      )}

      {/* Panel Icons */}
      <nav className="flex-1 flex flex-col items-center gap-1">
        {panelIcons.map(({ id, icon: Icon, label, shortcut }) => (
          <button
            key={id}
            onClick={() => setLeftSidebarPanel(activePanel === id ? null : id)}
            className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center transition-all group relative",
              activePanel === id
                ? "bg-pink-500/20 text-pink-400"
                : "text-gray-500 hover:text-white hover:bg-white/5"
            )}
            title={`${label} (${shortcut})`}
          >
            <Icon className="w-5 h-5" />

            {/* Active indicator */}
            {activePanel === id && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-pink-500 rounded-r" />
            )}

            {/* Tooltip */}
            <div className="absolute left-full ml-2 px-2 py-1 bg-black/90 border border-white/10 rounded text-[10px] font-bold text-white whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
              {label}
              <span className="ml-2 text-gray-500">{shortcut}</span>
            </div>
          </button>
        ))}
      </nav>

      {/* Profile Menu */}
      <div className="mt-auto relative" ref={profileRef}>
        <button
          onClick={() => setIsProfileOpen(!isProfileOpen)}
          className={cn(
            "w-10 h-10 rounded-full overflow-hidden flex items-center justify-center transition-all hover:ring-2",
            isProfileOpen && "ring-2",
            isAuthenticated ? "hover:ring-green-500/50" : "hover:ring-purple-500/50",
            isProfileOpen && (isAuthenticated ? "ring-green-500" : "ring-purple-500")
          )}
          title={isAuthenticated ? session?.user?.name || 'Profile' : 'Sign In'}
        >
          {isLoading ? (
            <div className="w-full h-full bg-gray-700 animate-pulse flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
            </div>
          ) : isAuthenticated && session?.user?.image ? (
            <img
              src={session.user.image}
              alt={session.user.name || 'Profile'}
              className="w-full h-full object-cover"
            />
          ) : isAuthenticated ? (
            <div className="w-full h-full bg-gradient-to-tr from-green-500 to-emerald-500 flex items-center justify-center text-[10px] font-black text-white">
              {session?.user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
          ) : (
            <div className="w-full h-full bg-gradient-to-tr from-gray-600 to-gray-500 flex items-center justify-center">
              <User className="w-4 h-4 text-white/60" />
            </div>
          )}
        </button>

        {/* Profile Dropdown */}
        {isProfileOpen && (
          <div className="absolute bottom-full left-0 mb-2 w-56 bg-[#0a0b14] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
            {isAuthenticated ? (
              <>
                {/* User Info Header */}
                <div className="p-4 border-b border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full overflow-hidden">
                        {session?.user?.image ? (
                          <img
                            src={session.user.image}
                            alt={session.user.name || 'Profile'}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-tr from-green-500 to-emerald-500 flex items-center justify-center text-xs font-black text-white">
                            {session?.user?.name?.[0]?.toUpperCase() || 'U'}
                          </div>
                        )}
                      </div>
                      {/* Online status indicator */}
                      <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-[#0a0b14]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{session?.user?.name || 'User'}</p>
                      <p className="text-[10px] text-gray-500 truncate">{session?.user?.email}</p>
                    </div>
                  </div>
                </div>

                {/* Sync Status */}
                <div className="px-4 py-3 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    {isSyncing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
                        <span className="text-[11px] text-cyan-400">Syncing...</span>
                      </>
                    ) : (
                      <>
                        <Cloud className="w-4 h-4 text-green-400" />
                        <span className="text-[11px] text-green-400">Connected to Cloud</span>
                      </>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-600 mt-1">
                    Your sets will be saved to the cloud
                  </p>
                </div>

                {/* Menu Items */}
                <div className="py-1">
                  {/* Profile Settings */}
                  <button
                    onClick={() => {
                      setIsProfileOpen(false)
                    }}
                    className="w-full px-4 py-2.5 flex items-center gap-3 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                  >
                    <User className="w-4 h-4" />
                    <span>Account Settings</span>
                  </button>

                  <div className="my-1 border-t border-white/5" />

                  {/* Sign Out */}
                  <button
                    onClick={handleSignOut}
                    className="w-full px-4 py-2.5 flex items-center gap-3 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Not signed in state */}
                <div className="p-4 border-b border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
                      <CloudOff className="w-5 h-5 text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white">Not signed in</p>
                      <p className="text-[10px] text-gray-500">Sign in to save & export</p>
                    </div>
                  </div>
                </div>

                {/* Benefits */}
                <div className="px-4 py-3 border-b border-white/5">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Benefits</p>
                  <ul className="space-y-1.5 text-[11px] text-gray-400">
                    <li className="flex items-center gap-2">
                      <Circle className="w-1.5 h-1.5 fill-cyan-500 text-cyan-500" />
                      Save sets to the cloud
                    </li>
                    <li className="flex items-center gap-2">
                      <Circle className="w-1.5 h-1.5 fill-pink-500 text-pink-500" />
                      Export to YouTube Music
                    </li>
                    <li className="flex items-center gap-2">
                      <Circle className="w-1.5 h-1.5 fill-purple-500 text-purple-500" />
                      Sync across devices
                    </li>
                  </ul>
                </div>

                {/* Sign In Button */}
                <div className="p-3">
                  <button
                    onClick={handleSignIn}
                    className="w-full py-2.5 bg-white text-black font-bold text-xs uppercase tracking-wider rounded-lg hover:bg-gray-100 transition-all flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Sign in with Google
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </aside>
  )
}
