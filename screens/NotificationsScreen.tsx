import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Spacing, Radius, Shadows } from '../constants/Theme';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NOTIF_SETTINGS_KEY = '@notif_settings';

const DEFAULT_SETTINGS = {
  newJobs: true,
  updates: false,
  offers: true,
};

export default function NotificationsScreen({ navigation }: any) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  useEffect(() => {
    AsyncStorage.getItem(NOTIF_SETTINGS_KEY).then(raw => {
      if (raw) setSettings(JSON.parse(raw));
    });
  }, []);

  const toggleSetting = (key: keyof typeof settings) => {
    setSettings(prev => {
      const next = { ...prev, [key]: !prev[key] };
      AsyncStorage.setItem(NOTIF_SETTINGS_KEY, JSON.stringify(next));
      return next;
    });
  };

  const renderSwitchItem = (label: string, value: boolean, onValueChange: () => void, icon: string, isLast = false) => (
    <View style={[styles.settingRow, isLast && { borderBottomWidth: 0, paddingBottom: 0 }]}>
      <View style={styles.settingRowLeft}>
        <View style={[styles.iconBox, { backgroundColor: 'rgba(0,0,0,0.03)' }]}>
          <Ionicons name={icon as any} size={18} color={theme.accent} />
        </View>
        <Text style={[styles.settingLabel, { color: theme.text }]}>{label}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#334155', true: theme.accent }}
        thumbColor="#fff"
      />
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style="light" />

      {/* Immersive Mission Control Header */}
      <View style={[styles.headerHero, { paddingTop: insets.top + 10 }]}>
        <LinearGradient
          colors={[theme.primary, '#f35d18']}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={[styles.backButton, { backgroundColor: 'rgba(255,255,255,0.1)' }]} 
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={styles.titleContainer}>
             <Text style={styles.headerTitle}>BİLDİRİM KONTROLÜ</Text>
          </View>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 40, paddingTop: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          
          {/* Telemetry Control Block 1 */}
          <View style={[styles.specCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
             <View style={styles.specHeader}>
                <Ionicons name="filter-outline" size={16} color={theme.accent} />
                <Text style={[styles.specTitle, { color: theme.text }]}>GENEL BİLDİRİMLER</Text>
             </View>
             
             <View style={styles.controlGroup}>
                {renderSwitchItem('Yeni İlan Bildirimleri', settings.newJobs, () => toggleSetting('newJobs'), 'briefcase-outline')}
                {renderSwitchItem('Teklif Güncellemeleri', settings.offers, () => toggleSetting('offers'), 'notifications-outline', true)}
             </View>
          </View>

          {/* Telemetry Control Block 2 */}
          <View style={[styles.specCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
             <View style={styles.specHeader}>
                <Ionicons name="cloud-done-outline" size={16} color={theme.accent} />
                <Text style={[styles.specTitle, { color: theme.text }]}>SİSTEM VE GÜNCELLEMELER</Text>
             </View>
             
             <View style={styles.controlGroup}>
                {renderSwitchItem('Uygulama Güncellemeleri', settings.updates, () => toggleSetting('updates'), 'cloud-download-outline', true)}
             </View>
          </View>

          <Text style={[styles.infoFooter, { color: theme.textLight }]}>
            Bildirim ayarlarını değiştirerek hangi durumlarda telefonunuza anlık sistem uyarıları gelmesini istediğinizi belirtebilirsiniz.
          </Text>

        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerHero: { paddingHorizontal: 20, paddingBottom: 25, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, ...Shadows.medium },
  headerContent: { flexDirection: 'row', alignItems: 'center' },
  backButton: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  titleContainer: { flex: 1 },
  headerSubtitle: { color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '900', letterSpacing: -0.5, marginTop: 2 },
  scrollView: { flex: 1, marginTop: -15 },
  content: { padding: 20 },
  specCard: { padding: 20, borderRadius: Radius.xl, marginBottom: 20, borderWidth: 1, ...Shadows.medium },
  specHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(150,150,150,0.1)', paddingBottom: 15 },
  specTitle: { fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  controlGroup: { gap: 0 },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: 'rgba(150,150,150,0.1)' },
  settingRowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  iconBox: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  settingLabel: { fontSize: 14, fontWeight: '600' },
  infoFooter: { textAlign: 'center', fontSize: 11, lineHeight: 18, paddingHorizontal: 20, marginTop: 10, opacity: 0.8 }
});
