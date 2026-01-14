'use client'

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
  Sparkles,
  Leaf,
  Flower2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useYTDJStore } from '@/store'
import { WizardStep } from '../WizardStep'
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

interface TokenGroupProps {
  label: string
  icon: React.ReactNode
  options: { id: string; label: string; icon: React.ReactNode }[]
  value: string | undefined
  onChange: (value: string | undefined) => void
  color: string
}

function TokenGroup({ label, icon, options, value, onChange, color }: TokenGroupProps) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-bold text-white/50 uppercase tracking-wider flex items-center gap-2">
        {icon}
        {label}
      </label>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.id}
            onClick={() => onChange(value === option.id ? undefined : option.id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border',
              value === option.id
                ? `bg-${color}-500/20 border-${color}-500/50 text-${color}-400`
                : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white'
            )}
            style={value === option.id ? {
              backgroundColor: `rgb(var(--${color}-500) / 0.2)`,
              borderColor: `rgb(var(--${color}-500) / 0.5)`,
            } : {}}
          >
            {option.icon}
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export function ContextSettingStep() {
  const { generationControls, setContextToken, clearContextToken } = useYTDJStore()
  const { contextTokens } = generationControls

  const handleToggle = <K extends keyof ContextTokensType>(
    key: K,
    value: ContextTokensType[K] | undefined
  ) => {
    if (value === undefined) {
      clearContextToken(key)
    } else {
      setContextToken(key, value)
    }
  }

  const activeCount = Object.values(contextTokens).filter(Boolean).length

  return (
    <WizardStep
      title="When and where will you listen?"
      subtitle="Optional context helps the AI match your vibe"
    >
      <div className="space-y-6 p-4 bg-indigo-500/5 border border-indigo-500/20 rounded-xl">
        <TokenGroup
          label="Time of Day"
          icon={<Sun className="w-3 h-3" />}
          options={TIME_OPTIONS}
          value={contextTokens.timeOfDay}
          onChange={(v) => handleToggle('timeOfDay', v as TimeOfDay | undefined)}
          color="indigo"
        />

        <TokenGroup
          label="Season"
          icon={<Leaf className="w-3 h-3" />}
          options={SEASON_OPTIONS}
          value={contextTokens.season}
          onChange={(v) => handleToggle('season', v as Season | undefined)}
          color="indigo"
        />

        <TokenGroup
          label="Weather"
          icon={<Cloud className="w-3 h-3" />}
          options={WEATHER_OPTIONS}
          value={contextTokens.weather}
          onChange={(v) => handleToggle('weather', v as Weather | undefined)}
          color="indigo"
        />

        <TokenGroup
          label="Activity"
          icon={<Dumbbell className="w-3 h-3" />}
          options={ACTIVITY_OPTIONS}
          value={contextTokens.activity}
          onChange={(v) => handleToggle('activity', v as Activity | undefined)}
          color="indigo"
        />

        <TokenGroup
          label="Social Context"
          icon={<Users className="w-3 h-3" />}
          options={SOCIAL_OPTIONS}
          value={contextTokens.socialContext}
          onChange={(v) => handleToggle('socialContext', v as SocialContext | undefined)}
          color="indigo"
        />

        {activeCount > 0 && (
          <div className="pt-3 border-t border-white/10">
            <p className="text-xs text-indigo-400 font-medium">
              Context: {' '}
              <span className="text-white/60">
                {[
                  contextTokens.timeOfDay,
                  contextTokens.season,
                  contextTokens.weather,
                  contextTokens.activity,
                  contextTokens.socialContext
                ].filter(Boolean).join(' / ')}
              </span>
            </p>
          </div>
        )}
      </div>
    </WizardStep>
  )
}
