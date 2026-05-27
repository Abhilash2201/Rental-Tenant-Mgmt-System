/**
 * @file app/(tabs)/index.jsx
 * @description Dashboard screen — the main landing page after login.
 * Shows summary stats, today's reminders, and pending rents.
 */

import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';

import { authAPI, reminderAPI, rentAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Colors from '../../constants/colors';

// ── Sub-components ───────────────────────────────────────────────────────────

/**
 * A single summary stat card (Buildings, Units, Tenants, etc.).
 */
const StatCard = ({ emoji, label, value, color }) => (
  <View style={[styles.statCard, { borderLeftColor: color }]}>
    <Text style={styles.statEmoji}>{emoji}</Text>
    <Text style={[styles.statValue, { color }]}>{value ?? 0}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

/**
 * Reminder type → display config mapping.
 */
const REMINDER_CONFIG = {
  rent_due:           { emoji: '💰', color: Colors.warning,  label: 'Rent Due'     },
  agreement_renewal:  { emoji: '📜', color: Colors.danger,   label: 'Agreement'    },
  rent_increment:     { emoji: '📈', color: Colors.info,     label: 'Increment'    },
};

// ── Screen ───────────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const { owner }   = useAuth();
  const router      = useRouter();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  // Owner profile + stats
  const { data: meData, isLoading: meLoading } = useQuery({
    queryKey: ['me'],
    queryFn:  () => authAPI.getMe().then((r) => r.data),
  });

  // Today's reminders
  const { data: remData, isLoading: remLoading } = useQuery({
    queryKey: ['today-reminders'],
    queryFn:  () => reminderAPI.getToday().then((r) => r.data),
  });

  // Pending rents
  const { data: rentData, isLoading: rentLoading } = useQuery({
    queryKey: ['pending-rents'],
    queryFn:  () => rentAPI.getPending().then((r) => r.data),
  });

  // Pull-to-refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries();
    setRefreshing(false);
  };

  // Dismiss a reminder
  const handleDismiss = async (reminderId) => {
    try {
      await reminderAPI.dismiss(reminderId);
      queryClient.invalidateQueries(['today-reminders']);
      queryClient.invalidateQueries(['unread-count']);
      Toast.show({ type: 'success', text1: 'Reminder dismissed' });
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to dismiss' });
    }
  };

  const stats = meData?.stats || {};
  const todayReminders = remData?.data || [];
  const pendingRents   = rentData?.data  || [];

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
    >
      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {owner?.name?.split(' ')[0]} 👋</Text>
          <Text style={styles.date}>{new Date().toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long' })}</Text>
        </View>
      </View>

      {/* ── Stats Grid ── */}
      <Text style={styles.sectionTitle}>Overview</Text>
      {meLoading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginVertical: 20 }} />
      ) : (
        <View style={styles.statsGrid}>
          <StatCard emoji="🏢" label="Buildings"   value={stats.total_buildings} color={Colors.primary} />
          <StatCard emoji="🏠" label="Total Units"  value={stats.total_units}     color={Colors.info}    />
          <StatCard emoji="✅" label="Occupied"     value={stats.occupied_units}  color={Colors.success} />
          <StatCard emoji="👤" label="Tenants"      value={stats.active_tenants}  color={Colors.warning} />
        </View>
      )}

      {/* ── Today's Reminders ── */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Today's Alerts</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/reminders')}>
          <Text style={styles.seeAll}>See all →</Text>
        </TouchableOpacity>
      </View>

      {remLoading ? (
        <ActivityIndicator color={Colors.primary} style={{ margin: 16 }} />
      ) : todayReminders.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>✅ No alerts for today!</Text>
        </View>
      ) : (
        todayReminders.slice(0, 5).map((rem) => {
          const cfg = REMINDER_CONFIG[rem.type] || REMINDER_CONFIG.rent_due;
          return (
            <View key={rem.id} style={[styles.reminderCard, { borderLeftColor: cfg.color }]}>
              <View style={styles.reminderTop}>
                <Text style={styles.reminderEmoji}>{cfg.emoji}</Text>
                <View style={styles.reminderInfo}>
                  <Text style={styles.reminderTitle}>{rem.title}</Text>
                  <Text style={styles.reminderMeta}>
                    {rem.building_name} • Unit {rem.unit_number}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.dismissBtn}
                  onPress={() => handleDismiss(rem.id)}
                >
                  <Text style={styles.dismissText}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })
      )}

      {/* ── Pending Rents ── */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Pending Rents</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/rents')}>
          <Text style={styles.seeAll}>See all →</Text>
        </TouchableOpacity>
      </View>

      {rentLoading ? (
        <ActivityIndicator color={Colors.primary} style={{ margin: 16 }} />
      ) : pendingRents.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>✅ All rents collected!</Text>
        </View>
      ) : (
        pendingRents.slice(0, 5).map((rent) => (
          <View key={rent.id} style={styles.rentCard}>
            <View>
              <Text style={styles.rentTenant}>{rent.tenant_name}</Text>
              <Text style={styles.rentMeta}>
                {rent.building_name} • Unit {rent.unit_number}
              </Text>
            </View>
            <View style={styles.rentRight}>
              <Text style={styles.rentAmount}>₹{Number(rent.amount_due).toLocaleString('en-IN')}</Text>
              <View style={[styles.badge, rent.is_overdue ? styles.badgeRed : styles.badgeYellow]}>
                <Text style={styles.badgeText}>{rent.is_overdue ? 'Overdue' : 'Pending'}</Text>
              </View>
            </View>
          </View>
        ))
      )}

      {/* Bottom spacer */}
      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: Colors.bg },
  header:         { padding: 20, paddingTop: 52, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  greeting:       { fontSize: 22, fontWeight: '700', color: Colors.text },
  date:           { fontSize: 13, color: Colors.textMuted, marginTop: 2 },

  sectionHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginTop: 8, marginBottom: 10 },
  sectionTitle:   { fontSize: 16, fontWeight: '600', color: Colors.text, paddingHorizontal: 20, marginTop: 16, marginBottom: 10 },
  seeAll:         { fontSize: 13, color: Colors.primary },

  // Stats
  statsGrid:      { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 10 },
  statCard:       { flex: 1, minWidth: '44%', backgroundColor: Colors.surface, borderRadius: 12, padding: 16, borderLeftWidth: 3, borderWidth: 1, borderColor: Colors.border },
  statEmoji:      { fontSize: 22, marginBottom: 8 },
  statValue:      { fontSize: 26, fontWeight: '700' },
  statLabel:      { fontSize: 12, color: Colors.textMuted, marginTop: 2 },

  // Reminders
  reminderCard:   { marginHorizontal: 16, marginBottom: 8, backgroundColor: Colors.surface, borderRadius: 12, padding: 14, borderLeftWidth: 4, borderWidth: 1, borderColor: Colors.border },
  reminderTop:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  reminderEmoji:  { fontSize: 20 },
  reminderInfo:   { flex: 1 },
  reminderTitle:  { fontSize: 14, fontWeight: '600', color: Colors.text },
  reminderMeta:   { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  dismissBtn:     { padding: 4 },
  dismissText:    { color: Colors.textFaint, fontSize: 14 },

  // Rents
  rentCard:       { marginHorizontal: 16, marginBottom: 8, backgroundColor: Colors.surface, borderRadius: 12, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  rentTenant:     { fontSize: 14, fontWeight: '600', color: Colors.text },
  rentMeta:       { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  rentRight:      { alignItems: 'flex-end', gap: 6 },
  rentAmount:     { fontSize: 15, fontWeight: '700', color: Colors.text },
  badge:          { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeYellow:    { backgroundColor: Colors.warningBg },
  badgeRed:       { backgroundColor: Colors.dangerBg },
  badgeText:      { fontSize: 11, fontWeight: '600', color: Colors.text },

  emptyCard:      { marginHorizontal: 16, marginBottom: 8, backgroundColor: Colors.surface, borderRadius: 12, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  emptyText:      { color: Colors.textMuted, fontSize: 14 },
});
