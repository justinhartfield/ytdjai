'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sun,
  Moon,
  Cloud,
  Snowflake,
  CloudRain,
  CloudLightning,
  Dumbbell,
  BookOpen,
  Briefcase,
  UtensilsCrossed,
  Car,
  Sofa,
  Music2,
  User,
  Users,
  Heart,
  PartyPopper,
  Radio,
  Sunrise,
  Sunset,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Leaf,
  Flower2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useYTDJStore } from '@/store'
import type { ContextTokens as ContextTokensType } from '@/types'

type TimeOfDay = NonNullable<ContextTokensType['timeOfDay']>
type Season = NonNullable<ContextTokensType['season']>
type Weather = NonNullable<ContextTokensType['weather']>
type Activity = NonNullable<ContextTokensType['activity']>
type SocialContext = NonNullable<ContextTokensType['socialContext']>

const TIME_OPTIONS: { id: TimeOfDay; label: string; icon: React.ReactNode }[] = [
  { id: 'morning', label: 'Morning', icon: <Sunrise className="w-4 h-4" /> },
  { id: 'afternoon', label: 'Afternoon', icon: <Sun className="w-4 h-4" /> },
  { id: 'evening', label: 'Evening', icon: <Sunset className="w-4 h-4" /> },
  { id: 'night', label: 'Night', icon: <Moon className="w-4 h-4" /> },
  { id: 'late-night', label: 'Late Night', icon: <Sparkles className="w-4 h-4" /> }
]

const SEASON_OPTIONS: { id: Season; label: string; icon: React.ReactNode }[] = [
  { id: 'spring', label: 'Spring', icon: <Flower2 className="w-4 h-4" /> },
  { id: 'summer', label: 'Summer', icon: <Sun className="w-4 h-4" /> },
  { id: 'fall', label: 'Fall', icon: <Leaf className="w-4 h-4" /> },
  { id: 'winter', label: 'Winter', icon: <Snowflake className="w-4 h-4" /> }
]

const WEATHER_OPTIONS: { id: Weather; label: string; icon: React.ReactNode }[] = [
  { id: 'sunny', label: 'Sunny', icon: <Sun className="w-4 h-4" /> },
  { id: 'cloudy', label: 'Cloudy', icon: <Cloud className="w-4 h-4" /> },
  { id: 'rainy', label: 'Rainy', icon: <CloudRain className="w-4 h-4" /> },
  { id: 'stormy', label: 'Stormy', icon: <CloudLightning className="w-4 h-4" /> },
  { id: 'snowy', label: 'Snowy', icon: <Snowflake className="w-4 h-4" /> }
]

const ACTIVITY_OPTIONS: { id: Activity; label: string; icon: React.ReactNode }[] = [
  { id: 'workout', label: 'Workout', icon: <Dumbbell className="w-4 h-4" /> },
  { id: 'study', label: 'Study', icon: <BookOpen className="w-4 h-4" /> },
  { id: 'work', label: 'Work', icon: <Briefcase className="w-4 h-4" /> },
  { id: 'dinner-party', label: 'Dinner Party', icon: <UtensilsCrossed className="w-4 h-4" /> },
  { id: 'driving', label: 'Driving', icon: <Car className="w-4 h-4" /> },
  { id: 'relaxing', label: 'Relaxing', icon: <Sofa className="w-4 h-4" /> },
  { id: 'dancing', label: 'Dancing', icon: <Music2 className="w-4 h-4" /> }
]

const SOCIAL_OPTIONS: { id: SocialContext; label: string; icon: React.ReactNode }[] = [
  { id: 'solo', label: 'Solo', icon: <User className="w-4 h-4" /> },
  { id: 'friends', label: 'Friends', icon: <Users className="w-4 h-4" /> },
  { id: 'date', label: 'Date', icon: <Heart className="w-4 h-4" /> },
  { id: 'party', label: 'Party', icon: <PartyPopper className="w-4 h-4" /> },
  { id: 'background', label: 'Background', icon: <Radio className="w-4 h-4" /> }
]

