import { Redirect, Stack } from 'expo-router';
import { useAuthStore } from '@stores/auth.store';

export default function AppLayout() {
  const { session, isInitialized } = useAuthStore();

  if (!isInitialized) return null;

  if (!session) {
    return <Redirect href="/(auth)/welcome" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="session/[id]" options={{ presentation: 'card' }} />
      <Stack.Screen name="session/book/[id]" options={{ presentation: 'modal' }} />
      <Stack.Screen name="trainer/[id]" options={{ presentation: 'card' }} />
      <Stack.Screen name="trainer/apply" options={{ presentation: 'card' }} />
      <Stack.Screen name="trainer/dashboard" options={{ presentation: 'card' }} />
      <Stack.Screen name="create-session" options={{ presentation: 'modal' }} />
      <Stack.Screen name="create-group" options={{ presentation: 'modal' }} />
      <Stack.Screen name="plans" options={{ presentation: 'modal' }} />
      <Stack.Screen name="review/[sessionId]" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
