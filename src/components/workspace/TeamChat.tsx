import React, { useState, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTeamChatMessages, useSendChatMessage, useTeamChatRealtime } from '@/hooks/useTeamChat';
import { useProfiles, useCurrentProfile } from '@/hooks/useProfiles';
import { cn } from '@/lib/utils';
import { Send, Users, UserCheck, UserX, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

export function TeamChat() {
  const [newMessage, setNewMessage] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: messages, isLoading: messagesLoading, error: messagesError, refetch: refetchMessages } = useTeamChatMessages(50);
  const { data: profiles, isLoading: profilesLoading } = useProfiles();
  const { data: currentProfile } = useCurrentProfile();
  const sendMessage = useSendChatMessage();
  const { toast } = useToast();

  const handleRefresh = async () => {
    try {
      await refetchMessages();
      toast({
        title: 'Refreshed',
        description: 'Messages have been updated.',
      });
    } catch (error) {
      toast({
        title: 'Refresh failed',
        description: 'Failed to refresh messages. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const isLoading = messagesLoading || profilesLoading;

  // Create a map of profiles for quick lookup
  const profileMap = React.useMemo(() => {
    const map = new Map();
    profiles?.forEach(profile => {
      map.set(profile.user_id, profile);
    });
    return map;
  }, [profiles]);


  // Set up real-time updates
  useTeamChatRealtime((newMessage) => {
    console.log('New message received via real-time:', newMessage.id);
    // Auto-scroll to bottom when new message arrives
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  });

  // Auto-scroll to bottom when messages load
  useEffect(() => {
    if (messages && messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    const messageContent = newMessage.trim();
    setNewMessage(''); // Clear input immediately for better UX

    try {
      await sendMessage.mutateAsync({
        content: messageContent,
      });
    } catch (error: any) {
      // Restore the message if sending failed
      setNewMessage(messageContent);
      toast({
        title: 'Error',
        description: error?.message || 'Failed to send message. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return format(date, 'HH:mm');
    } else if (diffInHours < 168) { // 7 days
      return format(date, 'EEE HH:mm');
    } else {
      return format(date, 'MMM d, HH:mm');
    }
  };

  const getRoleBadgeColor = (role: string | null) => {
    switch (role) {
      case 'super_admin': return 'bg-destructive/10 text-destructive';
      case 'admin': return 'bg-primary/10 text-primary';
      case 'manager': return 'bg-success/10 text-success';
      case 'sales': return 'bg-warning/10 text-warning';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getRoleDisplayName = (role: string | null) => {
    if (!role) return 'User';
    return role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-200px)] card-elevated animate-fade-in">
        {/* Team Members Skeleton */}
        <div className="w-80 border-r border-border flex flex-col">
          <div className="p-4 border-b border-border">
            <Skeleton className="h-6 w-32" />
          </div>
          <div className="flex-1 p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* Chat Skeleton */}
        <div className="flex-1 flex flex-col">
          <div className="p-4 border-b border-border">
            <Skeleton className="h-6 w-40" />
          </div>
          <div className="flex-1 flex items-center justify-center">
            <Skeleton className="h-8 w-40" />
          </div>
        </div>
      </div>
    );
  }

  if (messagesError) {
    return (
      <div className="flex h-[calc(100vh-200px)] card-elevated animate-fade-in">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <div className="text-destructive mb-2 font-semibold">Failed to load messages</div>
            <p className="text-sm text-muted-foreground mb-4">
              {messagesError?.message || 'Please try refreshing the page'}
            </p>
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-200px)] card-elevated animate-fade-in">
      {/* Team Members Sidebar */}
      <div className="w-80 border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            <h3 className="font-semibold">Team Members</h3>
            <Badge variant="secondary" className="ml-auto">
              {profiles?.length || 0}
            </Badge>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-3">
            {profiles && profiles.length > 0 ? (
              profiles.map((profile) => {
                const isCurrentUser = profile.user_id === currentProfile?.user_id;
                const isOnline = true; // TODO: Add online status tracking

                return (
                  <div
                    key={profile.user_id}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors',
                      isCurrentUser && 'bg-primary/5 border border-primary/20'
                    )}
                  >
                    <div className="relative">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={(profile as any).avatar_url} />
                        <AvatarFallback>
                          {profile.name
                            ?.split(' ')
                            .map(n => n[0])
                            .join('')
                            .slice(0, 2) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className={cn(
                        'absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-background',
                        isOnline ? 'bg-success' : 'bg-muted'
                      )}>
                        {isOnline ? (
                          <UserCheck className="w-3 h-3 text-success-foreground m-0.5" />
                        ) : (
                          <UserX className="w-3 h-3 text-muted-foreground m-0.5" />
                        )}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">
                          {profile.name}
                          {isCurrentUser && <span className="text-muted-foreground ml-1">(You)</span>}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn('text-xs mt-1', getRoleBadgeColor(profile.role))}
                      >
                        {getRoleDisplayName(profile.role)}
                      </Badge>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No team members found</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            <h2 className="font-semibold">Team Chat</h2>
            <div className="ml-auto flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={messagesLoading}
                className="h-8 w-8 p-0"
              >
                <RefreshCw className={cn("w-4 h-4", messagesLoading && "animate-spin")} />
              </Button>
              <div className="text-sm text-muted-foreground">
                {messages?.length || 0} messages
              </div>
            </div>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
          <div className="space-y-4">
            {messages && messages.length > 0 ? (
              messages.map((message) => {
                const isOwnMessage = message.sender_id === currentProfile?.user_id;

                return (
                  <div
                    key={message.id}
                    className={cn(
                      'flex gap-3 max-w-[80%]',
                      isOwnMessage ? 'ml-auto flex-row-reverse' : ''
                    )}
                  >
                  <Avatar className="w-8 h-8 flex-shrink-0">
                    <AvatarImage src={(profileMap.get(message.sender_id) as any)?.avatar_url} />
                    <AvatarFallback>
                      {profileMap.get(message.sender_id)?.name
                        ?.split(' ')
                        .map(n => n[0])
                        .join('')
                        .slice(0, 2) ||
                        message.sender_id.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className={cn(
                    'flex flex-col gap-1',
                    isOwnMessage ? 'items-end' : 'items-start'
                  )}>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {!isOwnMessage && (
                        <span className="font-medium">
                          {profileMap.get(message.sender_id)?.name || message.sender_id.slice(0, 8)}
                        </span>
                      )}
                      <span>{formatMessageTime(message.created_at)}</span>
                    </div>

                      <div className={cn(
                        'px-3 py-2 rounded-lg max-w-md break-words',
                        isOwnMessage
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      )}>
                        {message.content}
                      </div>
                    </div>
                  </div>
                );
              })
          ) : (
            <div className="text-center text-muted-foreground py-8">
              <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No messages yet. Start the conversation!</p>
              {messagesError && (
                <div className="mt-4 p-4 bg-destructive/10 rounded-lg">
                  <p className="text-sm text-destructive">Error loading messages:</p>
                  <p className="text-xs text-destructive mt-1">{messagesError.message}</p>
                </div>
              )}
            </div>
          )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Message Input */}
        <div className="p-4 border-t border-border">
          <div className="flex gap-2">
            <Input
              placeholder="Type your message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1"
              disabled={sendMessage.isPending}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || sendMessage.isPending}
              size="icon"
              className={sendMessage.isPending ? "opacity-50" : ""}
            >
              {sendMessage.isPending ? (
                <div className="w-4 h-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
