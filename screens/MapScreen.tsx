import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { Shadows } from '../constants/Theme';

const HEADER_BG = '#0F172A';
const ACCENT = '#F35D18';

const REGION_CITIES: Record<string, string[]> = {
  'Marmara':            ['İstanbul', 'Bursa', 'Kocaeli', 'Tekirdağ', 'Edirne', 'Çanakkale', 'Balıkesir'],
  'Ege':                ['İzmir', 'Manisa', 'Aydın', 'Denizli', 'Muğla', 'Uşak'],
  'Akdeniz':            ['Antalya', 'Mersin', 'Adana', 'Hatay', 'Kahramanmaraş', 'Isparta'],
  'İç Anadolu':         ['Ankara', 'Konya', 'Kayseri', 'Eskişehir', 'Nevşehir', 'Kırıkkale', 'Aksaray', 'Karaman'],
  'Karadeniz':          ['Samsun', 'Trabzon', 'Ordu', 'Zonguldak', 'Kastamonu', 'Giresun', 'Rize'],
  'Doğu Anadolu':       ['Erzurum', 'Malatya', 'Elazığ', 'Van', 'Erzincan', 'Muş', 'Bitlis', 'Ardahan'],
  'Güneydoğu Anadolu':  ['Gaziantep', 'Şanlıurfa', 'Diyarbakır', 'Mardin', 'Batman', 'Siirt', 'Adıyaman'],
};

export default function MapScreen() {
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

  const displayCities = selectedRegion
    ? (REGION_CITIES[selectedRegion] || []).filter(c => (originCounts[c] || []).length > 0)
    : Object.keys(originCounts).sort((a, b) => (originCounts[b]?.length || 0) - (originCounts[a]?.length || 0));

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.headerTitle}>İlan Haritası</Text>
          {!loading && (
            <Text style={styles.headerSub}>{jobs.length} aktif ilan · {Object.keys(originCounts).length} şehir</Text>
          )}
        </View>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={ACCENT} />
          <Text style={styles.loadingText}>Harita yükleniyor...</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Region filter */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.regionStrip}>
            <TouchableOpacity
              style={[styles.regionChip, !selectedRegion && { backgroundColor: ACCENT }]}
              onPress={() => setSelectedRegion(null)}
            >
              <Text style={[styles.regionChipText, { color: !selectedRegion ? '#fff' : '#0F172A' }]}>Tümü</Text>
            </TouchableOpacity>
            {Object.entries(REGION_CITIES).map(([region, cities]) => {
              const count = cities.reduce((s, c) => s + (originCounts[c]?.length || 0), 0);
              if (count === 0) return null;
              const active = selectedRegion === region;
              return (
                <TouchableOpacity
                  key={region}
                  style={[styles.regionChip, active && { backgroundColor: ACCENT }]}
                  onPress={() => setSelectedRegion(active ? null : region)}
                >
                  <Text style={[styles.regionChipText, { color: active ? '#fff' : '#0F172A' }]}>{region}</Text>
                  <View style={[styles.regionCount, { backgroundColor: active ? 'rgba(255,255,255,0.25)' : ACCENT + '20' }]}>
                    <Text style={[styles.regionCountText, { color: active ? '#fff' : ACCENT }]}>{count}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Stats */}
          {!selectedRegion && (
            <View style={styles.statsCard}>
              <View style={styles.statRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{jobs.length}</Text>
                  <Text style={styles.statLabel}>Toplam İlan</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{Object.keys(originCounts).length}</Text>
                  <Text style={styles.statLabel}>Aktif Şehir</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {Math.max(0, ...Object.values(originCounts).map(v => v.length))}
                  </Text>
                  <Text style={styles.statLabel}>En Yoğun</Text>
                </View>
              </View>
            </View>
          )}

          {/* City cards */}
          <View style={styles.cityGrid}>
            {displayCities.map(city => {
              const cityJobs = originCounts[city] || [];
              if (cityJobs.length === 0) return null;
              const maxCount = Math.max(1, ...Object.values(originCounts).map(v => v.length));
              const intensity = cityJobs.length / maxCount;

              return (
                <View key={city} style={styles.cityCard}>
                  <View style={styles.cityCardTop}>
                    <View style={[styles.pinBox, { backgroundColor: ACCENT + Math.round(intensity * 40 + 10).toString(16).padStart(2, '0') }]}>
                      <Ionicons name="location" size={18} color={ACCENT} />
                      <Text style={styles.pinCount}>{cityJobs.length}</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.cityName}>{city}</Text>
                      <Text style={styles.cityJobCount}>{cityJobs.length} ilan</Text>
                    </View>
                  </View>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${intensity * 100}%` as any }]} />
                  </View>
                  <View style={styles.destList}>
                    {[...new Set(cityJobs.slice(0, 3).map((j: any) => j.destination))].map((dest: any, i: number) => (
                      <View key={i} style={styles.destChip}>
                        <Text style={styles.destChipText}>→ {dest}</Text>
                      </View>
                    ))}
                    {cityJobs.length > 3 && (
                      <View style={[styles.destChip, { backgroundColor: '#F1F5F9' }]}>
                        <Text style={[styles.destChipText, { color: '#64748B' }]}>+{cityJobs.length - 3}</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>

          {displayCities.length === 0 && (
            <View style={styles.emptyWrap}>
              <Ionicons name="map-outline" size={48} color="#CBD5E1" style={{ marginBottom: 12 }} />
              <Text style={styles.emptyText}>Bu bölgede aktif ilan bulunmuyor.</Text>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 14, backgroundColor: HEADER_BG },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '800' },
  headerSub: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '600', marginTop: 2 },

  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 13, fontWeight: '600', color: '#94A3B8' },

  regionStrip: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 14 },
  regionChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, backgroundColor: '#E2E8F0' },
  regionChipText: { fontSize: 12, fontWeight: '800' },
  regionCount: { minWidth: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  regionCountText: { fontSize: 10, fontWeight: '900' },

  statsCard: { marginHorizontal: 16, borderRadius: 16, padding: 16, marginBottom: 16, backgroundColor: '#fff', ...Shadows.medium },
  statRow: { flexDirection: 'row', alignItems: 'center' },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '900', color: ACCENT },
  statLabel: { fontSize: 10, fontWeight: '700', color: '#94A3B8', marginTop: 2 },
  statDivider: { width: 1, height: 30, backgroundColor: '#E2E8F0' },

  cityGrid: { paddingHorizontal: 16, gap: 12 },
  cityCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, ...Shadows.medium },
  cityCardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  pinBox: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  pinCount: { fontSize: 9, fontWeight: '900', color: ACCENT, position: 'absolute', top: 3, right: 3 },
  cityName: { fontSize: 16, fontWeight: '900', color: '#0F172A' },
  cityJobCount: { fontSize: 11, fontWeight: '600', color: '#94A3B8', marginTop: 2 },
  progressBar: { height: 4, borderRadius: 2, marginBottom: 10, overflow: 'hidden', backgroundColor: '#E2E8F0' },
  progressFill: { height: 4, borderRadius: 2, backgroundColor: ACCENT },
  destList: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  destChip: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 10, backgroundColor: ACCENT + '12' },
  destChipText: { fontSize: 11, fontWeight: '700', color: ACCENT },

  emptyWrap: { alignItems: 'center', marginTop: 80 },
  emptyText: { fontSize: 13, fontWeight: '600', color: '#94A3B8' },
});
