import {
  useToggleAI,
  useAssignChat,
  useChatAssignmentHistory,
  type WhatsAppConversation,
} from '@/hooks/useWhatsApp'
import { useProfiles } from '@/hooks/useProfiles'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Bot,
  User,
  AlertCircle,
  Clock,
  CheckCircle,
  History,
  Loader2,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'

interface ChatHeaderControlsProps {
  conversation: WhatsAppConversation
  companyId: string
  currentUserRole: string
  currentProfileId: string
}

const STATUS_CONFIG: Record<
  string,
  { label: string; className: string; icon: typeof Bot }
> = {
  ai_handling: { label: 'AI Handling', className: 'bg-blue-500/15 text-blue-700 border-blue-200', icon: Bot },
  assigned: { label: 'Assigned', className: 'bg-green-500/15 text-green-700 border-green-200', icon: User },
  human_requested: { label: 'Human Requested', className: 'bg-red-500/15 text-red-700 border-red-200 animate-pulse', icon: AlertCircle },
  pending: { label: 'Pending', className: 'bg-muted text-muted-foreground', icon: Clock },
  closed: { label: 'Closed', className: 'bg-slate-500/15 text-slate-700 border-slate-200', icon: CheckCircle },
}

export function ChatHeaderControls({
  conversation,
  companyId,
  currentUserRole,
  currentProfileId,
}: ChatHeaderControlsProps) {
  const toggleAI = useToggleAI()
  const assignChat = useAssignChat()
  const { data: teamMembers } = useProfiles()
  const { data: history } = useChatAssignmentHistory(conversation.id)

  const canAssign = ['super_admin', 'admin', 'manager'].includes(currentUserRole)
  const isSalesAssigned =
    currentUserRole === 'sales' &&
    conversation.assigned_to === currentProfileId

  const statusKey = conversation.chat_status || 'pending'
  const statusCfg = STATUS_CONFIG[statusKey] ?? STATUS_CONFIG.pending
  const StatusIcon = statusCfg.icon

  const handleAssignChange = (value: string) => {
    assignChat.mutate({
      conversationId: conversation.id,
      assignToProfileId: value === 'unassigned' ? null : value,
      companyId,
    })
  }

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Badge variant="outline" className={cn('gap-1 text-xs', statusCfg.className)}>
          <StatusIcon className="w-3 h-3" />
          {statusCfg.label}
        </Badge>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              className={cn(
                'h-8 gap-1 text-xs',
                conversation.ai_enabled
                  ? 'bg-green-600 text-white hover:bg-green-700 border-green-600'
                  : 'bg-muted text-muted-foreground'
              )}
              onClick={() =>
                toggleAI.mutate({
                  conversationId: conversation.id,
                  enabled: !conversation.ai_enabled,
                })
              }
              disabled={toggleAI.isPending}
            >
              {toggleAI.isPending ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Bot className="w-3 h-3" />
              )}
              {conversation.ai_enabled ? 'AI ON' : 'AI OFF'}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Toggle AI auto-reply</TooltipContent>
        </Tooltip>

        {canAssign && (
          <Select
            value={conversation.assigned_to || 'unassigned'}
            onValueChange={handleAssignChange}
            disabled={assignChat.isPending}
          >
            <SelectTrigger className="h-8 w-[130px] text-xs">
              <SelectValue placeholder="Assign to..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {(teamMembers || []).map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  {member.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {isSalesAssigned && !canAssign && (
          <Badge variant="secondary" className="text-xs">
            {conversation.assigned_profile?.name || 'You'}
          </Badge>
        )}

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <History className="w-4 h-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80">
            <p className="text-sm font-medium mb-2">Assignment History</p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {(history || []).slice(0, 5).length > 0 ? (
                (history || []).slice(0, 5).map((entry) => (
                  <div key={entry.id} className="text-xs border-b border-border pb-2 last:border-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-[10px] px-1 py-0">
                        {entry.action_type.replace('_', ' ')}
                      </Badge>
                      <span className="text-muted-foreground">
                        {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-muted-foreground">
                      {entry.changed_by_profile?.name ? `By ${entry.changed_by_profile.name}` : 'System'}
                      {entry.new_assigned_profile?.name
                        ? ` → ${entry.new_assigned_profile.name}`
                        : entry.old_assigned_profile?.name
                          ? ` (from ${entry.old_assigned_profile.name})`
                          : ''}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground">No history yet</p>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </TooltipProvider>
  )
}
