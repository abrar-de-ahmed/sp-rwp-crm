'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Bell,
  CheckCheck,
  Phone,
  Clock,
  AlertTriangle,
  Bot,
  Megaphone,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// ──────────────────────────────────────
// Types
// ──────────────────────────────────────

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

interface NotificationDropdownProps {
  userId: string;
  onNavigate?: (page: string, leadId?: string) => void;
}

// ──────────────────────────────────────
// Helpers
// ──────────────────────────────────────

function timeAgo(dateStr: string): string {
  const now = new Date();
  const d = new Date(dateStr);
  const diff = now.getTime() - d.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getNotificationIcon(type: string) {
  switch (type) {
    case 'NEW_LEAD':
      return <Phone className="w-4 h-4 text-emerald-600" />;
    case 'FOLLOW_UP_REMINDER':
      return <Clock className="w-4 h-4 text-amber-600" />;
    case 'ESCALATION':
      return <AlertTriangle className="w-4 h-4 text-orange-600" />;
    case 'CALL_OUTCOME':
      return <Phone className="w-4 h-4 text-blue-600" />;
    case 'AI_INSIGHT':
      return <Bot className="w-4 h-4 text-purple-600" />;
    case 'SYSTEM_ALERT':
      return <Megaphone className="w-4 h-4 text-red-600" />;
    default:
      return <Bell className="w-4 h-4 text-gray-600" />;
  }
}

function getNotificationTypeBg(type: string) {
  switch (type) {
    case 'NEW_LEAD':
      return 'bg-emerald-50';
    case 'FOLLOW_UP_REMINDER':
      return 'bg-amber-50';
    case 'ESCALATION':
      return 'bg-orange-50';
    case 'CALL_OUTCOME':
      return 'bg-blue-50';
    case 'AI_INSIGHT':
      return 'bg-purple-50';
    case 'SYSTEM_ALERT':
      return 'bg-red-50';
    default:
      return 'bg-gray-50';
  }
}

// ──────────────────────────────────────
// Component
// ──────────────────────────────────────

export default function NotificationDropdown({ userId, onNavigate }: NotificationDropdownProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications?limit=20');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      }
    } catch {
      // silent
    }
  }, []);

  // Initial fetch + auto-refresh every 30 seconds
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Mark single notification as read
  const markAsRead = async (notification: NotificationItem) => {
    if (notification.isRead) return;

    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n)),
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    try {
      await fetch(`/api/notifications/${notification.id}/read`, { method: 'POST' });
    } catch {
      // Revert on failure
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, isRead: false } : n)),
      );
      setUnreadCount((prev) => prev + 1);
    }

    // Navigate if link exists
    if (notification.link && onNavigate) {
      // Parse link like "leads:leadId" or "follow-ups" etc.
      const parts = notification.link.split(':');
      const page = parts[0];
      const leadId = parts[1];
      onNavigate(page, leadId);
      setIsOpen(false);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    setMarkingAllRead(true);
    try {
      await fetch('/api/notifications/read-all', { method: 'POST' });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // silent
    } finally {
      setMarkingAllRead(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              aria-label="Notifications"
              onClick={() => setIsOpen(!isOpen)}
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Notifications</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-xl border shadow-lg z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-emerald-600 hover:text-emerald-700 h-auto p-1"
                onClick={markAllAsRead}
                disabled={markingAllRead}
              >
                {markingAllRead ? (
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                ) : (
                  <CheckCheck className="w-3 h-3 mr-1" />
                )}
                Mark all as read
              </Button>
            )}
          </div>

          {/* Notification List */}
          <ScrollArea className="max-h-96">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Bell className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No notifications yet</p>
              </div>
            ) : (
              notifications.map((notification, index) => (
                <div key={notification.id}>
                  <button
                    className={`w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors flex items-start gap-3 ${
                      !notification.isRead ? 'bg-emerald-50/30' : ''
                    }`}
                    onClick={() => markAsRead(notification)}
                  >
                    {/* Icon */}
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${getNotificationTypeBg(notification.type)}`}
                    >
                      {getNotificationIcon(notification.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm truncate ${!notification.isRead ? 'font-semibold text-foreground' : 'font-medium text-foreground'}`}>
                          {notification.title}
                        </p>
                        {!notification.isRead && (
                          <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">
                        {timeAgo(notification.createdAt)}
                      </p>
                    </div>
                  </button>
                  {index < notifications.length - 1 && <Separator />}
                </div>
              ))
            )}
          </ScrollArea>

          {/* Footer */}
          <div className="px-4 py-2 border-t bg-muted/30">
            <p className="text-[10px] text-center text-muted-foreground">
              Auto-refreshes every 30 seconds
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
