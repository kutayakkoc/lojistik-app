import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { supabase } from './lib/supabase';
import { NavigationContainer } from '@react-navigation/native';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import MainNavigator from './navigation/MainNavigator';
import Auth from './screens/Auth';

function ThemedAppContent({ session }: { session: any }) {
  const { isDarkMode, theme } = useTheme();

  return (
    <>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <NavigationContainer>
        {session && session.user ? <MainNavigator /> : <Auth />}
      </NavigationContainer>
    </>
  );
}

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
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
        <ThemedAppContent session={session} />
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
