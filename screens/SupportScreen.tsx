import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Shadows } from '../constants/Theme';
import { StatusBar } from 'expo-status-bar';

const HEADER_BG = '#0F172A';
const ACCENT = '#F35D18';

export default function SupportScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();

  const handlePress = (type: 'whatsapp' | 'call' | 'mail') => {
    let url = '';
    switch (type) {
      case 'whatsapp': url = 'https://wa.me/905324017839'; break;
      case 'call': url = 'tel:+905324017839'; break;
      case 'mail': url = 'mailto:info@akkoclojistik.com.tr'; break;
    }
    Linking.openURL(url).catch(() => alert('Bu işlem şu an gerçekleştirilemiyor.'));
  };

  const renderContactCard = (icon: string, label: string, sub: string, color: string, type: any) => (
    <TouchableOpacity style={styles.card} onPress={() => handlePress(type)} activeOpacity={0.8}>
      <View style={[styles.iconBox, { backgroundColor: color }]}>
        <Ionicons name={icon as any} size={20} color="#fff" />
      </View>
      <View style={styles.cardText}>
        <Text style={styles.cardLabel}>{label}</Text>
        <Text style={styles.cardSub}>{sub}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Destek</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.logoBox}>
          <Image
            source={require('../assets/images/new_logo_horizontal.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <Text style={styles.sectionLabel}>BİZE ULAŞIN</Text>

        {renderContactCard('logo-whatsapp', 'WhatsApp Destek', '+90 532 401 78 39', '#25D366', 'whatsapp')}
        {renderContactCard('call-outline', 'Telefon', '0 532 401 78 39', ACCENT, 'call')}
        {renderContactCard('mail-outline', 'E-posta', 'info@akkoclojistik.com.tr', '#64748B', 'mail')}

        <Text style={styles.footer}>Operasyonel süreçlerinizde her zaman yanınızdayız.</Text>
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

  scrollContent: { padding: 20, paddingBottom: 40 },

  logoBox: { backgroundColor: HEADER_BG, borderRadius: 16, alignItems: 'center', padding: 20, marginBottom: 24, ...Shadows.medium },
  logo: { width: 200, height: 64 },

  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#94A3B8', letterSpacing: 1, marginBottom: 12, marginLeft: 2 },

  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', ...Shadows.medium },
  iconBox: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  cardText: { flex: 1 },
  cardLabel: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  cardSub: { fontSize: 12, color: '#64748B', marginTop: 2, fontWeight: '500' },

  footer: { textAlign: 'center', fontSize: 12, color: '#94A3B8', marginTop: 24, fontWeight: '500' },
});
