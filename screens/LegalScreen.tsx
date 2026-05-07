import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Shadows } from '../constants/Theme';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '../lib/supabase';

const HEADER_BG = '#0F172A';
const ACCENT = '#F35D18';

const LEGAL_DOCS = [
  { id: 'terms',   title: 'Sistem Kullanım Koşulları',  icon: 'document-text-outline' },
  { id: 'privacy', title: 'Veri Gizlilik Politikası',   icon: 'shield-checkmark-outline' },
  { id: 'kvkk',   title: 'KVKK ve Veri İşleme Metni', icon: 'finger-print-outline' },
] as const;

export default function LegalScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();

  const handleDeleteAccount = () => {
    Alert.alert(
      'Hesabı Kalıcı Olarak Sil',
      'Tüm verileriniz (ilanlar, başvurular, araç bilgileri) kalıcı olarak silinecek. Bu işlem geri alınamaz.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Devam Et',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Son Onay',
              'Hesabınızı silmek istediğinizden kesinlikle emin misiniz?',
              [
                { text: 'İptal', style: 'cancel' },
                {
                  text: 'Evet, Hesabımı Sil',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      const { error } = await supabase.rpc('delete_user');
                      if (error) throw error;
                      Alert.alert(
                        'Hesabınız Silindi',
                        'Tüm verileriniz kalıcı olarak silindi. Çıkış yapılıyor...',
                        [{ text: 'Tamam', onPress: async () => { await supabase.auth.signOut(); } }],
                      );
                    } catch {
                      Alert.alert('Hata', 'İşlem sırasında bir sorun oluştu. Lütfen tekrar deneyin.');
                    }
                  },
                },
              ],
            );
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Güvenlik ve Yasal</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="library-outline" size={18} color={ACCENT} />
            <Text style={styles.cardTitle}>Resmi Sözleşmeler</Text>
          </View>
          {LEGAL_DOCS.map((doc, index) => (
            <TouchableOpacity
              key={doc.id}
              style={[styles.menuRow, index === LEGAL_DOCS.length - 1 && { borderBottomWidth: 0 }]}
              onPress={() => navigation.navigate('LegalDetail', { docId: doc.id, title: doc.title })}
            >
              <View style={styles.menuRowLeft}>
                <View style={styles.menuIconBox}>
                  <Ionicons name={doc.icon as any} size={18} color={ACCENT} />
                </View>
                <Text style={styles.menuLabel}>{doc.title}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="settings-outline" size={18} color={ACCENT} />
            <Text style={styles.cardTitle}>Hesap Yönetimi</Text>
          </View>
          <TouchableOpacity style={[styles.menuRow, { borderBottomWidth: 0 }]} onPress={handleDeleteAccount}>
            <View style={styles.menuRowLeft}>
              <View style={[styles.menuIconBox, { backgroundColor: '#FEF2F2' }]}>
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
              </View>
              <View>
                <Text style={[styles.menuLabel, { color: '#EF4444' }]}>Hesabımı Kalıcı Olarak Sil</Text>
                <Text style={styles.menuSub}>Verileriniz ve profiliniz tamamen kaldırılır.</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>© 2026 Akkoç Bilişim ve Lojistik Teknolojileri</Text>
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

  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 16, ...Shadows.medium },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A' },

  menuRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  menuRowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 14 },
  menuIconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#FFF7F4', justifyContent: 'center', alignItems: 'center' },
  menuLabel: { fontSize: 14, fontWeight: '600', color: '#0F172A' },
  menuSub: { fontSize: 11, color: '#94A3B8', marginTop: 2 },

  footer: { textAlign: 'center', fontSize: 11, color: '#CBD5E1', marginTop: 8 },
});
