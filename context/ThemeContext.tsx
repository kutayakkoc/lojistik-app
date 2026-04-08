import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../constants/Theme';

type ThemeType = 'light' | 'dark';

interface ThemeContextType {
  theme: typeof Colors.light;
  isDarkMode: boolean;
  toggleTheme: () => void;
  themeType: ThemeType;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [themeType, setThemeType] = useState<ThemeType>(systemColorScheme === 'dark' ? 'dark' : 'light');

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('userTheme');
      if (savedTheme) {
        setThemeType(savedTheme as ThemeType);
      }
    } catch (e) {
      console.error('Failed to load theme', e);
    }
  };

  const toggleTheme = async () => {
    const newTheme = themeType === 'light' ? 'dark' : 'light';
    setThemeType(newTheme);
    try {
      await AsyncStorage.setItem('userTheme', newTheme);
    } catch (e) {
      console.error('Failed to save theme', e);
    }
  };

  const isDarkMode = themeType === 'dark';
  const theme = isDarkMode ? Colors.dark : Colors.light;

  return (
    <ThemeContext.Provider value={{ theme, isDarkMode, toggleTheme, themeType }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
