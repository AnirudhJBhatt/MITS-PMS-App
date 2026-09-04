import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  RefreshControl,
  TextInput,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { getBaseUrl, API_ENDPOINTS } from '../config';
import { useTheme } from '../ThemeContext';

const PACKAGE_LABELS = { '0': 'Low Package', '1': 'Medium Package', '2': 'High Package' };

const showAlert = (title, message) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
};

export default function DrivesScreen() {
  const { theme, colors } = useTheme();

  const [drives, setDrives] = useState([]);
  const [filteredDrives, setFilteredDrives] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [selectedDrive, setSelectedDrive] = useState(null);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    registerForPushNotificationsAsync();
    fetchDrives(true);

    // Poll for new drives in the background every 30 seconds
    const interval = setInterval(() => {
      fetchDrives(false);
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const registerForPushNotificationsAsync = async () => {
    if (Platform.OS === 'web') return;
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        console.log('Failed to get notification permission for local notification!');
      }
    } catch (e) {
      console.error('Error requesting notification permissions:', e);
    }
  };

  const checkForNewDrives = async (fetchedDrives) => {
    if (Platform.OS === 'web') return;
    try {
      const cachedIdsString = await AsyncStorage.getItem('seen_drive_ids');
      const fetchedIds = fetchedDrives.map(d => d.D_ID.toString());

      if (cachedIdsString !== null) {
        const cachedIds = JSON.parse(cachedIdsString);

        // Find drives that are in fetchedIds but not in cachedIds
        const newDrives = fetchedDrives.filter(d => !cachedIds.includes(d.D_ID.toString()));

        if (newDrives.length > 0) {
          for (const drive of newDrives) {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: 'New Campus Drive Available! 🎓',
                body: `${drive.C_Name || 'A new company'} is recruiting for ${drive.Role || 'a role'}.`,
                data: { driveId: drive.D_ID },
              },
              trigger: null, // show immediately
            });
          }
        }
      }

      // Update cached IDs with the latest fetched list
      await AsyncStorage.setItem('seen_drive_ids', JSON.stringify(fetchedIds));
    } catch (error) {
      console.error('Error checking for new drives:', error);
    }
  };

  const fetchDrives = async (showError = true) => {
    try {
      const studId = await AsyncStorage.getItem('Stud_ID');
      if (!studId) return;

      const baseUrl = await getBaseUrl();
      const response = await axios.get(`${baseUrl}${API_ENDPOINTS.DRIVES}?Stud_ID=${studId}`);

      let data = response.data;

      if (typeof data === 'string') {
        try { data = JSON.parse(data); } catch (e) { }
      }

      if (data && data.status === 'success') {
        const fetchedDrives = data.data || [];
        await checkForNewDrives(fetchedDrives);
        setDrives(fetchedDrives);
        filterDrives(fetchedDrives, searchQuery);
      } else {
        if (showError) {
          showAlert('Notice', data?.message || 'Could not fetch drives');
        }
      }
    } catch (error) {
      console.error('Fetch drives error:', error);
      if (showError) {
        showAlert('Error', 'Unable to load campus drives. Please check connection.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDrives(true);
  }, []);

  const handleSearch = (text) => {
    setSearchQuery(text);
    filterDrives(drives, text);
  };

  const filterDrives = (data, query) => {
    if (!query.trim()) {
      setFilteredDrives(data);
      return;
    }
    const q = query.toLowerCase();
    const filtered = data.filter(
      (item) =>
        item.D_Name.toLowerCase().includes(q) ||
        (item.C_Name && item.C_Name.toLowerCase().includes(q)) ||
        item.Role.toLowerCase().includes(q)
    );
    setFilteredDrives(filtered);
  };

  const handleApply = async (drive) => {
    try {
      setApplying(true);
      const studId = await AsyncStorage.getItem('Stud_ID');
      const baseUrl = await getBaseUrl();

      const response = await axios.post(`${baseUrl}${API_ENDPOINTS.APPLY}`, {
        Stud_ID: studId,
        D_ID: drive.D_ID,
      });

      let data = response.data;
      if (typeof data === 'string') {
        try { data = JSON.parse(data); } catch (e) { }
      }

      if (data && data.status === 'success') {
        showAlert('Application Submitted! ', `You have successfully applied for ${drive.D_Name}.`);
        setSelectedDrive(null);
        fetchDrives();
      } else {
        showAlert('Application Status', data?.message || 'Could not process application');
      }
    } catch (error) {
      console.error('Apply drive error:', error);
      showAlert('Error', 'Network error while submitting application.');
    } finally {
      setApplying(false);
    }
  };

  const appliedCount = drives.filter((d) => d.isApplied).length;

  const renderDriveItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      activeOpacity={0.85}
      onPress={() => setSelectedDrive(item)}
    >
      <View style={styles.cardHeader}>
        <View style={styles.companyBadge}>
          <Text style={styles.companyBadgeText}>{item.C_Name || 'Company'}</Text>
        </View>
        <View style={[
          styles.statusBadge, 
          item.isApplied ? styles.appliedBadge : (Number(item.isEligible) ? styles.eligibleBadge : styles.ineligibleBadge)
        ]}>
          <Text style={[
            styles.statusText, 
            item.isApplied ? styles.appliedText : (Number(item.isEligible) ? styles.eligibleText : styles.ineligibleText)
          ]}>
            {item.isApplied ? 'Applied' : (Number(item.isEligible) ? 'Eligible' : 'Ineligible')}
          </Text>
        </View>
      </View>

      <Text style={[styles.driveTitle, { color: colors.text }]}>{item.D_Name}</Text>
      <Text style={[styles.driveRole, { color: colors.textSub }]}>Role: <Text style={{ fontWeight: '600', color: colors.text }}>{item.Role}</Text></Text>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <View style={styles.detailsRow}>
        <Text style={[styles.detailText, { color: colors.cardSubText }]}>Min CGPA: <Text style={[styles.detailHighlight, { color: colors.text }]}>{item.CGPA}</Text></Text>
        <Text style={[styles.detailText, { color: colors.cardSubText }]}>Deadline: <Text style={[styles.dateHighlight, { color: colors.primary }]}>{item.D_Date}</Text></Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSub }]}>Loading Campus Drives...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Web Dashboard Sub-Header */}
      <View style={[styles.dashboardHeader, { backgroundColor: colors.headerBackground }]}>
        <Text style={[styles.dashboardTitle, { color: colors.headerText }]}>Campus Drives</Text>
      </View>

      {/* Stat Bar */}
      <View style={[styles.statsContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{drives.length}</Text>
          <Text style={[styles.statLabel, { color: colors.cardSubText }]}>Eligible Drives</Text>
        </View>
        <View style={[styles.statBox, styles.borderLeft, { borderLeftColor: colors.border }]}>
          <Text style={[styles.statNumber, { color: colors.success }]}>{appliedCount}</Text>
          <Text style={[styles.statLabel, { color: colors.cardSubText }]}>Applied Drives</Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchBar}>
        <TextInput
          style={[styles.searchInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
          placeholder="Search by drive, company or role..."
          placeholderTextColor={colors.cardSubText}
          value={searchQuery}
          onChangeText={handleSearch}
        />
      </View>

      {/* Drive List */}
      <FlatList
        data={filteredDrives}
        keyExtractor={(item) => item.D_ID.toString()}
        renderItem={renderDriveItem}
        contentContainerStyle={styles.listPadding}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🎓</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Campus Drives Found</Text>
            <Text style={[styles.emptySub, { color: colors.textSub }]}>
              {searchQuery ? 'No drives match your search.' : 'Check back later for new placement opportunities.'}
            </Text>
          </View>
        }
      />

      {/* Drive Details Modal */}
      {selectedDrive && (
        <Modal visible={true} animationType="slide" transparent={true}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <ScrollView>
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalCompany, { color: colors.primary }]}>{selectedDrive.C_Name}</Text>
                  <TouchableOpacity onPress={() => setSelectedDrive(null)}>
                    <Text style={[styles.closeBtn, { color: colors.textSub }]}>✕</Text>
                  </TouchableOpacity>
                </View>

                <Text style={[styles.modalDriveTitle, { color: colors.text }]}>{selectedDrive.D_Name}</Text>
                <Text style={[styles.modalRole, { color: colors.textSub }]}>Role: {selectedDrive.Role}</Text>

                <View style={[styles.modalDivider, { backgroundColor: colors.border }]} />

                <Text style={[styles.sectionHeader, { color: colors.text }]}>Eligibility Requirements</Text>

                <View style={styles.criteriaGrid}>
                  <View style={[styles.criteriaItem, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                    <Text style={[styles.criteriaLabel, { color: colors.textSub }]}>10th Marks</Text>
                    <Text style={[styles.criteriaVal, { color: colors.text }]}>{selectedDrive.Marks_10th}%</Text>
                  </View>
                  <View style={[styles.criteriaItem, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                    <Text style={[styles.criteriaLabel, { color: colors.textSub }]}>12th Marks</Text>
                    <Text style={[styles.criteriaVal, { color: colors.text }]}>{selectedDrive.Marks_12th}%</Text>
                  </View>
                  <View style={[styles.criteriaItem, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                    <Text style={[styles.criteriaLabel, { color: colors.textSub }]}>UG Marks</Text>
                    <Text style={[styles.criteriaVal, { color: colors.text }]}>{selectedDrive.Marks_UG}%</Text>
                  </View>
                  <View style={[styles.criteriaItem, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                    <Text style={[styles.criteriaLabel, { color: colors.textSub }]}>Min CGPA</Text>
                    <Text style={[styles.criteriaVal, { color: colors.text }]}>{selectedDrive.CGPA}</Text>
                  </View>
                  <View style={[styles.criteriaItem, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                    <Text style={[styles.criteriaLabel, { color: colors.textSub }]}>Max Backlogs</Text>
                    <Text style={[styles.criteriaVal, { color: colors.text }]}>{selectedDrive.Backlogs}</Text>
                  </View>
                  <View style={[styles.criteriaItem, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                    <Text style={[styles.criteriaLabel, { color: colors.textSub }]}>Package Tier</Text>
                    <Text style={[styles.criteriaVal, { color: colors.text }]}>{PACKAGE_LABELS[selectedDrive.D_Package] || 'Standard'}</Text>
                  </View>
                </View>

                <View style={[styles.deadlineBox, { borderColor: colors.primary, backgroundColor: theme === 'dark' ? 'rgba(239,68,68,0.1)' : 'rgba(209, 32, 45, 0.08)' }]}>
                  <Text style={[styles.deadlineTitle, { color: colors.primary }]}>Last Date to Apply</Text>
                  <Text style={[styles.deadlineVal, { color: colors.primary }]}>{selectedDrive.D_Date}</Text>
                </View>

                {/* Apply Button */}
                {selectedDrive.isApplied ? (
                  <View style={[styles.appliedBanner, { backgroundColor: theme === 'dark' ? 'rgba(34,197,94,0.15)' : 'rgba(25, 135, 84, 0.15)', borderColor: colors.success }]}>
                    <Text style={[styles.appliedBannerText, { color: colors.success }]}>✓ Application Submitted</Text>
                  </View>
                ) : !Number(selectedDrive.isEligible) ? (
                  <View style={[styles.appliedBanner, { backgroundColor: 'rgba(255, 193, 7, 0.15)', borderColor: '#ffc107' }]}>
                    <Text style={[styles.appliedBannerText, { color: '#b38600' }]}>⚠ Not Eligible</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.applyActionBtn, { backgroundColor: colors.success }, applying && styles.btnDisabled]}
                    onPress={() => handleApply(selectedDrive)}
                    disabled={applying}
                  >
                    {applying ? (
                      <ActivityIndicator color="#ffffff" />
                    ) : (
                      <Text style={styles.applyActionText}>APPLY NOW</Text>
                    )}
                  </TouchableOpacity>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  centerContainer: { flex: 1, backgroundColor: '#f8f9fa', justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#6c757d', marginTop: 12, fontSize: 14 },
  dashboardHeader: { backgroundColor: '#343a40', paddingHorizontal: 16, paddingVertical: 12, marginHorizontal: 12, marginTop: 12, borderRadius: 6 },
  dashboardTitle: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' },
  statsContainer: { flexDirection: 'row', backgroundColor: '#ffffff', marginHorizontal: 12, marginTop: 10, marginBottom: 8, borderRadius: 8, padding: 14, borderWidth: 1, borderColor: '#e2e8f0', elevation: 2 },
  statBox: { flex: 1, alignItems: 'center' },
  borderLeft: { borderLeftWidth: 1, borderLeftColor: '#e2e8f0' },
  statNumber: { fontSize: 22, fontWeight: 'bold', color: '#0d6efd' },
  statLabel: { fontSize: 12, color: '#6c757d', marginTop: 2 },
  searchBar: { paddingHorizontal: 12, marginBottom: 8 },
  searchInput: { backgroundColor: '#ffffff', color: '#212529', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, borderWidth: 1, borderColor: '#cbd5e1' },
  listPadding: { paddingHorizontal: 12, paddingBottom: 20 },
  card: { backgroundColor: '#ffffff', borderRadius: 10, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  companyBadge: { backgroundColor: '#343a40', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 4 },
  companyBadgeText: { color: '#ffffff', fontWeight: 'bold', fontSize: 12 },
  statusBadge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 4 },
  appliedBadge: { backgroundColor: 'rgba(25, 135, 84, 0.15)', borderWidth: 1, borderColor: '#198754' },
  eligibleBadge: { backgroundColor: 'rgba(13, 110, 253, 0.15)', borderWidth: 1, borderColor: '#0d6efd' },
  ineligibleBadge: { backgroundColor: 'rgba(255, 193, 7, 0.15)', borderWidth: 1, borderColor: '#ffc107' },
  statusText: { fontSize: 11, fontWeight: 'bold' },
  appliedText: { color: '#198754' },
  eligibleText: { color: '#0d6efd' },
  ineligibleText: { color: '#b38600' },
  driveTitle: { fontSize: 18, fontWeight: 'bold', color: '#212529', marginBottom: 4 },
  driveRole: { fontSize: 14, color: '#495057' },
  divider: { height: 1, backgroundColor: '#e9ecef', marginVertical: 12 },
  detailsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  detailText: { fontSize: 12, color: '#6c757d' },
  detailHighlight: { color: '#212529', fontWeight: 'bold' },
  dateHighlight: { color: '#d1202d', fontWeight: 'bold' },
  emptyContainer: { alignItems: 'center', padding: 40 },
  emptyIcon: { fontSize: 40, marginBottom: 10 },
  emptyTitle: { color: '#212529', fontSize: 16, fontWeight: 'bold' },
  emptySub: { color: '#6c757d', fontSize: 13, textAlign: 'center', marginTop: 6 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 16 },
  modalCard: { backgroundColor: '#ffffff', borderRadius: 12, padding: 20, borderWidth: 1, borderColor: '#e2e8f0', maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalCompany: { color: '#d1202d', fontWeight: 'bold', fontSize: 14, textTransform: 'uppercase' },
  closeBtn: { color: '#6c757d', fontSize: 20, fontWeight: 'bold', padding: 4 },
  modalDriveTitle: { color: '#212529', fontSize: 20, fontWeight: 'bold', marginTop: 4 },
  modalRole: { color: '#495057', fontSize: 15, marginTop: 2 },
  modalDivider: { height: 1, backgroundColor: '#e9ecef', marginVertical: 14 },
  sectionHeader: { color: '#212529', fontSize: 14, fontWeight: 'bold', marginBottom: 12 },
  criteriaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  criteriaItem: { width: '30%', backgroundColor: '#f8f9fa', borderRadius: 6, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#e9ecef' },
  criteriaLabel: { color: '#6c757d', fontSize: 10, fontWeight: '600', marginBottom: 2 },
  criteriaVal: { color: '#212529', fontSize: 13, fontWeight: 'bold' },
  deadlineBox: { backgroundColor: 'rgba(209, 32, 45, 0.08)', borderWidth: 1, borderColor: '#d1202d', borderRadius: 8, padding: 12, alignItems: 'center', marginBottom: 20 },
  deadlineTitle: { color: '#d1202d', fontSize: 12, fontWeight: '600' },
  deadlineVal: { color: '#d1202d', fontSize: 16, fontWeight: 'bold', marginTop: 2 },
  applyActionBtn: { backgroundColor: '#198754', paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  btnDisabled: { opacity: 0.6 },
  applyActionText: { color: '#ffffff', fontWeight: 'bold', fontSize: 16, letterSpacing: 0.5 },
  appliedBanner: { backgroundColor: 'rgba(25, 135, 84, 0.15)', borderWidth: 1, borderColor: '#198754', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  appliedBannerText: { color: '#198754', fontWeight: 'bold', fontSize: 15 },
});
