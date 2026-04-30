import React, { createContext, useContext, useState } from 'react';
import { Colors } from '../constants/Theme';

type ThemeType = 'light';

interface ThemeContextType {
  theme: typeof Colors.light;
  themeType: ThemeType;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeType] = useState<ThemeType>('light');
  const theme = Colors.light;

  return (
    <ThemeContext.Provider value={{ theme, themeType }}>
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
