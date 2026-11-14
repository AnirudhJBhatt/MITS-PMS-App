import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const TOKEN_KEY = 'userToken';

/**
 * Save user authentication token securely.
 * Uses hardware-backed SecureStore on iOS/Android, and AsyncStorage on Web.
 */
export const saveUserToken = async (token) => {
  try {
    if (Platform.OS === 'web') {
      await AsyncStorage.setItem(TOKEN_KEY, token);
    } else {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
    }
  } catch (error) {
    console.error('Error saving user token in SecureStore:', error);
    // Fallback to AsyncStorage if SecureStore fails
    await AsyncStorage.setItem(TOKEN_KEY, token);
  }
};

/**
 * Retrieve the saved user authentication token.
 * Checks SecureStore on native, and falls back to AsyncStorage for web or migration.
 */
export const getUserToken = async () => {
  try {
    if (Platform.OS === 'web') {
      return await AsyncStorage.getItem(TOKEN_KEY);
    }
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    if (token) return token;

    // Check if migrating from an older version that stored in AsyncStorage
    const legacyToken = await AsyncStorage.getItem(TOKEN_KEY);
    if (legacyToken) {
      // Migrate forward to SecureStore
      await SecureStore.setItemAsync(TOKEN_KEY, legacyToken);
      await AsyncStorage.removeItem(TOKEN_KEY);
      return legacyToken;
    }
    return null;
  } catch (error) {
    console.error('Error getting user token from SecureStore:', error);
    return await AsyncStorage.getItem(TOKEN_KEY);
  }
};

/**
 * Remove the user authentication token from both secure and legacy storage.
 */
export const removeUserToken = async () => {
  try {
    if (Platform.OS !== 'web') {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    }
  } catch (error) {
    console.error('Error deleting user token from SecureStore:', error);
  } finally {
    await AsyncStorage.removeItem(TOKEN_KEY);
  }
};
