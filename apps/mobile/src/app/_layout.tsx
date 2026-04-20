import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { useThemeStore } from '@/stores/theme-store';
import { useIsDarkMode } from '@/hooks/useTheme';
import { LoadingScreen } from '@/components/ui';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
    },
  },
});

export default function RootLayout() {
  const { initialize, isLoading } = useAuthStore();
  const isDark = useIsDarkMode();

  useEffect(() => {
    initialize();
  }, []);

  if (isLoading) {
    return <LoadingScreen message="Loading myVote..." />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="candidate/[id]"
          options={{
            headerShown: true,
            title: 'Candidate Profile',
            headerBackTitle: 'Back',
          }}
        />
        <Stack.Screen
          name="poll/[id]"
          options={{
            headerShown: true,
            title: 'Poll Details',
            headerBackTitle: 'Back',
          }}
        />
      </Stack>
    </QueryClientProvider>
  );
}
