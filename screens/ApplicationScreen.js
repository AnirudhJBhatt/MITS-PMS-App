import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
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

export default function ApplicationScreen() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const studId = await AsyncStorage.getItem('Stud_ID');
      if (!studId) return;

      const baseUrl = await getBaseUrl();
      const response = await axios.get(`${baseUrl}${API_ENDPOINTS.APPLICATIONS}?Stud_ID=${studId}`);

      let data = response.data;
      if (typeof data === 'string') {
        try { data = JSON.parse(data); } catch (e) {}
      }

      if (data && data.status === 'success') {
        setApplications(data.data);
      } else {
        showAlert('Notice', data?.message || 'Could not load applications');
      }
    } catch (error) {
      console.error('Fetch applications error:', error);
      showAlert('Error', 'Unable to fetch your application history.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchApplications();
  }, []);

  const renderAppItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.appIdText}>App ID: #{item.App_ID}</Text>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>Submitted</Text>
        </View>
      </View>

      <Text style={styles.driveName}>{item.D_Name}</Text>
      <Text style={styles.companyName}>Company: <Text style={{ fontWeight: 'bold', color: '#212529' }}>{item.C_Name || 'N/A'}</Text></Text>
      <Text style={styles.roleText}>Role: {item.Role}</Text>

      <View style={styles.footerRow}>
        <Text style={styles.dateText}>Drive Date: {item.D_Date}</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#d1202d" />
        <Text style={styles.loadingText}>Loading Application History...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Web Dashboard Sub-Header (.dashboard-header #343a40) */}
      <View style={styles.dashboardHeader}>
        <Text style={styles.dashboardTitle}>Application History</Text>
      </View>

      <FlatList
        data={applications}
        keyExtractor={(item) => item.App_ID.toString()}
        renderItem={renderAppItem}
        contentContainerStyle={styles.listPadding}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#d1202d']} tintColor="#d1202d" />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>No Applications Found</Text>
            <Text style={styles.emptySub}>
              You have not applied for any campus drives yet. Check the Campus Drives tab to view eligible opportunities!
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  centerContainer: { flex: 1, backgroundColor: '#f8f9fa', justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#6c757d', marginTop: 12, fontSize: 14 },
  dashboardHeader: { backgroundColor: '#343a40', paddingHorizontal: 16, paddingVertical: 12, marginHorizontal: 12, marginTop: 12, borderRadius: 6 },
  dashboardTitle: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' },
  listPadding: { padding: 12 },
  card: { backgroundColor: '#ffffff', borderRadius: 10, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  appIdText: { fontSize: 12, fontWeight: 'bold', color: '#0d6efd' },
  statusBadge: { backgroundColor: 'rgba(25, 135, 84, 0.15)', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 4, borderWidth: 1, borderColor: '#198754' },
  statusText: { color: '#198754', fontSize: 11, fontWeight: 'bold' },
  driveName: { fontSize: 18, fontWeight: 'bold', color: '#212529', marginBottom: 4 },
  companyName: { fontSize: 14, color: '#495057', marginBottom: 2 },
  roleText: { fontSize: 13, color: '#6c757d' },
  footerRow: { marginTop: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#e9ecef', alignItems: 'flex-end' },
  dateText: { fontSize: 12, color: '#6c757d' },
  emptyContainer: { alignItems: 'center', padding: 40 },
  emptyIcon: { fontSize: 40, marginBottom: 10 },
  emptyTitle: { color: '#212529', fontSize: 16, fontWeight: 'bold' },
  emptySub: { color: '#6c757d', fontSize: 13, textAlign: 'center', marginTop: 6, lineHeight: 18 },
});
