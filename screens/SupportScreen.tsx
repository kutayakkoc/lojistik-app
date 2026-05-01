import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Spacing, Radius, Shadows } from '../constants/Theme';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';

export default function SupportScreen({ navigation }: any) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const handlePress = (type: 'whatsapp' | 'call' | 'mail') => {
    let url = '';
    switch (type) {
      case 'whatsapp':
        url = 'https://wa.me/905324017839'; 
        break;
      case 'call':
        url = 'tel:+905324017839';
        break;
      case 'mail':
        url = 'mailto:info@akkoclojistik.com.tr';
        break;
    }
    Linking.openURL(url).catch(() => {
      alert('Bu işlem şu an gerçekleştirilemiyor.');
    });
  };

  const renderSupportCard = (icon: string, label: string, sub: string, color: string, type: any) => (
    <TouchableOpacity 
      style={[styles.specCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
      onPress={() => handlePress(type)}
      activeOpacity={0.8}
    >
      <View style={[styles.iconContainer, { backgroundColor: color }]}>
        <Ionicons name={icon as any} size={22} color="#fff" />
      </View>
      <View style={styles.textContainer}>
        <Text style={[styles.cardLabel, { color: theme.text }]}>{label}</Text>
        <Text style={[styles.cardSub, { color: theme.textLight }]}>{sub}</Text>
      </View>
      <View style={[styles.actionBadge, { backgroundColor: '#F1F5F9' }]}>
        <Ionicons name="link-outline" size={16} color={theme.accent} />
      </View>
    </TouchableOpacity>
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
             <Text style={styles.headerTitle}>OPERASYONEL DESTEK</Text>
          </View>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 40, paddingTop: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <View style={styles.brandBox}>
            <View style={[
              styles.logoContainer, 
              { 
                backgroundColor: '#0F172A',
                borderColor: theme.border,
              }
            ]}>
              <Image 
                source={require('../assets/images/512x512 akkoc tahta.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
          </View>

          <Text style={[styles.sectionMainTitle, { color: theme.textLight }]}>BİZE ULAŞIN</Text>
          
          {renderSupportCard('logo-whatsapp', 'WhatsApp Sistem Destek', '+90 532 401 78 39', '#25D366', 'whatsapp')}
          {renderSupportCard('call-outline', 'Arama ve Müşteri Destek', '0 532 401 78 39', theme.accent, 'call')}
          {renderSupportCard('mail-outline', 'Yazılı E-posta Kanalları', 'info@akkoclojistik.com.tr', '#64748B', 'mail')}

          <View style={[styles.infoFooter, { marginTop: Spacing.xl }]}>
            <View style={[styles.telemetryDivider, { backgroundColor: theme.border }]} />
            <Text style={[styles.versionText, { color: theme.textLight }]}>AKKOÇ LOJİSTİK SİSTEMLERİ V1.0.4</Text>
            <Text style={[styles.footerDesc, { color: theme.textLight }]}>Operasyonel süreçlerinizde her zaman yanınızdayız.</Text>
          </View>
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
  brandBox: { alignItems: 'center', marginBottom: 30, marginTop: 10 },
  logoContainer: { padding: 15, borderRadius: Radius.lg, borderWidth: 1, ...Shadows.sm },
  logo: { width: 80, height: 80 },
  sectionMainTitle: { fontSize: 11, fontWeight: '900', letterSpacing: 1.5, marginBottom: 15, marginLeft: 4, opacity: 0.8 },
  specCard: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: Radius.xl, marginBottom: 15, borderWidth: 1, ...Shadows.medium },
  iconContainer: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 15, ...Shadows.sm },
  textContainer: { flex: 1 },
  cardLabel: { fontSize: 15, fontWeight: '800' },
  cardSub: { fontSize: 12, marginTop: 4, fontWeight: '500' },
  actionBadge: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  infoFooter: { alignItems: 'center', opacity: 0.7 },
  telemetryDivider: { height: 1, width: '30%', marginBottom: 15 },
  versionText: { fontSize: 9, fontWeight: '900', letterSpacing: 1.5, marginBottom: 6 },
  footerDesc: { fontSize: 11, fontWeight: '600', textAlign: 'center' },
});
