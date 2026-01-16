'use client'

import { motion } from 'framer-motion'
import { Sparkles, Share2, Settings, Cloud, Download, X, Music, FileSpreadsheet } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useYTDJStore } from '@/store'
import { haptics } from '@/lib/haptics'
import { share } from '@/lib/share'

interface MenuDrawerProps {
  onClose: () => void
  onNewSet: () => void
  onExport: () => void
  onDJExport?: () => void
}

const menuItems = [
  { id: 'new-set', icon: Sparkles, label: 'New Set', color: 'text-cyan-400' },
  { id: 'share', icon: Share2, label: 'Share Set', color: 'text-white' },
  { id: 'settings', icon: Settings, label: 'AI Settings', color: 'text-white' },
  { id: 'cloud', icon: Cloud, label: 'Cloud Save', color: 'text-white' },
  { id: 'dj-tools', icon: FileSpreadsheet, label: 'DJ Tools', color: 'text-orange-400' },
  { id: 'export', icon: Download, label: 'Export Set', color: 'text-white' }
]

export function MenuDrawer({ onClose, onNewSet, onExport, onDJExport }: MenuDrawerProps) {
  const { currentSet } = useYTDJStore()
  const playlist = currentSet?.playlist || []

  const handleItemClick = async (id: string) => {
    haptics.medium()

    switch (id) {
      case 'new-set':
        onNewSet()
        break
      case 'share':
        const setName = currentSet?.name || 'Untitled Set'
        const success = await share.shareSet(setName, playlist.length)
        if (success) {
          haptics.success()
        }
        onClose()
        break
      case 'settings':
        // TODO: Open settings modal
        onClose()
        break
      case 'cloud':
        // TODO: Open cloud save modal
        onClose()
        break
      case 'dj-tools':
        if (onDJExport) {
          onDJExport()
        }
        break
      case 'export':
        onExport()
        break
    }
  }

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Drawer */}
      <motion.div
        initial={{ x: '-100%' }}
        animate={{ x: 0 }}
        exit={{ x: '-100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed top-0 bottom-0 left-0 w-[260px] z-50 bg-[#0a0c1c]/95 backdrop-blur-xl border-r border-white/10 shadow-[20px_0_60px_rgba(0,0,0,0.5)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-pink-500/20 flex items-center justify-center">
              <Music className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight">
                YTDJ<span className="text-cyan-400">.AI</span>
              </h1>
              <p className="text-[9px] text-white/40 uppercase tracking-wider">Menu</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-white/70" />
          </button>
        </div>

        {/* Menu Items */}
        <div className="p-3 space-y-1">
          {menuItems.map((item, index) => (
            <motion.button
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => handleItemClick(item.id)}
              className={cn(
                'w-full flex items-center gap-3 p-4 rounded-xl',
                'bg-white/0 hover:bg-white/5 active:bg-white/10',
                'transition-all text-left'
              )}
            >
              <div className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center',
                item.id === 'new-set' ? 'bg-cyan-500/20' : 'bg-white/5'
              )}>
                <item.icon className={cn('w-5 h-5', item.color)} />
              </div>
              <span className="font-bold text-white">{item.label}</span>
            </motion.button>
          ))}
        </div>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/5">
          <div className="text-center">
            <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">
              {playlist.length} Tracks in Set
            </p>
            <p className="text-[9px] text-white/20">
              Powered by AI
            </p>
          </div>
        </div>
      </motion.div>
    </>
  )
}
