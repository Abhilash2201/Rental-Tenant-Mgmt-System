/**
 * @file app/(tabs)/buildings.jsx
 * @description Buildings list screen — shows all buildings with occupancy stats.
 * Owner can add a new building and tap to view details.
 */

import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, Modal, ScrollView, ActivityIndicator,
  KeyboardAvoidingView, Platform, Image, RefreshControl,
} from 'react-native';
import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import Toast from 'react-native-toast-message';

import { buildingAPI } from '../../services/api';
import Colors from '../../constants/colors';

// ── Building Card ─────────────────────────────────────────────────────────────
/**
 * Card component for a single building in the list.
 */
const BuildingCard = ({ item, onPress }) => {
  // Occupancy percentage for progress-bar style display
  const occupancyPct = item.total_units > 0
    ? Math.round((item.occupied_units / item.total_units) * 100)
    : 0;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      {/* Building photo or placeholder */}
      {item.photos?.[0] ? (
        <Image source={{ uri: item.photos[0] }} style={styles.cardPhoto} />
      ) : (
        <View style={styles.cardPhotoPlaceholder}>
          <Text style={{ fontSize: 32 }}>🏢</Text>
        </View>
      )}

      <View style={styles.cardBody}>
        <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.cardAddress} numberOfLines={1}>
          📍 {item.city}, {item.state}
        </Text>

        {/* Stats row */}
        <View style={styles.cardStats}>
          <Text style={styles.cardStat}>🏠 {item.total_units ?? 0} units</Text>
          <Text style={styles.cardStat}>✅ {item.occupied_units ?? 0} occupied</Text>
          <Text style={styles.cardStat}>🏗 {item.total_floors} floors</Text>
        </View>

        {/* Occupancy bar */}
        <View style={styles.progressBg}>
          <View style={[styles.progressFill, { width: `${occupancyPct}%` }]} />
        </View>
        <Text style={styles.occupancyText}>{occupancyPct}% occupied</Text>
      </View>
    </TouchableOpacity>
  );
};

