import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Image, Platform, KeyboardAvoidingView, ScrollView } from 'react-native';
import { supabase } from '../lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { Colors, Spacing, Radius, Shadows } from '../constants/Theme';

type AuthMode = 'LOGIN' | 'SIGNUP' | 'FORGOT' | 'RESET';

export default function Auth({ recoveryState }: { recoveryState: any }) {
  const { theme } = useTheme();
  const [mode, setMode] = useState<AuthMode>('LOGIN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Kayıt için ekstra alanlar
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'DRIVER'>('DRIVER');

  useEffect(() => {
    if (recoveryState) {
       setMode('RESET');
    }
  }, [recoveryState]);

  // Telefon maskeleme fonksiyonu
  const formatPhoneNumber = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    let formatted = cleaned;
    if (cleaned.length > 0) {
      if (cleaned.length <= 3) formatted = cleaned;
      else if (cleaned.length <= 6) formatted = `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
      else if (cleaned.length <= 8) formatted = `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
      else formatted = `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 8)} ${cleaned.slice(8, 10)}`;
    }
    return formatted.slice(0, 13);
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
    if (!fullName || !phone || phone.length < 13) {
      Alert.alert('Eksik Bilgi', 'Lütfen ad soyad ve geçerli bir telefon numarası girin.');
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
    });

    if (error) {
      Alert.alert('Kayıt Hatası', error.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          full_name: fullName,
          phone: phone.replace(/\s/g, ''),
          role: role,
        });

      if (profileError) {
        Alert.alert('Profil Oluşturma Hatası', profileError.message);
      } else {
        Alert.alert('Hoş Geldiniz', 'Kaydınız başarıyla oluşturuldu! Şimdi sisteme giriş yapabilirsiniz.');
        setMode('LOGIN');
      }
    }
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
    if (!password || password.length < 6) {
      Alert.alert('Zayıf Şifre', 'Lütfen en az 6 karakterli yeni bir şifre girin.');
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
    }
  }

  const getTitle = () => {
    switch(mode) {
      case 'LOGIN': return 'Kurumsal Giriş';
      case 'SIGNUP': return 'İş Ortağı Kaydı';
      case 'FORGOT': return 'Şifre Sıfırlama';
      case 'RESET': return 'Yeni Şifre Belirle';
    }
  };

  const getSubtitle = () => {
    switch(mode) {
      case 'LOGIN': return 'Sisteminize güvenle erişin';
      case 'SIGNUP': return 'Akkoç Lojistik ekosistemine dahil olarak işinizi bizimle büyütün.';
      case 'FORGOT': return 'E-posta adresinize bir sıfırlama bağlantısı göndereceğiz.';
      case 'RESET': return 'Lütfen akılda kalıcı ve güvenli yeni bir şifre seçin.';
    }
  };

  return (
    <LinearGradient 
      colors={['#1E3A8A', '#020617']} 
      style={styles.container}
    >
      <View style={[StyleSheet.absoluteFill, { opacity: 0.15, backgroundColor: '#000' }]} />
      
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} bounces={false}>
          
          <View style={styles.logoContainer}>
            <Image 
              source={require('../assets/images/512x512 akkoc tahta.png')} 
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
                    </View>
                    <TextInput
                      style={[styles.input, { backgroundColor: '#F8FAFC', color: theme.text, borderColor: theme.border }]}
                      onChangeText={handlePhoneChange}
                      value={phone}
                      placeholder="5XX XXX XX XX"
                      placeholderTextColor={theme.textLight + '80'}
                      keyboardType="phone-pad"
                      maxLength={13}
                    />
                  </View>
                </>
              )}

              {(mode !== 'RESET') && (
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
                    placeholder="••••••••"
                    placeholderTextColor={theme.textLight + '80'}
                    autoCapitalize="none"
                  />
                </View>
              )}
            </View>

            {mode === 'LOGIN' && (
              <TouchableOpacity onPress={() => setMode('FORGOT')} style={{ alignSelf: 'flex-end', marginBottom: 20 }}>
                <Text style={{ color: theme.accent, fontSize: 12, fontWeight: '700' }}>Şifremi Unuttum</Text>
              </TouchableOpacity>
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
                     mode === 'FORGOT' ? 'SIFIRLAMA LİNKİ GÖNDER' : 'ŞİFREYİ GÜNCELLE'}
                  </Text>
                  <Ionicons name="chevron-forward" size={18} color="#fff" />
                </View>
              )}
            </TouchableOpacity>

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
          </View>

          <View style={styles.footer}>
             <Text style={[styles.footerText, { color: '#fff', opacity: 0.5 }]}>
                AKKOÇ LOJİSTİK KURUMSAL PORTAL v1.0
             </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, padding: Spacing.xl, paddingBottom: 60 },
  logoContainer: { alignItems: 'center', marginBottom: 40, marginTop: Platform.OS === 'ios' ? 80 : 60 },
  logoImage: { width: 120, height: 120 },
  card: { borderRadius: 36, padding: Spacing.xl, ...Shadows.large, marginHorizontal: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  cardHeader: { marginBottom: 30 },
  title: { fontSize: 28, fontWeight: '900', marginBottom: 8, letterSpacing: -0.8 },
  subtitle: { fontSize: 14, fontWeight: '500', opacity: 0.8, lineHeight: 22 },
  formContainer: { marginBottom: 25 },
  inputGroup: { marginBottom: 18 },
  inputLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, marginLeft: 4 },
  inputLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  input: { height: 58, borderWidth: 1.5, borderRadius: 18, paddingHorizontal: 20, fontSize: 16, fontWeight: '600' },
  button: { height: 62, borderRadius: 20, alignItems: 'center', justifyContent: 'center', ...Shadows.medium },
  btnContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  buttonText: { color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 1.2 },
  switchButton: { marginTop: 30, alignItems: 'center' },
  switchText: { fontSize: 14 },
  footer: { marginTop: 40, alignItems: 'center', paddingBottom: 20 },
  footerText: { fontSize: 9, fontWeight: '800', letterSpacing: 1.5 }
});
