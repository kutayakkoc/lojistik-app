import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { Shadows } from '../constants/Theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';

const HEADER_BG = '#1E3A8A';
const ACCENT = '#F35D18';

const MENU_ITEMS = [
  { icon: 'notifications-outline', label: 'Bildirimler',        screen: 'Notifications' },
  { icon: 'help-buoy-outline',     label: 'Destek',             screen: 'Support' },
  { icon: 'shield-checkmark-outline', label: 'Güvenlik ve Yasal', screen: 'Legal' },
] as const;

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [vehicle, setVehicle] = useState<any>(null);

  useEffect(() => {
    if (isFocused) fetchProfileAndVehicle();
  }, [isFocused]);

  const fetchProfileAndVehicle = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data: profileData, error: profileError } = await supabase
        .from('profiles').select('*').eq('id', session.user.id).limit(1).maybeSingle();
      if (profileError) throw profileError;
      setProfile(profileData);

      if (profileData?.role === 'DRIVER') {
        const { data: vehicleData } = await supabase
          .from('vehicles').select('*').eq('owner_id', session.user.id).limit(1).maybeSingle();
        setVehicle(vehicleData);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Çıkış Yap', 'Oturumu kapatmak istediğinize emin misiniz?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Çıkış Yap',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.auth.signOut();
          if (error) Alert.alert('Hata', error.message);
        },
      },
    ]);
  };

  const getCompletion = () => {
    const isDriver = profile?.role === 'DRIVER';
    const items = [
      { label: 'Ad Soyad', done: !!profile?.full_name, screen: 'EditProfile' },
      { label: 'Telefon',  done: !!profile?.phone,     screen: 'EditProfile' },
      ...(isDriver ? [
        { label: 'Araç Plakası', done: !!vehicle?.plate_number, screen: 'EditVehicle' },
        { label: 'Araç Tipi',   done: !!vehicle?.vehicle_type,  screen: 'EditVehicle' },
      ] : []),
    ];
    const pct = Math.round((items.filter(i => i.done).length / items.length) * 100);
    return { items, pct };
  };

  if (loading && !profile) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={ACCENT} />
      </View>
    );
  }

  const { items: completionItems, pct } = getCompletion();
  const missing = completionItems.filter(i => !i.done);
  const completionColor = pct === 100 ? '#16A34A' : pct >= 50 ? '#D97706' : '#DC2626';
  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* ── HEADER ─────────────────────────────────────────────── */}
      <LinearGradient
        colors={['#1E3A8A', '#020617']}
        style={[styles.header, { paddingTop: insets.top + 16 }]}
      >
        <View style={styles.headerRow}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => navigation.navigate('EditProfile')}
          >
            <Ionicons name="create-outline" size={16} color="#fff" />
            <Text style={styles.editBtnText}>Düzenle</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.userName}>{profile?.full_name || '—'}</Text>
        <View style={styles.roleBadge}>
          <View style={styles.onlineDot} />
          <Text style={styles.roleText}>
            {profile?.role === 'SHIPPER' ? 'Yük Veren' : 'Şoför'}
          </Text>
        </View>
        <Text style={styles.phoneText}>{profile?.phone || 'Telefon eklenmemiş'}</Text>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── TAMAMLANMA ─────────────────────────────────────── */}
        {pct < 100 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="checkmark-circle-outline" size={18} color={completionColor} />
              <Text style={styles.cardTitle}>Profil Tamamlanma</Text>
              <Text style={[styles.pctText, { color: completionColor }]}>{pct}%</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressBar, { width: `${pct}%`, backgroundColor: completionColor }]} />
            </View>
            {missing.map(item => (
              <TouchableOpacity
                key={item.label}
                onPress={() => navigation.navigate(item.screen)}
                style={styles.missingRow}
              >
                <Ionicons name="alert-circle-outline" size={15} color="#D97706" />
                <Text style={styles.missingLabel}>{item.label} eksik</Text>
                <Text style={styles.missingAction}>Ekle →</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ── HESAP BİLGİLERİ ────────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="person-outline" size={18} color={ACCENT} />
            <Text style={styles.cardTitle}>Hesap Bilgileri</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Telefon</Text>
            <Text style={styles.infoValue}>{profile?.phone || '—'}</Text>
          </View>
          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.infoLabel}>Rol</Text>
            <Text style={styles.infoValue}>{profile?.role === 'SHIPPER' ? 'Yük Veren' : 'Şoför'}</Text>
          </View>
          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('EditProfile')}>
            <Ionicons name="create-outline" size={16} color={ACCENT} />
            <Text style={styles.actionBtnText}>Profili Güncelle</Text>
          </TouchableOpacity>
        </View>

        {/* ── ARAÇ (DRIVER) ──────────────────────────────────── */}
        {profile?.role === 'DRIVER' && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="car-outline" size={18} color={ACCENT} />
              <Text style={styles.cardTitle}>Araç Bilgileri</Text>
            </View>
            {vehicle ? (
              <>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Plaka</Text>
                  <Text style={styles.infoValue}>{vehicle.plate_number?.toUpperCase() || '—'}</Text>
                </View>
                <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                  <Text style={styles.infoLabel}>Araç Tipi</Text>
                  <Text style={styles.infoValue}>{vehicle.vehicle_type || '—'}</Text>
                </View>
              </>
            ) : (
              <Text style={styles.noVehicleText}>Henüz araç eklenmemiş.</Text>
            )}
            <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('EditVehicle')}>
              <Ionicons name={vehicle ? 'settings-outline' : 'add-circle-outline'} size={16} color={ACCENT} />
              <Text style={styles.actionBtnText}>{vehicle ? 'Aracı Yönet' : 'Araç Ekle'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── AYARLAR ────────────────────────────────────────── */}
        <View style={styles.card}>
          {MENU_ITEMS.map((item, idx) => (
            <TouchableOpacity
              key={item.screen}
              style={[styles.menuRow, idx === MENU_ITEMS.length - 1 && { borderBottomWidth: 0 }]}
              onPress={() => navigation.navigate('Profile', { screen: item.screen })}
            >
              <View style={styles.menuRowLeft}>
                <View style={styles.menuIconBox}>
                  <Ionicons name={item.icon} size={18} color={ACCENT} />
                </View>
                <Text style={styles.menuLabel}>{item.label}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
            </TouchableOpacity>
          ))}
        </View>

        {/* ── ÇIKIŞ ──────────────────────────────────────────── */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={18} color="#DC2626" />
          <Text style={styles.logoutText}>Çıkış Yap</Text>
        </TouchableOpacity>

        <Text style={styles.version}>Versiyon 1.0.1 · Akkoç Lojistik</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F1F5F9' },

  // Header
  header: { paddingHorizontal: 20, paddingBottom: 36, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  avatarCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: ACCENT, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 28, fontWeight: '900', color: '#fff' },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  editBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  userName: { color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 8 },
  roleBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  onlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#22C55E' },
  roleText: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '600' },
  phoneText: { color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '500' },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 60 },

  // Card
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 16, ...Shadows.medium },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: '#0F172A' },
  pctText: { fontSize: 16, fontWeight: '900' },

  // Progress
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: '#F1F5F9', overflow: 'hidden', marginBottom: 14 },
  progressBar: { height: '100%', borderRadius: 3 },
  missingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  missingLabel: { flex: 1, fontSize: 13, color: '#64748B', fontWeight: '500' },
  missingAction: { fontSize: 13, fontWeight: '700', color: ACCENT },

  // Info rows
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  infoLabel: { fontSize: 13, color: '#94A3B8', fontWeight: '500' },
  infoValue: { fontSize: 14, color: '#0F172A', fontWeight: '700' },
  noVehicleText: { fontSize: 13, color: '#94A3B8', fontStyle: 'italic', paddingVertical: 12 },

  // Action button inside card
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16, backgroundColor: '#FFF7F4', borderRadius: 12, paddingVertical: 12, borderWidth: 1, borderColor: ACCENT + '30' },
  actionBtnText: { fontSize: 13, fontWeight: '700', color: ACCENT },

  // Menu rows
  menuRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  menuRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  menuIconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#FFF7F4', justifyContent: 'center', alignItems: 'center' },
  menuLabel: { fontSize: 14, fontWeight: '600', color: '#0F172A' },

  // Logout
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#FEF2F2', borderRadius: 14, paddingVertical: 14, marginBottom: 24, borderWidth: 1, borderColor: '#FCA5A5' },
  logoutText: { fontSize: 14, fontWeight: '700', color: '#DC2626' },

  // Version
  version: { textAlign: 'center', fontSize: 11, color: '#CBD5E1', fontWeight: '500' },
});
