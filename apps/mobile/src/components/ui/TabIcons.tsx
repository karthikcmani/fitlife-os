import React from 'react';
import { View, StyleSheet } from 'react-native';

interface TabIconProps {
  color?: any;
  focused: boolean;
}

/**
 * Pure vector, font-independent tab icons built with React Native Views.
 * Guaranteed to never fail with "NO GLYPH" or missing font characters on any device.
 */

export function HomeTabIcon({ color, focused }: TabIconProps) {
  const c = typeof color === 'string' ? color : '#34D399';
  return (
    <View style={styles.iconContainer}>
      {/* Roof peak triangle */}
      <View
        style={[
          styles.roof,
          {
            borderBottomColor: c,
            opacity: focused ? 1 : 0.7,
          },
        ]}
      />
      {/* House Body */}
      <View
        style={[
          styles.houseBody,
          {
            borderColor: c,
            backgroundColor: focused ? c : 'transparent',
            opacity: focused ? 1 : 0.7,
          },
        ]}
      >
        {/* Door cutout when focused */}
        {focused && <View style={styles.houseDoor} />}
      </View>
    </View>
  );
}

export function PlanTabIcon({ color, focused }: TabIconProps) {
  const c = typeof color === 'string' ? color : '#34D399';
  return (
    <View style={styles.iconContainer}>
      <View
        style={[
          styles.planClipboard,
          {
            borderColor: c,
            backgroundColor: focused ? `${c}20` : 'transparent',
            opacity: focused ? 1 : 0.7,
          },
        ]}
      >
        {/* Clip at top */}
        <View style={[styles.planClip, { backgroundColor: c }]} />
        {/* Checklist rows */}
        <View style={[styles.planRow, { backgroundColor: c, width: 8, marginTop: 4 }]} />
        <View style={[styles.planRow, { backgroundColor: c, width: 12 }]} />
        <View style={[styles.planRow, { backgroundColor: c, width: 10 }]} />
      </View>
    </View>
  );
}

export function ProgressTabIcon({ color, focused }: TabIconProps) {
  const c = typeof color === 'string' ? color : '#34D399';
  return (
    <View style={styles.iconContainer}>
      <View style={styles.progressBarsContainer}>
        {/* Bar 1 */}
        <View
          style={[
            styles.progressBar,
            {
              height: 7,
              backgroundColor: c,
              opacity: focused ? 1 : 0.6,
            },
          ]}
        />
        {/* Bar 2 */}
        <View
          style={[
            styles.progressBar,
            {
              height: 12,
              backgroundColor: c,
              opacity: focused ? 1 : 0.8,
            },
          ]}
        />
        {/* Bar 3 */}
        <View
          style={[
            styles.progressBar,
            {
              height: 18,
              backgroundColor: c,
              opacity: focused ? 1 : 0.9,
            },
          ]}
        />
      </View>
    </View>
  );
}

export function ProfileTabIcon({ color, focused }: TabIconProps) {
  const c = typeof color === 'string' ? color : '#34D399';
  return (
    <View style={styles.iconContainer}>
      {/* User Head */}
      <View
        style={[
          styles.profileHead,
          {
            borderColor: c,
            backgroundColor: focused ? c : 'transparent',
            opacity: focused ? 1 : 0.7,
          },
        ]}
      />
      {/* User Torso/Shoulders */}
      <View
        style={[
          styles.profileShoulders,
          {
            borderColor: c,
            backgroundColor: focused ? c : 'transparent',
            opacity: focused ? 1 : 0.7,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Home Icon Styles
  roof: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 7,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  houseBody: {
    width: 14,
    height: 11,
    borderWidth: 1.8,
    borderTopWidth: 0,
    alignItems: 'center',
    justifyContent: 'flex-end',
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
  },
  houseDoor: {
    width: 4,
    height: 6,
    backgroundColor: '#121212',
    borderTopLeftRadius: 1,
    borderTopRightRadius: 1,
  },
  // Plan Icon Styles
  planClipboard: {
    width: 16,
    height: 19,
    borderWidth: 1.8,
    borderRadius: 3,
    alignItems: 'flex-start',
    paddingLeft: 2,
    position: 'relative',
  },
  planClip: {
    position: 'absolute',
    top: -2.5,
    alignSelf: 'center',
    left: 4,
    width: 6,
    height: 3,
    borderRadius: 1.5,
  },
  planRow: {
    height: 2,
    borderRadius: 1,
    marginVertical: 1.5,
  },
  // Progress Icon Styles
  progressBarsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 3,
    width: 20,
    height: 20,
  },
  progressBar: {
    width: 4,
    borderRadius: 2,
  },
  // Profile Icon Styles
  profileHead: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.8,
    marginBottom: 2,
  },
  profileShoulders: {
    width: 16,
    height: 8,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderWidth: 1.8,
    borderBottomWidth: 0,
  },
});
