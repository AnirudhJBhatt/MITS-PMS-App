import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { getBaseUrl, saveBaseUrl, API_ENDPOINTS } from '../config';

const showAlert = (title, message) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
};

export default function SettingsScreen({ onLogout }) {
  // Server Config State
  const [serverUrl, setServerUrl] = useState('');
  const [savingServer, setSavingServer] = useState(false);

  // Password Change State
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);

  useEffect(() => {
    loadCurrentServerUrl();
  }, []);

  const loadCurrentServerUrl = async () => {
    const url = await getBaseUrl();
    setServerUrl(url);
  };

  const handleSaveServer = async () => {
    if (!serverUrl.trim()) {
      showAlert('Validation Error', 'Please enter a valid Server API URL');
      return;
    }
    setSavingServer(true);
    try {
      await saveBaseUrl(serverUrl);
      showAlert('Success', 'API Server URL updated successfully');
    } catch (e) {
      showAlert('Error', 'Failed to save API Server URL');
    } finally {
      setSavingServer(false);
    }
  };

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      showAlert('Validation Error', 'Please fill in all password fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      showAlert('Validation Error', 'New Password and Confirm Password do not match');
      return;
    }

    if (newPassword.length < 4) {
      showAlert('Validation Error', 'Password must be at least 4 characters long');
      return;
    }

    setUpdatingPassword(true);
    try {
      const studId = await AsyncStorage.getItem('Stud_ID');
      const baseUrl = await getBaseUrl();

      const response = await axios.post(`${baseUrl}${API_ENDPOINTS.CHANGE_PASSWORD}`, {
        User_ID: studId,
        old_password: oldPassword,
        new_password: newPassword,
      });

      let data = response.data;
      if (typeof data === 'string') {
        try { data = JSON.parse(data); } catch (e) { }
      }

      if (data && data.status === 'success') {
        showAlert('Success 🎉', 'Your password has been changed successfully.');
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        showAlert('Error', data?.message || 'Could not change password.');
      }
    } catch (error) {
      console.error('Change password error:', error);
      showAlert('Network Error', 'Failed to update password. Check connection.');
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleLogoutConfirm = () => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to sign out?');
      if (confirmed) {
        performLogout();
      }
    } else {
      Alert.alert('Logout', 'Are you sure you want to sign out?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: performLogout,
        },
      ]);
    }
  };

  const performLogout = async () => {
    await AsyncStorage.removeItem('user_session');
    await AsyncStorage.removeItem('Stud_ID');
    if (onLogout) onLogout();
  };

  return (
    <KeyboardAvoidingView
      enabled={Platform.OS !== 'web'}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollPadding}>
        {/* Web Dashboard Sub-Header (.dashboard-header #343a40) */}
        <View style={styles.dashboardHeader}>
          <Text style={styles.dashboardTitle}>Settings & Security</Text>
        </View>

        {/* Server IP Config Card */}
        {/* <View style={styles.card}>
          <Text style={styles.cardTitle}>🌐 API Server Connection</Text>
          <Text style={styles.cardSub}>
            Update the API host address if testing on Expo Go or local Wi-Fi.
          </Text>

          <Text style={styles.label}>Base API Endpoint URL</Text>
          <TextInput
            style={styles.input}
            value={serverUrl}
            onChangeText={setServerUrl}
            placeholder="http://192.168.1.x/MITS-PMS/api"
            autoCapitalize="none"
          />

          <TouchableOpacity
            style={[styles.saveBtn, savingServer && styles.btnDisabled]}
            onPress={handleSaveServer}
            disabled={savingServer}
          >
            {savingServer ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.btnText}>SAVE SERVER URL</Text>}
          </TouchableOpacity>
        </View> */}

        {/* Change Password Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Change Password</Text>

          <Text style={styles.label}>Current Password</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Enter current password"
              placeholderTextColor="#94a3b8"
              secureTextEntry={!showOldPassword}
              value={oldPassword}
              onChangeText={setOldPassword}
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setShowOldPassword(!showOldPassword)}
            >
              <Ionicons name={showOldPassword ? "eye" : "eye-off"} size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>New Password</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Enter new password"
              placeholderTextColor="#94a3b8"
              secureTextEntry={!showNewPassword}
              value={newPassword}
              onChangeText={setNewPassword}
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setShowNewPassword(!showNewPassword)}
            >
              <Ionicons name={showNewPassword ? "eye" : "eye-off"} size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Confirm New Password</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Confirm new password"
              placeholderTextColor="#94a3b8"
              secureTextEntry={!showConfirmPassword}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              <Ionicons name={showConfirmPassword ? "eye" : "eye-off"} size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.updateBtn, updatingPassword && styles.btnDisabled]}
            onPress={handleChangePassword}
            disabled={updatingPassword}
          >
            {updatingPassword ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.btnText}>UPDATE PASSWORD</Text>}
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogoutConfirm}>
          <Text style={styles.logoutText}> LOGOUT</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>MITS PMS Student Mobile App v1.0.0</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  scrollPadding: { padding: 12 },
  dashboardHeader: { backgroundColor: '#343a40', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 6, marginBottom: 14 },
  dashboardTitle: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' },
  card: { backgroundColor: '#ffffff', borderRadius: 10, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: '#e2e8f0', elevation: 2 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#212529', marginBottom: 6 },
  cardSub: { fontSize: 12, color: '#6c757d', marginBottom: 14, lineHeight: 17 },
  label: { color: '#475569', fontSize: 13, fontWeight: '600', marginBottom: 6 },
  input: { backgroundColor: '#f8fafc', color: '#212529', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, borderWidth: 1, borderColor: '#cbd5e1', marginBottom: 14 },
  passwordContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 8, borderWidth: 1, borderColor: '#cbd5e1', marginBottom: 14 },
  passwordInput: { flex: 1, color: '#212529', paddingHorizontal: 14, paddingVertical: 10, fontSize: 14 },
  eyeBtn: { paddingHorizontal: 14 },
  eyeText: { fontSize: 18 },
  saveBtn: { backgroundColor: '#d1202d', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginTop: 4 },
  updateBtn: { backgroundColor: '#198754', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginTop: 4 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 14, letterSpacing: 0.5 },
  logoutBtn: { backgroundColor: '#d1202d', borderRadius: 8, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  logoutText: { color: '#ffffff', fontWeight: 'bold', fontSize: 15 },
  versionText: { textAlign: 'center', color: '#6c757d', fontSize: 12, marginTop: 24, marginBottom: 10 },
});
