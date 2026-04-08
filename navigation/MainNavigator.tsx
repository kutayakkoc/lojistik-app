import React, { useEffect, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows, Radius, Spacing } from '../constants/Theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Dashboard from '../screens/Dashboard';
import JobDetailScreen from '../screens/JobDetailScreen';
import DriverApplicationsScreen from '../screens/DriverApplicationsScreen';
import ShipperJobsScreen from '../screens/ShipperJobsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import EditVehicleScreen from '../screens/EditVehicleScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import SupportScreen from '../screens/SupportScreen';
import LegalScreen from '../screens/LegalScreen';
import LegalDetailScreen from '../screens/LegalDetailScreen';
import { supabase } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Shipper ve Driver için Home Stack (Dashboard -> Job Detail vb.)
function HomeStack() {
  const { theme } = useTheme();
  
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '800' },
      }}
    >
      <Stack.Screen 
        name="Dashboard" 
        component={Dashboard} 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="JobDetail" 
        component={JobDetailScreen} 
        options={{ headerShown: false }} 
      />
    </Stack.Navigator>
  );
}

function ProfileStack() {
  const { theme } = useTheme();
  
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '800' },
      }}
    >
      <Stack.Screen 
        name="ProfileMain" 
        component={ProfileScreen} 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="EditProfile" 
        component={EditProfileScreen} 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="EditVehicle" 
        component={EditVehicleScreen} 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="Notifications" 
        component={NotificationsScreen} 
        options={{ headerShown: false, presentation: 'modal' }} 
      />
      <Stack.Screen 
        name="Support" 
        component={SupportScreen} 
        options={{ headerShown: false, presentation: 'modal' }} 
      />
      <Stack.Screen 
        name="Legal" 
        component={LegalScreen} 
        options={{ headerShown: false, presentation: 'modal' }} 
      />
      <Stack.Screen 
        name="LegalDetail" 
        component={LegalDetailScreen} 
        options={{ headerShown: false, presentation: 'modal' }} 
      />
    </Stack.Navigator>
  );
}

function ShipperStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ShipperJobsMain" component={ShipperJobsScreen} />
      <Stack.Screen name="JobDetail" component={JobDetailScreen} />
    </Stack.Navigator>
  );
}

function DriverAppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DriverApplicationsMain" component={DriverApplicationsScreen} />
      <Stack.Screen name="JobDetail" component={JobDetailScreen} />
    </Stack.Navigator>
  );
}

// Ana role göre tabları hazırlıyoruz
export default function MainNavigator() {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { theme, isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .limit(1)
          .maybeSingle();
          
        if (!error && data) {
          setRole(data.role);
        }
      }
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.primaryLight,
        tabBarInactiveTintColor: theme.textLight,
        tabBarStyle: { 
          backgroundColor: isDarkMode ? '#020617' : '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: theme.border,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom + 12,
          paddingTop: 12,
          ...Shadows.sm,
          elevation: 0,
        },
        headerStyle: { backgroundColor: theme.primary },
        headerTintColor: '#fff',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '800',
          marginTop: 2,
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: any;

          if (route.name === 'HomeTab') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'MyApplications') {
            iconName = focused ? 'document-text' : 'document-text-outline';
          } else if (route.name === 'ShipperJobs') {
            iconName = focused ? 'list' : 'list-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen 
        name="HomeTab" 
        component={HomeStack} 
        options={{ title: 'Ana Ekran' }} 
      />
      {role === 'DRIVER' && (
          <Tab.Screen 
            name="MyApplications" 
            component={DriverAppStack} 
            options={{ title: 'Başvurularım' }} 
          />
      )}
      {role === 'SHIPPER' && (
          <Tab.Screen 
            name="ShipperJobs" 
            component={ShipperStack} 
            options={{ title: 'İlanlarım' }} 
          />
      )}
      <Tab.Screen 
        name="Profile" 
        component={ProfileStack} 
        options={{ title: 'Profilim' }} 
      />
    </Tab.Navigator>
  );
}
