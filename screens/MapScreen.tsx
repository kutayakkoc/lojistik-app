import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';
import { Shadows, Radius } from '../constants/Theme';

const REGION_CITIES: Record<string, string[]> = {
  'Marmara': ['İstanbul', 'Bursa', 'Kocaeli', 'Tekirdağ', 'Edirne', 'Çanakkale', 'Balıkesir'],
  'Ege': ['İzmir', 'Manisa', 'Aydın', 'Denizli', 'Muğla', 'Uşak'],
  'Akdeniz': ['Antalya', 'Mersin', 'Adana', 'Hatay', 'Kahramanmaraş', 'Isparta'],
  'İç Anadolu': ['Ankara', 'Konya', 'Kayseri', 'Eskişehir', 'Nevşehir', 'Kırıkkale', 'Aksaray', 'Karaman'],
  'Karadeniz': ['Samsun', 'Trabzon', 'Ordu', 'Zonguldak', 'Kastamonu', 'Giresun', 'Rize'],
  'Doğu Anadolu': ['Erzurum', 'Malatya', 'Elazığ', 'Van', 'Erzincan', 'Muş', 'Bitlis', 'Ardahan'],
  'Güneydoğu Anadolu': ['Gaziantep', 'Şanlıurfa', 'Diyarbakır', 'Mardin', 'Batman', 'Siirt', 'Adıyaman'],
};

