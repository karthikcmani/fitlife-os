import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../theme';

interface MetricChipProps {
  label: string;
  value: string | number;
  unit?: string;
  accentColor?: string;
}

export const MetricChip: React.FC<MetricChipProps> = ({
  label,
  value,
  unit,
  accentColor,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.valueRow}>
        <Text style={[styles.value, accentColor ? { color: accentColor } : null]}>
          {value}
        </Text>
        {unit ? <Text style={styles.unit}>{unit}</Text> : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    alignItems: 'flex-start',
    minWidth: 90,
  },
  label: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  value: {
    ...theme.typography.h3,
    color: theme.colors.textPrimary,
  },
  unit: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginLeft: 3,
  },
});
