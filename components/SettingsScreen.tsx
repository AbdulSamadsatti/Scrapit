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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import InfinityLoader from "./ui/InfinityLoader";

const SettingsScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  // Set active tab based on navigation parameters, default to "account"
  const [activeTab, setActiveTab] = useState<string>(
    (params.tab as string) || "account",
  );
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
  const [profileImage] = useState<string>(
    "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200",
  );
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
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState<boolean>(false);
  const [showCurrentPassword, setShowCurrentPassword] =
    useState<boolean>(false);
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState<boolean>(false);

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

  const toggleNotification = (key: keyof typeof notificationSettings) => {
    setNotificationSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const togglePrivacy = (key: keyof typeof privacySettings) => {
    setPrivacySettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleProfileVisibilityChange = (value: string) => {
    setPrivacySettings((prev) => ({ ...prev, profileVisibility: value }));
  };

  const renderAccountTab = () => (
    <>
      {/* Profile Picture */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Profile Picture</Text>
        <View style={styles.avatarContainer}>
          <View style={styles.avatarWrapper}>
            <Image source={{ uri: profileImage }} style={styles.avatar} />
            <TouchableOpacity style={styles.cameraButton} activeOpacity={0.8}>
              <Ionicons name="camera-outline" size={16} color="white" />
            </TouchableOpacity>
          </View>
          <View style={styles.avatarActions}>
            <TouchableOpacity activeOpacity={0.8}>
              <Text style={styles.primaryText}>Upload new photo</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.8}>
              <Text style={styles.dangerText}>Remove photo</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Personal Information */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Personal Information</Text>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput defaultValue="John Doe" style={styles.input} />
        </View>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Email</Text>
          <View style={styles.inputWithIcon}>
            <Ionicons
              name="mail-outline"
              size={18}
              color="#999"
              style={styles.inputIcon}
            />
            <TextInput
              defaultValue="john.doe@email.com"
              keyboardType="email-address"
              style={styles.inputWithPadding}
            />
          </View>
        </View>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Phone Number</Text>
          <View style={styles.inputWithIcon}>
            <Ionicons
              name="call-outline"
              size={18}
              color="#999"
              style={styles.inputIcon}
            />
            <TextInput
              defaultValue="+1 (555) 123-4567"
              keyboardType="phone-pad"
              style={styles.inputWithPadding}
            />
          </View>
        </View>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Location</Text>
          <View style={styles.inputWithIcon}>
            <Ionicons
              name="location-outline"
              size={18}
              color="#999"
              style={styles.inputIcon}
            />
            <TextInput
              defaultValue="New York, NY"
              style={styles.inputWithPadding}
            />
          </View>
        </View>
        <TouchableOpacity style={styles.primaryButton} activeOpacity={0.8}>
          <Text style={styles.primaryButtonText}>Save Changes</Text>
        </TouchableOpacity>
      </View>

      {/* Danger Zone */}
      <View style={[styles.card, styles.dangerCard]}>
        <Text style={styles.dangerCardTitle}>Danger Zone</Text>
        <View style={styles.dangerButtons}>
          <TouchableOpacity style={styles.dangerButton} activeOpacity={0.8}>
            <Text style={styles.dangerText}>Deactivate Account</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dangerButton} activeOpacity={0.8}>
            <Text style={styles.dangerText}>Delete Account Permanently</Text>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );

  const renderPrivacyTab = () => (
    <>
      {/* Password */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Change Password</Text>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Current Password</Text>
          <View style={styles.inputWithIcon}>
            <Ionicons
              name="lock-closed-outline"
              size={18}
              color="#999"
              style={styles.inputIcon}
            />
            <TextInput
              secureTextEntry={!showCurrentPassword}
              style={styles.inputWithPadding}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowCurrentPassword(!showCurrentPassword)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={showCurrentPassword ? "eye-off-outline" : "eye-outline"}
                size={18}
                color="#999"
              />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.formGroup}>
          <Text style={styles.label}>New Password</Text>
          <View style={styles.inputWithIcon}>
            <Ionicons
              name="lock-closed-outline"
              size={18}
              color="#999"
              style={styles.inputIcon}
            />
            <TextInput
              secureTextEntry={!showNewPassword}
              style={styles.inputWithPadding}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowNewPassword(!showNewPassword)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={showNewPassword ? "eye-off-outline" : "eye-outline"}
                size={18}
                color="#999"
              />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Confirm New Password</Text>
          <View style={styles.inputWithIcon}>
            <Ionicons
              name="lock-closed-outline"
              size={18}
              color="#999"
              style={styles.inputIcon}
            />
            <TextInput
              secureTextEntry={!showConfirmPassword}
              style={styles.inputWithPadding}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                size={18}
                color="#999"
              />
            </TouchableOpacity>
          </View>
        </View>
        <TouchableOpacity style={styles.primaryButton} activeOpacity={0.8}>
          <Text style={styles.primaryButtonText}>Update Password</Text>
        </TouchableOpacity>
      </View>

      {/* Two-Factor Authentication */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Two-Factor Authentication</Text>
        <View style={styles.switchRow}>
          <View style={styles.switchTextContainer}>
            <Text style={styles.switchTitle}>
              Enhance your account security with 2FA
            </Text>
            <Text style={styles.switchDescription}>
              Receive a verification code on your phone when logging in
            </Text>
          </View>
          <Switch
            value={twoFactorEnabled}
            onValueChange={setTwoFactorEnabled}
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
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Privacy Settings</Text>

        {/* Profile Visibility */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Profile Visibility</Text>
          <View style={styles.selectContainer}>
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
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Notification Preferences</Text>

        <View style={styles.toggleList}>
          <View style={styles.switchRow}>
            <View style={styles.switchTextContainer}>
              <Text style={styles.switchTitle}>Push Notifications</Text>
              <Text style={styles.switchDescription}>
                Receive notifications on your device
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
              <Text style={styles.switchTitle}>Email Notifications</Text>
              <Text style={styles.switchDescription}>
                Receive notifications via email
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
              <Text style={styles.switchTitle}>SMS Notifications</Text>
              <Text style={styles.switchDescription}>
                Receive notifications via text message
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

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Notification Types</Text>

        <View style={styles.toggleList}>
          <View style={styles.switchRow}>
            <View style={styles.switchTextContainer}>
              <Text style={styles.switchTitle}>New Listings</Text>
              <Text style={styles.switchDescription}>
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
              <Text style={styles.switchTitle}>Price Alerts</Text>
              <Text style={styles.switchDescription}>
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
              <Text style={styles.switchTitle}>Messages</Text>
              <Text style={styles.switchDescription}>
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
              <Text style={styles.switchTitle}>Promotions</Text>
              <Text style={styles.switchDescription}>
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
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Appearance</Text>

        <View style={styles.switchRow}>
          <View style={styles.switchTextContainer}>
            <Text style={styles.switchTitle}>Dark Mode</Text>
            <Text style={styles.switchDescription}>
              Switch between light and dark theme
            </Text>
          </View>
          <Switch
            value={darkMode}
            onValueChange={setDarkMode}
            trackColor={{ false: "#E5E7EB", true: "#1E7C7E" }}
            thumbColor={darkMode ? "#FFFFFF" : "#F4F4F5"}
          />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Language & Currency</Text>
        <TouchableOpacity style={styles.optionRow} activeOpacity={0.8}>
          <View style={styles.optionLeft}>
            <Ionicons name="language-outline" size={22} color="#1E7C7E" />
            <Text style={styles.optionText}>Language</Text>
          </View>
          <View style={styles.optionRight}>
            <Text style={styles.optionValue}>English (US)</Text>
            <Ionicons name="chevron-forward" size={18} color="#999" />
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.optionRow} activeOpacity={0.8}>
          <View style={styles.optionLeft}>
            <Ionicons name="cash-outline" size={22} color="#1E7C7E" />
            <Text style={styles.optionText}>Currency</Text>
          </View>
          <View style={styles.optionRight}>
            <Text style={styles.optionValue}>USD - US Dollar</Text>
            <Ionicons name="chevron-forward" size={18} color="#999" />
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Support</Text>
        <TouchableOpacity style={styles.optionRow} activeOpacity={0.8}>
          <View style={styles.optionLeft}>
            <Ionicons name="help-circle-outline" size={22} color="#1E7C7E" />
            <Text style={styles.optionText}>Help & Support</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#999" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.optionRow} activeOpacity={0.8}>
          <View style={styles.optionLeft}>
            <Ionicons
              name="information-circle-outline"
              size={22}
              color="#1E7C7E"
            />
            <Text style={styles.optionText}>About</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#999" />
        </TouchableOpacity>
      </View>
    </>
  );

  // State for billing address
  const [billingAddress, setBillingAddress] = useState({
    street: "123 Main St",
    city: "New York",
    state: "NY",
    zip: "10001",
  });

  const renderPaymentTab = () => (
    <>
      {/* Saved Cards */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Saved Cards</Text>

        {/* VISA Card */}
        <View style={[styles.cardItem, styles.visaCard]}>
          <View style={styles.cardInfo}>
            <View style={styles.cardIcon}>
              <Ionicons name="card" size={32} color="white" />
            </View>
            <View style={styles.cardDetails}>
              <Text style={styles.cardType}>VISA</Text>
              <Text style={styles.cardNumber}>**** **** **** 4532</Text>
              <View style={styles.cardMeta}>
                <Text style={styles.cardExpiry}>Expires 12/25</Text>
              </View>
            </View>
          </View>
          <View style={styles.cardBadge}>
            <Text style={styles.cardBadgeText}>Default</Text>
          </View>
        </View>

        {/* Mastercard */}
        <View style={[styles.cardItem, styles.mastercard]}>
          <View style={styles.cardInfo}>
            <View style={styles.cardIcon}>
              <Ionicons name="card" size={32} color="white" />
            </View>
            <View style={styles.cardDetails}>
              <Text style={styles.cardType}>Mastercard</Text>
              <Text style={styles.cardNumber}>**** **** **** 8920</Text>
              <View style={styles.cardMeta}>
                <Text style={styles.cardExpiry}>Expires 08/26</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity style={styles.setDefaultButton} activeOpacity={0.8}>
            <Text style={styles.setDefaultButtonText}>Set Default</Text>
          </TouchableOpacity>
        </View>

        {/* Add New Card */}
        <TouchableOpacity style={styles.addCardButton} activeOpacity={0.8}>
          <Ionicons name="add" size={24} color="#1E7C7E" />
          <Text style={styles.addCardText}>Add New Payment Method</Text>
        </TouchableOpacity>
      </View>

      {/* Billing Address */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Billing Address</Text>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Street Address</Text>
          <TextInput
            value={billingAddress.street}
            onChangeText={(text) =>
              setBillingAddress({ ...billingAddress, street: text })
            }
            style={styles.input}
          />
        </View>
        <View style={styles.formGroup}>
          <Text style={styles.label}>City</Text>
          <TextInput
            value={billingAddress.city}
            onChangeText={(text) =>
              setBillingAddress({ ...billingAddress, city: text })
            }
            style={styles.input}
          />
        </View>
        <View style={styles.formRow}>
          <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.label}>State</Text>
            <TextInput
              value={billingAddress.state}
              onChangeText={(text) =>
                setBillingAddress({ ...billingAddress, state: text })
              }
              style={styles.input}
            />
          </View>
          <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
            <Text style={styles.label}>ZIP Code</Text>
            <TextInput
              value={billingAddress.zip}
              onChangeText={(text) =>
                setBillingAddress({ ...billingAddress, zip: text })
              }
              style={styles.input}
            />
          </View>
        </View>
        <TouchableOpacity style={styles.primaryButton} activeOpacity={0.8}>
          <Text style={styles.primaryButtonText}>Save Address</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  const renderHelpTab = () => (
    <>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Help Resources</Text>
        <TouchableOpacity style={styles.optionRow} activeOpacity={0.8}>
          <View style={styles.optionLeft}>
            <Ionicons name="help-circle-outline" size={22} color="#1E7C7E" />
            <Text style={styles.optionText}>FAQ & Help Center</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#999" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.optionRow} activeOpacity={0.8}>
          <View style={styles.optionLeft}>
            <Ionicons name="chatbubble-outline" size={22} color="#1E7C7E" />
            <Text style={styles.optionText}>Contact Support</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#999" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.optionRow} activeOpacity={0.8}>
          <View style={styles.optionLeft}>
            <Ionicons name="people-outline" size={22} color="#1E7C7E" />
            <Text style={styles.optionText}>Community Guidelines</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#999" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.optionRow} activeOpacity={0.8}>
          <View style={styles.optionLeft}>
            <Ionicons name="document-text-outline" size={22} color="#1E7C7E" />
            <Text style={styles.optionText}>Terms of Service</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#999" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.optionRow} activeOpacity={0.8}>
          <View style={styles.optionLeft}>
            <Ionicons
              name="shield-checkmark-outline"
              size={22}
              color="#1E7C7E"
            />
            <Text style={styles.optionText}>Privacy Policy</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#999" />
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>About</Text>
        <View style={styles.aboutInfo}>
          <Text style={styles.aboutLabel}>App Version</Text>
          <Text style={styles.aboutValue}>2.5.1</Text>
        </View>
        <View style={styles.aboutInfo}>
          <Text style={styles.aboutLabel}>Build Number</Text>
          <Text style={styles.aboutValue}>20240115</Text>
        </View>
        <View style={styles.aboutInfo}>
          <Text style={styles.aboutLabel}>Copyright</Text>
          <Text style={styles.aboutValue}>
            © 2024 Scrapit. All rights reserved.
          </Text>
        </View>
        <TouchableOpacity style={styles.secondaryButton} activeOpacity={0.8}>
          <Text style={styles.secondaryButtonText}>Check for Updates</Text>
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
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={["#031d1e", "#063537", "#0D5A5B", "#1E7C7E"]}
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
          <Text style={styles.headerTitle}>Settings</Text>
        </View>
        <View style={styles.headerRight} />
      </LinearGradient>

      {/* Single ScrollView for entire content */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Menu Options - Vertical List */}
        <View style={styles.menuContainer}>
          <View style={styles.menuGrid}>
            {menuItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                onPress={() => setActiveTab(item.id)}
                style={[
                  styles.menuCard,
                  activeTab === item.id && styles.activeMenuCard,
                ]}
                activeOpacity={0.8}
              >
                <View style={styles.menuCardLeft}>
                  <Ionicons
                    name={item.icon as any}
                    size={22}
                    color={activeTab === item.id ? "#1E7C7E" : "#6B7280"}
                  />
                  <Text
                    style={[
                      styles.menuCardText,
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
            {/* Logout Button */}
            <TouchableOpacity style={styles.logoutButton} activeOpacity={0.8}>
              <Ionicons name="arrow-back" size={20} color="#EF4444" />
              <Text style={styles.logoutText}>Log Out</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Content Area */}
        <View ref={contentAreaRef} style={styles.contentArea}>
          {renderContent()}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

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
  headerLogoContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  headerRight: {
    width: 40,
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
});

export default SettingsScreen;
