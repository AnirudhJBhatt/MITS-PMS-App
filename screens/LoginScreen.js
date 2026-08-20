import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
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

export default function LoginScreen({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Server IP Modal Settings
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [serverUrl, setServerUrl] = useState('');

  useEffect(() => {
    loadSavedServerUrl();
  }, []);

  const loadSavedServerUrl = async () => {
    const url = await getBaseUrl();
    setServerUrl(url);
  };

  const handleSaveSettings = async () => {
    if (!serverUrl.trim()) {
      showAlert('Error', 'Please enter a valid Base API URL');
      return;
    }
    try {
      await saveBaseUrl(serverUrl);
      setSettingsVisible(false);
      showAlert('Success', 'Server URL saved successfully');
    } catch (e) {
      showAlert('Error', 'Failed to save URL');
    }
  };

  const handleLogin = async () => {
    setErrorMessage('');

    if (!username.trim() || !password.trim()) {
      setErrorMessage('Please enter your Username and Password.');
      return;
    }

    setLoading(true);
    try {
      const baseUrl = await getBaseUrl();
      const endpoint = `${baseUrl}${API_ENDPOINTS.LOGIN}`;
      console.log("Endpoint: ", endpoint);

      const response = await axios.post(
        endpoint,
        { username: username.trim(), password: password.trim() },
        { timeout: 8000 }
      );

      let data = response.data;
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data);
        } catch (e) {
          console.error('Response JSON parse error:', e);
        }
      }

      if (data && data.status === 'success') {
        const studentData = data.data;
        await AsyncStorage.setItem('user_session', JSON.stringify(studentData));
        await AsyncStorage.setItem('Stud_ID', studentData.Stud_ID);

        onLoginSuccess(studentData);
      } else {
        const msg = data?.message || 'Invalid username or password.';
        // console.log(data);
        setErrorMessage(msg);
        showAlert('Login Failed', msg);
      }
    } catch (error) {
      console.error('Login error:', error);
      let errorMsg = 'Could not connect to the backend server.';
      if (error.response?.data?.message) {
        errorMsg = error.response.data.message;
      } else if (error.code === 'ECONNABORTED') {
        errorMsg = 'Server connection timed out. Check your IP address setting.';
      }
      setErrorMessage(errorMsg);
      // print API URL
      console.log('API URL: ', endpoint);
      showAlert('Network Error', `${errorMsg}\n\nTap "⚙️ Server IP" at top right to check server URL.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      enabled={Platform.OS !== 'web'}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.flexContainer}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        {/* Header Config Button */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.configBtn} onPress={() => setSettingsVisible(true)}>
            <Text style={styles.configBtnText}>⚙️ Server IP</Text>
          </TouchableOpacity>
        </View>

        {/* Branding Logo & Title */}
        <View style={styles.brandContainer}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoText}>MITS</Text>
          </View>
          <Text style={styles.title}>MITS PMS</Text>
          <Text style={styles.subtitle}>Placement Management System</Text>
        </View>

        {/* Login Card Matching login.php */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>Student Login</Text>

          {/* Inline Error Banner */}
          {!!errorMessage && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>⚠️ {errorMessage}</Text>
            </View>
          )}

          <Text style={styles.label}>Username / Roll No</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 23MCA08"
            placeholderTextColor="#94a3b8"
            value={username}
            onChangeText={(txt) => { setUsername(txt); setErrorMessage(''); }}
            autoCapitalize="characters"
          />

          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Enter your password"
              placeholderTextColor="#94a3b8"
              value={password}
              onChangeText={(txt) => { setPassword(txt); setErrorMessage(''); }}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Ionicons name={showPassword ? "eye" : "eye-off"} size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.loginBtnText}>LOGIN</Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.footerText}>Muthoot Institute of Technology & Science</Text>
      </ScrollView>

      {/* Server IP Config Modal */}
      <Modal visible={settingsVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Configure API Server URL</Text>
            <Text style={styles.modalSub}>
              Enter your computer's local IP address running XAMPP. Do not use localhost on physical devices.
            </Text>

            <Text style={styles.label}>API Base URL</Text>
            <TextInput
              style={styles.input}
              value={serverUrl}
              onChangeText={setServerUrl}
              placeholder="http://192.168.1.x/MITS-PMS/api"
              autoCapitalize="none"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => setSettingsVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, styles.saveBtn]}
                onPress={handleSaveSettings}
              >
                <Text style={styles.saveBtnText}>Save URL</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flexContainer: { flex: 1, backgroundColor: '#eeeeee' },
  scrollContainer: { flexGrow: 1, padding: 20, justifyContent: 'center' },
  topBar: { alignItems: 'flex-end', marginBottom: 10 },
  configBtn: { backgroundColor: '#ffffff', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: '#cbd5e1' },
  configBtnText: { color: '#334155', fontSize: 13, fontWeight: '600' },
  brandContainer: { alignItems: 'center', marginBottom: 25 },
  logoBadge: { backgroundColor: '#d1202d', width: 70, height: 70, borderRadius: 35, justifyContent: 'center', alignItems: 'center', marginBottom: 12, elevation: 4 },
  logoText: { color: '#ffffff', fontWeight: '900', fontSize: 20, letterSpacing: 1 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#d1202d', letterSpacing: 0.5 },
  subtitle: { fontSize: 14, color: '#475569', marginTop: 2 },
  card: { backgroundColor: '#ffffff', borderRadius: 12, padding: 24, borderWidth: 1, borderColor: '#e2e8f0', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6 },
  cardHeader: { fontSize: 20, fontWeight: 'bold', color: '#333333', marginBottom: 16, textAlign: 'center' },
  errorBanner: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fca5a5', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, marginBottom: 16 },
  errorBannerText: { color: '#991b1b', fontSize: 13, fontWeight: '600' },
  label: { color: '#475569', fontSize: 13, fontWeight: '600', marginBottom: 6 },
  input: { backgroundColor: '#f8fafc', color: '#1e293b', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, borderWidth: 1, borderColor: '#cbd5e1', marginBottom: 16 },
  passwordContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 8, borderWidth: 1, borderColor: '#cbd5e1', marginBottom: 24 },
  passwordInput: { flex: 1, color: '#1e293b', paddingHorizontal: 14, paddingVertical: 11, fontSize: 15 },
  eyeBtn: { paddingHorizontal: 14 },
  eyeText: { fontSize: 18 },
  loginBtn: { backgroundColor: '#198754', borderRadius: 8, paddingVertical: 13, alignItems: 'center', elevation: 2 },
  loginBtnDisabled: { opacity: 0.6 },
  loginBtnText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold', letterSpacing: 0.5 },
  footerText: { textAlign: 'center', color: '#64748b', fontSize: 12, marginTop: 30 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: '#ffffff', borderRadius: 14, padding: 24, borderWidth: 1, borderColor: '#e2e8f0' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b', marginBottom: 6 },
  modalSub: { fontSize: 13, color: '#64748b', marginBottom: 16, lineHeight: 18 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 10 },
  modalBtn: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 8 },
  cancelBtn: { backgroundColor: '#e2e8f0' },
  cancelBtnText: { color: '#475569', fontWeight: '600' },
  saveBtn: { backgroundColor: '#d1202d' },
  saveBtnText: { color: '#ffffff', fontWeight: 'bold' },
});
