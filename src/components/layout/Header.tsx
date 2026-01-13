'use client'

import { useState } from 'react'
import {
  Settings,
  User,
  Moon,
  Sun,
  Music2,
  Bot,
  LogOut,
  ChevronDown,
  Save,
  FolderOpen,
  Plus
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button, Badge, Dropdown } from '@/components/ui'
import { useYTDJStore } from '@/store'
import { AISettingsModal } from '@/components/features/AISettingsModal'
import { SaveSetDialog } from '@/components/features/SaveSetDialog'
import { BrowseSetsModal } from '@/components/features/BrowseSetsModal'

export function Header() {
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showAISettings, setShowAISettings] = useState(false)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [showBrowseSets, setShowBrowseSets] = useState(false)
  const { aiProvider, currentSet, sets, setCurrentSet } = useYTDJStore()

  const providerLabels = {
    openai: 'GPT-4',
    claude: 'Claude',
    gemini: 'Gemini'
  }

  return (
    <>
      <header className="h-16 px-4 flex items-center justify-between bg-[#05060f] border-b border-white/10">
        {/* Left: Logo & Project */}
        <div className="flex items-center gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-magenta-500 flex items-center justify-center">
              <Music2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">
                YTDJ<span className="text-cyan-400">.AI</span>
              </h1>
            </div>
          </div>

          {/* Divider */}
          <div className="h-6 w-px bg-white/10" />

          {/* Project Selector */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-white/60"
              onClick={() => setShowBrowseSets(true)}
            >
              <FolderOpen className="w-4 h-4 mr-2" />
              {currentSet?.name || 'Untitled Set'}
              <ChevronDown className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>

        {/* Center: Quick Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const newSet = {
                id: `set-${Date.now()}`,
                name: 'New Set',
                playlist: [],
                createdAt: new Date(),
                updatedAt: new Date()
              }
              setCurrentSet(newSet)
            }}
          >
            <Plus className="w-4 h-4 mr-1" />
            New Set
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSaveDialog(true)}
            disabled={!currentSet || currentSet.playlist.length === 0}
          >
            <Save className="w-4 h-4 mr-1" />
            Save
          </Button>
        </div>

        {/* Right: AI Provider & Settings */}
        <div className="flex items-center gap-3">
          {/* AI Provider Indicator */}
          <button
            onClick={() => setShowAISettings(true)}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg',
              'bg-white/5 border border-white/10',
              'hover:border-cyan-500/50 transition-colors'
            )}
          >
            <Bot className="w-4 h-4 text-cyan-400" />
            <span className="text-sm text-white">{providerLabels[aiProvider]}</span>
            <Badge variant="cyan" className="text-xs">AI</Badge>
          </button>

          {/* Settings */}
          <Button variant="ghost" size="sm" onClick={() => setShowAISettings(true)}>
            <Settings className="w-4 h-4" />
          </Button>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className={cn(
                'w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500 to-magenta-500',
                'flex items-center justify-center',
                'ring-2 ring-transparent hover:ring-cyan-500/50 transition-all'
              )}
            >
              <User className="w-5 h-5 text-white" />
            </button>

            {showUserMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowUserMenu(false)}
                />
                <div className={cn(
                  'absolute right-0 top-full mt-2 z-50',
                  'w-56 py-2 rounded-xl',
                  'bg-[#0a0c1c] border border-white/10',
                  'shadow-xl shadow-black/50'
                )}>
                  <div className="px-4 py-2 border-b border-white/10">
                    <p className="text-sm font-medium text-white">DJ User</p>
                    <p className="text-xs text-white/50">dj@example.com</p>
                  </div>
                  <div className="py-1">
                    <button className="w-full flex items-center gap-2 px-4 py-2 text-sm text-white/80 hover:bg-white/5">
                      <User className="w-4 h-4" />
                      Profile
                    </button>
                    <button
                      onClick={() => {
                        setShowUserMenu(false)
                        setShowAISettings(true)
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-white/80 hover:bg-white/5"
                    >
                      <Bot className="w-4 h-4" />
                      AI Settings
                    </button>
                    <button className="w-full flex items-center gap-2 px-4 py-2 text-sm text-white/80 hover:bg-white/5">
                      <Settings className="w-4 h-4" />
                      Preferences
                    </button>
                  </div>
                  <div className="pt-1 border-t border-white/10">
                    <button className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10">
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* AI Settings Modal */}
      <AISettingsModal isOpen={showAISettings} onClose={() => setShowAISettings(false)} />

      {/* Save Set Dialog */}
      <SaveSetDialog isOpen={showSaveDialog} onClose={() => setShowSaveDialog(false)} />

      {/* Browse Sets Modal */}
      <BrowseSetsModal isOpen={showBrowseSets} onClose={() => setShowBrowseSets(false)} />
    </>
  )
}
