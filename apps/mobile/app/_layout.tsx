import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { getLocalDatabase } from '../src/db/sqlite';
import { runLocalMigrations } from '../src/db/migrations';
import { useAuthStore } from '../src/store/authStore';
import { theme } from '../src/theme';

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const { initialize, isOnboarded } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    async function bootstrap() {
      try {
        const db = await getLocalDatabase();
        await runLocalMigrations(db);
        await initialize();
        setIsReady(true);
      } catch (err: any) {
        setInitError(err.message ?? 'Failed to initialize local storage');
      }
    }
    bootstrap();
  }, []);

  useEffect(() => {
    if (isReady && !isOnboarded) {
      router.replace('/onboarding');
    }
  }, [isReady, isOnboarded]);

  if (initError) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Initialization Error</Text>
        <Text style={styles.errorText}>{initError}</Text>
      </View>
    );
  }

  if (!isReady) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Initializing FITLIFE OS...</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.textPrimary,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: theme.colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="photo-vault" options={{ headerShown: false }} />
        <Stack.Screen name="community" options={{ headerShown: false }} />
        <Stack.Screen
          name="auth"
          options={{ presentation: 'modal', title: 'Account & Synchronization' }}
        />
      </Stack>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  loadingText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
  },
  errorTitle: {
    ...theme.typography.h2,
    color: theme.colors.danger,
    marginBottom: theme.spacing.sm,
  },
  errorText: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
});
