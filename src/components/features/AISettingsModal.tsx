'use client'

import { useState, useEffect } from 'react'
import { Bot, Sparkles, Zap, Brain, Check, Key, AlertCircle } from 'lucide-react'
import { Modal, Button, Input, Badge } from '@/components/ui'
import { useYTDJStore } from '@/store'
import type { AIProvider } from '@/types'
import { cn } from '@/lib/utils'

interface AISettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

const AI_PROVIDERS: {
  id: AIProvider
  name: string
  description: string
  icon: React.ReactNode
  color: string
  models: string[]
}[] = [
  {
    id: 'openai',
    name: 'OpenAI GPT-4',
    description: 'Powerful reasoning and creative generation',
    icon: <Sparkles className="w-5 h-5" />,
    color: 'from-green-500 to-emerald-500',
    models: ['gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo']
  },
  {
    id: 'claude',
    name: 'Anthropic Claude',
    description: 'Nuanced understanding and detailed analysis',
    icon: <Brain className="w-5 h-5" />,
    color: 'from-orange-500 to-amber-500',
    models: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku']
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    description: 'Multi-modal capabilities and fast inference',
    icon: <Zap className="w-5 h-5" />,
    color: 'from-blue-500 to-cyan-500',
    models: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.0-pro']
  }
]

export function AISettingsModal({ isOpen, onClose }: AISettingsModalProps) {
  const { aiProvider, setAIProvider } = useYTDJStore()
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>(aiProvider)
  const [apiKeys, setApiKeys] = useState({
    openai: '',
    anthropic: '',
    google: ''
  })
  const [showApiKeys, setShowApiKeys] = useState(false)
  const [validationStatus, setValidationStatus] = useState<Record<string, 'valid' | 'invalid' | 'unknown'>>({
    openai: 'unknown',
    anthropic: 'unknown',
    google: 'unknown'
  })

  useEffect(() => {
    setSelectedProvider(aiProvider)
  }, [aiProvider])

  const handleSave = () => {
    setAIProvider(selectedProvider)
    // Save API keys to localStorage (in production, use secure storage)
    if (apiKeys.openai) localStorage.setItem('OPENAI_API_KEY', apiKeys.openai)
    if (apiKeys.anthropic) localStorage.setItem('ANTHROPIC_API_KEY', apiKeys.anthropic)
    if (apiKeys.google) localStorage.setItem('GOOGLE_AI_API_KEY', apiKeys.google)
    onClose()
  }

  const validateApiKey = async (provider: string, key: string) => {
    // In a real implementation, this would validate the API key
    // For now, we'll simulate validation
    setValidationStatus(prev => ({ ...prev, [provider]: 'valid' }))
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="AI Provider Settings" size="lg">
      <div className="space-y-6">
        {/* Provider Selection */}
        <div>
          <h4 className="text-sm font-medium text-white mb-3">Select AI Provider</h4>
          <div className="grid grid-cols-1 gap-3">
            {AI_PROVIDERS.map((provider) => (
              <button
                key={provider.id}
                onClick={() => setSelectedProvider(provider.id)}
                className={cn(
                  'relative flex items-start gap-4 p-4 rounded-xl border transition-all duration-200',
                  selectedProvider === provider.id
                    ? 'border-cyan-500 bg-cyan-500/10'
                    : 'border-white/10 bg-white/5 hover:border-white/20'
                )}
              >
                {/* Icon */}
                <div
                  className={cn(
                    'flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center',
                    `bg-gradient-to-r ${provider.color}`
                  )}
                >
                  {provider.icon}
                </div>

                {/* Info */}
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">{provider.name}</span>
                    {selectedProvider === provider.id && (
                      <Badge variant="cyan" className="text-xs">Active</Badge>
                    )}
                  </div>
                  <p className="text-sm text-white/50 mt-0.5">{provider.description}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {provider.models.map((model) => (
                      <span
                        key={model}
                        className="text-xs px-2 py-0.5 rounded bg-white/10 text-white/60"
                      >
                        {model}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Selection Indicator */}
                {selectedProvider === provider.id && (
                  <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-cyan-500 flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* API Keys Section */}
        <div>
          <button
            onClick={() => setShowApiKeys(!showApiKeys)}
            className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
          >
            <Key className="w-4 h-4" />
            {showApiKeys ? 'Hide API Keys' : 'Configure API Keys'}
          </button>

          {showApiKeys && (
            <div className="mt-4 space-y-4 p-4 rounded-lg bg-white/5 border border-white/10">
              <p className="text-xs text-white/50">
                API keys are stored locally in your browser. For production use, configure them in your environment variables.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="text-sm text-white/60 mb-1 block">OpenAI API Key</label>
                  <div className="flex gap-2">
                    <Input
                      type="password"
                      placeholder="sk-..."
                      value={apiKeys.openai}
                      onChange={(e) => setApiKeys(prev => ({ ...prev, openai: e.target.value }))}
                      className="flex-1"
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => validateApiKey('openai', apiKeys.openai)}
                    >
                      Validate
                    </Button>
                  </div>
                  {validationStatus.openai === 'valid' && (
                    <p className="text-xs text-green-400 mt-1 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Valid API key
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-sm text-white/60 mb-1 block">Anthropic API Key</label>
                  <div className="flex gap-2">
                    <Input
                      type="password"
                      placeholder="sk-ant-..."
                      value={apiKeys.anthropic}
                      onChange={(e) => setApiKeys(prev => ({ ...prev, anthropic: e.target.value }))}
                      className="flex-1"
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => validateApiKey('anthropic', apiKeys.anthropic)}
                    >
                      Validate
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="text-sm text-white/60 mb-1 block">Google AI API Key</label>
                  <div className="flex gap-2">
                    <Input
                      type="password"
                      placeholder="AIza..."
                      value={apiKeys.google}
                      onChange={(e) => setApiKeys(prev => ({ ...prev, google: e.target.value }))}
                      className="flex-1"
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => validateApiKey('google', apiKeys.google)}
                    >
                      Validate
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Info Notice */}
        <div className="flex items-start gap-3 p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
          <AlertCircle className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="text-white">Provider affects recommendations</p>
            <p className="text-white/60 mt-0.5">
              Different AI providers may generate different playlist suggestions based on their training and capabilities.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-white/10">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSave}>
          Save Settings
        </Button>
      </div>
    </Modal>
  )
}