interface ContextTokensProps {
  className?: string
}

export function ContextTokens({ className }: ContextTokensProps) {
  const {
    generationControls,
    setContextToken,
    clearContextToken
  } = useYTDJStore()

  const [isExpanded, setIsExpanded] = useState(false)

  const { contextTokens } = generationControls

  // Count active tokens
  const activeCount = Object.values(contextTokens).filter(Boolean).length

  const handleToggle = <K extends keyof ContextTokensType>(
    key: K,
    value: ContextTokensType[K]
  ) => {
    if (contextTokens[key] === value) {
      clearContextToken(key)
    } else {
      setContextToken(key, value)
    }
  }

  return (
    <div className={cn('bg-[#0a0c1c]/80 backdrop-blur-xl rounded-xl border border-white/10', className)}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-indigo-500/20 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-xs font-bold tracking-wider text-white">
              CONTEXT TOKENS
            </h3>
            <p className="text-[10px] text-white/40">
              Time, season, weather, activity, social
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {activeCount > 0 && (
            <span className="text-[10px] font-bold text-indigo-400">
              {activeCount} active
            </span>
          )}
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-white/40" />
          ) : (
            <ChevronDown className="w-4 h-4 text-white/40" />
          )}
        </div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-5">
              {/* Info text */}
              <p className="text-[10px] text-white/30 italic">
                Optional context helps the AI understand the mood you're going for
              </p>

              {/* Time of Day */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider flex items-center gap-2">
                  <Sun className="w-3 h-3" />
                  Time of Day
                </label>
                <div className="flex flex-wrap gap-2">
                  {TIME_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => handleToggle('timeOfDay', option.id)}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border',
                        contextTokens.timeOfDay === option.id
                          ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400'
                          : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white'
                      )}
                    >
                      {option.icon}
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Season */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider flex items-center gap-2">
                  <Leaf className="w-3 h-3" />
                  Season
                </label>
                <div className="flex flex-wrap gap-2">
                  {SEASON_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => handleToggle('season', option.id)}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border',
                        contextTokens.season === option.id
                          ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400'
                          : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white'
                      )}
                    >
                      {option.icon}
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Weather */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider flex items-center gap-2">
                  <Cloud className="w-3 h-3" />
                  Weather
                </label>
                <div className="flex flex-wrap gap-2">
                  {WEATHER_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => handleToggle('weather', option.id)}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border',
                        contextTokens.weather === option.id
                          ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400'
                          : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white'
                      )}
                    >
                      {option.icon}
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Activity */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider flex items-center gap-2">
                  <Dumbbell className="w-3 h-3" />
                  Activity
                </label>
                <div className="flex flex-wrap gap-2">
                  {ACTIVITY_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => handleToggle('activity', option.id)}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border',
                        contextTokens.activity === option.id
                          ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400'
                          : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white'
                      )}
                    >
                      {option.icon}
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Social Context */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider flex items-center gap-2">
                  <Users className="w-3 h-3" />
                  Social Context
                </label>
                <div className="flex flex-wrap gap-2">
                  {SOCIAL_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => handleToggle('socialContext', option.id)}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border',
                        contextTokens.socialContext === option.id
                          ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400'
                          : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white'
                      )}
                    >
                      {option.icon}
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Active context summary */}
              {activeCount > 0 && (
                <div className="pt-3 border-t border-white/5">
                  <p className="text-[10px] text-indigo-400 font-medium">
                    Current context:{' '}
                    <span className="text-white/60">
                      {[
                        contextTokens.timeOfDay,
                        contextTokens.season,
                        contextTokens.weather,
                        contextTokens.activity,
                        contextTokens.socialContext
                      ].filter(Boolean).join(' • ')}
                    </span>
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