export default function MapScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('jobs')
      .select('id, origin, destination, cargo_details, price, required_vehicle_type, pickup_date')
      .eq('status', 'OPEN')
      .gte('pickup_date', today)
      .order('created_at', { ascending: false })
      .limit(100);
    setJobs(data || []);
    setLoading(false);
  };

  const originCounts: Record<string, any[]> = {};
  jobs.forEach(j => {
    if (!originCounts[j.origin]) originCounts[j.origin] = [];
    originCounts[j.origin].push(j);
  });

  const regions = Object.entries(REGION_CITIES).map(([region, cities]) => {
    const regionJobs = cities.flatMap(city => originCounts[city] || []);
    const activeCities = cities.filter(c => (originCounts[c] || []).length > 0);
    return { region, cities, regionJobs, activeCities };
  }).filter(r => r.regionJobs.length > 0 || !selectedRegion);

  const displayCities = selectedRegion
    ? (REGION_CITIES[selectedRegion] || []).filter(c => (originCounts[c] || []).length > 0)
    : Object.keys(originCounts).sort((a, b) => (originCounts[b]?.length || 0) - (originCounts[a]?.length || 0));

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 10, backgroundColor: theme.primary }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.headerTitle}>İLAN HARİTASI</Text>
          {!loading && (
            <Text style={styles.headerSub}>{jobs.length} aktif ilan · {Object.keys(originCounts).length} şehir</Text>
          )}
        </View>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={theme.accent} />
          <Text style={[styles.loadingText, { color: theme.textLight }]}>Harita yükleniyor...</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Bölge filtresi */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.regionStrip}>
            <TouchableOpacity
              style={[styles.regionChip, !selectedRegion && { backgroundColor: theme.accent }]}
              onPress={() => setSelectedRegion(null)}
            >
              <Text style={[styles.regionChipText, { color: !selectedRegion ? '#fff' : theme.text }]}>Tümü</Text>
            </TouchableOpacity>
            {Object.entries(REGION_CITIES).map(([region, cities]) => {
              const count = cities.reduce((s, c) => s + (originCounts[c]?.length || 0), 0);
              if (count === 0) return null;
              const active = selectedRegion === region;
              return (
                <TouchableOpacity
                  key={region}
                  style={[styles.regionChip, active && { backgroundColor: theme.accent }]}
                  onPress={() => setSelectedRegion(active ? null : region)}
                >
                  <Text style={[styles.regionChipText, { color: active ? '#fff' : theme.text }]}>{region}</Text>
                  <View style={[styles.regionCount, { backgroundColor: active ? 'rgba(255,255,255,0.25)' : theme.accent + '20' }]}>
                    <Text style={[styles.regionCountText, { color: active ? '#fff' : theme.accent }]}>{count}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Özet istatistik */}
          {!selectedRegion && (
            <View style={[styles.statsCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.statRow}>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: theme.accent }]}>{jobs.length}</Text>
                  <Text style={[styles.statLabel, { color: theme.textLight }]}>Toplam İlan</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: theme.accent }]}>{Object.keys(originCounts).length}</Text>
                  <Text style={[styles.statLabel, { color: theme.textLight }]}>Aktif Şehir</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: theme.accent }]}>
                    {Math.max(0, ...Object.values(originCounts).map(v => v.length))}
                  </Text>
                  <Text style={[styles.statLabel, { color: theme.textLight }]}>En Yoğun</Text>
                </View>
              </View>
            </View>
          )}

          {/* Şehir kartları */}
          <View style={styles.cityGrid}>
            {displayCities.map(city => {
              const cityJobs = originCounts[city] || [];
              if (cityJobs.length === 0) return null;
              const maxCount = Math.max(1, ...Object.values(originCounts).map(v => v.length));
              const intensity = cityJobs.length / maxCount;
              const bgOpacity = Math.round(intensity * 40 + 10);
              return (
                <View key={city} style={[styles.cityCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <View style={styles.cityCardTop}>
                    <View style={[styles.pinContainer, { backgroundColor: theme.accent + bgOpacity.toString(16).padStart(2, '0') }]}>
                      <Ionicons name="location" size={20} color={theme.accent} />
                      <Text style={[styles.pinCount, { color: theme.accent }]}>{cityJobs.length}</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={[styles.cityName, { color: theme.text }]}>{city}</Text>
                      <Text style={[styles.cityJobCount, { color: theme.textLight }]}>{cityJobs.length} ilan</Text>
                    </View>
                  </View>
                  <View style={[styles.progressBar, { backgroundColor: theme.border }]}>
                    <View style={[styles.progressFill, { width: `${intensity * 100}%` as any, backgroundColor: theme.accent }]} />
                  </View>
                  <View style={styles.destinationList}>
                    {[...new Set(cityJobs.slice(0, 3).map((j: any) => j.destination))].map((dest: any, i: number) => (
                      <View key={i} style={[styles.destChip, { backgroundColor: theme.accent + '12' }]}>
                        <Text style={[styles.destChipText, { color: theme.accent }]}>→ {dest}</Text>
                      </View>
                    ))}
                    {cityJobs.length > 3 && (
                      <View style={[styles.destChip, { backgroundColor: theme.border }]}>
                        <Text style={[styles.destChipText, { color: theme.textLight }]}>+{cityJobs.length - 3}</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>

          {displayCities.length === 0 && (
            <View style={styles.emptyWrap}>
              <Ionicons name="map-outline" size={48} color={theme.textLight} style={{ opacity: 0.4, marginBottom: 12 }} />
              <Text style={[styles.emptyText, { color: theme.textLight }]}>Bu bölgede aktif ilan bulunmuyor.</Text>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 14 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 15, fontWeight: '900', letterSpacing: 1 },
  headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '600', marginTop: 2 },
  loadingText: { marginTop: 12, fontSize: 13, fontWeight: '600' },
  regionStrip: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 14 },
  regionChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.06)' },
  regionChipText: { fontSize: 12, fontWeight: '800' },
  regionCount: { minWidth: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  regionCountText: { fontSize: 10, fontWeight: '900' },
  statsCard: { marginHorizontal: 16, borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 16, ...Shadows.sm },
  statRow: { flexDirection: 'row', alignItems: 'center' },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '900' },
  statLabel: { fontSize: 10, fontWeight: '700', marginTop: 2 },
  statDivider: { width: 1, height: 30 },
  cityGrid: { paddingHorizontal: 16, gap: 12 },
  cityCard: { borderRadius: Radius.xl, padding: 16, borderWidth: 1, ...Shadows.sm },
  cityCardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  pinContainer: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  pinCount: { fontSize: 10, fontWeight: '900', position: 'absolute', top: 3, right: 3 },
  cityName: { fontSize: 16, fontWeight: '900' },
  cityJobCount: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  progressBar: { height: 4, borderRadius: 2, marginBottom: 10, overflow: 'hidden' },
  progressFill: { height: 4, borderRadius: 2 },
  destinationList: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  destChip: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12 },
  destChipText: { fontSize: 11, fontWeight: '700' },
  emptyWrap: { alignItems: 'center', marginTop: 80 },
  emptyText: { fontSize: 13, fontWeight: '600' },
});
