/**
 * @file app/_layout.jsx
 * @description Root layout for the Expo Router app.
 * Sets up:
 *  - AuthProvider (global JWT state via SecureStore)
 *  - QueryClientProvider (React Query server-state cache)
 *  - Toast message overlay (react-native-toast-message)
 *  - Redirects unauthenticated users to /(auth)/login
 */

import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import Toast from 'react-native-toast-message';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';

import { AuthProvider, useAuth } from '../context/AuthContext';
import Colors from '../constants/colors';

/**
 * React Query client — 5 minute stale time, single retry.
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:          5 * 60 * 1000,
      retry:              1,
      refetchOnWindowFocus: false,
    },
  },
});

/**
 * AuthGate — listens to auth state and redirects accordingly.
 * Runs on every segment change (page navigation).
 *
 * Rules:
 *  - Not authenticated + not on auth screen → redirect to /login
 *  - Authenticated + on auth screen         → redirect to /tabs (dashboard)
 */
const AuthGate = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const segments = useSegments();
  const router   = useRouter();

  useEffect(() => {
    if (loading) return; // Wait until SecureStore check completes

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      // Not logged in — go to login
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      // Already logged in — go to dashboard
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, loading, segments]);

  return children;
};

/**
 * Root layout — wraps everything in providers.
 */
export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.container}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AuthGate>
            {/* Dark status bar (white icons on dark background) */}
            <StatusBar style="light" backgroundColor={Colors.bg} />

            <Stack screenOptions={{ headerShown: false }}>
              {/* Auth screens — no header, no tab bar */}
              <Stack.Screen name="(auth)" options={{ headerShown: false }} />
              {/* Main app tabs */}
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            </Stack>
          </AuthGate>
        </AuthProvider>
      </QueryClientProvider>

      {/* Global toast overlay — must be outside all other views */}
      <Toast />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
