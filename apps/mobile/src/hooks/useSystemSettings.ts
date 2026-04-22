/**
 * Mobile parity for `apps/web/src/hooks/use-system-settings.ts`.
 *
 * Hits the same `/api/settings` endpoint via the shared API client so the
 * support phone, USSD code, social links etc. shown in the mobile UI stay
 * in sync with the web — no hard-coded duplicates.
 */
import { useQuery } from '@tanstack/react-query';
import {
  settingsApi,
  DEFAULT_SYSTEM_SETTINGS,
  type SystemSettings,
} from '@/lib/api-client';

export function useSystemSettings() {
  const { data, isLoading, refetch } = useQuery<SystemSettings>({
    queryKey: ['system-settings'],
    queryFn: async () => {
      try {
        const remote = await settingsApi.get();
        return { ...DEFAULT_SYSTEM_SETTINGS, ...remote };
      } catch {
        return DEFAULT_SYSTEM_SETTINGS;
      }
    },
    // Settings rarely change; cache aggressively.
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
  });

  return {
    settings: data || DEFAULT_SYSTEM_SETTINGS,
    loading: isLoading,
    refetch,
  };
}
