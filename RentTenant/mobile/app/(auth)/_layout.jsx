/**
 * @file app/(auth)/_layout.jsx
 * @description Layout for unauthenticated screens (Login, Register).
 * Uses a simple Stack navigator with no header (screens are full-page).
 */

import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login"    options={{ title: 'Login' }} />
      <Stack.Screen name="register" options={{ title: 'Register' }} />
    </Stack>
  );
}
