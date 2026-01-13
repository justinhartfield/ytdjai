'use client'

import { useState, useEffect } from 'react'
import { useSession, signIn } from 'next-auth/react'
import { Save, AlertCircle, CheckCircle2, Loader2, LogIn } from 'lucide-react'
import { Modal, Button, Input } from '@/components/ui'
import { useYTDJStore } from '@/store'
import { cn } from '@/lib/utils'

interface SaveSetDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function SaveSetDialog({ isOpen, onClose }: SaveSetDialogProps) {
  const { data: session, status } = useSession()
  const { currentSet, saveSetToCloud, isSyncing, updateSet } = useYTDJStore()
  const [setName, setSetName] = useState('')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (isOpen && currentSet) {
      setSetName(currentSet.name || 'Untitled Set')
      setSaveStatus('idle')
      setErrorMessage('')
    }
  }, [isOpen, currentSet])

  const handleSave = async () => {
    if (!currentSet || !setName.trim()) {
      setErrorMessage('Please enter a set name')
      return
    }

    setSaveStatus('saving')
    setErrorMessage('')

    // Update the set name if it changed
    if (setName !== currentSet.name) {
      updateSet(currentSet.id, { name: setName })
    }

    const result = await saveSetToCloud(currentSet.id)

    if (result.success) {
      setSaveStatus('success')
      setTimeout(() => {
        onClose()
        setSaveStatus('idle')
      }, 1500)
    } else {
      setSaveStatus('error')
      setErrorMessage(result.error || 'Failed to save set')
    }
  }

  const trackCount = currentSet?.playlist?.length || 0
  const isAuthenticated = status === 'authenticated' && session?.user
  const isLoading = status === 'loading'

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Save Set to Cloud"
      size="md"
    >
      <div className="space-y-6">
        {/* Sign In Prompt if not authenticated */}
        {!isAuthenticated && !isLoading && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-400">Sign in required</p>
                <p className="text-xs text-yellow-400/80 mt-1">
                  You need to sign in with Google to save your sets to the cloud.
                </p>
              </div>
            </div>

            <Button
              onClick={() => signIn('google')}
              className="w-full bg-white text-black hover:bg-gray-100"
            >
              <LogIn className="w-4 h-4 mr-2" />
              Sign in with Google
            </Button>

            <div className="flex items-center justify-end pt-4 border-t border-white/10">
              <Button variant="ghost" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
          </div>
        )}

        {/* Main content when authenticated */}
        {isAuthenticated && (
          <>
            {/* Set Info */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Set Name
                </label>
                <Input
                  value={setName}
                  onChange={(e) => setSetName(e.target.value)}
                  placeholder="Enter set name..."
                  disabled={saveStatus === 'saving'}
                />
              </div>

              {/* Set Stats */}
              <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-white/5 border border-white/10">
                <div>
                  <p className="text-xs text-white/50 mb-1">Tracks</p>
                  <p className="text-lg font-semibold text-white">{trackCount}</p>
                </div>
                <div>
                  <p className="text-xs text-white/50 mb-1">Arc Template</p>
                  <p className="text-lg font-semibold text-white capitalize">
                    {currentSet?.arcTemplate || 'None'}
                  </p>
                </div>
              </div>

              {/* Signed in as */}
              <p className="text-xs text-white/40">
                Signed in as {session?.user?.email}
              </p>

              {/* Status Messages */}
              {saveStatus === 'error' && errorMessage && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-400">Save Failed</p>
                    <p className="text-xs text-red-400/80 mt-1">{errorMessage}</p>
                  </div>
                </div>
              )}

              {saveStatus === 'success' && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                  <p className="text-sm font-medium text-green-400">Set saved successfully!</p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
              <Button
                variant="ghost"
                onClick={onClose}
                disabled={saveStatus === 'saving'}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saveStatus === 'saving' || !setName.trim()}
                className={cn(
                  'min-w-[120px]',
                  saveStatus === 'success' && 'bg-green-500 hover:bg-green-600'
                )}
              >
                {saveStatus === 'saving' && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                {saveStatus === 'success' && (
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                )}
                {saveStatus === 'idle' && (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'success' ? 'Saved!' : 'Save to Cloud'}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
