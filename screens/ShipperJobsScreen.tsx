import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { Shadows, Radius } from '../constants/Theme';
import { useTheme } from '../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

export default function ShipperJobsScreen() {
  const { theme, isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [myJobs, setMyJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'OPEN' | 'ASSIGNED' | 'COMPLETED'>('OPEN');
  const [userId, setUserId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');

  useEffect(() => {
    fetchSession();
  }, []);

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
    }
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

  const formatTurkishDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'OPEN': return { label: 'AKTİF', color: '#2ECC71' };
      case 'ASSIGNED': return { label: 'YOLDA', color: '#F59E0B' };
      case 'COMPLETED': return { label: 'BİTTİ', color: theme.textLight };
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
        <View style={styles.specHeader}>
          <View style={styles.routeHeader}>
            <Text style={[styles.routeCity, { color: theme.text }]}>{item.origin.toUpperCase()}</Text>
            <View style={styles.routeArrow}>
               <View style={[styles.arrowLine, { backgroundColor: theme.border }]} />
               <Ionicons name="chevron-forward" size={12} color={theme.accent} />
            </View>
            <Text style={[styles.routeCity, { color: theme.text }]}>{item.destination.toUpperCase()}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: config.color + '15' }]}>
            <View style={[styles.statusDot, { backgroundColor: config.color }]} />
            <Text style={[styles.statusLabel, { color: config.color }]}>{config.label}</Text>
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
              {item.price ? `${item.price.toLocaleString('tr-TR')} + KDV` : '-'}
            </Text>
          </View>
          <View style={[styles.telemetryBox, { borderLeftWidth: 1, borderLeftColor: theme.border, paddingLeft: 15 }]}>
            <Text style={[styles.telemetryLabel, { color: theme.textLight }]}>ARAÇ TİPİ</Text>
            <Text style={[styles.telemetryValue, { color: theme.text }]}>
              {(item.required_vehicle_type || 'TIR').toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={[styles.actionBtn, { backgroundColor: isDarkMode ? '#1E293B' : '#F1F5F9' }]}>
           <Text style={[styles.actionBtnText, { color: item.status === 'COMPLETED' ? theme.text : theme.accent }]}>İLAN DETAYLARI</Text>
           <Ionicons name="chevron-forward" size={14} color={item.status === 'COMPLETED' ? theme.text : theme.accent} />
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

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style="light" />

      <View style={[styles.headerHero, { paddingTop: insets.top + 10 }]}>
        <LinearGradient
          colors={isDarkMode ? ['#0F172A', '#020617'] : [theme.primary, '#f35d18']}
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
        
        <View style={styles.filterContainer}>
          <TouchableOpacity 
             style={[styles.filterTab, activeFilter === 'OPEN' && { backgroundColor: '#2ECC71' }]} 
             onPress={() => setActiveFilter('OPEN')}
          >
             <Text style={[styles.filterText, activeFilter === 'OPEN' ? { color: '#000' } : { color: 'rgba(255,255,255,0.6)' }]}>AKTİF İLAN</Text>
             {activeFilter === 'OPEN' && <View style={styles.filterDot} />}
          </TouchableOpacity>
          
          <TouchableOpacity 
             style={[styles.filterTab, activeFilter === 'ASSIGNED' && { backgroundColor: '#F59E0B' }]} 
             onPress={() => setActiveFilter('ASSIGNED')}
          >
             <Text style={[styles.filterText, activeFilter === 'ASSIGNED' ? { color: '#000' } : { color: 'rgba(255,255,255,0.6)' }]}>YOLDA</Text>
             {activeFilter === 'ASSIGNED' && <View style={styles.filterDot} />}
          </TouchableOpacity>
          
          <TouchableOpacity 
             style={[styles.filterTab, activeFilter === 'COMPLETED' && { backgroundColor: 'rgba(255,255,255,0.2)' }]} 
             onPress={() => setActiveFilter('COMPLETED')}
          >
             <Text style={[styles.filterText, activeFilter === 'COMPLETED' ? { color: '#fff' } : { color: 'rgba(255,255,255,0.6)' }]}>BİTEN</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={displayedJobs}
        keyExtractor={(item) => item.id.toString()}
        renderItem={viewMode === 'list' ? renderJobListItem : renderJobItem}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={() => userId && fetchMyJobs(userId)} tintColor={theme.accent} />
        }
        ListEmptyComponent={
          !loading ? (
             <View style={styles.emptyBox}>
                <Ionicons name="folder-open-outline" size={48} color={theme.textLight} style={{ opacity: 0.5, marginBottom: 15 }} />
                <Text style={[styles.emptyText, { color: theme.textLight }]}>Bu aşamada listelenecek ilan bulunmuyor.</Text>
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
  filterContainer: { flexDirection: 'row', paddingHorizontal: 20, gap: 10 },
  filterTab: { flex: 1, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
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
  emptyText: { fontSize: 13, fontWeight: '600' }
});
