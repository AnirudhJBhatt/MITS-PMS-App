import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
	StyleSheet,
	Text,
	View,
	ActivityIndicator,
	Platform,
	Image,
	Alert,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import {
	useFonts,
	Solway_400Regular,
	Solway_700Bold,
} from '@expo-google-fonts/solway';
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import { getBaseUrl } from './config';
import { removeUserToken } from './authStorage';

import LoginScreen from './screens/LoginScreen';
import DrivesScreen from './screens/DrivesScreen';
import ApplicationScreen from './screens/ApplicationScreen';
import ProfileScreen from './screens/ProfileScreen';
import SettingsScreen from './screens/SettingsScreen';
import * as Notifications from 'expo-notifications';
import { ThemeProvider, useTheme } from './ThemeContext';

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

const Tab = createBottomTabNavigator();

function TabNavigator({ onLogout }) {
	const { colors, theme } = useTheme();

	return (
		<Tab.Navigator
			screenOptions={({ route }) => ({
				headerShown: false,
				tabBarActiveTintColor: colors.primary,
				tabBarInactiveTintColor: colors.cardSubText,
				tabBarStyle: {
					backgroundColor: colors.navBar,
					borderTopColor: colors.border,
					borderTopWidth: 1,
					height: 55,
					paddingBottom: 5,
					paddingTop: 5,
				},
				tabBarLabelStyle: {
					fontSize: 11,
					fontFamily: 'Solway_400Regular',
					fontWeight: '500',
				},
				tabBarIcon: ({ focused, color }) => {
					let iconName;
					if (route.name === 'Drives') {
						iconName = focused ? 'school' : 'school-outline';
					} else if (route.name === 'Applied') {
						iconName = focused ? 'document-text' : 'document-text-outline';
					} else if (route.name === 'Profile') {
						iconName = focused ? 'person' : 'person-outline';
					} else if (route.name === 'Settings') {
						iconName = focused ? 'settings' : 'settings-outline';
					}
					return <Ionicons name={iconName} size={22} color={color} style={{ marginBottom: -2 }} />;
				},
			})}
		>
			<Tab.Screen name="Drives">
				{(props) => <DrivesScreen {...props} onLogout={onLogout} />}
			</Tab.Screen>
			<Tab.Screen name="Applied">
				{(props) => <ApplicationScreen {...props} onLogout={onLogout} />}
			</Tab.Screen>
			<Tab.Screen name="Profile">
				{(props) => <ProfileScreen {...props} onLogout={onLogout} />}
			</Tab.Screen>
			<Tab.Screen name="Settings">
				{(props) => <SettingsScreen {...props} onLogout={onLogout} />}
			</Tab.Screen>
		</Tab.Navigator>
	);
}

function MainApp() {
	const { theme, colors } = useTheme();

	const [fontsLoaded] = useFonts({
		Solway_400Regular,
		Solway_700Bold,
		'Solway': Solway_400Regular,
		'Solway-Bold': Solway_700Bold,
	});

	const [user, setUser] = useState(null);
	const [initializing, setInitializing] = useState(true);

	useEffect(() => {
		checkUserSession();
		checkAppUpdate();
	}, []);

	const checkAppUpdate = async () => {
		if (Platform.OS === 'web') return;
		try {
			const baseUrl = await getBaseUrl();
			const cleanBase = baseUrl.replace(/\/api\/?$/, '');
			const VERSION_API = `${cleanBase}/releases/version.json`;

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
								onPress: async () => {
									if (data.download_url) {
										try {
											Alert.alert("Downloading...", "The update is downloading in the background. You will be prompted to install it shortly.");
											const downloadRes = await FileSystem.downloadAsync(
												data.download_url,
												FileSystem.documentDirectory + 'update.apk'
											);
											const contentUri = await FileSystem.getContentUriAsync(downloadRes.uri);
											await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
												data: contentUri,
												flags: 1,
												type: 'application/vnd.android.package-archive',
											});
										} catch (err) {
											Alert.alert("Error", "Failed to download or install the update.");
											console.error(err);
										}
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
	};

	const handleLogout = async () => {
		try {
			await AsyncStorage.removeItem('user_session');
			await AsyncStorage.removeItem('Stud_ID');
			await removeUserToken();
		} catch (e) {
			console.error('Logout error:', e);
		}
		setUser(null);
	};

	if (initializing || !fontsLoaded) {
		return (
			<View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
				<ActivityIndicator size="large" color={colors.primary} />
				<StatusBar style={theme === 'dark' ? 'light' : 'dark'} backgroundColor={colors.background} />
			</View>
		);
	}

	// If user is not logged in, render LoginScreen
	if (!user) {
		return (
			<SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'bottom', 'left', 'right']}>
				<StatusBar style={theme === 'dark' ? 'light' : 'dark'} backgroundColor={colors.background} />
				<LoginScreen onLoginSuccess={handleLoginSuccess} />
			</SafeAreaView>
		);
	}

	const baseTheme = theme === 'dark' ? DarkTheme : DefaultTheme;
	const navTheme = {
		...baseTheme,
		dark: theme === 'dark',
		colors: {
			...baseTheme.colors,
			primary: colors.primary,
			background: colors.background,
			card: colors.card,
			text: colors.text,
			border: colors.border,
			notification: colors.primary,
		},
	};

	return (
		<SafeAreaView style={[styles.safeArea, { backgroundColor: colors.headerBackground }]} edges={['top', 'left', 'right']}>
			<StatusBar style="light" backgroundColor={colors.headerBackground} />

			{/* Web Header Matching .header-back */}
			<View style={[styles.appHeader, { backgroundColor: colors.headerBackground }]}>
				<View style={styles.headerLeft}>
					<Image
						source={require('./assets/cdc_mits_logo.png')}
						style={styles.headerLogo}
						resizeMode="contain"
					/>
					<Text style={[styles.headerTitle, { color: colors.headerText }]}>MITS PMS</Text>
				</View>
				<View style={styles.headerRight}>
					<Text style={[styles.userName, { color: colors.headerText }]}>
						{user.Stud_Name ? user.Stud_Name.toUpperCase() : user.Stud_ID}
					</Text>
				</View>
			</View>

			{/* Bottom Tab Navigation */}
			<View style={{ flex: 1, backgroundColor: colors.background }}>
				<NavigationContainer theme={navTheme}>
					<TabNavigator onLogout={handleLogout} />
				</NavigationContainer>
			</View>

			{/* App Footer matching web portal */}
			<View style={[styles.appFooter, { backgroundColor: colors.footerBackground }]}>
				<Text style={styles.footerCopyrightText}>
					Copyright © Anirudh J Bhatt, Dept of Computer Applications, MITS Kochi
				</Text>
			</View>
		</SafeAreaView>
	);
}

export default function App() {
	return (
		<SafeAreaProvider>
			<ThemeProvider>
				<MainApp />
			</ThemeProvider>
		</SafeAreaProvider>
	);
}

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: '#f8f9fa',
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
	appFooter: {
		backgroundColor: '#212529',
		paddingVertical: 7,
		paddingHorizontal: 12,
		paddingBottom: Platform.OS === 'ios' ? 14 : 7,
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
