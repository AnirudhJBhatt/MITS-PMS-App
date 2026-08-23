import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
	StyleSheet,
	Text,
	View,
	TouchableOpacity,
	ActivityIndicator,
	Platform,
	Image,
	StatusBar as RNStatusBar,
	Alert,
	Linking,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import {
	useFonts,
	Solway_400Regular,
	Solway_700Bold,
} from '@expo-google-fonts/solway';
import Constants from 'expo-constants';
import { getBaseUrl } from './config';

import LoginScreen from './screens/LoginScreen';
import DrivesScreen from './screens/DrivesScreen';
import ApplicationScreen from './screens/ApplicationScreen';
import ProfileScreen from './screens/ProfileScreen';
import SettingsScreen from './screens/SettingsScreen';
import * as Notifications from 'expo-notifications';

// Configure notification behavior for when the app is in the foreground
Notifications.setNotificationHandler({
	handleNotification: async () => ({
		shouldShowAlert: true,
		shouldPlaySound: true,
		shouldSetBadge: false,
	}),
});

// Inject global web font stylesheet if on Web
if (Platform.OS === 'web' && typeof document !== 'undefined') {
	if (!document.getElementById('solway-font-style')) {
		const fontStyle = document.createElement('style');
		fontStyle.id = 'solway-font-style';
		fontStyle.type = 'text/css';
		fontStyle.appendChild(document.createTextNode(`
			@import url('https://fonts.googleapis.com/css2?family=Solway:wght@400;700&display=swap');
			body, p, input, button, textarea, select {
				font-family: 'Solway', serif;
			}
		`));
		document.head.appendChild(fontStyle);
	}
}

