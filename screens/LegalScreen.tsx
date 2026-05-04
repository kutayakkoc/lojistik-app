import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Spacing, Radius, Shadows } from '../constants/Theme';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '../lib/supabase';

const LEGAL_DOCS = [
  { id: 'terms', title: 'Sistem Kullanım Koşulları', icon: 'document-text-outline' },
  { id: 'privacy', title: 'Veri Gizlilik Politikası', icon: 'shield-checkmark-outline' },
  { id: 'kvkk', title: 'KVKK ve Veri İşleme Metni', icon: 'finger-print-outline' },
];

export default function LegalScreen({ navigation }: any) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const handleDeleteAccount = () => {
    Alert.alert(
      "Hesabı Kalıcı Olarak Sil",
      "Tüm verileriniz (ilanlar, başvurular, araç bilgileri) kalıcı olarak silinecek. Bu işlem geri alınamaz.",
      [
        { text: "Vazgeç", style: "cancel" },
        {
          text: "Devam Et",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Son Onay",
              "Hesabınızı silmek istediğinizden kesinlikle emin misiniz?",
              [
                { text: "İptal", style: "cancel" },
                {
                  text: "Evet, Hesabımı Sil",
                  style: "destructive",
                  onPress: async () => {
                    try {
                      const { error } = await supabase.rpc('delete_user');
                      if (error) throw error;
                      Alert.alert(
                        "Hesabınız Silindi",
                        "Tüm verileriniz kalıcı olarak silindi. Çıkış yapılıyor...",
                        [{ text: "Tamam", onPress: async () => { await supabase.auth.signOut(); } }]
                      );
                    } catch (error: any) {
                      Alert.alert("Hata", "İşlem sırasında bir sorun oluştu. Lütfen tekrar deneyin.");
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

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
            <Text style={styles.headerTitle}>GÜVENLİK VE YASAL</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 40, paddingTop: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <View style={[styles.specCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.specHeader}>
              <Ionicons name="library-outline" size={16} color={theme.accent} />
              <Text style={[styles.specTitle, { color: theme.text }]}>RESMİ SÖZLEŞMELER</Text>
            </View>

            <View style={styles.docList}>
              {LEGAL_DOCS.map((doc, index) => (
                <TouchableOpacity
                  key={doc.id}
                  style={[
                    styles.docItem,
                    index === LEGAL_DOCS.length - 1 && { borderBottomWidth: 0, paddingBottom: 0 }
                  ]}
                  onPress={() => navigation.navigate('LegalDetail', { docId: doc.id, title: doc.title })}
                >
                  <View style={styles.docItemLeft}>
                    <View style={[styles.iconBox, { backgroundColor: 'rgba(0,0,0,0.03)' }]}>
                      <Ionicons name={doc.icon as any} size={18} color={theme.accent} />
                    </View>
                    <Text style={[styles.docTitle, { color: theme.text }]}>{doc.title}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={theme.textLight} />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={[styles.specCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.specHeader}>
              <Ionicons name="settings-outline" size={16} color={theme.accent} />
              <Text style={[styles.specTitle, { color: theme.text }]}>HESAP YÖNETİMİ</Text>
            </View>

            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={handleDeleteAccount}
            >
              <View style={styles.docItemLeft}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(239, 68, 68, 0.05)' }]}>
                  <Ionicons name="trash-outline" size={18} color="#EF4444" />
                </View>
                <View>
                  <Text style={[styles.docTitle, { color: "#EF4444" }]}>Hesabımı Kalıcı Olarak Sil</Text>
                  <Text style={{ fontSize: 10, color: theme.textLight, marginTop: 2 }}>Verileriniz ve profiliniz tamamen kaldırılır.</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.infoFooter}>
            <Ionicons name="shield-checkmark" size={24} color={theme.accent} style={{ opacity: 0.5, marginBottom: 10 }} />
            <Text style={[styles.footerDesc, { color: theme.textLight }]}>Akkoç Lojistik Sistemleri Veri İşleme Protokolü V1.0.4</Text>
            <Text style={[styles.footerCopyright, { color: theme.textLight }]}>© 2026 Akkoç Bilişim ve Lojistik Teknolojileri</Text>
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
  specCard: { padding: 20, borderRadius: Radius.xl, marginBottom: 20, borderWidth: 1, ...Shadows.medium },
  specHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(150,150,150,0.1)', paddingBottom: 15 },
  specTitle: { fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  docList: { gap: 0 },
  docItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: 'rgba(150,150,150,0.1)' },
  docItemLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  iconBox: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  docTitle: { fontSize: 14, fontWeight: '600' },
  infoFooter: { alignItems: 'center', marginTop: 20 },
  footerDesc: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, opacity: 0.6, marginBottom: 4 },
  footerCopyright: { fontSize: 9, fontWeight: '500', opacity: 0.5 },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 5 },
});
