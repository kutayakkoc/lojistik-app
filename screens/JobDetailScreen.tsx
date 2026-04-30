import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, ScrollView, Dimensions, Linking, Platform } from 'react-native';
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

export default function JobDetailScreen({ route, navigation }: any) {
  const { theme } = useTheme();
  const { item, role } = route.params; 
  
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [jobData, setJobData] = useState<any>(item);
  const [assignedDriverInfo, setAssignedDriverInfo] = useState<any>(null);
  const [shipperPhone, setShipperPhone] = useState<string | null>(null);
  const [hasApplied, setHasApplied] = useState(false);
  const [applying, setApplying] = useState(false);
  const [initialCheckLoading, setInitialCheckLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      fetchInitialData();
    }, [item.id])
  );

  const formatTurkishDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
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
      const { data, error } = await supabase.from('jobs').select('*').eq('id', item.id).single();
      if (data) {
        setJobData(data);
        if ((data.status === 'ASSIGNED' || data.status === 'COMPLETED') && data.assigned_driver_id) {
           await fetchAssignedDriver(data.assigned_driver_id);
        }
      }
    } catch (e) {
      if ((item.status === 'ASSIGNED' || item.status === 'COMPLETED') && item.assigned_driver_id) {
         await fetchAssignedDriver(item.assigned_driver_id);
      }
    }
  };

  const fetchShipperPhone = async () => {
    try {
      const { data } = await supabase.from('profiles').select('phone').eq('id', item.shipper_id).single();
      if (data) setShipperPhone(data.phone);
    } catch (e) { /* silent fetch */ }
  };

  const checkIfApplied = async () => {
    if (role !== 'DRIVER') return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data } = await supabase
        .from('job_requests')
        .select('id')
        .eq('job_id', item.id)
        .eq('driver_id', session.user.id)
        .limit(1)
        .maybeSingle();

      setHasApplied(!!data);
    } catch (e) {}
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
    } catch (error: any) {}
  };

  const fetchAssignedDriver = async (driverId: string) => {
    if (!driverId) return;
    try {
      const { data } = await supabase.from('profiles').select('full_name, phone').eq('id', driverId).maybeSingle();
      if (data) setAssignedDriverInfo(data);
    } catch (e) {}
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
      
      try {
        const { data: shipperProfile } = await supabase.from('profiles').select('push_token').eq('id', item.shipper_id).single();
        if (shipperProfile?.push_token) {
          await sendPushNotification(
            shipperProfile.push_token,
            '🚚 Yeni Başvuru!',
            `${item.origin} -> ${item.destination} ilanınıza operasyon başvurusu yapıldı.`,
            { jobId: item.id, type: 'NEW_APPLICATION' }
          );
        }
      } catch (err) {}

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Hedef Kitlendi', 'Başvurunuz başarıyla komuta merkezine iletildi!');
      fetchRequests();
    } catch (error: any) {
      Alert.alert('Hata', 'Kritik sistem hatası: ' + error.message);
    } finally {
      setApplying(false);
    }
  };

  const handleWhatsApp = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!shipperPhone) {
      Alert.alert('Hata', 'Operatör telefonu şifrelenmiş veya yok.');
      return;
    }
    const message = `Merhaba, ${item.origin} - ${item.destination} koordinatlı görev için Akkoç Sisteminden ulaşıyorum.`;
    const url = `https://wa.me/${shipperPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;
    
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) Linking.openURL(url);
  };

  const handleAcceptRequest = async (requestId: string, driverId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Görevi Tayin Et',
      'Bu pilotu sefer için onaylıyor musunuz? Diğer talepler ret edilecektir.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        { 
          text: 'Seferi Başlat', 
          onPress: async () => {
            try {
              setLoading(true);
              const { error: acceptError } = await supabase.from('job_requests').update({ status: 'ACCEPTED' }).eq('id', requestId);
              if (acceptError) throw acceptError;

              await supabase.from('job_requests').update({ status: 'REJECTED' }).eq('job_id', item.id).neq('id', requestId).eq('status', 'PENDING');

              const { data: updatedJob, error: jobError } = await supabase.from('jobs').update({ status: 'ASSIGNED', assigned_driver_id: driverId }).eq('id', item.id).select();
              if (jobError) throw jobError;
              if (!updatedJob || updatedJob.length === 0) throw new Error('Sistem yetkisi reddedildi.');

              try {
                const { data: driverProfile } = await supabase.from('profiles').select('push_token').eq('id', driverId).single();
                if (driverProfile?.push_token) {
                  await sendPushNotification(
                    driverProfile.push_token,
                    '🚀 SEFER ONAYLANDI!',
                    `${item.origin} -> ${item.destination} görevi senin kontrolünde. Güvenli yolculuklar!`,
                    { jobId: item.id, type: 'APPLICATION_ACCEPTED' }
                  );
                }
              } catch (err) {}

              Alert.alert('Atama Başarılı', 'Şoför sahaya indirildi.');
              if (updatedJob && updatedJob[0]) {
                setJobData(updatedJob[0]);
              }
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
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(
      'Operasyon Sonu',
      'Pilotun teslimatı gerçekleştirdiğini dorğuluyor musunuz?',
      [
        { text: 'Hayır', style: 'cancel' },
        { 
          text: 'Operasyonu Kapat', 
          onPress: async () => {
            try {
              setLoading(true);
              const { data: completedJob, error } = await supabase.from('jobs').update({ status: 'COMPLETED' }).eq('id', item.id).select();
              if (error) throw error;
              if (!completedJob || completedJob.length === 0) throw new Error('Güncelleme gerçekleştirilemedi.');

              try {
                if (jobData.assigned_driver_id) {
                  const { data: driverProfile } = await supabase.from('profiles').select('push_token').eq('id', jobData.assigned_driver_id).single();
                  if (driverProfile?.push_token) {
                     sendPushNotification(
                      driverProfile.push_token,
                      '🏁 Görev Bitti',
                      `İşvereniniz ${item.origin} -> ${item.destination} teslimatını onayladı.`,
                      { jobId: item.id, type: 'JOB_COMPLETED' }
                    );
                  }
                }
              } catch (err) {}

              if (completedJob && completedJob[0]) {
                setJobData(completedJob[0]);
              }
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

  const handleCancelJob = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      'İptal İşlemi',
      'Bu ilanı tamamen iptal etmek istediğinize emin misiniz? Sistemdeki tüm pilot başvuruları da reddedilecektir.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        { 
          text: 'İptal Et', 
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const { error } = await supabase.from('jobs').update({ status: 'CANCELLED' }).eq('id', item.id);
              if (error) throw error;

              await supabase.from('job_requests').update({ status: 'REJECTED' }).eq('job_id', item.id).eq('status', 'PENDING');

              Alert.alert('İptal Edildi', 'İlanınız sistemden başarıyla çekildi.');
              const { data: cancelledJob } = await supabase.from('jobs').select('*').eq('id', item.id).single();
              if (cancelledJob) setJobData(cancelledJob);
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

  const getStatusColors = (status: string): readonly [string, string, ...string[]] => {
    switch (status) {
      case 'OPEN': return ['#10B981', '#059669']; // Emerald Active
      case 'ASSIGNED': return ['#F59E0B', '#D97706']; // Amber Road
      case 'COMPLETED': return ['#475569', '#334155']; // Slate Done
      case 'CANCELLED': return ['#EF4444', '#B91C1C']; // Red Cancelled
      default: return [theme.primary, theme.primary];
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'OPEN': return 'radio';
      case 'ASSIGNED': return 'rocket';
      case 'COMPLETED': return 'flag';
      case 'CANCELLED': return 'close-circle';
      default: return 'ellipse';
    }
  };

  const renderRequestItem = ({ item: req }: { item: any }) => {
    const isPending = req.status === 'PENDING';
    const isAccepted = req.status === 'ACCEPTED';
    const isRejected = req.status === 'REJECTED';

    return (
      <View key={req.id} style={[styles.reqCard, { backgroundColor: theme.surface, borderColor: theme.border }, isRejected && { opacity: 0.4 }]}>
         <View style={styles.reqInfoSection}>
            <View style={styles.reqAvatar}>
               <Text style={styles.reqAvatarTxt}>{req.driver?.full_name?.charAt(0) || '?'}</Text>
            </View>
            <View style={styles.reqTextBody}>
               <Text style={[styles.reqName, { color: theme.text }]}>{req.driver?.full_name || 'Bilinmeyen'}</Text>
               <Text style={[styles.reqPhone, { color: theme.textLight }]}>{req.driver?.phone || 'Gizli Numara'}</Text>
               <View style={styles.reqBadgeRow}>
                  <View style={[styles.pulseDot, { backgroundColor: isPending ? '#F59E0B' : (isAccepted ? '#10B981' : theme.textLight) }]} />
                  <Text style={[styles.reqBadgeTxt, { color: theme.textLight }]}>
                     {isPending ? 'SİSTEM ONAYI BEKLİYOR' : req.status === 'ACCEPTED' ? 'GÖREVLENDİRİLDİ' : 'REDDEDİLDİ'}
                  </Text>
               </View>
            </View>
         </View>

         <View style={styles.reqActionSection}>
           {isPending && jobData.status === 'OPEN' && role === 'SHIPPER' && (
             <TouchableOpacity style={styles.actionAssignBtn} onPress={() => handleAcceptRequest(req.id, req.driver_id)}>
                <LinearGradient colors={['#10B981', '#059669']} style={[StyleSheet.absoluteFill, { borderRadius: 10 }]} />
                <Ionicons name="checkmark-sharp" size={16} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.actionAssignTxt}>ONAYLA</Text>
             </TouchableOpacity>
           )}
           {isAccepted && (
              <TouchableOpacity style={styles.actionCallBtn} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); Linking.openURL(`tel:${req.driver?.phone}`); }}>
                 <Ionicons name="call" size={20} color="#10B981" />
              </TouchableOpacity>
           )}
         </View>
      </View>
    );
  };

  const renderStickyFooter = () => {
    if (role !== 'DRIVER' || (jobData.status !== 'OPEN' && jobData.status !== 'ASSIGNED')) return null;

    return (
      <View style={styles.stickyFooter} pointerEvents="box-none">
        <LinearGradient colors={['rgba(255,255,255,0)', theme.background]} style={styles.footerGradient} pointerEvents="none" />
        <View style={styles.footerActions}>
          <TouchableOpacity 
            style={[styles.primaryApplyBtn, { opacity: initialCheckLoading ? 0.7 : 1 }]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); handleApplyJob(); }}
            disabled={hasApplied || applying || initialCheckLoading}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={initialCheckLoading ? [theme.border, theme.border] : (hasApplied ? ['#94A3B8', '#64748B'] : [theme.accent, '#f35d18'])}
              style={styles.applyBtnGradient}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            >
              {applying || initialCheckLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name={hasApplied ? "checkmark-circle" : "send"} size={20} color="#fff" />
                  <Text style={styles.applyBtnTxt}>{hasApplied ? 'SİSTEMDE BAŞVURUNUZ VAR' : 'GÖREVE TALİP OL'}</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.whatsappBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
            onPress={handleWhatsApp}
            activeOpacity={0.7}
          >
            <Ionicons name="logo-whatsapp" size={28} color="#25D366" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style="light" translucent />
      
      {/* Hero Header - Shipping Manifest */}
      <View style={[styles.heroHeader, { paddingTop: insets.top + 15 }]}>
         <LinearGradient colors={getStatusColors(jobData.status)} style={StyleSheet.absoluteFill} />
         
         <View style={styles.headerTop}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
               <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={styles.statusPill}>
               <Ionicons name={getStatusIcon(jobData.status)} size={12} color="#000" style={{ marginRight: 6 }} />
               <Text style={styles.statusPillText}>
                  {jobData.status === 'OPEN' ? 'İLAN AKTİF' : jobData.status === 'ASSIGNED' ? 'YOLDA' : jobData.status === 'CANCELLED' ? 'İPTAL EDİLDİ' : 'GÖREV BİTTİ'}
               </Text>
            </View>
         </View>

         <View style={styles.manifestView}>
            <View style={styles.cityBlock}>
               <Text style={styles.cityLabel}>ÇIKIŞ</Text>
               <Text style={styles.cityName} numberOfLines={1}>{item.origin.toUpperCase()}</Text>
            </View>
            <View style={styles.flowPath}>
               <View style={styles.dashLine}></View>
               <View style={styles.truckIconWrapper}>
                 <FontAwesome5 name={jobData.status === 'COMPLETED' ? "flag-checkered" : jobData.status === 'CANCELLED' ? "times" : "truck-moving"} size={16} color={getStatusColors(jobData.status)[0]} />
               </View>
               <View style={styles.dashLine}></View>
            </View>
            <View style={[styles.cityBlock, { alignItems: 'flex-end' }]}>
               <Text style={styles.cityLabel}>VARIŞ</Text>
               <Text style={styles.cityName} numberOfLines={1}>{item.destination.toUpperCase()}</Text>
            </View>
         </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
         {/* Financial / Ticket Card */}
         <View style={[styles.ticketCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.ticketHeaderRow}>
               <Ionicons name="receipt" size={16} color={theme.accent} />
               <Text style={[styles.ticketTitle, { color: theme.text }]}>NAVLUN ÖZETİ</Text>
            </View>
            <View style={styles.ticketDataRow}>
               <Text style={[styles.priceLarge, { color: theme.accent }]}>
                 {jobData.price 
                   ? `${jobData.price.toLocaleString('tr-TR')} ₺` 
                   : (jobData.status === 'OPEN' ? 'TEKLİFE AÇIK' : 'NAVLUN ANLAŞILDI')}
               </Text>
                {!!jobData.price && <Text style={[styles.taxLabel, { color: theme.textLight }]}>+ KDV</Text>}
            </View>
         </View>

         {/* Technical Spec Grid */}
         <View style={styles.gridContainer}>
            <View style={[styles.gridCell, { backgroundColor: theme.surface, borderColor: theme.border, marginRight: 15 }]}>
               <View style={styles.gridIconWrap}>
                 <Ionicons name="cube" size={20} color={theme.accent} />
               </View>
               <Text style={[styles.gridLabel, { color: theme.textLight }]}>YÜK TİPİ</Text>
               <Text style={[styles.gridValue, { color: theme.text }]} numberOfLines={2}>{item.cargo_details || 'Belirtilmedi'}</Text>
            </View>
            <View style={[styles.gridCell, { backgroundColor: theme.surface, borderColor: theme.border }]}>
               <View style={styles.gridIconWrap}>
                 <Ionicons name="car-sport" size={20} color={theme.accent} />
               </View>
               <Text style={[styles.gridLabel, { color: theme.textLight }]}>ARAÇ ŞARTI</Text>
               <Text style={[styles.gridValue, { color: theme.text }]} numberOfLines={1}>{item.required_vehicle_type || 'Herhangi'}</Text>
            </View>
         </View>

         <View style={styles.gridContainer}>
            <View style={[styles.gridCell, { backgroundColor: theme.surface, borderColor: theme.border }]}>
               <View style={styles.gridIconWrap}>
                 <Ionicons name="calendar-sharp" size={20} color={theme.accent} />
               </View>
               <Text style={[styles.gridLabel, { color: theme.textLight }]}>OPERASYON TARİHİ</Text>
               <Text style={[styles.gridValue, { color: theme.text }]}>{formatTurkishDate(item.pickup_date)}</Text>
            </View>
         </View>

         {/* Assigned Pilot Mission Banner */}
         {(jobData.status === 'ASSIGNED' || jobData.status === 'COMPLETED') && role === 'SHIPPER' && (
            <View style={[styles.pilotCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
               <View style={[styles.pilotBorderLeft, { backgroundColor: jobData.status === 'COMPLETED' ? '#475569' : '#F59E0B' }]} />
               <View style={styles.pilotCardContent}>
                 <Text style={[styles.pilotSubtitle, { color: theme.textLight }]}>OPERASYONU YÜRÜTEN PİLOT</Text>
                 
                 {assignedDriverInfo ? (
                   <View style={styles.pilotIdBlock}>
                      <View style={[styles.pilotAvatar, { backgroundColor: jobData.status === 'COMPLETED' ? '#475569' : '#F59E0B' }]}>
                         <Text style={styles.pilotAvatarInitial}>{assignedDriverInfo.full_name?.charAt(0).toUpperCase()}</Text>
                      </View>
                      <View style={styles.pilotIdTextWrap}>
                         <Text style={[styles.pilotFullName, { color: theme.text }]}>{assignedDriverInfo.full_name}</Text>
                         <Text style={[styles.pilotPhoneNum, { color: theme.textLight }]}>{assignedDriverInfo.phone}</Text>
                      </View>
                      <TouchableOpacity style={styles.pilotDialBtn} onPress={() => Linking.openURL(`tel:${assignedDriverInfo.phone}`)}>
                         <Ionicons name="call" size={22} color="#fff" />
                      </TouchableOpacity>
                   </View>
                 ) : (
                   <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 15}}>
                     <ActivityIndicator size="small" color={theme.accent} style={{ marginRight: 10 }} />
                     <Text style={{color: theme.textLight, fontSize: 13, fontWeight: '600'}}>Uydu Taraması Sürüyor...</Text>
                   </View>
                 )}

                 {jobData.status === 'ASSIGNED' && (
                    <TouchableOpacity style={styles.closeOpBtn} onPress={handleCompleteJob}>
                       <LinearGradient colors={['#10B981', '#059669']} style={[StyleSheet.absoluteFill, { borderRadius: 12 }]} />
                       <Ionicons name="shield-checkmark" size={18} color="#fff" style={{marginRight: 8}} />
                       <Text style={styles.closeOpTxt}>OPERASYONU BAŞARIYLA BİTİR</Text>
                    </TouchableOpacity>
                 )}
               </View>
            </View>
         )}

         {/* Shippers Application Screen Section */}
         {role === 'SHIPPER' && jobData.status === 'OPEN' && (
            <View style={styles.radarSection}>
               <View style={styles.radarHeader}>
                  <Ionicons name="radio-outline" size={18} color={theme.accent} style={{marginRight: 8}} />
                  <Text style={[styles.radarTitle, { color: theme.textLight }]}>SİSTEME DÜŞEN BAŞVURULAR</Text>
               </View>

               {loading ? (
                  <ActivityIndicator size="large" color={theme.accent} style={{ marginTop: 30 }} />
               ) : requests.length === 0 ? (
                  <View style={styles.radarEmpty}>
                     <Ionicons name="planet-outline" size={48} color={theme.border} />
                     <Text style={[styles.radarEmptyTxt, { color: theme.textLight }]}>Henüz radar alanında pilot yok.</Text>
                  </View>
               ) : (
                  <View style={{marginTop: 15}}>
                    {requests.map((req) => renderRequestItem({ item: req }))}
                  </View>
               )}
            </View>
         )}

         {/* Cancel Job Display */}
         {role === 'SHIPPER' && jobData.status === 'OPEN' && (
            <TouchableOpacity style={styles.cancelJobBtn} onPress={handleCancelJob}>
               <Ionicons name="trash-outline" size={18} color="#EF4444" style={{marginRight: 8}} />
               <Text style={styles.cancelJobTxt}>İŞİ İPTAL ET</Text>
            </TouchableOpacity>
         )}
         
      </ScrollView>
      {renderStickyFooter()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  
  // Hero Header
  heroHeader: { paddingBottom: 40, paddingHorizontal: 20, borderBottomLeftRadius: 36, borderBottomRightRadius: 36, ...Shadows.large, zIndex: 10 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'center', alignItems: 'center' },
  statusPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusPillText: { color: '#000', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  
  // Manifest Block
  manifestView: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  cityBlock: { flex: 1 },
  cityLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 9, fontWeight: '900', letterSpacing: 2, marginBottom: 8 },
  cityName: { color: '#fff', fontSize: 26, fontWeight: '900', letterSpacing: -1 },
  flowPath: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flex: 0.8, paddingHorizontal: 10 },
  dashLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.3)' },
  truckIconWrapper: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', marginHorizontal: 8, ...Shadows.sm },

  // Content
  scrollContent: { padding: 20, paddingBottom: 160 },
  
  // Ticket
  ticketCard: { padding: 24, borderRadius: Radius.xl, borderWidth: 1, ...Shadows.medium, marginBottom: 15 },
  ticketHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  ticketTitle: { fontSize: 11, fontWeight: '900', letterSpacing: 1.5, marginLeft: 8 },
  ticketDataRow: { flexDirection: 'row', alignItems: 'baseline' },
  priceLarge: { fontSize: 32, fontWeight: '900', letterSpacing: -1 },
  taxLabel: { fontSize: 14, fontWeight: '800', marginLeft: 8 },

  // Grids
  gridContainer: { flexDirection: 'row', marginBottom: 15 },
  gridCell: { flex: 1, padding: 20, borderRadius: Radius.lg, borderWidth: 1, ...Shadows.sm },
  gridIconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(150,150,150,0.05)', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  gridLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 1.2, marginBottom: 6 },
  gridValue: { fontSize: 14, fontWeight: '800', lineHeight: 20 },

  // Pilot Component
  pilotCard: { borderRadius: Radius.xl, borderWidth: 1, ...Shadows.medium, overflow: 'hidden', marginTop: 10, marginBottom: 20 },
  pilotBorderLeft: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 6 },
  pilotCardContent: { padding: 24, paddingLeft: 30 },
  pilotSubtitle: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  pilotIdBlock: { flexDirection: 'row', alignItems: 'center', marginTop: 20 },
  pilotAvatar: { width: 54, height: 54, borderRadius: 27, justifyContent: 'center', alignItems: 'center', ...Shadows.sm },
  pilotAvatarInitial: { color: '#fff', fontSize: 22, fontWeight: '900' },
  pilotIdTextWrap: { flex: 1, paddingLeft: 16 },
  pilotFullName: { fontSize: 18, fontWeight: '900' },
  pilotPhoneNum: { fontSize: 13, fontWeight: '700', marginTop: 4 },
  pilotDialBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#10B981', justifyContent: 'center', alignItems: 'center', ...Shadows.medium },
  closeOpBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 52, borderRadius: 12, marginTop: 25 },
  closeOpTxt: { color: '#fff', fontSize: 12, fontWeight: '900', letterSpacing: 1 },

  // Requests Radar
  radarSection: { marginTop: 10, marginBottom: 40 },
  radarHeader: { flexDirection: 'row', alignItems: 'center' },
  radarTitle: { fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  radarEmpty: { alignItems: 'center', marginTop: 30, paddingVertical: 40, borderRadius: Radius.xl, borderWidth: 1, borderColor: 'rgba(150,150,150,0.1)', borderStyle: 'dashed' },
  radarEmptyTxt: { fontSize: 13, fontWeight: '600', marginTop: 15 },
  
  // Request Items
  reqCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: Radius.lg, borderWidth: 1, marginBottom: 12, ...Shadows.sm },
  reqInfoSection: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  reqAvatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(150,150,150,0.1)', justifyContent: 'center', alignItems: 'center' },
  reqAvatarTxt: { fontSize: 18, fontWeight: '900', color: '#10B981' },
  reqTextBody: { flex: 1, marginLeft: 15 },
  reqName: { fontSize: 15, fontWeight: '800' },
  reqPhone: { fontSize: 11, fontWeight: '700', marginTop: 4 },
  reqBadgeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  pulseDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  reqBadgeTxt: { fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  reqActionSection: { marginLeft: 10 },
  actionAssignBtn: { paddingHorizontal: 16, height: 38, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  actionAssignTxt: { color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  actionCallBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(16, 185, 129, 0.1)', borderWidth: 1, borderColor: '#10B981', justifyContent: 'center', alignItems: 'center' },
  
  // Footer
  stickyFooter: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, paddingBottom: 35 },
  footerGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 120 },
  footerActions: { flexDirection: 'row', alignItems: 'center' },
  primaryApplyBtn: { flex: 1, marginRight: 12, ...Shadows.large },
  applyBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 60, borderRadius: 18 },
  applyBtnTxt: { color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 1, marginLeft: 10 },
  whatsappBtn: { width: 60, height: 60, borderRadius: 18, borderWidth: 1, justifyContent: 'center', alignItems: 'center', ...Shadows.medium },

  // Shipper Controls
  cancelJobBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 52, borderRadius: 12, marginTop: 10, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)', backgroundColor: 'rgba(239, 68, 68, 0.05)' },
  cancelJobTxt: { color: '#EF4444', fontSize: 12, fontWeight: '900', letterSpacing: 1 }
});
