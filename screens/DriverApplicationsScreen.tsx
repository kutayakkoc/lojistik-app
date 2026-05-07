import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator, Alert,
  TouchableOpacity, ScrollView, RefreshControl,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { openPhoneCall, openWhatsApp } from '../lib/utils';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Shadows } from '../constants/Theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

const HEADER_BG = '#1E3A8A';
const ACCENT = '#F35D18';

export default function DriverApplicationsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const [applications, setApplications] = useState<any[]>([]);
  const [myAvailabilities, setMyAvailabilities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [activeFilter, setActiveFilter] = useState<'PENDING' | 'ASSIGNED' | 'COMPLETED' | 'REJECTED' | 'MY_VEHICLES'>('PENDING');

  useEffect(() => {
    fetchMyApplications();
    fetchMyAvailabilities();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchMyApplications();
      fetchMyAvailabilities();
    }, []),
  );

  const fetchMyApplications = async (isRefreshing = false) => {
    try {
      setLoading(true);
      if (isRefreshing) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data, error } = await supabase
        .from('job_requests')
        .select(`
          id, status, created_at,
          jobs!inner(
            id, required_vehicle_type, price, shipper_id,
            origin, destination, cargo_details, pickup_date,
            unloading_date, status,
            profiles!jobs_shipper_id_fkey(full_name, phone)
          )
        `)
        .eq('driver_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApplications(data || []);
    } catch (error: any) {
      console.error('fetchMyApplications:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyAvailabilities = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const { data, error } = await supabase
        .from('driver_availabilities')
        .select('id, origin, destination, available_date, vehicle_type, notes')
        .eq('driver_id', session.user.id)
        .order('available_date', { ascending: true });
      if (error) throw error;
      setMyAvailabilities(data || []);
    } catch (e) {
      console.error('fetchMyAvailabilities:', e);
    }
  };

  const handleDeleteAvailability = async (id: string) => {
    Alert.alert('İlanı Sil', 'Bu boş araç ilanını silmek istediğinizden emin misiniz?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('driver_availabilities').delete().eq('id', id);
          fetchMyAvailabilities();
        },
      },
    ]);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
      return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
    } catch { return dateStr; }
  };

  const renderAvailabilityCard = ({ item }: { item: any }) => {
    const today = new Date().toISOString().split('T')[0];
    const isExpired = item.available_date < today;
    const badgeColor = isExpired ? '#94A3B8' : '#3B82F6';

    return (
      <View style={[styles.card, isExpired && { opacity: 0.55 }]}>
        <View style={styles.cardTopRow}>
          <View style={[styles.statusBadge, { backgroundColor: badgeColor + '18', borderColor: badgeColor + '40' }]}>
            <View style={[styles.dot, { backgroundColor: badgeColor }]} />
            <Text style={[styles.statusBadgeText, { color: badgeColor }]}>{isExpired ? 'SÜRESİ DOLDU' : 'AKTİF İLAN'}</Text>
          </View>
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => handleDeleteAvailability(item.id)}
          >
            <Ionicons name="trash-outline" size={16} color="#EF4444" />
          </TouchableOpacity>
        </View>

        <View style={styles.routeBridge}>
          <View style={styles.bridgePoint}>
            <Text style={styles.bridgeLabel}>NEREDEN</Text>
            <Text style={styles.bridgeCity} numberOfLines={1}>{item.origin}</Text>
          </View>
          <View style={styles.bridgePath}>
            <View style={styles.bridgeDash} />
            <FontAwesome5 name="truck" size={12} color={isExpired ? '#94A3B8' : '#3B82F6'} style={{ marginHorizontal: 8 }} />
            <View style={styles.bridgeDash} />
          </View>
          <View style={[styles.bridgePoint, { alignItems: 'flex-end' }]}>
            <Text style={styles.bridgeLabel}>NEREYE</Text>
            <Text style={[styles.bridgeCity, { textAlign: 'right' }]} numberOfLines={1}>{item.destination}</Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>MÜSAİT TARİH</Text>
            <Text style={[styles.metaValue, isExpired && { color: '#94A3B8' }]}>{formatDate(item.available_date)}</Text>
          </View>
          <View style={[styles.metaItem, styles.metaItemBorder]}>
            <Text style={styles.metaLabel}>ARAÇ TİPİ</Text>
            <Text style={styles.metaValue}>{item.vehicle_type}</Text>
          </View>
        </View>

        {!!item.notes && (
          <Text style={styles.noteText}>Not: {item.notes}</Text>
        )}
      </View>
    );
  };

  const renderItem = ({ item }: { item: any }) => {
    const job = item.jobs;
    const shipper = job.profiles;
    const isAccepted = item.status === 'ACCEPTED';
    const isRejected = item.status === 'REJECTED';

    const statusConfig = isAccepted
      ? { color: '#22C55E', label: 'GÖREV ONAYLANDI',       bg: 'rgba(34,197,94,0.1)' }
      : isRejected
        ? { color: '#94A3B8', label: 'BAŞVURU REDDEDİLDİ', bg: 'rgba(148,163,184,0.1)' }
        : { color: '#3B82F6', label: 'UYGUNLUK BEKLENİYOR', bg: 'rgba(59,130,246,0.1)' };

    if (viewMode === 'list') {
      return (
        <TouchableOpacity
          style={[styles.listItem, isRejected && { opacity: 0.7 }]}
          onPress={() => navigation.navigate('JobDetail', { item: job, role: 'DRIVER' })}
          activeOpacity={0.7}
        >
          <View style={styles.listItemRow}>
            <View style={[styles.listAccentBar, { backgroundColor: statusConfig.color }]} />
            <View style={styles.listRouteWrap}>
              <Text style={styles.listCity} numberOfLines={1}>{job.origin.toUpperCase()}</Text>
              <View style={styles.listRoutePath}>
                <View style={styles.listPathDash} />
                <FontAwesome5 name="truck" size={10} color={statusConfig.color} style={{ marginHorizontal: 6 }} />
                <View style={styles.listPathDash} />
              </View>
              <Text style={styles.listCity} numberOfLines={1}>{job.destination.toUpperCase()}</Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color={ACCENT} style={{ marginLeft: 8 }} />
          </View>
          <View style={styles.listMetaRow}>
            <Text style={styles.listMeta}>{formatDate(job.pickup_date)}</Text>
            <View style={styles.listDivider} />
            <Text style={[styles.listMeta, { color: statusConfig.color }]}>{statusConfig.label}</Text>
          </View>
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        style={[styles.card, isRejected && { opacity: 0.6 }]}
        onPress={() => navigation.navigate('JobDetail', { item: job, role: 'DRIVER' })}
        activeOpacity={0.9}
      >
        <View style={styles.cardTopRow}>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg, borderColor: statusConfig.color + '40' }]}>
            <View style={[styles.dot, { backgroundColor: statusConfig.color }]} />
            <Text style={[styles.statusBadgeText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
          </View>
          <Text style={styles.appId}>#APP-{item.id.substring(0, 6).toUpperCase()}</Text>
        </View>

        <View style={styles.routeBridge}>
          <View style={styles.bridgePoint}>
            <Text style={styles.bridgeLabel}>NEREDEN</Text>
            <Text style={styles.bridgeCity} numberOfLines={1}>{job.origin}</Text>
          </View>
          <View style={styles.bridgePath}>
            <View style={styles.bridgeDash} />
            <FontAwesome5 name="truck" size={14} color={statusConfig.color} style={{ marginHorizontal: 8 }} />
            <View style={styles.bridgeDash} />
          </View>
          <View style={[styles.bridgePoint, { alignItems: 'flex-end' }]}>
            <Text style={styles.bridgeLabel}>NEREYE</Text>
            <Text style={[styles.bridgeCity, { textAlign: 'right' }]} numberOfLines={1}>{job.destination}</Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>YÜKLEME TARİHİ</Text>
            <Text style={styles.metaValue}>{formatDate(job.pickup_date)}</Text>
          </View>
          <View style={[styles.metaItem, styles.metaItemBorder]}>
            <Text style={styles.metaLabel}>TEKLİF (₺)</Text>
            <Text style={[styles.metaValue, { color: ACCENT }]}>{job.price ? `${job.price.toLocaleString('tr-TR')} + KDV` : 'TEKLİF'}</Text>
          </View>
          <View style={[styles.metaItem, styles.metaItemBorder]}>
            <Text style={styles.metaLabel}>ARAÇ TİPİ</Text>
            <Text style={styles.metaValue}>{(job.required_vehicle_type || 'TIR').toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, { borderColor: '#E2E8F0' }]}
            onPress={() => navigation.navigate('JobDetail', { item: job, role: 'DRIVER' })}
          >
            <Ionicons name="eye-outline" size={14} color="#0F172A" />
            <Text style={[styles.actionBtnText, { color: '#0F172A' }]}>DETAY</Text>
          </TouchableOpacity>
          {!isRejected && (
            <>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#25D366', borderColor: '#25D366' }]}
                onPress={() => openWhatsApp(shipper?.phone, `Merhaba, ${job.origin} - ${job.destination} sevkiyatı başvurum hakkında görüşmek istiyorum.`)}
              >
                <Ionicons name="logo-whatsapp" size={14} color="#fff" />
                <Text style={[styles.actionBtnText, { color: '#fff' }]}>WHATSAPP</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: ACCENT, borderColor: ACCENT }]}
                onPress={() => openPhoneCall(shipper?.phone)}
              >
                <Ionicons name="call-outline" size={14} color="#fff" />
                <Text style={[styles.actionBtnText, { color: '#fff' }]}>ARA</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const isVehicleTab = activeFilter === 'MY_VEHICLES';

  const displayedApplications = applications.filter(item => {
    const job = item.jobs;
    if (activeFilter === 'PENDING')   return item.status === 'PENDING';
    if (activeFilter === 'ASSIGNED')  return item.status === 'ACCEPTED' && job.status === 'ASSIGNED';
    if (activeFilter === 'COMPLETED') return item.status === 'ACCEPTED' && job.status === 'COMPLETED';
    if (activeFilter === 'REJECTED')  return item.status === 'REJECTED';
    return false;
  });

  const FILTER_TABS = [
    { key: 'PENDING',    label: 'BEKLİYOR',                          activeColor: '#3B82F6' },
    { key: 'ASSIGNED',   label: 'YOLDA',                              activeColor: '#D97706' },
    { key: 'COMPLETED',  label: 'TAMAMLANAN',                         activeColor: 'rgba(255,255,255,0.2)' },
    { key: 'REJECTED',   label: 'RED',                                activeColor: '#DC2626' },
    { key: 'MY_VEHICLES',label: `🚛 ARAÇLARIM (${myAvailabilities.length})`, activeColor: '#3B82F6' },
  ] as const;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <LinearGradient
        colors={['#1E3A8A', '#020617']}
        style={[styles.header, { paddingTop: insets.top + 16 }]}
      >
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Başvurularım</Text>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.toggleBtn}
              onPress={() => { Haptics.selectionAsync(); setViewMode(p => p === 'card' ? 'list' : 'card'); }}
            >
              <Ionicons name={viewMode === 'card' ? 'list-outline' : 'grid-outline'} size={18} color="#fff" />
            </TouchableOpacity>
            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>AKTİF</Text>
            </View>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {FILTER_TABS.map(({ key, label, activeColor }) => (
            <TouchableOpacity
              key={key}
              style={[styles.filterTab, activeFilter === key && { backgroundColor: activeColor }]}
              onPress={() => { Haptics.selectionAsync(); setActiveFilter(key as any); }}
            >
              <Text style={[styles.filterText, activeFilter === key && { color: '#fff' }]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </LinearGradient>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={ACCENT} />
        </View>
      ) : (
        <FlatList
          data={isVehicleTab ? myAvailabilities : displayedApplications}
          keyExtractor={(item) => item.id.toString()}
          renderItem={isVehicleTab ? renderAvailabilityCard : renderItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={() => { isVehicleTab ? fetchMyAvailabilities() : fetchMyApplications(true); }}
              tintColor={ACCENT}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name={isVehicleTab ? 'car-outline' : 'file-tray-outline'} size={36} color={ACCENT} />
              </View>
              <Text style={styles.emptyTitle}>{isVehicleTab ? 'Araç İlanı Yok' : 'Henüz Başvuru Yok'}</Text>
              <Text style={styles.emptySubtitle}>
                {isVehicleTab
                  ? 'Ana ekrandan "Boş Araç" butonuna basarak ilan oluşturabilirsiniz.'
                  : 'Yeni ilanlara göz atarak ilk başvurunuzu yapabilirsiniz.'}
              </Text>
              <TouchableOpacity
                style={styles.refreshBtn}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); isVehicleTab ? fetchMyAvailabilities() : fetchMyApplications(true); }}
              >
                <Text style={styles.refreshBtnText}>SAYFAYI YENİLE</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },

  header: { paddingHorizontal: 20, paddingBottom: 24, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '900' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  toggleBtn: { width: 34, height: 34, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  liveIndicator: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, gap: 6 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4ADE80' },
  liveText: { color: '#fff', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  filterRow: { flexDirection: 'row', gap: 8, paddingBottom: 4 },
  filterTab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.1)' },
  filterText: { fontSize: 11, fontWeight: '800', color: 'rgba(255,255,255,0.55)' },

  listContainer: { padding: 16, paddingBottom: 60 },

  card: { backgroundColor: '#fff', borderRadius: 16, padding: 18, marginBottom: 14, ...Shadows.medium },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5, paddingHorizontal: 10, borderRadius: 20, borderWidth: 1, gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  statusBadgeText: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  appId: { fontSize: 11, fontWeight: '800', color: '#94A3B8', letterSpacing: 1 },
  deleteBtn: { padding: 8, borderRadius: 8, backgroundColor: '#FEE2E2' },

  routeBridge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12, marginBottom: 14 },
  bridgePoint: { flex: 1 },
  bridgeLabel: { fontSize: 9, fontWeight: '700', color: '#94A3B8', letterSpacing: 1, marginBottom: 4 },
  bridgeCity: { fontSize: 15, fontWeight: '900', color: '#0F172A', textTransform: 'uppercase' },
  bridgePath: { flex: 0.8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  bridgeDash: { flex: 1, height: 1, borderWidth: 1, borderStyle: 'dashed', borderColor: '#E2E8F0', borderRadius: 1 },

  metaRow: { flexDirection: 'row', marginBottom: 14 },
  metaItem: { flex: 1 },
  metaItemBorder: { borderLeftWidth: 1, borderLeftColor: '#E2E8F0', paddingLeft: 12 },
  metaLabel: { fontSize: 8, fontWeight: '900', color: '#94A3B8', letterSpacing: 1.5, marginBottom: 4 },
  metaValue: { fontSize: 13, fontWeight: '800', color: '#0F172A' },

  noteText: { fontSize: 12, color: '#64748B', fontStyle: 'italic', marginTop: 4 },

  actionRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  actionBtn: { flex: 1, height: 38, borderRadius: 10, borderWidth: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  actionBtnText: { fontSize: 10, fontWeight: '900' },

  // List view
  listItem: { backgroundColor: '#fff', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14, marginBottom: 8, ...Shadows.sm },
  listItemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  listAccentBar: { width: 4, height: 20, borderRadius: 2, marginRight: 10 },
  listRouteWrap: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  listCity: { fontSize: 13, fontWeight: '900', color: '#0F172A', maxWidth: '42%' },
  listRoutePath: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: 8 },
  listPathDash: { flex: 1, height: 1, borderWidth: 1, borderStyle: 'dashed', borderColor: '#E2E8F0', borderRadius: 1 },
  listMetaRow: { flexDirection: 'row', alignItems: 'center', paddingLeft: 14 },
  listMeta: { fontSize: 11, fontWeight: '700', color: '#64748B' },
  listDivider: { width: 1, height: 10, backgroundColor: '#E2E8F0', marginHorizontal: 10 },

  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  emptyBox: { alignItems: 'center', marginTop: 80, paddingHorizontal: 40 },
  emptyIconWrap: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#FFF7F4', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 17, fontWeight: '900', color: '#0F172A', marginBottom: 8 },
  emptySubtitle: { fontSize: 13, color: '#94A3B8', textAlign: 'center', lineHeight: 19 },
  refreshBtn: { marginTop: 20, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20, borderWidth: 1, borderColor: ACCENT + '40' },
  refreshBtnText: { fontSize: 11, fontWeight: '900', color: ACCENT, letterSpacing: 1 },
});
