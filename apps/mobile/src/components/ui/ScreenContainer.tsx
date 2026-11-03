import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Platform,
  StatusBar as RNStatusBar,
  KeyboardAvoidingView,
  ViewStyle,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../theme';

interface ScreenContainerProps {
  children: React.ReactNode;
  scrollable?: boolean;
  padding?: boolean;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
}

export const ScreenContainer: React.FC<ScreenContainerProps> = ({
  children,
  scrollable = true,
  padding = true,
  style,
  contentContainerStyle,
}) => {
  const insets = useSafeAreaInsets();
  const androidStatusBar = RNStatusBar.currentHeight ?? 36;
  const topInset = Platform.OS === 'android' ? Math.max(insets.top, androidStatusBar) : insets.top;
  const bottomInset = Platform.OS === 'android' ? Math.max(insets.bottom, 16) : insets.bottom;

  return (
    <View style={[styles.root, { paddingTop: topInset }, style]}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {scrollable ? (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[
              styles.scrollContent,
              padding && styles.padding,
              { paddingBottom: bottomInset + (padding ? theme.spacing.xxxl : theme.spacing.md) },
              contentContainerStyle,
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        ) : (
          <View
            style={[
              styles.content,
              padding && styles.padding,
              { paddingBottom: bottomInset + (padding ? theme.spacing.xxxl : theme.spacing.md) },
              contentContainerStyle,
            ]}
          >
            {children}
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
  },
  padding: {
    paddingHorizontal: theme.spacing.layout,
    paddingTop: theme.spacing.sm,
  },
});
