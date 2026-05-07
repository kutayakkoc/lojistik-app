import React, { useState } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  FlatList, StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const HEADER_BG = '#0F172A';
const ACCENT = '#F35D18';

const TURKISH_CITIES = [
  "Adana", "Adıyaman", "Afyonkarahisar", "Ağrı", "Amasya", "Ankara", "Antalya", "Artvin", "Aydın", "Balıkesir",
  "Bilecik", "Bingöl", "Bitlis", "Bolu", "Burdur", "Bursa", "Çanakkale", "Çankırı", "Çorum", "Denizli",
  "Diyarbakır", "Edirne", "Elazığ", "Erzincan", "Erzurum", "Eskişehir", "Gaziantep", "Giresun", "Gümüşhane", "Hakkari",
  "Hatay", "Isparta", "Mersin", "İstanbul", "İzmir", "Kars", "Kastamonu", "Kayseri", "Kırklareli", "Kırşehir",
  "Kocaeli", "Konya", "Kütahya", "Malatya", "Manisa", "Kahramanmaraş", "Mardin", "Muğla", "Muş", "Nevşehir",
  "Niğde", "Ordu", "Rize", "Sakarya", "Samsun", "Siirt", "Sinop", "Sivas", "Tekirdağ", "Tokat",
  "Trabzon", "Tunceli", "Şanlıurfa", "Uşak", "Van", "Yozgat", "Zonguldak", "Aksaray", "Bayburt", "Karaman",
  "Kırıkkale", "Batman", "Şırnak", "Bartın", "Ardahan", "Iğdır", "Yalova", "Karabük", "Kilis", "Osmaniye", "Düzce",
];

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (city: string) => void;
}

export default function CityPickerModal({ visible, onClose, onSelect }: Props) {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [recentCities, setRecentCities] = useState<string[]>([]);

  React.useEffect(() => {
    if (visible) {
      setSearch('');
      AsyncStorage.getItem('@recent_cities').then(raw => {
        if (raw) setRecentCities(JSON.parse(raw));
      });
    }
  }, [visible]);

  const filtered = TURKISH_CITIES.filter(c =>
    c.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (city: string) => {
    const next = [city, ...recentCities.filter(c => c !== city)].slice(0, 5);
    setRecentCities(next);
    AsyncStorage.setItem('@recent_cities', JSON.stringify(next));
    onSelect(city);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Şehir Seçin</Text>
            <View style={{ width: 38 }} />
          </View>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color="#94A3B8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Şehir ara..."
              placeholderTextColor="#94A3B8"
              value={search}
              onChangeText={setSearch}
              autoFocus
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={18} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {!search && recentCities.length > 0 && (
          <View style={styles.recentSection}>
            <Text style={styles.recentLabel}>SON KULLANILAN</Text>
            <View style={styles.recentRow}>
              {recentCities.map(city => (
                <TouchableOpacity key={city} style={styles.recentChip} onPress={() => handleSelect(city)}>
                  <Ionicons name="time-outline" size={12} color={ACCENT} />
                  <Text style={styles.recentText}>{city}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.separator} />
          </View>
        )}

        <FlatList
          data={filtered}
          keyExtractor={item => item}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.cityItem} onPress={() => handleSelect(item)}>
              <Ionicons name="location-outline" size={16} color="#94A3B8" style={{ marginRight: 12 }} />
              <Text style={styles.cityText}>{item}</Text>
              <Ionicons name="chevron-forward" size={14} color="#E2E8F0" />
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>"{search}" için sonuç bulunamadı</Text>
            </View>
          }
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },

  header: { backgroundColor: HEADER_BG, paddingHorizontal: 16, paddingBottom: 14 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  closeBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#fff' },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 12, paddingHorizontal: 14, height: 44 },
  searchInput: { flex: 1, color: '#fff', fontSize: 14, fontWeight: '500' },

  recentSection: { paddingHorizontal: 16, paddingTop: 16 },
  recentLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 1, color: '#94A3B8', marginBottom: 10 },
  recentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  recentChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, backgroundColor: ACCENT + '15', borderWidth: 1, borderColor: ACCENT + '30' },
  recentText: { fontSize: 13, fontWeight: '700', color: ACCENT },
  separator: { height: 1, backgroundColor: '#E2E8F0' },

  cityItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', backgroundColor: '#fff' },
  cityText: { flex: 1, fontSize: 15, fontWeight: '600', color: '#0F172A' },

  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 14, color: '#94A3B8', fontWeight: '500' },
});
