import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { Shadows } from '../constants/Theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';

const HEADER_BG = '#0F172A';
const ACCENT = '#F35D18';

const VEHICLE_TYPES: { label: string; icon: string }[] = [
  { label: 'TIR',        icon: '🚛' },
  { label: 'Kamyon',     icon: '🚚' },
  { label: 'Kamyonet',   icon: '🚐' },
  { label: 'Frigo',      icon: '❄️' },
  { label: 'Tenteli',    icon: '🏕️' },
  { label: 'Açık Kasa',  icon: '📦' },
  { label: 'Lowbed',     icon: '🔧' },
];

export default function EditVehicleScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [plateNumber, setPlateNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('TIR');

  useEffect(() => {
    fetchVehicle();
  }, []);

  const fetchVehicle = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('owner_id', session.user.id)
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setPlateNumber(data.plate_number || '');
        setVehicleType(data.vehicle_type || 'TIR');
      }
    } catch (error: any) {
      Alert.alert('Hata', error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatPlate = (text: string) => {
    let cleaned = text.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (cleaned.length <= 2) return cleaned;
    if (cleaned.length <= 5) return cleaned.slice(0, 2) + ' ' + cleaned.slice(2);
    return cleaned.slice(0, 2) + ' ' + cleaned.slice(2, 5) + ' ' + cleaned.slice(5, 9);
  };

  const validatePlate = (plate: string) => {
    const regex = /^[0-9]{2}\s[A-Z]{1,3}\s[0-9]{2,4}$/;
    return regex.test(plate);
  };

  const handleSave = async () => {
    if (!plateNumber) {
      Alert.alert('Hata', 'Lütfen plaka numarasını giriniz.');
      return;
    }
    if (!validatePlate(plateNumber)) {
      Alert.alert('Hata', 'Lütfen geçerli bir Türk plakası giriniz (Örn: 34 ABC 123).');
      return;
    }

    try {
      setSaving(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { error } = await supabase
        .from('vehicles')
        .upsert(
          { owner_id: session.user.id, plate_number: plateNumber.replace(/\s/g, ''), vehicle_type: vehicleType },
          { onConflict: 'owner_id' },
        );

      if (error) throw error;

      Alert.alert('Başarılı', 'Araç bilgileriniz kaydedildi.', [
        { text: 'Tamam', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      Alert.alert('Hata', error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={ACCENT} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Araç Bilgilerini Düzenle</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="car-outline" size={18} color={ACCENT} />
            <Text style={styles.cardTitle}>Araç Detayları</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>PLAKA NUMARASI</Text>
            <TextInput
              style={styles.input}
              value={plateNumber}
              onChangeText={(text) => setPlateNumber(formatPlate(text))}
              placeholder="34 ABC 123"
              placeholderTextColor="#94A3B8"
              autoCapitalize="characters"
              maxLength={11}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>ARAÇ TİPİ</Text>
            <View style={styles.picker}>
              {VEHICLE_TYPES.map(({ label, icon }) => (
                <TouchableOpacity
                  key={label}
                  style={[styles.pickerItem, vehicleType === label && styles.pickerItemActive]}
                  onPress={() => setVehicleType(label)}
                >
                  <Text style={styles.pickerIcon}>{icon}</Text>
                  <Text style={[styles.pickerLabel, vehicleType === label && { color: '#fff' }]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.7 }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="save-outline" size={18} color="#fff" />
                <Text style={styles.saveBtnText}>Araç Bilgilerini Kaydet</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.infoText}>
          Araç bilgilerinizi doğru girmeniz, profilinizin yük verenler tarafından daha güvenilir bulunmasını sağlar.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F1F5F9' },

  header: { backgroundColor: HEADER_BG, paddingHorizontal: 20, paddingBottom: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },

  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },

  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, ...Shadows.medium },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A' },

  inputGroup: { marginBottom: 20 },
  inputLabel: { fontSize: 11, fontWeight: '700', color: '#94A3B8', marginBottom: 8, marginLeft: 2 },
  input: { backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', padding: 14, fontSize: 14, color: '#0F172A' },

  picker: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  pickerItem: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC' },
  pickerItemActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  pickerIcon: { fontSize: 15 },
  pickerLabel: { fontSize: 13, fontWeight: '700', color: '#0F172A' },

  saveBtn: { backgroundColor: ACCENT, borderRadius: 12, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8, ...Shadows.medium },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },

  infoText: { textAlign: 'center', fontSize: 12, color: '#94A3B8', lineHeight: 18, marginTop: 20, paddingHorizontal: 20 },
});
