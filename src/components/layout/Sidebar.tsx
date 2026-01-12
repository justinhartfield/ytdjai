'use client'

import { useState } from 'react'
import {
  Home,
  Library,
  History,
  Heart,
  Search,
  Plus,
  ListMusic,
  Disc3,
  TrendingUp,
  Clock,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button, Input } from '@/components/ui'
import { useYTDJStore } from '@/store'

interface NavItem {
  id: string
  label: string
  icon: React.ReactNode
  badge?: number
}

const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Home', icon: <Home className="w-5 h-5" /> },
  { id: 'library', label: 'Your Library', icon: <Library className="w-5 h-5" />, badge: 12 },
  { id: 'history', label: 'Recent Sets', icon: <History className="w-5 h-5" /> },
  { id: 'favorites', label: 'Favorites', icon: <Heart className="w-5 h-5" /> }
]

const QUICK_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'house', label: 'House' },
  { id: 'techno', label: 'Techno' },
  { id: 'trance', label: 'Trance' },
  { id: 'dnb', label: 'DnB' }
]

export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [activeNav, setActiveNav] = useState('home')
  const [activeFilter, setActiveFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const { sets } = useYTDJStore()

  return (
    <aside
      className={cn(
        'flex flex-col h-full bg-[#05060f] border-r border-white/10 transition-all duration-300',
        isCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Collapse Toggle */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={cn(
          'absolute top-20 -right-3 z-10',
          'w-6 h-6 rounded-full',
          'bg-[#0a0c1c] border border-white/10',
          'flex items-center justify-center',
          'text-white/60 hover:text-white hover:border-cyan-500/50',
          'transition-all duration-200'
        )}
      >
        {isCollapsed ? (
          <ChevronRight className="w-3 h-3" />
        ) : (
          <ChevronLeft className="w-3 h-3" />
        )}
      </button>

      {/* Navigation */}
      <nav className="p-2 space-y-1">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveNav(item.id)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl',
              'transition-all duration-200',
              activeNav === item.id
                ? 'bg-gradient-to-r from-cyan-500/20 to-magenta-500/20 text-white'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            )}
          >
            <span className={cn(
              'flex-shrink-0',
              activeNav === item.id && 'text-cyan-400'
            )}>
              {item.icon}
            </span>
            {!isCollapsed && (
              <>
                <span className="flex-1 text-left text-sm font-medium">{item.label}</span>
                {item.badge && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-white/10">
                    {item.badge}
                  </span>
                )}
              </>
            )}
          </button>
        ))}
      </nav>

      {!isCollapsed && (
        <>
          {/* Search */}
          <div className="px-3 mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="text"
                placeholder="Search sets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn(
                  'w-full pl-9 pr-4 py-2 rounded-lg',
                  'bg-white/5 border border-white/10',
                  'text-white text-sm placeholder:text-white/40',
                  'focus:outline-none focus:border-cyan-500/50'
                )}
              />
            </div>
          </div>

          {/* Quick Filters */}
          <div className="px-3 mt-4">
            <div className="flex flex-wrap gap-1">
              {QUICK_FILTERS.map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setActiveFilter(filter.id)}
                  className={cn(
                    'px-2.5 py-1 rounded-md text-xs font-medium',
                    'transition-all duration-200',
                    activeFilter === filter.id
                      ? 'bg-cyan-500 text-white'
                      : 'bg-white/5 text-white/60 hover:bg-white/10'
                  )}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sets List */}
          <div className="flex-1 overflow-y-auto mt-4 px-3">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider">
                Your Sets
              </h3>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-1">
              {sets.length > 0 ? (
                sets.map((set) => (
                  <button
                    key={set.id}
                    className={cn(
                      'w-full flex items-center gap-3 p-2 rounded-lg',
                      'text-left transition-all duration-200',
                      'hover:bg-white/5'
                    )}
                  >
                    <div className="w-10 h-10 rounded bg-gradient-to-br from-cyan-500/20 to-magenta-500/20 flex items-center justify-center">
                      <ListMusic className="w-5 h-5 text-white/60" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{set.name}</p>
                      <p className="text-xs text-white/40">{set.playlist.length} tracks</p>
                    </div>
                  </button>
                ))
              ) : (
                <>
                  {/* Demo Sets */}
                  {[
                    { name: 'Summer Vibes Mix', tracks: 12, genre: 'House' },
                    { name: 'Peak Time Techno', tracks: 8, genre: 'Techno' },
                    { name: 'Progressive Journey', tracks: 15, genre: 'Progressive' },
                    { name: 'Late Night Deep', tracks: 10, genre: 'Deep House' }
                  ].map((set, i) => (
                    <button
                      key={i}
                      className={cn(
                        'w-full flex items-center gap-3 p-2 rounded-lg',
                        'text-left transition-all duration-200',
                        'hover:bg-white/5'
                      )}
                    >
                      <div className="w-10 h-10 rounded bg-gradient-to-br from-cyan-500/20 to-magenta-500/20 flex items-center justify-center">
                        <ListMusic className="w-5 h-5 text-white/60" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{set.name}</p>
                        <p className="text-xs text-white/40">{set.tracks} tracks · {set.genre}</p>
                      </div>
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="p-3 border-t border-white/10">
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 rounded-lg bg-white/5">
                <div className="flex items-center gap-1 text-white/40">
                  <Disc3 className="w-3 h-3" />
                  <span className="text-xs">Sets</span>
                </div>
                <p className="text-lg font-bold text-white mt-0.5">{sets.length || 4}</p>
              </div>
              <div className="p-2 rounded-lg bg-white/5">
                <div className="flex items-center gap-1 text-white/40">
                  <Clock className="w-3 h-3" />
                  <span className="text-xs">Hours</span>
                </div>
                <p className="text-lg font-bold text-white mt-0.5">12.5</p>
              </div>
            </div>
          </div>
        </>
      )}
    </aside>
  )
}
