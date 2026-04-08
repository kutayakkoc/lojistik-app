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

export default function EditVehicleScreen() {
  const { theme, isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [plateNumber, setPlateNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('TIR');

  useEffect(() => {
    fetchVehicle();
  }, []);

  const fetchVehicle = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) return;

      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('owner_id', session.user.id)
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setPlateNumber(data.plate_number || '');
        setVehicleType(data.vehicle_type || 'TIR');
      }
    } catch (error: any) {
      Alert.alert('Hata', error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatPlate = (text: string) => {
    // Sadece alfanümerik karakterler, boşlukları temizle ve büyük harfe çevir
    let cleaned = text.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    
    // Basit bir Türk plakası formatı denemesi (34ABC123 -> 34 ABC 123)
    if (cleaned.length <= 2) return cleaned;
    if (cleaned.length <= 5) return cleaned.slice(0, 2) + ' ' + cleaned.slice(2);
    return cleaned.slice(0, 2) + ' ' + cleaned.slice(2, 5) + ' ' + cleaned.slice(5, 9);
  };

  const validatePlate = (plate: string) => {
    // Türk plakası regex: 2 rakam, 1-3 harf, 2-4 rakam
    const regex = /^[0-9]{2}\s[A-Z]{1,3}\s[0-9]{2,4}$/;
    return regex.test(plate);
  };

  const handleSaveVehicle = async () => {
    if (!plateNumber) {
      Alert.alert('Hata', 'Lütfen plaka numarasını giriniz.');
      return;
    }

    if (!validatePlate(plateNumber)) {
      Alert.alert('Hata', 'Lütfen geçerli bir Türk plakası giriniz (Örn: 34 ABC 123).');
      return;
    }

    try {
      setSaving(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const vehicleData = {
        owner_id: session.user.id,
        plate_number: plateNumber.replace(/\s/g, ''), // Veritabanına boşluksuz kaydedelim
        vehicle_type: vehicleType,
      };

      const { error } = await supabase
        .from('vehicles')
        .upsert(vehicleData, { onConflict: 'owner_id' });

      if (error) throw error;

      Alert.alert('Başarılı', 'Araç bilgileriniz kaydedildi.', [
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
          style={[styles.backButton, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#f1f2f6' }]} 
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={20} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Araç Bilgilerini Düzenle</Text>
      </View>

      <View style={styles.content}>
        <View style={[styles.section, { backgroundColor: theme.surface }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person-outline" size={20} color={theme.accent} />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Araç Detayları</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.textLight }]}>Plaka Numarası</Text>
            <TextInput
              style={[styles.input, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#f7f8fa', color: theme.text, borderColor: theme.border }]}
              value={plateNumber}
              onChangeText={(text) => setPlateNumber(formatPlate(text))}
              placeholder="34 ABC 123"
              placeholderTextColor={theme.textLight}
              autoCapitalize="characters"
              maxLength={11}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.textLight }]}>Araç Tipi</Text>
            <View style={styles.pickerContainer}>
              {['TIR', 'Kamyon', 'Kamyonet'].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.pickerItem,
                    { borderColor: theme.border },
                    vehicleType === type && { backgroundColor: theme.primary, borderColor: theme.primary }
                  ]}
                  onPress={() => setVehicleType(type)}
                >
                  <Text style={[
                    styles.pickerItemText,
                    { color: theme.text },
                    vehicleType === type && { color: '#fff' }
                  ]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity 
            style={styles.saveButton} 
            onPress={handleSaveVehicle}
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
                <Text style={styles.saveButtonText}>Araç Bilgilerini Kaydet</Text>
              </LinearGradient>
            )}
          </TouchableOpacity>
        </View>
        
        <Text style={[styles.infoText, { color: theme.textLight }]}>
          Araç bilgilerinizi doğru girmeniz, profilinizin yük verenler tarafından daha güvenilir bulunmasını sağlar.
        </Text>
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
  pickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  pickerItem: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.md,
    borderWidth: 1,
    minWidth: '45%',
    alignItems: 'center',
  },
  pickerItemText: {
    fontSize: 14,
    fontWeight: '700',
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
  infoText: {
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 18,
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
});
