/**
 * @file app/(auth)/register.jsx
 * @description Owner registration screen.
 * On success: auto-logs in and navigates to dashboard.
 */

import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ActivityIndicator, ScrollView,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';

import { authAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Colors from '../../constants/colors';

export default function RegisterScreen() {
  const { login }  = useAuth();
  const router     = useRouter();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [loading, setLoading] = useState(false);

  /**
   * Submits registration form.
   * On success: auto-logs in and navigates to /(tabs).
   */
  const handleRegister = async () => {
    const { name, email, phone, password } = form;
    if (!name || !email || !phone || !password) {
      Toast.show({ type: 'error', text1: 'All fields are required' });
      return;
    }
    if (password.length < 6) {
      Toast.show({ type: 'error', text1: 'Password must be at least 6 characters' });
      return;
    }

    setLoading(true);
    try {
      const res = await authAPI.register({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        password,
      });

      // Auto login after register
      await login(res.data.token, res.data.owner);
      Toast.show({ type: 'success', text1: 'Account created!', text2: `Welcome, ${res.data.owner.name}` });
      router.replace('/(tabs)');
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed';
      Toast.show({ type: 'error', text1: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Logo */}
        <View style={styles.logoWrap}>
          <View style={styles.logoIcon}><Text style={styles.logoText}>🏢</Text></View>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Start managing your properties</Text>
        </View>

        {/* Form */}
        <View style={styles.card}>
          {[
            { key: 'name',     label: 'Full Name',       placeholder: 'Ramesh Kumar',           keyboard: 'default',      capitalize: 'words' },
            { key: 'email',    label: 'Email Address',   placeholder: 'owner@example.com',       keyboard: 'email-address', capitalize: 'none' },
            { key: 'phone',    label: 'Phone Number',    placeholder: '9876543210',              keyboard: 'phone-pad',     capitalize: 'none' },
            { key: 'password', label: 'Password (min 6)', placeholder: 'Create a strong password', keyboard: 'default',    capitalize: 'none', secure: true },
          ].map(({ key, label, placeholder, keyboard, capitalize, secure }) => (
            <View style={styles.field} key={key}>
              <Text style={styles.label}>{label}</Text>
              <TextInput
                style={styles.input}
                placeholder={placeholder}
                placeholderTextColor={Colors.textFaint}
                keyboardType={keyboard}
                autoCapitalize={capitalize}
                secureTextEntry={!!secure}
                value={form[key]}
                onChangeText={(v) => setForm({ ...form, [key]: v })}
              />
            </View>
          ))}

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>Create Account</Text>
            }
          </TouchableOpacity>

          <View style={styles.linkRow}>
            <Text style={styles.linkLabel}>Already have an account? </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity>
                <Text style={styles.link}>Login</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  scroll:    { flexGrow: 1, justifyContent: 'center', padding: 24 },
  logoWrap:  { alignItems: 'center', marginBottom: 28 },
  logoIcon:  { width: 64, height: 64, borderRadius: 18, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  logoText:  { fontSize: 32 },
  title:     { fontSize: 26, fontWeight: '700', color: Colors.text },
  subtitle:  { fontSize: 14, color: Colors.textMuted, marginTop: 4 },
  card:      { backgroundColor: Colors.surface, borderRadius: 16, padding: 22, borderWidth: 1, borderColor: Colors.border },
  field:     { marginBottom: 14 },
  label:     { fontSize: 13, color: Colors.textMuted, marginBottom: 5, fontWeight: '500' },
  input:     { backgroundColor: Colors.elevated, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: Colors.text, fontSize: 15 },
  btn:       { backgroundColor: Colors.primary, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  btnDisabled: { opacity: 0.6 },
  btnText:   { color: '#fff', fontSize: 16, fontWeight: '600' },
  linkRow:   { flexDirection: 'row', justifyContent: 'center', marginTop: 18 },
  linkLabel: { color: Colors.textMuted, fontSize: 14 },
  link:      { color: Colors.primary, fontSize: 14, fontWeight: '600' },
});
