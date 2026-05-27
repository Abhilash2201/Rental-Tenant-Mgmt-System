/**
 * @file app/(tabs)/_layout.jsx
 * @description Bottom tab navigator for the main app screens.
 * Each tab corresponds to a key feature: Dashboard, Buildings, Tenants, Rent, Reminders.
 */

import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { reminderAPI } from '../../services/api';
import Colors from '../../constants/colors';

// ── Tab Icon Component ───────────────────────────────────────────────────────

/**
 * Renders a tab icon with optional notification badge.
 *
 * @param {{ emoji: string, focused: boolean, badgeCount?: number }} props
 */
const TabIcon = ({ emoji, focused, badgeCount = 0 }) => (
  <View style={styles.iconWrap}>
    <Text style={[styles.emoji, focused && styles.emojiFocused]}>{emoji}</Text>
    {/* Red badge for unread notifications */}
    {badgeCount > 0 && (
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{badgeCount > 9 ? '9+' : badgeCount}</Text>
      </View>
    )}
  </View>
);

// ── Tabs Layout ──────────────────────────────────────────────────────────────

export default function TabsLayout() {
  // Poll unread count for reminders tab badge
  const { data: unreadData } = useQuery({
    queryKey: ['unread-count'],
    queryFn:  () => reminderAPI.getUnreadCount().then((r) => r.data),
    refetchInterval: 60000, // Every 60 seconds
  });

  const unreadCount = unreadData?.unread_count || 0;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor:   Colors.tabActive,
        tabBarInactiveTintColor: Colors.tabInactive,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      {/* Dashboard */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ focused }) => <TabIcon emoji="📊" focused={focused} />,
        }}
      />

      {/* Buildings */}
      <Tabs.Screen
        name="buildings"
        options={{
          title: 'Buildings',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏢" focused={focused} />,
        }}
      />

      {/* Tenants */}
      <Tabs.Screen
        name="tenants"
        options={{
          title: 'Tenants',
          tabBarIcon: ({ focused }) => <TabIcon emoji="👥" focused={focused} />,
        }}
      />

      {/* Rent */}
      <Tabs.Screen
        name="rents"
        options={{
          title: 'Rent',
          tabBarIcon: ({ focused }) => <TabIcon emoji="💰" focused={focused} />,
        }}
      />

      {/* Reminders */}
      <Tabs.Screen
        name="reminders"
        options={{
          title: 'Alerts',
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🔔" focused={focused} badgeCount={unreadCount} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.tabBar,
    borderTopColor:  Colors.border,
    borderTopWidth:  1,
    paddingTop:      4,
    height:          60,
  },
  tabLabel: {
    fontSize:   11,
    fontWeight: '500',
    marginBottom: 4,
  },
  iconWrap:   { alignItems: 'center', justifyContent: 'center' },
  emoji:      { fontSize: 22, opacity: 0.5 },
  emojiFocused: { opacity: 1 },
  badge: {
    position:        'absolute',
    top:             -4,
    right:           -8,
    backgroundColor: Colors.danger,
    borderRadius:    8,
    minWidth:        16,
    height:          16,
    alignItems:      'center',
    justifyContent:  'center',
    paddingHorizontal: 3,
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
});
