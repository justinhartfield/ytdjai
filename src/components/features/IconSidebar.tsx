'use client'

import { useState, useRef, useEffect } from 'react'
import { Settings2, FolderOpen, LayoutGrid, GitBranch, Home, LogOut, User, Circle, Camera } from 'lucide-react'
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
  const { ui, setLeftSidebarPanel } = useYTDJStore()
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [userAvatar, setUserAvatar] = useState<string | null>(null)
  const profileRef = useRef<HTMLDivElement>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const activePanel = ui.leftSidebarPanel

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

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const dataUri = event.target?.result as string
      setUserAvatar(dataUri)
      // TODO: Persist to user profile in store/backend
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleLogout = () => {
    // TODO: Implement actual logout logic
    console.log('Logging out...')
    setIsProfileOpen(false)
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
            "w-10 h-10 rounded-full overflow-hidden flex items-center justify-center transition-all hover:ring-2 hover:ring-purple-500/50",
            isProfileOpen && "ring-2 ring-purple-500"
          )}
          title="Profile"
        >
          {userAvatar ? (
            <img
              src={userAvatar}
              alt="Profile"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center text-[10px] font-black text-white">
              U
            </div>
          )}
        </button>

        {/* Profile Dropdown */}
        {isProfileOpen && (
          <div className="absolute bottom-full left-0 mb-2 w-56 bg-[#0a0b14] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
            {/* User Info Header */}
            <div className="p-4 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full overflow-hidden">
                    {userAvatar ? (
                      <img
                        src={userAvatar}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center text-xs font-black text-white">
                        U
                      </div>
                    )}
                  </div>
                  {/* Online status indicator */}
                  <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-[#0a0b14]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">User</p>
                  <div className="flex items-center gap-1.5">
                    <Circle className="w-2 h-2 fill-green-500 text-green-500" />
                    <span className="text-[10px] text-green-400">Online</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <div className="py-1">
              {/* Change Avatar */}
              <button
                onClick={() => avatarInputRef.current?.click()}
                className="w-full px-4 py-2.5 flex items-center gap-3 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
              >
                <Camera className="w-4 h-4" />
                <span>Change Avatar</span>
              </button>

              {/* Profile Settings */}
              <button
                onClick={() => {
                  // TODO: Navigate to profile settings
                  setIsProfileOpen(false)
                }}
                className="w-full px-4 py-2.5 flex items-center gap-3 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
              >
                <User className="w-4 h-4" />
                <span>Profile Settings</span>
              </button>

              <div className="my-1 border-t border-white/5" />

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="w-full px-4 py-2.5 flex items-center gap-3 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        )}

        {/* Hidden file input for avatar upload */}
        <input
          ref={avatarInputRef}
          type="file"
          accept="image/*"
          onChange={handleAvatarChange}
          className="hidden"
        />
      </div>
    </aside>
  )
}
