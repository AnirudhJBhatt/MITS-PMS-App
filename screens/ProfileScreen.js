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

const showAlert = (title, message) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
};

export default function ProfileScreen() {
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
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#d1202d" />
        <Text style={styles.loadingText}>Loading Student Profile...</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>No profile information found.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#d1202d']} tintColor="#d1202d" />
      }
    >
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{profile.Stud_Name ? profile.Stud_Name.charAt(0) : 'S'}</Text>
        </View>
        <Text style={styles.nameText}>{profile.Stud_Name}</Text>
        <Text style={styles.idText}>ID: {profile.Stud_ID} | Reg No: {profile.Stud_Reg_No || 'N/A'}</Text>

        <View style={styles.badgeRow}>
          <View style={styles.courseBadge}>
            <Text style={styles.badgeText}>{profile.Stud_Course}</Text>
          </View>
          <View style={styles.batchBadge}>
            <Text style={styles.badgeText}>{profile.Prog_Name}</Text>
          </View>
        </View>
      </View>

      {/* Academic Performance Section */}
      <View style={styles.sectionCard}>
        <View style={styles.dashboardHeader}>
          <Text style={styles.dashboardTitle}>Academic Performance</Text>
        </View>

        <View style={styles.grid}>
          <View style={styles.metricBox}>
            <Text style={styles.metricLabel}>Current CGPA</Text>
            <Text style={[styles.metricVal, { color: '#0d6efd' }]}>{profile.CGPA || 'N/A'}</Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={styles.metricLabel}>Active Backlogs</Text>
            <Text style={[styles.metricVal, { color: profile.Stud_Backlogs > 0 ? '#d1202d' : '#198754' }]}>
              {profile.Stud_Backlogs || '0'}
            </Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={styles.metricLabel}>10th Marks</Text>
            <Text style={styles.metricVal}>{profile.Marks_10th}%</Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={styles.metricLabel}>12th Marks</Text>
            <Text style={styles.metricVal}>{profile.Marks_12th}%</Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={styles.metricLabel}>UG Marks</Text>
            <Text style={styles.metricVal}>{profile.Marks_UG}%</Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={styles.metricLabel}>Placement Status</Text>
            <Text style={[styles.metricVal, { color: profile.Stud_Placement == 1 ? '#198754' : '#d1202d', fontSize: 13 }]}>
              {profile.Stud_Placement == 1 ? 'Placed' : 'Unplaced'}
            </Text>
          </View>
        </View>
      </View>

      {/* Personal & Contact Info Section */}
      <View style={styles.sectionCard}>
        <View style={styles.dashboardHeader}>
          <Text style={styles.dashboardTitle}>Student Details</Text>
        </View>

        <View style={styles.infoContent}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email Address</Text>
            <Text style={styles.infoVal}>{profile.Stud_Email || 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Mobile Number</Text>
            <Text style={styles.infoVal}>{profile.Stud_Mob || 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Gender</Text>
            <Text style={styles.infoVal}>{profile.Stud_Gender || 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Date of Birth</Text>
            <Text style={styles.infoVal}>{profile.Stud_DOB || 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Father's Name</Text>
            <Text style={styles.infoVal}>{profile.Stud_Father_Name || 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Mother's Name</Text>
            <Text style={styles.infoVal}>{profile.Stud_Mother_Name || 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Address</Text>
            <Text style={styles.infoVal}>{profile.Stud_Address || 'N/A'}</Text>
          </View>
        </View>
      </View>

      {/* Personal & Contact Info Section */}
      <View style={styles.sectionCard}>
        <View style={styles.dashboardHeader}>
          <Text style={styles.dashboardTitle}>Placement Details</Text>
        </View>

        <View style={styles.infoContent}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Company Name</Text>
            <Text style={styles.infoVal}>{profile.Stud_Placement_Company || 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>CTC</Text>
            <Text style={styles.infoVal}>{profile.Stud_Placement_CTC || 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Job Title</Text>
            <Text style={styles.infoVal}>{profile.Stud_Job_Title || 'N/A'}</Text>
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
