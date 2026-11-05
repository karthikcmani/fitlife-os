import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { theme, useTheme } from '../../theme';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
  textStyle,
}) => {
  const { colors } = useTheme();

  const handlePress = async () => {
    if (disabled || loading) return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Haptics optional fallback
    }
    onPress();
  };

  const getContainerStyle = (): ViewStyle => {
    if (disabled) return { backgroundColor: colors.buttonDisabled };
    switch (variant) {
      case 'secondary':
        return {
          backgroundColor: colors.surfaceElevated,
          borderWidth: 1,
          borderColor: colors.border,
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          borderColor: colors.primary,
        };
      case 'danger':
        return { backgroundColor: colors.danger };
      case 'primary':
      default:
        return { backgroundColor: colors.primary };
    }
  };

  const getTextStyle = (): TextStyle => {
    if (disabled) return { color: colors.buttonDisabledText };
    switch (variant) {
      case 'secondary':
        return { color: colors.textPrimary };
      case 'outline':
        return { color: colors.primary };
      case 'danger':
        return { color: '#FFFFFF' };
      case 'primary':
      default:
        return { color: colors.textInverse };
    }
  };

  return (
    <TouchableOpacity
      style={[styles.base, getContainerStyle(), style]}
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.textInverse : colors.primary} />
      ) : (
        <Text style={[styles.baseText, getTextStyle(), textStyle]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48, // 48dp minimum touch target
  },
  baseText: {
    ...theme.typography.bodyBold,
  },
  primaryContainer: {
    backgroundColor: theme.colors.primary,
  },
  primaryText: {
    color: theme.colors.textInverse,
  },
  secondaryContainer: {
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  secondaryText: {
    color: theme.colors.textPrimary,
  },
  outlineContainer: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  outlineText: {
    color: theme.colors.primary,
  },
  dangerContainer: {
    backgroundColor: theme.colors.danger,
  },
  dangerText: {
    color: '#FFFFFF',
  },
  disabledContainer: {
    backgroundColor: theme.colors.buttonDisabled,
  },
  disabledText: {
    color: theme.colors.buttonDisabledText,
  },
});
