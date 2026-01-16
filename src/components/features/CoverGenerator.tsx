'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Palette, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CoverTemplateId, CoverColors } from '@/types'
import { getAllCoverTemplates, COLOR_PRESETS, getCoverTemplate } from '@/lib/cover-templates'
import { CoverPreview } from './CoverPreview'

interface CoverGeneratorProps {
  selectedTemplate: CoverTemplateId
  selectedColors: CoverColors
  title: string
  subtitle?: string
  trackCount?: number
  duration?: number
  onTemplateChange: (template: CoverTemplateId) => void
  onColorsChange: (colors: CoverColors) => void
  className?: string
}

export function CoverGenerator({
  selectedTemplate,
  selectedColors,
  title,
  subtitle,
  trackCount,
  duration,
  onTemplateChange,
  onColorsChange,
  className,
}: CoverGeneratorProps) {
  const [showColorPicker, setShowColorPicker] = useState(false)
  const templates = getAllCoverTemplates()

  const handleRandomColors = () => {
    const randomPreset = COLOR_PRESETS[Math.floor(Math.random() * COLOR_PRESETS.length)]
    onColorsChange(randomPreset.colors)
  }

  const handleTemplateSelect = (templateId: CoverTemplateId) => {
    onTemplateChange(templateId)
    // Also set the default colors for this template
    const template = getCoverTemplate(templateId)
    onColorsChange(template.defaultColors)
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Preview */}
      <div className="flex justify-center">
        <CoverPreview
          template={selectedTemplate}
          colors={selectedColors}
          title={title}
          subtitle={subtitle}
          trackCount={trackCount}
          duration={duration}
          size="lg"
          className="shadow-2xl"
        />
      </div>

      {/* Template Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-400">Choose Style</h4>
          <button
            onClick={() => setShowColorPicker(!showColorPicker)}
            className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            <Palette className="w-3.5 h-3.5" />
            Customize Colors
          </button>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {templates.map((template) => (
            <button
              key={template.id}
              onClick={() => handleTemplateSelect(template.id)}
              className={cn(
                'relative rounded-lg overflow-hidden transition-all',
                'hover:ring-2 hover:ring-cyan-400/50',
                selectedTemplate === template.id && 'ring-2 ring-cyan-400'
              )}
            >
              <CoverPreview
                template={template.id}
                colors={selectedTemplate === template.id ? selectedColors : template.defaultColors}
                size="sm"
                showOverlay={false}
              />
              {selectedTemplate === template.id && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute inset-0 flex items-center justify-center bg-black/40"
                >
                  <Check className="w-6 h-6 text-cyan-400" />
                </motion.div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Color Customization */}
      {showColorPicker && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="space-y-4"
        >
          {/* Color Presets */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500">Color Presets</span>
              <button
                onClick={handleRandomColors}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                Random
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {COLOR_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => onColorsChange(preset.colors)}
                  className={cn(
                    'flex items-center gap-1.5 px-2 py-1 rounded-full text-xs',
                    'bg-white/5 hover:bg-white/10 transition-colors',
                    JSON.stringify(selectedColors) === JSON.stringify(preset.colors) &&
                      'ring-1 ring-cyan-400'
                  )}
                >
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{
                      background: `linear-gradient(135deg, ${preset.colors.primary}, ${preset.colors.accent})`,
                    }}
                  />
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          {/* Individual Color Pickers */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] text-gray-500 uppercase mb-1">Primary</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={selectedColors.primary}
                  onChange={(e) => onColorsChange({ ...selectedColors, primary: e.target.value })}
                  className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
                />
                <input
                  type="text"
                  value={selectedColors.primary}
                  onChange={(e) => onColorsChange({ ...selectedColors, primary: e.target.value })}
                  className="flex-1 px-2 py-1 text-xs bg-white/5 border border-white/10 rounded font-mono"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 uppercase mb-1">Secondary</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={selectedColors.secondary}
                  onChange={(e) => onColorsChange({ ...selectedColors, secondary: e.target.value })}
                  className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
                />
                <input
                  type="text"
                  value={selectedColors.secondary}
                  onChange={(e) => onColorsChange({ ...selectedColors, secondary: e.target.value })}
                  className="flex-1 px-2 py-1 text-xs bg-white/5 border border-white/10 rounded font-mono"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 uppercase mb-1">Accent</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={selectedColors.accent}
                  onChange={(e) => onColorsChange({ ...selectedColors, accent: e.target.value })}
                  className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
                />
                <input
                  type="text"
                  value={selectedColors.accent}
                  onChange={(e) => onColorsChange({ ...selectedColors, accent: e.target.value })}
                  className="flex-1 px-2 py-1 text-xs bg-white/5 border border-white/10 rounded font-mono"
                />
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}
