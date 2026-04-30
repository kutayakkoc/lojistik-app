import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, Platform, Alert, Linking, ScrollView } from 'react-native';
import { supabase } from '../lib/supabase';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { Shadows, Radius } from '../constants/Theme';
import { useTheme } from '../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

const formatTurkishDate = (dateStr: string) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
};


export default function ShipperJobsScreen() {
  const { theme } = useTheme();
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
      if (userId) {
        fetchMyJobs(userId);
      }
    }, [userId, activeFilter])
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
      .select(`
        id, origin, destination, available_date, vehicle_type, notes,
        profiles!driver_availabilities_driver_id_fkey(full_name, phone)
      `)
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

    if (!error) {
      setMyJobs(data || []);
    }
    setLoading(false);
  };

  const handleDriverWhatsApp = (phone: string, driver: any) => {
    const clean = phone.replace(/\D/g, '').replace(/^0/, '90');
    const msg = `Merhaba ${driver.full_name}, boş araç ilanınızı gördüm. ${driver.origin} - ${driver.destination} güzergahında yük teklifim var, görüşebilir miyiz?`;
    Linking.openURL(`whatsapp://send?phone=${clean}&text=${encodeURIComponent(msg)}`).catch(() =>
      Alert.alert('Hata', 'WhatsApp açılamadı.')
    );
  };

  const handleDriverCall = (phone: string) => {
    Linking.openURL(`tel:${phone.replace(/\D/g, '')}`).catch(() =>
      Alert.alert('Hata', 'Arama başlatılamadı.')
    );
  };

  const renderAvailableDriverCard = ({ item }: { item: any }) => {
    const driver = item.profiles;
    const isExpiringSoon = new Date(item.available_date).getTime() - Date.now() < 2 * 24 * 60 * 60 * 1000;
    return (
      <View style={[styles.specCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={[styles.driverAvatar, { backgroundColor: theme.accent + '20' }]}>
              <Text style={{ fontSize: 18, fontWeight: '900', color: theme.accent }}>
                {driver?.full_name?.charAt(0).toUpperCase() || '?'}
              </Text>
            </View>
            <View>
              <Text style={[styles.driverName, { color: theme.text }]}>{driver?.full_name || 'Şoför'}</Text>
              <Text style={[styles.vehicleTag, { color: theme.accent }]}>🚛 {item.vehicle_type}</Text>
            </View>
          </View>
          {isExpiringSoon && (
            <View style={styles.urgentBadge}>
              <Text style={styles.urgentText}>YAKINDA</Text>
            </View>
          )}
        </View>

        <View style={styles.routeRow}>
          <Text style={[styles.driverRouteCity, { color: theme.text }]} numberOfLines={1}>{item.origin.toUpperCase()}</Text>
          <View style={styles.driverRouteArrow}>
            <View style={[styles.driverArrowLine, { backgroundColor: theme.border }]} />
            <Ionicons name="chevron-forward" size={12} color={theme.accent} />
          </View>
          <Text style={[styles.driverRouteCity, { color: theme.text, textAlign: 'right' }]} numberOfLines={1}>{item.destination.toUpperCase()}</Text>
        </View>

        <View style={[styles.telemetryGrid, { marginTop: 12, marginBottom: 14 }]}>
          <View style={styles.telemetryBox}>
            <Text style={[styles.telemetryLabel, { color: theme.textLight }]}>MÜSAİT TARİH</Text>
            <Text style={[styles.telemetryValue, { color: theme.text }]}>{formatTurkishDate(item.available_date)}</Text>
          </View>
          {item.notes ? (
            <View style={[styles.telemetryBox, { borderLeftWidth: 1, borderLeftColor: theme.border, paddingLeft: 15 }]}>
              <Text style={[styles.telemetryLabel, { color: theme.textLight }]}>NOT</Text>
              <Text style={[styles.telemetryValue, { color: theme.text, fontSize: 12 }]} numberOfLines={2}>{item.notes}</Text>
            </View>
          ) : null}
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#25D366', flex: 1 }]}
            onPress={() => handleDriverWhatsApp(driver?.phone || '', { ...driver, origin: item.origin, destination: item.destination })}
          >
            <Ionicons name="logo-whatsapp" size={14} color="#fff" />
            <Text style={[styles.actionBtnText, { color: '#fff' }]}>WHATSAPP</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: theme.accent, flex: 1 }]}
            onPress={() => handleDriverCall(driver?.phone || '')}
          >
            <Ionicons name="call-outline" size={14} color="#fff" />
            <Text style={[styles.actionBtnText, { color: '#fff' }]}>ARA</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
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
            const pickupDate = tomorrow.toISOString().split('T')[0];
            const { error } = await supabase.from('jobs').insert({
              shipper_id: userId,
              origin: item.origin,
              destination: item.destination,
              cargo_details: item.cargo_details,
              required_vehicle_type: item.required_vehicle_type,
              price: item.price,
              pickup_date: pickupDate,
              status: 'OPEN',
            });
            if (error) {
              Alert.alert('Hata', error.message);
            } else {
              Alert.alert('Başarılı', 'İlan yeniden yayınlandı.');
              if (userId) fetchMyJobs(userId);
            }
          },
        },
      ]
    );
  };



  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'OPEN': return { label: 'AKTİF', color: '#2ECC71' };
      case 'ASSIGNED': return { label: 'YOLDA', color: '#F59E0B' };
      case 'COMPLETED': return { label: 'BİTTİ', color: theme.textLight };
      case 'CANCELLED': return { label: 'İPTAL', color: '#EF4444' };
      default: return { label: status, color: theme.border };
    }
  };

  const renderJobItem = ({ item }: { item: any }) => {
    const config = getStatusConfig(item.status);
    return (
      <TouchableOpacity 
        style={[styles.specCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
        onPress={() => navigation.navigate('JobDetail', { item, role: 'SHIPPER' })}
        activeOpacity={0.8}
      >
        <View style={{ marginBottom: 12, alignSelf: 'flex-start' }}>
          <View style={[styles.statusBadge, { backgroundColor: config.color + '15' }]}>
            <View style={[styles.statusDot, { backgroundColor: config.color }]} />
            <Text style={[styles.statusLabel, { color: config.color }]}>{config.label}</Text>
          </View>
        </View>

        <View style={styles.specHeader}>
          <View style={[styles.routeHeader, { flex: 1 }]}>
            <Text style={[styles.routeCity, { color: theme.text, flex: 1 }]} numberOfLines={1}>{item.origin.toUpperCase()}</Text>
            <View style={styles.routeArrow}>
               <View style={[styles.arrowLine, { backgroundColor: theme.border }]} />
               <Ionicons name="chevron-forward" size={12} color={theme.accent} />
            </View>
            <Text style={[styles.routeCity, { color: theme.text, flex: 1, textAlign: 'right' }]} numberOfLines={1}>{item.destination.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.telemetryGrid}>
          <View style={styles.telemetryBox}>
            <Text style={[styles.telemetryLabel, { color: theme.textLight }]}>YÜKLEME TARİHİ</Text>
            <Text style={[styles.telemetryValue, { color: theme.text }]}>
              {formatTurkishDate(item.pickup_date)}
            </Text>
          </View>
          <View style={[styles.telemetryBox, { borderLeftWidth: 1, borderLeftColor: theme.border, paddingLeft: 15 }]}>
            <Text style={[styles.telemetryLabel, { color: theme.textLight }]}>TEKLİF (₺)</Text>
            <Text style={[styles.telemetryValue, { color: theme.accent, fontWeight: '900' }]}>
              {item.price ? `${item.price.toLocaleString('tr-TR')} ₺ + KDV` : '-'}
            </Text>
          </View>
          <View style={[styles.telemetryBox, { borderLeftWidth: 1, borderLeftColor: theme.border, paddingLeft: 15 }]}>
            <Text style={[styles.telemetryLabel, { color: theme.textLight }]}>ARAÇ TİPİ</Text>
            <Text style={[styles.telemetryValue, { color: theme.text }]}>
              {(item.required_vehicle_type || 'TIR').toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          {(item.status === 'COMPLETED' || item.status === 'CANCELLED') && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: theme.accent + '15', flex: 1 }]}
              onPress={() => handleRepost(item)}
            >
              <Ionicons name="refresh-outline" size={14} color={theme.accent} />
              <Text style={[styles.actionBtnText, { color: theme.accent }]}>TEKRAR YAYINLA</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#F1F5F9', flex: 1 }]}
            onPress={() => navigation.navigate('JobDetail', { item, role: 'SHIPPER' })}
          >
            <Text style={[styles.actionBtnText, { color: item.status === 'COMPLETED' ? theme.text : theme.accent }]}>DETAYLAR</Text>
            <Ionicons name="chevron-forward" size={14} color={item.status === 'COMPLETED' ? theme.text : theme.accent} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderJobListItem = ({ item }: { item: any }) => {
    const config = getStatusConfig(item.status);
    return (
      <TouchableOpacity
        style={[
          styles.listPremiumItem, 
          { backgroundColor: theme.surface, borderColor: theme.border },
          item.status === 'COMPLETED' && { opacity: 0.8 }
        ]}
        onPress={() => navigation.navigate('JobDetail', { item, role: 'SHIPPER' })}
        activeOpacity={0.7}
      >
        <View style={styles.listPremiumContent}>
          <View style={styles.listPremiumRow}>
            <View style={[styles.listAccentBar, { backgroundColor: config.color }]} />
            <View style={styles.listPremiumRouteWrap}>
              <Text style={[styles.listPremiumCity, { color: theme.text }]} numberOfLines={1}>{item.origin.toUpperCase()}</Text>
              <View style={styles.listRoutePath}>
                 <View style={[styles.listPathDash, { borderColor: theme.border }]} />
                 <FontAwesome5 name="truck" size={8} color={theme.textLight} style={{ marginHorizontal: 4 }} />
                 <View style={[styles.listPathDash, { borderColor: theme.border }]} />
              </View>
              <Text style={[styles.listPremiumCity, { color: theme.text }]} numberOfLines={1}>{item.destination.toUpperCase()}</Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color={item.status === 'COMPLETED' ? theme.textLight : theme.accent} style={{ marginLeft: 8 }} />
          </View>

          <View style={styles.listPremiumMetaRow}>
             <View style={[styles.listPremiumSpec, { flex: 1.2 }]}>
               <Text style={[styles.telemetryLabel, { color: theme.textLight, fontSize: 7, marginBottom: 0 }]}>TARİH</Text>
               <Text style={[styles.listPremiumSpecText, { color: theme.text, fontSize: 10 }]} numberOfLines={1}>{formatTurkishDate(item.pickup_date)}</Text>
             </View>
             <View style={[styles.listPremiumDivider, { backgroundColor: theme.border, marginHorizontal: 8 }]} />
             <View style={[styles.listPremiumSpec, { flex: 2 }]}>
               <Text style={[styles.telemetryLabel, { color: theme.textLight, fontSize: 7, marginBottom: 0 }]}>FİYAT</Text>
               <Text style={[styles.listPremiumSpecText, { color: theme.accent, fontSize: 10 }]} numberOfLines={1}>{item.price ? `${item.price.toLocaleString('tr-TR')} ₺ + KDV` : '-'}</Text>
             </View>
             <View style={[styles.listPremiumDivider, { backgroundColor: theme.border, marginHorizontal: 8 }]} />
             <View style={[styles.listPremiumSpec, { flex: 0.8, alignItems: 'flex-end' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                   <Ionicons name="people" size={12} color={theme.accent} />
                   <Text style={{ fontSize: 11, fontWeight: '900', color: theme.text }}>{item.job_requests?.[0]?.count || 0}</Text>
                </View>
             </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const displayedJobs = myJobs.filter(job => job.status === activeFilter);

  const isDriverTab = activeFilter === 'AVAILABLE_DRIVERS';

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style="light" />

      <View style={[styles.headerHero, { paddingTop: insets.top + 10 }]}>
        <LinearGradient
          colors={[theme.primary, '#f35d18']}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.headerContent}>
          <View style={styles.titleContainer}>
             <Text style={styles.headerTitle}>OPERASYON PANOSU</Text>
          </View>
          <View style={styles.viewToggle}>
            <TouchableOpacity onPress={() => setViewMode('list')} style={[styles.toggleBtn, viewMode === 'list' && { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <Ionicons name="list" size={18} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setViewMode('card')} style={[styles.toggleBtn, viewMode === 'card' && { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <Ionicons name="grid" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContainer}>
          {([
            ['OPEN', 'AKTİF', '#2ECC71'],
            ['ASSIGNED', 'YOLDA', '#F59E0B'],
            ['COMPLETED', 'BİTEN', 'rgba(255,255,255,0.2)'],
            ['CANCELLED', 'İPTAL', '#EF4444'],
            ['AVAILABLE_DRIVERS', `🚛 MÜSAİT (${availableDrivers.length})`, '#3B82F6'],
          ] as const).map(([filter, label, color]) => (
            <TouchableOpacity
              key={filter}
              style={[styles.filterTab, activeFilter === filter && { backgroundColor: color }]}
              onPress={() => setActiveFilter(filter)}
            >
              <Text style={[styles.filterText, activeFilter === filter ? { color: filter === 'OPEN' || filter === 'ASSIGNED' ? '#000' : '#fff' } : { color: 'rgba(255,255,255,0.6)' }]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

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
            tintColor={theme.accent}
          />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyBox}>
              <Ionicons name={isDriverTab ? 'car-outline' : 'folder-open-outline'} size={48} color={theme.textLight} style={{ opacity: 0.5, marginBottom: 15 }} />
              <Text style={[styles.emptyText, { color: theme.textLight }]}>
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
  container: { flex: 1 },
  headerHero: { paddingBottom: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, overflow: 'hidden' },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 20 },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  titleContainer: { flex: 1 },
  viewToggle: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 12, padding: 4 },
  toggleBtn: { width: 36, height: 36, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  filterContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, gap: 10, paddingBottom: 10 },
  filterTab: { height: 40, paddingHorizontal: 16, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  filterText: { fontSize: 11, fontWeight: '900' },
  filterDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#000' },
  listContainer: { padding: 20, paddingBottom: 100 },
  specCard: { marginBottom: 20, borderRadius: Radius.xl, padding: 20, borderWidth: 1, ...Shadows.medium },
  specHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  routeHeader: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  routeCity: { fontSize: 18, fontWeight: '900', letterSpacing: -0.5 },
  routeArrow: { flexDirection: 'row', alignItems: 'center', flex: 1, maxWidth: 60 },
  arrowLine: { flex: 1, height: 2, borderRadius: 1 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, gap: 6 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  telemetryGrid: { flexDirection: 'row', marginBottom: 20, backgroundColor: 'rgba(0,0,0,0.02)', padding: 15, borderRadius: 16 },
  telemetryBox: { flex: 1 },
  telemetryLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
  telemetryValue: { fontSize: 14, fontWeight: '800' },
  actionBtn: { height: 44, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  actionBtnText: { fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  listPremiumItem: { paddingVertical: 12, paddingHorizontal: 15, marginBottom: 10, borderRadius: Radius.lg, borderWidth: 1, ...Shadows.sm },
  listPremiumContent: { flex: 1 },
  listPremiumRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  listAccentBar: { width: 4, height: 18, borderRadius: Radius.round, marginRight: 10 },
  listPremiumRouteWrap: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  listRoutePath: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: 8 },
  listPathDash: { flex: 1, height: 1, borderWidth: 1, borderStyle: 'dashed', borderRadius: 1 },
  listPremiumCity: { fontSize: 13, fontWeight: '900', maxWidth: '45%' },
  listPremiumMetaRow: { flexDirection: 'row', alignItems: 'center', paddingLeft: 12 },
  listPremiumSpec: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  listPremiumSpecText: { fontSize: 10, fontWeight: '800' },
  listPremiumDivider: { width: 1, height: 10, marginHorizontal: 8, opacity: 0.15 },
  emptyBox: { alignItems: 'center', marginTop: 100 },
  emptyText: { fontSize: 13, fontWeight: '600' },
  driverAvatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  driverName: { fontSize: 15, fontWeight: '900' },
  vehicleTag: { fontSize: 11, fontWeight: '700', marginTop: 2 },
  urgentBadge: { backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  urgentText: { fontSize: 9, fontWeight: '900', color: '#92400E', letterSpacing: 1 },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  driverRouteCity: { flex: 1, fontSize: 16, fontWeight: '900', letterSpacing: -0.5 },
  driverRouteArrow: { flexDirection: 'row', alignItems: 'center', width: 50 },
  driverArrowLine: { flex: 1, height: 2, borderRadius: 1 },
});
