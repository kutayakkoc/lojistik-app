import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, Alert, ScrollView,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import { openPhoneCall, openWhatsApp } from '../lib/utils';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { Shadows } from '../constants/Theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';

const HEADER_BG = '#1E3A8A';
const ACCENT = '#F35D18';

const formatTurkishDate = (dateStr: string) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
};

export default function ShipperJobsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const [myJobs, setMyJobs] = useState<any[]>([]);
  const [availableDrivers, setAvailableDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'OPEN' | 'ASSIGNED' | 'COMPLETED' | 'CANCELLED' | 'AVAILABLE_DRIVERS'>('OPEN');
  const [userId, setUserId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');

  useEffect(() => {
    fetchSession();
  }, []);

  useEffect(() => {
    if (route.params?.initialTab) {
      setActiveFilter(route.params.initialTab);
    }
  }, [route.params?.initialTab]);

  useFocusEffect(
    React.useCallback(() => {
      if (userId) fetchMyJobs(userId);
    }, [userId, activeFilter]),
  );

  const fetchSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setUserId(session.user.id);
      fetchMyJobs(session.user.id);
      fetchAvailableDrivers();
    }
  };

  const fetchAvailableDrivers = async () => {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('driver_availabilities')
      .select('id, origin, destination, available_date, vehicle_type, notes, profiles!driver_availabilities_driver_id_fkey(full_name, phone)')
      .gte('available_date', today)
      .order('available_date', { ascending: true });
    setAvailableDrivers(data || []);
  };

  const fetchMyJobs = async (uid: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('jobs')
      .select('*, job_requests(count)')
      .eq('shipper_id', uid)
      .order('created_at', { ascending: false });
    if (!error) setMyJobs(data || []);
    setLoading(false);
  };

  const handleRepost = (item: any) => {
    Alert.alert(
      'Tekrar Yayınla',
      `${item.origin} → ${item.destination} güzergahında yeni ilan oluşturulsun mu?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Evet, Yayınla',
          onPress: async () => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const { error } = await supabase.from('jobs').insert({
              shipper_id: userId,
              origin: item.origin,
              destination: item.destination,
              cargo_details: item.cargo_details,
              required_vehicle_type: item.required_vehicle_type,
              price: item.price,
              pickup_date: tomorrow.toISOString().split('T')[0],
              status: 'OPEN',
            });
            if (error) Alert.alert('Hata', error.message);
            else { Alert.alert('Başarılı', 'İlan yeniden yayınlandı.'); if (userId) fetchMyJobs(userId); }
          },
        },
      ],
    );
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'OPEN':      return { label: 'AKTİF', color: '#16A34A', bg: '#F0FDF4' };
      case 'ASSIGNED':  return { label: 'YOLDA',  color: '#D97706', bg: '#FFFBEB' };
      case 'COMPLETED': return { label: 'BİTTİ',  color: '#64748B', bg: '#F8FAFC' };
      case 'CANCELLED': return { label: 'İPTAL',  color: '#DC2626', bg: '#FEF2F2' };
      default:          return { label: status,   color: '#94A3B8', bg: '#F1F5F9' };
    }
  };

  const renderAvailableDriverCard = ({ item }: { item: any }) => {
    const driver = item.profiles;
    const isExpiringSoon = new Date(item.available_date).getTime() - Date.now() < 2 * 24 * 60 * 60 * 1000;
    return (
      <View style={styles.card}>
        <View style={styles.driverCardTop}>
          <View style={styles.driverAvatarWrap}>
            <View style={styles.driverAvatar}>
              <Text style={styles.driverAvatarText}>{driver?.full_name?.charAt(0).toUpperCase() || '?'}</Text>
            </View>
            <View>
              <Text style={styles.driverName}>{driver?.full_name || 'Şoför'}</Text>
              <Text style={styles.driverVehicle}>{item.vehicle_type}</Text>
            </View>
          </View>
          {isExpiringSoon && (
            <View style={styles.urgentBadge}>
              <Text style={styles.urgentText}>YAKINDA</Text>
            </View>
          )}
        </View>

        <View style={styles.routeRow}>
          <Text style={styles.routeCity} numberOfLines={1}>{item.origin.toUpperCase()}</Text>
          <View style={styles.routeArrow}>
            <View style={styles.arrowLine} />
            <Ionicons name="chevron-forward" size={12} color={ACCENT} />
          </View>
          <Text style={[styles.routeCity, { textAlign: 'right' }]} numberOfLines={1}>{item.destination.toUpperCase()}</Text>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>MÜSAİT TARİH</Text>
            <Text style={styles.metaValue}>{formatTurkishDate(item.available_date)}</Text>
          </View>
          {!!item.notes && (
            <View style={[styles.metaItem, styles.metaItemBorder]}>
              <Text style={styles.metaLabel}>NOT</Text>
              <Text style={[styles.metaValue, { fontSize: 12 }]} numberOfLines={2}>{item.notes}</Text>
            </View>
          )}
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#25D366' }]}
            onPress={() => openWhatsApp(driver?.phone || '', `Merhaba ${driver?.full_name}, boş araç ilanınızı gördüm. ${item.origin} - ${item.destination} güzergahında yük teklifim var, görüşebilir miyiz?`)}
          >
            <Ionicons name="logo-whatsapp" size={14} color="#fff" />
            <Text style={styles.actionBtnText}>WHATSAPP</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: ACCENT }]}
            onPress={() => openPhoneCall(driver?.phone || '')}
          >
            <Ionicons name="call-outline" size={14} color="#fff" />
            <Text style={styles.actionBtnText}>ARA</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderJobItem = ({ item }: { item: any }) => {
    const cfg = getStatusConfig(item.status);
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('JobDetail', { item, role: 'SHIPPER' })}
        activeOpacity={0.8}
      >
        <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
          <View style={[styles.statusDot, { backgroundColor: cfg.color }]} />
          <Text style={[styles.statusLabel, { color: cfg.color }]}>{cfg.label}</Text>
        </View>

        <View style={styles.routeRow}>
          <Text style={styles.routeCity} numberOfLines={1}>{item.origin.toUpperCase()}</Text>
          <View style={styles.routeArrow}>
            <View style={styles.arrowLine} />
            <Ionicons name="chevron-forward" size={12} color={ACCENT} />
          </View>
          <Text style={[styles.routeCity, { textAlign: 'right' }]} numberOfLines={1}>{item.destination.toUpperCase()}</Text>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>YÜKLEME TARİHİ</Text>
            <Text style={styles.metaValue}>{formatTurkishDate(item.pickup_date)}</Text>
          </View>
          <View style={[styles.metaItem, styles.metaItemBorder]}>
            <Text style={styles.metaLabel}>TEKLİF (₺)</Text>
            <Text style={[styles.metaValue, { color: ACCENT }]}>
              {item.price ? `${item.price.toLocaleString('tr-TR')} ₺ + KDV` : '-'}
            </Text>
          </View>
          <View style={[styles.metaItem, styles.metaItemBorder]}>
            <Text style={styles.metaLabel}>ARAÇ TİPİ</Text>
            <Text style={styles.metaValue}>{(item.required_vehicle_type || 'TIR').toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.actionRow}>
          {(item.status === 'COMPLETED' || item.status === 'CANCELLED') && (
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#FFF7F4', flex: 1 }]} onPress={() => handleRepost(item)}>
              <Ionicons name="refresh-outline" size={14} color={ACCENT} />
              <Text style={[styles.actionBtnText, { color: ACCENT }]}>TEKRAR YAYINLA</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#F1F5F9', flex: 1 }]}
            onPress={() => navigation.navigate('JobDetail', { item, role: 'SHIPPER' })}
          >
            <Text style={[styles.actionBtnText, { color: item.status === 'COMPLETED' ? '#64748B' : ACCENT }]}>DETAYLAR</Text>
            <Ionicons name="chevron-forward" size={14} color={item.status === 'COMPLETED' ? '#64748B' : ACCENT} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderJobListItem = ({ item }: { item: any }) => {
    const cfg = getStatusConfig(item.status);
    return (
      <TouchableOpacity
        style={[styles.listItem, item.status === 'COMPLETED' && { opacity: 0.8 }]}
        onPress={() => navigation.navigate('JobDetail', { item, role: 'SHIPPER' })}
        activeOpacity={0.7}
      >
        <View style={styles.listItemRow}>
          <View style={[styles.listAccentBar, { backgroundColor: cfg.color }]} />
          <View style={styles.listRouteWrap}>
            <Text style={styles.listCity} numberOfLines={1}>{item.origin.toUpperCase()}</Text>
            <View style={styles.listRoutePath}>
              <View style={styles.listPathDash} />
              <FontAwesome5 name="truck" size={8} color="#94A3B8" style={{ marginHorizontal: 4 }} />
              <View style={styles.listPathDash} />
            </View>
            <Text style={styles.listCity} numberOfLines={1}>{item.destination.toUpperCase()}</Text>
          </View>
          <Ionicons name="chevron-forward" size={14} color={item.status === 'COMPLETED' ? '#94A3B8' : ACCENT} style={{ marginLeft: 8 }} />
        </View>
        <View style={styles.listMetaRow}>
          <Text style={styles.listMeta}>{formatTurkishDate(item.pickup_date)}</Text>
          <View style={styles.listDivider} />
          <Text style={[styles.listMeta, { color: ACCENT }]}>{item.price ? `${item.price.toLocaleString('tr-TR')} ₺` : '-'}</Text>
          <View style={styles.listDivider} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="people" size={11} color={ACCENT} />
            <Text style={styles.listMeta}>{item.job_requests?.[0]?.count || 0}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const displayedJobs = myJobs.filter(job => job.status === activeFilter);
  const isDriverTab = activeFilter === 'AVAILABLE_DRIVERS';

  const FILTER_TABS = [
    { key: 'OPEN',              label: 'AKTİF',                  activeColor: '#16A34A' },
    { key: 'ASSIGNED',          label: 'YOLDA',                   activeColor: '#D97706' },
    { key: 'COMPLETED',         label: 'BİTEN',                   activeColor: 'rgba(255,255,255,0.2)' },
    { key: 'CANCELLED',         label: 'İPTAL',                   activeColor: '#DC2626' },
    { key: 'AVAILABLE_DRIVERS', label: `🚛 MÜSAİT (${availableDrivers.length})`, activeColor: '#3B82F6' },
  ] as const;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <LinearGradient
        colors={['#1E3A8A', '#020617']}
        style={[styles.header, { paddingTop: insets.top + 16 }]}
      >
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Yüklerim</Text>
          <View style={styles.viewToggle}>
            <TouchableOpacity
              style={[styles.toggleBtn, viewMode === 'list' && styles.toggleBtnActive]}
              onPress={() => setViewMode('list')}
            >
              <Ionicons name="list" size={18} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, viewMode === 'card' && styles.toggleBtnActive]}
              onPress={() => setViewMode('card')}
            >
              <Ionicons name="grid" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {FILTER_TABS.map(({ key, label, activeColor }) => (
            <TouchableOpacity
              key={key}
              style={[styles.filterTab, activeFilter === key && { backgroundColor: activeColor }]}
              onPress={() => setActiveFilter(key as any)}
            >
              <Text style={[styles.filterText, activeFilter === key && { color: '#fff' }]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </LinearGradient>

      <FlatList
        data={isDriverTab ? availableDrivers : displayedJobs}
        keyExtractor={(item) => item.id.toString()}
        renderItem={isDriverTab ? renderAvailableDriverCard : (viewMode === 'list' ? renderJobListItem : renderJobItem)}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => { if (isDriverTab) fetchAvailableDrivers(); else if (userId) fetchMyJobs(userId); }}
            tintColor={ACCENT}
          />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyBox}>
              <Ionicons name={isDriverTab ? 'car-outline' : 'folder-open-outline'} size={48} color="#CBD5E1" style={{ marginBottom: 12 }} />
              <Text style={styles.emptyText}>
                {isDriverTab ? 'Şu an müsait araç ilanı bulunmuyor.' : 'Bu aşamada listelenecek ilan bulunmuyor.'}
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },

  header: { paddingHorizontal: 20, paddingBottom: 24, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '900' },
  viewToggle: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 10, padding: 3, gap: 2 },
  toggleBtn: { width: 34, height: 34, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  toggleBtnActive: { backgroundColor: 'rgba(255,255,255,0.2)' },
  filterRow: { flexDirection: 'row', gap: 8, paddingBottom: 4 },
  filterTab: { height: 36, paddingHorizontal: 14, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  filterText: { fontSize: 11, fontWeight: '800', color: 'rgba(255,255,255,0.55)' },

  listContainer: { padding: 16, paddingBottom: 100 },

  // Card (card view)
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 18, marginBottom: 14, ...Shadows.medium },

  statusBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, gap: 6, marginBottom: 12 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusLabel: { fontSize: 10, fontWeight: '900' },

  routeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  routeCity: { flex: 1, fontSize: 17, fontWeight: '900', color: '#0F172A', letterSpacing: -0.5 },
  routeArrow: { flexDirection: 'row', alignItems: 'center', width: 50 },
  arrowLine: { flex: 1, height: 2, backgroundColor: '#E2E8F0', borderRadius: 1 },

  metaRow: { flexDirection: 'row', backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12, marginBottom: 14 },
  metaItem: { flex: 1 },
  metaItemBorder: { borderLeftWidth: 1, borderLeftColor: '#E2E8F0', paddingLeft: 12 },
  metaLabel: { fontSize: 9, fontWeight: '700', color: '#94A3B8', letterSpacing: 1, marginBottom: 3 },
  metaValue: { fontSize: 13, fontWeight: '800', color: '#0F172A' },

  actionRow: { flexDirection: 'row', gap: 8 },
  actionBtn: { flex: 1, height: 40, borderRadius: 10, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  actionBtnText: { fontSize: 11, fontWeight: '900', color: '#fff' },

  // Driver card extras
  driverCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  driverAvatarWrap: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  driverAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF7F4', justifyContent: 'center', alignItems: 'center' },
  driverAvatarText: { fontSize: 18, fontWeight: '900', color: ACCENT },
  driverName: { fontSize: 15, fontWeight: '900', color: '#0F172A' },
  driverVehicle: { fontSize: 11, fontWeight: '700', color: ACCENT, marginTop: 2 },
  urgentBadge: { backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  urgentText: { fontSize: 9, fontWeight: '900', color: '#92400E', letterSpacing: 1 },

  // List view item
  listItem: { backgroundColor: '#fff', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14, marginBottom: 8, ...Shadows.sm },
  listItemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  listAccentBar: { width: 4, height: 18, borderRadius: 2, marginRight: 10 },
  listRouteWrap: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  listCity: { fontSize: 13, fontWeight: '900', color: '#0F172A', maxWidth: '42%' },
  listRoutePath: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: 6 },
  listPathDash: { flex: 1, height: 1, borderWidth: 1, borderStyle: 'dashed', borderColor: '#E2E8F0', borderRadius: 1 },
  listMetaRow: { flexDirection: 'row', alignItems: 'center', paddingLeft: 14 },
  listMeta: { fontSize: 11, fontWeight: '700', color: '#64748B' },
  listDivider: { width: 1, height: 10, backgroundColor: '#E2E8F0', marginHorizontal: 10 },

  emptyBox: { alignItems: 'center', marginTop: 80 },
  emptyText: { fontSize: 13, fontWeight: '600', color: '#94A3B8', textAlign: 'center' },
});
