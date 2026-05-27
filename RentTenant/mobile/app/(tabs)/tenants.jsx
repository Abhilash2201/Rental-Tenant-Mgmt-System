/**
 * @file app/(tabs)/tenants.jsx
 * @description Tenants list screen — shows all active/inactive tenants.
 * Owner can search, filter by status, and tap for full tenant details.
 */

import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';

import { tenantAPI } from '../../services/api';
import Colors from '../../constants/colors';

// ── Tenant Card ───────────────────────────────────────────────────────────────

const TenantCard = ({ item, onPress }) => (
  <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
    {/* Avatar circle */}
    <View style={[styles.avatar, { backgroundColor: item.is_active ? Colors.primary : Colors.border }]}>
      <Text style={styles.avatarText}>{item.name?.charAt(0).toUpperCase()}</Text>
    </View>

    <View style={styles.cardInfo}>
      <View style={styles.cardTop}>
        <Text style={styles.tenantName} numberOfLines={1}>{item.name}</Text>
        {/* Active / Inactive badge */}
        <View style={[styles.badge, item.is_active ? styles.badgeGreen : styles.badgeGray]}>
          <Text style={styles.badgeText}>{item.is_active ? 'Active' : 'Moved Out'}</Text>
        </View>
      </View>
      <Text style={styles.tenantPhone}>📞 {item.phone}</Text>
      <Text style={styles.tenantUnit} numberOfLines={1}>
        🏢 {item.building_name} · Unit {item.unit_number}, Floor {item.floor_number}
      </Text>
      <View style={styles.cardBottom}>
        <Text style={styles.rentAmount}>₹{Number(item.current_rent).toLocaleString('en-IN')}/mo</Text>
        <Text style={styles.moveInDate}>
          Since {new Date(item.move_in_date).toLocaleDateString('en-IN', { month:'short', year:'numeric' })}
        </Text>
      </View>
    </View>
  </TouchableOpacity>
);

// ── Screen ────────────────────────────────────────────────────────────────────

const TABS = [
  { label: 'All',    active: undefined },
  { label: 'Active', active: 'true'    },
  { label: 'Past',   active: 'false'   },
];

export default function TenantsScreen() {
  const router      = useRouter();
  const [tab, setTab]         = useState(0);
  const [search, setSearch]   = useState('');

  const activeFilter = TABS[tab].active;

  // Fetch tenants (filter by active status if a tab is selected)
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['tenants', activeFilter],
    queryFn:  () =>
      tenantAPI.getAll({
        active: activeFilter,
        limit:  200,
      }).then((r) => r.data.data),
  });

  // Client-side search filter on top of the API result
  const filtered = useMemo(() => {
    if (!search.trim()) return data || [];
    const q = search.toLowerCase();
    return (data || []).filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.phone.includes(q) ||
        t.building_name?.toLowerCase().includes(q)
    );
  }, [data, search]);

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.title}>Tenants</Text>
        <Text style={styles.count}>{filtered.length} total</Text>
      </View>

      {/* ── Status Tabs ── */}
      <View style={styles.tabs}>
        {TABS.map((t, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.tabItem, tab === i && styles.tabActive]}
            onPress={() => setTab(i)}
          >
            <Text style={[styles.tabText, tab === i && styles.tabTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Search ── */}
      <View style={styles.searchWrap}>
        <TextInput
          style={styles.search}
          placeholder="Search by name, phone, building..."
          placeholderTextColor={Colors.textFaint}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* ── List ── */}
      {isLoading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TenantCard
              item={item}
              onPress={() => router.push(`/tenant/${item.id}`)}
            />
          )}
          contentContainerStyle={
            filtered.length === 0
              ? { flex: 1 }
              : { padding: 16, paddingBottom: 80 }
          }
          refreshControl={
            <RefreshControl
              refreshing={isFetching}
              onRefresh={refetch}
              tintColor={Colors.primary}
            />
          }
          ListEmptyComponent={() => (
            <View style={styles.emptyWrap}>
              <Text style={{ fontSize: 48 }}>👥</Text>
              <Text style={styles.emptyTitle}>No tenants found</Text>
              <Text style={styles.emptySubtitle}>
                {tab === 0
                  ? 'Add a tenant from the web dashboard or tap a unit'
                  : 'No tenants match this filter'}
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: Colors.bg },
  header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 52 },
  title:        { fontSize: 22, fontWeight: '700', color: Colors.text },
  count:        { fontSize: 14, color: Colors.textMuted },

  // Tabs
  tabs:         { flexDirection: 'row', marginHorizontal: 16, backgroundColor: Colors.surface, borderRadius: 10, padding: 4, marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  tabItem:      { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  tabActive:    { backgroundColor: Colors.primary },
  tabText:      { fontSize: 13, color: Colors.textMuted, fontWeight: '500' },
  tabTextActive:{ color: '#fff', fontWeight: '600' },

  // Search
  searchWrap:   { paddingHorizontal: 16, marginBottom: 8 },
  search:       { backgroundColor: Colors.surface, borderRadius: 10, padding: 12, color: Colors.text, borderWidth: 1, borderColor: Colors.border, fontSize: 14 },

  // Card
  card:         { backgroundColor: Colors.surface, borderRadius: 14, marginBottom: 10, padding: 14, flexDirection: 'row', gap: 12, borderWidth: 1, borderColor: Colors.border },
  avatar:       { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText:   { color: '#fff', fontSize: 20, fontWeight: '700' },
  cardInfo:     { flex: 1 },
  cardTop:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  tenantName:   { fontSize: 15, fontWeight: '600', color: Colors.text, flex: 1, marginRight: 8 },
  tenantPhone:  { fontSize: 13, color: Colors.textMuted, marginBottom: 2 },
  tenantUnit:   { fontSize: 12, color: Colors.textMuted, marginBottom: 6 },
  cardBottom:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rentAmount:   { fontSize: 14, fontWeight: '700', color: Colors.success },
  moveInDate:   { fontSize: 12, color: Colors.textFaint },

  // Badges
  badge:        { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  badgeGreen:   { backgroundColor: Colors.successBg },
  badgeGray:    { backgroundColor: Colors.dangerBg },
  badgeText:    { fontSize: 11, fontWeight: '600', color: Colors.text },

  // Empty
  emptyWrap:    { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyTitle:   { fontSize: 18, fontWeight: '600', color: Colors.text, marginTop: 12 },
  emptySubtitle:{ fontSize: 14, color: Colors.textMuted, textAlign: 'center', marginTop: 6 },
});
