'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  Search,
  Send,
  ArrowLeft,
  Info,
  X,
  Phone,
  UserPlus,
  MessageSquare,
  Hash,
  Clock,
  ThumbsUp,
  ChevronRight,
  Sparkles,
  Inbox,
} from 'lucide-react';

// ──────────────────────────────────────
// Types
// ──────────────────────────────────────

interface InboxUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface ConversationSummary {
  leadId: string;
  leadName: string;
  leadPhone: string;
  channel: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  temperature: string;
  status: string;
}

interface Message {
  id: string;
  leadId: string;
  channel: string;
  direction: string;
  messageText: string;
  mediaUrl: string | null;
  sentBy: string;
  senderId: string | null;
  isRead: boolean;
  timestamp: string;
  sender: { id: string; name: string } | null;
}

interface LeadInfo {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  whatsappNumber: string | null;
  source: string;
  status: string;
  temperature: string;
  leadScore: number;
  remarks: string;
  tags: string;
}

interface FollowUp {
  id: string;
  reason: string | null;
  status: string;
  dueDatetime: string;
  completionNotes: string | null;
}

interface LastCall {
  id: string;
  callTimestamp: string;
  outcome: string;
  durationSeconds: number;
  aiSummary: string | null;
}

type ChannelFilter = 'ALL' | 'WHATSAPP' | 'FACEBOOK' | 'INSTAGRAM' | 'SMS';

// ──────────────────────────────────────
// Constants
// ──────────────────────────────────────

const CHANNEL_CONFIG: Record<string, { label: string; color: string; bgClass: string; textClass: string; iconBg: string }> = {
  WHATSAPP: {
    label: 'WhatsApp',
    color: '#25D366',
    bgClass: 'bg-green-100 text-green-700 border-green-200',
    textClass: 'text-green-600',
    iconBg: 'bg-green-500',
  },
  FACEBOOK: {
    label: 'Facebook',
    color: '#1877F2',
    bgClass: 'bg-blue-100 text-blue-700 border-blue-200',
    textClass: 'text-blue-600',
    iconBg: 'bg-blue-500',
  },
  INSTAGRAM: {
    label: 'Instagram',
    color: '#E4405F',
    bgClass: 'bg-pink-100 text-pink-700 border-pink-200',
    textClass: 'text-pink-600',
    iconBg: 'bg-pink-500',
  },
  SMS: {
    label: 'SMS',
    color: '#6B7280',
    bgClass: 'bg-gray-100 text-gray-700 border-gray-200',
    textClass: 'text-gray-600',
    iconBg: 'bg-gray-500',
  },
};

const TEMP_COLORS: Record<string, string> = {
  HOT: 'bg-emerald-500',
  WARM: 'bg-amber-400',
  COLD: 'bg-gray-400',
};

const STATUS_COLORS: Record<string, string> = {
  NEW: 'bg-blue-100 text-blue-700 border-blue-200',
  CONTACTED: 'bg-amber-100 text-amber-700 border-amber-200',
  INTERESTED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  NEGOTIATION: 'bg-purple-100 text-purple-700 border-purple-200',
  BOOKED: 'bg-green-100 text-green-700 border-green-200',
  LOST: 'bg-red-100 text-red-700 border-red-200',
  RECOVERED: 'bg-cyan-100 text-cyan-700 border-cyan-200',
};

const CHANNEL_TABS: { value: ChannelFilter; label: string; iconBg: string }[] = [
  { value: 'ALL', label: 'All', iconBg: 'bg-emerald-500' },
  { value: 'WHATSAPP', label: 'WA', iconBg: 'bg-green-500' },
  { value: 'FACEBOOK', label: 'FB', iconBg: 'bg-blue-500' },
  { value: 'INSTAGRAM', label: 'IG', iconBg: 'bg-pink-500' },
  { value: 'SMS', label: 'SMS', iconBg: 'bg-gray-500' },
];

// ──────────────────────────────────────
// Helpers
// ──────────────────────────────────────

