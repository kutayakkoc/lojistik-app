import React from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DatePicker from 'react-native-modern-datepicker';

const HEADER_BG = '#0F172A';
const ACCENT = '#F35D18';

interface Props {
  visible: boolean;
  selected: string;
  onClose: () => void;
  onSelect: (date: string) => void;
}

export default function DatePickerModal({ visible, selected, onClose, onSelect }: Props) {
  const insets = useSafeAreaInsets();

  const getToday = () => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}/${mm}/${dd}`;
  };

  const handleDate = (date: string) => {
    const formatted = date.replace(/\//g, '-');
    if (formatted === selected) {
      // Ignore auto-fire on mount or re-selecting the exact same date
      return;
    }
    onSelect(formatted);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Tarih Seçin</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Calendar */}
          <DatePicker
            isGregorian
            mode="calendar"
            minimumDate={getToday()}
            current={selected ? selected.replace(/-/g, '/') : getToday()}
            selected={selected ? selected.replace(/-/g, '/') : undefined}
            onSelectedChange={handleDate}
            onDateChange={() => {}}
            onMonthYearChange={() => {}}
            options={{
              backgroundColor: '#fff',
              textHeaderColor: HEADER_BG,
              textDefaultColor: HEADER_BG,
              selectedTextColor: '#fff',
              mainColor: ACCENT,
              textSecondaryColor: '#94A3B8',
              borderColor: '#F1F5F9',
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 16,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0', alignSelf: 'center', marginBottom: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, paddingHorizontal: 4 },
  title: { fontSize: 17, fontWeight: '800', color: HEADER_BG },
  closeBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
});
