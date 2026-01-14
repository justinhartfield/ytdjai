'use client'

import { useRef } from 'react'
import { Settings2, Music2, FolderOpen, ImagePlus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useYTDJStore } from '@/store'

type SidebarPanel = 'arrangement' | 'constraints' | 'sets'

interface IconSidebarProps {
  className?: string
}

export function IconSidebar({ className }: IconSidebarProps) {
  const { ui, setLeftSidebarPanel, currentSet, updateCoverArt } = useYTDJStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const activePanel = ui.leftSidebarPanel

  const icons = [
    {
      id: 'constraints' as SidebarPanel,
      icon: Settings2,
      label: 'AI Settings',
      shortcut: '1'
    },
    {
      id: 'arrangement' as SidebarPanel,
      icon: Music2,
      label: 'Arrangement',
      shortcut: '2'
    },
    {
      id: 'sets' as SidebarPanel,
      icon: FolderOpen,
      label: 'My Sets',
      shortcut: '3'
    }
  ]

  const handleCoverArtClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return
    }

    // Convert to data URI
    const reader = new FileReader()
    reader.onload = (event) => {
      const dataUri = event.target?.result as string
      updateCoverArt(dataUri)
    }
    reader.readAsDataURL(file)

    // Reset input so same file can be selected again
    e.target.value = ''
  }

  const coverArt = currentSet?.coverArt

  return (
    <aside className={cn(
      "w-16 bg-[#070815] border-r border-white/5 flex flex-col items-center py-4 gap-2",
      className
    )}>
      {/* Cover Art */}
      <button
        onClick={handleCoverArtClick}
        className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center mb-4 transition-all hover:ring-2 hover:ring-cyan-500/50 group relative"
        title="Click to change cover art"
      >
        {coverArt ? (
          <img
            src={coverArt}
            alt="Cover art"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-tr from-gray-700 to-gray-600 flex items-center justify-center">
            <ImagePlus className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" />
          </div>
        )}
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <ImagePlus className="w-4 h-4 text-white" />
        </div>
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Navigation Icons */}
      <nav className="flex-1 flex flex-col items-center gap-1">
        {icons.map(({ id, icon: Icon, label, shortcut }) => (
          <button
            key={id}
            onClick={() => setLeftSidebarPanel(activePanel === id ? null : id)}
            className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center transition-all group relative",
              activePanel === id
                ? "bg-cyan-500/20 text-cyan-400"
                : "text-gray-500 hover:text-white hover:bg-white/5"
            )}
            title={`${label} (${shortcut})`}
          >
            <Icon className="w-5 h-5" />

            {/* Active indicator */}
            {activePanel === id && (
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

      {/* Bottom Section - could add user avatar or additional controls */}
      <div className="mt-auto">
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center text-[10px] font-black text-white">
          U
        </div>
      </div>
    </aside>
  )
}
