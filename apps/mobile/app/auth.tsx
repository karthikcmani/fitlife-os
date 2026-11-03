import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '../src/components/ui/ScreenContainer';
import { SurfaceCard } from '../src/components/ui/SurfaceCard';
import { Button } from '../src/components/ui/Button';
import { useAuthStore } from '../src/store/authStore';
import { theme } from '../src/theme';
import { registerSchema, loginSchema } from '@fitlife/validation';

export default function AuthModalScreen() {
  const router = useRouter();
  const { setSession, backendUrl, setBackendUrl } = useAuthStore();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [serverUrl, setServerUrl] = useState(backendUrl);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    setBackendUrl(serverUrl);

    if (mode === 'register') {
      const parse = registerSchema.safeParse({ username, email, password });
      if (!parse.success) {
        setLoading(false);
        const errs = parse.error.errors.map((e) => e.message).join('\n');
        Alert.alert('Validation Error', errs);
        return;
      }

      try {
        const res = await fetch(`${serverUrl}/api/v1/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(parse.data),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error ?? 'Registration failed');
        }

        await setSession(data.user, data.tokens.accessToken, data.tokens.refreshToken);
        Alert.alert('Success', 'Account registered and synchronized!');
        router.back();
      } catch (err: any) {
        Alert.alert('Connection Error', err.message);
      } finally {
        setLoading(false);
      }
    } else {
      const parse = loginSchema.safeParse({ emailOrUsername: email || username, password });
      if (!parse.success) {
        setLoading(false);
        Alert.alert('Validation Error', 'Email/Username and Password are required.');
        return;
      }

      try {
        const res = await fetch(`${serverUrl}/api/v1/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(parse.data),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error ?? 'Invalid credentials');
        }

        await setSession(data.user, data.tokens.accessToken, data.tokens.refreshToken);
        Alert.alert('Success', 'Logged in successfully!');
        router.back();
      } catch (err: any) {
        Alert.alert('Authentication Error', err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <ScreenContainer>
      <SurfaceCard elevated>
        <Text style={styles.title}>
          {mode === 'login' ? 'Connect to Cloud Account' : 'Create Free Self-Hostable Account'}
        </Text>
        <Text style={styles.subtitle}>
          Authentication enables delta synchronization across devices and peer community participation.
        </Text>

        <Text style={styles.inputLabel}>Self-Hosted Server URL</Text>
        <TextInput
          style={styles.textInput}
          value={serverUrl}
          onChangeText={setServerUrl}
          placeholder="http://localhost:4000"
          placeholderTextColor={theme.colors.textMuted}
        />

        {mode === 'register' ? (
          <>
            <Text style={styles.inputLabel}>Username</Text>
            <TextInput
              style={styles.textInput}
              value={username}
              onChangeText={setUsername}
              placeholder="e.g. arun_fitness"
              placeholderTextColor={theme.colors.textMuted}
              autoCapitalize="none"
            />
          </>
        ) : null}

        <Text style={styles.inputLabel}>{mode === 'login' ? 'Email or Username' : 'Email Address'}</Text>
        <TextInput
          style={styles.textInput}
          value={email}
          onChangeText={setEmail}
          placeholder="user@example.com"
          placeholderTextColor={theme.colors.textMuted}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <Text style={styles.inputLabel}>Password</Text>
        <TextInput
          style={styles.textInput}
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••••••"
          placeholderTextColor={theme.colors.textMuted}
          secureTextEntry
        />

        <Button
          title={mode === 'login' ? 'Log In & Sync' : 'Register Account'}
          onPress={handleSubmit}
          loading={loading}
          style={styles.submitBtn}
        />

        <Button
          title={mode === 'login' ? 'New user? Create an account' : 'Already have an account? Log In'}
          variant="secondary"
          onPress={() => setMode(mode === 'login' ? 'register' : 'login')}
          style={styles.toggleBtn}
        />
      </SurfaceCard>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: {
    ...theme.typography.h2,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  inputLabel: {
    ...theme.typography.captionBold,
    color: theme.colors.textSecondary,
    marginBottom: 4,
    marginTop: theme.spacing.sm,
    textTransform: 'uppercase',
  },
  textInput: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    color: theme.colors.textPrimary,
    padding: theme.spacing.md,
    fontSize: 14,
  },
  submitBtn: {
    marginTop: theme.spacing.lg,
  },
  toggleBtn: {
    marginTop: theme.spacing.sm,
  },
});
