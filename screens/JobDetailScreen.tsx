import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  Alert, ScrollView, Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '../lib/supabase';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Shadows } from '../constants/Theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { sendPushNotification } from '../lib/notifications';
import { openPhoneCall, openWhatsApp } from '../lib/utils';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

const HEADER_BG = '#1E3A8A';
const ACCENT = '#F35D18';

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'OPEN':      return { label: 'Aktif İlan',     color: '#22C55E' };
    case 'ASSIGNED':  return { label: 'Yolda',           color: '#D97706' };
    case 'COMPLETED': return { label: 'Tamamlandı',      color: '#94A3B8' };
    case 'CANCELLED': return { label: 'İptal Edildi',    color: '#EF4444' };
    default:          return { label: status,            color: '#94A3B8' };
  }
};

const formatTime = (timeStr: string | null | undefined) => {
  if (!timeStr) return null;
  return timeStr.slice(0, 5);
};

const formatTurkishDate = (dateStr: string) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch { return dateStr; }
};

const formatDateTime = (iso: string) => {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}, ${hh}:${mm}`;
  } catch { return iso; }
};

const shortId = (id: string) => id ? `#${id.replace(/-/g, '').slice(0, 8).toUpperCase()}` : '#—';

export default function JobDetailScreen({ route, navigation }: any) {
  const { item, role } = route.params;
  const insets = useSafeAreaInsets();

  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [jobData, setJobData] = useState<any>(item);
  const [assignedDriverInfo, setAssignedDriverInfo] = useState<any>(null);
  const [shipperInfo, setShipperInfo] = useState<{ full_name: string | null; phone: string | null } | null>(null);
  const [shipperOpenCount, setShipperOpenCount] = useState<number>(0);
  const [hasApplied, setHasApplied] = useState(false);
  const [applying, setApplying] = useState(false);
  const [initialCheckLoading, setInitialCheckLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      fetchInitialData();
    }, [item.id]),
  );

  const fetchInitialData = async () => {
    setLoading(true);
    setInitialCheckLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (session) setUserId(session.user.id);

    await fetchFreshJobData();
    await Promise.all([fetchRequests(), fetchShipperInfo(), fetchShipperOpenCount(), checkIfApplied()]);

    setLoading(false);
    setInitialCheckLoading(false);
  };

  const fetchFreshJobData = async () => {
    try {
      const { data } = await supabase.from('jobs').select('*').eq('id', item.id).single();
      if (data) {
        setJobData(data);
        if ((data.status === 'ASSIGNED' || data.status === 'COMPLETED') && data.assigned_driver_id) {
          await fetchAssignedDriver(data.assigned_driver_id);
        }
      }
    } catch {
      if ((item.status === 'ASSIGNED' || item.status === 'COMPLETED') && item.assigned_driver_id) {
        await fetchAssignedDriver(item.assigned_driver_id);
      }
    }
  };

  const fetchShipperInfo = async () => {
    try {
      const { data } = await supabase.from('profiles').select('full_name, phone').eq('id', item.shipper_id).single();
      if (data) setShipperInfo(data);
    } catch (e) { console.error('fetchShipperInfo:', e); }
  };

  const fetchShipperOpenCount = async () => {
    try {
      const { count } = await supabase
        .from('jobs')
        .select('id', { count: 'exact', head: true })
        .eq('shipper_id', item.shipper_id)
        .eq('status', 'OPEN');
      setShipperOpenCount(count ?? 0);
    } catch (e) { console.error('fetchShipperOpenCount:', e); }
  };

  const checkIfApplied = async () => {
    if (role !== 'DRIVER') return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase
        .from('job_requests').select('id')
        .eq('job_id', item.id).eq('driver_id', session.user.id)
        .limit(1).maybeSingle();
      setHasApplied(!!data);
    } catch (e) { console.error('checkIfApplied:', e); }
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
    } catch (error: any) { console.error('fetchRequests:', error); }
  };

  const fetchAssignedDriver = async (driverId: string) => {
    if (!driverId) return;
    try {
      const { data } = await supabase.from('profiles').select('full_name, phone').eq('id', driverId).maybeSingle();
      if (data) setAssignedDriverInfo(data);
    } catch (e) { console.error('fetchAssignedDriver:', e); }
  };

  const handleApplyJob = async () => {
    if (hasApplied || applying || !userId) return;
    try {
      setApplying(true);
      const { data: existing } = await supabase.from('job_requests').select('id').eq('job_id', item.id).eq('driver_id', userId).maybeSingle();
      if (existing) { setHasApplied(true); Alert.alert('Uyarı', 'Bu ilana zaten başvuru yaptınız.'); return; }

      const { error } = await supabase.from('job_requests').insert({ job_id: item.id, driver_id: userId, status: 'PENDING' });
      if (error) throw error;
      setHasApplied(true);

      try {
        const { data: shipperProfile } = await supabase.from('profiles').select('push_token').eq('id', item.shipper_id).single();
        if (shipperProfile?.push_token) {
          await sendPushNotification(shipperProfile.push_token, '🚚 Yeni Başvuru!', `${item.origin} -> ${item.destination} ilanınıza başvuru yapıldı.`, { jobId: item.id, type: 'NEW_APPLICATION' });
        }
      } catch {}

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Başvuru Yapıldı', 'Başvurunuz başarıyla iletildi!');
      fetchRequests();
    } catch (error: any) {
      Alert.alert('Hata', error.message);
    } finally {
      setApplying(false);
    }
  };

  const handleWhatsApp = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!shipperInfo?.phone) { Alert.alert('Hata', 'İşveren telefon bilgisi bulunamadı.'); return; }
    openWhatsApp(shipperInfo.phone, `Merhaba, ${item.origin} - ${item.destination} ilanı için Akkoç Lojistik üzerinden ulaşıyorum.`);
  };

  const handleAcceptRequest = async (requestId: string, driverId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Görevi Tayin Et', 'Bu şoförü sefer için onaylıyor musunuz? Diğer başvurular reddedilecektir.', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Onayla',
        onPress: async () => {
          try {
            setLoading(true);
            const { error: acceptError } = await supabase.from('job_requests').update({ status: 'ACCEPTED' }).eq('id', requestId);
            if (acceptError) throw acceptError;

            await supabase.from('job_requests').update({ status: 'REJECTED' }).eq('job_id', item.id).neq('id', requestId).eq('status', 'PENDING');

            const { data: updatedJob, error: jobError } = await supabase.from('jobs').update({ status: 'ASSIGNED', assigned_driver_id: driverId }).eq('id', item.id).select();
            if (jobError) throw jobError;
            if (!updatedJob || updatedJob.length === 0) throw new Error('Güncelleme gerçekleştirilemedi.');

            try {
              const { data: driverProfile } = await supabase.from('profiles').select('push_token').eq('id', driverId).single();
              if (driverProfile?.push_token) {
                await sendPushNotification(driverProfile.push_token, '🚀 Görev Onaylandı!', `${item.origin} -> ${item.destination} görevi sizin. Güvenli yolculuklar!`, { jobId: item.id, type: 'APPLICATION_ACCEPTED' });
              }
            } catch {}

            Alert.alert('Atama Başarılı', 'Şoför göreve atandı.');
            if (updatedJob[0]) setJobData(updatedJob[0]);
            fetchAssignedDriver(driverId);
            fetchRequests();
          } catch (error: any) {
            Alert.alert('Hata', error.message);
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  const handleCompleteJob = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Görevi Tamamla', 'Teslimatın gerçekleştiğini onaylıyor musunuz?', [
      { text: 'Hayır', style: 'cancel' },
      {
        text: 'Tamamlandı',
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
                  await sendPushNotification(driverProfile.push_token, '🏁 Görev Bitti', `${item.origin} -> ${item.destination} teslimatı onaylandı.`, { jobId: item.id, type: 'JOB_COMPLETED' });
                }
              }
            } catch {}

            if (completedJob[0]) setJobData(completedJob[0]);
          } catch (error: any) {
            Alert.alert('Hata', error.message);
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  const handleCancelJob = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert('İlanı İptal Et', 'Bu ilanı iptal etmek istediğinize emin misiniz? Tüm başvurular reddedilecektir.', [
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
            Alert.alert('İptal Edildi', 'İlanınız sistemden çekildi.');
            const { data: cancelledJob } = await supabase.from('jobs').select('*').eq('id', item.id).single();
            if (cancelledJob) setJobData(cancelledJob);
            fetchRequests();
          } catch (error: any) {
            Alert.alert('Hata', error.message);
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  const statusCfg = getStatusConfig(jobData.status);
  const timeStart = formatTime(jobData.pickup_time_start);
  const timeEnd = formatTime(jobData.pickup_time_end);
  const timeRange = timeStart && timeEnd ? `${timeStart} - ${timeEnd}` : (timeStart || timeEnd || null);

  const renderRequestItem = (req: any) => {
    const isPending  = req.status === 'PENDING';
    const isAccepted = req.status === 'ACCEPTED';
    const isRejected = req.status === 'REJECTED';

    return (
      <View key={req.id} style={[styles.reqCard, isRejected && { opacity: 0.4 }]}>
        <View style={styles.reqLeft}>
          <View style={styles.reqAvatar}>
            <Text style={styles.reqAvatarText}>{req.driver?.full_name?.charAt(0) || '?'}</Text>
          </View>
          <View style={styles.reqInfo}>
            <Text style={styles.reqName}>{req.driver?.full_name || 'Bilinmeyen'}</Text>
            <Text style={styles.reqPhone}>{req.driver?.phone || '—'}</Text>
            <View style={styles.reqBadgeRow}>
              <View style={[styles.reqDot, { backgroundColor: isPending ? '#D97706' : isAccepted ? '#16A34A' : '#94A3B8' }]} />
              <Text style={styles.reqBadgeText}>
                {isPending ? 'Onay Bekliyor' : isAccepted ? 'Görevlendirildi' : 'Reddedildi'}
              </Text>
            </View>
          </View>
        </View>
        <View>
          {isPending && jobData.status === 'OPEN' && role === 'SHIPPER' && (
            <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAcceptRequest(req.id, req.driver_id)}>
              <Ionicons name="checkmark-sharp" size={14} color="#fff" />
              <Text style={styles.acceptBtnText}>ONAYLA</Text>
            </TouchableOpacity>
          )}
          {isAccepted && (
            <TouchableOpacity style={styles.callBtn} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); openPhoneCall(req.driver?.phone); }}>
              <Ionicons name="call" size={20} color="#16A34A" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <LinearGradient
        colors={['#1E3A8A', '#020617']}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>İlan Detayı</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.headerBody}>
          <View style={styles.headerInfo}>
            <View style={[styles.statusPill, { backgroundColor: statusCfg.color + '22', borderColor: statusCfg.color + '55' }]}>
              <View style={[styles.pillDot, { backgroundColor: statusCfg.color }]} />
              <Text style={[styles.pillText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
            </View>

            <Text style={styles.routeText} numberOfLines={1}>
              {item.origin} <Text style={{ color: 'rgba(255,255,255,0.6)' }}>→</Text> {item.destination}
            </Text>

            {!!item.cargo_details && (
              <Text style={styles.cargoSubtitle} numberOfLines={1}>{item.cargo_details}</Text>
            )}

            <View style={styles.metaRow}>
              <Ionicons name="information-circle-outline" size={13} color="rgba(255,255,255,0.55)" />
              <Text style={styles.metaText}>İlan No: {shortId(item.id)}</Text>
            </View>
            <View style={styles.metaRow}>
              <Ionicons name="time-outline" size={13} color="rgba(255,255,255,0.55)" />
              <Text style={styles.metaText}>Oluşturulma: {formatDateTime(jobData.created_at)}</Text>
            </View>
          </View>

        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats card */}
        <View style={styles.statsCard}>
          <View style={styles.statCell}>
            <View style={styles.statIcon}>
              <Ionicons name="cash-outline" size={18} color={ACCENT} />
            </View>
            <Text style={styles.statLabel}>YÜK ÜCRETİ</Text>
            <Text style={styles.statValue} numberOfLines={1}>
              {jobData.price ? `${jobData.price.toLocaleString('tr-TR')} ₺` : 'Teklif'}
            </Text>
            {!!jobData.price && <Text style={styles.statSub}>KDV Hariç</Text>}
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statCell}>
            <View style={styles.statIcon}>
              <Ionicons name="barbell-outline" size={18} color={ACCENT} />
            </View>
            <Text style={styles.statLabel}>YÜK AĞIRLIĞI</Text>
            <Text style={styles.statValue} numberOfLines={1}>
              {jobData.weight_kg ? `${Number(jobData.weight_kg).toLocaleString('tr-TR')} KG` : '—'}
            </Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statCell}>
            <View style={styles.statIcon}>
              <Ionicons name="calendar-outline" size={18} color={ACCENT} />
            </View>
            <Text style={styles.statLabel}>YÜKLEME TARİHİ</Text>
            <Text style={styles.statValue} numberOfLines={1}>{formatTurkishDate(jobData.pickup_date)}</Text>
            {!!timeRange && <Text style={styles.statSub}>{timeRange}</Text>}
          </View>
        </View>

        {/* Route card */}
        <View style={styles.routeCard}>
          <View style={styles.routeTimeline}>
            <View style={styles.timelineItem}>
              <View style={[styles.pinCircle, { backgroundColor: ACCENT + '20' }]}>
                <Ionicons name="location" size={16} color={ACCENT} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.timelineLabel}>YÜKLEME</Text>
                <Text style={styles.timelineCity}>{item.origin}</Text>
              </View>
            </View>

            <View style={styles.timelineConnector}>
              <View style={styles.dottedLine} />
              <View style={styles.truckBadge}>
                <FontAwesome5 name="truck" size={11} color="#94A3B8" />
              </View>
              <View style={styles.dottedLine} />
            </View>

            <View style={styles.timelineItem}>
              <View style={[styles.pinCircle, { backgroundColor: HEADER_BG }]}>
                <Ionicons name="location" size={16} color="#fff" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.timelineLabel}>BOŞALTMA</Text>
                <Text style={styles.timelineCity}>{item.destination}</Text>
              </View>
            </View>
          </View>

          <View style={styles.specBox}>
            <View style={styles.specRow}>
              <Ionicons name="cube-outline" size={14} color="#64748B" />
              <Text style={styles.specLabel}>Yük Tipi</Text>
              <Text style={styles.specValue} numberOfLines={1}>{item.cargo_details ? item.cargo_details.split(',')[0].trim() : 'Belirtilmedi'}</Text>
            </View>
            <View style={styles.specRow}>
              <Ionicons name="car-outline" size={14} color="#64748B" />
              <Text style={styles.specLabel}>Araç Şartı</Text>
              <Text style={styles.specValue} numberOfLines={1}>{item.required_vehicle_type || 'Herhangi'}</Text>
            </View>
          </View>
        </View>

        {/* Cargo description */}
        {!!item.cargo_details && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="document-text-outline" size={16} color={ACCENT} />
              <Text style={styles.cardTitle}>Yük Açıklaması</Text>
            </View>
            <Text style={styles.descText}>{item.cargo_details}</Text>
          </View>
        )}

        {/* Assigned driver (SHIPPER view) */}
        {(jobData.status === 'ASSIGNED' || jobData.status === 'COMPLETED') && role === 'SHIPPER' && (
          <View style={styles.driverCard}>
            <View style={[styles.driverAccent, { backgroundColor: jobData.status === 'COMPLETED' ? '#94A3B8' : '#D97706' }]} />
            <View style={styles.driverBody}>
              <Text style={styles.driverLabel}>OPERASYONU YÜRÜTEN ŞOFÖR</Text>
              {assignedDriverInfo ? (
                <View style={styles.driverRow}>
                  <View style={[styles.driverAvatar, { backgroundColor: jobData.status === 'COMPLETED' ? '#94A3B8' : '#D97706' }]}>
                    <Text style={styles.driverAvatarText}>{assignedDriverInfo.full_name?.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1, paddingLeft: 12 }}>
                    <Text style={styles.driverName}>{assignedDriverInfo.full_name}</Text>
                    <Text style={styles.driverPhone}>{assignedDriverInfo.phone}</Text>
                  </View>
                  <TouchableOpacity style={styles.driverCallBtn} onPress={() => openPhoneCall(assignedDriverInfo.phone)}>
                    <Ionicons name="call" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
              ) : (
                <ActivityIndicator size="small" color={ACCENT} style={{ marginTop: 12 }} />
              )}
              {jobData.status === 'ASSIGNED' && (
                <TouchableOpacity style={styles.completeBtn} onPress={handleCompleteJob}>
                  <Ionicons name="shield-checkmark" size={16} color="#fff" />
                  <Text style={styles.completeBtnText}>OPERASYONU TAMAMLA</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Applications (SHIPPER + OPEN) */}
        {role === 'SHIPPER' && jobData.status === 'OPEN' && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="people-outline" size={16} color={ACCENT} />
              <Text style={styles.cardTitle}>Gelen Başvurular</Text>
              {requests.length > 0 && (
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{requests.length}</Text>
                </View>
              )}
            </View>
            {loading ? (
              <ActivityIndicator size="small" color={ACCENT} style={{ marginVertical: 16 }} />
            ) : requests.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="planet-outline" size={36} color="#CBD5E1" />
                <Text style={styles.emptyText}>Henüz başvuru yok.</Text>
              </View>
            ) : (
              <View>{requests.map(req => renderRequestItem(req))}</View>
            )}
          </View>
        )}

        {/* Cancel (SHIPPER + OPEN) */}
        {role === 'SHIPPER' && jobData.status === 'OPEN' && (
          <TouchableOpacity style={styles.cancelBtn} onPress={handleCancelJob}>
            <Ionicons name="trash-outline" size={16} color="#EF4444" />
            <Text style={styles.cancelBtnText}>İLANI İPTAL ET</Text>
          </TouchableOpacity>
        )}

        {/* Company card */}
        <View style={styles.companyCard}>
          <Image
            source={require('../assets/images/512x512 akkoc tahta.png')}
            style={styles.companyLogo}
            resizeMode="contain"
          />
          <View style={styles.companyInfo}>
            <Text style={styles.companyName} numberOfLines={1}>{shipperInfo?.full_name || 'Akkoç Lojistik'}</Text>
            <View style={styles.companyMetaRow}>
              <Ionicons name="cube-outline" size={12} color="#64748B" />
              <Text style={styles.companyMeta}>{shipperOpenCount} Açık İlan</Text>
            </View>
          </View>
          {role === 'DRIVER' && shipperInfo?.phone && (
            <View style={styles.companyActions}>
              <TouchableOpacity style={styles.iconBtn} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); openPhoneCall(shipperInfo.phone); }}>
                <Ionicons name="call" size={18} color={ACCENT} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn} onPress={handleWhatsApp}>
                <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
              </TouchableOpacity>
            </View>
          )}
        </View>

      </ScrollView>

      {/* Sticky footer (DRIVER) */}
      {role === 'DRIVER' && (jobData.status === 'OPEN' || jobData.status === 'ASSIGNED') && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + 14 }]}>
          <TouchableOpacity
            style={[
              styles.applyBtn,
              hasApplied ? styles.applyBtnDone : styles.applyBtnActive,
              (applying || initialCheckLoading) && { opacity: 0.7 },
            ]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); handleApplyJob(); }}
            disabled={hasApplied || applying || initialCheckLoading}
            activeOpacity={0.85}
          >
            {applying || initialCheckLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Text style={styles.applyBtnText}>
                  {hasApplied ? 'BAŞVURUNUZ ALINDI' : 'TEKLİF VER'}
                </Text>
                {!hasApplied && <Ionicons name="arrow-forward" size={18} color="#fff" />}
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },

  // Header
  header: { paddingHorizontal: 16, paddingBottom: 24, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  headerBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.10)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '800' },
  headerBody: { flexDirection: 'row', alignItems: 'center' },
  headerInfo: { flex: 1, paddingRight: 8 },
  headerLogo: { width: 96, height: 96, borderRadius: 48, backgroundColor: 'rgba(255,255,255,0.06)' },

  statusPill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, borderWidth: 1, marginBottom: 12 },
  pillDot: { width: 6, height: 6, borderRadius: 3 },
  pillText: { fontSize: 11, fontWeight: '800' },

  routeText: { color: '#fff', fontSize: 22, fontWeight: '900', letterSpacing: -0.3, marginBottom: 4 },
  cargoSubtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600', marginBottom: 12 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  metaText: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '600' },

  // Scroll
  scrollContent: { padding: 14, paddingBottom: 140 },

  // Stats card
  statsCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 12, ...Shadows.medium },
  statCell: { flex: 1, alignItems: 'center', paddingHorizontal: 4 },
  statIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: ACCENT + '14', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  statLabel: { fontSize: 9, fontWeight: '800', color: '#94A3B8', letterSpacing: 0.6, marginBottom: 4, textAlign: 'center' },
  statValue: { fontSize: 13, fontWeight: '900', color: '#0F172A', textAlign: 'center' },
  statSub: { fontSize: 10, fontWeight: '600', color: '#94A3B8', marginTop: 2, textAlign: 'center' },
  statDivider: { width: 1, alignSelf: 'stretch', backgroundColor: '#F1F5F9', marginVertical: 4 },

  // Route card
  routeCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 12, ...Shadows.medium },
  routeTimeline: { flex: 1.1, paddingRight: 12 },
  timelineItem: { flexDirection: 'row', alignItems: 'center' },
  pinCircle: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  timelineLabel: { fontSize: 9, fontWeight: '800', color: '#94A3B8', letterSpacing: 0.8 },
  timelineCity: { fontSize: 15, fontWeight: '800', color: '#0F172A', marginTop: 2 },
  timelineConnector: { flexDirection: 'row', alignItems: 'center', marginVertical: 8, marginLeft: 7 },
  dottedLine: { flex: 1, height: 1, borderTopWidth: 1, borderTopColor: '#CBD5E1', borderStyle: 'dashed' },
  truckBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },

  specBox: { flex: 1, backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12, justifyContent: 'center', gap: 10 },
  specRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  specLabel: { fontSize: 11, fontWeight: '600', color: '#64748B', flex: 1 },
  specValue: { fontSize: 11, fontWeight: '800', color: '#0F172A', textAlign: 'right' },

  // Generic card
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 12, ...Shadows.medium },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  cardTitle: { fontSize: 14, fontWeight: '800', color: '#0F172A', flex: 1 },
  countBadge: { minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, backgroundColor: ACCENT, justifyContent: 'center', alignItems: 'center' },
  countBadgeText: { fontSize: 10, fontWeight: '900', color: '#fff' },
  descText: { fontSize: 13, color: '#475569', lineHeight: 20 },

  // Driver card
  driverCard: { backgroundColor: '#fff', borderRadius: 20, marginBottom: 12, overflow: 'hidden', ...Shadows.medium, flexDirection: 'row' },
  driverAccent: { width: 5 },
  driverBody: { flex: 1, padding: 16, paddingLeft: 14 },
  driverLabel: { fontSize: 9, fontWeight: '900', color: '#94A3B8', letterSpacing: 1.2, marginBottom: 12 },
  driverRow: { flexDirection: 'row', alignItems: 'center' },
  driverAvatar: { width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center' },
  driverAvatarText: { color: '#fff', fontSize: 18, fontWeight: '900' },
  driverName: { fontSize: 16, fontWeight: '900', color: '#0F172A' },
  driverPhone: { fontSize: 12, fontWeight: '600', color: '#64748B', marginTop: 2 },
  driverCallBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#16A34A', justifyContent: 'center', alignItems: 'center', ...Shadows.sm },
  completeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 46, borderRadius: 12, backgroundColor: '#16A34A', marginTop: 14 },
  completeBtnText: { color: '#fff', fontSize: 12, fontWeight: '900', letterSpacing: 0.6 },

  // Empty
  emptyBox: { alignItems: 'center', paddingVertical: 24 },
  emptyText: { fontSize: 12, fontWeight: '600', color: '#94A3B8', marginTop: 8 },

  // Request items
  reqCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  reqLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  reqAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  reqAvatarText: { fontSize: 17, fontWeight: '900', color: '#16A34A' },
  reqInfo: { flex: 1, marginLeft: 12 },
  reqName: { fontSize: 13, fontWeight: '800', color: '#0F172A' },
  reqPhone: { fontSize: 11, fontWeight: '600', color: '#64748B', marginTop: 2 },
  reqBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5 },
  reqDot: { width: 5, height: 5, borderRadius: 3 },
  reqBadgeText: { fontSize: 10, fontWeight: '700', color: '#94A3B8' },
  acceptBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#16A34A', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, gap: 4 },
  acceptBtnText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  callBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#16A34A', justifyContent: 'center', alignItems: 'center' },

  // Cancel
  cancelBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 46, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#FCA5A5', backgroundColor: '#FEF2F2' },
  cancelBtnText: { color: '#EF4444', fontSize: 12, fontWeight: '900', letterSpacing: 0.6 },

  // Company card
  companyCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 20, padding: 14, marginBottom: 12, ...Shadows.medium },
  companyLogo: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#F1F5F9' },
  companyInfo: { flex: 1, paddingHorizontal: 12 },
  companyName: { fontSize: 14, fontWeight: '900', color: '#0F172A' },
  companyMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  companyMeta: { fontSize: 11, fontWeight: '600', color: '#64748B' },
  companyActions: { flexDirection: 'row', gap: 8 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center' },

  // Footer
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', paddingHorizontal: 16, paddingTop: 12, borderTopLeftRadius: 24, borderTopRightRadius: 24, ...Shadows.medium },
  applyBtn: { height: 54, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, ...Shadows.medium },
  applyBtnActive: { backgroundColor: ACCENT },
  applyBtnDone: { backgroundColor: '#94A3B8' },
  applyBtnText: { color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 0.5 },
});
