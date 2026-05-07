import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, Image, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { broadcastToAllDrivers } from '../lib/notifications';
import { Shadows } from '../constants/Theme';
import CityPickerModal from '../components/CityPickerModal';
import DatePickerModal from '../components/DatePickerModal';
import { LinearGradient } from 'expo-linear-gradient';

const HEADER_BG = '#0F172A';
const ACCENT = '#F35D18';

const VEHICLE_TYPES = [
  { label: 'TIR', icon: '🚛' },
  { label: 'Kamyon', icon: '🚚' },
  { label: 'Kamyonet', icon: '🚐' },
  { label: 'Frigo', icon: '❄️' },
  { label: 'Tenteli', icon: '🏕️' },
  { label: 'Açık Kasa', icon: '📦' },
  { label: 'Lowbed', icon: '🔧' },
];

export default function JobPostingScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [cargoDetails, setCargoDetails] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [pickupDate, setPickupDate] = useState('');
  const [pickupTimeStart, setPickupTimeStart] = useState('');
  const [pickupTimeEnd, setPickupTimeEnd] = useState('');
  const [requiredVehicleType, setRequiredVehicleType] = useState('TIR');
  const [price, setPrice] = useState('');
  const [isQuote, setIsQuote] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [cityModalVisible, setCityModalVisible] = useState(false);
  const [cityTarget, setCityTarget] = useState<'origin' | 'destination'>('origin');
  const [matchingDriverCount, setMatchingDriverCount] = useState<number | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setUserId(session.user.id);
    });

    AsyncStorage.getItem('@job_draft').then(raw => {
      if (!raw) return;
      const d = JSON.parse(raw);
      if (d.origin || d.destination || d.cargoDetails) {
        setOrigin(d.origin || '');
        setDestination(d.destination || '');
        setCargoDetails(d.cargoDetails || '');
        setWeightKg(d.weightKg || '');
        setPickupDate(d.pickupDate || '');
        setPickupTimeStart(d.pickupTimeStart || '');
        setPickupTimeEnd(d.pickupTimeEnd || '');
        setRequiredVehicleType(d.requiredVehicleType || 'TIR');
        setPrice(d.price || '');
        setIsQuote(d.isQuote || false);
        setDraftLoaded(true);
      }
    });
  }, []);

  useEffect(() => {
    if (!origin) { setMatchingDriverCount(null); return; }
    const today = new Date().toISOString().split('T')[0];
    supabase
      .from('driver_availabilities')
      .select('id', { count: 'exact', head: true })
      .eq('origin', origin)
      .gte('available_date', today)
      .then(({ count }) => setMatchingDriverCount(count ?? 0));
  }, [origin]);

  useEffect(() => {
    if (!origin && !destination && !cargoDetails) return;
    const draft = { origin, destination, cargoDetails, weightKg, pickupDate, pickupTimeStart, pickupTimeEnd, requiredVehicleType, price, isQuote };
    AsyncStorage.setItem('@job_draft', JSON.stringify(draft));
  }, [origin, destination, cargoDetails, weightKg, pickupDate, pickupTimeStart, pickupTimeEnd, requiredVehicleType, price, isQuote]);

  const handlePost = async () => {
    if (!origin || !destination || !cargoDetails || !pickupDate || (!isQuote && !price)) {
      Alert.alert('Uyarı', 'Lütfen rota, detaylar, yükleme tarihi ve fiyatı (veya Teklif Usulü) doldurun.');
      return;
    }
    try {
      setLoading(true);
      const { error } = await supabase.from('jobs').insert({
        shipper_id: userId,
        origin,
        destination,
        cargo_details: cargoDetails,
        weight_kg: weightKg ? parseFloat(weightKg) : null,
        pickup_date: pickupDate,
        pickup_time_start: pickupTimeStart || null,
        pickup_time_end: pickupTimeEnd || null,
        required_vehicle_type: requiredVehicleType,
        price: isQuote ? null : (price ? parseFloat(price) : null),
        status: 'OPEN',
      });
      if (error) throw error;
      await broadcastToAllDrivers('📢 Yeni İlan!', `${origin} → ${destination} rotasında yeni bir ilan yayınlandı.`, { type: 'NEW_JOB' });
      AsyncStorage.removeItem('@job_draft');
      Alert.alert('Başarılı', 'İlanınız başarıyla yayına alındı.', [
        { text: 'Tamam', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      Alert.alert('Hata', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCitySelect = (city: string) => {
    if (cityTarget === 'origin') setOrigin(city);
    else setDestination(city);
    setCityModalVisible(false);
  };

  const formatTime = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 4);
    if (digits.length <= 2) return digits;
    return digits.slice(0, 2) + ':' + digits.slice(2);
  };

  const clearDraft = () => {
    setOrigin(''); setDestination(''); setCargoDetails(''); setWeightKg('');
    setPickupDate(''); setPickupTimeStart(''); setPickupTimeEnd('');
    setPrice(''); setIsQuote(false);
    setDraftLoaded(false);
    AsyncStorage.removeItem('@job_draft');
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
        <Text style={styles.headerSubtitle}>Yük İlanı Oluştur</Text>
      </LinearGradient>

      {/* ── FORM ── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        automaticallyAdjustKeyboardInsets={true}
      >
        {/* Taslak Uyarısı */}
        {draftLoaded && (
          <TouchableOpacity style={styles.draftBanner} onPress={clearDraft}>
            <Ionicons name="document-text-outline" size={16} color="#D97706" />
            <Text style={styles.draftText}>Taslak yüklendi — temizlemek için dokun</Text>
          </TouchableOpacity>
        )}

        {/* Eşleşen şoför banner */}
        {matchingDriverCount !== null && matchingDriverCount > 0 && (
          <TouchableOpacity
            style={styles.matchBanner}
            onPress={() => navigation.navigate('ShipperJobs', { screen: 'ShipperJobsMain', params: { initialTab: 'AVAILABLE_DRIVERS' } })}
          >
            <Ionicons name="flash" size={14} color="#D97706" />
            <Text style={styles.matchText}>{origin} çıkışlı {matchingDriverCount} müsait şoför var</Text>
            <Ionicons name="chevron-forward" size={14} color="#D97706" />
          </TouchableOpacity>
        )}

        {/* Rota Kartı */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📍 Rota</Text>
          <View style={styles.routeRow}>
            <View style={styles.routeField}>
              <Text style={styles.fieldLabel}>NEREDEN</Text>
              <TouchableOpacity
                style={styles.picker}
                onPress={() => { setCityTarget('origin'); setCityModalVisible(true); }}
              >
                <Ionicons name="location-outline" size={16} color={origin ? ACCENT : '#94A3B8'} />
                <Text style={[styles.pickerText, !origin && styles.placeholder]}>{origin || 'Şehir Seçin'}</Text>
                <Ionicons name="chevron-down" size={14} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <View style={styles.routeArrowWrap}>
              <Ionicons name="arrow-forward" size={20} color={ACCENT} />
            </View>

            <View style={styles.routeField}>
              <Text style={styles.fieldLabel}>NEREYE</Text>
              <TouchableOpacity
                style={styles.picker}
                onPress={() => { setCityTarget('destination'); setCityModalVisible(true); }}
              >
                <Ionicons name="flag-outline" size={16} color={destination ? ACCENT : '#94A3B8'} />
                <Text style={[styles.pickerText, !destination && styles.placeholder]}>{destination || 'Şehir Seçin'}</Text>
                <Ionicons name="chevron-down" size={14} color="#94A3B8" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Yük Detayları Kartı */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📦 Yük Detayları</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Örn: 20 Ton Demir, Özel taşıma gerektirmez..."
            placeholderTextColor="#94A3B8"
            multiline
            numberOfLines={3}
            value={cargoDetails}
            onChangeText={setCargoDetails}
          />
          <Text style={[styles.fieldLabel, { marginTop: 16 }]}>YÜK AĞIRLIĞI (KG) — İSTEĞE BAĞLI</Text>
          <View style={styles.inputRow}>
            <Ionicons name="barbell-outline" size={18} color={ACCENT} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.textInput}
              placeholder="Örn: 12000"
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
              value={weightKg}
              onChangeText={setWeightKg}
            />
            <Text style={styles.currency}>KG</Text>
          </View>
          <Text style={[styles.fieldLabel, { marginTop: 16 }]}>ARAÇ TİPİ</Text>
          <View style={styles.vehicleGrid}>
            {VEHICLE_TYPES.map(({ label, icon }) => (
              <TouchableOpacity
                key={label}
                style={[styles.vTypeBtn, requiredVehicleType === label && styles.vTypeBtnActive]}
                onPress={() => setRequiredVehicleType(label)}
              >
                <Text style={styles.vTypeIcon}>{icon}</Text>
                <Text style={[styles.vTypeLabel, requiredVehicleType === label && { color: '#fff' }]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Fiyat Kartı */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>💰 Fiyat</Text>
          <View style={[styles.inputRow, isQuote && styles.inputRowDisabled]}>
            <Ionicons name="cash-outline" size={18} color={isQuote ? '#CBD5E1' : ACCENT} style={{ marginRight: 8 }} />
            <TextInput
              style={[styles.textInput, isQuote && { color: '#CBD5E1' }]}
              placeholder={isQuote ? 'Teklif Usulü Seçili' : 'Örn: 15000'}
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
              editable={!isQuote}
              value={price}
              onChangeText={setPrice}
            />
            <Text style={styles.currency}>₺</Text>
          </View>
          <TouchableOpacity
            onPress={() => { setIsQuote(!isQuote); if (!isQuote) setPrice(''); }}
            style={[styles.quoteToggle, isQuote && styles.quoteToggleActive]}
          >
            <Ionicons name={isQuote ? 'checkmark-circle' : 'ellipse-outline'} size={16} color={isQuote ? ACCENT : '#94A3B8'} />
            <Text style={[styles.quoteText, isQuote && { color: ACCENT }]}>Teklif Usulü (fiyat belirtme)</Text>
          </TouchableOpacity>
        </View>

        {/* Tarih Kartı */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📅 Yükleme Tarihi</Text>

          {/* Seçili tarih göstergesi */}
          {pickupDate ? (
            <View style={styles.selectedDateDisplay}>
              <View style={styles.selectedDateLeft}>
                <Ionicons name="calendar" size={22} color={ACCENT} />
                <View>
                  <Text style={styles.selectedDateLabel}>Seçilen Tarih</Text>
                  <Text style={styles.selectedDateValue}>
                    {new Date(pickupDate + 'T00:00:00').toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setPickupDate('')} style={styles.clearBtn}>
                <Ionicons name="close-circle" size={20} color="#94A3B8" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.noDateDisplay}>
              <Ionicons name="calendar-outline" size={22} color="#94A3B8" />
              <Text style={styles.noDateText}>Henüz tarih seçilmedi</Text>
            </View>
          )}

          {/* Hızlı seçim */}
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
              const active = pickupDate === val;
              return (
                <TouchableOpacity
                  key={label}
                  style={[styles.quickDateChip, active && styles.quickDateChipActive]}
                  onPress={() => setPickupDate(val)}
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

          <Text style={[styles.fieldLabel, { marginTop: 18 }]}>YÜKLEME SAAT ARALIĞI — İSTEĞE BAĞLI</Text>
          <View style={styles.timeRow}>
            <View style={styles.timeInputWrap}>
              <Ionicons name="time-outline" size={16} color="#94A3B8" />
              <TextInput
                style={styles.timeInput}
                placeholder="08:00"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                maxLength={5}
                value={pickupTimeStart}
                onChangeText={(t) => setPickupTimeStart(formatTime(t))}
              />
            </View>
            <Text style={styles.timeSeparator}>—</Text>
            <View style={styles.timeInputWrap}>
              <Ionicons name="time-outline" size={16} color="#94A3B8" />
              <TextInput
                style={styles.timeInput}
                placeholder="18:00"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                maxLength={5}
                value={pickupTimeEnd}
                onChangeText={(t) => setPickupTimeEnd(formatTime(t))}
              />
            </View>
          </View>
        </View>



        {/* Yayınla Butonu */}
        <TouchableOpacity style={styles.postBtn} onPress={handlePost} disabled={loading}>
          {loading
            ? <ActivityIndicator color="#fff" />
            : <>
                <Ionicons name="rocket-outline" size={20} color="#fff" />
                <Text style={styles.postBtnText}>İLAN YAYINLA</Text>
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
        selected={pickupDate}
        onClose={() => setShowDatePicker(false)}
        onSelect={setPickupDate}
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

  draftBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF3C7', borderRadius: 12, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: '#FDE68A' },
  draftText: { flex: 1, fontSize: 12, fontWeight: '600', color: '#92400E' },
  matchBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF3C7', borderRadius: 12, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: '#FDE68A' },
  matchText: { flex: 1, fontSize: 12, fontWeight: '700', color: '#92400E' },

  card: { backgroundColor: '#fff', borderRadius: 18, padding: 18, marginBottom: 14, ...Shadows.medium },
  cardTitle: { fontSize: 14, fontWeight: '800', color: '#0F172A', marginBottom: 14 },

  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  routeField: { flex: 1 },
  routeArrowWrap: { width: 32, alignItems: 'center', marginTop: 20 },
  fieldLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 1, color: '#94A3B8', marginBottom: 6 },
  picker: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F8FAFC', borderRadius: 12, paddingHorizontal: 12, height: 46, borderWidth: 1, borderColor: '#E2E8F0' },
  pickerText: { flex: 1, fontSize: 14, fontWeight: '600', color: '#0F172A' },
  placeholder: { color: '#94A3B8' },

  textArea: { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 14, fontSize: 14, color: '#0F172A', minHeight: 80, textAlignVertical: 'top', borderWidth: 1, borderColor: '#E2E8F0' },
  vehicleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  vTypeBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' },
  vTypeBtnActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  vTypeIcon: { fontSize: 14 },
  vTypeLabel: { fontSize: 12, fontWeight: '700', color: '#0F172A' },

  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 12, paddingHorizontal: 14, height: 50, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 10 },
  inputRowDisabled: { opacity: 0.5 },
  textInput: { flex: 1, fontSize: 15, fontWeight: '600', color: '#0F172A' },
  currency: { fontSize: 16, fontWeight: '700', color: '#94A3B8' },
  quoteToggle: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' },
  quoteToggleActive: { backgroundColor: ACCENT + '15', borderColor: ACCENT + '40' },
  quoteText: { fontSize: 13, fontWeight: '600', color: '#94A3B8' },

  // Date picker - new design
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

  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  timeInputWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F8FAFC', borderRadius: 12, paddingHorizontal: 12, height: 46, borderWidth: 1, borderColor: '#E2E8F0' },
  timeInput: { flex: 1, fontSize: 14, fontWeight: '600', color: '#0F172A' },
  timeSeparator: { fontSize: 16, fontWeight: '700', color: '#94A3B8' },

  postBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 56, borderRadius: 16, backgroundColor: ACCENT, marginTop: 8, ...Shadows.medium },
  postBtnText: { color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: 0.5 },
});

