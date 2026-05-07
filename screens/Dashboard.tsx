import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet,
  ActivityIndicator, Alert, ScrollView, RefreshControl, Image,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Shadows } from '../constants/Theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { registerForPushNotificationsAsync, savePushTokenToProfile } from '../lib/notifications';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

const HEADER_BG = '#1E3A8A';
const ACCENT = '#F35D18';


const getStatusConfig = (status: string) => {
  switch (status) {
    case 'OPEN': return { label: 'Teklif Alınıyor', color: '#D97706', bg: '#FEF3C7' };
    case 'ASSIGNED': return { label: 'Taşıma Devam Ediyor', color: '#2563EB', bg: '#EFF6FF' };
    case 'COMPLETED': return { label: 'Tamamlandı', color: '#6B7280', bg: '#F3F4F6' };
    case 'CANCELLED': return { label: 'İptal Edildi', color: '#DC2626', bg: '#FEE2E2' };
    default: return { label: status, color: '#6B7280', bg: '#F3F4F6' };
  }
};

export default function Dashboard() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const [role, setRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // SHIPPER states
  const [shipperOwnJobs, setShipperOwnJobs] = useState<any[]>([]);

  // DRIVER states
  const [openJobs, setOpenJobs] = useState<any[]>([]);
  const [appliedJobIds, setAppliedJobIds] = useState<string[]>([]);
  const [driverVehicle, setDriverVehicle] = useState<any>(null);
  const [searchOrigin, setSearchOrigin] = useState('');
  const [searchDestination, setSearchDestination] = useState('');
  const [filterVehicleType, setFilterVehicleType] = useState('Hepsi');
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [sortMode, setSortMode] = useState<'newest' | 'price_high' | 'date_near'>('newest');

  const vehicleTypes = [
    { label: 'TIR', icon: '🚛' },
    { label: 'Kamyon', icon: '🚚' },
    { label: 'Kamyonet', icon: '🚐' },
    { label: 'Frigo', icon: '❄️' },
    { label: 'Tenteli', icon: '🏕️' },
    { label: 'Açık Kasa', icon: '📦' },
    { label: 'Lowbed', icon: '🔧' },
  ];

  useEffect(() => {
    fetchSessionAndProfile();
  }, []);

  useEffect(() => {
    if (userId) {
      registerForPushNotificationsAsync().then(token => {
        if (token) savePushTokenToProfile(userId, token);
      });
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      if (role === 'SHIPPER') {
        fetchShipperOwnJobs();
      } else if (role === 'DRIVER') {
        fetchOpenJobs();
        fetchAppliedJobIds(userId);
      }
    }, [userId, role])
  );

  const fetchSessionAndProfile = async () => {
    try {
      setLoading(true);
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) { setLoading(false); return; }

      const user = session.user;
      setUserId(user.id);

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('role, full_name')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError || !profileData) { setLoading(false); return; }

      setRole(profileData.role);
      setUserName(profileData.full_name || '');

      if (profileData.role === 'DRIVER') {
        fetchOpenJobs();
        fetchAppliedJobIds(user.id);
        fetchDriverVehicle(user.id);
      } else {
        fetchShipperOwnJobs(user.id);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchShipperOwnJobs = async (uid?: string) => {
    const id = uid || userId;
    if (!id) return;
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*, job_requests(count)')
        .eq('shipper_id', id)
        .in('status', ['OPEN', 'ASSIGNED'])
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      setShipperOwnJobs(data || []);
    } catch (e) {
      console.error('fetchShipperOwnJobs:', e);
    }
  };

  const fetchAppliedJobIds = async (uId: string) => {
    try {
      const { data } = await supabase.from('job_requests').select('job_id').eq('driver_id', uId);
      if (data) setAppliedJobIds(data.map(r => r.job_id));
    } catch (e) {
      console.error('fetchAppliedJobIds:', e);
    }
  };

  const fetchDriverVehicle = async (dId: string) => {
    const { data } = await supabase.from('vehicles').select('vehicle_type').eq('owner_id', dId).maybeSingle();
    if (data) setDriverVehicle(data);
  };

  const fetchOpenJobs = async (isRefreshing = false) => {
    try {
      if (isRefreshing) { setRefreshing(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }
      else setLoading(true);
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('jobs')
        .select('*, profiles!jobs_shipper_id_fkey(full_name), job_requests(count)')
        .eq('status', 'OPEN')
        .gte('pickup_date', today)
        .order('created_at', { ascending: false });
      if (error) { setFetchError('İlanlar yüklenemedi. Lütfen internet bağlantınızı kontrol edin.'); }
      else {
        setFetchError(null);
        setOpenJobs(data || []);
      }
    } catch (e) {
      console.error('fetchOpenJobs:', e);
      setFetchError('İlanlar yüklenemedi. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };



  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
      return `${d.getDate()} ${months[d.getMonth()]}`;
    } catch { return dateStr; }
  };

  const filteredJobs = openJobs
    .filter(job => {
      const matchO = (job.origin || '').toLowerCase().includes(searchOrigin.toLowerCase());
      const matchD = (job.destination || '').toLowerCase().includes(searchDestination.toLowerCase());
      const matchV = filterVehicleType === 'Hepsi' || job.required_vehicle_type === filterVehicleType;
      return matchO && matchD && matchV;
    })
    .sort((a, b) => {
      if (sortMode === 'price_high') return (b.price || 0) - (a.price || 0);
      if (sortMode === 'date_near') return new Date(a.pickup_date).getTime() - new Date(b.pickup_date).getTime();
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  // ─── SHIPPER job card ───────────────────────────────────────────────────────
  const renderShipperJobCard = ({ item }: { item: any }) => {
    const status = getStatusConfig(item.status);
    const reqCount = item.job_requests?.[0]?.count ?? 0;
    return (
      <TouchableOpacity
        style={styles.jobCard}
        onPress={() => navigation.navigate('HomeTab', { screen: 'JobDetail', params: { item, role } })}
        activeOpacity={0.7}
      >
        <View style={styles.jobCardTop}>
          <View style={styles.routeRow}>
            <Text style={styles.routeCity} numberOfLines={1}>{item.origin}</Text>
            <Ionicons name="arrow-forward" size={14} color="#94A3B8" style={{ marginHorizontal: 6 }} />
            <Text style={styles.routeCity} numberOfLines={1}>{item.destination}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>
        <View style={styles.jobCardMeta}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Yük Tipi</Text>
            <Text style={styles.metaValue}>{item.required_vehicle_type || 'TIR'}</Text>
          </View>
          <View style={styles.metaDivider} />
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Teklif</Text>
            <Text style={[styles.metaValue, { color: ACCENT }]}>{reqCount}</Text>
          </View>
          <View style={styles.metaDivider} />
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Tarih</Text>
            <Text style={styles.metaValue}>{formatDate(item.pickup_date)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // ─── DRIVER open job card ────────────────────────────────────────────────────
  const renderDriverJobCard = ({ item }: { item: any }) => {
    const isApplied = appliedJobIds.includes(item.id);
    const isMatch = role === 'DRIVER' && item.required_vehicle_type && driverVehicle && item.required_vehicle_type === driverVehicle.vehicle_type;
    const color = isApplied ? '#16A34A' : '#2563EB';
    const badgeBg = isApplied ? '#DCFCE7' : '#EFF6FF';
    const badgeLabel = isApplied ? 'Başvuru Yapıldı' : 'Başvuruya Açık';
    return (
      <TouchableOpacity
        style={styles.jobCard}
        onPress={() => navigation.navigate('HomeTab', { screen: 'JobDetail', params: { item, role } })}
        activeOpacity={0.7}
      >
        <View style={styles.jobCardTop}>
          <View style={styles.routeRow}>
            <Text style={styles.routeCity} numberOfLines={1}>{item.origin}</Text>
            <Ionicons name="arrow-forward" size={14} color="#94A3B8" style={{ marginHorizontal: 6 }} />
            <Text style={styles.routeCity} numberOfLines={1}>{item.destination}</Text>
          </View>
          <View style={styles.badgeRow}>
            {isMatch && !isApplied && (
              <View style={[styles.statusBadge, { backgroundColor: '#FFF7ED', marginRight: 6 }]}>
                <Ionicons name="flash" size={10} color={ACCENT} />
                <Text style={[styles.statusText, { color: ACCENT }]}>Uygun</Text>
              </View>
            )}
            <View style={[styles.statusBadge, { backgroundColor: badgeBg }]}>
              <Text style={[styles.statusText, { color }]}>{badgeLabel}</Text>
            </View>
          </View>
        </View>
        <View style={styles.jobCardMeta}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Araç</Text>
            <Text style={styles.metaValue}>{item.required_vehicle_type || 'TIR'}</Text>
          </View>
          <View style={styles.metaDivider} />
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Fiyat</Text>
            <Text style={[styles.metaValue, { color: ACCENT }]}>
              {item.price ? `${item.price.toLocaleString('tr-TR')} ₺` : 'Teklif'}
            </Text>
          </View>
          <View style={styles.metaDivider} />
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Tarih</Text>
            <Text style={styles.metaValue}>{formatDate(item.pickup_date)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && !role) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F1F5F9' }}>
        <ActivityIndicator size="large" color={ACCENT} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* ── HEADER ─────────────────────────────────────────────────── */}
      <LinearGradient
        colors={['#1E3A8A', '#020617']}
        style={[styles.header, { paddingTop: insets.top + 8 }]}
      >
        <View style={styles.headerTop}>
          <View style={{ width: 38 }} />
          <Image
            source={require('../assets/images/new_logo_horizontal.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <View style={{ width: 38 }} />
        </View>

        <Text style={styles.greeting}>Merhaba,</Text>
        <Text style={styles.userName}>{userName || (role === 'SHIPPER' ? 'Yük Veren' : 'Şoför')} 👋</Text>

        {role === 'SHIPPER' && (
          <TouchableOpacity style={styles.ctaBtn} onPress={() => navigation.navigate('JobPosting')}>
            <Ionicons name="add-circle-outline" size={20} color="#fff" />
            <Text style={styles.ctaBtnText}>Yeni Yük İlanı Ver</Text>
          </TouchableOpacity>
        )}

        {role === 'DRIVER' && (
          <View style={styles.driverHeaderRow}>
            <TouchableOpacity style={styles.driverPillBtn} onPress={() => navigation.navigate('AvailabilityPosting')}>
              <Text style={styles.driverPillText}>🚛  Boş Araç İlan Et</Text>
            </TouchableOpacity>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{openJobs.length}</Text>
              <Text style={styles.statLabel}>Açık İlan</Text>
            </View>
            <TouchableOpacity style={styles.headerIconBtn} onPress={() => setIsSearchVisible(v => !v)}>
              <Ionicons name={isSearchVisible ? 'close' : 'search'} size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
      </LinearGradient>

      {/* ── BODY ───────────────────────────────────────────────────── */}
      {role === 'SHIPPER' ? (
        <FlatList
          data={shipperOwnJobs}
          renderItem={renderShipperJobCard}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Aktif Yüklerim</Text>
              <TouchableOpacity onPress={() => navigation.navigate('ShipperJobs')}>
                <Text style={styles.seeAll}>Tümü</Text>
              </TouchableOpacity>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="cube-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>Henüz ilan yok</Text>
              <Text style={styles.emptySubtitle}>Yukarıdaki butona basarak ilk ilanınızı oluşturun.</Text>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchShipperOwnJobs().finally(() => setRefreshing(false)); }}
              tintColor={ACCENT}
            />
          }
        />
      ) : (
        <View style={{ flex: 1 }}>
          {isSearchVisible && (
            <View style={styles.searchPanel}>
              <View style={styles.searchRow}>
                <View style={styles.searchInputWrap}>
                  <Ionicons name="location-outline" size={16} color="#94A3B8" />
                  <TextInput
                    placeholder="Nereden..."
                    placeholderTextColor="#94A3B8"
                    style={styles.searchInput}
                    value={searchOrigin}
                    onChangeText={setSearchOrigin}
                  />
                </View>
                <View style={styles.searchInputWrap}>
                  <Ionicons name="flag-outline" size={16} color="#94A3B8" />
                  <TextInput
                    placeholder="Nereye..."
                    placeholderTextColor="#94A3B8"
                    style={styles.searchInput}
                    value={searchDestination}
                    onChangeText={setSearchDestination}
                  />
                </View>
              </View>
              <View style={styles.sortRow}>
                {([['newest', 'En Yeni'], ['date_near', 'Yakın Tarih'], ['price_high', 'Yüksek Fiyat']] as const).map(([mode, label]) => (
                  <TouchableOpacity
                    key={mode}
                    onPress={() => setSortMode(mode)}
                    style={[styles.sortChip, sortMode === mode && { backgroundColor: HEADER_BG }]}
                  >
                    <Text style={[styles.sortChipText, sortMode === mode && { color: '#fff' }]}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipRow}>
                {[{ label: 'Hepsi', icon: '🔍' }, ...vehicleTypes].map(({ label, icon }) => {
                  const active = filterVehicleType === label;
                  return (
                    <TouchableOpacity
                      key={label}
                      onPress={() => setFilterVehicleType(label)}
                      style={[styles.filterChip, active && { backgroundColor: ACCENT }]}
                    >
                      <Text style={styles.filterChipIcon}>{icon}</Text>
                      <Text style={[styles.filterChipText, active && { color: '#fff' }]}>{label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color={ACCENT} />
              <Text style={styles.loadingText}>İlanlar yükleniyor...</Text>
            </View>
          ) : (
            <FlatList
              data={filteredJobs}
              renderItem={renderDriverJobCard}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              ListHeaderComponent={
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Açık İlanlar</Text>
                  <Text style={styles.sectionCount}>{filteredJobs.length} ilan</Text>
                </View>
              }
              ListEmptyComponent={
                <View style={styles.emptyWrap}>
                  <Ionicons name={fetchError ? 'wifi-outline' : 'search-outline'} size={48} color="#CBD5E1" />
                  <Text style={styles.emptyTitle}>{fetchError ? 'Bağlantı Hatası' : 'İlan Bulunamadı'}</Text>
                  <Text style={styles.emptySubtitle}>{fetchError || 'Kriterlere uygun aktif ilan şu an bulunmuyor.'}</Text>
                  <TouchableOpacity style={styles.retryBtn} onPress={() => fetchOpenJobs(true)}>
                    <Text style={styles.retryBtnText}>Tekrar Dene</Text>
                  </TouchableOpacity>
                </View>
              }
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={() => fetchOpenJobs(true)} tintColor={ACCENT} />
              }
            />
          )}
        </View>
      )}

    </View>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },

  // Header
  header: { paddingHorizontal: 20, paddingBottom: 32, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  logo: { width: 170, height: 45 },
  headerIconBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', alignItems: 'center' },
  greeting: { color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: '500', marginBottom: 2 },
  userName: { color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 18 },

  // Shipper CTA
  ctaBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: ACCENT, borderRadius: 14, height: 50, ...Shadows.medium },
  ctaBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },

  // Driver header row
  driverHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  driverPillBtn: { flex: 1, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14, alignItems: 'center' },
  driverPillText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  statBox: { alignItems: 'center', paddingHorizontal: 10 },
  statValue: { color: '#fff', fontSize: 18, fontWeight: '900' },
  statLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 9, fontWeight: '700' },

  // Section header
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 24, paddingBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  sectionCount: { fontSize: 12, fontWeight: '600', color: '#94A3B8' },
  seeAll: { fontSize: 13, fontWeight: '700', color: ACCENT },

  // List
  listContent: { paddingBottom: 100 },

  // Job card
  jobCard: { marginHorizontal: 20, marginBottom: 12, backgroundColor: '#fff', borderRadius: 16, padding: 16, ...Shadows.medium },
  jobCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  routeRow: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 },
  routeCity: { fontSize: 15, fontWeight: '800', color: '#0F172A', flexShrink: 1 },
  badgeRow: { flexDirection: 'row', alignItems: 'center' },
  statusBadge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 4 },
  statusText: { fontSize: 11, fontWeight: '700' },
  jobCardMeta: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 12 },
  metaItem: { flex: 1, alignItems: 'center' },
  metaLabel: { fontSize: 10, fontWeight: '600', color: '#94A3B8', marginBottom: 3 },
  metaValue: { fontSize: 13, fontWeight: '800', color: '#0F172A' },
  metaDivider: { width: 1, height: 28, backgroundColor: '#F1F5F9' },

  // Empty / loading
  emptyWrap: { alignItems: 'center', marginTop: 60, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: '#0F172A', marginTop: 16, marginBottom: 8 },
  emptySubtitle: { fontSize: 13, color: '#94A3B8', textAlign: 'center', lineHeight: 20 },
  retryBtn: { marginTop: 20, paddingVertical: 10, paddingHorizontal: 24, borderRadius: 20, borderWidth: 1, borderColor: ACCENT + '50' },
  retryBtnText: { fontSize: 12, fontWeight: '700', color: ACCENT },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 13, color: '#94A3B8', fontWeight: '600' },

  // Search / filter
  searchPanel: { backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', ...Shadows.sm },
  searchRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  searchInputWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 10, paddingHorizontal: 10, height: 40 },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 13, fontWeight: '600', color: '#0F172A' },
  sortRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  sortChip: { paddingVertical: 5, paddingHorizontal: 12, borderRadius: 20, backgroundColor: '#F1F5F9' },
  sortChipText: { fontSize: 11, fontWeight: '700', color: '#64748B' },
  filterChipRow: { flexDirection: 'row', gap: 8, paddingBottom: 2 },
  filterChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 5, paddingHorizontal: 12, borderRadius: 20, backgroundColor: '#F1F5F9' },
  filterChipIcon: { fontSize: 12 },
  filterChipText: { fontSize: 11, fontWeight: '700', color: '#0F172A' },

  // Modal shared
  modalContainer: { flex: 1, backgroundColor: '#F1F5F9' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 20, backgroundColor: HEADER_BG },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  modalCloseBtn: { padding: 4 },

  // Form inside modal
  formContent: { padding: 20, paddingBottom: 60 },
  formRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  inputLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8, color: '#94A3B8', marginBottom: 8 },
  cityPickerBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 14, height: 48, ...Shadows.sm },
  cityPickerText: { fontSize: 14, fontWeight: '600', color: '#0F172A' },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 14, height: 48, marginBottom: 10, ...Shadows.sm },
  textInput: { flex: 1, fontSize: 14, fontWeight: '600', color: '#0F172A' },
  textAreaInput: { backgroundColor: '#fff', borderRadius: 12, padding: 14, fontSize: 14, fontWeight: '500', color: '#0F172A', height: 100, textAlignVertical: 'top', ...Shadows.sm },
  quoteToggle: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 4 },
  quoteToggleText: { fontSize: 11, fontWeight: '700', color: '#94A3B8' },
  draftBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF3C7', borderRadius: 10, padding: 10, marginBottom: 16 },
  draftBannerText: { fontSize: 12, fontWeight: '600', color: '#92400E', flex: 1 },
  matchBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF3C7', borderRadius: 12, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: '#FDE68A' },
  matchBannerText: { flex: 1, fontSize: 12, fontWeight: '700', color: '#92400E' },
  dateStrip: { flexDirection: 'row', gap: 10, paddingBottom: 4 },
  dateCard: { width: 68, height: 85, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC' },
  dateCardDay: { fontSize: 9, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase' },
  dateCardNum: { fontSize: 20, fontWeight: '900', color: '#0F172A', marginVertical: 2 },
  dateCardMonth: { fontSize: 9, fontWeight: '700', color: '#94A3B8' },
  vehicleTypeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 8 },
  vTypeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: '#fff', ...Shadows.sm },
  vTypeBtnIcon: { fontSize: 14 },
  vTypeBtnText: { fontSize: 11, fontWeight: '700', color: '#0F172A' },
  postBtn: { height: 54, borderRadius: 14, justifyContent: 'center', alignItems: 'center', backgroundColor: ACCENT, marginTop: 20, ...Shadows.medium },
  postBtnText: { color: '#fff', fontSize: 15, fontWeight: '900', letterSpacing: 0.5 },

  // Date modal
  dateModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center' },
  dateModalCard: { margin: 20, backgroundColor: '#fff', borderRadius: 24, padding: 20, ...Shadows.large },
  dateModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  dateModalTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },

  // City modal
  citySearchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 12, paddingHorizontal: 14, height: 46 },
  citySearchInput: { flex: 1, marginLeft: 10, fontSize: 14, fontWeight: '600', color: '#0F172A' },
  recentLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 1, color: '#94A3B8', marginBottom: 10 },
  recentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  recentChip: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, backgroundColor: ACCENT + '15', borderWidth: 1, borderColor: ACCENT + '30' },
  recentChipText: { fontSize: 13, fontWeight: '700', color: ACCENT },
  cityItem: { paddingVertical: 16, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  cityItemText: { fontSize: 15, fontWeight: '600', color: '#0F172A' },
});
