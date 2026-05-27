/**
 * @file app/(auth)/login.jsx
 * @description Login screen for property owners.
 * On success: saves token to SecureStore via AuthContext.login() and
 * navigates to the main tabs (dashboard).
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

export default function LoginScreen() {
  const { login }  = useAuth();
  const router     = useRouter();
  const [form, setForm]       = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  /**
   * Handle login form submission.
   * Calls POST /api/auth/login, stores token, navigates to dashboard.
   */
  const handleLogin = async () => {
    // Basic client-side validation
    if (!form.email.trim() || !form.password) {
      Toast.show({ type: 'error', text1: 'Email and password are required' });
      return;
    }

    setLoading(true);
    try {
      const res = await authAPI.login({
        email:    form.email.trim().toLowerCase(),
        password: form.password,
      });

      // Store token + owner in SecureStore via context
      await login(res.data.token, res.data.owner);

      Toast.show({ type: 'success', text1: `Welcome back, ${res.data.owner.name}!` });
      router.replace('/(tabs)');
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed. Please try again.';
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
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Logo / Title ── */}
        <View style={styles.logoWrap}>
          <View style={styles.logoIcon}>
            <Text style={styles.logoText}>🏢</Text>
          </View>
          <Text style={styles.title}>RentManager</Text>
          <Text style={styles.subtitle}>Property Owner Login</Text>
        </View>

        {/* ── Form Card ── */}
        <View style={styles.card}>
          {/* Email */}
          <View style={styles.field}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={styles.input}
              placeholder="owner@example.com"
              placeholderTextColor={Colors.textFaint}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              value={form.email}
              onChangeText={(v) => setForm({ ...form, email: v })}
            />
          </View>

          {/* Password */}
          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, styles.inputFlex]}
                placeholder="Enter your password"
                placeholderTextColor={Colors.textFaint}
                secureTextEntry={!showPass}
                value={form.password}
                onChangeText={(v) => setForm({ ...form, password: v })}
              />
              {/* Show/hide password toggle */}
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowPass(!showPass)}
              >
                <Text style={styles.eyeText}>{showPass ? '🙈' : '👁'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>Login</Text>
            }
          </TouchableOpacity>

          {/* Register link */}
          <View style={styles.linkRow}>
            <Text style={styles.linkLabel}>Don't have an account? </Text>
            <Link href="/(auth)/register" asChild>
              <TouchableOpacity>
                <Text style={styles.link}>Register</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: Colors.bg },
  scroll:     { flexGrow: 1, justifyContent: 'center', padding: 24 },

  /* Logo */
  logoWrap:   { alignItems: 'center', marginBottom: 32 },
  logoIcon:   { width: 72, height: 72, borderRadius: 20, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  logoText:   { fontSize: 36 },
  title:      { fontSize: 28, fontWeight: '700', color: Colors.text, letterSpacing: 0.5 },
  subtitle:   { fontSize: 14, color: Colors.textMuted, marginTop: 4 },

  /* Card */
  card:       { backgroundColor: Colors.surface, borderRadius: 16, padding: 24, borderWidth: 1, borderColor: Colors.border },

  /* Fields */
  field:      { marginBottom: 16 },
  label:      { fontSize: 13, color: Colors.textMuted, marginBottom: 6, fontWeight: '500' },
  input:      { backgroundColor: Colors.elevated, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: Colors.text, fontSize: 15 },
  inputRow:   { flexDirection: 'row', alignItems: 'center' },
  inputFlex:  { flex: 1, borderTopRightRadius: 0, borderBottomRightRadius: 0 },
  eyeBtn:     { backgroundColor: Colors.elevated, borderWidth: 1, borderLeftWidth: 0, borderColor: Colors.border, borderTopRightRadius: 10, borderBottomRightRadius: 10, paddingHorizontal: 14, paddingVertical: 13 },
  eyeText:    { fontSize: 16 },

  /* Button */
  btn:        { backgroundColor: Colors.primary, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  btnDisabled:{ opacity: 0.6 },
  btnText:    { color: '#fff', fontSize: 16, fontWeight: '600' },

  /* Link */
  linkRow:    { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  linkLabel:  { color: Colors.textMuted, fontSize: 14 },
  link:       { color: Colors.primary, fontSize: 14, fontWeight: '600' },
});
