import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator, Alert, ScrollView, RefreshControl, Dimensions, Modal, Platform, Image } from 'react-native';
import DatePicker from 'react-native-modern-datepicker';
import { supabase } from '../lib/supabase';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { Colors, Spacing, Shadows, Radius } from '../constants/Theme';
import { useTheme } from '../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { registerForPushNotificationsAsync, savePushTokenToProfile, broadcastToAllDrivers } from '../lib/notifications';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const TURKISH_CITIES = [
  "Adana", "Adıyaman", "Afyonkarahisar", "Ağrı", "Amasya", "Ankara", "Antalya", "Artvin", "Aydın", "Balıkesir",
  "Bilecik", "Bingöl", "Bitlis", "Bolu", "Burdur", "Bursa", "Çanakkale", "Çankırı", "Çorum", "Denizli",
  "Diyarbakır", "Edirne", "Elazığ", "Erzincan", "Erzurum", "Eskişehir", "Gaziantep", "Giresun", "Gümüşhane", "Hakkari",
  "Hatay", "Isparta", "Mersin", "İstanbul", "İzmir", "Kars", "Kastamonu", "Kayseri", "Kırklareli", "Kırşehir",
  "Kocaeli", "Konya", "Kütahya", "Malatya", "Manisa", "Kahramanmaraş", "Mardin", "Muğla", "Muş", "Nevşehir",
  "Niğde", "Ordu", "Rize", "Sakarya", "Samsun", "Siirt", "Sinop", "Sivas", "Tekirdağ", "Tokat",
  "Trabzon", "Tunceli", "Şanlıurfa", "Uşak", "Van", "Yozgat", "Zonguldak", "Aksaray", "Bayburt", "Karaman",
  "Kırıkkale", "Batman", "Şırnak", "Bartın", "Ardahan", "Iğdır", "Yalova", "Karabük", "Kilis", "Osmaniye", "Düzce"
];

const getNearbyDates = () => {
    const dates = [];
    const today = new Date();
    const dayNames = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
    const monthNames = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

    for (let i = 0; i < 14; i++) {
        const d = new Date();
        d.setDate(today.getDate() + i);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        dates.push({
            id: `${yyyy}-${mm}-${dd}`,
            fullDate: `${yyyy}-${mm}-${dd}`,
            dayName: i === 0 ? 'Bugün' : i === 1 ? 'Yarın' : dayNames[d.getDay()],
            dayNumber: dd,
            monthName: monthNames[d.getMonth()]
        });
    }
    return dates;
};

