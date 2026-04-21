'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  Info,
  Loader2,
  MessageSquare,
  Shield,
  Users,
  Vote,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  action_url: string | null;
  action_label: string | null;
  is_read: boolean;
  created_at: string;
}

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  poll_reminder: Vote,
  result_update: CheckCircle2,
  agent_invite: Shield,
  payment: Wallet,
  system: Info,
  follow: Users,
  message: MessageSquare,
  sms_complete: MessageSquare,
};

const POLL_INTERVAL_MS = 60_000;

function timeAgo(dateStr: string) {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const fetchNotifications = useCallback(
    async (opts: { silent?: boolean } = {}) => {
      if (!opts.silent) setLoading(true);
      try {
        const res = await fetch('/api/notifications?page=1&limit=8', {
          cache: 'no-store',
        });
        if (!res.ok) return;
        const data = await res.json();
        setItems(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
        setLoadedOnce(true);
      } catch {
        // ignore network errors
      } finally {
        if (!opts.silent) setLoading(false);
      }
    },
    []
  );

  // Initial + polling unread count
  useEffect(() => {
    fetchNotifications({ silent: true });
    const id = setInterval(
      () => fetchNotifications({ silent: true }),
      POLL_INTERVAL_MS
    );
    return () => clearInterval(id);
  }, [fetchNotifications]);

  // Refresh when dropdown opens
  useEffect(() => {
    if (open) fetchNotifications();
  }, [open, fetchNotifications]);

  // Click outside to close
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const markAsRead = async (id: string) => {
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: id }),
      });
    } catch {
      fetchNotifications({ silent: true });
    }
  };

  const markAllRead = async () => {
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true }),
      });
    } catch {
      fetchNotifications({ silent: true });
    }
  };

  const badge =
    unreadCount > 0 ? (unreadCount > 99 ? '99+' : String(unreadCount)) : null;

  return (
    <div ref={containerRef} className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        aria-label="Notifications"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <Bell className="h-5 w-5" />
        {badge && (
          <span className="absolute -top-1 -right-1 min-w-[1rem] h-4 px-1 rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground flex items-center justify-center">
            {badge}
          </span>
        )}
      </Button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 w-[22rem] max-w-[calc(100vw-1rem)] rounded-lg border bg-background shadow-lg z-50 overflow-hidden"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div>
              <p className="font-semibold text-sm">Notifications</p>
              <p className="text-xs text-muted-foreground">
                {unreadCount > 0
                  ? `${unreadCount} unread`
                  : 'You are all caught up'}
              </p>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                <CheckCheck className="h-3.5 w-3.5" /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {loading && !loadedOnce ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : items.length === 0 ? (
              <div className="py-10 px-4 text-center">
                <Bell className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">
                  No notifications yet
                </p>
              </div>
            ) : (
              <ul className="divide-y">
                {items.map((n) => {
                  const Icon = TYPE_ICONS[n.type] || Bell;
                  const content = (
                    <div className="flex items-start gap-3 px-4 py-3 hover:bg-muted/60 transition-colors">
                      <div
                        className={`p-2 rounded-full shrink-0 ${
                          !n.is_read ? 'bg-primary/10' : 'bg-muted'
                        }`}
                      >
                        <Icon
                          className={`h-4 w-4 ${
                            !n.is_read
                              ? 'text-primary'
                              : 'text-muted-foreground'
                          }`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p
                            className={`text-sm truncate ${
                              !n.is_read ? 'font-semibold' : 'font-medium'
                            }`}
                          >
                            {n.title}
                          </p>
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap mt-0.5">
                            {timeAgo(n.created_at)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                          {n.body}
                        </p>
                      </div>
                      {!n.is_read && (
                        <span
                          className="mt-2 h-2 w-2 rounded-full bg-primary shrink-0"
                          aria-label="Unread"
                        />
                      )}
                    </div>
                  );
                  return (
                    <li key={n.id}>
                      {n.action_url ? (
                        <Link
                          href={n.action_url}
                          onClick={() => {
                            if (!n.is_read) markAsRead(n.id);
                            setOpen(false);
                          }}
                          className="block"
                        >
                          {content}
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            if (!n.is_read) markAsRead(n.id);
                          }}
                          className="block w-full text-left"
                        >
                          {content}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="border-t px-4 py-2 text-center">
            <Link
              href="/dashboard/notifications"
              onClick={() => setOpen(false)}
              className="text-xs font-medium text-primary hover:underline"
            >
              View all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