export default function App() {
	const [fontsLoaded] = useFonts({
		Solway_400Regular,
		Solway_700Bold,
		'Solway': Solway_400Regular,
		'Solway-Bold': Solway_700Bold,
	});

	const [user, setUser] = useState(null);
	const [initializing, setInitializing] = useState(true);
	const [activeTab, setActiveTab] = useState('drives');

	useEffect(() => {
		checkUserSession();
		checkAppUpdate();
	}, []);

	const checkAppUpdate = async () => {
		if (Platform.OS === 'web') return;
		try {
			const baseUrl = await getBaseUrl();
			const cleanBase = baseUrl.replace(/\/api\/?$/, '');
			const VERSION_API = `${cleanBase}/version.json`;

			const response = await fetch(VERSION_API);
			const data = await response.json();

			if (data && data.version) {
				const latestVersion = data.version;
				const currentVersion = Constants.expoConfig?.version || Constants.manifest?.version;

				if (latestVersion && currentVersion && latestVersion !== currentVersion) {
					Alert.alert(
						"New Version Available",
						"A new native update is available. Please download and install the latest APK to keep using the application.",
						[
							{ text: "Later", style: "cancel" },
							{
								text: "Download APK",
								onPress: () => {
									if (data.download_url) {
										Linking.openURL(data.download_url);
									}
								}
							}
						]
					);
				}
			}
		} catch (error) {
			console.warn("Failed to check for native update:", error);
		}
	};

	const checkUserSession = async () => {
		try {
			const session = await AsyncStorage.getItem('user_session');
			if (session) {
				setUser(JSON.parse(session));
			}
		} catch (e) {
			console.error('Failed to load session:', e);
		} finally {
			setInitializing(false);
		}
	};

	const handleLoginSuccess = (userData) => {
		setUser(userData);
		setActiveTab('drives');
	};

	const handleLogout = () => {
		setUser(null);
		setActiveTab('drives');
	};

	if (initializing || !fontsLoaded) {
		return (
			<View style={styles.centerContainer}>
				<ActivityIndicator size="large" color="#d1202d" />
				<StatusBar style="light" backgroundColor="#d1202d" />
			</View>
		);
	}

	// If user is not logged in, render LoginScreen
	if (!user) {
		return (
			<SafeAreaView style={styles.safeArea}>
				<StatusBar style="light" backgroundColor="#d1202d" />
				<LoginScreen onLoginSuccess={handleLoginSuccess} />
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={styles.safeArea}>
			<StatusBar style="light" backgroundColor="#d1202d" />

			{/* Web Header Matching .header-back (#d1202d) */}
			<View style={styles.appHeader}>
				<View style={styles.headerLeft}>
					<Image
						source={require('./assets/cdc_mits_logo.png')}
						style={styles.headerLogo}
						resizeMode="contain"
					/>
					<Text style={styles.headerTitle}>MITS PMS</Text>
				</View>
				<View style={styles.headerRight}>
					<Text style={styles.userName}>{user.Stud_Name.toUpperCase() || user.Stud_ID}</Text>
				</View>
			</View>

			{/* Screen Content */}
			<View style={styles.screenContent}>
				{activeTab === 'drives' && <DrivesScreen />}
				{activeTab === 'applications' && <ApplicationScreen />}
				{activeTab === 'profile' && <ProfileScreen />}
				{activeTab === 'settings' && <SettingsScreen onLogout={handleLogout} />}
			</View>

			{/* Bottom Navigation Bar */}
			<View style={styles.navBar}>
				<TouchableOpacity
					style={[styles.navItem, activeTab === 'drives' && styles.navItemActive]}
					onPress={() => setActiveTab('drives')}
				>
					<Ionicons
						name={activeTab === 'drives' ? 'school' : 'school-outline'}
						size={22}
						color={activeTab === 'drives' ? '#d1202d' : '#64748b'}
						style={{ marginBottom: 2 }}
					/>
					<Text style={[styles.navLabel, activeTab === 'drives' && styles.navLabelActive]}>
						Drives
					</Text>
				</TouchableOpacity>

				<TouchableOpacity
					style={[styles.navItem, activeTab === 'applications' && styles.navItemActive]}
					onPress={() => setActiveTab('applications')}
				>
					<Ionicons
						name={activeTab === 'applications' ? 'document-text' : 'document-text-outline'}
						size={22}
						color={activeTab === 'applications' ? '#d1202d' : '#64748b'}
						style={{ marginBottom: 2 }}
					/>
					<Text style={[styles.navLabel, activeTab === 'applications' && styles.navLabelActive]}>
						Applied
					</Text>
				</TouchableOpacity>

				<TouchableOpacity
					style={[styles.navItem, activeTab === 'profile' && styles.navItemActive]}
					onPress={() => setActiveTab('profile')}
				>
					<Ionicons
						name={activeTab === 'profile' ? 'person' : 'person-outline'}
						size={22}
						color={activeTab === 'profile' ? '#d1202d' : '#64748b'}
						style={{ marginBottom: 2 }}
					/>
					<Text style={[styles.navLabel, activeTab === 'profile' && styles.navLabelActive]}>
						Profile
					</Text>
				</TouchableOpacity>

				<TouchableOpacity
					style={[styles.navItem, activeTab === 'settings' && styles.navItemActive]}
					onPress={() => setActiveTab('settings')}
				>
					<Ionicons
						name={activeTab === 'settings' ? 'settings' : 'settings-outline'}
						size={22}
						color={activeTab === 'settings' ? '#d1202d' : '#64748b'}
						style={{ marginBottom: 2 }}
					/>
					<Text style={[styles.navLabel, activeTab === 'settings' && styles.navLabelActive]}>
						Settings
					</Text>
				</TouchableOpacity>
			</View>

			{/* App Footer matching web portal */}
			<View style={styles.appFooter}>
				<Text style={styles.footerCopyrightText}>
					Copyright © Anirudh J Bhatt, Dept of Computer Applications, MITS Kochi
				</Text>
			</View>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: '#f8f9fa',
		paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight || 0 : 0,
	},
	centerContainer: {
		flex: 1,
		backgroundColor: '#f8f9fa',
		justifyContent: 'center',
		alignItems: 'center',
	},
	appHeader: {
		backgroundColor: '#d1202d',
		paddingHorizontal: 16,
		paddingVertical: 14,
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		elevation: 4,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.15,
		shadowRadius: 4,
	},
	headerLeft: { flexDirection: 'row', alignItems: 'center' },
	headerLogo: { width: 45, height: 45, marginRight: 10, borderRadius: 50, backgroundColor: '#ffffff' },
	headerTitle: { color: '#ffffff', fontSize: 20, fontWeight: 'bold', letterSpacing: 0.5, fontFamily: 'Solway_700Bold' },
	headerSubtitle: { color: 'rgba(255, 255, 255, 0.85)', fontSize: 12, marginTop: 2, fontFamily: 'Solway_400Regular' },
	headerRight: { justifyContent: 'center', alignItems: 'flex-end' },
	userName: { color: '#ffffff', fontWeight: 'bold', fontSize: 14, fontFamily: 'Solway_700Bold' },
	screenContent: { flex: 1, backgroundColor: '#f8f9fa' },
	navBar: {
		flexDirection: 'row',
		backgroundColor: '#ffffff',
		borderTopWidth: 1,
		borderTopColor: '#e2e8f0',
		paddingVertical: 8,
		paddingHorizontal: 8,
		elevation: 8,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: -2 },
		shadowOpacity: 0.05,
		shadowRadius: 3,
	},
	navItem: {
		flex: 1,
		alignItems: 'center',
		paddingVertical: 6,
		borderRadius: 10,
	},
	navItemActive: {
		backgroundColor: 'rgba(209, 32, 45, 0.08)',
	},
	navIcon: { fontSize: 18, marginBottom: 2 },
	navLabel: { fontSize: 11, color: '#64748b', fontWeight: '600', fontFamily: 'Solway_400Regular' },
	navLabelActive: { color: '#d1202d', fontWeight: 'bold', fontFamily: 'Solway_700Bold' },
	appFooter: {
		backgroundColor: '#212529',
		paddingVertical: 8,
		paddingHorizontal: 12,
		alignItems: 'center',
		justifyContent: 'center',
	},
	footerCopyrightText: {
		color: '#94a3b8',
		fontSize: 11,
		textAlign: 'center',
		fontFamily: 'Solway_400Regular',
	},
});
