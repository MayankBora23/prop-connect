import { useCurrentProfile } from '@/hooks/useProfiles'
import { useUpdateAgentAvailability } from '@/hooks/useWhatsApp'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

const AVAILABILITY_OPTIONS = [
  { value: 'available' as const, label: 'Available', dotClass: 'bg-green-500' },
  { value: 'busy' as const, label: 'Busy', dotClass: 'bg-yellow-500' },
  { value: 'offline' as const, label: 'Offline', dotClass: 'bg-red-500' },
]

export function AgentAvailabilitySelector() {
  const { data: profile } = useCurrentProfile()
  const updateAvailability = useUpdateAgentAvailability()

  const current =
    (profile?.agent_availability as 'available' | 'busy' | 'offline') || 'available'
  const currentOption =
    AVAILABILITY_OPTIONS.find((o) => o.value === current) ?? AVAILABILITY_OPTIONS[0]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs hover:bg-secondary transition-colors"
          title="Set your availability"
        >
          <span className={cn('w-2 h-2 rounded-full', currentOption.dotClass)} />
          <span className="text-muted-foreground hidden sm:inline">{currentOption.label}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {AVAILABILITY_OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => updateAvailability.mutate({ availability: option.value })}
            className="gap-2"
          >
            <span className={cn('w-2 h-2 rounded-full', option.dotClass)} />
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
