import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Shadows } from '../constants/Theme';
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
      return 'İlgili yasal metin yüklenirken bir sorun oluştu.';
  }
};

const HEADER_BG = '#0F172A';

export default function LegalDetailScreen({ route, navigation }: any) {
  const { docId, title } = route.params;
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={true}>
        <View style={styles.card}>
          <Text style={styles.legalBody}>{getLegalText(docId)}</Text>
          <View style={styles.divider} />
          <Text style={styles.updateDate}>Son Güncelleme: 04 Mayıs 2026</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },

  header: { backgroundColor: HEADER_BG, paddingHorizontal: 20, paddingBottom: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '800', flex: 1 },

  scrollContent: { padding: 20, paddingBottom: 40 },

  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, ...Shadows.medium },
  legalBody: { fontSize: 14, lineHeight: 24, color: '#0F172A', fontWeight: '500' },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 20 },
  updateDate: { fontSize: 11, color: '#16A34A', fontWeight: '700', textAlign: 'right' },
});
