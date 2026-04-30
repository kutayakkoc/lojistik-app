import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Alert, TouchableOpacity, Linking, Dimensions, ScrollView, RefreshControl } from 'react-native';
import { supabase } from '../lib/supabase';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, Shadows, Radius } from '../constants/Theme';
import { useTheme } from '../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

export default function DriverApplicationsScreen() {
  const { theme } = useTheme();
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
    }, [])
  );

  const fetchMyApplications = async (isRefreshing = false) => {
    try {
      if (isRefreshing) {
        setLoading(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else {
        setLoading(true);
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data, error } = await supabase
        .from('job_requests')
        .select(`
          id,
          status,
          created_at,
          jobs!inner(
            id,
            required_vehicle_type,
            price,
            shipper_id,
            origin,
            destination,
            cargo_details,
            pickup_date,
            unloading_date,
            status,
            profiles!jobs_shipper_id_fkey(full_name, phone)
          )
        `)
        .eq('driver_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApplications(data || []);
    } catch (error: any) {
      // fetchMyApplications Catch
    } finally {
      setLoading(false);
    }
  };

  const fetchMyAvailabilities = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    const { data } = await supabase
      .from('driver_availabilities')
      .select('id, origin, destination, available_date, vehicle_type, notes')
      .eq('driver_id', session.user.id)
      .order('available_date', { ascending: true });
    setMyAvailabilities(data || []);
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

  const handleWhatsAppContact = (job: any) => {
    const phone = job.profiles.phone;
    const message = `Merhaba, ${job.origin} - ${job.destination} sevkiyatı (#${job.id.substring(0, 8)}) başvurum hakkında görüşmek istiyorum.`;
    const url = `whatsapp://send?phone=90${phone}&text=${encodeURIComponent(message)}`;
    
    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Alert.alert('Hata', 'WhatsApp yüklü değil veya açılamadı.');
      }
    });
  };

  const handlePhoneCall = (phone: string) => {
    const url = `tel:${phone}`;
    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Alert.alert('Hata', 'Arama özelliği bu cihazda kullanılamıyor.');
      }
    });
  };

  const formatMissionDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      const months = [
        'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
        'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
      ];
      return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
    } catch (e) {
      return dateStr;
    }
  };

  const renderAvailabilityCard = ({ item }: { item: any }) => {
    const today = new Date().toISOString().split('T')[0];
    const isExpired = item.available_date < today;
    return (
      <View style={[styles.specCard, { backgroundColor: theme.surface, borderColor: theme.border }, isExpired && { opacity: 0.5 }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <View style={[styles.statusBadge, { backgroundColor: isExpired ? 'rgba(148,163,184,0.1)' : 'rgba(59,130,246,0.1)', borderWidth: 1, borderColor: (isExpired ? '#94A3B8' : '#3B82F6') + '40' }]}>
            <View style={[styles.pulseDot, { backgroundColor: isExpired ? '#94A3B8' : '#3B82F6' }]} />
            <Text style={[styles.statusBadgeText, { color: isExpired ? '#94A3B8' : '#3B82F6' }]}>{isExpired ? 'SÜRESİ DOLDU' : 'AKTİF İLAN'}</Text>
          </View>
          <TouchableOpacity onPress={() => handleDeleteAvailability(item.id)} style={{ padding: 8, borderRadius: 8, backgroundColor: '#FEE2E2' }}>
            <Ionicons name="trash-outline" size={16} color="#EF4444" />
          </TouchableOpacity>
        </View>

        <View style={styles.telemetryRouteBridge}>
          <View style={styles.bridgePoint}>
            <Text style={[styles.telemetryLabel, { color: theme.textLight, marginBottom: 4 }]}>NEREDEN</Text>
            <Text style={[styles.telemetryCity, { color: theme.text }]} numberOfLines={1}>{item.origin}</Text>
          </View>
          <View style={styles.telemetryRoutePath}>
            <View style={[styles.routePathDash, { borderColor: theme.border }]} />
            <FontAwesome5 name="truck" size={14} color={isExpired ? theme.textLight : '#3B82F6'} style={{ marginHorizontal: 8 }} />
            <View style={[styles.routePathDash, { borderColor: theme.border }]} />
          </View>
          <View style={[styles.bridgePoint, { alignItems: 'flex-end' }]}>
            <Text style={[styles.telemetryLabel, { color: theme.textLight, marginBottom: 4 }]}>NEREYE</Text>
            <Text style={[styles.telemetryCity, { color: theme.text, textAlign: 'right' }]} numberOfLines={1}>{item.destination}</Text>
          </View>
        </View>

        <View style={styles.telemetryGrid}>
          <View style={styles.telemetryBox}>
            <Text style={[styles.telemetryLabel, { color: theme.textLight }]}>MÜSAİT TARİH</Text>
            <Text style={[styles.telemetryValue, { color: isExpired ? theme.textLight : theme.text }]}>{formatMissionDate(item.available_date)}</Text>
          </View>
          <View style={[styles.telemetryBox, { borderLeftWidth: 1, borderLeftColor: theme.border, paddingLeft: 15 }]}>
            <Text style={[styles.telemetryLabel, { color: theme.textLight }]}>ARAÇ TİPİ</Text>
            <Text style={[styles.telemetryValue, { color: theme.text }]}>{item.vehicle_type}</Text>
          </View>
        </View>

        {item.notes ? (
          <Text style={{ fontSize: 12, color: theme.textLight, fontStyle: 'italic' }}>Not: {item.notes}</Text>
        ) : null}
      </View>
    );
  };

  const renderItem = ({ item }: { item: any }) => {
    const job = item.jobs;
    const shipper = job.profiles;
    const isAccepted = item.status === 'ACCEPTED';
    const isRejected = item.status === 'REJECTED';
    const isPending = item.status === 'PENDING';

    if (viewMode === 'list') {
      const statusConfig = isAccepted 
        ? { color: '#22C55E', label: 'ONAYLANDI' }
        : isRejected 
          ? { color: '#94A3B8', label: 'REDDEDİLDİ' }
          : { color: '#3B82F6', label: 'BEKLİYOR' };

      return (
        <TouchableOpacity
          style={[
            styles.listPremiumItem, 
            { backgroundColor: theme.surface, borderColor: theme.border },
            isRejected && { opacity: 0.7 }
          ]}
          onPress={() => navigation.navigate('JobDetail', { item: job, role: 'DRIVER' })}
          activeOpacity={0.7}
        >
          <View style={styles.listPremiumContent}>
            <View style={styles.listPremiumRow}>
              <View style={[styles.listAccentBar, { backgroundColor: statusConfig.color }]} />
              <View style={styles.listPremiumRouteWrap}>
                <Text style={[styles.listPremiumCity, { color: theme.text }]} numberOfLines={1}>{job.origin.toUpperCase()}</Text>
                <View style={styles.listRoutePath}>
                   <View style={[styles.listPathDash, { borderColor: theme.border }]} />
                   <FontAwesome5 name="truck" size={10} color={statusConfig.color} style={{ marginHorizontal: 6 }} />
                   <View style={[styles.listPathDash, { borderColor: theme.border }]} />
                </View>
                <Text style={[styles.listPremiumCity, { color: theme.text }]} numberOfLines={1}>{job.destination.toUpperCase()}</Text>
              </View>
              <Ionicons name="chevron-forward" size={14} color={theme.accent} style={{ marginLeft: 8 }} />
            </View>

            <View style={styles.listPremiumMetaRow}>
               <View style={styles.listPremiumSpec}>
                 <Text style={[styles.telemetryLabel, { color: theme.textLight, marginBottom: 0 }]}>TARİH:</Text>
                 <Text style={[styles.listPremiumSpecText, { color: theme.text }]}>{formatMissionDate(job.pickup_date)}</Text>
               </View>
               <View style={[styles.listPremiumDivider, { backgroundColor: theme.border }]} />
               <View style={styles.listPremiumSpec}>
                 <Text style={[styles.telemetryLabel, { color: theme.textLight, marginBottom: 0 }]}>DURUM:</Text>
                 <Text style={[styles.listPremiumSpecText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
               </View>
            </View>
          </View>
        </TouchableOpacity>
      );
    }

    const statusConfig = isAccepted 
      ? { color: '#22C55E', label: 'GÖREV ONAYLANDI', bg: 'rgba(34, 197, 94, 0.1)' }
      : isRejected 
        ? { color: '#94A3B8', label: 'BAŞVURU REDDEDİLDİ', bg: 'rgba(148, 163, 184, 0.1)' }
        : { color: '#3B82F6', label: 'UYGUNLUK BEKLENİYOR', bg: 'rgba(59, 130, 246, 0.1)' };

    return (
      <TouchableOpacity 
        style={[
          styles.specCard, 
          { backgroundColor: theme.surface, borderColor: theme.border },
          isRejected && { opacity: 0.6 }
        ]}
        onPress={() => navigation.navigate('JobDetail', { item: job, role: 'DRIVER' })}
        activeOpacity={0.9}
      >
        <View style={styles.specHeader}>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg, borderWidth: 1, borderColor: statusConfig.color + '40' }]}>
             <View style={[styles.pulseDot, { backgroundColor: statusConfig.color }]} />
             <Text style={[styles.statusBadgeText, { color: statusConfig.color }]}>
                {statusConfig.label}
             </Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={[styles.missionId, { color: theme.textLight }]}>
               #APP-{item.id.substring(0,6).toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.telemetryRouteBridge}>
          <View style={styles.bridgePoint}>
            <Text style={[styles.telemetryLabel, { color: theme.textLight, marginBottom: 4 }]}>NEREDEN</Text>
            <Text style={[styles.telemetryCity, { color: theme.text }]} numberOfLines={1}>{job.origin}</Text>
          </View>
          
          <View style={styles.telemetryRoutePath}>
             <View style={[styles.routePathDash, { borderColor: theme.border }]} />
             <FontAwesome5 name="truck" size={14} color={statusConfig.color} style={{ marginHorizontal: 8 }} />
             <View style={[styles.routePathDash, { borderColor: theme.border }]} />
          </View>

          <View style={[styles.bridgePoint, { alignItems: 'flex-end' }]}>
            <Text style={[styles.telemetryLabel, { color: theme.textLight, marginBottom: 4 }]}>NEREYE</Text>
            <Text style={[styles.telemetryCity, { color: theme.text, textAlign: 'right' }]} numberOfLines={1}>{job.destination}</Text>
          </View>
        </View>

        <View style={styles.telemetryGrid}>
          <View style={styles.telemetryBox}>
            <Text style={[styles.telemetryLabel, { color: theme.textLight }]}>YÜKLEME TARİHİ</Text>
            <Text style={[styles.telemetryValue, { color: theme.text }]}>
              {formatMissionDate(job.pickup_date)}
            </Text>
          </View>
          <View style={[styles.telemetryBox, { borderLeftWidth: 1, borderLeftColor: theme.border, paddingLeft: 15 }]}>
            <Text style={[styles.telemetryLabel, { color: theme.textLight }]}>TEKLİF (₺)</Text>
            <Text style={[styles.telemetryValue, { color: theme.accent, fontWeight: '900' }]}>
              {job.price ? `${job.price.toLocaleString('tr-TR')} + KDV` : 'TEKLİF'}
            </Text>
          </View>
          <View style={[styles.telemetryBox, { borderLeftWidth: 1, borderLeftColor: theme.border, paddingLeft: 15 }]}>
            <Text style={[styles.telemetryLabel, { color: theme.textLight }]}>ARAÇ TİPİ</Text>
            <Text style={[styles.telemetryValue, { color: theme.text }]}>
              {(job.required_vehicle_type || 'TIR').toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.actionGrid}>
          <TouchableOpacity 
            style={[styles.actionBtnSecondary, { borderColor: theme.border }]}
            onPress={() => navigation.navigate('JobDetail', { item: job, role: 'DRIVER' })}
          >
            <Ionicons name="eye-outline" size={14} color={theme.text} />
            <Text style={[styles.actionBtnText, { color: theme.text }]}>DETAY</Text>
          </TouchableOpacity>

          {!isRejected && (
            <>
              <TouchableOpacity 
                style={[styles.actionBtnSecondary, { backgroundColor: '#25D366', borderColor: '#25D366' }]}
                onPress={() => handleWhatsAppContact(job)}
              >
                <Ionicons name="logo-whatsapp" size={14} color="#fff" />
                <Text style={[styles.actionBtnText, { color: '#fff' }]}>WHATSAPP</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.actionBtnSecondary, { backgroundColor: theme.accent, borderColor: theme.accent }]}
                onPress={() => handlePhoneCall(shipper.phone)}
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
    if (activeFilter === 'PENDING') return item.status === 'PENDING';
    if (activeFilter === 'ASSIGNED') return item.status === 'ACCEPTED' && job.status === 'ASSIGNED';
    if (activeFilter === 'COMPLETED') return item.status === 'ACCEPTED' && job.status === 'COMPLETED';
    if (activeFilter === 'REJECTED') return item.status === 'REJECTED';
    return false;
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style="light" />
      
      {/* Header Mission Control */}
      <View style={[styles.headerHost, { paddingTop: insets.top + 10 }]}>
        <LinearGradient
          colors={[theme.primary, '#f35d18']}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.headerContent}>
           <View>
              <Text style={styles.missionHeaderTitle}>BAŞVURULARIM</Text>
           </View>
           <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <TouchableOpacity onPress={() => setViewMode(prev => prev === 'card' ? 'list' : 'card')} style={styles.viewToggleBtn}>
                 <Ionicons name={viewMode === 'card' ? "list-outline" : "grid-outline"} size={18} color="#fff" />
              </TouchableOpacity>
              <View style={styles.headerIndicator}>
                 <View style={styles.indicatorPulse} />
                 <Text style={styles.indicatorText}>SİSTEM AKTİF</Text>
              </View>
           </View>
        </View>
         
         {/* Tab Filters */}
         <View style={styles.filterContainer}>
           <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20 }}>
             <TouchableOpacity 
                style={[styles.filterTab, activeFilter === 'PENDING' && { backgroundColor: '#3B82F6' }]} 
                onPress={() => { Haptics.selectionAsync(); setActiveFilter('PENDING'); }}
             >
                <Text style={[styles.filterText, activeFilter === 'PENDING' && { color: '#fff' }]}>BEKLİYOR</Text>
             </TouchableOpacity>
             <TouchableOpacity 
                style={[styles.filterTab, activeFilter === 'ASSIGNED' && { backgroundColor: '#F59E0B' }]} 
                onPress={() => { Haptics.selectionAsync(); setActiveFilter('ASSIGNED'); }}
             >
                <Text style={[styles.filterText, activeFilter === 'ASSIGNED' && { color: '#fff' }]}>YOLDA</Text>
             </TouchableOpacity>
             <TouchableOpacity 
                style={[styles.filterTab, activeFilter === 'COMPLETED' && { backgroundColor: 'rgba(255,255,255,0.2)' }]} 
                onPress={() => { Haptics.selectionAsync(); setActiveFilter('COMPLETED'); }}
             >
                <Text style={[styles.filterText, activeFilter === 'COMPLETED' && { color: '#fff' }]}>TAMAMLANAN</Text>
             </TouchableOpacity>
             <TouchableOpacity
                style={[styles.filterTab, activeFilter === 'REJECTED' && { backgroundColor: '#EF4444' }]}
                onPress={() => { Haptics.selectionAsync(); setActiveFilter('REJECTED'); }}
             >
                <Text style={[styles.filterText, activeFilter === 'REJECTED' && { color: '#fff' }]}>RED</Text>
             </TouchableOpacity>
             <TouchableOpacity
                style={[styles.filterTab, activeFilter === 'MY_VEHICLES' && { backgroundColor: '#3B82F6' }]}
                onPress={() => { Haptics.selectionAsync(); setActiveFilter('MY_VEHICLES'); }}
             >
                <Text style={[styles.filterText, activeFilter === 'MY_VEHICLES' && { color: '#fff' }]}>🚛 ARAÇLARIM ({myAvailabilities.length})</Text>
             </TouchableOpacity>
           </ScrollView>
         </View>
      </View>

      {loading ? (
        <View style={styles.loadingHost}>
           <ActivityIndicator size="large" color={theme.accent} />
           <Text style={[styles.loadingText, { color: theme.textLight }]}>Telemetri verileri çekiliyor...</Text>
        </View>
      ) : (
        <FlatList
          data={isVehicleTab ? myAvailabilities : displayedApplications}
          keyExtractor={(item) => item.id.toString()}
          renderItem={isVehicleTab ? renderAvailabilityCard : renderItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
             <View style={styles.emptyHost}>
                <View style={[styles.emptyIconCircle, { backgroundColor: '#F1F5F9' }]}>
                   <Ionicons name={isVehicleTab ? 'car-outline' : 'file-tray-outline'} size={40} color={theme.accent} />
                </View>
                <Text style={[styles.emptyTitle, { color: theme.text }]}>{isVehicleTab ? 'Araç İlanı Yok' : 'Henüz Başvuru Yok'}</Text>
                <Text style={[styles.emptySubtitle, { color: theme.textLight }]}>
                  {isVehicleTab
                    ? 'Henüz boş araç ilanı oluşturmadınız. Ana ekrandan "Boş Araç" butonuna basarak ilan oluşturabilirsiniz.'
                    : 'Şu an listelenecek bir başvurunuz bulunmuyor. Yeni ilanlara göz atarak ilk başvurunuzu yapabilirsiniz.'}
                </Text>
                <TouchableOpacity style={styles.emptyResetBtn} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); isVehicleTab ? fetchMyAvailabilities() : fetchMyApplications(true); }}>
                   <Text style={[styles.emptyResetBtnText, { color: theme.accent }]}>SAYFAYI YENİLE</Text>
                </TouchableOpacity>
             </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={() => { isVehicleTab ? fetchMyAvailabilities() : fetchMyApplications(true); }}
              tintColor={theme.accent}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerHost: { paddingBottom: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, overflow: 'hidden', ...Shadows.medium },
  headerContent: { paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, marginBottom: 20 },
  missionHeaderTitle: { color: '#fff', fontSize: 24, fontWeight: '900', letterSpacing: -1 },
  headerIndicator: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  indicatorPulse: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4ADE80', marginRight: 6 },
  indicatorText: { color: '#fff', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  viewToggleBtn: { width: 34, height: 34, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  filterContainer: { marginTop: 5, marginBottom: 5 },
  filterTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', marginRight: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  filterText: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: 'bold', letterSpacing: 0.5 },
  listContainer: { paddingTop: 20, paddingBottom: 40 },
  specCard: { padding: 20, borderRadius: Radius.xl, marginHorizontal: 20, marginBottom: 20, borderWidth: 1, ...Shadows.medium },
  specHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 20, gap: 6 },
  pulseDot: { width: 6, height: 6, borderRadius: 3 },
  statusBadgeText: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  missionId: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  telemetryRouteBridge: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, backgroundColor: 'rgba(150,150,150,0.05)', padding: 15, borderRadius: Radius.lg },
  bridgePoint: { flex: 1 },
  telemetryRoutePath: { flex: 0.8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  routePathDash: { flex: 1, height: 1, borderWidth: 1, borderStyle: 'dashed', borderRadius: 1 },
  telemetryCity: { fontSize: 16, fontWeight: '900', letterSpacing: -0.3, textTransform: 'uppercase' },
  telemetryGrid: { flexDirection: 'row', marginBottom: 20 },
  telemetryBox: { flex: 1 },
  telemetryLabel: { fontSize: 8, fontWeight: '900', letterSpacing: 1.5, marginBottom: 4 },
  telemetryValue: { fontSize: 14, fontWeight: '800' },
  actionGrid: { flexDirection: 'row', gap: 8, marginTop: 10 },
  actionBtnSecondary: { flex: 1, height: 40, borderRadius: 10, borderWidth: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  actionBtnText: { fontSize: 10, fontWeight: '900' },
  listPremiumItem: { paddingVertical: 15, paddingHorizontal: 20, marginHorizontal: 20, marginBottom: 12, borderRadius: Radius.lg, borderWidth: 1, ...Shadows.sm },
  listPremiumContent: { flex: 1 },
  listPremiumRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  listAccentBar: { width: 4, height: 20, borderRadius: Radius.round, marginRight: 12 },
  listPremiumRouteWrap: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  listRoutePath: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: 10 },
  listPathDash: { flex: 1, height: 1, borderWidth: 1, borderStyle: 'dashed', borderRadius: 1 },
  listPremiumCity: { fontSize: 14, fontWeight: '900', maxWidth: '45%' },
  listPremiumMetaRow: { flexDirection: 'row', alignItems: 'center', paddingLeft: 16 },
  listPremiumSpec: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  listPremiumSpecText: { fontSize: 11, fontWeight: '800' },
  listPremiumDivider: { width: 1, height: 12, marginHorizontal: 12, opacity: 0.2 },
  loadingHost: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },
  loadingText: { marginTop: 15, fontSize: 14, fontWeight: '600' },
  emptyHost: { alignItems: 'center', marginTop: 100, paddingHorizontal: 40 },
  emptyIconCircle: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 18, fontWeight: '900', marginBottom: 10 },
  emptySubtitle: { fontSize: 13, fontWeight: '500', textAlign: 'center', opacity: 0.7, lineHeight: 20 },
  emptyResetBtn: { marginTop: 20, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(243, 129, 24, 0.2)' },
  emptyResetBtnText: { fontSize: 11, fontWeight: '900', letterSpacing: 1 },
});
