import React from 'react';
import { Tabs } from 'expo-router';
import { theme } from '../../src/theme';
import {
  HomeTabIcon,
  PlanTabIcon,
  ProgressTabIcon,
  ProfileTabIcon,
} from '../../src/components/ui/TabIcons';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarLabelStyle: {
          ...theme.typography.captionBold,
          fontSize: 11,
          marginTop: 2,
        },
      }}
    >
      {/* 1. Home Tab */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <HomeTabIcon color={color} focused={focused} />
          ),
        }}
      />

      {/* 2. My Plan Tab */}
      <Tabs.Screen
        name="plan"
        options={{
          title: 'My Plan',
          tabBarLabel: 'My Plan',
          tabBarIcon: ({ color, focused }) => (
            <PlanTabIcon color={color} focused={focused} />
          ),
        }}
      />

      {/* 3. Progress Tab */}
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progress',
          tabBarLabel: 'Progress',
          tabBarIcon: ({ color, focused }) => (
            <ProgressTabIcon color={color} focused={focused} />
          ),
        }}
      />

      {/* 4. Profile Tab */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <ProfileTabIcon color={color} focused={focused} />
          ),
        }}
      />

      {/* Legacy secondary screens kept for routing but hidden from tab bar */}
      <Tabs.Screen
        name="workout"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="nutrition"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="vitals"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
