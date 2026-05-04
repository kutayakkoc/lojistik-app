import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Spacing, Radius, Shadows } from '../constants/Theme';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';

export const getLegalText = (docId: string) => {
    switch (docId) {
      case 'terms':
        return `KULLANICI SÖZLEŞMESİ VE HİZMET ŞARTLARI

1. TARAFLAR
Bu Kullanıcı Sözleşmesi ("Sözleşme"), "Akkoç Lojistik" mobil uygulamasını ("Uygulama") kullanan yük veren, nakliyeci veya şoför ("Kullanıcı") ile Uygulama'nın sahibi Akkoç Bilişim ve Lojistik Teknolojileri ("Şirket") arasında, Kullanıcı'nın Uygulama'ya kayıt olması veya Uygulama'yı kullanmaya başlaması ile elektronik ortamda akdedilmiştir.

2. HİZMETİN TANIMI VE KAPSAMI
Akkoç Lojistik, yük taşıtmak isteyenler (Yük Veren) ile yük taşımak isteyen araç sahiplerini/şoförleri (Taşıyıcı) dijital ortamda bir araya getiren bir platformdur. Şirket, bizzat nakliye hizmeti vermemekte, yalnızca tarafların buluşmasına ve iletişime geçmesine aracılık etmektedir.

3. KULLANICININ HAK VE YÜKÜMLÜLÜKLERİ
3.1. Kullanıcı, Uygulama'ya kayıt olurken verdiği bilgilerin eksiksiz, doğru ve güncel olduğunu beyan eder. Yanıltıcı bilgilerden doğacak zararlardan Kullanıcı sorumludur.
3.2. Taşıyıcı Kullanıcılar, taşıma işini yerine getirmek için gerekli olan SRC, Psikoteknik, K yetki belgesi vb. yasal evraklara ve sigortalara (örn: Emtia Sigortası) sahip olduğunu kabul ve taahhüt eder.
3.3. Uygulama üzerinden anlaşılan taşıma işlemlerinde, taşınan malın hasar görmesi, kaybolması veya gecikmesi gibi durumlarda tüm hukuki ve cezai sorumluluk Taşıyıcı ve Yük Veren'e aittir. Şirket'in bu hususlarda hiçbir sorumluluğu bulunmamaktadır.
3.4. Kullanıcı, hesabının ve şifresinin güvenliğinden bizzat sorumludur. Hesabı üzerinden yapılan işlemlerin kendi bilgisi dahilinde yapıldığı kabul edilir.

4. ŞİRKETİN HAK VE YÜKÜMLÜLÜKLERİ
4.1. Şirket, Uygulama'nın kesintisiz ve hatasız çalışması için makul çabayı gösterir ancak sistemdeki teknik arızalar, bakım çalışmaları veya mücbir sebeplerden doğan kesintilerden sorumlu tutulamaz.
4.2. Şirket, şüpheli gördüğü, kurallara veya yasalara aykırı işlem yapan kullanıcı hesaplarını önceden bildirimde bulunmaksızın askıya alma veya kalıcı olarak kapatma hakkını saklı tutar.

5. SÖZLEŞMENİN FESHİ
Kullanıcı dilediği zaman Uygulama'yı silerek ve hesabının kapatılmasını talep ederek sözleşmeyi feshedebilir. Şirket, bu sözleşme ihlali durumunda Kullanıcı'nın üyeliğini tek taraflı olarak iptal edebilir.

6. UYUŞMAZLIKLARIN ÇÖZÜMÜ
Bu Sözleşme'nin uygulanmasından doğabilecek uyuşmazlıklarda Türkiye Cumhuriyeti yasaları uygulanacak olup, İstanbul Merkez Mahkemeleri ve İcra Daireleri yetkilidir.`;
      
      case 'privacy':
        return `GİZLİLİK POLİTİKASI

Akkoç Lojistik ("Şirket") olarak, kullanıcılarımızın ("Kullanıcı") kişisel verilerinin korunmasına ve gizliliğine büyük önem veriyoruz. Bu politika, Uygulama üzerinden hangi verilerin toplandığını ve bu verilerin nasıl kullanıldığını açıklamaktadır.

1. TOPLANAN VERİLER
Uygulama'yı kullanımınız sırasında aşağıdaki veriler toplanabilmektedir:
- Kimlik ve İletişim Verileri: Ad, soyad, T.C. Kimlik No, telefon numarası, e-posta adresi.
- Araç ve Profil Verileri: Plaka, araç tipi, taşıma kapasitesi, ruhsat bilgileri, sürücü ehliyet ve belge bilgileri.
- Konum Verileri: Yük eşleştirme, rota optimizasyonu ve aktif taşıma sırasında yükün anlık takibi için cihazınızın GPS konum bilgileri.
- Cihaz ve Kullanım Verileri: IP adresi, cihaz modeli, işletim sistemi versiyonu, uygulama içi gezinme logları, bildirim (push token) izinleri.

2. VERİLERİN KULLANIM AMACI
Toplanan verileriniz aşağıdaki amaçlarla kullanılmaktadır:
- Yük Veren ve Taşıyıcı arasında doğru ve güvenli eşleşmenin sağlanması,
- Taşıma işlemi sırasında konum takibinin (canlı harita) yapılabilmesi,
- İletişim, faturalandırma ve destek hizmetlerinin sunulması,
- Yasal zorunlulukların yerine getirilmesi (örneğin U-ETDS bildirimleri gibi),
- Uygulama içi güvenlik kontrolü ve dolandırıcılığın önlenmesi.

3. VERİLERİN PAYLAŞIMI
Verileriniz, ticari amaçlarla üçüncü şahıslara kesinlikle satılmaz. Ancak aşağıdaki durumlarda paylaşılabilir:
- Hizmetin İfası: Bir taşıma işleminde anlaşıldığında, Yük Veren ve Taşıyıcı'nın iletişim ve (gerektiğinde) konum bilgileri karşılıklı olarak paylaşılır.
- Yasal Zorunluluklar: Mahkeme kararları veya yetkili kamu kurumlarının yasal talepleri doğrultusunda.

4. VERİ GÜVENLİĞİ
Verileriniz, modern şifreleme algoritmalarıyla korunmakta ve yüksek güvenlikli bulut sunucularında saklanmaktadır. Veri iletimi SSL/TLS sertifikaları kullanılarak şifreli olarak gerçekleşir.

5. DEĞİŞİKLİKLER
Şirket, yasal mevzuatlardaki değişiklikler veya yeni özelliklerin eklenmesi sebebiyle bu Gizlilik Politikası'nda değişiklik yapma hakkını saklı tutar.`;

      case 'kvkk':
        return `KİŞİSEL VERİLERİN İŞLENMESİNE İLİŞKİN AYDINLATMA METNİ

Akkoç Lojistik (bundan böyle "Veri Sorumlusu" olarak anılacaktır) olarak, 6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") uyarınca kişisel verilerinizi hangi amaçlarla işlediğimiz ve haklarınız konusunda sizi bilgilendirmek isteriz.

1. KİŞİSEL VERİLERİN İŞLENME AMACI VE HUKUKİ SEBEBİ
Kimlik, iletişim, araç, finans ve konum verileriniz;
- Şirketimiz tarafından sunulan aracılık ve eşleştirme hizmetlerinden faydalanabilmeniz,
- Sözleşmenin kurulması ve ifası (KVKK m. 5/2-c),
- Yasal yükümlülüklerimizin yerine getirilmesi (KVKK m. 5/2-ç),
- Bir hakkın tesisi, kullanılması veya korunması (KVKK m. 5/2-e) hukuki sebeplerine dayalı olarak işlenmektedir.
Özellikle "Konum Veriniz", sadece taşıma işlemi süresince yük takibinin yapılabilmesi amacıyla işlenmektedir.

2. İŞLENEN KİŞİSEL VERİLERİN KİMLERE VE HANGİ AMAÇLA AKTARILABİLECEĞİ
Kişisel verileriniz;
- Hizmetin doğası gereği, anlaşılan nakliye işlerinde taşıyıcı ve yük veren taraflar arasında iletişim ve operasyonun sağlanması amacıyla karşı tarafa,
- Kanunen yetkili kamu kurum ve kuruluşlarına (Örn: Emniyet, Bakanlıklar vb.),
- Sistem altyapısının sağlandığı (örn: bulut sunucu sağlayıcıları, SMS şirketleri) yurt içi veya yurt dışı iş ortaklarımıza,
KVKK'nın 8. ve 9. maddelerinde belirtilen şartlar çerçevesinde aktarılabilecektir.

3. KİŞİSEL VERİ TOPLAMANIN YÖNTEMİ
Kişisel verileriniz, mobil uygulamamız üzerinden elektronik ortamda doldurduğunuz formlar, verdiğiniz izinler (konum, bildirim) ve uygulama içindeki eylemleriniz vasıtasıyla tamamen veya kısmen otomatik yöntemlerle toplanmaktadır.

4. KVKK 11. MADDE KAPSAMINDAKİ HAKLARINIZ
KVKK'nın 11. maddesi uyarınca veri sahibi olarak;
a) Kişisel veri işlenip işlenmediğini öğrenme,
b) İşlenmişse buna ilişkin bilgi talep etme,
c) İşlenme amacını ve amaca uygun kullanılıp kullanılmadığını öğrenme,
d) Yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri bilme,
e) Eksik veya yanlış işlenmişse düzeltilmesini isteme,
f) KVKK ve ilgili kanun hükümlerine uygun olarak işlenmiş olmasına rağmen, işlenmesini gerektiren sebeplerin ortadan kalkması hâlinde silinmesini veya yok edilmesini isteme,
g) (e) ve (f) bentleri uyarınca yapılan işlemlerin, kişisel verilerin aktarıldığı üçüncü kişilere bildirilmesini isteme haklarına sahipsiniz.

Taleplerinizi sistem içindeki "Destek" bölümünden veya info@akkoclojistik.com.tr adresine yazılı olarak iletebilirsiniz.`;
      
      default:
        return 'Sistem ilgili operasyonel metni yüklerken bir sorun yaşadı.';
    }
  };

export default function LegalDetailScreen({ route, navigation }: any) {
  const { docId, title } = route.params;
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

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
                {getLegalText(docId)}
             </Text>

             <View style={[styles.telemetryDivider, { backgroundColor: theme.border }]} />
             <Text style={[styles.updateDate, { color: theme.success }]}>SON GÜNCELLEME: 04 MAYIS 2026</Text>
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
