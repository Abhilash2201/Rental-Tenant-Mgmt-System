/**
 * @file app/(tabs)/rents.jsx
 * @description Rent management screen.
 * Shows all pending/overdue rents and lets the owner mark them as paid.
 */

import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, Modal, ScrollView, ActivityIndicator,
  KeyboardAvoidingView, Platform, RefreshControl,
} from 'react-native';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';

import { rentAPI } from '../../services/api';
import Colors from '../../constants/colors';

// ── Pay Modal ─────────────────────────────────────────────────────────────────

/**
 * Modal form to record a rent payment.
 * @param {{ visible, record, onClose, onSuccess }} props
 */
const PayModal = ({ visible, record, onClose, onSuccess }) => {
  const [form, setForm]   = useState({ amount_paid: '', payment_mode: 'UPI', transaction_ref: '', paid_date: '' });
  const [saving, setSaving] = useState(false);

  const handlePay = async () => {
    setSaving(true);
    try {
      await rentAPI.markPaid(record.id, {
        amount_paid:     form.amount_paid     || record.amount_due,
        payment_mode:    form.payment_mode    || 'Cash',
        transaction_ref: form.transaction_ref || undefined,
        paid_date:       form.paid_date       || new Date().toISOString().split('T')[0],
      });
      Toast.show({ type: 'success', text1: 'Rent marked as paid!' });
      onSuccess();
      onClose();
    } catch (err) {
      Toast.show({ type: 'error', text1: err.response?.data?.message || 'Failed' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="formSheet">
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: Colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={payStyles.header}>
          <TouchableOpacity onPress={onClose}><Text style={payStyles.cancel}>Cancel</Text></TouchableOpacity>
          <Text style={payStyles.title}>Mark as Paid</Text>
          <TouchableOpacity onPress={handlePay} disabled={saving}>
            <Text style={[payStyles.save, saving && { opacity: 0.5 }]}>{saving ? 'Saving...' : 'Confirm'}</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={{ padding: 20 }}>
          {record && (
            <View style={payStyles.info}>
              <Text style={payStyles.infoName}>{record.tenant_name}</Text>
              <Text style={payStyles.infoSub}>{record.building_name} · Unit {record.unit_number}</Text>
              <Text style={payStyles.infoAmount}>Due: ₹{Number(record.amount_due).toLocaleString('en-IN')}</Text>
            </View>
          )}
          {[
            { key: 'amount_paid', label: 'Amount Paid (₹)', placeholder: record?.amount_due?.toString(), keyboard: 'numeric' },
            { key: 'transaction_ref', label: 'Transaction Ref / Note', placeholder: 'UPI ID / Cheque no.' },
            { key: 'paid_date', label: 'Paid Date (YYYY-MM-DD)', placeholder: new Date().toISOString().split('T')[0] },
          ].map(({ key, label, placeholder, keyboard }) => (
            <View key={key} style={payStyles.field}>
              <Text style={payStyles.label}>{label}</Text>
              <TextInput
                style={payStyles.input}
                placeholder={placeholder}
                placeholderTextColor={Colors.textFaint}
                keyboardType={keyboard || 'default'}
                value={form[key]}
                onChangeText={(v) => setForm({ ...form, [key]: v })}
              />
            </View>
          ))}
          {/* Payment mode picker */}
          <Text style={payStyles.label}>Payment Mode</Text>
          <View style={payStyles.modeRow}>
            {['Cash','UPI','Bank Transfer','Cheque','NEFT'].map((mode) => (
              <TouchableOpacity
                key={mode}
                style={[payStyles.modeBtn, form.payment_mode === mode && payStyles.modeBtnActive]}
                onPress={() => setForm({ ...form, payment_mode: mode })}
              >
                <Text style={[payStyles.modeBtnText, form.payment_mode === mode && { color: '#fff' }]}>{mode}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ── Screen ────────────────────────────────────────────────────────────────────

export default function RentsScreen() {
  const queryClient = useQueryClient();
  const [payRecord, setPayRecord] = useState(null);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['pending-rents'],
    queryFn:  () => rentAPI.getPending().then((r) => r.data),
  });

  const rents = data?.data || [];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Rent Collection</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{rents.length} pending</Text>
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={rents}
          keyExtractor={(item) => item.id}
          contentContainerStyle={rents.length === 0 ? { flex: 1 } : { padding: 16, paddingBottom: 80 }}
          refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={Colors.primary} />}
          ListEmptyComponent={() => (
            <View style={styles.emptyWrap}>
              <Text style={{ fontSize: 48 }}>✅</Text>
              <Text style={styles.emptyTitle}>All rents collected!</Text>
              <Text style={styles.emptySubtitle}>No pending or overdue rents right now.</Text>
            </View>
          )}
          renderItem={({ item }) => {
            const isOverdue = item.is_overdue || item.status === 'overdue';
            return (
              <View style={[styles.card, isOverdue && styles.cardOverdue]}>
                {/* Status stripe */}
                <View style={[styles.stripe, { backgroundColor: isOverdue ? Colors.danger : Colors.warning }]} />

                <View style={styles.cardContent}>
                  <View style={styles.cardTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.tenantName}>{item.tenant_name}</Text>
                      <Text style={styles.unitInfo}>
                        {item.building_name} · Unit {item.unit_number}
                      </Text>
                    </View>
                    <View style={styles.rightCol}>
                      <Text style={styles.amount}>₹{Number(item.amount_due).toLocaleString('en-IN')}</Text>
                      <View style={[styles.badge, isOverdue ? styles.badgeRed : styles.badgeYellow]}>
                        <Text style={styles.badgeText}>{isOverdue ? '🔴 Overdue' : '🟡 Pending'}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.cardBottom}>
                    <Text style={styles.dueDate}>
                      Due: {new Date(item.due_date).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}
                    </Text>
                    {/* Mark Paid button */}
                    <TouchableOpacity
                      style={styles.payBtn}
                      onPress={() => setPayRecord(item)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.payBtnText}>Mark Paid</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Mark as Paid modal */}
      {payRecord && (
        <PayModal
          visible={!!payRecord}
          record={payRecord}
          onClose={() => setPayRecord(null)}
          onSuccess={() => {
            queryClient.invalidateQueries(['pending-rents']);
            queryClient.invalidateQueries(['me']);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: Colors.bg },
  header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 52 },
  title:        { fontSize: 22, fontWeight: '700', color: Colors.text },
  countBadge:   { backgroundColor: Colors.warningBg, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  countText:    { color: Colors.warning, fontSize: 13, fontWeight: '600' },

  card:         { backgroundColor: Colors.surface, borderRadius: 14, marginBottom: 10, flexDirection: 'row', overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
  cardOverdue:  { borderColor: Colors.dangerBg },
  stripe:       { width: 4 },
  cardContent:  { flex: 1, padding: 14 },
  cardTop:      { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  tenantName:   { fontSize: 15, fontWeight: '600', color: Colors.text },
  unitInfo:     { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  rightCol:     { alignItems: 'flex-end', gap: 6 },
  amount:       { fontSize: 16, fontWeight: '700', color: Colors.text },
  badge:        { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  badgeYellow:  { backgroundColor: Colors.warningBg },
  badgeRed:     { backgroundColor: Colors.dangerBg },
  badgeText:    { fontSize: 11, fontWeight: '600', color: Colors.text },
  cardBottom:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dueDate:      { fontSize: 12, color: Colors.textMuted },
  payBtn:       { backgroundColor: Colors.success, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  payBtnText:   { color: '#fff', fontSize: 13, fontWeight: '600' },

  emptyWrap:    { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyTitle:   { fontSize: 18, fontWeight: '600', color: Colors.text, marginTop: 12 },
  emptySubtitle:{ fontSize: 14, color: Colors.textMuted, textAlign: 'center', marginTop: 6 },
});

const payStyles = StyleSheet.create({
  header:    { flexDirection:'row', justifyContent:'space-between', alignItems:'center', padding:20, paddingTop:56, borderBottomWidth:1, borderColor:Colors.border },
  title:     { fontSize:17, fontWeight:'600', color:Colors.text },
  cancel:    { fontSize:16, color:Colors.textMuted },
  save:      { fontSize:16, color:Colors.primary, fontWeight:'600' },
  info:      { backgroundColor:Colors.surface, borderRadius:12, padding:14, marginBottom:20, borderWidth:1, borderColor:Colors.border },
  infoName:  { fontSize:16, fontWeight:'700', color:Colors.text },
  infoSub:   { fontSize:13, color:Colors.textMuted, marginTop:2 },
  infoAmount:{ fontSize:15, fontWeight:'600', color:Colors.warning, marginTop:6 },
  field:     { marginBottom:16 },
  label:     { fontSize:13, color:Colors.textMuted, marginBottom:5, fontWeight:'500' },
  input:     { backgroundColor:Colors.elevated, borderWidth:1, borderColor:Colors.border, borderRadius:10, paddingHorizontal:14, paddingVertical:12, color:Colors.text, fontSize:15 },
  modeRow:   { flexDirection:'row', flexWrap:'wrap', gap:8, marginTop:6 },
  modeBtn:   { paddingHorizontal:14, paddingVertical:8, borderRadius:20, borderWidth:1, borderColor:Colors.border, backgroundColor:Colors.elevated },
  modeBtnActive: { backgroundColor:Colors.primary, borderColor:Colors.primary },
  modeBtnText:   { fontSize:13, color:Colors.textMuted },
});
