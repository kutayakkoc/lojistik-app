import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { supabase } from './lib/supabase';
import { NavigationContainer } from '@react-navigation/native';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import MainNavigator from './navigation/MainNavigator';
import Auth from './screens/Auth';

function ThemedAppContent({ session, recoveryState }: { session: any, recoveryState: any }) {
  const { theme } = useTheme();

  return (
    <>
      <StatusBar style="dark" />
      <NavigationContainer>
        {session && session.user ? (
          <MainNavigator />
        ) : (
          <Auth recoveryState={recoveryState} />
        )}
      </NavigationContainer>
    </>
  );
}

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [recoveryState, setRecoveryState] = useState<any>(null);

  useEffect(() => {
    // Sesyona bak
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    // Deep Link Dinle
    const handleDeepLink = (event: { url: string }) => {
      let data = Linking.parse(event.url);
      if (data.path === 'reset-password' || data.path === 'auth/callback') {
         setRecoveryState(data);
      }
    };

    const sub = Linking.addEventListener('url', handleDeepLink);

    // Uygulama kapalıyken link ile açılırsa
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink({ url });
    });

    return () => {
      subscription.unsubscribe();
      sub.remove();
    };
  }, []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#F38118" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ThemedAppContent session={session} recoveryState={recoveryState} />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#020617' // Default to deep navy for smooth transition
  }
});
