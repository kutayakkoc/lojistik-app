import { Linking, Alert } from 'react-native';

export const formatTurkishDate = (dateStr: string): string => {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  } catch {
    return dateStr;
  }
};

export const sanitizePhone = (phone: string | null | undefined): string => {
  if (!phone) return '';
  return phone.replace(/[^0-9]/g, '');
};

const normalizeToTurkishNumber = (phone: string): string => {
  const digits = sanitizePhone(phone);
  if (digits.startsWith('90') && digits.length >= 12) return digits;
  return `90${digits.replace(/^0/, '')}`;
};

export const openWhatsApp = async (
  phone: string | null | undefined,
  message: string
): Promise<void> => {
  const digits = sanitizePhone(phone);
  if (!digits || digits.length < 10) {
    Alert.alert('Hata', 'Geçerli bir telefon numarası bulunamadı.');
    return;
  }
  const number = normalizeToTurkishNumber(digits);
  const url = `whatsapp://send?phone=${number}&text=${encodeURIComponent(message)}`;
  Linking.openURL(url).catch(() =>
    Alert.alert('Hata', 'WhatsApp yüklü değil veya açılamadı.')
  );
};

export const openPhoneCall = (phone: string | null | undefined): void => {
  const digits = sanitizePhone(phone);
  if (!digits || digits.length < 10) {
    Alert.alert('Hata', 'Geçerli bir telefon numarası bulunamadı.');
    return;
  }
  Linking.openURL(`tel:${digits}`).catch(() =>
    Alert.alert('Hata', 'Arama bu cihazda desteklenmiyor.')
  );
};
