'use client'

import { useState, createContext, useContext } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface TabsContextValue {
  value: string
  onChange: (value: string) => void
}

const TabsContext = createContext<TabsContextValue | null>(null)

interface TabsProps {
  value: string
  onChange: (value: string) => void
  children: React.ReactNode
  className?: string
}

export function Tabs({ value, onChange, children, className }: TabsProps) {
  return (
    <TabsContext.Provider value={{ value, onChange }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  )
}

interface TabListProps {
  children: React.ReactNode
  className?: string
}

export function TabList({ children, className }: TabListProps) {
  return (
    <div
      className={cn(
        'flex gap-1 p-1 bg-white/5 rounded-lg border border-white/10',
        className
      )}
    >
      {children}
    </div>
  )
}

interface TabProps {
  value: string
  children: React.ReactNode
  icon?: React.ReactNode
  className?: string
}

export function Tab({ value, children, icon, className }: TabProps) {
  const context = useContext(TabsContext)
  if (!context) throw new Error('Tab must be used within Tabs')

  const isActive = context.value === value

  return (
    <button
      type="button"
      onClick={() => context.onChange(value)}
      className={cn(
        'relative flex items-center gap-2 px-4 py-2 rounded-md',
        'text-sm font-medium transition-colors duration-200',
        isActive ? 'text-white' : 'text-white/50 hover:text-white/70',
        className
      )}
    >
      {isActive && (
        <motion.div
          layoutId="tab-indicator"
          className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-magenta-500/20 rounded-md border border-cyan-500/30"
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      )}
      <span className="relative flex items-center gap-2">
        {icon}
        {children}
      </span>
    </button>
  )
}

interface TabPanelProps {
  value: string
  children: React.ReactNode
  className?: string
}

export function TabPanel({ value, children, className }: TabPanelProps) {
  const context = useContext(TabsContext)
  if (!context) throw new Error('TabPanel must be used within Tabs')

  if (context.value !== value) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.2 }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
