import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, ScrollView, Dimensions, Linking } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '../lib/supabase';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, Shadows, Radius } from '../constants/Theme';
import { useTheme } from '../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { sendPushNotification } from '../lib/notifications';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

export default function JobDetailScreen({ route, navigation }: any) {
  const { theme, isDarkMode } = useTheme();
  const { item, role } = route.params; 
  
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [jobStatus, setJobStatus] = useState(item.status);
  const [assignedDriverId, setAssignedDriverId] = useState<string | null>(item.assigned_driver_id);
  const [assignedDriverInfo, setAssignedDriverInfo] = useState<any>(null);
  const [shipperPhone, setShipperPhone] = useState<string | null>(null);
  const [hasApplied, setHasApplied] = useState(false);
  const [applying, setApplying] = useState(false);
  const [initialCheckLoading, setInitialCheckLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      fetchInitialData();
    }, [item.id])
  );

  const formatTurkishDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
      return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
    } catch (e) { return dateStr; }
  };

  const fetchInitialData = async () => {
    setLoading(true);
    setInitialCheckLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (session) setUserId(session.user.id);
    
    await fetchFreshJobData();
    
    await Promise.all([
      fetchRequests(),
      fetchShipperPhone(),
      checkIfApplied()
    ]);
    
    setLoading(false);
    setInitialCheckLoading(false);
  };

  const fetchFreshJobData = async () => {
    try {
      const { data, error } = await supabase.from('jobs').select('status, assigned_driver_id').eq('id', item.id).single();
      if (data) {
        setJobStatus(data.status);
        setAssignedDriverId(data.assigned_driver_id);
        if ((data.status === 'ASSIGNED' || data.status === 'COMPLETED') && data.assigned_driver_id) {
           await fetchAssignedDriver(data.assigned_driver_id);
        }
      }
    } catch (e) {
      console.log('fetchFreshJobData error', e); 
      if ((item.status === 'ASSIGNED' || item.status === 'COMPLETED') && item.assigned_driver_id) {
         setJobStatus(item.status);
         await fetchAssignedDriver(item.assigned_driver_id);
      }
    }
  };

  const fetchShipperPhone = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('phone')
        .eq('id', item.shipper_id)
        .single();
      if (data) setShipperPhone(data.phone);
    } catch (e) { console.log(e); }
  };

  const checkIfApplied = async () => {
    if (role !== 'DRIVER') return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('job_requests')
        .select('id')
        .eq('job_id', item.id)
        .eq('driver_id', session.user.id)
        .limit(1)
        .maybeSingle();

      if (error) {
        console.log('CheckIfApplied Error:', error);
        return;
      }

      if (data) {
        setHasApplied(true);
      } else {
        setHasApplied(false);
      }
    } catch (e) {
      console.log('CheckIfApplied Catch:', e);
    }
  };

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('job_requests')
        .select('*, driver:profiles!driver_id(full_name, phone)')
        .eq('job_id', item.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setRequests(data || []);
    } catch (error: any) {
      console.log('FetchRequests Error:', error.message);
    }
  };

  const fetchAssignedDriver = async (driverId: string) => {
    if (!driverId) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, phone')
        .eq('id', driverId)
        .maybeSingle();
      if (data) setAssignedDriverInfo(data);
    } catch (e) { console.log(e); }
  };

  const handleApplyJob = async () => {
    if (hasApplied || applying || !userId) return;
    
    try {
      setApplying(true);
      const { data: existing } = await supabase.from('job_requests').select('id').eq('job_id', item.id).eq('driver_id', userId).maybeSingle();
      if (existing) {
        setHasApplied(true);
        Alert.alert('Uyarı', 'Bu ilana zaten başvuru yaptınız.');
        return;
      }

      const { error } = await supabase.from('job_requests').insert({ job_id: item.id, driver_id: userId, status: 'PENDING' });
      if (error) throw error;
      setHasApplied(true);
      
      // İşverene bildirim gönder
      try {
        const { data: shipperProfile } = await supabase.from('profiles').select('push_token').eq('id', item.shipper_id).single();
        const { data: myProfile } = await supabase.from('profiles').select('full_name').eq('id', userId).single();
        if (shipperProfile?.push_token) {
          await sendPushNotification(
            shipperProfile.push_token,
            '🚚 Yeni Başvuru!',
            `${item.origin} -> ${item.destination} ilanınıza başvuru yapıldı.`,
            { jobId: item.id, type: 'NEW_APPLICATION' }
          );
        }
      } catch (err) { console.log('Bildirim gönderilemedi:', err); }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Başarılı', 'Başvurunuz başarıyla iletildi!');
      fetchRequests();
    } catch (error: any) {
      Alert.alert('Hata', 'Başvuru sırasında hata oluştu: ' + error.message);
    } finally {
      setApplying(false);
    }
  };

  const handleWhatsApp = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!shipperPhone) {
      Alert.alert('Hata', 'Yük verenin telefon numarasına ulaşılamadı.');
      return;
    }
    const message = `Merhaba, Akkoç Lojistik uygulamasından ${item.origin} - ${item.destination} ilanınız için yazıyorum.`;
    const url = `https://wa.me/${shipperPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;
    
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      Linking.openURL(url);
    } else {
      Alert.alert('Hata', 'WhatsApp yüklü değil veya açılamadı.');
    }
  };

  const handleAcceptRequest = async (requestId: string, driverId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Onay',
      'Bu şoförü onaylamak istediğinize emin misiniz? Diğer tüm başvurular reddedilecektir.',
      [
        { text: 'İptal', style: 'cancel' },
        { 
          text: 'Evet, Onayla', 
          onPress: async () => {
            try {
              setLoading(true);
              const { error: acceptError } = await supabase.from('job_requests').update({ status: 'ACCEPTED' }).eq('id', requestId);
              if (acceptError) throw acceptError;

              const { error: rejectError } = await supabase.from('job_requests').update({ status: 'REJECTED' }).eq('job_id', item.id).neq('id', requestId).eq('status', 'PENDING');
              if (rejectError) throw rejectError;

              const { data: updatedJob, error: jobError } = await supabase.from('jobs').update({ status: 'ASSIGNED', assigned_driver_id: driverId }).eq('id', item.id).select();
              if (jobError) throw jobError;
              if (!updatedJob || updatedJob.length === 0) {
                 throw new Error('Veritabanına yazma yetkiniz yok veya ilan bulunamadı (RLS Policy). Sistem yöneticinize UPDATE izinlerini kontrol ettirin.');
              }

              // Şoföre bildirim gönder
              try {
                const { data: driverProfile } = await supabase.from('profiles').select('push_token').eq('id', driverId).single();
                if (driverProfile?.push_token) {
                  await sendPushNotification(
                    driverProfile.push_token,
                    '✅ Tebrikler, Görev ONAYLANDI!',
                    `${item.origin} -> ${item.destination} görevi için onaylandınız! Seyahate başlayabilirsiniz.`,
                    { jobId: item.id, type: 'APPLICATION_ACCEPTED' }
                  );
                }
              } catch (err) { console.log('Bildirim gönderilemedi:', err); }

              Alert.alert('Başarılı', 'Şoför onaylandı! İş atandı.');
              setJobStatus('ASSIGNED');
              setAssignedDriverId(driverId);
              fetchAssignedDriver(driverId);
              fetchRequests();
            } catch (error: any) {
              Alert.alert('Hata', error.message);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleCompleteJob = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'İşi Tamamla',
      'Bu işin başarıyla tamamlandığını onaylıyor musunuz?',
      [
        { text: 'İptal', style: 'cancel' },
        { 
          text: 'Evet, Tamamlandı', 
          onPress: async () => {
            try {
              setLoading(true);
              const { data: completedJob, error } = await supabase.from('jobs').update({ status: 'COMPLETED' }).eq('id', item.id).select();
              if (error) throw error;
              if (!completedJob || completedJob.length === 0) throw new Error('Güncelleme gerçekleştirilemedi (RLS Yetkisi).');

              // Şoföre bildirim gönder
              try {
                if (assignedDriverId) {
                  const { data: driverProfile } = await supabase.from('profiles').select('push_token').eq('id', assignedDriverId).single();
                  if (driverProfile?.push_token) {
                    await sendPushNotification(
                      driverProfile.push_token,
                      '🏁 Teslimat Tamamlandı',
                      `İşvereniniz ${item.origin} -> ${item.destination} görevini tamamladı ve ödemenizi onayladı.`,
                      { jobId: item.id, type: 'JOB_COMPLETED' }
                    );
                  }
                }
              } catch (err) { console.log('Bildirim gönderilemedi:', err); }

              Alert.alert('Başarılı', 'İş tamamlandı.');
              setJobStatus('COMPLETED');
            } catch (error: any) {
              Alert.alert('Hata', error.message);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const renderRequestItem = ({ item: req }: { item: any }) => {
    const isPending = req.status === 'PENDING';
    const isAccepted = req.status === 'ACCEPTED';
    const isRejected = req.status === 'REJECTED';

    return (
      <View key={req.id} style={[styles.premiumListItem, { backgroundColor: theme.surface, borderColor: theme.border, paddingVertical: 18 }, isRejected && { opacity: 0.5 }]}>
        <View style={[styles.listAccentBar, { backgroundColor: isAccepted ? '#2ECC71' : theme.accent, height: '100%' }]} />
        <View style={{ flex: 1, marginLeft: 5 }}>
          <Text style={[styles.driverNameLarge, { color: theme.text }]}>{req.driver?.full_name || 'Bilinmeyen Şoför'}</Text>
          <Text style={[styles.driverPhone, { color: theme.textLight, marginTop: 2, fontSize: 11 }]}>{req.driver?.phone || 'Telefon Yok'}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
            <View style={[styles.pulseDot, { backgroundColor: isPending ? '#F59E0B' : (isAccepted ? '#2ECC71' : theme.textLight) }]} />
            <Text style={[styles.premiumLabelMicro, { color: theme.textLight, marginLeft: 6 }]}>
              {isPending ? 'SİSTEMDE BEKLİYOR' : req.status}
            </Text>
          </View>
        </View>
        
        <View style={{ flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center' }}>
          {isPending && jobStatus === 'OPEN' && role === 'SHIPPER' && (
            <TouchableOpacity style={[styles.acceptBtnSmall, { backgroundColor: theme.accent }]} onPress={() => handleAcceptRequest(req.id, req.driver_id)}>
              <Ionicons name="checkmark-sharp" size={14} color="#fff" style={{ marginRight: 4 }} />
              <Text style={styles.acceptBtnText}>Onayla</Text>
            </TouchableOpacity>
          )}
          {isAccepted && (
             <TouchableOpacity style={[styles.miniCallBtn, { backgroundColor: 'rgba(46, 204, 113, 0.1)', borderWidth: 1, borderColor: '#2ECC71' }]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); Linking.openURL(`tel:${req.driver?.phone}`); }}>
                <Ionicons name="call" size={18} color="#2ECC71" />
             </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderStickyFooter = () => {
    if (role !== 'DRIVER' || (jobStatus !== 'OPEN' && jobStatus !== 'ASSIGNED')) return null;

    return (
      <View style={styles.stickyFooter} pointerEvents="box-none">
        <LinearGradient
          colors={['rgba(255,255,255,0)', theme.background]}
          style={styles.footerGradient}
          pointerEvents="none"
        />
        <View style={styles.footerActions}>
          <TouchableOpacity 
            style={[styles.primaryActionBtn, { flex: 1, marginRight: 8 }]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); handleApplyJob(); }}
            disabled={hasApplied || applying || initialCheckLoading}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={initialCheckLoading ? [theme.border, theme.border] : (hasApplied ? ['#94A3B8', '#64748B'] : [theme.accent, '#f35d18'])}
              style={styles.actionBtnGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {applying || initialCheckLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name={hasApplied ? "checkmark-circle" : "paper-plane"} size={18} color="#fff" />
                  <Text style={styles.actionBtnText}>{hasApplied ? 'BAŞVURU YAPILDI' : 'BAŞVURU YAP'}</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.secondaryActionBtn, { borderColor: theme.success }]}
            onPress={handleWhatsApp}
            activeOpacity={0.8}
          >
            <Ionicons name="logo-whatsapp" size={24} color={theme.success} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style="light" translucent />
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 160 }}>
        <View style={styles.matteHeaderPanel}>
          <LinearGradient colors={['#1E293B', '#0F172A']} style={[StyleSheet.absoluteFill, { borderBottomLeftRadius: Radius.xl, borderBottomRightRadius: Radius.xl }]} />
          
          <View style={[styles.matteHeaderRow, { paddingTop: insets.top + 15 }]}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            
            <View style={styles.missionBadge}>
              <View style={[styles.missionDot, { backgroundColor: jobStatus === 'OPEN' ? '#2ECC71' : theme.accent }]} />
              <Text style={styles.missionBadgeText}>DURUM: {jobStatus === 'OPEN' ? 'HAZIR' : jobStatus}</Text>
            </View>
          </View>

          <View style={[styles.matteRouteMain, { marginBottom: 15 }]}>
            <View style={styles.matteCityBlock}>
              <Text style={styles.matteLabel}>TEKLİF EDİLEN NAVLUN</Text>
              <Text style={[styles.matteCityName, { color: theme.accent }]}>
                {item.price ? `${item.price.toLocaleString('tr-TR')} ₺ + KDV` : 'TEKLİF USULÜ'}
              </Text>
            </View>
          </View>

          <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginBottom: 20 }} />

          <View style={styles.matteRouteMain}>
            <View style={styles.matteCityBlock}>
              <Text style={styles.matteLabel}>NEREDEN</Text>
              <Text style={styles.matteCityName} numberOfLines={1}>{item.origin.toUpperCase()}</Text>
            </View>
            
            <View style={styles.matteTelemetryWrap}>
              <View style={styles.matteTelemetryLine} />
              <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.4)" />
            </View>

            <View style={[styles.matteCityBlock, { alignItems: 'flex-end' }]}>
              <Text style={styles.matteLabel}>NEREYE</Text>
              <Text style={styles.matteCityName} numberOfLines={1}>{item.destination.toUpperCase()}</Text>
            </View>
          </View>
        </View>

        <View style={styles.content}>
          <View style={[styles.premiumDetailCard, { backgroundColor: theme.surface, borderColor: theme.border, marginTop: -35, zIndex: 10 }]}>
            <Text style={[styles.premiumLabelMicro, { color: theme.accent, marginBottom: 15, fontSize: 10 }]}>SEVKIYAT DETAYLARI</Text>
            <View style={styles.specBox}>
              <FontAwesome5 name="truck" size={16} color={theme.accent} />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={[styles.specLabel, { color: theme.textLight }]}>ARAÇ TİPİ</Text>
                <Text style={[styles.specValue, { color: theme.text }]}>{item.required_vehicle_type || 'Belirtilmemiş'}</Text>
              </View>
            </View>
            <View style={[styles.specBox, { marginTop: 10, alignItems: 'flex-start' }]}>
              <Ionicons name="cube-outline" size={16} color={theme.accent} style={{ marginTop: 2 }} />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={[styles.specLabel, { color: theme.textLight }]}>YÜK DETAYI</Text>
                <Text style={[styles.specValue, { color: theme.text, fontSize: 13, lineHeight: 18, marginTop: 4 }]}>{item.cargo_details || 'Belirtilmemiş'}</Text>
              </View>
            </View>
            <View style={[styles.specBox, { marginTop: 10 }]}>
              <Ionicons name="pricetag-outline" size={16} color={theme.success} />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={[styles.specLabel, { color: theme.textLight }]}>NAVLUN ÜCRETİ</Text>
                <Text style={[styles.specValue, { color: theme.success }]}>{item.price ? `₺${item.price} + KDV` : 'Teklif Usulü'}</Text>
              </View>
            </View>
            <View style={[styles.specBox, { marginTop: 10 }]}>
              <Ionicons name="calendar" size={16} color={theme.accent} />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={[styles.specLabel, { color: theme.textLight }]}>YÜKLEME BİLGİSİ</Text>
                <Text style={[styles.specValue, { color: theme.text }]}>{formatTurkishDate(item.pickup_date)}</Text>
              </View>
            </View>
            

          </View>

          {(jobStatus === 'ASSIGNED' || jobStatus === 'COMPLETED') && role === 'SHIPPER' && (
            <View style={[styles.premiumDetailCard, { backgroundColor: theme.surface, borderColor: theme.border }, jobStatus === 'ASSIGNED' && { borderLeftColor: '#2ECC71', borderLeftWidth: 4 }]}>
              <Text style={[styles.premiumLabelMicro, { color: theme.textLight, marginBottom: 12 }]}>{jobStatus === 'COMPLETED' ? 'İŞİ TAMAMLAYAN ŞOFÖR' : 'ATANAN ŞOFÖR'}</Text>
              
              {assignedDriverInfo ? (
                <View style={styles.driverInfoRow}>
                  <View style={[styles.avatarLarge, { backgroundColor: theme.primary }]}>
                    <Text style={styles.avatarLargeText}>{assignedDriverInfo.full_name?.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.driverNameLarge, { color: theme.text }]}>{assignedDriverInfo.full_name}</Text>
                    <Text style={[styles.driverPhone, { color: theme.textLight }]}>{assignedDriverInfo.phone}</Text>
                  </View>
                  <TouchableOpacity style={[styles.miniCallBtn, { borderColor: theme.border }]} onPress={() => Linking.openURL(`tel:${assignedDriverInfo.phone}`)}>
                    <Ionicons name="call" size={20} color={theme.accent} />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={[styles.driverInfoRow, { opacity: 0.7, paddingVertical: 10 }]}>
                   <ActivityIndicator size="small" color={theme.accent} style={{ marginRight: 10 }} />
                   <Text style={{ color: theme.textLight, fontSize: 13, fontWeight: '600' }}>Şoför bilgisi alınıyor...</Text>
                </View>
              )}

              {jobStatus === 'ASSIGNED' && (
                <TouchableOpacity style={[styles.completeJobButton, { backgroundColor: 'rgba(46, 204, 113, 0.1)', borderWidth: 1, borderColor: '#2ecc71', marginTop: 15 }]} onPress={handleCompleteJob}>
                  <Ionicons name="checkmark-circle-outline" size={20} color="#2ecc71" />
                  <Text style={[styles.completeJobButtonText, { color: '#2ecc71' }]}>İşi Tamamlandı Olarak İşaretle</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {role === 'SHIPPER' && (
            <View style={styles.requestsSection}>
              <Text style={[styles.premiumLabelMicro, { color: theme.accent, marginBottom: 15, fontSize: 10 }]}>BU İLANA GELEN BAŞVURULAR</Text>
              {loading ? (
                <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 20 }}/>
              ) : (
                <View>
                  {requests.length === 0 ? (
                    <View style={{ padding: 40, alignItems: 'center' }}>
                      <Ionicons name="clipboard-outline" size={40} color={theme.border} />
                      <Text style={{ color: theme.textLight, marginTop: 10 }}>Henüz bir başvuru yok.</Text>
                    </View>
                  ) : (
                    requests.map((r) => renderRequestItem({ item: r }))
                  )}
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>
      {renderStickyFooter()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  matteHeaderPanel: { padding: 25, paddingBottom: 50, marginBottom: 15, ...Shadows.large },
  matteHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)' },
  missionBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', paddingVertical: 6, paddingHorizontal: 12, borderRadius: Radius.round, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  missionDot: { width: 6, height: 6, borderRadius: 3, marginRight: 8 },
  missionBadgeText: { color: '#fff', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  matteRouteMain: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 35 },
  matteCityBlock: { flex: 1 },
  matteLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 8, fontWeight: '900', letterSpacing: 1.5, marginBottom: 6 },
  matteCityName: { color: '#fff', fontSize: 24, fontWeight: '900', letterSpacing: -1 },
  matteTelemetryWrap: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15 },
  matteTelemetryLine: { width: 30, height: 2, backgroundColor: 'rgba(255,255,255,0.1)', marginRight: 4 },
  content: { padding: Spacing.md },
  premiumDetailCard: { padding: 24, borderRadius: Radius.lg, marginBottom: 15, borderWidth: 1, ...Shadows.medium },
  premiumLabelMicro: { fontSize: 8, fontWeight: '900', letterSpacing: 1, opacity: 0.7 },
  premiumListItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, marginBottom: 10, borderRadius: Radius.md, borderWidth: 1, ...Shadows.sm },
  listAccentBar: { width: 4, height: 24, borderRadius: Radius.round, marginRight: 12 },
  miniCallBtn: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  acceptBtnSmall: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 16, borderRadius: Radius.md, ...Shadows.sm },
  acceptBtnText: { color: '#fff', fontSize: 13, fontWeight: '900', letterSpacing: 0.5 },
  pulseDot: { width: 6, height: 6, borderRadius: 3 },
  driverInfoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
  avatarLarge: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  avatarLargeText: { color: '#fff', fontSize: 20, fontWeight: '800' },
  driverName: { fontSize: 14, fontWeight: '800' },
  driverNameLarge: { fontSize: 16, fontWeight: '800' },
  driverPhone: { fontSize: 14, fontWeight: '600' },
  completeJobButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 8 },
  completeJobButtonText: { fontSize: 13, fontWeight: '800', marginLeft: 8 },
  requestsSection: { marginTop: 20, marginBottom: 40 },
  stickyFooter: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, paddingBottom: 40 },
  footerGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 120 },
  footerActions: { flexDirection: 'row', alignItems: 'center' },
  primaryActionBtn: { ...Shadows.large },
  secondaryActionBtn: { width: 56, height: 56, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, justifyContent: 'center', alignItems: 'center', ...Shadows.medium },
  actionBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, borderRadius: 16 },
  actionBtnText: { color: '#fff', fontSize: 13, fontWeight: '900', letterSpacing: 1, marginLeft: 8 },
  specBox: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, backgroundColor: 'rgba(150,150,150,0.05)', borderWidth: 1, borderColor: 'rgba(150,150,150,0.1)' },
  specLabel: { fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  specValue: { fontSize: 13, fontWeight: '800', marginTop: 2 },
});
