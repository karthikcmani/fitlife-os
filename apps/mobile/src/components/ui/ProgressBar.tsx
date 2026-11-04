import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { theme } from '../../theme';

interface ProgressBarProps {
  current: number;
  target: number;
  color?: string;
  label?: string;
  unit?: string;
  height?: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  current,
  target,
  color = theme.colors.primary,
  label,
  unit = '',
  height = 8,
}) => {
  const percentage = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;

  return (
    <View style={styles.container}>
      {label ? (
        <View style={styles.labelRow}>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.values}>
            {current} / {target} {unit} ({percentage}%)
          </Text>
        </View>
      ) : null}
      <View style={[styles.track, { height }]}>
        <View
          style={[
            styles.fill,
            {
              width: `${percentage}%`,
              backgroundColor: color,
              height,
            },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: theme.spacing.xs,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  label: {
    ...theme.typography.captionBold,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
  },
  values: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  track: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.borderRadius.full,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  fill: {
    borderRadius: theme.borderRadius.full,
  },
});
