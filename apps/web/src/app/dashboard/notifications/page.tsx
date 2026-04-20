'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bell, CheckCircle2, MessageSquare, Vote, Users, Wallet, Shield, Loader2, Check, CheckCheck, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

interface Notification {
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

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [page, setPage] = useState(1);

  const fetchNotifications = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: String(page), limit: '30' });
      if (filter === 'unread') params.set('unread', 'true');
      const res = await fetch(`/api/notifications?${params}`);
      const data = await res.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
      setTotal(data.total || 0);
    } catch {} finally { setLoading(false); }
  }, [page, filter]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const markAsRead = async (id: string) => {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notificationId: id }),
    });
    fetchNotifications();
  };

  const markAllRead = async () => {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markAllRead: true }),
    });
    fetchNotifications();
  };

  const timeAgo = (dateStr: string) => {
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead}>
            <CheckCheck className="h-4 w-4 mr-2" /> Mark all read
          </Button>
        )}
      </div>

      <div className="flex gap-2">
        <Button variant={filter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => { setFilter('all'); setPage(1); }}>All ({total})</Button>
        <Button variant={filter === 'unread' ? 'default' : 'outline'} size="sm" onClick={() => { setFilter('unread'); setPage(1); }}>Unread ({unreadCount})</Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin" /></div>
      ) : notifications.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Bell className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">{filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const Icon = TYPE_ICONS[n.type] || Bell;
            return (
              <div key={n.id} className={`flex items-start gap-3 p-4 rounded-lg border transition-colors ${!n.is_read ? 'bg-primary/5 border-primary/20' : 'bg-background hover:bg-muted/50'}`}>
                <div className={`p-2 rounded-full shrink-0 ${!n.is_read ? 'bg-primary/10' : 'bg-muted'}`}>
                  <Icon className={`h-4 w-4 ${!n.is_read ? 'text-primary' : 'text-muted-foreground'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className={`text-sm ${!n.is_read ? 'font-semibold' : 'font-medium'}`}>{n.title}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">{n.body}</p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{timeAgo(n.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    {n.action_url && (
                      <Link href={n.action_url}><Button variant="outline" size="sm" className="h-7 text-xs">{n.action_label || 'View'}</Button></Link>
                    )}
                    {!n.is_read && (
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => markAsRead(n.id)}>
                        <Check className="h-3 w-3 mr-1" /> Mark read
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {total > 30 && (
            <div className="flex justify-center gap-2 pt-4">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
              <span className="text-sm text-muted-foreground flex items-center">Page {page}</span>
              <Button variant="outline" size="sm" disabled={notifications.length < 30} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