function getRelativeTime(dateStr: string): string {
  const now = new Date();
  const d = new Date(dateStr);
  const diff = now.getTime() - d.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatMessageTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatFullDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getChannelAvatarBg(channel: string): string {
  return CHANNEL_CONFIG[channel]?.iconBg ?? 'bg-gray-500';
}

// ──────────────────────────────────────
// Component
// ──────────────────────────────────────

export default function UnifiedInboxPage({
  user,
}: {
  user: InboxUser;
}) {
  const { toast } = useToast();

  // Conversation list state
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>('ALL');

  // Selected conversation state
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [leadInfo, setLeadInfo] = useState<LeadInfo | null>(null);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);

  // UI state
  const [messageInput, setMessageInput] = useState('');
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [mobileShowChat, setMobileShowChat] = useState(false);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ──────────────────────────────────────
  // Fetch conversation list
  // ──────────────────────────────────────

  const fetchConversations = useCallback(async () => {
    setLoadingList(true);
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (channelFilter !== 'ALL') params.set('channel', channelFilter);
      if (search) params.set('search', search);

      const res = await fetch(`/api/conversations?${params}`);
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations ?? []);
      } else if (res.status === 404) {
        setConversations([]);
      } else {
        toast({ title: 'Error', description: 'Failed to load conversations', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to load conversations', variant: 'destructive' });
    } finally {
      setLoadingList(false);
    }
  }, [channelFilter, search, toast]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // ──────────────────────────────────────
  // Fetch messages for selected lead
  // ──────────────────────────────────────

  const fetchMessages = useCallback(async (leadId: string) => {
    setLoadingMessages(true);
    try {
      const params = new URLSearchParams({ limit: '100' });
      const res = await fetch(`/api/conversations/${leadId}?${params}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages ?? []);
        setLeadInfo(data.lead ?? null);
      } else {
        toast({ title: 'Error', description: 'Failed to load messages', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to load messages', variant: 'destructive' });
    } finally {
      setLoadingMessages(false);
    }
  }, [toast]);

  useEffect(() => {
    if (selectedLeadId) {
      fetchMessages(selectedLeadId);
    }
  }, [selectedLeadId, fetchMessages]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loadingMessages]);

  // ──────────────────────────────────────
  // Search handler
  // ──────────────────────────────────────

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
  };

  // ──────────────────────────────────────
  // Select a conversation
  // ──────────────────────────────────────

  const handleSelectConversation = useCallback(
    (leadId: string) => {
      setSelectedLeadId(leadId);
      setMobileShowChat(true);
    },
    [],
  );

  const handleBackToList = useCallback(() => {
    setMobileShowChat(false);
    setSelectedLeadId(null);
    setMessages([]);
    setLeadInfo(null);
  }, []);

  // ──────────────────────────────────────
  // Send message
  // ──────────────────────────────────────

  const handleSendMessage = useCallback(async () => {
    if (!messageInput.trim() || !selectedLeadId || sendingMessage) return;

    const msgText = messageInput.trim();
    setMessageInput('');

    // Optimistic update
    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      leadId: selectedLeadId,
      channel: leadInfo?.source ?? 'SMS',
      direction: 'OUTBOUND',
      messageText: msgText,
      mediaUrl: null,
      sentBy: 'SALES_REP',
      senderId: user.id,
      isRead: true,
      timestamp: new Date().toISOString(),
      sender: { id: user.id, name: user.name },
    };

    setMessages((prev) => [...prev, optimisticMessage]);

    try {
      const res = await fetch('/api/messaging/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: selectedLeadId,
          message: msgText,
          channel: leadInfo?.source ?? 'SMS',
        }),
      });

      if (!res.ok) {
        // Remove optimistic message on error
        setMessages((prev) => prev.filter((m) => m.id !== optimisticMessage.id));
        const data = await res.json();
        toast({
          title: 'Send Failed',
          description: data.error ?? 'Failed to send message',
          variant: 'destructive',
        });
      } else {
        // Replace temp message with real one
        const data = await res.json();
        if (data.conversation) {
          setMessages((prev) =>
            prev.map((m) => (m.id === optimisticMessage.id ? { ...data.conversation, sender: { id: user.id, name: user.name } } : m)),
          );
        }
        // Refresh conversation list to update last message
        fetchConversations();
      }
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMessage.id));
      toast({ title: 'Send Failed', description: 'Network error', variant: 'destructive' });
    } finally {
      setSendingMessage(false);
    }
  }, [messageInput, selectedLeadId, sendingMessage, leadInfo, user, toast, fetchConversations]);

  // Handle Enter to send, Shift+Enter for newline
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    },
    [handleSendMessage],
  );

  // ──────────────────────────────────────
  // Computed values
  // ──────────────────────────────────────

  const selectedConversation = useMemo(
    () => conversations.find((c) => c.leadId === selectedLeadId),
    [conversations, selectedLeadId],
  );

  // Group messages for display (consecutive from same sender)
  const groupedMessages = useMemo(() => {
    const groups: { messages: Message[]; isGroupStart: boolean }[] = [];
    for (let i = 0; i < messages.length; i++) {
      const prev = i > 0 ? messages[i - 1] : null;
      const curr = messages[i];
      const sameSender = prev && prev.sentBy === curr.sentBy && prev.direction === curr.direction;

      // Consider messages from same sender within 2 minutes as a group
      const sameTimeWindow =
        prev &&
        Math.abs(new Date(curr.timestamp).getTime() - new Date(prev.timestamp).getTime()) < 120000;

      const isGroupStart = !sameSender || !sameTimeWindow;

      if (isGroupStart) {
        groups.push({ messages: [curr], isGroupStart: true });
      } else {
        groups[groups.length - 1].messages.push(curr);
      }
    }
    return groups;
  }, [messages]);

  // Total unread count
  const totalUnread = useMemo(
    () => conversations.reduce((sum, c) => sum + c.unreadCount, 0),
    [conversations],
  );

  // ──────────────────────────────────────
  // Render: Contact List (Left Panel)
  // ──────────────────────────────────────

  const renderContactList = () => (
    <div className="flex flex-col h-full">
      {/* Search */}
      <form onSubmit={handleSearch} className="p-3 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search contacts..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9 h-9 text-sm bg-muted/50 border-0 focus-visible:ring-1"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => { setSearchInput(''); setSearch(''); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </form>

      {/* Channel tabs */}
      <div className="px-3 pb-2">
        <div className="flex gap-1">
          {CHANNEL_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setChannelFilter(tab.value)}
              className={`
                flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium
                transition-all duration-150 cursor-pointer
                ${channelFilter === tab.value
                  ? 'bg-emerald-100 text-emerald-700 shadow-sm'
                  : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                }
              `}
            >
              <span className={`w-2 h-2 rounded-full ${tab.iconBg} ${channelFilter === tab.value ? 'ring-2 ring-offset-1 ring-emerald-300' : ''}`} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <Separator />

      {/* Conversation list */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {loadingList ? (
            // Skeleton loaders
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg mb-0.5">
                <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
                <div className="flex-1 min-w-0 space-y-2">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-40" />
                </div>
                <Skeleton className="h-3 w-10" />
              </div>
            ))
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-3">
                <Inbox className="w-7 h-7 text-muted-foreground/50" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">
                {channelFilter !== 'ALL'
                  ? `No ${CHANNEL_CONFIG[channelFilter]?.label ?? channelFilter} conversations found.`
                  : search
                    ? 'No conversations match your search.'
                    : 'No conversations yet.'}
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                {!search && channelFilter === 'ALL'
                  ? 'Connect your channels to start receiving messages.'
                  : 'Try adjusting your filters.'}
              </p>
            </div>
          ) : (
            conversations.map((conv) => {
              const isSelected = selectedLeadId === conv.leadId;
              const channelCfg = CHANNEL_CONFIG[conv.channel] ?? CHANNEL_CONFIG.SMS;

              return (
                <button
                  key={conv.leadId}
                  onClick={() => handleSelectConversation(conv.leadId)}
                  className={`
                    w-full flex items-center gap-3 p-3 rounded-lg mb-0.5
                    transition-all duration-150 cursor-pointer text-left
                    ${isSelected
                      ? 'bg-emerald-50 border border-emerald-200 shadow-sm'
                      : 'hover:bg-muted/60 border border-transparent'
                    }
                  `}
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback
                        className={`text-xs font-semibold text-white ${getChannelAvatarBg(conv.channel)}`}
                      >
                        {getInitials(conv.leadName)}
                      </AvatarFallback>
                    </Avatar>
                    {/* Temperature dot */}
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background ${TEMP_COLORS[conv.temperature] ?? TEMP_COLORS.COLD}`}
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-sm truncate ${conv.unreadCount > 0 ? 'font-bold text-foreground' : 'font-medium text-foreground'}`}>
                        {conv.leadName}
                      </span>
                      <span className="text-[11px] text-muted-foreground flex-shrink-0">
                        {getRelativeTime(conv.lastMessageAt)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <p className={`text-xs truncate ${conv.unreadCount > 0 ? 'text-foreground/80 font-medium' : 'text-muted-foreground'}`}>
                        {conv.lastMessage.length > 50
                          ? `${conv.lastMessage.slice(0, 50)}...`
                          : conv.lastMessage}
                      </p>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <span className={`w-1.5 h-1.5 rounded-full ${channelCfg.iconBg}`} />
                        {conv.unreadCount > 0 && (
                          <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );

  // ──────────────────────────────────────
  // Render: Message Bubble
  // ──────────────────────────────────────

  const renderMessageBubble = (message: Message, isLastInGroup: boolean, isFirstInGroup: boolean) => {
    const isCustomer = message.sentBy === 'CUSTOMER';
    const isAI = message.sentBy === 'AI_AGENT';

    return (
      <div
        className={`
          flex flex-col ${isCustomer ? 'items-start' : 'items-end'}
          ${isFirstInGroup ? 'mt-3' : 'mt-0.5'}
        `}
        key={message.id}
      >
        {/* Sender label for first message in group */}
        {isFirstInGroup && (
          <div className={`flex items-center gap-1.5 mb-1 ${isCustomer ? '' : 'flex-row-reverse'}`}>
            <span className="text-[11px] font-medium text-muted-foreground">
              {isCustomer ? 'Customer' : isAI ? 'AI Bot' : 'You'}
            </span>
            {isAI && (
              <Badge variant="outline" className="h-4 px-1.5 text-[9px] font-semibold bg-sky-50 text-sky-600 border-sky-200 gap-0.5">
                <Sparkles className="w-2.5 h-2.5" />
                AI
              </Badge>
            )}
          </div>
        )}

        {/* Bubble */}
        <div
          className={`
            max-w-[75%] px-3.5 py-2 rounded-2xl text-sm leading-relaxed
            ${isCustomer
              ? 'bg-white border border-border rounded-bl-md shadow-sm'
              : isAI
                ? 'bg-sky-500 text-white rounded-br-md shadow-sm'
                : 'bg-emerald-500 text-white rounded-br-md shadow-sm'
            }
          `}
        >
          <p className="whitespace-pre-wrap break-words">{message.messageText}</p>
        </div>

        {/* Timestamp on last message in group */}
        {isLastInGroup && (
          <span
            className={`text-[10px] text-muted-foreground/60 mt-1 px-1 ${
              isCustomer ? '' : 'text-right'
            }`}
          >
            {formatMessageTime(message.timestamp)}
          </span>
        )}
      </div>
    );
  };

  // ──────────────────────────────────────
  // Render: Chat Messages (Middle Panel)
  // ──────────────────────────────────────

  const renderChatPanel = () => {
    // Empty state — no conversation selected
    if (!selectedLeadId) {
      return (
        <div className="flex flex-col items-center justify-center h-full px-6 text-center">
          <div className="w-20 h-20 rounded-3xl bg-emerald-50 flex items-center justify-center mb-4">
            <MessageSquare className="w-10 h-10 text-emerald-300" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">Unified Inbox</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs">
            Select a conversation to start messaging. All your channels in one place.
          </p>
          {totalUnread > 0 && (
            <Badge className="mt-3 bg-red-500 text-white hover:bg-red-500">
              {totalUnread} unread message{totalUnread !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      );
    }

    const channelCfg = CHANNEL_CONFIG[selectedConversation?.channel ?? 'SMS'];

    return (
      <div className="flex flex-col h-full">
        {/* Chat header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          {/* Mobile back button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-8 w-8 -ml-1"
            onClick={handleBackToList}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>

          {/* Lead avatar */}
          {selectedConversation && (
            <Avatar className="w-9 h-9">
              <AvatarFallback
                className={`text-xs font-semibold text-white ${getChannelAvatarBg(selectedConversation.channel)}`}
              >
                {getInitials(selectedConversation.leadName)}
              </AvatarFallback>
            </Avatar>
          )}

          {/* Name & channel */}
          <div className="flex-1 min-w-0">
            {selectedConversation && (
              <>
                <p className="text-sm font-semibold text-foreground truncate">
                  {selectedConversation.leadName}
                </p>
                <div className="flex items-center gap-1.5">
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-1.5 py-0 h-4 ${channelCfg.bgClass}`}
                  >
                    {channelCfg.label}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-1.5 py-0 h-4 ${STATUS_COLORS[selectedConversation.status] ?? STATUS_COLORS.NEW}`}
                  >
                    {selectedConversation.status}
                  </Badge>
                </div>
              </>
            )}
          </div>

          {/* Info panel toggle */}
          <Button
            variant={showInfoPanel ? 'default' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => setShowInfoPanel(!showInfoPanel)}
          >
            <Info className="w-4 h-4" />
          </Button>
        </div>

        {/* Messages area */}
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-0.5">
            {loadingMessages ? (
              // Message skeleton
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'} mb-3`}>
                  <Skeleton className="w-48 h-12 rounded-2xl" />
                </div>
              ))
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mb-3">
                  <MessageSquare className="w-6 h-6 text-muted-foreground/40" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">
                  No messages yet
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  This conversation will appear here when messages are exchanged.
                </p>
              </div>
            ) : (
              <>
                {groupedMessages.map((group, gi) =>
                  group.messages.map((msg, mi) =>
                    renderMessageBubble(
                      msg,
                      mi === group.messages.length - 1,
                      mi === 0,
                    ),
                  ),
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>
        </ScrollArea>

        {/* Message input bar */}
        <div className="border-t bg-background p-3">
          <div className="flex items-end gap-2">
            {/* Attachment button (placeholder) */}
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground flex-shrink-0 hover:text-foreground"
              disabled
              title="Attachments coming soon"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
            </Button>

            {/* Text input */}
            <div className="flex-1 relative">
              <Textarea
                ref={textareaRef}
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                className="min-h-[36px] max-h-[120px] resize-none text-sm pr-3 py-2 bg-muted/50 border-0 focus-visible:ring-1 rounded-xl"
                rows={1}
              />
            </div>

            {/* Send button */}
            <Button
              onClick={handleSendMessage}
              disabled={!messageInput.trim() || sendingMessage}
              className="h-9 w-9 bg-emerald-500 hover:bg-emerald-600 text-white flex-shrink-0 rounded-lg"
              size="icon"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // ──────────────────────────────────────
  // Render: Lead Info Panel (Right)
  // ──────────────────────────────────────

  const renderInfoPanel = () => {
    if (!leadInfo) return null;

    const leadTags: string[] = [];
    try {
      const parsed = JSON.parse(leadInfo.tags ?? '[]');
      if (Array.isArray(parsed)) leadTags.push(...parsed);
    } catch { /* ignore */ }

    return (
      <div className="flex flex-col h-full border-l bg-muted/30">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="text-sm font-semibold text-foreground">Lead Details</h3>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 md:hidden"
            onClick={() => setShowInfoPanel(false)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-5">
            {/* Lead identity */}
            <div className="flex items-center gap-3">
              <Avatar className="w-12 h-12">
                <AvatarFallback className="text-sm font-bold text-white bg-emerald-500">
                  {getInitials(`${leadInfo.firstName} ${leadInfo.lastName}`)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-sm text-foreground">
                  {leadInfo.firstName} {leadInfo.lastName}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`w-2 h-2 rounded-full ${TEMP_COLORS[leadInfo.temperature] ?? TEMP_COLORS.COLD}`} />
                  <span className="text-xs text-muted-foreground">
                    {leadInfo.temperature} &middot; Score: {leadInfo.leadScore}
                  </span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Contact info */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contact</h4>
              {leadInfo.phone && (
                <div className="flex items-start gap-2.5">
                  <Phone className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-foreground">{leadInfo.phone}</p>
                    <p className="text-[11px] text-muted-foreground">Phone</p>
                  </div>
                </div>
              )}
              {leadInfo.email && (
                <div className="flex items-start gap-2.5">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground mt-0.5 flex-shrink-0"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                  <div>
                    <p className="text-sm text-foreground break-all">{leadInfo.email}</p>
                    <p className="text-[11px] text-muted-foreground">Email</p>
                  </div>
                </div>
              )}
              {leadInfo.whatsappNumber && (
                <div className="flex items-start gap-2.5">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground mt-0.5 flex-shrink-0"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  <div>
                    <p className="text-sm text-foreground">{leadInfo.whatsappNumber}</p>
                    <p className="text-[11px] text-muted-foreground">WhatsApp</p>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Lead details */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Details</h4>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-background rounded-lg p-2.5 border">
                  <p className="text-[11px] text-muted-foreground">Source</p>
                  <p className="text-xs font-medium text-foreground mt-0.5">{leadInfo.source}</p>
                </div>
                <div className="bg-background rounded-lg p-2.5 border">
                  <p className="text-[11px] text-muted-foreground">Status</p>
                  <Badge variant="outline" className={`text-[10px] mt-0.5 ${STATUS_COLORS[leadInfo.status] ?? STATUS_COLORS.NEW}`}>
                    {leadInfo.status}
                  </Badge>
                </div>
                <div className="bg-background rounded-lg p-2.5 border">
                  <p className="text-[11px] text-muted-foreground">Temperature</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`w-2 h-2 rounded-full ${TEMP_COLORS[leadInfo.temperature] ?? TEMP_COLORS.COLD}`} />
                    <span className="text-xs font-medium text-foreground">{leadInfo.temperature}</span>
                  </div>
                </div>
                <div className="bg-background rounded-lg p-2.5 border">
                  <p className="text-[11px] text-muted-foreground">Lead Score</p>
                  <p className="text-xs font-bold text-foreground mt-0.5">{leadInfo.leadScore}</p>
                </div>
              </div>
            </div>

            {/* Tags */}
            {leadTags.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <Hash className="w-3 h-3" />
                    Tags
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {leadTags.map((tag, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Remarks */}
            {leadInfo.remarks && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.855z"/></svg>
                    Remarks
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed bg-background rounded-lg p-2.5 border">
                    {leadInfo.remarks}
                  </p>
                </div>
              </>
            )}

            <Separator />

            {/* Quick actions */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Quick Actions</h4>
              <div className="space-y-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start gap-2 text-xs h-8"
                  onClick={() => {
                    window.dispatchEvent(
                      new CustomEvent('crm-navigate', {
                        detail: { page: 'leads', leadId: leadInfo.id },
                      }),
                    );
                  }}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  View Lead Profile
                  <ChevronRight className="w-3 h-3 ml-auto" />
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start gap-2 text-xs h-8 opacity-60" disabled>
                  <Phone className="w-3.5 h-3.5" />
                  Call Lead
                  <ChevronRight className="w-3 h-3 ml-auto" />
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start gap-2 text-xs h-8 opacity-60" disabled>
                  <Clock className="w-3.5 h-3.5" />
                  Create Follow-Up
                  <ChevronRight className="w-3 h-3 ml-auto" />
                </Button>
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>
    );
  };

  // ──────────────────────────────────────
  // Main render
  // ──────────────────────────────────────

  return (
    <div className="h-[calc(100vh-8rem)] flex rounded-xl border bg-background overflow-hidden shadow-sm">
      {/* Left panel — Contact list */}
      <div
        className={`
          w-full md:w-80 lg:w-96 flex-shrink-0 border-r
          ${mobileShowChat ? 'hidden md:flex md:flex-col' : 'flex flex-col'}
        `}
      >
        {/* List header */}
        <div className="px-4 py-3 border-b bg-background/95">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-foreground">Inbox</h2>
              {totalUnread > 0 && (
                <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold">
                  {totalUnread}
                </span>
              )}
            </div>
            <Badge variant="outline" className="text-[10px] font-normal text-muted-foreground">
              {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        </div>

        {renderContactList()}
      </div>

      {/* Middle panel — Chat messages */}
      <div
        className={`
          flex-1 flex flex-col min-w-0
          ${mobileShowChat ? 'flex' : 'hidden md:flex'}
        `}
      >
        {renderChatPanel()}
      </div>

      {/* Right panel — Lead info */}
      <div
        className={`
          w-72 flex-shrink-0
          ${showInfoPanel ? 'flex flex-col' : 'hidden'}
          ${mobileShowChat && showInfoPanel ? 'flex md:flex' : ''}
          ${!mobileShowChat && showInfoPanel ? 'hidden md:flex md:flex-col' : ''}
        `}
      >
        {showInfoPanel && leadInfo && renderInfoPanel()}
      </div>
    </div>
  );
}
