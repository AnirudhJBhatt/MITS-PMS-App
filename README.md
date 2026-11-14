# MITS PMS — Production Readiness & Optimization Guide

A comprehensive analysis, security audit, and optimization roadmap for the **MITS Placement Management System (PMS)** mobile application and its supporting backend API.

---

## 📑 Table of Contents
1. [Overview & Tech Stack](#overview--tech-stack)
2. [Production Readiness Scorecard](#production-readiness-scorecard)
3. [🚨 Critical Security & Business Logic Vulnerabilities](#-critical-security--business-logic-vulnerabilities)
   - [3.1 Server-Side Eligibility & Deadline Enforcement in `apply-drive.php`](#31-server-side-eligibility--deadline-enforcement-in-apply-drivephp)
   - [3.2 Information Leakage (SQL Queries & DB Errors)](#32-information-leakage-sql-queries--db-errors)
   - [3.3 Hardcoded JWT Static Fallback Secret](#33-hardcoded-jwt-static-fallback-secret)
   - [3.4 Insecure Local Storage of Session Tokens](#34-insecure-local-storage-of-session-tokens)
   - [3.5 Sensitive Service Account Key Storage](#35-sensitive-service-account-key-storage)
4. [🎨 UI & UX Improvements](#-ui--ux-improvements)
   - [4.1 Migration to React Navigation (Bottom Tabs)](#41-migration-to-react-navigation-bottom-tabs)
   - [4.2 Safe Area Inset & Edge-to-Edge Collision Fixes](#42-safe-area-inset--edge-to-edge-collision-fixes)
   - [4.3 Removing Desktop-Style Fixed Footer](#43-removing-desktop-style-fixed-footer)
   - [4.4 Android Hardware Back Button Modal Handling](#44-android-hardware-back-button-modal-handling)
   - [4.5 Form Usability & Keyboard Ergonomics](#45-form-usability--keyboard-ergonomics)
5. [⚡ Performance & Configuration](#-performance--configuration)
   - [5.1 API Base URL Resolution Bug in `config.js`](#51-api-base-url-resolution-bug-in-configjs)
   - [5.2 List Virtualization & Rendering Optimization](#52-list-virtualization--rendering-optimization)
   - [5.3 Font Loading Fallbacks](#53-font-loading-fallbacks)
6. [🚀 CI/CD & Distribution Considerations](#-cicd--distribution-considerations)
   - [6.1 Google Play Store vs Self-Hosted APK Policies](#61-google-play-store-vs-self-hosted-apk-policies)
7. [✅ Prioritized Action Roadmap](#-prioritized-action-roadmap)

---

## Overview & Tech Stack

- **Mobile Frontend**: React Native 0.81 (React 19), Expo SDK 54, `@expo-google-fonts/solway`, `AsyncStorage`, Axios.
- **Backend API**: PHP 8.x, MySQL (`mysqli`), Firebase JWT (`php-jwt`), PHPMailer.
- **Notifications**: Expo Push Notification Service.
- **CI/CD**: GitHub Actions, EAS Build, EAS Update (OTA), automated VPS deployment via SCP.

---

## Production Readiness Scorecard

| Assessment Domain | Status | Score | Verdict |
| :--- | :---: | :---: | :--- |
| **Security & Authentication** | 🔴 Critical Risks | **4.0 / 10** | Needs immediate remediation before public release. |
| **UI & UX Quality** | 🟡 Needs Polish | **6.5 / 10** | Functional, but lacks native mobile navigation and safe-area polish. |
| **Performance & State Management** | 🟡 Moderate | **6.0 / 10** | Unnecessary component remounts on tab switches; unvirtualized lists. |
| **CI/CD & Deployment** | 🟢 Good | **8.0 / 10** | Automated GitHub Actions with EAS OTA & versioned APK releases. |
| **Overall Production Readiness** | ⚠️ **Not Ready** | **6.0 / 10** | Resolve security and business logic flaws before deployment. |

---

## 🚨 Critical Security & Business Logic Vulnerabilities

### 3.1 Server-Side Eligibility & Deadline Enforcement in `apply-drive.php`
- **Issue**: [api/apply-drive.php](file:///c:/xampp/htdocs/MITS-PMS/api/apply-drive.php) verifies only whether an application record already exists. It **does not verify** student eligibility criteria (CGPA cutoff, 10th/12th/UG marks, active backlogs, course/branch) nor check whether the drive deadline (`D_Date`) has passed.
- **Risk**: An ineligible student—or any student applying after a drive deadline—can send a raw HTTP POST request to `/apply-drive.php` and successfully register.
- **Remediation**:
  Enforce validation directly in `apply-drive.php` with a single atomic prepared query before inserting:
  ```php
  // Verify student eligibility & deadline
  $verify_sql = "SELECT d.D_ID 
                 FROM drive d 
                 JOIN student s ON s.Stud_ID = ? 
                 WHERE d.D_ID = ? 
                   AND d.D_Date >= NOW()
                   AND s.Marks_10th >= d.Marks_10th 
                   AND s.Marks_12th >= d.Marks_12th 
                   AND (s.Stud_Course != 'MCA' OR d.Marks_UG = 0 OR s.Marks_UG >= d.Marks_UG)
                   AND s.CGPA >= d.CGPA 
                   AND s.Stud_Backlogs <= d.Backlogs 
                   AND (s.Stud_Package IS NULL OR s.Stud_Package < 2 OR d.D_Package = 2)
                   AND JSON_CONTAINS(d.Course, JSON_QUOTE(s.Stud_Course))
                   AND JSON_CONTAINS(d.Branch, JSON_QUOTE(s.Stud_Branch))
                   AND d.Year = s.Stud_Year";
  ```

---

### 3.2 Information Leakage (SQL Queries & DB Errors)
- **Issue**: [api/student-drives.php](file:///c:/xampp/htdocs/MITS-PMS/api/student-drives.php) returns raw internal SQL queries and database error messages:
  ```php
  // Leaking raw query
  echo json_encode(["status" => "success", "data" => $drives, "query" => $query]);

  // Leaking database errors
  echo json_encode(["status" => "error", "message" => "Failed to fetch drives: " . mysqli_error($con)]);
  ```
- **Risk**: Exposing database queries, table structures, and syntax errors helps attackers map the schema and craft injection exploits.
- **Remediation**:
  - Remove `"query" => $query` from all API responses.
  - Log errors internally using `error_log()` instead of passing `mysqli_error()` to client responses.

---

### 3.3 Hardcoded JWT Static Fallback Secret
- **Issue**: [api/api-auth.php](file:///c:/xampp/htdocs/MITS-PMS/api/api-auth.php), [api/student-login.php](file:///c:/xampp/htdocs/MITS-PMS/api/student-login.php), and [api/send-drive-emails.php](file:///c:/xampp/htdocs/MITS-PMS/api/send-drive-emails.php) contain a static fallback:
  ```php
  if (empty($JWT_SECRET)) {
      $JWT_SECRET = 'MITS-PMS-SECURE-STATIC-KEY-FALLBACK-32B';
  }
  ```
- **Risk**: If `.env` is absent or unreadable on the server, authentication degrades to a publicly known static key, allowing anyone to forge tokens for any student ID.
- **Remediation**: Remove the static fallback and return a `500 Internal Server Error` if `JWT_SECRET` is unset.

---

### 3.4 Insecure Local Storage of Session Tokens
- **Issue**: [screens/LoginScreen.js](file:///c:/xampp/htdocs/MITS-PMS/MITS-PMS-App/screens/LoginScreen.js) saves `userToken` in `@react-native-async-storage/async-storage`.
- **Risk**: `AsyncStorage` is unencrypted and vulnerable on rooted/jailbroken devices or via backup extraction.
- **Remediation**: Use `expo-secure-store` for cryptographic storage of the JWT:
  ```bash
  npx expo install expo-secure-store
  ```
  ```javascript
  import * as SecureStore from 'expo-secure-store';

  await SecureStore.setItemAsync('userToken', data.token);
  const token = await SecureStore.getItemAsync('userToken');
  ```

---

### 3.5 Sensitive Service Account Key Storage
- **Issue**: `mits-pms-firebase-adminsdk-fbsvc-f29cb82645.json` is located in the root of the mobile frontend repository.
- **Remediation**: Remove this private service account file from the mobile codebase entirely and keep it only on the secure backend server.

---

## 🎨 UI & UX Improvements

### 4.1 Migration to React Navigation (Bottom Tabs)
- **Current Issue**: [App.js](file:///c:/xampp/htdocs/MITS-PMS/MITS-PMS-App/App.js) switches tabs via conditional rendering (`activeTab === 'drives' && <DrivesScreen />`). Every tab change completely destroys and re-mounts the screen component, wiping search queries, scroll position, and triggering duplicate network requests.
- **Solution**: Install `@react-navigation/bottom-tabs` and wrap screens in `createBottomTabNavigator`:
  ```bash
  npm install @react-navigation/bottom-tabs
  ```
  This preserves screen state, enables smooth tab transitions, and integrates with the Android system back button.

---

### 4.2 Safe Area Inset & Edge-to-Edge Collision Fixes
- **Current Issue**: [app.json](file:///c:/xampp/htdocs/MITS-PMS/MITS-PMS-App/app.json) has `"edgeToEdgeEnabled": true`, but [App.js](file:///c:/xampp/htdocs/MITS-PMS/MITS-PMS-App/App.js) manually applies `paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0`. On Android 14/15, this can produce double-padding. Additionally, bottom navigation lacks bottom inset handling.
- **Solution**: Utilize `useSafeAreaInsets` from `react-native-safe-area-context`:
  ```javascript
  import { useSafeAreaInsets } from 'react-native-safe-area-context';

  const insets = useSafeAreaInsets();
  // Apply insets.bottom to the bottom navigation bar container
  ```

---

### 4.3 Removing Desktop-Style Fixed Footer
- **Current Issue**: A desktop-style footer displaying copyright text is pinned below the bottom navigation bar on all screens.
- **Solution**: Remove the footer bar from `App.js` and move copyright, version, and developer attribution to [screens/SettingsScreen.js](file:///c:/xampp/htdocs/MITS-PMS/MITS-PMS-App/screens/SettingsScreen.js).

---

### 4.4 Android Hardware Back Button Modal Handling
- **Current Issue**: In [screens/DrivesScreen.js](file:///c:/xampp/htdocs/MITS-PMS/MITS-PMS-App/screens/DrivesScreen.js) and [screens/LoginScreen.js](file:///c:/xampp/htdocs/MITS-PMS/MITS-PMS-App/screens/LoginScreen.js), `<Modal>` components lack `onRequestClose`. Tapping the back button causes the whole application to exit instead of closing the modal.
- **Solution**:
  ```jsx
  <Modal
    visible={selectedDrive !== null}
    animationType="slide"
    transparent={true}
    onRequestClose={() => setSelectedDrive(null)}
  >
  ```

---

### 4.5 Form Usability & Keyboard Ergonomics
- In [screens/LoginScreen.js](file:///c:/xampp/htdocs/MITS-PMS/MITS-PMS-App/screens/LoginScreen.js):
  - Add `returnKeyType="next"` to Username and focus Password automatically.
  - Add `returnKeyType="go"` and `onSubmitEditing={handleLogin}` to Password so tapping "Enter" initiates login.
  - Add `autoCorrect={false}` to avoid intrusive autocorrections on student roll numbers.

---

## ⚡ Performance & Configuration

### 5.1 API Base URL Resolution Bug in `config.js`
- **Issue**: In [config.js](file:///c:/xampp/htdocs/MITS-PMS/MITS-PMS-App/config.js), `getBaseUrl()` returns `process.env.EXPO_PUBLIC_API_URL` immediately if present:
  ```javascript
  export const getBaseUrl = async () => {
    if (process.env.EXPO_PUBLIC_API_URL) {
      return process.env.EXPO_PUBLIC_API_URL.trim().replace(/\/+$/, '');
    }
    // Saved AsyncStorage URL is never reached!
  };
  ```
- **Remediation**: Check `AsyncStorage.getItem('API_BASE_URL')` first, and use `EXPO_PUBLIC_API_URL` as the fallback default.

---

### 5.2 List Virtualization & Rendering Optimization
- In [screens/DrivesScreen.js](file:///c:/xampp/htdocs/MITS-PMS/MITS-PMS-App/screens/DrivesScreen.js) and [screens/ApplicationScreen.js](file:///c:/xampp/htdocs/MITS-PMS/MITS-PMS-App/screens/ApplicationScreen.js):
  - Add `initialNumToRender={10}`
  - Add `maxToRenderPerBatch={10}`
  - Add `windowSize={5}`
  - Add `removeClippedSubviews={Platform.OS === 'android'}`
  This ensures optimal memory usage and eliminates frame drops when rendering large lists of drives.

---

### 5.3 Font Loading Fallbacks
- In [App.js](file:///c:/xampp/htdocs/MITS-PMS/MITS-PMS-App/App.js), if custom fonts fail to load or take long, the app displays an indefinite loading spinner. Include a timeout fallback or default system font fallbacks (`serif`, `Roboto`, `sans-serif`) to ensure UI renders even if font loading is delayed.

---

## 🚀 CI/CD & Distribution Considerations

### 6.1 Google Play Store vs Self-Hosted APK Policies
- The project currently includes `REQUEST_INSTALL_PACKAGES` permission in `app.json` and implements an in-app APK downloader in `App.js`.
  - **Self-Hosted Distribution (Campus Website/VPS)**: Works well, but verify that users are prompted with guidance if "Install Unknown Apps" permission is denied on Android 8+.
  - **Google Play Store Distribution**: Google Play policies **strictly forbid** downloading APKs outside the store. If publishing to Google Play, remove `REQUEST_INSTALL_PACKAGES`, rely on Google Play In-App Updates, and submit `.aab` bundles rather than `.apk`.

---

## ✅ Prioritized Action Roadmap

```
[Phase 1: High-Priority Security Fixes] - COMPLETED ✅
├── [x] 1. Move eligibility and deadline checks into api/apply-drive.php
├── [x] 2. Remove "query" and mysqli_error() from api/student-drives.php
├── [x] 3. Remove hardcoded fallback JWT secret; fail on missing env
└── [x] 4. Migrate userToken storage to expo-secure-store

[Phase 2: UI & Navigation Refactoring] - COMPLETED ✅
├── [x] 1. Replace conditional tab rendering with @react-navigation/bottom-tabs
├── [x] 2. Remove pinned app footer from App.js; relocate to SettingsScreen.js
├── [x] 3. Add onRequestClose to all Modals
└── [x] 4. Add onSubmitEditing and returnKeyType to login inputs

[Phase 3: Production Hardening] - COMPLETED ✅
├── [x] 1. Correct getBaseUrl priority order in config.js
├── [x] 2. Add performance props to all FlatList components
└── [x] 3. Implement safe area insets on edge-to-edge screens
```
