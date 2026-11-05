import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { theme, useTheme } from '../../theme';

interface SurfaceCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  elevated?: boolean;
}

export const SurfaceCard: React.FC<SurfaceCardProps> = ({
  children,
  style,
  elevated = false,
}) => {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: elevated ? colors.surfaceElevated : colors.surface,
          borderColor: elevated ? colors.borderLight : colors.border,
        },
        elevated && styles.elevated,
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  elevated: {
    backgroundColor: theme.colors.surfaceElevated,
    borderColor: theme.colors.borderLight,
  },
});
