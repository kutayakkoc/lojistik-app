import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Switch,
  Dimensions,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { Colors, Spacing, Shadows, Radius } from '../constants/Theme';
import { useTheme } from '../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';

const { width } = Dimensions.get('window');

export default function ProfileScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();
  
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [vehicle, setVehicle] = useState<any>(null);

  useEffect(() => {
    if (isFocused) {
      fetchProfileAndVehicle();
    }
  }, [isFocused]);

  const fetchProfileAndVehicle = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) return;

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .limit(1)
        .maybeSingle();

      if (profileError) throw profileError;
      setProfile(profileData);

      if (profileData?.role === 'DRIVER') {
        const { data: vehicleData, error: vehicleError } = await supabase
          .from('vehicles')
          .select('*')
          .eq('owner_id', session.user.id)
          .limit(1)
          .maybeSingle();

        if (!vehicleError) setVehicle(vehicleData);
      }
    } catch (error: any) {
      // fetchProfile Error
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      "Oturumu Kapat",
      "Sistemden çıkış yapmak istediğinize emin misiniz?",
      [
        { text: "Vazgeç", style: "cancel" },
        { 
          text: "Çıkış Yap", 
          style: "destructive", 
          onPress: async () => {
            const { error } = await supabase.auth.signOut();
            if (error) Alert.alert('Hata', error.message);
          } 
        }
      ]
    );
  };

  const getCompletion = () => {
    const isDriver = profile?.role === 'DRIVER';
    const items = [
      { label: 'Ad Soyad', done: !!profile?.full_name, screen: 'EditProfile' },
      { label: 'Telefon', done: !!profile?.phone, screen: 'EditProfile' },
      ...(isDriver ? [
        { label: 'Araç Plakası', done: !!vehicle?.plate_number, screen: 'EditVehicle' },
        { label: 'Araç Tipi', done: !!vehicle?.vehicle_type, screen: 'EditVehicle' },
      ] : []),
    ];
    const pct = Math.round((items.filter(i => i.done).length / items.length) * 100);
    return { items, pct };
  };

  if (loading && !profile) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.accent} />
        <Text style={[styles.loadingText, { color: theme.textLight }]}>Kimlik verileri doğrulanıyor...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style="light" />
      
      {/* Immersive Mission Control Header */}
      <View style={[styles.headerHero, { paddingTop: insets.top + 20 }]}>
        <LinearGradient
          colors={[theme.primary, '#f35d18']}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.headerContent}>
           <View style={styles.identityBadge}>
              <View style={[styles.avatarGlow, { backgroundColor: theme.accent + '33' }]}>
                 <View style={[styles.avatarCircle, { backgroundColor: theme.surface }]}>
                    <Text style={[styles.avatarText, { color: theme.text }]}>
                      {profile?.full_name?.charAt(0).toUpperCase() || '?'}
                    </Text>
                 </View>
              </View>
              <View style={styles.identityInfo}>
                 <Text style={styles.userNameHeader}>{profile?.full_name}</Text>
                 <View style={styles.roleTag}>
                    <View style={styles.pulseDot} />
                    <Text style={styles.roleTagText}>
                       {profile?.role === 'SHIPPER' ? 'SİSTEM İŞVERENİ' : 'YÜK TAŞIYICI'}
                    </Text>
                 </View>
              </View>
           </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 100, paddingTop: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {/* Profil Tamamlanma */}
          {profile && (() => {
            const { items, pct } = getCompletion();
            const color = pct === 100 ? '#22C55E' : pct >= 50 ? '#F59E0B' : '#EF4444';
            const missing = items.filter(i => !i.done);
            return (
              <View style={[styles.specCard, { backgroundColor: theme.surface, borderColor: theme.border, marginBottom: 20 }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <Text style={[styles.specTitle, { color: theme.text }]}>PROFİL TAMAMLANMA</Text>
                  <Text style={{ fontSize: 18, fontWeight: '900', color }}>{pct}%</Text>
                </View>
                <View style={{ height: 8, borderRadius: 4, backgroundColor: theme.border, overflow: 'hidden' }}>
                  <View style={{ width: `${pct}%`, height: '100%', borderRadius: 4, backgroundColor: color }} />
                </View>
                {missing.length > 0 && (
                  <View style={{ marginTop: 12, gap: 6 }}>
                    {missing.map(item => (
                      <TouchableOpacity
                        key={item.label}
                        onPress={() => navigation.navigate(item.screen)}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
                      >
                        <Ionicons name="alert-circle-outline" size={16} color="#F59E0B" />
                        <Text style={{ fontSize: 12, fontWeight: '600', color: theme.textLight }}>{item.label} eksik —</Text>
                        <Text style={{ fontSize: 12, fontWeight: '800', color: theme.accent }}>Ekle</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            );
          })()}
          {/* Account Spec Card */}
          <View style={[styles.specCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
             <View style={styles.specHeader}>
                <Ionicons name="person-outline" size={16} color={theme.accent} />
                <Text style={[styles.specTitle, { color: theme.text }]}>HESAP VERİLERİ</Text>
             </View>
             
             <View style={styles.telemetryGrid}>
                <View style={styles.telemetryBox}>
                   <Text style={[styles.telemetryLabel, { color: theme.textLight }]}>TELEFON</Text>
                   <Text style={[styles.telemetryValue, { color: theme.text }]}>{profile?.phone || '-'}</Text>
                </View>
             </View>

             <TouchableOpacity 
               style={[styles.editActionBtn, { backgroundColor: '#F1F5F9' }]}
               onPress={() => navigation.navigate('EditProfile')}
             >
                <Ionicons name="create-outline" size={18} color={theme.accent} />
                <Text style={[styles.editActionText, { color: theme.text }]}>PROFİLİ GÜNCELLE</Text>
             </TouchableOpacity>
          </View>

          {/* Vehicle Spec Card (Driver Only) */}
          {profile?.role === 'DRIVER' && (
            <View style={[styles.specCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
               <View style={styles.specHeader}>
                  <FontAwesome5 name="truck" size={14} color={theme.accent} />
                  <Text style={[styles.specTitle, { color: theme.text }]}>ARAÇ VARLIKLARI</Text>
               </View>

               {vehicle ? (
                  <View style={styles.telemetryGrid}>
                    <View style={styles.telemetryBox}>
                       <Text style={[styles.telemetryLabel, { color: theme.textLight }]}>PLAKA</Text>
                       <Text style={[styles.telemetryValue, { color: theme.text }]}>{vehicle.plate_number?.toUpperCase()}</Text>
                    </View>
                    <View style={[styles.telemetryBox, { borderLeftWidth: 1, borderLeftColor: theme.border, paddingLeft: 15 }]}>
                       <Text style={[styles.telemetryLabel, { color: theme.textLight }]}>ARAÇ TİPİ</Text>
                       <Text style={[styles.telemetryValue, { color: theme.text }]}>{vehicle.vehicle_type}</Text>
                    </View>
                  </View>
               ) : (
                  <View style={styles.noAssetBox}>
                     <Text style={[styles.noAssetText, { color: theme.textLight }]}>Henüz bir araç tanımlanmadı.</Text>
                  </View>
               )}

               <TouchableOpacity 
                 style={[styles.editActionBtn, { backgroundColor: '#F1F5F9' }]}
                 onPress={() => navigation.navigate('EditVehicle')}
               >
                  <Ionicons name={vehicle ? "settings-outline" : "add-circle-outline"} size={18} color={theme.accent} />
                  <Text style={[styles.editActionText, { color: theme.text }]}>{vehicle ? 'ARACI YÖNET' : 'ARAÇ EKLE'}</Text>
               </TouchableOpacity>
            </View>
          )}

          {/* Command Console (Settings) */}
          <View style={[styles.specCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
             <View style={styles.specHeader}>
                <Ionicons name="settings-outline" size={16} color={theme.accent} />
                <Text style={[styles.specTitle, { color: theme.text }]}>AYARLAR</Text>
             </View>

             <View style={styles.consoleList}>
                <TouchableOpacity 
                   style={styles.consoleItem}
                   onPress={() => navigation.navigate('Profile', { screen: 'Notifications' })}
                >
                   <View style={styles.consoleItemLeft}>
                      <Ionicons name="notifications-outline" size={20} color={theme.textLight} />
                      <Text style={[styles.consoleText, { color: theme.text }]}>Bildirim Kontrolü</Text>
                   </View>
                   <Ionicons name="chevron-forward" size={16} color={theme.textLight} />
                </TouchableOpacity>

                <TouchableOpacity 
                   style={styles.consoleItem}
                   onPress={() => navigation.navigate('Profile', { screen: 'Support' })}
                >
                   <View style={styles.consoleItemLeft}>
                      <Ionicons name="help-buoy-outline" size={20} color={theme.textLight} />
                      <Text style={[styles.consoleText, { color: theme.text }]}>Operasyonel Destek</Text>
                   </View>
                   <Ionicons name="chevron-forward" size={16} color={theme.textLight} />
                </TouchableOpacity>

                <TouchableOpacity 
                   style={[styles.consoleItem, { borderBottomWidth: 0 }]}
                   onPress={() => navigation.navigate('Profile', { screen: 'Legal' })}
                >
                   <View style={styles.consoleItemLeft}>
                      <Ionicons name="shield-checkmark-outline" size={20} color={theme.textLight} />
                      <Text style={[styles.consoleText, { color: theme.text }]}>Güvenlik ve Yasal</Text>
                   </View>
                   <Ionicons name="chevron-forward" size={16} color={theme.textLight} />
                </TouchableOpacity>
             </View>
          </View>

          <TouchableOpacity style={[styles.logoutBtn, { borderColor: theme.danger }]} onPress={handleLogout}>
             <Ionicons name="power-outline" size={20} color={theme.danger} />
             <Text style={[styles.logoutBtnText, { color: theme.danger }]}>SİSTEMDEN ÇIKIŞ YAP</Text>
          </TouchableOpacity>

          <View style={styles.versionFooter}>
             <Text style={[styles.versionText, { color: theme.textLight }]}>Versiyon 1.0.0 (RC)</Text>
             <Text style={[styles.versionText, { color: theme.textLight, marginTop: 4 }]}>Akkoç Lojistik Dijital Altyapı</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 15, fontSize: 13, fontWeight: '600', letterSpacing: 0.5 },
  headerHero: { paddingHorizontal: 20, paddingBottom: 30, borderBottomLeftRadius: 40, borderBottomRightRadius: 40, ...Shadows.medium },
  headerContent: { alignItems: 'center' },
  identityBadge: { alignItems: 'center' },
  avatarGlow: { padding: 8, borderRadius: 60 },
  avatarCircle: { width: 90, height: 90, borderRadius: 45, justifyContent: 'center', alignItems: 'center', ...Shadows.large },
  avatarText: { fontSize: 36, fontWeight: '900' },
  identityInfo: { alignItems: 'center', marginTop: 15 },
  userNameHeader: { color: '#fff', fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  roleTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 20, marginTop: 8 },
  pulseDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22C55E', marginRight: 6 },
  roleTagText: { color: 'rgba(255,255,255,0.8)', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  scrollView: { flex: 1, marginTop: 0 },
  content: { padding: 20 },
  specCard: { padding: 20, borderRadius: Radius.xl, marginBottom: 20, borderWidth: 1, ...Shadows.medium },
  specHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  specTitle: { fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  telemetryGrid: { flexDirection: 'row', marginBottom: 20 },
  telemetryBox: { flex: 1 },
  telemetryLabel: { fontSize: 8, fontWeight: '900', letterSpacing: 1.5, marginBottom: 4 },
  telemetryValue: { fontSize: 16, fontWeight: '800' },
  editActionBtn: { height: 44, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  editActionText: { fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
  noAssetBox: { paddingVertical: 20, alignItems: 'center' },
  noAssetText: { fontSize: 13, fontWeight: '500', fontStyle: 'italic' },
  consoleList: { marginTop: 5 },
  consoleItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: 'rgba(150,150,150,0.1)' },
  consoleItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  consoleText: { fontSize: 14, fontWeight: '600' },
  logoutBtn: { height: 54, borderRadius: 16, borderWidth: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 10, alignSelf: 'center', width: '70%', marginBottom: 50 },
  logoutBtnText: { fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  versionFooter: { marginTop: 40, alignItems: 'center', marginBottom: 60, opacity: 0.5 },
  versionText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
});
