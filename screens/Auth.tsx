import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Image, Platform, KeyboardAvoidingView, ScrollView, Dimensions, Modal } from 'react-native';

const { width, height } = Dimensions.get('window');
import { supabase } from '../lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { Colors, Spacing, Radius, Shadows } from '../constants/Theme';
import { getLegalText } from './LegalDetailScreen';

type AuthMode = 'LOGIN' | 'SIGNUP' | 'FORGOT' | 'RESET' | 'CONFIRMED';

export default function Auth({ recoveryState }: { recoveryState: any }) {
  const { theme } = useTheme();
  const [mode, setMode] = useState<AuthMode>('LOGIN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Kayıt için ekstra alanlar
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'DRIVER'>('DRIVER');
  const [legalDoc, setLegalDoc] = useState<'terms' | 'privacy' | 'kvkk' | null>(null);

  useEffect(() => {
    if (recoveryState) {
      setMode('RESET');
    }
  }, [recoveryState]);

  // Telefon maskeleme fonksiyonu
  const formatPhoneNumber = (text: string) => {
    let digits = text.replace(/\D/g, '');
    if (digits.length === 0) return '';

    // Her zaman 0 ile başlamasını sağla
    if (digits.charAt(0) !== '0') digits = '0' + digits;

    let formatted = '0';
    if (digits.length > 1) {
      formatted += ' ' + digits.substring(1, 4);
    }
    if (digits.length > 4) {
      formatted += ' ' + digits.substring(4, 7);
    }
    if (digits.length > 7) {
      formatted += ' ' + digits.substring(7, 9);
    }
    if (digits.length > 9) {
      formatted += ' ' + digits.substring(9, 11);
    }
    return formatted.substring(0, 15);
  };

  const handlePhoneChange = (text: string) => {
    const formatted = formatPhoneNumber(text);
    setPhone(formatted);
  };

  async function handleAuth() {
    if (mode === 'LOGIN') await signInWithEmail();
    else if (mode === 'SIGNUP') await signUpWithEmail();
    else if (mode === 'FORGOT') await forgotPassword();
    else if (mode === 'RESET') await resetPassword();
    else if (mode === 'CONFIRMED') setMode('LOGIN');
  }

  async function signInWithEmail() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) Alert.alert('Giriş Hatası', 'E-posta veya şifre hatalı. Lütfen kontrol edin.');
    setLoading(false);
  }

  async function signUpWithEmail() {
    if (!fullName) {
      Alert.alert('Eksik Bilgi', 'Lütfen ad soyadınızı girin.');
      return;
    }
    if (phone && phone.length < 15) {
      Alert.alert('Geçersiz Telefon', 'Telefon numarası girdiyseniz lütfen tam numarayı girin (0 5XX XXX XX XX).');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        emailRedirectTo: 'akkoclojistik://auth/callback',
        data: {
          full_name: fullName,
          phone: phone || null,
          role: role,
        },
      },
    });

    if (error) {
      Alert.alert('Kayıt Hatası', error.message);
      setLoading(false);
      return;
    }

    Alert.alert('Hoş Geldiniz', 'Kaydınız başarıyla oluşturuldu! Şimdi sisteme giriş yapabilirsiniz.');
    setMode('LOGIN');
    setLoading(false);
  }

  async function forgotPassword() {
    if (!email) {
      Alert.alert('Eksik Bilgi', 'Lütfen e-posta adresinizi girin.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'akkoclojistik://reset-password',
    });
    setLoading(false);
    if (error) {
      Alert.alert('Hata', error.message);
    } else {
      Alert.alert('Link Gönderildi', 'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi. Lütfen gelen kutunuzu kontrol edin.');
      setMode('LOGIN');
    }
  }

  async function resetPassword() {
    if (!password || password.length < 8) {
      Alert.alert('Zayıf Şifre', 'Lütfen en az 8 karakterli yeni bir şifre girin.');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Hata', 'Girdiğiniz şifreler birbiriyle eşleşmiyor.');
      setLoading(false);
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: password
    });
    setLoading(false);
    if (error) {
      Alert.alert('Hata', error.message);
    } else {
      Alert.alert('Başarılı', 'Şifreniz başarıyla güncellendi. Giriş yapabilirsiniz.');
      setMode('LOGIN');
      setPassword('');
      setConfirmPassword('');
    }
  }

  const getTitle = () => {
    switch (mode) {
      case 'LOGIN': return 'Kurumsal Giriş';
      case 'SIGNUP': return 'İş Ortağı Kaydı';
      case 'FORGOT': return 'Şifre Sıfırlama';
      case 'RESET': return 'Yeni Şifre Belirle';
      case 'CONFIRMED': return 'E-Posta Onaylandı';
    }
  };

  const getSubtitle = () => {
    switch (mode) {
      case 'LOGIN': return 'Sisteminize güvenle erişin';
      case 'SIGNUP': return 'Akkoç Lojistik ekosistemine dahil olarak işinizi bizimle büyütün.';
      case 'FORGOT': return 'E-posta adresinize bir sıfırlama bağlantısı göndereceğiz.';
      case 'RESET': return 'Lütfen akılda kalıcı ve güvenli yeni bir şifre seçin.';
      case 'CONFIRMED': return 'Tebrikler! Kayıt işleminiz tamamen başarıyla sonuçlandı.';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: '#F1F5F9' }]}>
      <LinearGradient
        colors={['#1E3A8A', '#020617']}
        style={{ 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          right: 0, 
          height: height * 0.35, 
          borderBottomLeftRadius: 40, 
          borderBottomRightRadius: 40 
        }} 
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} bounces={false} keyboardShouldPersistTaps="handled">

          <View style={styles.logoContainer}>
            <Image
              source={require('../assets/images/new_logo_horizontal.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>

          <View style={[styles.card, { backgroundColor: '#FFFFFF' }]}>
            <View style={styles.cardHeader}>
              <Text style={[styles.title, { color: theme.text }]}>{getTitle()}</Text>
              <Text style={[styles.subtitle, { color: theme.textLight }]}>{getSubtitle()}</Text>
            </View>

            <View style={styles.formContainer}>
              {mode === 'CONFIRMED' && (
                <View style={{ alignItems: 'center', paddingVertical: 10, marginBottom: 10 }}>
                  <View style={{ width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(37, 211, 102, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}>
                    <Ionicons name="checkmark-circle" size={45} color="#25D366" />
                  </View>
                  <Text style={{ textAlign: 'center', fontSize: 15, color: theme.text, lineHeight: 22, fontWeight: '500' }}>
                    Hesabınız başarıyla doğrulandı. Artık Akkoç Lojistik portalına tam erişim sağlayabilirsiniz.
                  </Text>
                </View>
              )}

              {mode === 'RESET' && (
                <View style={{ alignItems: 'center', marginBottom: 25 }}>
                  <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(243, 93, 24, 0.1)', justifyContent: 'center', alignItems: 'center' }}>
                    <Ionicons name="key-outline" size={32} color={theme.accent} />
                  </View>
                </View>
              )}

              {mode === 'SIGNUP' && (
                <>
                  <View style={styles.inputGroup}>
                    <View style={styles.inputLabelRow}>
                      <Ionicons name="person-outline" size={12} color={theme.accent} />
                      <Text style={[styles.inputLabel, { color: theme.textLight }]}>AD SOYAD</Text>
                    </View>
                    <TextInput
                      style={[styles.input, { backgroundColor: '#F8FAFC', color: theme.text, borderColor: theme.border }]}
                      onChangeText={setFullName}
                      value={fullName}
                      placeholder="Örn: Ahmet Yılmaz"
                      placeholderTextColor={theme.textLight + '80'}
                      autoCapitalize="words"
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <View style={styles.inputLabelRow}>
                      <Ionicons name="call-outline" size={12} color={theme.accent} />
                      <Text style={[styles.inputLabel, { color: theme.textLight }]}>TELEFON NUMARASI</Text>
                      <Text style={[styles.inputLabel, { color: theme.textLight, opacity: 0.6, marginLeft: 4 }]}>(İSTEĞE BAĞLI)</Text>
                    </View>
                    <TextInput
                      style={[styles.input, { backgroundColor: '#F8FAFC', color: theme.text, borderColor: theme.border }]}
                      onChangeText={handlePhoneChange}
                      value={phone}
                      placeholder="0 5XX XXX XX XX"
                      placeholderTextColor={theme.textLight + '80'}
                      keyboardType="phone-pad"
                      maxLength={15}
                    />
                  </View>
                </>
              )}

              {(mode === 'LOGIN' || mode === 'SIGNUP' || mode === 'FORGOT') && (
                <View style={styles.inputGroup}>
                  <View style={styles.inputLabelRow}>
                    <Ionicons name="mail-outline" size={12} color={theme.accent} />
                    <Text style={[styles.inputLabel, { color: theme.textLight }]}>E-POSTA</Text>
                  </View>
                  <TextInput
                    style={[styles.input, { backgroundColor: '#F8FAFC', color: theme.text, borderColor: theme.border }]}
                    onChangeText={setEmail}
                    value={email}
                    placeholder="isim@sirket.com"
                    placeholderTextColor={theme.textLight + '80'}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </View>
              )}

              {(mode === 'LOGIN' || mode === 'SIGNUP' || mode === 'RESET') && (
                <View style={styles.inputGroup}>
                  <View style={styles.inputLabelRow}>
                    <Ionicons name="lock-closed-outline" size={12} color={theme.accent} />
                    <Text style={[styles.inputLabel, { color: theme.textLight }]}>
                      {mode === 'RESET' ? 'YENİ ŞİFRE' : 'ŞİFRE'}
                    </Text>
                  </View>
                  <TextInput
                    style={[styles.input, { backgroundColor: '#F8FAFC', color: theme.text, borderColor: theme.border }]}
                    onChangeText={setPassword}
                    value={password}
                    secureTextEntry
                    placeholder={mode === 'RESET' ? "Yeni Şifre" : "••••••••"}
                    placeholderTextColor={theme.textLight + '80'}
                    autoCapitalize="none"
                  />
                  {mode === 'LOGIN' && (
                    <TouchableOpacity onPress={() => setMode('FORGOT')} style={{ alignSelf: 'flex-end', marginTop: 10 }}>
                      <Text style={{ color: theme.accent, fontSize: 12, fontWeight: '700' }}>Şifremi Unuttum</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {mode === 'RESET' && (
                <View style={styles.inputGroup}>
                  <View style={styles.inputLabelRow}>
                    <Ionicons name="lock-closed-outline" size={12} color={theme.accent} />
                    <Text style={[styles.inputLabel, { color: theme.textLight }]}>ŞİFREYİ ONAYLA</Text>
                  </View>
                  <TextInput
                    style={[styles.input, { backgroundColor: '#F8FAFC', color: theme.text, borderColor: theme.border }]}
                    onChangeText={setConfirmPassword}
                    value={confirmPassword}
                    secureTextEntry
                    placeholder="Yeni Şifreyi Tekrar Yazın"
                    placeholderTextColor={theme.textLight + '80'}
                    autoCapitalize="none"
                  />
                </View>
              )}
            </View>

            {mode === 'SIGNUP' && (
              <View style={styles.disclaimerContainer}>
                <Text style={[styles.disclaimerText, { color: theme.textLight }]}>
                  Kayıt olarak <Text style={{ color: theme.accent, fontWeight: '700' }} onPress={() => setLegalDoc('terms')}>Kullanıcı Sözleşmesi</Text>'ni, <Text style={{ color: theme.accent, fontWeight: '700' }} onPress={() => setLegalDoc('privacy')}>Gizlilik Politikası</Text>'nı ve <Text style={{ color: theme.accent, fontWeight: '700' }} onPress={() => setLegalDoc('kvkk')}>KVKK Aydınlatma Metni</Text>'ni okuduğunuzu ve kabul ettiğinizi onaylamış olursunuz.
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.button, { backgroundColor: theme.accent }]}
              disabled={loading}
              onPress={handleAuth}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <View style={styles.btnContent}>
                  <Text style={styles.buttonText}>
                    {mode === 'LOGIN' ? 'SİSTEME GİRİŞ YAP' :
                      mode === 'SIGNUP' ? 'AĞA DAHİL OL' :
                        mode === 'FORGOT' ? 'SIFIRLAMA LİNKİ GÖNDER' :
                          mode === 'RESET' ? 'ŞİFREYİ GÜNCELLE' : 'GİRİŞ YAPMAYA DEVAM ET'}
                  </Text>
                  <Ionicons name="chevron-forward" size={18} color="#fff" />
                </View>
              )}
            </TouchableOpacity>

            {(mode === 'LOGIN' || mode === 'SIGNUP' || mode === 'FORGOT') && (
              <TouchableOpacity
                style={styles.switchButton}
                onPress={() => {
                  if (mode === 'LOGIN') setMode('SIGNUP');
                  else setMode('LOGIN');
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.switchText, { color: theme.textLight }]}>
                  {mode === 'LOGIN' ? "Henüz kayıtlı değil misiniz? " : "Zaten bir hesabınız var mı? "}
                  <Text style={{ color: theme.accent, fontWeight: '900' }}>
                    {mode === 'LOGIN' ? "Hemen Katıl" : "Giriş Yap"}
                  </Text>
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: '#64748B', opacity: 0.8 }]}>
              AKKOÇ LOJİSTİK KURUMSAL PORTAL v1.0.1
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={legalDoc !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setLegalDoc(null)}
      >
        <View style={{ flex: 1, backgroundColor: theme.background }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: Platform.OS === 'ios' ? 60 : 30, borderBottomWidth: 1, borderColor: theme.border }}>
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.text }}>
              {legalDoc === 'terms' ? 'Kullanıcı Sözleşmesi' : legalDoc === 'privacy' ? 'Gizlilik Politikası' : 'KVKK Aydınlatma Metni'}
            </Text>
            <TouchableOpacity onPress={() => setLegalDoc(null)}>
              <Ionicons name="close" size={26} color={theme.text} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            <Text style={{ color: theme.text, lineHeight: 22, fontSize: 13 }}>
              {legalDoc ? getLegalText(legalDoc) : ''}
            </Text>
          </ScrollView>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, padding: width * 0.06, paddingBottom: height * 0.1, paddingTop: height * 0.05 },
  logoContainer: { alignItems: 'center', marginBottom: Math.min(35, height * 0.04), marginTop: Platform.OS === 'ios' ? Math.min(25, height * 0.03) : Math.min(10, height * 0.01) },
  logoImage: { width: width * 0.85, height: Math.min(100, height * 0.11), marginBottom: -5 },
  card: { borderRadius: 30, padding: Math.min(24, width * 0.06), ...Shadows.large, marginHorizontal: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  cardHeader: { marginBottom: Math.min(20, height * 0.025) },
  title: { fontSize: 24, fontWeight: '900', marginBottom: 6, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, fontWeight: '500', opacity: 0.8, lineHeight: 20 },
  formContainer: { marginBottom: Math.min(20, height * 0.02) },
  inputGroup: { marginBottom: Math.min(14, height * 0.018) },
  inputLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6, marginLeft: 4 },
  inputLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  input: { height: Math.min(50, height * 0.06), borderWidth: 1.5, borderRadius: 16, paddingHorizontal: 16, fontSize: 15, fontWeight: '600' },
  button: { height: Math.min(56, height * 0.065), borderRadius: 18, alignItems: 'center', justifyContent: 'center', ...Shadows.medium },
  btnContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  buttonText: { color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 1.2 },
  switchButton: { marginTop: Math.min(24, height * 0.03), alignItems: 'center' },
  switchText: { fontSize: 13 },
  footer: { marginTop: Math.min(15, height * 0.02), alignItems: 'center', paddingBottom: Math.min(15, height * 0.02) },
  footerText: { fontSize: 9, fontWeight: '800', letterSpacing: 1.5 },
  disclaimerContainer: { marginBottom: 15, paddingHorizontal: 5 },
  disclaimerText: { fontSize: 10, lineHeight: 14, textAlign: 'center' }
});
