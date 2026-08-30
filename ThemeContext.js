import React, { createContext, useState, useEffect, useContext } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const colors = {
  light: {
    background: '#f8f9fa',
    card: '#ffffff',
    text: '#212529',
    textSub: '#6c757d',
    border: '#e2e8f0',
    primary: '#d1202d',
    navBar: '#ffffff',
    inputBackground: '#f8fafc',
    inputBorder: '#cbd5e1',
    success: '#198754',
    danger: '#d1202d',
    cardSubText: '#64748b',
    headerBackground: '#d1202d',
    headerText: '#ffffff',
    footerBackground: '#212529',
  },
  dark: {
    background: '#121212',
    card: '#1e1e1e',
    text: '#f8f9fa',
    textSub: '#a0a0a0',
    border: '#333333',
    primary: '#d1202d', 
    navBar: '#1e1e1e',
    inputBackground: '#2d2d2d',
    inputBorder: '#404040',
    success: '#22c55e',
    danger: '#d1202d',
    cardSubText: '#9ca3af',
    headerBackground: '#d1202d', 
    headerText: '#ffffff',
    footerBackground: '#000000',
  }
};

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [theme, setTheme] = useState(systemColorScheme || 'light');
  const [isThemeLoaded, setIsThemeLoaded] = useState(false);

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('app_theme');
      if (savedTheme) {
        setTheme(savedTheme);
      } else if (systemColorScheme) {
        setTheme(systemColorScheme);
      }
    } catch (e) {
      console.error('Failed to load theme:', e);
    } finally {
      setIsThemeLoaded(true);
    }
  };

  const toggleTheme = async () => {
    try {
      const newTheme = theme === 'light' ? 'dark' : 'light';
      setTheme(newTheme);
      await AsyncStorage.setItem('app_theme', newTheme);
    } catch (e) {
      console.error('Failed to save theme:', e);
    }
  };

  if (!isThemeLoaded) {
    return null; 
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, colors: colors[theme] }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
