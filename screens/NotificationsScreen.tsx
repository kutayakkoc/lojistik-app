import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Shadows } from '../constants/Theme';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';

const HEADER_BG = '#0F172A';
const ACCENT = '#F35D18';
const NOTIF_SETTINGS_KEY = '@notif_settings';

const DEFAULT_SETTINGS = {
  newJobs: true,
  updates: false,
  offers: true,
};

export default function NotificationsScreen({ navigation }: any) {
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

  const renderSwitchItem = (
    label: string,
    value: boolean,
    onValueChange: () => void,
    icon: string,
    isLast = false,
  ) => (
    <View style={[styles.settingRow, isLast && { borderBottomWidth: 0 }]}>
      <View style={styles.settingRowLeft}>
        <View style={styles.iconBox}>
          <Ionicons name={icon as any} size={18} color={ACCENT} />
        </View>
        <Text style={styles.settingLabel}>{label}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#CBD5E1', true: ACCENT }}
        thumbColor="#fff"
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Bildirimler</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="filter-outline" size={18} color={ACCENT} />
            <Text style={styles.cardTitle}>Genel Bildirimler</Text>
          </View>
          {renderSwitchItem('Yeni İlan Bildirimleri', settings.newJobs, () => toggleSetting('newJobs'), 'briefcase-outline')}
          {renderSwitchItem('Teklif Güncellemeleri', settings.offers, () => toggleSetting('offers'), 'notifications-outline', true)}
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="cloud-done-outline" size={18} color={ACCENT} />
            <Text style={styles.cardTitle}>Sistem ve Güncellemeler</Text>
          </View>
          {renderSwitchItem('Uygulama Güncellemeleri', settings.updates, () => toggleSetting('updates'), 'cloud-download-outline', true)}
        </View>

        <Text style={styles.infoFooter}>
          Bildirim ayarlarını değiştirerek hangi durumlarda telefonunuza anlık bildirimler gelmesini istediğinizi belirleyebilirsiniz.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },

  header: { backgroundColor: HEADER_BG, paddingHorizontal: 20, paddingBottom: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },

  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },

  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 16, ...Shadows.medium },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A' },

  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  settingRowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  iconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#FFF7F4', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  settingLabel: { fontSize: 14, fontWeight: '600', color: '#0F172A' },

  infoFooter: { textAlign: 'center', fontSize: 12, lineHeight: 18, color: '#94A3B8', paddingHorizontal: 20, marginTop: 4 },
});
