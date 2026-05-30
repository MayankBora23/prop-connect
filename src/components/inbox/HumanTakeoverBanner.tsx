import { useToggleAI, useAssignChat, type WhatsAppConversation } from '@/hooks/useWhatsApp'
import { useCurrentProfile } from '@/hooks/useProfiles'
import { Button } from '@/components/ui/button'
import { AlertCircle, X } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface HumanTakeoverBannerProps {
  conversation: WhatsAppConversation
  companyId: string
  onDismiss: () => void
}

export function HumanTakeoverBanner({
  conversation,
  companyId,
  onDismiss,
}: HumanTakeoverBannerProps) {
  const toggleAI = useToggleAI()
  const assignChat = useAssignChat()
  const { data: currentProfile } = useCurrentProfile()

  if (conversation.chat_status !== 'human_requested') {
    return null
  }

  const requestedAgo = conversation.human_requested_at
    ? formatDistanceToNow(new Date(conversation.human_requested_at), { addSuffix: true })
    : 'recently'

  return (
    <div className="mx-4 mt-2 mb-0 flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100">
      <AlertCircle className="w-5 h-5 flex-shrink-0 text-amber-600" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">AI Paused — Customer requested human support</p>
        <p className="text-xs opacity-80">Requested {requestedAgo}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs border-amber-400"
          disabled={toggleAI.isPending}
          onClick={() =>
            toggleAI.mutate({ conversationId: conversation.id, enabled: true })
          }
        >
          Resume AI
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs border-amber-400"
          disabled={assignChat.isPending}
          onClick={() =>
            assignChat.mutate({
              conversationId: conversation.id,
              assignToProfileId: conversation.assigned_to || currentProfile?.id || null,
              companyId,
            })
          }
        >
          Mark as Handled
        </Button>
        <button
          type="button"
          onClick={onDismiss}
          className="p-1 rounded hover:bg-amber-200/50 dark:hover:bg-amber-800/50"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
