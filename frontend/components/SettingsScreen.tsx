import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Image,
  Switch,
  StyleSheet,
  ScrollView,
  Modal,
  Dimensions,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { auth, db } from "@/firebaseConfig";
import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";
import { updateProfile, updatePassword, reauthenticateWithCredential, EmailAuthProvider, signOut } from "firebase/auth";
import { deleteUser } from "firebase/auth";
import InfinityLoader from "@/components/ui/InfinityLoader";
import ModernAlert, { ModernAlertProps } from "@/components/ui/ModernAlert";





const SettingsScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // Set active tab based on navigation parameters, default to "account"
  const [activeTab, setActiveTab] = useState<string>(
    (params.tab as string) || "account",
  );

  const [darkMode, setDarkMode] = useState<boolean>(false);

  // Theme Object (Moved to top for stability)
  const theme = {
    bg: darkMode ? "#0F172A" : "#F5F8F9",
    card: darkMode ? "#1E293B" : "white",
    text: darkMode ? "#F8FAFC" : "#1F2937",
    subText: darkMode ? "#94A3B8" : "#6B7280",
    border: darkMode ? "#334155" : "#F3F4F6",
    input: darkMode ? "#334155" : "white",
    inputBg: darkMode ? "#0F172A" : "#F9FAFB",
    header: ["#031d1e", "#063537", "#0D5A5B", "#1E7C7E"] as const,
  };

  const [selectedLanguage, setSelectedLanguage] = useState("English (US)");

  // Simple Translation Mapping
  const t = (key: string) => {
    const translations: any = {
      "English (US)": {
        settings: "Settings",
        appearance: "Appearance",
        darkMode: "Dark Mode",
        language: "Language",
        currency: "Currency",
        support: "Support",
        save: "Save Changes",
        account: "Account",
        privacy: "Privacy",
        notifications: "Notifications",
        payment: "Payment",
        help: "Help & Support"
      },
      "Urdu": {
        settings: "ترتیبات",
        appearance: "ظاہری شکل",
        darkMode: "ڈارک موڈ",
        language: "زبان",
        currency: "کرنسی",
        support: "سپورٹ",
        save: "تبدیلیاں محفوظ کریں",
        account: "اکاؤنٹ",
        privacy: "رازداری",
        notifications: "اطلاعات",
        payment: "ادائیگی",
        help: "مدد اور سپورٹ"
      },
      "Arabic": {
        settings: "الإعدادات",
        appearance: "المظهر",
        darkMode: "الوضع الداكن",
        language: "اللغة",
        currency: "العملة",
        support: "الدعم",
        save: "حفظ التغييرات",
        account: "الحساب",
        privacy: "الخصوصية",
        notifications: "الإشعارات",
        payment: "الدفع",
        help: "المساعدة والدعم"
      }
    };
    const lang = selectedLanguage.split(" ")[0]; // Get "English" or "Urdu"
    return translations[lang]?.[key] || translations["English (US)"][key] || key;
  };

  // Ref for ScrollView to enable auto-scrolling
  const scrollViewRef = useRef<ScrollView>(null);
  // Ref for content area to scroll to
  const contentAreaRef = useRef<View>(null);

  // Auto-scroll to content area when activeTab changes
  useEffect(() => {
    setTimeout(() => {
      contentAreaRef.current?.measure((x, y) => {
        scrollViewRef.current?.scrollTo({ y, animated: true });
      });
    }, 100);
  }, [activeTab]);
  const [notificationSettings, setNotificationSettings] = useState({
    pushNotifications: true,
    emailNotifications: true,
    smsNotifications: false,
    newListings: true,
    priceAlerts: true,
    messages: true,
    promotions: false,
  });
  const [privacySettings, setPrivacySettings] = useState({
    profileVisibility: "public",
    showEmail: false,
    showPhone: false,
    showLocation: true,
    activityStatus: true,
  });
  const [twoFactorEnabled, setTwoFactorEnabled] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState<boolean>(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState<boolean>(false);
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);

  // --- Real Firebase State ---
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [location, setLocation] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profileImage, setProfileImage] = useState<string>(
    "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200",
  );
  const [selectedCurrency, setSelectedCurrency] = useState("USD - US Dollar");
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [currencyModalVisible, setCurrencyModalVisible] = useState(false);
  const [termsVisible, setTermsVisible] = useState(false);
  // State for billing address
  const [billingAddress, setBillingAddress] = useState({
    street: "123 Main St",
    city: "New York",
    state: "NY",
    zip: "10001",
  });

  // Custom Alert State
  const [alertConfig, setAlertConfig] = useState<Omit<ModernAlertProps, "visible">>({
    title: "",
    message: "",
    onConfirm: () => {},
    onCancel: () => {},
  });
  const [alertVisible, setAlertVisible] = useState(false);

  const showCustomAlert = (config: Omit<ModernAlertProps, "visible">) => {
    setAlertConfig(config);
    setAlertVisible(true);
  };

  // Fetch User Data on Mount
  useEffect(() => {
    const fetchUserData = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        // From Auth
        setFullName(user.displayName || "");
        setEmail(user.email || "");
        if (user.photoURL) setProfileImage(user.photoURL);

        // From Firestore
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setPhoneNumber(data.phone || "");
          setLocation(data.location || "");
          
          // Load settings if they exist
          if (data.notificationSettings) setNotificationSettings(data.notificationSettings);
          if (data.privacySettings) setPrivacySettings(data.privacySettings);
          if (data.twoFactorEnabled !== undefined) setTwoFactorEnabled(data.twoFactorEnabled);
          if (data.darkMode !== undefined) setDarkMode(data.darkMode);
          if (data.language) setSelectedLanguage(data.language);
          if (data.currency) setSelectedCurrency(data.currency);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    fetchUserData();
  }, []);

  // Sync Settings to Firestore helper
  const syncSettings = async (updates: any) => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      await setDoc(doc(db, "users", user.uid), updates, { merge: true });
    } catch (error) {
      console.error("Error syncing settings:", error);
    }
  };

  const toggleNotification = (key: keyof typeof notificationSettings) => {
    const newVal = !notificationSettings[key];
    const updated = { ...notificationSettings, [key]: newVal };
    setNotificationSettings(updated);
    syncSettings({ notificationSettings: updated });
  };

  const togglePrivacy = (key: keyof typeof privacySettings) => {
    const newVal = !privacySettings[key];
    const updated = { ...privacySettings, [key]: newVal };
    setPrivacySettings(updated);
    syncSettings({ privacySettings: updated });
  };

  const handleProfileVisibilityChange = (value: string) => {
    const updated = { ...privacySettings, profileVisibility: value };
    setPrivacySettings(updated);
    syncSettings({ privacySettings: updated });
  };

  const handleTwoFactorToggle = (value: boolean) => {
    setTwoFactorEnabled(value);
    syncSettings({ twoFactorEnabled: value });
  };

  const handleDarkModeToggle = (value: boolean) => {
    setDarkMode(value);
    syncSettings({ darkMode: value });
  };

  const handleLanguageSelect = (lang: string) => {
    setSelectedLanguage(lang);
    setLanguageModalVisible(false);
    syncSettings({ language: lang });
  };

  const handleCurrencySelect = (curr: string) => {
    setSelectedCurrency(curr);
    setCurrencyModalVisible(false);
    syncSettings({ currency: curr });
  };

  // Handle Save Changes
  const handleSaveChanges = async () => {
    const user = auth.currentUser;
    if (!user) return;

    setSaving(true);
    try {
      // Update Auth Profile
      await updateProfile(user, {
        displayName: fullName,
      });

      // Update Firestore
      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, {
        name: fullName,
        email: email,
        phone: phoneNumber,
        location: location,
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      showCustomAlert({
        title: "Success",
        message: "Profile updated successfully!",
        type: "success",
        onConfirm: () => setAlertVisible(false),
      });
    } catch (error: any) {
      showCustomAlert({
        title: "Error",
        message: error.message,
        type: "danger",
        onConfirm: () => setAlertVisible(false),
      });
    } finally {
      setSaving(false);
    }
  };

  // Handle Image Pick
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showCustomAlert({
        title: "Permission Required",
        message: "We need access to your photos to update your profile picture.",
        type: "danger",
        onConfirm: () => setAlertVisible(false),
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      const selectedImage = result.assets[0].uri;
      setProfileImage(selectedImage);
      
      const user = auth.currentUser;
      if (user) {
        try {
          await updateProfile(user, { photoURL: selectedImage });
          showCustomAlert({
            title: "Success",
            message: "Profile picture updated!",
            type: "success",
            onConfirm: () => setAlertVisible(false),
          });
        } catch (error: any) {
          showCustomAlert({
            title: "Error",
            message: error.message,
            type: "danger",
            onConfirm: () => setAlertVisible(false),
          });
        }
      }
    }
  };

  // Handle Password Update
  const handleUpdatePassword = async () => {
    if (newPassword !== confirmPassword) {
      showCustomAlert({
        title: "Error",
        message: "Passwords do not match",
        type: "danger",
        onConfirm: () => setAlertVisible(false),
      });
      return;
    }

    const user = auth.currentUser;
    if (!user || !user.email) return;

    setSaving(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      
      showCustomAlert({
        title: "Success",
        message: "Password updated successfully!",
        type: "success",
        onConfirm: () => setAlertVisible(false),
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      showCustomAlert({
        title: "Error",
        message: error.message,
        type: "danger",
        onConfirm: () => setAlertVisible(false),
      });
    } finally {
      setSaving(false);
    }
  };

  // Handle Logout
  const handleLogout = () => {
    showCustomAlert({
      title: "Log Out",
      message: "Are you sure you want to log out of your account?",
      confirmText: "Log Out",
      type: "info",
      showCancel: true,
      onConfirm: async () => {
        setAlertVisible(false);
        try {
          await signOut(auth);
          router.replace("/log-in");
        } catch (error: any) {
          showCustomAlert({
            title: "Error",
            message: error.message,
            type: "danger",
            onConfirm: () => setAlertVisible(false),
          });
        }
      },
      onCancel: () => setAlertVisible(false),
    });
  };

  // Handle Deactivate Account
  const handleDeactivateAccount = () => {
    showCustomAlert({
      title: "Deactivate Account",
      message: "This will temporarily disable your profile. You can reactivate it anytime by logging back in.",
      confirmText: "Deactivate",
      type: "danger",
      showCancel: true,
      onConfirm: async () => {
        setAlertVisible(false);
        setSaving(true);
        try {
          await syncSettings({ status: "inactive" });
          await signOut(auth);
          router.replace("/log-in");
        } catch (error: any) {
          showCustomAlert({
            title: "Error",
            message: error.message,
            type: "danger",
            onConfirm: () => setAlertVisible(false),
          });
        } finally {
          setSaving(false);
        }
      },
      onCancel: () => setAlertVisible(false),
    });
  };

  // Handle Delete Account
  const handleDeleteAccount = () => {
    showCustomAlert({
      title: "Delete Account",
      message: "Warning: This action is permanent. All your data will be deleted forever.",
      confirmText: "Delete Forever",
      type: "danger",
      showCancel: true,
      onConfirm: async () => {
        setAlertVisible(false);
        setSaving(true);
        const user = auth.currentUser;
        if (!user) return;
        try {
          // Delete from Firestore
          await deleteDoc(doc(db, "users", user.uid));
          // Delete from Auth
          await deleteUser(user);
          router.replace("/log-in");
        } catch {
          showCustomAlert({
            title: "Re-authentication Required",
            message: "For security, please log out and log back in before deleting your account.",
            type: "info",
            onConfirm: () => setAlertVisible(false),
          });
        } finally {
          setSaving(false);
        }
      },
      onCancel: () => setAlertVisible(false),
    });
  };

  const menuItems = [
    { id: "account", icon: "person-outline", label: "Account", badge: null },
    {
      id: "privacy",
      icon: "shield-checkmark-outline",
      label: "Privacy & Security",
      badge: null,
    },
    {
      id: "notifications",
      icon: "notifications-outline",
      label: "Notifications",
      badge: "3",
    },
    {
      id: "payment",
      icon: "card-outline",
      label: "Payment Methods",
      badge: null,
    },
    {
      id: "preferences",
      icon: "globe-outline",
      label: "Preferences",
      badge: null,
    },
    {
      id: "help",
      icon: "help-circle-outline",
      label: "Help & Support",
      badge: null,
    },
  ];

  const renderAccountTab = () => (
    <>
      {/* Profile Picture */}
      <View style={[styles.card, { backgroundColor: theme.card }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>Profile Picture</Text>
        <View style={styles.avatarContainer}>
          <View style={styles.avatarWrapper}>
            <Image source={{ uri: profileImage }} style={styles.avatar} />
            <TouchableOpacity style={styles.cameraButton} activeOpacity={0.8} onPress={pickImage}>
              <Ionicons name="camera-outline" size={16} color="white" />
            </TouchableOpacity>
          </View>
          <View style={styles.avatarActions}>
            <TouchableOpacity activeOpacity={0.8} onPress={pickImage}>
              <Text style={styles.primaryText}>Upload new photo</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.8} onPress={() => setProfileImage("https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200")}>
              <Text style={styles.dangerText}>Remove photo</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Personal Information */}
      <View style={[styles.card, { backgroundColor: theme.card }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>Personal Information</Text>
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: theme.subText }]}>Full Name</Text>
          <TextInput 
            value={fullName} 
            onChangeText={setFullName}
            placeholderTextColor={darkMode ? "#4B5563" : "#9CA3AF"}
            style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]} 
          />
        </View>
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: theme.subText }]}>Email</Text>
          <View style={[styles.inputWithIcon, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
            <Ionicons
              name="mail-outline"
              size={18}
              color={theme.subText}
              style={styles.inputIcon}
            />
            <TextInput
              value={email}
              editable={false}
              keyboardType="email-address"
              style={[styles.inputWithPadding, { color: theme.subText }]}
            />
          </View>
        </View>
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: theme.subText }]}>Phone Number</Text>
          <View style={[styles.inputWithIcon, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
            <Ionicons
              name="call-outline"
              size={18}
              color={theme.subText}
              style={styles.inputIcon}
            />
            <TextInput
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              placeholderTextColor={darkMode ? "#4B5563" : "#9CA3AF"}
              style={[styles.inputWithPadding, { color: theme.text }]}
            />
          </View>
        </View>
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: theme.subText }]}>Location</Text>
          <View style={[styles.inputWithIcon, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
            <Ionicons
              name="location-outline"
              size={18}
              color={theme.subText}
              style={styles.inputIcon}
            />
            <TextInput
              value={location}
              onChangeText={setLocation}
              placeholderTextColor={darkMode ? "#4B5563" : "#9CA3AF"}
              style={[styles.inputWithPadding, { color: theme.text }]}
            />
          </View>
        </View>
        <TouchableOpacity 
          style={styles.primaryButton} 
          activeOpacity={0.8} 
          onPress={handleSaveChanges}
          disabled={saving}
        >
          {saving ? (
            <InfinityLoader size={0.4} color="white" />
          ) : (
            <Text style={styles.primaryButtonText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Danger Zone */}
      <View style={[styles.card, styles.dangerCard, { backgroundColor: darkMode ? "rgba(239, 68, 68, 0.1)" : "#FEF2F2" }]}>
        <Text style={styles.dangerCardTitle}>Danger Zone</Text>
        <View style={styles.dangerButtons}>
          <TouchableOpacity 
            style={styles.dangerButton} 
            activeOpacity={0.8}
            onPress={handleDeactivateAccount}
          >
            <Text style={styles.dangerText}>Deactivate Account</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.dangerButton} 
            activeOpacity={0.8}
            onPress={handleDeleteAccount}
          >
            <Text style={styles.dangerText}>Delete Account Permanently</Text>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );

  const renderPrivacyTab = () => (
    <>
      {/* Password */}
      <View style={[styles.card, { backgroundColor: theme.card }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>Change Password</Text>
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: theme.subText }]}>Current Password</Text>
          <View style={[styles.inputWithIcon, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
            <Ionicons
              name="lock-closed-outline"
              size={18}
              color={theme.subText}
              style={styles.inputIcon}
            />
            <TextInput
              secureTextEntry={!showCurrentPassword}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholderTextColor={darkMode ? "#4B5563" : "#9CA3AF"}
              style={[styles.inputWithPadding, { color: theme.text }]}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowCurrentPassword(!showCurrentPassword)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={showCurrentPassword ? "eye-off-outline" : "eye-outline"}
                size={18}
                color={theme.subText}
              />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: theme.subText }]}>New Password</Text>
          <View style={[styles.inputWithIcon, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
            <Ionicons
              name="lock-closed-outline"
              size={18}
              color={theme.subText}
              style={styles.inputIcon}
            />
            <TextInput
              secureTextEntry={!showNewPassword}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholderTextColor={darkMode ? "#4B5563" : "#9CA3AF"}
              style={[styles.inputWithPadding, { color: theme.text }]}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowNewPassword(!showNewPassword)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={showNewPassword ? "eye-off-outline" : "eye-outline"}
                size={18}
                color={theme.subText}
              />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: theme.subText }]}>Confirm New Password</Text>
          <View style={[styles.inputWithIcon, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
            <Ionicons
              name="lock-closed-outline"
              size={18}
              color={theme.subText}
              style={styles.inputIcon}
            />
            <TextInput
              secureTextEntry={!showConfirmPassword}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholderTextColor={darkMode ? "#4B5563" : "#9CA3AF"}
              style={[styles.inputWithPadding, { color: theme.text }]}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                size={18}
                color={theme.subText}
              />
            </TouchableOpacity>
          </View>
        </View>
        <TouchableOpacity 
          style={styles.primaryButton} 
          activeOpacity={0.8}
          onPress={handleUpdatePassword}
          disabled={saving}
        >
          {saving ? (
            <InfinityLoader size={0.4} color="white" />
          ) : (
            <Text style={styles.primaryButtonText}>Update Password</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Two-Factor Authentication */}
      <View style={[styles.card, { backgroundColor: theme.card }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>Two-Factor Authentication</Text>
        <View style={styles.switchRow}>
          <View style={styles.switchTextContainer}>
            <Text style={[styles.switchTitle, { color: theme.text }]}>
              Enhance your account security with 2FA
            </Text>
            <Text style={[styles.switchDescription, { color: theme.subText }]}>
              Receive a verification code on your phone when logging in
            </Text>
          </View>
          <Switch
            value={twoFactorEnabled}
            onValueChange={handleTwoFactorToggle}
            trackColor={{ false: "#E5E7EB", true: "#1E7C7E" }}
            thumbColor={twoFactorEnabled ? "#FFFFFF" : "#F4F4F5"}
          />
        </View>
        {twoFactorEnabled && (
          <View style={styles.twoFactorInfo}>
            <TouchableOpacity activeOpacity={0.8}>
              <Text style={styles.primaryText}>
                Manage Two-Factor Authentication
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Privacy Settings */}
      <View style={[styles.card, { backgroundColor: theme.card }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>Privacy Settings</Text>

        {/* Profile Visibility */}
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: theme.subText }]}>Profile Visibility</Text>
          <View style={[styles.selectContainer, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
            <TouchableOpacity
              style={[
                styles.selectOption,
                privacySettings.profileVisibility === "public" &&
                  styles.selectOptionActive,
              ]}
              onPress={() => handleProfileVisibilityChange("public")}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.selectOptionText,
                  { color: theme.subText },
                  privacySettings.profileVisibility === "public" &&
                    styles.selectOptionTextActive,
                ]}
              >
                Public
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.selectOption,
                privacySettings.profileVisibility === "private" &&
                  styles.selectOptionActive,
              ]}
              onPress={() => handleProfileVisibilityChange("private")}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.selectOptionText,
                  { color: theme.subText },
                  privacySettings.profileVisibility === "private" &&
                    styles.selectOptionTextActive,
                ]}
              >
                Private
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.selectOption,
                privacySettings.profileVisibility === "connections" &&
                  styles.selectOptionActive,
              ]}
              onPress={() => handleProfileVisibilityChange("connections")}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.selectOptionText,
                  privacySettings.profileVisibility === "connections" &&
                    styles.selectOptionTextActive,
                ]}
              >
                Connections
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Toggle Options */}
        <View style={styles.toggleList}>
          <View style={styles.switchRow}>
            <View style={styles.switchTextContainer}>
              <Text style={styles.switchTitle}>Show Email Address</Text>
              <Text style={styles.switchDescription}>
                Display your email on your public profile
              </Text>
            </View>
            <Switch
              value={privacySettings.showEmail}
              onValueChange={() => togglePrivacy("showEmail")}
              trackColor={{ false: "#E5E7EB", true: "#1E7C7E" }}
              thumbColor={privacySettings.showEmail ? "#FFFFFF" : "#F4F4F5"}
            />
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchTextContainer}>
              <Text style={styles.switchTitle}>Show Phone Number</Text>
              <Text style={styles.switchDescription}>
                Display your phone on your public profile
              </Text>
            </View>
            <Switch
              value={privacySettings.showPhone}
              onValueChange={() => togglePrivacy("showPhone")}
              trackColor={{ false: "#E5E7EB", true: "#1E7C7E" }}
              thumbColor={privacySettings.showPhone ? "#FFFFFF" : "#F4F4F5"}
            />
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchTextContainer}>
              <Text style={styles.switchTitle}>Show Location</Text>
              <Text style={styles.switchDescription}>
                Display your location on your profile
              </Text>
            </View>
            <Switch
              value={privacySettings.showLocation}
              onValueChange={() => togglePrivacy("showLocation")}
              trackColor={{ false: "#E5E7EB", true: "#1E7C7E" }}
              thumbColor={privacySettings.showLocation ? "#FFFFFF" : "#F4F4F5"}
            />
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchTextContainer}>
              <Text style={styles.switchTitle}>Activity Status</Text>
              <Text style={styles.switchDescription}>
                Show when you're online or recently active
              </Text>
            </View>
            <Switch
              value={privacySettings.activityStatus}
              onValueChange={() => togglePrivacy("activityStatus")}
              trackColor={{ false: "#E5E7EB", true: "#1E7C7E" }}
              thumbColor={
                privacySettings.activityStatus ? "#FFFFFF" : "#F4F4F5"
              }
            />
          </View>
        </View>
      </View>
    </>
  );

  const renderNotificationsTab = () => (
    <>
      <View style={[styles.card, { backgroundColor: theme.card }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>Main Channels</Text>
        <View style={styles.toggleList}>
          <View style={styles.switchRow}>
            <View style={styles.switchTextContainer}>
              <Text style={[styles.switchTitle, { color: theme.text }]}>Push Notifications</Text>
              <Text style={[styles.switchDescription, { color: theme.subText }]}>
                Receive alerts on your device
              </Text>
            </View>
            <Switch
              value={notificationSettings.pushNotifications}
              onValueChange={() => toggleNotification("pushNotifications")}
              trackColor={{ false: "#E5E7EB", true: "#1E7C7E" }}
              thumbColor={
                notificationSettings.pushNotifications ? "#FFFFFF" : "#F4F4F5"
              }
            />
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchTextContainer}>
              <Text style={[styles.switchTitle, { color: theme.text }]}>Email Notifications</Text>
              <Text style={[styles.switchDescription, { color: theme.subText }]}>
                Receive updates via email
              </Text>
            </View>
            <Switch
              value={notificationSettings.emailNotifications}
              onValueChange={() => toggleNotification("emailNotifications")}
              trackColor={{ false: "#E5E7EB", true: "#1E7C7E" }}
              thumbColor={
                notificationSettings.emailNotifications ? "#FFFFFF" : "#F4F4F5"
              }
            />
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchTextContainer}>
              <Text style={[styles.switchTitle, { color: theme.text }]}>SMS Notifications</Text>
              <Text style={[styles.switchDescription, { color: theme.subText }]}>
                Receive security alerts via SMS
              </Text>
            </View>
            <Switch
              value={notificationSettings.smsNotifications}
              onValueChange={() => toggleNotification("smsNotifications")}
              trackColor={{ false: "#E5E7EB", true: "#1E7C7E" }}
              thumbColor={
                notificationSettings.smsNotifications ? "#FFFFFF" : "#F4F4F5"
              }
            />
          </View>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: theme.card }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>Notification Types</Text>

        <View style={styles.toggleList}>
          <View style={styles.switchRow}>
            <View style={styles.switchTextContainer}>
              <Text style={[styles.switchTitle, { color: theme.text }]}>New Listings</Text>
              <Text style={[styles.switchDescription, { color: theme.subText }]}>
                Get notified about new listings matching your preferences
              </Text>
            </View>
            <Switch
              value={notificationSettings.newListings}
              onValueChange={() => toggleNotification("newListings")}
              trackColor={{ false: "#E5E7EB", true: "#1E7C7E" }}
              thumbColor={
                notificationSettings.newListings ? "#FFFFFF" : "#F4F4F5"
              }
            />
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchTextContainer}>
              <Text style={[styles.switchTitle, { color: theme.text }]}>Price Alerts</Text>
              <Text style={[styles.switchDescription, { color: theme.subText }]}>
                Get notified when prices drop for saved items
              </Text>
            </View>
            <Switch
              value={notificationSettings.priceAlerts}
              onValueChange={() => toggleNotification("priceAlerts")}
              trackColor={{ false: "#E5E7EB", true: "#1E7C7E" }}
              thumbColor={
                notificationSettings.priceAlerts ? "#FFFFFF" : "#F4F4F5"
              }
            />
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchTextContainer}>
              <Text style={[styles.switchTitle, { color: theme.text }]}>Messages</Text>
              <Text style={[styles.switchDescription, { color: theme.subText }]}>
                Get notified when you receive new messages
              </Text>
            </View>
            <Switch
              value={notificationSettings.messages}
              onValueChange={() => toggleNotification("messages")}
              trackColor={{ false: "#E5E7EB", true: "#1E7C7E" }}
              thumbColor={notificationSettings.messages ? "#FFFFFF" : "#F4F4F5"}
            />
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchTextContainer}>
              <Text style={[styles.switchTitle, { color: theme.text }]}>Promotions</Text>
              <Text style={[styles.switchDescription, { color: theme.subText }]}>
                Get notified about special offers and promotions
              </Text>
            </View>
            <Switch
              value={notificationSettings.promotions}
              onValueChange={() => toggleNotification("promotions")}
              trackColor={{ false: "#E5E7EB", true: "#1E7C7E" }}
              thumbColor={
                notificationSettings.promotions ? "#FFFFFF" : "#F4F4F5"
              }
            />
          </View>
        </View>
      </View>
    </>
  );

  const renderPreferencesTab = () => (
    <>
      <View style={[styles.card, { backgroundColor: theme.card }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>{t("appearance")}</Text>

        <View style={styles.switchRow}>
          <View style={styles.switchTextContainer}>
            <Text style={[styles.switchTitle, { color: theme.text }]}>{t("darkMode")}</Text>
            <Text style={[styles.switchDescription, { color: theme.subText }]}>
              Switch between light and dark theme
            </Text>
          </View>
          <Switch
            value={darkMode}
            onValueChange={handleDarkModeToggle}
            trackColor={{ false: "#E5E7EB", true: "#1E7C7E" }}
            thumbColor={darkMode ? "#FFFFFF" : "#F4F4F5"}
          />
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: theme.card }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>{t("language")} & {t("currency")}</Text>
        <TouchableOpacity 
          style={styles.optionRow} 
          activeOpacity={0.8}
          onPress={() => setLanguageModalVisible(true)}
        >
          <View style={styles.optionLeft}>
            <Ionicons name="language-outline" size={22} color="#1E7C7E" />
            <Text style={[styles.optionText, { color: theme.text }]}>{t("language")}</Text>
          </View>
          <View style={styles.optionRight}>
            <Text style={[styles.optionValue, { color: theme.subText }]}>{selectedLanguage}</Text>
            <Ionicons name="chevron-forward" size={18} color="#999" />
          </View>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.optionRow} 
          activeOpacity={0.8}
          onPress={() => setCurrencyModalVisible(true)}
        >
          <View style={styles.optionLeft}>
            <Ionicons name="cash-outline" size={22} color="#1E7C7E" />
            <Text style={[styles.optionText, { color: theme.text }]}>{t("currency")}</Text>
          </View>
          <View style={styles.optionRight}>
            <Text style={[styles.optionValue, { color: theme.subText }]}>{selectedCurrency}</Text>
            <Ionicons name="chevron-forward" size={18} color="#999" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.optionRow} 
          activeOpacity={0.8}
          onPress={() => router.push("/chatbot")}
        >
          <View style={styles.optionLeft}>
            <Ionicons name="chatbubbles-outline" size={22} color="#1E7C7E" />
            <Text style={[styles.optionText, { color: theme.text }]}>Live Chat Support</Text>
          </View>
          <View style={styles.optionRight}>
            <Text style={[styles.optionValue, { color: theme.subText }]}>Available</Text>
            <Ionicons name="chevron-forward" size={18} color="#999" />
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Support & Resources</Text>
        <TouchableOpacity style={styles.optionRow} activeOpacity={0.8} onPress={() => setActiveTab("help")}>
          <View style={styles.optionLeft}>
            <Ionicons name="help-circle-outline" size={22} color="#1E7C7E" />
            <Text style={styles.optionText}>Help Center & FAQ</Text>
          </View>
          <View style={styles.optionRight}>
            <Text style={styles.badgeText}>New</Text>
            <Ionicons name="chevron-forward" size={18} color="#999" />
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.optionRow} activeOpacity={0.8}>
          <View style={styles.optionLeft}>
            <Ionicons name="chatbubbles-outline" size={22} color="#1E7C7E" />
            <Text style={styles.optionText}>Live Chat Support</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#999" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.optionRow} activeOpacity={0.8}>
          <View style={styles.optionLeft}>
            <Ionicons
              name="document-text-outline"
              size={22}
              color="#1E7C7E"
            />
            <Text style={styles.optionText}>Terms of Service</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#999" />
        </TouchableOpacity>
      </View>
    </>
  );



  const renderHelpTab = () => (
    <>
      <View style={[styles.card, { backgroundColor: theme.card }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>Frequently Asked Questions</Text>
        {[
          { q: "How do I search for products?", a: "Go to the Home screen and use the glowing search bar at the top." },
          { q: "Is my payment information secure?", a: "Yes, we use bank-level encryption to protect your data." },
          { q: "How can I change my password?", a: "Go to the Privacy tab in Settings to update your password." },
          { q: "Can I use multiple accounts?", a: "Currently, we only support one active account per device." }
        ].map((faq, index) => (
          <View key={index} style={[styles.faqItem, { borderBottomColor: theme.border }]}>
            <Text style={[styles.faqQuestion, { color: theme.text }]}>{faq.q}</Text>
            <Text style={[styles.faqAnswer, { color: theme.subText }]}>{faq.a}</Text>
          </View>
        ))}
      </View>

      <View style={[styles.card, { backgroundColor: theme.card }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>Still need help?</Text>
        <View style={styles.supportOptions}>
          <TouchableOpacity 
            style={[styles.supportCard, { backgroundColor: theme.inputBg, borderColor: theme.border }]} 
            activeOpacity={0.8}
            onPress={() => router.push("/chatbot")}
          >
            <Ionicons name="chatbubble-ellipses" size={28} color="#1E7C7E" />
            <Text style={[styles.supportCardTitle, { color: theme.text }]}>Chat with us</Text>
            <Text style={styles.supportCardSub}>Available 24/7</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.supportCard, { backgroundColor: theme.inputBg, borderColor: theme.border }]} activeOpacity={0.8}>
            <Ionicons name="mail" size={28} color="#1E7C7E" />
            <Text style={[styles.supportCardTitle, { color: theme.text }]}>Email Support</Text>
            <Text style={styles.supportCardSub}>Response in 24h</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: theme.card }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>App Information</Text>
        <TouchableOpacity 
          style={[styles.aboutInfo, { borderBottomColor: theme.border }]}
          onPress={() => setTermsVisible(true)}
        >
          <Text style={styles.aboutLabel}>Terms of Service</Text>
          <Ionicons name="chevron-forward" size={16} color="#999" />
        </TouchableOpacity>
        <View style={[styles.aboutInfo, { borderBottomColor: theme.border }]}>
          <Text style={styles.aboutLabel}>Version</Text>
          <Text style={[styles.aboutValue, { color: theme.text }]}>2.4.0 (Build 102)</Text>
        </View>
        <View style={[styles.aboutInfo, { borderBottomColor: theme.border }]}>
          <Text style={styles.aboutLabel}>Release Channel</Text>
          <Text style={[styles.aboutValue, { color: theme.text }]}>Production</Text>
        </View>
      </View>

      {/* Terms of Service Modal */}
      <Modal visible={termsVisible} transparent animationType="fade" onRequestClose={() => setTermsVisible(false)}>
        <View style={styles.modalOverlaySelection}>
          <View style={[styles.selectionModalContent, { backgroundColor: theme.card, height: '90%' }]}>
            <View style={[styles.selectionHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.selectionTitle, { color: theme.text }]}>Terms of Service</Text>
              <TouchableOpacity onPress={() => setTermsVisible(false)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ padding: 20 }}>
              <Text style={[styles.termsHeading, { color: theme.text }]}>1. Acceptance of Terms</Text>
              <Text style={[styles.termsText, { color: theme.subText }]}>
                By accessing and using Scrapit, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing this site.
              </Text>
              <Text style={[styles.termsHeading, { color: theme.text }]}>2. User License</Text>
              <Text style={[styles.termsText, { color: theme.subText }]}>
                Permission is granted to temporarily download one copy of the materials (information or software) on Scrapit's app for personal, non-commercial transitory viewing only.
              </Text>
              <Text style={[styles.termsHeading, { color: theme.text }]}>3. Disclaimer</Text>
              <Text style={[styles.termsText, { color: theme.subText }]}>
                The materials on Scrapit's app are provided on an 'as is' basis. Scrapit makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability.
              </Text>
              <Text style={[styles.termsHeading, { color: theme.text }]}>4. Limitations</Text>
              <Text style={[styles.termsText, { color: theme.subText }]}>
                In no event shall Scrapit or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on Scrapit's app.
              </Text>
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );

  const renderPaymentTab = () => (
    <>
      <View style={[styles.card, { backgroundColor: theme.card }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>Stored Methods</Text>
        <View style={[styles.paymentMethodCard, { backgroundColor: darkMode ? "#334155" : "#F9FAFB", borderColor: theme.border }]}>
          <View style={styles.paymentMethodInfo}>
            <View style={styles.cardIconContainer}>
              <Ionicons name="card" size={32} color="#1E7C7E" />
            </View>
            <View style={styles.cardDetails}>
              <Text style={[styles.cardNumber, { color: theme.text }]}>•••• •••• •••• 4242</Text>
              <View style={styles.cardMeta}>
                <Text style={[styles.cardExpiry, { color: theme.subText }]}>Expires 08/26</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity style={styles.setDefaultButton} activeOpacity={0.8}>
            <Text style={styles.setDefaultButtonText}>Set Default</Text>
          </TouchableOpacity>
        </View>

        {/* Add New Card */}
        <TouchableOpacity style={[styles.addCardButton, { borderColor: theme.border }]} activeOpacity={0.8}>
          <Ionicons name="add" size={24} color="#1E7C7E" />
          <Text style={styles.addCardText}>Add New Payment Method</Text>
        </TouchableOpacity>
      </View>

      {/* Billing Address */}
      <View style={[styles.card, { backgroundColor: theme.card }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>Billing Address</Text>
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: theme.subText }]}>Street Address</Text>
          <TextInput
            value={billingAddress.street}
            onChangeText={(text) =>
              setBillingAddress({ ...billingAddress, street: text })
            }
            placeholderTextColor={darkMode ? "#4B5563" : "#9CA3AF"}
            style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
          />
        </View>
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: theme.subText }]}>City</Text>
          <TextInput
            value={billingAddress.city}
            onChangeText={(text) =>
              setBillingAddress({ ...billingAddress, city: text })
            }
            placeholderTextColor={darkMode ? "#4B5563" : "#9CA3AF"}
            style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
          />
        </View>
        <View style={styles.formRow}>
          <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={[styles.label, { color: theme.subText }]}>State</Text>
            <TextInput
              value={billingAddress.state}
              onChangeText={(text) =>
                setBillingAddress({ ...billingAddress, state: text })
              }
              placeholderTextColor={darkMode ? "#4B5563" : "#9CA3AF"}
              style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
            />
          </View>
          <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
            <Text style={[styles.label, { color: theme.subText }]}>ZIP Code</Text>
            <TextInput
              value={billingAddress.zip}
              onChangeText={(text) =>
                setBillingAddress({ ...billingAddress, zip: text })
              }
              placeholderTextColor={darkMode ? "#4B5563" : "#9CA3AF"}
              style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
            />
          </View>
        </View>
        <TouchableOpacity style={styles.primaryButton} activeOpacity={0.8}>
          <Text style={styles.primaryButtonText}>Save Address</Text>
        </TouchableOpacity>
      </View>
    </>
  );



  const renderContent = () => {
    switch (activeTab) {
      case "account":
        return renderAccountTab();
      case "privacy":
        return renderPrivacyTab();
      case "notifications":
        return renderNotificationsTab();
      case "payment":
        return renderPaymentTab();
      case "preferences":
        return renderPreferencesTab();
      case "help":
        return renderHelpTab();
      default:
        return renderAccountTab();
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <LinearGradient
        colors={theme.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.backButton}
          activeOpacity={0.8}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <View style={styles.headerLogoContainer}>
          <View style={{ paddingRight: 8 }}>
            <InfinityLoader size={0.7} color="white" />
          </View>
          <Text style={styles.headerTitle}>SETTINGS</Text>
        </View>
        <View style={styles.headerRight} />
      </LinearGradient>

      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.menuContainer, { backgroundColor: theme.card }]}>
          <View style={styles.menuGrid}>
            {menuItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                onPress={() => setActiveTab(item.id)}
                style={[
                  styles.menuCard,
                  activeTab === item.id && styles.activeMenuCard,
                  activeTab === item.id && darkMode && { backgroundColor: "rgba(30, 124, 126, 0.2)" }
                ]}
                activeOpacity={0.8}
              >
                <View style={styles.menuCardLeft}>
                  <Ionicons
                    name={item.icon as any}
                    size={22}
                    color={activeTab === item.id ? "#1E7C7E" : theme.subText}
                  />
                  <Text
                    style={[
                      styles.menuCardText,
                      { color: theme.text },
                      activeTab === item.id && styles.activeMenuCardText,
                    ]}
                  >
                    {item.label}
                  </Text>
                </View>
                {item.badge && (
                  <View style={styles.menuBadge}>
                    <Text style={styles.menuBadgeText}>{item.badge}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity 
              style={styles.logoutButton} 
              activeOpacity={0.8}
              onPress={handleLogout}
            >
              <Ionicons name="log-out-outline" size={20} color="#EF4444" />
              <Text style={styles.logoutText}>Log Out</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View ref={contentAreaRef} style={styles.contentArea}>
          {renderContent()}
        </View>
      </ScrollView>

      {/* Selection Modals */}
      <Modal visible={languageModalVisible} transparent animationType="slide" onRequestClose={() => setLanguageModalVisible(false)}>
        <View style={styles.modalOverlaySelection}>
          <View style={[styles.selectionModalContent, { backgroundColor: theme.card }]}>
            <View style={[styles.selectionHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.selectionTitle, { color: theme.text }]}>Select Language</Text>
              <TouchableOpacity onPress={() => setLanguageModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {["English (US)", "English (UK)", "Español", "Français", "Deutsch", "中文", "日本語", "Urdu"].map((lang) => (
                <TouchableOpacity key={lang} style={[styles.selectionItem, { borderBottomColor: theme.border }]} onPress={() => handleLanguageSelect(lang)}>
                  <Text style={[styles.selectionItemText, { color: theme.subText }, selectedLanguage === lang && styles.activeSelectionText]}>{lang}</Text>
                  {selectedLanguage === lang && <Ionicons name="checkmark" size={20} color="#1E7C7E" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={currencyModalVisible} transparent animationType="slide" onRequestClose={() => setCurrencyModalVisible(false)}>
        <View style={styles.modalOverlaySelection}>
          <View style={[styles.selectionModalContent, { backgroundColor: theme.card }]}>
            <View style={[styles.selectionHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.selectionTitle, { color: theme.text }]}>Select Currency</Text>
              <TouchableOpacity onPress={() => setCurrencyModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {["USD - US Dollar", "EUR - Euro", "GBP - British Pound", "PKR - Pakistani Rupee", "JPY - Japanese Yen", "CAD - Canadian Dollar"].map((curr) => (
                <TouchableOpacity key={curr} style={[styles.selectionItem, { borderBottomColor: theme.border }]} onPress={() => handleCurrencySelect(curr)}>
                  <Text style={[styles.selectionItemText, { color: theme.subText }, selectedCurrency === curr && styles.activeSelectionText]}>{curr}</Text>
                  {selectedCurrency === curr && <Ionicons name="checkmark" size={20} color="#1E7C7E" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <ModernAlert
        visible={alertVisible}
        {...alertConfig}
      />
    </SafeAreaView>
  );
};

const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F8F9",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
  },
  headerRight: {
    width: 40,
  },
  headerLogoContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  mainContent: {
    flex: 1,
    flexDirection: "column",
  },
  sidebar: {
    width: "100%",
    backgroundColor: "white",
    paddingVertical: 16,
    maxHeight: 200,
  },
  menuSection: {
    flex: 1,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 8,
    borderRadius: 8,
    marginBottom: 4,
  },
  activeMenuItem: {
    backgroundColor: "#E6FFFA",
  },
  menuItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  menuItemText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6B7280",
  },
  activeMenuItemText: {
    color: "#1E7C7E",
  },
  badge: {
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  badgeText: {
    color: "#DC2626",
    fontSize: 12,
    fontWeight: "600",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 12,
    backgroundColor: "white",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderLeftWidth: 3,
    borderLeftColor: "transparent",
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#EF4444",
  },
  contentArea: {
    flex: 1,
    padding: 16,
  },
  scrollView: {
    flex: 1,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 16,
  },
  avatarContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  avatarWrapper: {
    position: "relative",
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    objectFit: "cover",
  },
  cameraButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#1E7C7E",
    borderRadius: 16,
    padding: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarActions: {
    gap: 8,
  },
  primaryText: {
    color: "#1E7C7E",
    fontWeight: "600",
    fontSize: 14,
  },
  dangerText: {
    color: "#EF4444",
    fontWeight: "600",
    fontSize: 14,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: "white",
  },
  inputWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    backgroundColor: "white",
  },
  inputIcon: {
    marginLeft: 12,
  },
  inputWithPadding: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  eyeButton: {
    padding: 12,
  },
  primaryButton: {
    backgroundColor: "#1E7C7E",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 8,
  },
  primaryButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 14,
  },
  dangerCard: {
    borderWidth: 1,
    borderColor: "#FEE2E2",
  },
  dangerCardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#EF4444",
    marginBottom: 16,
  },
  dangerButtons: {
    gap: 8,
  },
  dangerButton: {
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
    backgroundColor: "#FEF2F2",
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  switchTextContainer: {
    flex: 1,
    marginRight: 16,
  },
  switchTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 2,
  },
  switchDescription: {
    fontSize: 12,
    color: "#6B7280",
  },
  twoFactorInfo: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  selectContainer: {
    flexDirection: "row",
    gap: 8,
  },
  selectOption: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: "white",
  },
  selectOptionActive: {
    borderColor: "#1E7C7E",
    backgroundColor: "#E6FFFA",
  },
  selectOptionText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6B7280",
  },
  selectOptionTextActive: {
    color: "#1E7C7E",
  },
  toggleList: {
    gap: 8,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  optionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  optionText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
  },
  optionRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  optionValue: {
    fontSize: 14,
    color: "#6B7280",
  },
  formRow: {
    flexDirection: "row",
    gap: 16,
  },
  // Payment Methods Styles
  cardItem: {
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  visaCard: {
    backgroundColor: "#1E40AF",
  },
  mastercard: {
    backgroundColor: "#B91C1C",
  },
  cardInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  cardIcon: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    padding: 8,
    borderRadius: 8,
  },
  cardDetails: {
    flex: 1,
  },
  cardType: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  cardNumber: {
    color: "white",
    fontSize: 14,
    marginBottom: 4,
  },
  cardMeta: {
    flexDirection: "row",
    gap: 12,
  },
  cardExpiry: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 12,
  },
  cardBadge: {
    backgroundColor: "#10B981",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  cardBadgeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  setDefaultButton: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  setDefaultButtonText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  addCardButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 16,
    borderWidth: 2,
    borderColor: "#1E7C7E",
    borderStyle: "dashed",
    borderRadius: 12,
    marginTop: 8,
  },
  addCardText: {
    color: "#1E7C7E",
    fontSize: 14,
    fontWeight: "500",
  },
  // Help Tab Styles
  aboutInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  aboutLabel: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  aboutValue: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
  },
  secondaryButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#1E7C7E",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 16,
  },
  secondaryButtonText: {
    color: "#1E7C7E",
    fontWeight: "600",
    fontSize: 14,
  },
  // Menu Styles
  menuContainer: {
    backgroundColor: "white",
    marginBottom: 16,
  },
  menuGrid: {
    flexDirection: "column",
  },
  menuCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "white",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderLeftWidth: 3,
    borderLeftColor: "transparent",
  },
  activeMenuCard: {
    backgroundColor: "#E6FFFA",
    borderLeftColor: "#1E7C7E",
  },
  menuCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  menuCardText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#374151",
  },
  activeMenuCardText: {
    color: "#1E7C7E",
  },
  menuBadge: {
    backgroundColor: "#DC2626",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  menuBadgeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  headerLogo: {
    marginRight: 8,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "white",
    borderRadius: 20,
    overflow: "hidden",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
  },
  modalHeader: {
    backgroundColor: "#EF4444",
    padding: 30,
    alignItems: "center",
  },
  modalHeaderDanger: {
    backgroundColor: "#EF4444",
  },
  modalHeaderSuccess: {
    backgroundColor: "#EF4444",
  },
  modalBody: {
    padding: 24,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1F2937",
    marginBottom: 8,
    textAlign: "center",
  },
  modalMessage: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
  },
  modalCancelBtnText: {
    color: "#4B5563",
    fontWeight: "700",
    fontSize: 16,
  },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#EF4444",
    alignItems: "center",
  },
  modalConfirmBtnDanger: {
    backgroundColor: "#EF4444",
  },
  modalConfirmBtnSuccess: {
    backgroundColor: "#EF4444",
  },
  modalConfirmBtnText: {
    color: "white",
    fontWeight: "700",
    fontSize: 16,
  },
  // Support & Selection Styles
  modalOverlaySelection: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  faqItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  faqQuestion: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  faqAnswer: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
  },
  supportOptions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  supportCard: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  supportCardTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginTop: 8,
  },
  supportCardSub: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 2,
  },
  selectionModalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
    maxHeight: "80%",
  },
  selectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  selectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  selectionItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#F9FAFB",
  },
  selectionItemText: {
    fontSize: 16,
    color: "#4B5563",
  },
  activeSelectionText: {
    color: "#1E7C7E",
    fontWeight: "600",
  },
  supportBadgeText: {
    backgroundColor: "#EF4444",
    color: "white",
    fontSize: 10,
    fontWeight: "700",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginRight: 6,
    overflow: "hidden",
  },
  termsHeading: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 20,
    marginBottom: 10,
  },
  termsText: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 15,
  },
  paymentMethodCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 16,
  },
  paymentMethodInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardIconContainer: {
    marginRight: 12,
  },

});

export default SettingsScreen;
