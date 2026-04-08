import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Spacing, Radius, Shadows } from '../constants/Theme';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';

export default function LegalDetailScreen({ route, navigation }: any) {
  const { docId, title } = route.params;
  const { theme, isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();

  const getLegalText = () => {
    switch (docId) {
      case 'terms':
        return `Bu uygulama Akkoç Lojistik tarafından sunulmaktadır. Uygulamayı kullanarak aşağıdaki şartları peşinen kabul etmiş sayılırsınız:

1. Hizmet Kapsamı: Uygulama, yük verenler ile yük taşıyıcıları (nakliyecileri) bir araya getiren dijital bir platformdur.

2. Üyelik: Kullanıcılar, kayıt sırasında verdikleri bilgilerin doğruluğundan sorumludur. Yanıltıcı bilgi veren hesaplar askıya alınabilir.

3. Güvenlik: Şifrenizin güvenliğinden siz sorumlusunuz. Şüpheli durumlarda lütfen derhal operasyon merkeziyle iletişime geçiniz.

4. Sorumluluk Sınırı: Akkoç Lojistik, taraflar arasındaki ticari anlaşmazlıklarda doğrudan taraf değildir; ancak sistem güvenliğini sağlamak için gerekli teknik moderasyonu yapar.`;
      
      case 'privacy':
        return `Operasyonel gizliliğiniz bizim için önemlidir. Verileriniz şu şekilde işlenmektedir:

1. Toplanan Veriler: İsim, telefon numarası, araç varlık bilgileri ve konum verileri (sadece yük takibi için) toplanmaktadır.

2. Veri Paylaşımı: Verileriniz üçüncü şahıslara satılmaz; sadece lojistik süreçlerinin yürütülmesi amacıyla (örneğin yük verenin şoföre yönlendirilmesi) paylaşılır.

3. Veri Güvenliği: Tüm telemetri verileriniz modern şifreleme yöntemleriyle güvenli bulut mimarilerinde saklanmaktadır.

4. Çerezler: Sistem deneyiminizi iyileştirmek için temel performans metriklerini izleyen çerezler kullanılmaktadır.`;

      case 'kvkk':
        return `6698 Sayılı Kişisel Verilerin Korunması Kanunu uyarınca:

1. Veri Sorumlusu: Akkoç Lojistik A.Ş.

2. Kişisel Veri İşleme Amacı: Lojistik operasyonlarının teknolojik yönetimi, veri güvenliğinin sağlanması ve yasal yükümlülüklerin yerine getirilmesi.

3. Haklarınız: Kişisel verilerinizin sistemlerimizde nasıl işlendiğini öğrenme, bilgi talep etme ve verilerin silinmesini (veri yok etme protokolü) isteme hakkına mutlak suretle sahipsiniz.`;
      
      default:
        return 'Sistem ilgili operasyonel metni yüklerken bir sorun yaşadı.';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style="light" />

      {/* Immersive Mission Control Header */}
      <View style={[styles.headerHero, { paddingTop: insets.top + 10 }]}>
        <LinearGradient
          colors={isDarkMode ? ['#0F172A', '#020617'] : [theme.primary, '#f35d18']}
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
             <Text style={styles.headerTitle} numberOfLines={2}>{title?.toUpperCase()}</Text>
          </View>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 40, paddingTop: 20 }}
        showsVerticalScrollIndicator={true}
      >
        <View style={styles.content}>
          <View style={[styles.specCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
             <View style={styles.specHeader}>
                <Ionicons name="information-circle-outline" size={16} color={theme.textLight} />
                <Text style={[styles.specTitle, { color: theme.textLight }]}>METİN BİLGİSİ</Text>
             </View>
             
             <Text style={[styles.legalBody, { color: theme.text }]}>
                {getLegalText()}
             </Text>

             <View style={[styles.telemetryDivider, { backgroundColor: theme.border }]} />
             <Text style={[styles.updateDate, { color: theme.success }]}>SON GÜNCELLEME: 31 MART 2026</Text>
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
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: -0.5, marginTop: 2 },
  scrollView: { flex: 1, marginTop: -15 },
  content: { padding: 20 },
  specCard: { padding: 20, borderRadius: Radius.xl, marginBottom: 20, borderWidth: 1, ...Shadows.medium },
  specHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(150,150,150,0.1)', paddingBottom: 15 },
  specTitle: { fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  legalBody: { fontSize: 14, lineHeight: 24, textAlign: 'left', fontWeight: '500' },
  telemetryDivider: { height: 1, width: '100%', marginVertical: 20, opacity: 0.5 },
  updateDate: { fontSize: 9, fontWeight: '900', letterSpacing: 1, textAlign: 'right' }
});
