import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Default fallback host: 
// On Android emulator: 10.0.2.2 points to local machine
// On web / iOS simulator: localhost
// On physical devices: IP address (e.g., 192.168.1.100)
const DEFAULT_HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
const DEFAULT_BASE_URL = process.env.EXPO_PUBLIC_API_URL || `http://${DEFAULT_HOST}/MITS-PMS/api`;
// http://10.180.71.219/MITS-PMS/api
export const getBaseUrl = async () => {
  try {
    const savedUrl = await AsyncStorage.getItem('API_BASE_URL');
    if (savedUrl) {
      return savedUrl;
    }
  } catch (error) {
    console.error('Error reading saved API_BASE_URL:', error);
  }
  return DEFAULT_BASE_URL;
};

export const saveBaseUrl = async (url) => {
  try {
    // Trim trailing slash if present
    const cleanUrl = url.trim().replace(/\/+$/, '');
    await AsyncStorage.setItem('API_BASE_URL', cleanUrl);
    return cleanUrl;
  } catch (error) {
    console.error('Error saving API_BASE_URL:', error);
    throw error;
  }
};

export const API_ENDPOINTS = {
  LOGIN: '/student-login.php',
  DRIVES: '/student-drives.php',
  APPLY: '/apply-drive.php',
  PROFILE: '/student-profile.php',
  APPLICATIONS: '/student-applications.php',
  CHANGE_PASSWORD: '/change-password.php',
};
