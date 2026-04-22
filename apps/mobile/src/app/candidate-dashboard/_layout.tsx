import { Stack } from 'expo-router';

export default function CandidateDashboardLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackTitle: 'Back',
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Campaign Dashboard' }} />
      <Stack.Screen name="agents" options={{ title: 'Agents' }} />
      <Stack.Screen name="analytics" options={{ title: 'Analytics' }} />
      <Stack.Screen name="messages" options={{ title: 'Messages' }} />
      <Stack.Screen name="results" options={{ title: 'Results' }} />
      <Stack.Screen name="sms" options={{ title: 'SMS Campaigns' }} />
      <Stack.Screen name="profile" options={{ title: 'Public Profile' }} />
    </Stack>
  );
}
