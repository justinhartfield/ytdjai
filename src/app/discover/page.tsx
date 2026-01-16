'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Search, SlidersHorizontal, TrendingUp, Clock, Heart, Loader2, X, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MixtapeGrid } from '@/components/features/MixtapeGrid'
import type { MixtapeCard, DiscoverFilters, DiscoverResponse } from '@/types'

const SORT_OPTIONS = [
  { value: 'recent', label: 'Most Recent', icon: Clock },
  { value: 'popular', label: 'Most Popular', icon: Heart },
  { value: 'trending', label: 'Trending', icon: TrendingUp },
] as const

const COMMON_TAGS = [
  'synthwave', 'chill', 'workout', 'focus', 'party', 'road-trip',
  'deep-house', 'techno', 'hip-hop', 'indie', 'electronic', 'ambient'
]

export default function DiscoverPage() {
  const [mixtapes, setMixtapes] = useState<MixtapeCard[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)

  const [filters, setFilters] = useState<DiscoverFilters>({
    sort: 'recent',
    tags: [],
    search: '',
    page: 1,
    limit: 12,
  })

  const [searchInput, setSearchInput] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  const fetchMixtapes = useCallback(async (newFilters: DiscoverFilters, append = false) => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      params.set('sort', newFilters.sort)
      params.set('page', String(newFilters.page || 1))
      params.set('limit', String(newFilters.limit || 12))
      if (newFilters.tags && newFilters.tags.length > 0) {
        params.set('tags', newFilters.tags.join(','))
      }
      if (newFilters.search) {
        params.set('search', newFilters.search)
      }

      const response = await fetch(`/api/mixtape/discover?${params}`)
      if (!response.ok) throw new Error('Failed to fetch mixtapes')

      const data: DiscoverResponse = await response.json()

      if (append) {
        setMixtapes(prev => [...prev, ...data.mixtapes])
      } else {
        setMixtapes(data.mixtapes)
      }

      setHasMore(data.hasMore)
      setPage(newFilters.page || 1)
    } catch (err) {
      console.error('[Discover] Error:', err)
      setError('Failed to load mixtapes')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchMixtapes(filters)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSortChange = (sort: DiscoverFilters['sort']) => {
    const newFilters = { ...filters, sort, page: 1 }
    setFilters(newFilters)
    fetchMixtapes(newFilters)
  }

  const handleTagToggle = (tag: string) => {
    const newTags = filters.tags?.includes(tag)
      ? filters.tags.filter(t => t !== tag)
      : [...(filters.tags || []), tag]
    const newFilters = { ...filters, tags: newTags, page: 1 }
    setFilters(newFilters)
    fetchMixtapes(newFilters)
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const newFilters = { ...filters, search: searchInput, page: 1 }
    setFilters(newFilters)
    fetchMixtapes(newFilters)
  }

  const clearSearch = () => {
    setSearchInput('')
    const newFilters = { ...filters, search: '', page: 1 }
    setFilters(newFilters)
    fetchMixtapes(newFilters)
  }

  const loadMore = () => {
    const newFilters = { ...filters, page: page + 1 }
    setFilters(newFilters)
    fetchMixtapes(newFilters, true)
  }

  const clearAllFilters = () => {
    setSearchInput('')
    const newFilters: DiscoverFilters = { sort: 'recent', tags: [], search: '', page: 1, limit: 12 }
    setFilters(newFilters)
    fetchMixtapes(newFilters)
  }

  const hasActiveFilters = (filters.tags && filters.tags.length > 0) || filters.search

  return (
    <div className="min-h-screen bg-[#05060f] text-white">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-cyan-500/5 blur-[150px] rounded-full" />
        <div className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-purple-500/5 blur-[150px] rounded-full" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/5 bg-black/40 backdrop-blur-xl sticky top-0">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-gradient-to-tr from-cyan-500 to-pink-500 flex items-center justify-center font-black text-black text-sm">YT</div>
            <span className="text-lg font-extrabold tracking-tighter uppercase">YTDJ<span className="text-cyan-400">.AI</span></span>
          </Link>
          <Link
            href="/"
            className="px-4 py-2 bg-cyan-500 text-black text-xs font-black uppercase tracking-widest rounded-lg hover:bg-cyan-400 transition-all"
          >
            Create Mixtape
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 py-12">
        {/* Page Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter mb-3">
            Discover Mixtapes
          </h1>
          <p className="text-gray-400 text-lg">
            Explore curated playlists created by the YTDJ.AI community
          </p>
        </motion.div>

        {/* Search & Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8 space-y-4"
        >
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search mixtapes..."
                className="w-full pl-12 pr-10 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "px-4 py-3 border rounded-xl flex items-center gap-2 transition-all",
                showFilters || hasActiveFilters
                  ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-400"
                  : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
              )}
            >
              <SlidersHorizontal className="w-5 h-5" />
              <ChevronDown className={cn("w-4 h-4 transition-transform", showFilters && "rotate-180")} />
            </button>
          </form>

          {/* Expanded Filters */}
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-6 bg-white/5 border border-white/10 rounded-2xl space-y-6"
            >
              {/* Sort Options */}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 block">
                  Sort By
                </label>
                <div className="flex flex-wrap gap-2">
                  {SORT_OPTIONS.map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      onClick={() => handleSortChange(value)}
                      className={cn(
                        "px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-all",
                        filters.sort === value
                          ? "bg-cyan-500 text-black"
                          : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 block">
                  Tags
                </label>
                <div className="flex flex-wrap gap-2">
                  {COMMON_TAGS.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => handleTagToggle(tag)}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-sm transition-all",
                        filters.tags?.includes(tag)
                          ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/50"
                          : "bg-white/5 text-gray-500 border border-white/10 hover:bg-white/10 hover:text-gray-300"
                      )}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Clear Filters */}
              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className="text-sm text-gray-500 hover:text-cyan-400 transition-colors"
                >
                  Clear all filters
                </button>
              )}
            </motion.div>
          )}

          {/* Active Filters Summary */}
          {hasActiveFilters && !showFilters && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-gray-500">Filtering by:</span>
              {filters.search && (
                <span className="px-2 py-1 bg-cyan-500/20 text-cyan-400 text-xs rounded-full flex items-center gap-1">
                  &quot;{filters.search}&quot;
                  <button onClick={clearSearch} className="hover:text-white">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {filters.tags?.map((tag) => (
                <span key={tag} className="px-2 py-1 bg-cyan-500/20 text-cyan-400 text-xs rounded-full flex items-center gap-1">
                  {tag}
                  <button onClick={() => handleTagToggle(tag)} className="hover:text-white">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              <button
                onClick={clearAllFilters}
                className="text-xs text-gray-500 hover:text-cyan-400 ml-2"
              >
                Clear all
              </button>
            </div>
          )}
        </motion.div>

        {/* Results */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {error ? (
            <div className="text-center py-16">
              <p className="text-red-400 mb-4">{error}</p>
              <button
                onClick={() => fetchMixtapes(filters)}
                className="px-6 py-3 bg-cyan-500 text-black font-bold rounded-xl hover:bg-cyan-400 transition-all"
              >
                Try Again
              </button>
            </div>
          ) : isLoading && mixtapes.length === 0 ? (
            <div className="text-center py-16">
              <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mx-auto mb-4" />
              <p className="text-gray-400">Loading mixtapes...</p>
            </div>
          ) : (
            <>
              <MixtapeGrid
                mixtapes={mixtapes}
                emptyMessage="No mixtapes found. Try adjusting your filters."
              />

              {/* Load More */}
              {hasMore && mixtapes.length > 0 && (
                <div className="text-center mt-12">
                  <button
                    onClick={loadMore}
                    disabled={isLoading}
                    className="px-8 py-4 bg-white/5 text-white font-bold rounded-xl hover:bg-white/10 transition-all border border-white/10 disabled:opacity-50"
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                    ) : (
                      'Load More'
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 mt-24">
        <div className="max-w-7xl mx-auto px-6 py-8 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Powered by YTDJ.AI
          </p>
          <div className="flex items-center gap-6">
            <Link href="/" className="text-sm text-gray-600 hover:text-cyan-400 transition-colors">Home</Link>
            <Link href="/privacy" className="text-sm text-gray-600 hover:text-cyan-400 transition-colors">Privacy</Link>
            <Link href="/terms" className="text-sm text-gray-600 hover:text-cyan-400 transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
