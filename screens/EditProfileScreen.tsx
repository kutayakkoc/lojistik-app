import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Spacing, Shadows, Radius } from '../constants/Theme';
import { useTheme } from '../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

export default function EditProfileScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) return;

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .limit(1)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profileData) {
        setLoading(false);
        return;
      }
      setProfile(profileData);
      setFullName(profileData.full_name || '');
      setPhone(formatPhone(profileData.phone || ''));
    } catch (error: any) {
      Alert.alert('Hata', error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatPhone = (text: string) => {
    let digits = text.replace(/\D/g, '');
    if (digits.length === 0) return '';
    if (digits.length > 0 && digits.charAt(0) !== '0') digits = '0' + digits;
    
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
    return formatted.trim().substring(0, 15);
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          phone: phone.replace(/\s/g, '')
        })
        .eq('id', session.user.id);

      if (profileError) throw profileError;

      Alert.alert('Başarılı', 'Profil bilgileriniz güncellendi.', [
        { text: 'Tamam', onPress: () => navigation.goBack() }
      ]);
    } catch (error: any) {
      Alert.alert('Hata', error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}>
      {/* Header Space */}
      <View style={{ height: insets.top + 12 }} />
      
      <View style={styles.header}>
        <TouchableOpacity 
          style={[styles.backButton, { backgroundColor: '#f1f2f6' }]} 
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={20} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Profilimi Güncelle</Text>
      </View>

      <View style={styles.content}>
        <View style={[styles.section, { backgroundColor: theme.surface }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person-outline" size={20} color={theme.primaryLight} />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Kişisel Bilgiler</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.textLight }]}>Ad Soyad</Text>
            <TextInput
              style={[styles.input, { backgroundColor: '#f7f8fa', color: theme.text, borderColor: theme.border }]}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Ad Soyad"
              placeholderTextColor={theme.textLight}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.textLight }]}>Telefon Numarası</Text>
            <TextInput
              style={[styles.input, { backgroundColor: '#f7f8fa', color: theme.text, borderColor: theme.border }]}
              value={phone}
              onChangeText={(text) => setPhone(formatPhone(text))}
              placeholder="0 5XX XXX XX XX"
              keyboardType="phone-pad"
              placeholderTextColor={theme.textLight}
              maxLength={15}
            />
          </View>

          <TouchableOpacity 
            style={styles.saveButton} 
            onPress={handleSaveProfile}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <LinearGradient
                colors={[theme.accent, '#FB923C']}
                style={styles.saveButtonGradient}
              >
                <Ionicons name="save-outline" size={20} color="#fff" />
                <Text style={styles.saveButtonText}>Profilimi Kaydet</Text>
              </LinearGradient>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  content: {
    padding: Spacing.md,
  },
  section: {
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    ...Shadows.medium,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginLeft: Spacing.sm,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: Spacing.xs,
    marginLeft: 2,
    textTransform: 'uppercase',
  },
  input: {
    borderRadius: Radius.md,
    padding: Spacing.md,
    fontSize: 14,
    borderWidth: 1,
  },
  saveButton: {
    borderRadius: Radius.md,
    overflow: 'hidden',
    marginTop: Spacing.md,
    ...Shadows.medium,
  },
  saveButtonGradient: {
    flexDirection: 'row',
    padding: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
    marginLeft: Spacing.sm,
  },
});