// ── Screen ────────────────────────────────────────────────────────────────────
export default function BuildingsScreen() {
  const router      = useRouter();
  const queryClient = useQueryClient();

  const [search, setSearch]       = useState('');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [photos, setPhotos]       = useState([]); // local image URIs selected by picker
  const [form, setForm] = useState({
    name:'', address_line1:'', address_line2:'', city:'',
    state:'', pincode:'', total_floors:'1', description:'',
  });

  // Fetch all buildings
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['buildings'],
    queryFn:  () => buildingAPI.getAll({ limit: 100 }).then((r) => r.data.data),
  });

  // Client-side search filter
  const filtered = useMemo(() => {
    if (!search.trim()) return data || [];
    const q = search.toLowerCase();
    return (data || []).filter(
      (b) => b.name.toLowerCase().includes(q) || b.city.toLowerCase().includes(q)
    );
  }, [data, search]);

  /**
   * Open native image picker to select building photos.
   * Appends to existing photo list (max 5).
   */
  const pickPhotos = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      setPhotos((prev) => [...prev, ...result.assets.map((a) => a.uri)].slice(0, 5));
    }
  };

  /**
   * Submit the add-building form.
   * Sends multipart/form-data with photos to backend.
   */
  const handleCreate = async () => {
    if (!form.name || !form.address_line1 || !form.city || !form.state || !form.pincode) {
      Toast.show({ type: 'error', text1: 'Please fill in all required fields' });
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      // Append text fields
      Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v); });
      // Append photo files (React Native FormData format)
      photos.forEach((uri, i) => {
        fd.append('photos', {
          uri,
          name: `photo_${i}.jpg`,
          type: 'image/jpeg',
        });
      });

      await buildingAPI.create(fd);
      Toast.show({ type: 'success', text1: `"${form.name}" added!` });
      queryClient.invalidateQueries(['buildings']);
      queryClient.invalidateQueries(['me']);
      setShowModal(false);
      setForm({ name:'', address_line1:'', address_line2:'', city:'', state:'', pincode:'', total_floors:'1', description:'' });
      setPhotos([]);
    } catch (err) {
      Toast.show({ type: 'error', text1: err.response?.data?.message || 'Failed to add building' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.title}>My Buildings</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* ── Search Bar ── */}
      <View style={styles.searchWrap}>
        <TextInput
          style={styles.search}
          placeholder="Search by name or city..."
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
            <BuildingCard item={item} onPress={() => router.push(`/building/${item.id}`)} />
          )}
          contentContainerStyle={filtered.length === 0 ? styles.emptyContainer : { padding: 16, paddingBottom: 80 }}
          refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={Colors.primary} />}
          ListEmptyComponent={() => (
            <View style={styles.emptyWrap}>
              <Text style={{ fontSize: 48 }}>🏗</Text>
              <Text style={styles.emptyTitle}>No buildings yet</Text>
              <Text style={styles.emptySubtitle}>Tap "+ Add" to register your first property</Text>
            </View>
          )}
        />
      )}

      {/* ── Add Building Modal ── */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView
          style={{ flex: 1, backgroundColor: Colors.bg }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Building</Text>
            <TouchableOpacity onPress={handleCreate} disabled={saving}>
              <Text style={[styles.modalSave, saving && { opacity: 0.5 }]}>
                {saving ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={{ padding: 20 }} keyboardShouldPersistTaps="handled">
            {/* Photo picker */}
            <TouchableOpacity style={styles.photoPicker} onPress={pickPhotos}>
              <Text style={styles.photoPickerText}>📷  Add Photos ({photos.length}/5)</Text>
            </TouchableOpacity>
            {photos.length > 0 && (
              <ScrollView horizontal style={{ marginBottom: 12 }}>
                {photos.map((uri, i) => (
                  <Image key={i} source={{ uri }} style={styles.photoThumb} />
                ))}
              </ScrollView>
            )}

            {/* Form fields */}
            {[
              { key: 'name',          label: 'Building Name *',  placeholder: 'Sunshine Apartments' },
              { key: 'address_line1', label: 'Address Line 1 *', placeholder: '12 MG Road' },
              { key: 'address_line2', label: 'Address Line 2',   placeholder: 'Near City Mall' },
              { key: 'city',          label: 'City *',           placeholder: 'Bangalore' },
              { key: 'state',         label: 'State *',          placeholder: 'Karnataka' },
              { key: 'pincode',       label: 'Pincode *',        placeholder: '560001', keyboard: 'numeric' },
              { key: 'total_floors',  label: 'Total Floors',     placeholder: '5', keyboard: 'numeric' },
              { key: 'description',   label: 'Description',      placeholder: 'Optional notes', multi: true },
            ].map(({ key, label, placeholder, keyboard, multi }) => (
              <View key={key} style={styles.field}>
                <Text style={styles.label}>{label}</Text>
                <TextInput
                  style={[styles.input, multi && { height: 80, textAlignVertical: 'top' }]}
                  placeholder={placeholder}
                  placeholderTextColor={Colors.textFaint}
                  keyboardType={keyboard || 'default'}
                  multiline={multi}
                  value={form[key]}
                  onChangeText={(v) => setForm({ ...form, [key]: v })}
                />
              </View>
            ))}
            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: Colors.bg },
  header:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 52 },
  title:          { fontSize: 22, fontWeight: '700', color: Colors.text },
  addBtn:         { backgroundColor: Colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  addBtnText:     { color: '#fff', fontWeight: '600', fontSize: 14 },
  searchWrap:     { paddingHorizontal: 16, marginBottom: 8 },
  search:         { backgroundColor: Colors.surface, borderRadius: 10, padding: 12, color: Colors.text, borderWidth: 1, borderColor: Colors.border },

  // Card
  card:           { backgroundColor: Colors.surface, borderRadius: 14, marginBottom: 12, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
  cardPhoto:      { width: '100%', height: 140, resizeMode: 'cover' },
  cardPhotoPlaceholder: { width: '100%', height: 120, backgroundColor: Colors.elevated, alignItems: 'center', justifyContent: 'center' },
  cardBody:       { padding: 14 },
  cardName:       { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  cardAddress:    { fontSize: 13, color: Colors.textMuted, marginBottom: 8 },
  cardStats:      { flexDirection: 'row', gap: 12, marginBottom: 8 },
  cardStat:       { fontSize: 12, color: Colors.textMuted },
  progressBg:     { height: 4, backgroundColor: Colors.border, borderRadius: 2, overflow: 'hidden' },
  progressFill:   { height: 4, backgroundColor: Colors.success, borderRadius: 2 },
  occupancyText:  { fontSize: 11, color: Colors.textFaint, marginTop: 4 },

  // Empty
  emptyContainer: { flex: 1 },
  emptyWrap:      { alignItems: 'center', marginTop: 80, padding: 24 },
  emptyTitle:     { fontSize: 18, fontWeight: '600', color: Colors.text, marginTop: 12 },
  emptySubtitle:  { fontSize: 14, color: Colors.textMuted, textAlign: 'center', marginTop: 6 },

  // Modal
  modalHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 56, borderBottomWidth: 1, borderColor: Colors.border },
  modalTitle:     { fontSize: 17, fontWeight: '600', color: Colors.text },
  modalCancel:    { fontSize: 16, color: Colors.textMuted },
  modalSave:      { fontSize: 16, color: Colors.primary, fontWeight: '600' },
  photoPicker:    { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderStyle: 'dashed', borderRadius: 10, padding: 16, alignItems: 'center', marginBottom: 12 },
  photoPickerText:{ color: Colors.textMuted, fontSize: 14 },
  photoThumb:     { width: 72, height: 72, borderRadius: 8, marginRight: 8 },
  field:          { marginBottom: 16 },
  label:          { fontSize: 13, color: Colors.textMuted, marginBottom: 5, fontWeight: '500' },
  input:          { backgroundColor: Colors.elevated, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: Colors.text, fontSize: 15 },
});
