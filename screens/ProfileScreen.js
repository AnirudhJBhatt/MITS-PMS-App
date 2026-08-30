import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Platform,
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getBaseUrl, API_ENDPOINTS } from '../config';
import { useTheme } from '../ThemeContext';

const showAlert = (title, message) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
};

export default function ProfileScreen() {
  const { theme, colors } = useTheme();
  
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const studId = await AsyncStorage.getItem('Stud_ID');
      if (!studId) return;

      const baseUrl = await getBaseUrl();
      const response = await axios.get(`${baseUrl}${API_ENDPOINTS.PROFILE}?Stud_ID=${studId}`);

      let data = response.data;
      if (typeof data === 'string') {
        try { data = JSON.parse(data); } catch (e) { }
      }
      
      if (data && data.status === 'success') {
        setProfile(data.data);
      } else {
        showAlert('Notice', data?.message || 'Could not load profile');
      }
    } catch (error) {
      console.error('Fetch profile error:', error);
      showAlert('Error', 'Unable to fetch student profile.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProfile();
  }, []);

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSub }]}>Loading Student Profile...</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.danger }]}>No profile information found.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
      }
    >
      {/* Profile Header */}
      <View style={[styles.profileHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={[styles.avatarCircle, { backgroundColor: colors.primary }]}>
          <Text style={styles.avatarText}>{profile.Stud_Name ? profile.Stud_Name.charAt(0) : 'S'}</Text>
        </View>
        <Text style={[styles.nameText, { color: colors.text }]}>{profile.Stud_Name}</Text>
        <Text style={[styles.idText, { color: colors.textSub }]}>ID: {profile.Stud_ID} | Reg No: {profile.Stud_Reg_No || 'N/A'}</Text>

        <View style={styles.badgeRow}>
          <View style={[styles.courseBadge, { backgroundColor: colors.headerBackground }]}>
            <Text style={[styles.badgeText, { color: colors.headerText }]}>{profile.Stud_Course}</Text>
          </View>
          <View style={[styles.batchBadge, { backgroundColor: colors.primary }]}>
            <Text style={styles.badgeText}>{profile.Prog_Name}</Text>
          </View>
        </View>
      </View>

      {/* Academic Performance Section */}
      <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.dashboardHeader, { backgroundColor: colors.headerBackground }]}>
          <Text style={[styles.dashboardTitle, { color: colors.headerText }]}>Academic Performance</Text>
        </View>

        <View style={styles.grid}>
          <View style={[styles.metricBox, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
            <Text style={[styles.metricLabel, { color: colors.textSub }]}>Current CGPA</Text>
            <Text style={[styles.metricVal, { color: '#0d6efd' }]}>{profile.CGPA || 'N/A'}</Text>
          </View>
          <View style={[styles.metricBox, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
            <Text style={[styles.metricLabel, { color: colors.textSub }]}>Active Backlogs</Text>
            <Text style={[styles.metricVal, { color: profile.Stud_Backlogs > 0 ? colors.danger : colors.success }]}>
              {profile.Stud_Backlogs || '0'}
            </Text>
          </View>
          <View style={[styles.metricBox, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
            <Text style={[styles.metricLabel, { color: colors.textSub }]}>10th Marks</Text>
            <Text style={[styles.metricVal, { color: colors.text }]}>{profile.Marks_10th}%</Text>
          </View>
          <View style={[styles.metricBox, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
            <Text style={[styles.metricLabel, { color: colors.textSub }]}>12th Marks</Text>
            <Text style={[styles.metricVal, { color: colors.text }]}>{profile.Marks_12th}%</Text>
          </View>
          <View style={[styles.metricBox, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
            <Text style={[styles.metricLabel, { color: colors.textSub }]}>UG Marks</Text>
            <Text style={[styles.metricVal, { color: colors.text }]}>{profile.Marks_UG}%</Text>
          </View>
          <View style={[styles.metricBox, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
            <Text style={[styles.metricLabel, { color: colors.textSub }]}>Placement Status</Text>
            <Text style={[styles.metricVal, { color: profile.Stud_Placement == 1 ? colors.success : colors.danger, fontSize: 13 }]}>
              {profile.Stud_Placement == 1 ? 'Placed' : 'Unplaced'}
            </Text>
          </View>
        </View>
      </View>

      {/* Personal & Contact Info Section */}
      <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.dashboardHeader, { backgroundColor: colors.headerBackground }]}>
          <Text style={[styles.dashboardTitle, { color: colors.headerText }]}>Student Details</Text>
        </View>

        <View style={styles.infoContent}>
          <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.infoLabel, { color: colors.textSub }]}>Email Address</Text>
            <Text style={[styles.infoVal, { color: colors.text }]}>{profile.Stud_Email || 'N/A'}</Text>
          </View>
          <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.infoLabel, { color: colors.textSub }]}>Mobile Number</Text>
            <Text style={[styles.infoVal, { color: colors.text }]}>{profile.Stud_Mob || 'N/A'}</Text>
          </View>
          <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.infoLabel, { color: colors.textSub }]}>Gender</Text>
            <Text style={[styles.infoVal, { color: colors.text }]}>{profile.Stud_Gender || 'N/A'}</Text>
          </View>
          <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.infoLabel, { color: colors.textSub }]}>Date of Birth</Text>
            <Text style={[styles.infoVal, { color: colors.text }]}>{profile.Stud_DOB || 'N/A'}</Text>
          </View>
          <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.infoLabel, { color: colors.textSub }]}>Father's Name</Text>
            <Text style={[styles.infoVal, { color: colors.text }]}>{profile.Stud_Father_Name || 'N/A'}</Text>
          </View>
          <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.infoLabel, { color: colors.textSub }]}>Mother's Name</Text>
            <Text style={[styles.infoVal, { color: colors.text }]}>{profile.Stud_Mother_Name || 'N/A'}</Text>
          </View>
          <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.infoLabel, { color: colors.textSub }]}>Address</Text>
            <Text style={[styles.infoVal, { color: colors.text }]}>{profile.Stud_Address || 'N/A'}</Text>
          </View>
        </View>
      </View>

      {/* Placement Details Section */}
      <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.dashboardHeader, { backgroundColor: colors.headerBackground }]}>
          <Text style={[styles.dashboardTitle, { color: colors.headerText }]}>Placement Details</Text>
        </View>

        <View style={styles.infoContent}>
          <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.infoLabel, { color: colors.textSub }]}>Company Name</Text>
            <Text style={[styles.infoVal, { color: colors.text }]}>{profile.Stud_Placement_Company || 'N/A'}</Text>
          </View>
          <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.infoLabel, { color: colors.textSub }]}>CTC</Text>
            <Text style={[styles.infoVal, { color: colors.text }]}>{profile.Stud_Placement_CTC || 'N/A'}</Text>
          </View>
          <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.infoLabel, { color: colors.textSub }]}>Job Title</Text>
            <Text style={[styles.infoVal, { color: colors.text }]}>{profile.Stud_Job_Title || 'N/A'}</Text>
          </View>
        </View>
      </View>

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  centerContainer: { flex: 1, backgroundColor: '#f8f9fa', justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#6c757d', marginTop: 12, fontSize: 14 },
  errorText: { color: '#d1202d', fontSize: 15 },
  profileHeader: { backgroundColor: '#ffffff', alignItems: 'center', paddingVertical: 20, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', elevation: 2 },
  avatarCircle: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#d1202d', justifyContent: 'center', alignItems: 'center', marginBottom: 10, elevation: 3 },
  avatarText: { color: '#ffffff', fontSize: 30, fontWeight: 'bold' },
  nameText: { fontSize: 22, fontWeight: 'bold', color: '#212529' },
  idText: { fontSize: 13, color: '#6c757d', marginTop: 3 },
  badgeRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  courseBadge: { backgroundColor: '#343a40', paddingVertical: 4, paddingHorizontal: 12, borderRadius: 4 },
  batchBadge: { backgroundColor: '#d1202d', paddingVertical: 4, paddingHorizontal: 12, borderRadius: 4 },
  badgeText: { color: '#ffffff', fontSize: 12, fontWeight: 'bold' },
  sectionCard: { backgroundColor: '#ffffff', marginHorizontal: 12, marginTop: 14, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', elevation: 2, overflow: 'hidden' },
  dashboardHeader: { backgroundColor: '#343a40', paddingHorizontal: 16, paddingVertical: 10 },
  dashboardTitle: { color: '#ffffff', fontSize: 15, fontWeight: 'bold' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: 14 },
  metricBox: { width: '31%', backgroundColor: '#f8f9fa', padding: 10, borderRadius: 6, alignItems: 'center', borderWidth: 1, borderColor: '#e9ecef' },
  metricLabel: { fontSize: 11, color: '#6c757d', fontWeight: '600', marginBottom: 4, textAlign: 'center' },
  metricVal: { fontSize: 15, fontWeight: 'bold', color: '#212529' },
  infoContent: { paddingHorizontal: 14, paddingVertical: 6 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#e9ecef' },
  infoLabel: { fontSize: 13, color: '#6c757d', fontWeight: '600' },
  infoVal: { fontSize: 13, color: '#212529', fontWeight: '500', maxWidth: '60%', textAlign: 'right' },
});
