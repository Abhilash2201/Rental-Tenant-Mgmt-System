/**
 * @file app/(tabs)/reminders.jsx
 * @description Reminders & Alerts screen — all three reminder types displayed
 * in color-coded sections with dismiss and renew actions.
 */

import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import Toast from 'react-native-toast-message';

import { reminderAPI } from '../../services/api';
import Colors from '../../constants/colors';

// ── Reminder config ───────────────────────────────────────────────────────────

const TYPES = {
  agreement_renewal:  { label: '📜 Agreement Renewals',  color: Colors.danger,  bg: Colors.dangerBg  },
  rent_due:           { label: '💰 Rent Due Reminders',  color: Colors.warning, bg: Colors.warningBg },
  rent_increment:     { label: '📈 Rent Increment',      color: Colors.info,    bg: Colors.infoBg    },
};

// ── Reminder Item ─────────────────────────────────────────────────────────────

const ReminderItem = ({ item, onDismiss, onRenew }) => {
  const cfg = TYPES[item.type] || TYPES.rent_due;
  return (
    <View style={[styles.reminderItem, { borderLeftColor: cfg.color }]}>
      <View style={styles.reminderTop}>
        <View style={styles.reminderMain}>
          <Text style={styles.reminderTitle} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.reminderMeta}>
            {item.building_name && `${item.building_name} · `}Unit {item.unit_number}
          </Text>
          <Text style={styles.reminderDate}>
            🗓 Trigger: {new Date(item.trigger_date).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}
          </Text>
          {item.tenant_phone && (
            <Text style={styles.reminderPhone}>📞 {item.tenant_phone}</Text>
          )}
        </View>

        {/* Action buttons */}
        <View style={styles.reminderActions}>
          {item.type === 'agreement_renewal' && item.agreement_id && (
            <TouchableOpacity
              style={styles.renewBtn}
              onPress={() => onRenew(item)}
            >
              <Text style={styles.renewBtnText}>Renew</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.dismissBtn} onPress={() => onDismiss(item.id)}>
            <Text style={styles.dismissText}>✕</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

// ── Screen ────────────────────────────────────────────────────────────────────

export default function RemindersScreen() {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['reminders'],
    queryFn:  () => reminderAPI.getAll({ status: 'pending' }).then((r) => r.data),
  });

  const { data: notifData } = useQuery({
    queryKey: ['notifications'],
    queryFn:  () => reminderAPI.getNotifications({ limit: 10 }).then((r) => r.data),
  });

  const grouped  = data?.grouped  || {};
  const notifs   = notifData?.data || [];

  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries(['reminders']);
    await queryClient.invalidateQueries(['notifications']);
    setRefreshing(false);
  };

  const handleDismiss = async (id) => {
    try {
      await reminderAPI.dismiss(id);
      queryClient.invalidateQueries(['reminders']);
      queryClient.invalidateQueries(['unread-count']);
      Toast.show({ type: 'success', text1: 'Reminder dismissed' });
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to dismiss' });
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await reminderAPI.markAllRead();
      queryClient.invalidateQueries(['notifications']);
      queryClient.invalidateQueries(['unread-count']);
      Toast.show({ type: 'success', text1: 'All notifications marked as read' });
    } catch {
      Toast.show({ type: 'error', text1: 'Failed' });
    }
  };

  const handleRenew = (item) => {
    // Navigate to a renewal flow — for now show a toast instruction
    Toast.show({
      type: 'info',
      text1: 'Use the web dashboard to renew agreements',
      text2: 'Full renewal flow available on web',
    });
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  const totalPending = Object.values(grouped).reduce((sum, arr) => sum + (arr?.length || 0), 0);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Reminders & Alerts</Text>
        {totalPending > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{totalPending} active</Text>
          </View>
        )}
      </View>

      {totalPending === 0 && (
        <View style={styles.emptyWrap}>
          <Text style={{ fontSize: 48 }}>✅</Text>
          <Text style={styles.emptyTitle}>All clear!</Text>
          <Text style={styles.emptySubtitle}>No pending reminders right now.</Text>
        </View>
      )}

      {/* ── Render each reminder type section ── */}
      {Object.entries(TYPES).map(([type, cfg]) => {
        const items = grouped[type] || [];
        if (items.length === 0) return null;

        return (
          <View key={type} style={styles.section}>
            {/* Section header */}
            <View style={[styles.sectionHeader, { borderLeftColor: cfg.color }]}>
              <Text style={[styles.sectionTitle, { color: cfg.color }]}>{cfg.label}</Text>
              <View style={[styles.sectionBadge, { backgroundColor: cfg.bg }]}>
                <Text style={[styles.sectionBadgeText, { color: cfg.color }]}>{items.length}</Text>
              </View>
            </View>

            {items.map((item) => (
              <ReminderItem
                key={item.id}
                item={item}
                onDismiss={handleDismiss}
                onRenew={handleRenew}
              />
            ))}
          </View>
        );
      })}

      {/* ── Notifications Panel ── */}
      {notifs.length > 0 && (
        <View style={styles.notifSection}>
          <View style={styles.notifHeader}>
            <Text style={styles.notifTitle}>📬 Recent Notifications</Text>
            <TouchableOpacity onPress={handleMarkAllRead}>
              <Text style={styles.markAllRead}>Mark all read</Text>
            </TouchableOpacity>
          </View>

          {notifs.map((n) => (
            <View
              key={n.id}
              style={[styles.notifItem, !n.is_read && styles.notifUnread]}
            >
              {/* Unread dot */}
              {!n.is_read && <View style={styles.unreadDot} />}
              <View style={{ flex: 1 }}>
                <Text style={styles.notifItemTitle}>{n.title}</Text>
                <Text style={styles.notifItemMsg} numberOfLines={2}>{n.message}</Text>
                <Text style={styles.notifItemTime}>
                  {new Date(n.created_at).toLocaleString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={{ height: 80 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: Colors.bg },
  center:          { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bg },
  header:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 52 },
  title:           { fontSize: 22, fontWeight: '700', color: Colors.text },
  badge:           { backgroundColor: Colors.dangerBg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText:       { color: Colors.danger, fontSize: 12, fontWeight: '600' },

  section:         { marginBottom: 8 },
  sectionHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 16, marginBottom: 8, paddingLeft: 10, borderLeftWidth: 3 },
  sectionTitle:    { fontSize: 15, fontWeight: '600' },
  sectionBadge:    { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  sectionBadgeText:{ fontSize: 12, fontWeight: '700' },

  reminderItem:    { marginHorizontal: 16, marginBottom: 8, backgroundColor: Colors.surface, borderRadius: 12, padding: 14, borderLeftWidth: 4, borderWidth: 1, borderColor: Colors.border },
  reminderTop:     { flexDirection: 'row', gap: 10 },
  reminderMain:    { flex: 1 },
  reminderTitle:   { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 4 },
  reminderMeta:    { fontSize: 12, color: Colors.textMuted },
  reminderDate:    { fontSize: 12, color: Colors.textFaint, marginTop: 4 },
  reminderPhone:   { fontSize: 12, color: Colors.textMuted },
  reminderActions: { alignItems: 'center', gap: 8 },
  renewBtn:        { backgroundColor: Colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  renewBtnText:    { color: '#fff', fontSize: 12, fontWeight: '600' },
  dismissBtn:      { padding: 4 },
  dismissText:     { color: Colors.textFaint, fontSize: 16 },

  emptyWrap:       { alignItems: 'center', marginTop: 60, padding: 24 },
  emptyTitle:      { fontSize: 18, fontWeight: '600', color: Colors.text, marginTop: 12 },
  emptySubtitle:   { fontSize: 14, color: Colors.textMuted, textAlign: 'center', marginTop: 6 },

  notifSection:    { margin: 16, backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  notifHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderColor: Colors.border },
  notifTitle:      { fontSize: 15, fontWeight: '600', color: Colors.text },
  markAllRead:     { fontSize: 13, color: Colors.primary },
  notifItem:       { flexDirection: 'row', padding: 12, borderBottomWidth: 1, borderColor: Colors.border, gap: 10 },
  notifUnread:     { backgroundColor: Colors.surfaceAlt },
  unreadDot:       { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary, marginTop: 6, flexShrink: 0 },
  notifItemTitle:  { fontSize: 13, fontWeight: '600', color: Colors.text, marginBottom: 2 },
  notifItemMsg:    { fontSize: 12, color: Colors.textMuted },
  notifItemTime:   { fontSize: 11, color: Colors.textFaint, marginTop: 4 },
});
