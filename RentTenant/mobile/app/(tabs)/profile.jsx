/**
 * @file app/(tabs)/profile.jsx
 * @description Owner profile screen — view stats, edit info, and logout.
 * Note: Add this as an extra tab or access via settings icon.
 */

import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';

import { authAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Colors from '../../constants/colors';

export default function ProfileScreen() {
  const { owner, logout, updateOwner } = useAuth();
  const queryClient = useQueryClient();
  const router      = useRouter();

  const [editMode, setEditMode] = useState(false);
  const [form, setForm]         = useState({ name: owner?.name || '', phone: owner?.phone || '' });
  const [pwForm, setPwForm]     = useState({ current_password: '', new_password: '', confirm: '' });
  const [saving, setSaving]     = useState(false);
  const [changingPw, setChangingPw] = useState(false);

  // Fetch fresh stats
  const { data, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn:  () => authAPI.getMe().then((r) => r.data),
  });

  const stats = data?.stats || {};

  /**
   * Save profile changes (name, phone).
   */
  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await authAPI.updateMe({ name: form.name.trim(), phone: form.phone.trim() });
      await updateOwner(res.data.owner);
      queryClient.invalidateQueries(['me']);
      Toast.show({ type: 'success', text1: 'Profile updated!' });
      setEditMode(false);
    } catch (err) {
      Toast.show({ type: 'error', text1: err.response?.data?.message || 'Update failed' });
    } finally {
      setSaving(false);
    }
  };

  /**
   * Change password — validates new password before sending.
   */
  const handleChangePassword = async () => {
    if (!pwForm.current_password || !pwForm.new_password) {
      Toast.show({ type: 'error', text1: 'Fill in all password fields' });
      return;
    }
    if (pwForm.new_password !== pwForm.confirm) {
      Toast.show({ type: 'error', text1: 'New passwords do not match' });
      return;
    }
    if (pwForm.new_password.length < 6) {
      Toast.show({ type: 'error', text1: 'Password must be at least 6 characters' });
      return;
    }
    setChangingPw(true);
    try {
      await authAPI.changePassword({
        current_password: pwForm.current_password,
        new_password:     pwForm.new_password,
      });
      Toast.show({ type: 'success', text1: 'Password changed! Please log in again.' });
      setPwForm({ current_password: '', new_password: '', confirm: '' });
      // Force logout after password change
      setTimeout(async () => {
        await logout();
        router.replace('/(auth)/login');
      }, 1500);
    } catch (err) {
      Toast.show({ type: 'error', text1: err.response?.data?.message || 'Failed to change password' });
    } finally {
      setChangingPw(false);
    }
  };

  /**
   * Confirm before logging out.
   */
  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* ── Profile Header ── */}
      <View style={styles.header}>
        {/* Avatar circle */}
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{owner?.name?.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.name}>{owner?.name}</Text>
        <Text style={styles.email}>{owner?.email}</Text>
        <Text style={styles.phone}>📞 {owner?.phone}</Text>
      </View>

      {/* ── Stats ── */}
      {isLoading ? (
        <ActivityIndicator color={Colors.primary} style={{ margin: 20 }} />
      ) : (
        <View style={styles.statsRow}>
          {[
            { emoji: '🏢', label: 'Buildings', val: stats.total_buildings },
            { emoji: '🏠', label: 'Units',     val: stats.total_units     },
            { emoji: '👤', label: 'Tenants',   val: stats.active_tenants  },
          ].map(({ emoji, label, val }) => (
            <View key={label} style={styles.statItem}>
              <Text style={styles.statEmoji}>{emoji}</Text>
              <Text style={styles.statVal}>{val ?? 0}</Text>
              <Text style={styles.statLabel}>{label}</Text>
            </View>
          ))}
        </View>
      )}

      {/* ── Edit Profile ── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Profile Info</Text>
          <TouchableOpacity onPress={() => (editMode ? handleSave() : setEditMode(true))} disabled={saving}>
            <Text style={styles.editBtn}>{editMode ? (saving ? 'Saving...' : 'Save') : 'Edit'}</Text>
          </TouchableOpacity>
        </View>

        {[
          { key: 'name',  label: 'Full Name',    keyboard: 'default', capitalize: 'words' },
          { key: 'phone', label: 'Phone Number', keyboard: 'phone-pad', capitalize: 'none' },
        ].map(({ key, label, keyboard, capitalize }) => (
          <View key={key} style={styles.field}>
            <Text style={styles.fieldLabel}>{label}</Text>
            <TextInput
              style={[styles.input, !editMode && styles.inputReadOnly]}
              value={form[key]}
              onChangeText={(v) => setForm({ ...form, [key]: v })}
              editable={editMode}
              keyboardType={keyboard}
              autoCapitalize={capitalize}
            />
          </View>
        ))}
      </View>

      {/* ── Change Password ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Change Password</Text>

        {[
          { key: 'current_password', label: 'Current Password', placeholder: 'Enter current password' },
          { key: 'new_password',     label: 'New Password',     placeholder: 'Min 6 characters' },
          { key: 'confirm',          label: 'Confirm New',      placeholder: 'Repeat new password' },
        ].map(({ key, label, placeholder }) => (
          <View key={key} style={styles.field}>
            <Text style={styles.fieldLabel}>{label}</Text>
            <TextInput
              style={styles.input}
              placeholder={placeholder}
              placeholderTextColor={Colors.textFaint}
              secureTextEntry
              value={pwForm[key]}
              onChangeText={(v) => setPwForm({ ...pwForm, [key]: v })}
            />
          </View>
        ))}

        <TouchableOpacity
          style={[styles.changePwBtn, changingPw && { opacity: 0.6 }]}
          onPress={handleChangePassword}
          disabled={changingPw}
        >
          <Text style={styles.changePwText}>
            {changingPw ? 'Changing...' : 'Change Password'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Logout ── */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>🚪  Logout</Text>
      </TouchableOpacity>

      <View style={{ height: 60 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: Colors.bg },

  header:         { alignItems: 'center', padding: 24, paddingTop: 52, borderBottomWidth: 1, borderColor: Colors.border },
  avatar:         { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText:     { color: '#fff', fontSize: 32, fontWeight: '700' },
  name:           { fontSize: 22, fontWeight: '700', color: Colors.text },
  email:          { fontSize: 14, color: Colors.textMuted, marginTop: 2 },
  phone:          { fontSize: 14, color: Colors.textMuted, marginTop: 2 },

  statsRow:       { flexDirection: 'row', margin: 16, backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  statItem:       { flex: 1, alignItems: 'center', padding: 16, borderRightWidth: 1, borderColor: Colors.border },
  statEmoji:      { fontSize: 20, marginBottom: 4 },
  statVal:        { fontSize: 22, fontWeight: '700', color: Colors.text },
  statLabel:      { fontSize: 11, color: Colors.textMuted, marginTop: 2 },

  section:        { margin: 16, backgroundColor: Colors.surface, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: Colors.border, marginBottom: 10 },
  sectionHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle:   { fontSize: 15, fontWeight: '600', color: Colors.text },
  editBtn:        { fontSize: 14, color: Colors.primary, fontWeight: '600' },
  field:          { marginBottom: 14 },
  fieldLabel:     { fontSize: 13, color: Colors.textMuted, marginBottom: 5 },
  input:          { backgroundColor: Colors.elevated, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, color: Colors.text, fontSize: 15 },
  inputReadOnly:  { opacity: 0.6 },

  changePwBtn:    { backgroundColor: Colors.primary, borderRadius: 10, paddingVertical: 13, alignItems: 'center', marginTop: 4 },
  changePwText:   { color: '#fff', fontWeight: '600', fontSize: 15 },

  logoutBtn:      { margin: 16, backgroundColor: Colors.dangerBg, borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: Colors.danger + '44' },
  logoutText:     { color: Colors.danger, fontWeight: '600', fontSize: 15 },
});
