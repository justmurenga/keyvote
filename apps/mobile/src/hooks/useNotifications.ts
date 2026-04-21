import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import {
  fetchNotifications,
  fetchUnreadCount,
  subscribeToNotifications,
  type AppNotification,
} from '@/services/notifications';

/**
 * Listens for realtime notifications, returns the live list and unread count.
 * Use `useNotifications()` from anywhere — e.g. for the home screen bell.
 */
export function useNotifications() {
  const userId = useAuthStore((s) => s.user?.id || s.profile?.id);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const lastBannerRef = useRef<string | null>(null);
  const [latestBanner, setLatestBanner] = useState<AppNotification | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [list, count] = await Promise.all([
        fetchNotifications({ limit: 50 }),
        fetchUnreadCount(),
      ]);
      setNotifications(list);
      setUnreadCount(count);
    } catch {
      /* swallow */
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    refresh();
    const unsub = subscribeToNotifications(userId, (n) => {
      setNotifications((prev) => [n, ...prev]);
      setUnreadCount((c) => c + 1);
      if (lastBannerRef.current !== n.id) {
        lastBannerRef.current = n.id;
        setLatestBanner(n);
      }
    });
    return unsub;
  }, [userId, refresh]);

  const dismissBanner = useCallback(() => setLatestBanner(null), []);

  return {
    notifications,
    unreadCount,
    loading,
    refresh,
    latestBanner,
    dismissBanner,
    setNotifications,
    setUnreadCount,
  };
}
