import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, Image, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { Shadows } from '../constants/Theme';
import CityPickerModal from '../components/CityPickerModal';
import DatePickerModal from '../components/DatePickerModal';
import { LinearGradient } from 'expo-linear-gradient';

const HEADER_BG = '#0F172A';
const ACCENT = '#F35D18';


export default function AvailabilityPostingScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const [userId, setUserId] = useState<string | null>(null);
  const [vehicleType, setVehicleType] = useState<string>('TIR');
  const [saving, setSaving] = useState(false);

  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [availDate, setAvailDate] = useState('');
  const [notes, setNotes] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [cityModalVisible, setCityModalVisible] = useState(false);
  const [cityTarget, setCityTarget] = useState<'origin' | 'destination'>('origin');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserId(session.user.id);
        supabase.from('vehicles').select('vehicle_type').eq('owner_id', session.user.id).maybeSingle()
          .then(({ data }) => { if (data?.vehicle_type) setVehicleType(data.vehicle_type); });
      }
    });
  }, []);

  const handlePost = async () => {
    if (!origin || !destination || !availDate) {
      Alert.alert('Uyarı', 'Lütfen nereden, nereye ve tarih alanlarını doldurun.');
      return;
    }
    try {
      setSaving(true);
      const { error } = await supabase.from('driver_availabilities').insert({
        driver_id: userId,
        origin,
        destination,
        available_date: availDate,
        vehicle_type: vehicleType,
        notes: notes || null,
      });
      if (error) throw error;
      Alert.alert('Başarılı', 'Boş araç ilanınız yayınlandı.', [
        { text: 'Tamam', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      Alert.alert('Hata', e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCitySelect = (city: string) => {
    if (cityTarget === 'origin') setOrigin(city);
    else setDestination(city);
    setCityModalVisible(false);
  };

  return (
    <View style={styles.root}>
      {/* ── HEADER ── */}
      <LinearGradient
        colors={['#1E3A8A', '#020617']}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Image
            source={require('../assets/images/new_logo_horizontal.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <View style={{ width: 38 }} />
        </View>
        <Text style={styles.headerSubtitle}>Boş Araç İlan Et</Text>
      </LinearGradient>

      {/* ── FORM ── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        automaticallyAdjustKeyboardInsets={true}
      >
        {/* Bilgi Banner */}
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle-outline" size={18} color="#2563EB" />
          <Text style={styles.infoText}>
            Boş araç ilanınız yük sahiplerine görünür olacak. Uygun yük olduğunda doğrudan sizi arayabilirler.
          </Text>
        </View>

        {/* Rota Kartı */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📍 Güzergah</Text>
          <Text style={styles.fieldLabel}>ÇIKIŞ ŞEHRİ</Text>
          <TouchableOpacity
            style={[styles.picker, { marginBottom: 12 }]}
            onPress={() => { setCityTarget('origin'); setCityModalVisible(true); }}
          >
            <Ionicons name="location-outline" size={16} color={origin ? ACCENT : '#94A3B8'} />
            <Text style={[styles.pickerText, !origin && styles.placeholder]}>{origin || 'Şehir Seçin'}</Text>
            <Ionicons name="chevron-down" size={14} color="#94A3B8" />
          </TouchableOpacity>

          <Text style={styles.fieldLabel}>VARIŞ ŞEHRİ</Text>
          <TouchableOpacity
            style={styles.picker}
            onPress={() => { setCityTarget('destination'); setCityModalVisible(true); }}
          >
            <Ionicons name="flag-outline" size={16} color={destination ? ACCENT : '#94A3B8'} />
            <Text style={[styles.pickerText, !destination && styles.placeholder]}>{destination || 'Şehir Seçin'}</Text>
            <Ionicons name="chevron-down" size={14} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* Tarih Kartı */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📅 Müsait Tarih</Text>

          {availDate ? (
            <View style={styles.selectedDateDisplay}>
              <View style={styles.selectedDateLeft}>
                <Ionicons name="calendar" size={22} color={ACCENT} />
                <View>
                  <Text style={styles.selectedDateLabel}>Seçilen Tarih</Text>
                  <Text style={styles.selectedDateValue}>
                    {new Date(availDate + 'T00:00:00').toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setAvailDate('')} style={styles.clearBtn}>
                <Ionicons name="close-circle" size={20} color="#94A3B8" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.noDateDisplay}>
              <Ionicons name="calendar-outline" size={22} color="#94A3B8" />
              <Text style={styles.noDateText}>Henüz tarih seçilmedi</Text>
            </View>
          )}

          <View style={styles.quickDateRow}>
            {[
              { label: 'Bugün', offset: 0 },
              { label: 'Yarın', offset: 1 },
              { label: '+2 Gün', offset: 2 },
            ].map(({ label, offset }) => {
              const d = new Date();
              d.setDate(d.getDate() + offset);
              const yyyy = d.getFullYear();
              const mm = String(d.getMonth() + 1).padStart(2, '0');
              const dd = String(d.getDate()).padStart(2, '0');
              const val = `${yyyy}-${mm}-${dd}`;
              const active = availDate === val;
              return (
                <TouchableOpacity
                  key={label}
                  style={[styles.quickDateChip, active && styles.quickDateChipActive]}
                  onPress={() => setAvailDate(val)}
                >
                  <Text style={[styles.quickDateChipText, active && { color: '#fff' }]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              style={styles.calendarOpenBtn}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar" size={14} color={ACCENT} />
              <Text style={styles.calendarOpenText}>Takvim</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Notlar Kartı */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📝 Ek Bilgiler (İsteğe Bağlı)</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Tonaj, özel şartlar, tercih edilen yük tipi vb."
            placeholderTextColor="#94A3B8"
            multiline
            numberOfLines={3}
            value={notes}
            onChangeText={setNotes}
          />
        </View>

        {/* Araç Bilgisi */}
        <View style={styles.vehicleInfoRow}>
          <Ionicons name="bus-outline" size={16} color={ACCENT} />
          <Text style={styles.vehicleInfoText}>
            Araç türü profilinizdeki kayıtlı araca göre otomatik belirlendi: <Text style={{ color: ACCENT, fontWeight: '800' }}>{vehicleType}</Text>
          </Text>
        </View>

        {/* Yayınla Butonu */}
        <TouchableOpacity style={styles.postBtn} onPress={handlePost} disabled={saving}>
          {saving
            ? <ActivityIndicator color="#fff" />
            : <>
                <Ionicons name="megaphone-outline" size={20} color="#fff" />
                <Text style={styles.postBtnText}>İLAN OLUŞTUR</Text>
              </>
          }
        </TouchableOpacity>
      </ScrollView>

      {/* Şehir Seçim Modal */}
      <CityPickerModal
        visible={cityModalVisible}
        onClose={() => setCityModalVisible(false)}
        onSelect={handleCitySelect}
      />
      <DatePickerModal
        visible={showDatePicker}
        selected={availDate}
        onClose={() => setShowDatePicker(false)}
        onSelect={setAvailDate}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F1F5F9' },

  header: { paddingHorizontal: 20, paddingBottom: 16, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', alignItems: 'center' },
  logo: { width: 120, height: 34 },
  headerSubtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '600', textAlign: 'center' },

  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 60 },

  infoBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#EFF6FF', borderRadius: 12, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: '#BFDBFE' },
  infoText: { flex: 1, fontSize: 12, fontWeight: '500', color: '#1D4ED8', lineHeight: 18 },

  card: { backgroundColor: '#fff', borderRadius: 18, padding: 18, marginBottom: 14, ...Shadows.medium },
  cardTitle: { fontSize: 14, fontWeight: '800', color: '#0F172A', marginBottom: 14 },

  fieldLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 1, color: '#94A3B8', marginBottom: 6 },
  picker: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F8FAFC', borderRadius: 12, paddingHorizontal: 12, height: 48, borderWidth: 1, borderColor: '#E2E8F0' },
  pickerText: { flex: 1, fontSize: 14, fontWeight: '600', color: '#0F172A' },
  placeholder: { color: '#94A3B8' },

  selectedDateDisplay: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: ACCENT + '12', borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: ACCENT + '30' },
  selectedDateLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  selectedDateLabel: { fontSize: 10, fontWeight: '700', color: ACCENT, letterSpacing: 0.5, textTransform: 'uppercase' },
  selectedDateValue: { fontSize: 14, fontWeight: '700', color: '#0F172A', marginTop: 2 },
  clearBtn: { padding: 4 },
  noDateDisplay: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F8FAFC', borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0', borderStyle: 'dashed' },
  noDateText: { fontSize: 14, fontWeight: '500', color: '#94A3B8' },
  quickDateRow: { flexDirection: 'row', gap: 8 },
  quickDateChip: { flex: 1, height: 40, borderRadius: 10, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center' },
  quickDateChipActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  quickDateChipText: { fontSize: 13, fontWeight: '700', color: '#64748B' },
  calendarOpenBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 40, paddingHorizontal: 12, borderRadius: 10, backgroundColor: ACCENT + '12', borderWidth: 1, borderColor: ACCENT + '30' },
  calendarOpenText: { fontSize: 12, fontWeight: '700', color: ACCENT },

  textArea: { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 14, fontSize: 14, color: '#0F172A', minHeight: 80, textAlignVertical: 'top', borderWidth: 1, borderColor: '#E2E8F0' },

  vehicleInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16, paddingHorizontal: 4 },
  vehicleInfoText: { flex: 1, fontSize: 12, fontWeight: '500', color: '#64748B', lineHeight: 18 },

  postBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 56, borderRadius: 16, backgroundColor: ACCENT, ...Shadows.medium },
  postBtnText: { color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: 0.5 },
});