export default function Dashboard() {
  const { theme } = useTheme();
  const navigation = useNavigation<any>();
  const [role, setRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Shipper form state
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [cargoDetails, setCargoDetails] = useState('');
  const [pickupDate, setPickupDate] = useState(''); // Text based date
  const [requiredVehicleType, setRequiredVehicleType] = useState('TIR'); 
  const [unloadingDate, setUnloadingDate] = useState(''); // Text based date
  const [price, setPrice] = useState(''); // Budget/Price field
  const [isQuote, setIsQuote] = useState(false); // Teklif Usulü toggle

  // Modal and Picker states
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [cityModalVisible, setCityModalVisible] = useState(false);
  const [cityTarget, setCityTarget] = useState<'origin' | 'destination'>('origin');
  const [citySearch, setCitySearch] = useState('');

  // Filter & UI states
  const [searchOrigin, setSearchOrigin] = useState('');
  const [searchDestination, setSearchDestination] = useState('');
  const [filterVehicleType, setFilterVehicleType] = useState('Hepsi');
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [sortMode, setSortMode] = useState<'newest' | 'price_high' | 'date_near'>('newest');

  // Sık kullanılan şehirler & taslak
  const [recentCities, setRecentCities] = useState<string[]>([]);
  const [draftLoaded, setDraftLoaded] = useState(false);

  // Boş Araç İlanı
  const [availModalVisible, setAvailModalVisible] = useState(false);
  const [availOrigin, setAvailOrigin] = useState('');
  const [availDestination, setAvailDestination] = useState('');
  const [availDate, setAvailDate] = useState('');
  const [availNotes, setAvailNotes] = useState('');
  const [availSaving, setAvailSaving] = useState(false);

  // Smart matching
  const [matchingDriverCount, setMatchingDriverCount] = useState<number | null>(null);

  // Data states
  const [openJobs, setOpenJobs] = useState<any[]>([]);
  const [appliedJobIds, setAppliedJobIds] = useState<string[]>([]);
  const [driverVehicle, setDriverVehicle] = useState<any>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [todayJobCount, setTodayJobCount] = useState(0);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const vehicleTypes = [
    { label: 'TIR', icon: '🚛' },
    { label: 'Kamyon', icon: '🚚' },
    { label: 'Kamyonet', icon: '🚐' },
    { label: 'Frigo', icon: '❄️' },
    { label: 'Tenteli', icon: '🏕️' },
    { label: 'Açık Kasa', icon: '📦' },
    { label: 'Lowbed', icon: '🔧' },
  ];

  useEffect(() => {
    fetchSessionAndProfile();
    AsyncStorage.getItem('@recent_cities').then(raw => {
      if (raw) setRecentCities(JSON.parse(raw));
    });
    AsyncStorage.getItem('@job_draft').then(raw => {
      if (!raw) return;
      const d = JSON.parse(raw);
      if (d.origin || d.destination || d.cargoDetails) {
        setOrigin(d.origin || '');
        setDestination(d.destination || '');
        setCargoDetails(d.cargoDetails || '');
        setPickupDate(d.pickupDate || '');
        setRequiredVehicleType(d.requiredVehicleType || 'TIR');
        setPrice(d.price || '');
        setIsQuote(d.isQuote || false);
        setDraftLoaded(true);
      }
    });
  }, []);

  useEffect(() => {
    if (!userId || role !== 'SHIPPER') return;
    const draft = { origin, destination, cargoDetails, pickupDate, requiredVehicleType, price, isQuote };
    if (!origin && !destination && !cargoDetails) return;
    AsyncStorage.setItem('@job_draft', JSON.stringify(draft));
  }, [origin, destination, cargoDetails, pickupDate, requiredVehicleType, price, isQuote]);

  useEffect(() => {
    if (role !== 'SHIPPER' || !origin) {
      setMatchingDriverCount(null);
      return;
    }
    const checkDrivers = async () => {
      const today = new Date().toISOString().split('T')[0];
      const { count } = await supabase
        .from('driver_availabilities')
        .select('id', { count: 'exact', head: true })
        .eq('origin', origin)
        .gte('available_date', today);
      setMatchingDriverCount(count ?? 0);
    };
    checkDrivers();
  }, [origin, role]);

  useEffect(() => {
    if (userId) {
      const setupNotifications = async () => {
        const token = await registerForPushNotificationsAsync();
        if (token) {
          await savePushTokenToProfile(userId, token);
        }
      };
      setupNotifications();
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      if (userId) {
        fetchOpenJobs();
        if (role === 'DRIVER') {
          fetchAppliedJobIds(userId);
        }
      }
    }, [userId, role])
  );

  const fetchSessionAndProfile = async () => {
    try {
      setLoading(true);
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        setLoading(false);
        return;
      }

      const user = session.user;
      setUserId(user.id);

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('role, full_name')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError || !profileData) {
        fetchOpenJobs();
        setLoading(false);
        return;
      }
      
      setRole(profileData.role);
      setUserName(profileData.full_name || '');

      fetchOpenJobs();
      if (profileData.role === 'DRIVER') {
        fetchAppliedJobIds(user.id);
        fetchDriverVehicle(user.id);
      }
      // fetchSessionAndProfile catch
    } finally {
      setLoading(false);
    }
  };

  const fetchAppliedJobIds = async (uId: string) => {
    try {
      const { data, error } = await supabase
        .from('job_requests')
        .select('job_id')
        .eq('driver_id', uId);
      
      if (data) {
        setAppliedJobIds(data.map(r => r.job_id));
      }
    } catch (e) {
      console.error('fetchAppliedJobIds:', e);
    }
  };

  const fetchDriverVehicle = async (dId: string) => {
    const { data } = await supabase
      .from('vehicles')
      .select('vehicle_type')
      .eq('owner_id', dId)
      .maybeSingle();
    if (data) setDriverVehicle(data);
  };

  const fetchOpenJobs = async (isRefreshing = false) => {
    try {
      if (isRefreshing) {
        setRefreshing(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else {
        setLoading(true);
      }
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('jobs')
        .select('*, profiles!jobs_shipper_id_fkey(full_name), job_requests(count)')
        .eq('status', 'OPEN')
        .gte('pickup_date', today) 
        .order('created_at', { ascending: false });

      if (error) {
        setFetchError('İlanlar yüklenemedi. Lütfen internet bağlantınızı kontrol edin.');
      } else {
        setFetchError(null);
        setOpenJobs(data || []);
        const count = data?.filter(j => j.pickup_date === today).length || 0;
        setTodayJobCount(count);
      }
    } catch (e) {
      console.error('fetchOpenJobs:', e);
      setFetchError('İlanlar yüklenemedi. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handlePostJob = async () => {
    if (!origin || !destination || !cargoDetails || !pickupDate || (!isQuote && !price)) {
      Alert.alert('Uyarı', 'Lütfen rotayı, detayları, yükleme tarihini ve fiyatı (veya Teklif Usulü) doldurun.');
      return;
    }
    
    try {
      setLoading(true);
      const { error } = await supabase.from('jobs').insert({
        shipper_id: userId,
        origin,
        destination,
        cargo_details: cargoDetails,
        pickup_date: pickupDate, // Formatted as YYYY-MM-DD by user or validated
        unloading_date: unloadingDate || null,
        required_vehicle_type: requiredVehicleType,
        price: isQuote ? null : (price ? parseFloat(price) : null),
        status: 'OPEN'
      });

      if (error) throw error;

      // Tüm şoförlere bildirim gönder (Broadcast)
      await broadcastToAllDrivers(
        '📢 Yeni İlan!',
        `${origin} -> ${destination} rotasında yeni bir ilan yayınlandı.`,
        { jobId: 'NEW', type: 'NEW_JOB' }
      );

      Alert.alert('Başarılı', 'İlanınız başarıyla yayına alındı.');
      setOrigin('');
      setDestination('');
      setCargoDetails('');
      setPickupDate('');
      setUnloadingDate('');
      setPrice('');
      setIsQuote(false);
      setDraftLoaded(false);
      AsyncStorage.removeItem('@job_draft');
      fetchOpenJobs();
    } catch (error: any) {
      Alert.alert('Hata', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePostAvailability = async () => {
    if (!availOrigin || !availDestination || !availDate) {
      Alert.alert('Uyarı', 'Lütfen nereden, nereye ve tarih alanlarını doldurun.');
      return;
    }
    try {
      setAvailSaving(true);
      const { error } = await supabase.from('driver_availabilities').insert({
        driver_id: userId,
        origin: availOrigin,
        destination: availDestination,
        available_date: availDate,
        vehicle_type: driverVehicle?.vehicle_type || 'TIR',
        notes: availNotes || null,
      });
      if (error) throw error;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Başarılı', 'Boş araç ilanınız yayınlandı.');
      setAvailModalVisible(false);
      setAvailOrigin('');
      setAvailDestination('');
      setAvailDate('');
      setAvailNotes('');
    } catch (e: any) {
      Alert.alert('Hata', e.message);
    } finally {
      setAvailSaving(false);
    }
  };

  const onDateChange = (date: string) => {
    // react-native-modern-datepicker returns YYYY/MM/DD
    const formatted = date.replace(/\//g, '-');
    setPickupDate(formatted);
    setShowDatePicker(false);
  };

  const handleCitySelect = (city: string) => {
    Haptics.selectionAsync();
    if (availModalVisible) {
      if (cityTarget === 'origin') setAvailOrigin(city);
      else setAvailDestination(city);
    } else {
      if (cityTarget === 'origin') setOrigin(city);
      else setDestination(city);
    }
    setCityModalVisible(false);
    setCitySearch('');
    setRecentCities(prev => {
      const next = [city, ...prev.filter(c => c !== city)].slice(0, 5);
      AsyncStorage.setItem('@recent_cities', JSON.stringify(next));
      return next;
    });
  };

  const filteredJobs = openJobs
    .filter(job => {
      const matchOrigin = (job.origin || '').toLowerCase().includes(searchOrigin.toLowerCase());
      const matchDest = (job.destination || '').toLowerCase().includes(searchDestination.toLowerCase());
      const matchVehicle = filterVehicleType === 'Hepsi' || job.required_vehicle_type === filterVehicleType;
      return matchOrigin && matchDest && matchVehicle;
    })
    .sort((a, b) => {
      if (sortMode === 'price_high') return (b.price || 0) - (a.price || 0);
      if (sortMode === 'date_near') return new Date(a.pickup_date).getTime() - new Date(b.pickup_date).getTime();
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const formatTurkishDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
      return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
    } catch (e) { return dateStr; }
  };

  const renderJobItem = ({ item }: { item: any }) => {
    const isApplied = appliedJobIds.includes(item.id);
    const isMatchingVehicle = role === 'DRIVER' && item.required_vehicle_type && driverVehicle && item.required_vehicle_type === driverVehicle.vehicle_type;

    if (viewMode === 'list') {
      const config = isApplied 
        ? { color: '#22C55E', label: 'BAŞVURU YAPILDI', bg: 'rgba(34, 197, 94, 0.1)' }
        : { color: '#3B82F6', label: 'AÇIK İLAN', bg: 'rgba(59, 130, 246, 0.1)' };

      return (
        <TouchableOpacity
          style={[
            styles.listPremiumItem, 
            { backgroundColor: theme.surface, borderColor: theme.border }
          ]}
          onPress={() => navigation.navigate('HomeTab', { screen: 'JobDetail', params: { item, role } })}
          activeOpacity={0.7}
        >
          <View style={styles.listPremiumContent}>
            <View style={styles.listPremiumRow}>
              <View style={[styles.listAccentBar, { backgroundColor: config.color }]} />
              <View style={styles.listPremiumRouteWrap}>
                <Text style={[styles.listPremiumCity, { color: theme.text }]} numberOfLines={1}>{item.origin.toUpperCase()}</Text>
                <View style={styles.listRoutePath}>
                   <View style={[styles.listPathDash, { borderColor: theme.border }]} />
                   <FontAwesome5 name="truck" size={10} color={config.color} style={{ marginHorizontal: 6 }} />
                   <View style={[styles.listPathDash, { borderColor: theme.border }]} />
                </View>
                <Text style={[styles.listPremiumCity, { color: theme.text }]} numberOfLines={1}>{item.destination.toUpperCase()}</Text>
              </View>
              <Ionicons name="chevron-forward" size={14} color={theme.accent} style={{ marginLeft: 8 }} />
            </View>

            <View style={styles.listPremiumMetaRow}>
               <View style={styles.listPremiumSpec}>
                 <Text style={[styles.telemetryLabel, { color: theme.textLight, marginBottom: 0 }]}>TARİH:</Text>
                 <Text style={[styles.listPremiumSpecText, { color: theme.text }]}>{formatTurkishDate(item.pickup_date)}</Text>
               </View>
               <View style={[styles.listPremiumDivider, { backgroundColor: theme.border }]} />
               <View style={styles.listPremiumSpec}>
                 <Text style={[styles.telemetryLabel, { color: theme.textLight, marginBottom: 0 }]}>FİYAT:</Text>
                 <Text style={[styles.listPremiumSpecText, { color: theme.accent }]}>{item.price ? `${item.price.toLocaleString('tr-TR')} ₺ + KDV` : 'TEKLİF'}</Text>
               </View>
               {isMatchingVehicle && !isApplied && (
                 <>
                   <View style={[styles.listPremiumDivider, { backgroundColor: theme.border }]} />
                   <View style={styles.listPremiumSpec}>
                     <Text style={[styles.telemetryLabel, { color: '#F38118' }]}>UYGUN ARAÇ</Text>
                   </View>
                 </>
               )}
            </View>
          </View>
        </TouchableOpacity>
      );
    }

    const config = isApplied 
      ? { color: '#22C55E', label: 'BAŞVURU YAPILDI', bg: 'rgba(34, 197, 94, 0.1)' }
      : { color: '#3B82F6', label: 'BAŞVURUYA AÇIK', bg: 'rgba(59, 130, 246, 0.1)' };

    return (
      <TouchableOpacity
        style={[styles.specCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
        onPress={() => navigation.navigate('HomeTab', { screen: 'JobDetail', params: { item, role } })}
        activeOpacity={0.8}
      >
        <View style={styles.specHeader}>
          <View style={[styles.statusBadge, { backgroundColor: config.bg, borderWidth: 1, borderColor: config.color + '40' }]}>
             <View style={[styles.pulseDot, { backgroundColor: config.color }]} />
             <Text style={[styles.statusBadgeText, { color: config.color }]}>
                {config.label}
             </Text>
          </View>
          <View style={styles.headerRight}>
            {isMatchingVehicle && !isApplied && (
              <View style={[styles.countBadge, { backgroundColor: '#F38118' }]}>
                <Ionicons name="flash" size={10} color="#fff" />
                <Text style={styles.countBadgeText}>UYGUN ARAÇ</Text>
              </View>
            )}
            <Text style={[styles.missionId, { color: theme.textLight }]}>
               #{item.id.substring(0,6).toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.telemetryRouteBridge}>
          <View style={styles.bridgePoint}>
            <Text style={[styles.telemetryLabel, { color: theme.textLight, marginBottom: 4 }]}>NEREDEN</Text>
            <Text style={[styles.telemetryCity, { color: theme.text }]} numberOfLines={1}>{item.origin}</Text>
          </View>
          
          <View style={styles.telemetryRoutePath}>
             <View style={[styles.routePathDash, { borderColor: theme.border }]} />
             <FontAwesome5 name="truck" size={14} color={config.color} style={{ marginHorizontal: 8 }} />
             <View style={[styles.routePathDash, { borderColor: theme.border }]} />
          </View>

          <View style={[styles.bridgePoint, { alignItems: 'flex-end' }]}>
            <Text style={[styles.telemetryLabel, { color: theme.textLight, marginBottom: 4 }]}>NEREYE</Text>
            <Text style={[styles.telemetryCity, { color: theme.text, textAlign: 'right' }]} numberOfLines={1}>{item.destination}</Text>
          </View>
        </View>

        <View style={styles.telemetryGrid}>
          <View style={styles.telemetryBox}>
            <Text style={[styles.telemetryLabel, { color: theme.textLight }]}>YÜKLEME TARİHİ</Text>
            <Text style={[styles.telemetryValue, { color: theme.text }]}>
              {formatTurkishDate(item.pickup_date)}
            </Text>
          </View>
          <View style={[styles.telemetryBox, { borderLeftWidth: 1, borderLeftColor: theme.border, paddingLeft: 15 }]}>
            <Text style={[styles.telemetryLabel, { color: theme.textLight }]}>TEKLİF (₺)</Text>
            <Text style={[styles.telemetryValue, { color: theme.accent, fontWeight: '900' }]}>
              {item.price ? `${item.price.toLocaleString('tr-TR')} + KDV` : 'TEKLİF'}
            </Text>
          </View>
          <View style={[styles.telemetryBox, { borderLeftWidth: 1, borderLeftColor: theme.border, paddingLeft: 15 }]}>
            <Text style={[styles.telemetryLabel, { color: theme.textLight }]}>ARAÇ TİPİ</Text>
            <Text style={[styles.telemetryValue, { color: theme.text }]}>
              {(item.required_vehicle_type || 'TIR').toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={[styles.actionBtn, { backgroundColor: '#F1F5F9' }]}>
           <Text style={[styles.actionBtnText, { color: theme.accent }]}>İLAN DETAYLARI</Text>
           <Ionicons name="chevron-forward" size={14} color={theme.accent} />
        </View>
      </TouchableOpacity>
    );
  };

  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style="dark" />
      <LinearGradient colors={[theme.primary, '#f35d18']} style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greetingHeader}>Hoş Geldin,</Text>
            <Text style={styles.userNameHeader}>{userName || (role === 'SHIPPER' ? 'Yük Veren' : 'Şoför')}</Text>
          </View>
          <View style={styles.headerRight}>
            <Image 
              source={require('../assets/images/512x512 akkoc tahta.png')} 
              style={styles.headerLogo} 
              resizeMode="contain" 
            />
          </View>
        </View>

        <View style={styles.statsStrip}>
           <View style={styles.statItem}>
              <Text style={styles.statValue}>{todayJobCount}</Text>
              <Text style={styles.statLabel}>Bugünkü İlanlar</Text>
           </View>
           <View style={styles.statDivider} />
           <View style={styles.statItem}>
              <Text style={styles.statValue}>{openJobs.length}</Text>
              <Text style={styles.statLabel}>Toplam İlan</Text>
           </View>
           {role === 'DRIVER' && (
             <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
               <TouchableOpacity
                 style={[styles.searchToggle, { backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 8, width: 'auto' }]}
                 onPress={() => setAvailModalVisible(true)}
               >
                 <Text style={{ color: '#fff', fontSize: 10, fontWeight: '900' }}>🚛 BOŞ ARAÇ</Text>
               </TouchableOpacity>
               <TouchableOpacity style={styles.searchToggle} onPress={() => navigation.navigate('Map')}>
                  <Ionicons name="map-outline" size={20} color="#fff" />
               </TouchableOpacity>
               <TouchableOpacity style={styles.searchToggle} onPress={() => setViewMode(prev => prev === 'card' ? 'list' : 'card')}>
                  <Ionicons name={viewMode === 'card' ? "list-outline" : "grid-outline"} size={20} color="#fff" />
               </TouchableOpacity>
               <TouchableOpacity style={styles.searchToggle} onPress={() => setIsSearchVisible(!isSearchVisible)}>
                  <Ionicons name={isSearchVisible ? "close" : "search"} size={20} color="#fff" />
               </TouchableOpacity>
             </View>
           )}
        </View>
      </LinearGradient>

      {role === 'SHIPPER' ? (
        <ScrollView contentContainerStyle={styles.shipperContainer} showsVerticalScrollIndicator={false}>
          <View style={[styles.shipperCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {draftLoaded && (
              <TouchableOpacity
                style={styles.draftBanner}
                onPress={() => { setDraftLoaded(false); setOrigin(''); setDestination(''); setCargoDetails(''); setPickupDate(''); setPrice(''); setIsQuote(false); AsyncStorage.removeItem('@job_draft'); }}
              >
                <Ionicons name="document-text-outline" size={16} color="#F59E0B" />
                <Text style={styles.draftBannerText}>Taslak yüklendi — temizlemek için dokun</Text>
              </TouchableOpacity>
            )}
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Yük İlanı Oluştur</Text>
            
            <View style={styles.formRow}>
              <View style={styles.inputWrap}>
                <Text style={[styles.inputLabel, { color: theme.textLight }]}>NEREDEN</Text>
                <TouchableOpacity
                  style={[styles.formInput, { justifyContent: 'center', backgroundColor: '#F1F5F9' }]}
                  onPress={() => { setCityTarget('origin'); setCityModalVisible(true); }}
                >
                  <Text style={{ color: origin ? theme.text : '#94A3B8', fontSize: 13, fontWeight: '600' }}>
                     {origin || 'Şehir Seçin'}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.inputWrap}>
                <Text style={[styles.inputLabel, { color: theme.textLight }]}>NEREYE</Text>
                <TouchableOpacity
                  style={[styles.formInput, { justifyContent: 'center', backgroundColor: '#F1F5F9' }]}
                  onPress={() => { setCityTarget('destination'); setCityModalVisible(true); }}
                >
                  <Text style={{ color: destination ? theme.text : '#94A3B8', fontSize: 13, fontWeight: '600' }}>
                     {destination || 'Şehir Seçin'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {matchingDriverCount !== null && matchingDriverCount > 0 && (
              <TouchableOpacity
                style={styles.matchBanner}
                onPress={() => navigation.navigate('ShipperJobs', { screen: 'ShipperJobsMain', params: { initialTab: 'AVAILABLE_DRIVERS' } })}
              >
                <Ionicons name="flash" size={15} color="#92400E" />
                <Text style={styles.matchBannerText}>{origin} çıkışlı {matchingDriverCount} müsait şoför var</Text>
                <Ionicons name="chevron-forward" size={14} color="#92400E" />
              </TouchableOpacity>
            )}

            <View style={styles.inputWrapFull}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <Text style={[styles.inputLabel, { color: theme.textLight }]}>TEKLİF EDİLEN FİYAT (₺)</Text>
                <Text style={{ fontSize: 10, fontWeight: '700', color: theme.accent, opacity: 0.8 }}>+ KDV DAHİL DEĞİLDİR</Text>
              </View>
              <View style={[styles.formInput, { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9' }, isQuote && { opacity: 0.5 }]}>
                <Ionicons name="cash-outline" size={18} color={theme.accent} style={{ marginRight: 10 }} />
                <TextInput 
                  style={{ flex: 1, color: theme.text, fontSize: 14, fontWeight: '600' }}
                  placeholder={isQuote ? "Teklif Usulü Seçili" : "Örn: 15000"}
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  editable={!isQuote}
                  value={price}
                  onChangeText={setPrice}
                />
              </View>
              <TouchableOpacity 
                  onPress={() => { setIsQuote(!isQuote); if(!isQuote) setPrice(''); }}
                  style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', marginTop: 10, backgroundColor: isQuote ? theme.accent + '20' : 'rgba(150,150,150,0.05)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: isQuote ? theme.accent : 'rgba(150,150,150,0.1)' }}
              >
                  <Ionicons name={isQuote ? "checkmark-circle" : "ellipse-outline"} size={14} color={isQuote ? theme.accent : theme.textLight} />
                  <Text style={{ fontSize: 11, fontWeight: '800', marginLeft: 6, color: isQuote ? theme.accent : theme.textLight }}>TEKLİF USULÜ</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.inputWrapFull}>
              <Text style={[styles.inputLabel, { color: theme.textLight }]}>YÜK DETAYLARI</Text>
              <TextInput 
                style={[styles.formInputLarge, { color: theme.text, backgroundColor: '#F1F5F9' }]}
                placeholder="Örn: 20 Ton Demir..."
                placeholderTextColor="#94A3B8"
                multiline
                value={cargoDetails}
                onChangeText={setCargoDetails}
              />
            </View>

            <View style={styles.inputWrapFull}>
              <Text style={[styles.inputLabel, { color: theme.textLight }]}>YÜKLEME TARİHİ</Text>
              <View style={styles.dateSelectorContainer}>
                <ScrollView 
                   horizontal 
                   showsHorizontalScrollIndicator={false} 
                   contentContainerStyle={styles.dateStrip}
                >
                   {getNearbyDates().map((d) => (
                      <TouchableOpacity 
                         key={d.id} 
                         style={[
                            styles.dateCard, 
                            { backgroundColor: '#F1F5F9' },
                            pickupDate === d.fullDate && { backgroundColor: theme.accent, borderColor: theme.accent }
                         ]} 
                         onPress={() => setPickupDate(d.fullDate)}
                      >
                         <Text style={[styles.dateCardDay, { color: theme.textLight }, pickupDate === d.fullDate && { color: 'rgba(255,255,255,0.8)' }]}>{d.dayName}</Text>
                         <Text style={[styles.dateCardNum, { color: theme.text }, pickupDate === d.fullDate && { color: '#fff' }]}>{d.dayNumber}</Text>
                         <Text style={[styles.dateCardMonth, { color: theme.textLight }, pickupDate === d.fullDate && { color: 'rgba(255,255,255,0.8)' }]}>{d.monthName}</Text>
                      </TouchableOpacity>
                   ))}
                   <TouchableOpacity 
                      style={[styles.dateCard, { backgroundColor: '#F1F5F9', justifyContent: 'center' }]} 
                      onPress={() => setShowDatePicker(true)}
                   >
                      <Ionicons name="calendar" size={20} color={theme.textLight} />
                      <Text style={[styles.dateCardDay, { color: theme.textLight, marginTop: 4 }]}>Diğer</Text>
                   </TouchableOpacity>
                </ScrollView>
              </View>
            </View>

            <View style={styles.inputWrapFull}>
              <Text style={[styles.inputLabel, { color: theme.textLight }]}>ARAÇ TİPİ</Text>
              <View style={styles.vehicleTypeSelector}>
                 {vehicleTypes.map(({ label, icon }) => (
                   <TouchableOpacity
                     key={label}
                     onPress={() => setRequiredVehicleType(label)}
                     style={[styles.vTypeBtn, requiredVehicleType === label && { backgroundColor: theme.accent }]}
                   >
                     <Text style={styles.vTypeBtnIcon}>{icon}</Text>
                     <Text style={[styles.vTypeBtnText, requiredVehicleType === label && { color: '#fff' }]}>{label}</Text>
                   </TouchableOpacity>
                 ))}
              </View>
            </View>

            <TouchableOpacity style={[styles.postBtn, { backgroundColor: theme.accent }]} onPress={handlePostJob} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.postBtnText}>İLAN YAYINLA</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>
          {isSearchVisible && (
            <View style={[styles.searchPanel, { backgroundColor: '#fff' }]}>
               <View style={styles.searchRow}>
                  <View style={[styles.searchInputWrapper, { backgroundColor: '#F1F5F9' }]}>
                     <Ionicons name="location-outline" size={18} color={theme.textLight} />
                     <TextInput
                       placeholder="Nereden..."
                       placeholderTextColor={theme.textLight}
                       style={[styles.searchInput, { color: theme.text }]}
                       value={searchOrigin}
                       onChangeText={setSearchOrigin}
                     />
                  </View>
                  <View style={[styles.searchInputWrapper, { backgroundColor: '#F1F5F9' }]}>
                     <Ionicons name="flag-outline" size={18} color={theme.textLight} />
                     <TextInput
                       placeholder="Nereye..."
                       placeholderTextColor={theme.textLight}
                       style={[styles.searchInput, { color: theme.text }]}
                       value={searchDestination}
                       onChangeText={setSearchDestination}
                     />
                  </View>
               </View>
               <View style={styles.sortRow}>
                 {([['newest', '🕐', 'En Yeni'], ['date_near', '📅', 'Yakın Tarih'], ['price_high', '💰', 'Yüksek Fiyat']] as const).map(([mode, icon, label]) => (
                   <TouchableOpacity
                     key={mode}
                     onPress={() => setSortMode(mode)}
                     style={[styles.sortChip, sortMode === mode && { backgroundColor: theme.primary }]}
                   >
                     <Text style={styles.sortChipIcon}>{icon}</Text>
                     <Text style={[styles.sortChipText, { color: sortMode === mode ? '#fff' : theme.text }]}>{label}</Text>
                   </TouchableOpacity>
                 ))}
               </View>
               <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChipScroll} contentContainerStyle={styles.filterChipRow}>
                 {[{ label: 'Hepsi', icon: '🔍' }, ...vehicleTypes].map(({ label, icon }) => {
                   const active = filterVehicleType === label;
                   return (
                     <TouchableOpacity
                       key={label}
                       onPress={() => setFilterVehicleType(label)}
                       style={[styles.filterChip, active && { backgroundColor: theme.accent }]}
                     >
                       <Text style={styles.filterChipIcon}>{icon}</Text>
                       <Text style={[styles.filterChipText, { color: active ? '#fff' : theme.text }]}>{label}</Text>
                     </TouchableOpacity>
                   );
                 })}
               </ScrollView>
            </View>
          )}

          {loading ? (
            <View style={styles.loadingContainer}>
               <ActivityIndicator size="large" color={theme.accent} />
               <Text style={[styles.loadingText, { color: theme.textLight }]}>İlanlar yükleniyor...</Text>
            </View>
          ) : (
            <FlatList
              data={filteredJobs}
              renderItem={renderJobItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                fetchError ? (
                  <View style={styles.emptyWrap}>
                    <View style={[styles.emptyIconCircle, { backgroundColor: '#FEE2E2' }]}>
                      <Ionicons name="wifi-outline" size={40} color="#EF4444" />
                    </View>
                    <Text style={[styles.emptyTitle, { color: theme.text }]}>Bağlantı Hatası</Text>
                    <Text style={[styles.emptySubtitle, { color: theme.textLight }]}>{fetchError}</Text>
                    <TouchableOpacity style={styles.emptyResetBtn} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); fetchOpenJobs(true); }}>
                      <Text style={[styles.emptyResetBtnText, { color: theme.accent }]}>TEKRAR DENE</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.emptyWrap}>
                    <View style={[styles.emptyIconCircle, { backgroundColor: '#F1F5F9' }]}>
                      <Ionicons name="search-outline" size={40} color={theme.accent} />
                    </View>
                    <Text style={[styles.emptyTitle, { color: theme.text }]}>İlan Bulunamadı</Text>
                    <Text style={[styles.emptySubtitle, { color: theme.textLight }]}>Aramanıza veya seçtiğiniz kriterlere uygun aktif bir yük ilanı şu an bulunmuyor.</Text>
                    <TouchableOpacity style={styles.emptyResetBtn} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); fetchOpenJobs(true); }}>
                      <Text style={[styles.emptyResetBtnText, { color: theme.accent }]}>LİSTEYİ YENİLE</Text>
                    </TouchableOpacity>
                  </View>
                )
              }
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={() => fetchOpenJobs(true)} tintColor={theme.accent} />
              }
            />
          )}
        </View>
      )}

      <Modal transparent animationType="fade" visible={showDatePicker} onRequestClose={() => setShowDatePicker(false)}>
         <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center' }}>
            <View style={{ margin: 20, backgroundColor: theme.surface, borderRadius: 24, padding: 20, ...Shadows.large }}>
               <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                   <Text style={{ fontSize: 18, fontWeight: '900', color: theme.text }}>Tarih Seçin</Text>
                   <TouchableOpacity onPress={() => setShowDatePicker(false)} style={{ padding: 5 }}>
                      <Ionicons name="close-circle" size={28} color={theme.textLight} />
                   </TouchableOpacity>
               </View>
               <DatePicker
                 isGregorian={true}
                 mode="calendar"
                 minimumDate={new Date().toLocaleDateString('sv-SE').replace(/-/g, '/')}
                 selected={pickupDate ? pickupDate.replace(/-/g, '/') : ''}
                 onSelectedChange={onDateChange}
                 onDateChange={onDateChange}
                 onMonthYearChange={() => {}}
                 options={{
                   backgroundColor: theme.surface,
                   textHeaderColor: theme.accent,
                   textDefaultColor: theme.text,
                   selectedTextColor: '#fff',
                   mainColor: theme.accent,
                   textSecondaryColor: theme.textLight,
                   borderColor: 'rgba(122, 146, 165, 0.1)',
                 }}
                 configs={{
                   dayNames: ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'],
                   dayNamesShort: ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'],
                   monthNames: [
                     'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
                     'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
                   ],
                   selectedFormat: 'YYYY/MM/DD',
                   dateFormat: 'YYYY/MM/DD',
                   timeFormat: 'HH:mm',
                   hour: 'Saat',
                   minute: 'Dakika',
                 }}
               />
            </View>
         </View>
      </Modal>

      {/* Boş Araç İlanı Modalı */}
      <Modal visible={availModalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setAvailModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: theme.background, paddingTop: Platform.OS === 'ios' ? 50 : 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: theme.border }}>
            <TouchableOpacity onPress={() => setAvailModalVisible(false)} style={{ padding: 5, marginRight: 15 }}>
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
            <Text style={{ fontSize: 18, fontWeight: '800', color: theme.text }}>🚛 Boş Araç İlan Et</Text>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            <Text style={{ fontSize: 12, color: theme.textLight, marginBottom: 20, lineHeight: 18 }}>
              Araç tipiniz ve güzergahınızı girerek yük verenlerle eşleşin.
            </Text>
            <Text style={[styles.inputLabel, { color: theme.textLight, marginBottom: 6 }]}>NEREDEN</Text>
            <TouchableOpacity
              style={[styles.formInput, { justifyContent: 'center', backgroundColor: '#F1F5F9', marginBottom: 14 }]}
              onPress={() => { setCityTarget('origin'); setAvailOrigin(''); setCityModalVisible(true); }}
            >
              <Text style={{ color: availOrigin ? theme.text : '#94A3B8', fontSize: 13, fontWeight: '600' }}>
                {availOrigin || 'Şehir Seçin'}
              </Text>
            </TouchableOpacity>
            <Text style={[styles.inputLabel, { color: theme.textLight, marginBottom: 6 }]}>NEREYE</Text>
            <TouchableOpacity
              style={[styles.formInput, { justifyContent: 'center', backgroundColor: '#F1F5F9', marginBottom: 14 }]}
              onPress={() => { setCityTarget('destination'); setAvailDestination(''); setCityModalVisible(true); }}
            >
              <Text style={{ color: availDestination ? theme.text : '#94A3B8', fontSize: 13, fontWeight: '600' }}>
                {availDestination || 'Şehir Seçin'}
              </Text>
            </TouchableOpacity>
            <Text style={[styles.inputLabel, { color: theme.textLight, marginBottom: 6 }]}>MÜSAİT TARİH (YYYY-AA-GG)</Text>
            <TextInput
              style={[styles.formInput, { backgroundColor: '#F1F5F9', color: theme.text, marginBottom: 14 }]}
              placeholder="2025-06-15"
              placeholderTextColor={theme.textLight}
              value={availDate}
              onChangeText={setAvailDate}
              keyboardType="numeric"
            />
            <Text style={[styles.inputLabel, { color: theme.textLight, marginBottom: 6 }]}>NOTLAR (İSTEĞE BAĞLI)</Text>
            <TextInput
              style={[styles.formInputLarge, { backgroundColor: '#F1F5F9', color: theme.text, marginBottom: 20 }]}
              placeholder="Tonaj, özel şartlar vb."
              placeholderTextColor={theme.textLight}
              value={availNotes}
              onChangeText={setAvailNotes}
              multiline
            />
            <TouchableOpacity
              style={[styles.postBtn, { backgroundColor: theme.accent }]}
              onPress={handlePostAvailability}
              disabled={availSaving}
            >
              {availSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.postBtnText}>İLAN OLUŞTUR</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={cityModalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setCityModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: theme.background, paddingTop: Platform.OS === 'ios' ? 50 : 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: theme.border }}>
             <TouchableOpacity onPress={() => setCityModalVisible(false)} style={{ padding: 5, marginRight: 15 }}>
               <Ionicons name="close" size={24} color={theme.text} />
             </TouchableOpacity>
             <Text style={{ fontSize: 18, fontWeight: '800', color: theme.text }}>Şehir Seçin</Text>
          </View>
          <View style={{ padding: 20 }}>
             <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', paddingHorizontal: 15, borderRadius: 12, height: 50 }}>
               <Ionicons name="search" size={20} color={theme.textLight} />
               <TextInput 
                 style={{ flex: 1, marginLeft: 10, color: theme.text, fontWeight: '600' }}
                 placeholder="Şehir Ara..."
                 placeholderTextColor={theme.textLight}
                 value={citySearch}
                 onChangeText={setCitySearch}
               />
             </View>
          </View>
          {recentCities.length > 0 && !citySearch ? (
            <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
              <Text style={{ fontSize: 10, fontWeight: '900', color: theme.textLight, letterSpacing: 1, marginBottom: 8 }}>SON KULLANILANLAR</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {recentCities.map(city => (
                  <TouchableOpacity
                    key={city}
                    onPress={() => handleCitySelect(city)}
                    style={{ paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, backgroundColor: theme.accent + '15', borderWidth: 1, borderColor: theme.accent + '30' }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '700', color: theme.accent }}>📍 {city}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={{ height: 1, backgroundColor: theme.border, marginTop: 14 }} />
            </View>
          ) : null}
          <FlatList
            data={TURKISH_CITIES.filter(c => c.toLowerCase().includes(citySearch.toLowerCase()))}
            keyExtractor={item => item}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity style={{ padding: 20, borderBottomWidth: 1, borderBottomColor: theme.border, marginLeft: 20 }} onPress={() => handleCitySelect(item)}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text }}>{item}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, paddingBottom: 25, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, ...Shadows.medium },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  greetingHeader: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '600' },
  userNameHeader: { color: '#fff', fontSize: 20, fontWeight: '900' },
  headerLogo: {
    width: 42,
    height: 42,
    opacity: 0.9,
  },
  statsStrip: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', padding: 12, borderRadius: 16 },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { color: '#fff', fontSize: 16, fontWeight: '900' },
  statLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: '700', marginTop: 2 },
  statDivider: { width: 1, height: 20, backgroundColor: 'rgba(255,255,255,0.1)' },
  searchToggle: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  searchPanel: { padding: 15, marginHorizontal: 20, marginTop: -15, borderRadius: 15, ...Shadows.medium },
  searchRow: { flexDirection: 'row', gap: 10 },
  searchInputWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 13, fontWeight: '600' },
  filterChipScroll: { marginTop: 8 },
  filterChipRow: { flexDirection: 'row', gap: 8, paddingBottom: 2 },
  filterChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.06)' },
  filterChipIcon: { fontSize: 13 },
  filterChipText: { fontSize: 11, fontWeight: '800' },
  sortRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  sortChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.06)' },
  sortChipIcon: { fontSize: 12 },
  sortChipText: { fontSize: 10, fontWeight: '800' },
  draftBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF3C7', borderRadius: 10, padding: 10, marginBottom: 14 },
  draftBannerText: { fontSize: 12, fontWeight: '700', color: '#92400E', flex: 1 },
  matchBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF3C7', borderRadius: 12, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: '#FDE68A' },
  matchBannerText: { flex: 1, fontSize: 12, fontWeight: '800', color: '#92400E' },
  listContent: { paddingTop: 30, paddingBottom: 100 },
  specCard: { padding: 20, borderRadius: Radius.xl, marginHorizontal: 20, marginBottom: 20, borderWidth: 1, ...Shadows.medium },
  specHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 20, gap: 6 },
  pulseDot: { width: 6, height: 6, borderRadius: 3 },
  statusBadgeText: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  countBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, gap: 4 },
  countBadgeText: { color: '#fff', fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },
  missionId: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  telemetryRouteBridge: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, backgroundColor: 'rgba(150,150,150,0.05)', padding: 15, borderRadius: Radius.lg },
  bridgePoint: { flex: 1 },
  telemetryRoutePath: { flex: 0.8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  routePathDash: { flex: 1, height: 1, borderWidth: 1, borderStyle: 'dashed', borderRadius: 1 },
  telemetryCity: { fontSize: 16, fontWeight: '900', letterSpacing: -0.3, textTransform: 'uppercase' },
  telemetryGrid: { flexDirection: 'row', marginBottom: 20 },
  telemetryBox: { flex: 1 },
  telemetryLabel: { fontSize: 8, fontWeight: '900', letterSpacing: 1.5, marginBottom: 4 },
  telemetryValue: { fontSize: 14, fontWeight: '800' },
  actionBtn: { height: 44, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  actionBtnText: { fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  listPremiumItem: { paddingVertical: 15, paddingHorizontal: 20, marginHorizontal: 20, marginBottom: 12, borderRadius: Radius.lg, borderWidth: 1, ...Shadows.sm },
  listPremiumContent: { flex: 1 },
  listPremiumRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  listAccentBar: { width: 4, height: 20, borderRadius: Radius.round, marginRight: 12 },
  listPremiumRouteWrap: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  listRoutePath: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: 10 },
  listPathDash: { flex: 1, height: 1, borderWidth: 1, borderStyle: 'dashed', borderRadius: 1 },
  listPremiumCity: { fontSize: 14, fontWeight: '900', maxWidth: '45%' },
  listPremiumMetaRow: { flexDirection: 'row', alignItems: 'center', paddingLeft: 16 },
  listPremiumSpec: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  listPremiumSpecText: { fontSize: 11, fontWeight: '800' },
  listPremiumDivider: { width: 1, height: 12, marginHorizontal: 12, opacity: 0.2 },
  
  // Shipper Styles
  shipperContainer: { padding: 20, paddingBottom: 100 },
  shipperCard: { padding: 24, borderRadius: Radius.xl, borderWidth: 1, ...Shadows.large },
  sectionTitle: { fontSize: 18, fontWeight: '900', marginBottom: 20 },
  formRow: { flexDirection: 'row', gap: 15, marginBottom: 15 },
  inputWrap: { flex: 1 },
  inputWrapFull: { marginBottom: 15 },
  inputLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 1, marginBottom: 8 },
  formInput: { height: 48, borderRadius: 10, paddingHorizontal: 15, fontSize: 14, fontWeight: '600' },
  formInputLarge: { height: 100, borderRadius: 10, padding: 15, fontSize: 14, fontWeight: '600', textAlignVertical: 'top' },
  vehicleTypeSelector: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  vTypeBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.05)', flexDirection: 'row', alignItems: 'center', gap: 5 },
  vTypeBtnIcon: { fontSize: 14 },
  vTypeBtnText: { fontSize: 11, fontWeight: '800' },
  postBtn: { height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 15, ...Shadows.medium },
  postBtnText: { color: '#fff', fontSize: 15, fontWeight: '900', letterSpacing: 1 },

  // Date Strip Styles
  dateSelectorContainer: { marginTop: 5 },
  dateStrip: { gap: 10, paddingRight: 20 },
  dateCard: { width: 70, height: 90, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'transparent' },
  dateCardDay: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  dateCardNum: { fontSize: 20, fontWeight: '900', marginVertical: 2 },
  dateCardMonth: { fontSize: 10, fontWeight: '700' },

  // Compact View Styles
  compactJobCard: { padding: 12, borderRadius: 12, marginBottom: 8, borderWidth: 1, ...Shadows.sm },
  compactRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  compactCity: { fontSize: 13, fontWeight: '800' },
  compactDate: { fontSize: 11, fontWeight: '600' },
  compactRowSecondary: { flexDirection: 'row', paddingLeft: 24 },
  compactSubtext: { fontSize: 11, fontWeight: '700' },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },
  loadingText: { marginTop: 15, fontSize: 14, fontWeight: '600' },
  emptyWrap: { alignItems: 'center', marginTop: 100, paddingHorizontal: 40 },
  emptyIconCircle: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 18, fontWeight: '900', marginBottom: 10 },
  emptySubtitle: { fontSize: 13, fontWeight: '500', textAlign: 'center', opacity: 0.7, lineHeight: 20 },
  emptyResetBtn: { marginTop: 20, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(243, 129, 24, 0.2)' },
  emptyResetBtnText: { fontSize: 11, fontWeight: '900', letterSpacing: 1 },
});
