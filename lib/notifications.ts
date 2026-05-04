import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from './supabase';

// Bildirimlerin uygulama içindeyken nasıl görüneceğini ayarla
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Kullanıcıdan bildirim izni ister ve Expo Push Token üretir.
 */
export async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      return null;
    }

    try {
      const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ??
        Constants?.easConfig?.projectId;

      token = (await Notifications.getExpoPushTokenAsync({
        projectId: projectId,
      })).data;
    } catch (e) {
      console.error('Push token alınamadı:', e);
    }
  }

  return token;
}

/**
 * Kullanıcının push token'ını Supabase profil tablosuna kaydeder.
 */
export async function savePushTokenToProfile(userId: string, token: string) {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ push_token: token })
      .eq('id', userId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Token kaydedilirken hata oluştu:', error);
    return false;
  }
}

/**
 * Belirli bir Expo Push Token'a bildirim gönderir.
 * Bu normalde backend (Edge Functions veya Node.js) üzerinden yapılmalıdır.
 * Ancak hızlı prototipleme için şimdilik mobilden de tetiklenebilir.
 */
export async function sendPushNotification(expoPushToken: string, title: string, body: string, data = {}) {
  const message = {
    to: expoPushToken,
    sound: 'default',
    title: title,
    body: body,
    data: data,
  };

  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  });
}

/**
 * Şoför rolündeki TÜM kullanıcılara bildirim gönderir (Broadcast).
 */
export async function broadcastToAllDrivers(title: string, body: string, data = {}) {
  try {
    // Şoförlerin tokenlarını çek
    const { data: drivers, error } = await supabase
      .from('profiles')
      .select('push_token')
      .eq('role', 'DRIVER')
      .not('push_token', 'is', null)
      .neq('push_token', '');

    if (error) throw error;
    if (!drivers || drivers.length === 0) return;

    // Her birine bildirim gönder (Expo toplu gönderimi de destekler ama basitlik için loop kuruyoruz)
    const tokens = drivers.map(d => d.push_token).filter(t => t !== null);
    
    for (const token of tokens) {
        await sendPushNotification(token, title, body, data);
    }
  } catch (err) {
    console.error('Yayın hatası:', err);
  }
}
