import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  createUserWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { auth } from "@/firebaseConfig";
import { CustomButton } from "@/components/ui/CustomButton";
import { Ionicons } from "@expo/vector-icons";
import { ShuffleText } from "@/components/ui/ShuffleText";



export default function SignUpScreen() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agree, setAgree] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Refs for TextInput focus management
  const nameInputRef = useRef<TextInput>(null);
  const emailInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const confirmPasswordInputRef = useRef<TextInput>(null);

  // Animation values
  const cardScale = useRef(new Animated.Value(0.9)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslateY = useRef(new Animated.Value(-50)).current;

  const formOpacity = useRef(new Animated.Value(0)).current;
  const formTranslateY = useRef(new Animated.Value(50)).current;

  const inputAnims = useRef([
    new Animated.Value(-50), // Name
    new Animated.Value(-50), // Email
    new Animated.Value(-50), // Password
    new Animated.Value(-50), // Confirm Password
    new Animated.Value(-50), // Checkbox/Terms
    new Animated.Value(0.5), // Button (scale)
  ]).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(cardTranslateY, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(cardScale, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(300),
        Animated.parallel([
          Animated.timing(formOpacity, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(formTranslateY, {
            toValue: 0,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      ]),
      Animated.sequence([
        Animated.delay(500),
        Animated.stagger(80, [
          Animated.spring(inputAnims[0], { toValue: 0, friction: 7, tension: 40, useNativeDriver: true }),
          Animated.spring(inputAnims[1], { toValue: 0, friction: 7, tension: 40, useNativeDriver: true }),
          Animated.spring(inputAnims[2], { toValue: 0, friction: 7, tension: 40, useNativeDriver: true }),
          Animated.spring(inputAnims[3], { toValue: 0, friction: 7, tension: 40, useNativeDriver: true }),
          Animated.spring(inputAnims[4], { toValue: 0, friction: 7, tension: 40, useNativeDriver: true }),
          Animated.spring(inputAnims[5], { toValue: 1, friction: 3, tension: 20, useNativeDriver: true }),
        ]),
      ]),
    ]).start();
  }, []);

  const triggerShake = (index: number) => {
    Animated.sequence([
      Animated.timing(inputAnims[index], { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(inputAnims[index], { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(inputAnims[index], { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(inputAnims[index], { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handleSignUp = async () => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = "Name is required";
      triggerShake(0);
    }
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Valid email is required";
      triggerShake(1);
    }
    if (!password || password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
      triggerShake(2);
    }
    if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
      triggerShake(3);
    }
    if (!agree) {
      newErrors.agree = "You must agree to Terms and Conditions";
      triggerShake(4);
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setIsLoading(true);
    try {
      // 1. Create user in Firebase
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      try {
        await updateProfile(userCredential.user, { displayName: name });
      } catch (profileError) {
        console.warn("Failed to update profile name, continuing signup:", profileError);
      }

      // 2. Generate 6-digit OTP
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

      // 3. Send OTP via EmailJS REST API
      const response = await fetch(
        "https://api.emailjs.com/api/v1.0/email/send",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            service_id: "service_c44lf2l",
            template_id: "template_tdf9f4n",
            user_id: "x33s5G84zCeXfGG5W",
            accessToken: "uOA3Grq83yiDUTognUaZq",
            template_params: {
              email: email,
              passcode: otpCode,
            },
          }),
        }
      );
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text);
      }
      // 4. Navigate to verification screen
      router.push({
        pathname: "/verification",
        params: { email, otp: otpCode },
      });
    } catch (error: any) {
      console.error(error);
      setErrors({ email: error.message });
      triggerShake(1);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={[
              styles.card,
              {
                opacity: cardOpacity,
                transform: [{ translateY: cardTranslateY }, { scale: cardScale }],
              },
            ]}
          >
            <LinearGradient
              colors={["#0D4C4E", "#1E7C7E", "#3A9EA0"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gradientHeader}
            >
              <View style={styles.textContainer}>
                <ShuffleText text="Create" delay={300} style={styles.heading} />
                <ShuffleText text="Account" delay={600} style={styles.heading} />
                <ShuffleText text="Sign up to get started" delay={1000} style={styles.subtitle} />
              </View>
            </LinearGradient>
          </Animated.View>

          <Animated.View
            style={[
              styles.form,
              {
                opacity: formOpacity,
                transform: [{ translateY: formTranslateY }],
              },
            ]}
          >
            {/* Name Input */}
            <Animated.View style={{ transform: [{ translateX: inputAnims[0] }] }}>
              <View style={styles.inputContainer}>
                <View style={styles.inputWrapper}>
                  <TextInput
                    ref={nameInputRef}
                    style={[styles.input, focusedInput === "name" && styles.inputFocused, errors.name && styles.inputError]}
                    placeholder="Full Name"
                    value={name}
                    onChangeText={(text) => {
                      setName(text);
                      if (errors.name) setErrors({ ...errors, name: "" });
                    }}
                    onFocus={() => setFocusedInput("name")}
                    onBlur={() => setFocusedInput(null)}
                    placeholderTextColor="#8F8F8F"
                    autoCapitalize="words"
                    returnKeyType="next"
                    onSubmitEditing={() => emailInputRef.current?.focus()}
                  />
                  <Ionicons name="person-outline" size={20} color="#6B9A9C" style={styles.icon} />
                </View>
                {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}
              </View>
            </Animated.View>

            {/* Email Input */}
            <Animated.View style={{ transform: [{ translateX: inputAnims[1] }] }}>
              <View style={styles.inputContainer}>
                <View style={styles.inputWrapper}>
                  <TextInput
                    ref={emailInputRef}
                    style={[styles.input, focusedInput === "email" && styles.inputFocused, errors.email && styles.inputError]}
                    placeholder="Email Address"
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text);
                      if (errors.email) setErrors({ ...errors, email: "" });
                    }}
                    onFocus={() => setFocusedInput("email")}
                    onBlur={() => setFocusedInput(null)}
                    placeholderTextColor="#8F8F8F"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    returnKeyType="next"
                    onSubmitEditing={() => passwordInputRef.current?.focus()}
                  />
                  <Ionicons name="mail-outline" size={20} color="#6B9A9C" style={styles.icon} />
                </View>
                {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
              </View>
            </Animated.View>

            {/* Password Input */}
            <Animated.View style={{ transform: [{ translateX: inputAnims[2] }] }}>
              <View style={styles.inputContainer}>
                <View style={styles.passwordContainer}>
                  <TextInput
                    ref={passwordInputRef}
                    style={[styles.passwordInput, focusedInput === "password" && styles.inputFocused, errors.password && styles.inputError]}
                    placeholder="Password"
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={(text) => {
                      setPassword(text);
                      if (errors.password) setErrors({ ...errors, password: "" });
                    }}
                    onFocus={() => setFocusedInput("password")}
                    onBlur={() => setFocusedInput(null)}
                    placeholderTextColor="#8F8F8F"
                    autoCapitalize="none"
                    returnKeyType="next"
                    onSubmitEditing={() => confirmPasswordInputRef.current?.focus()}
                  />
                  <Ionicons name="lock-closed-outline" size={20} color="#6B9A9C" style={styles.icon} />
                  <TouchableOpacity
                    style={styles.eyeIcon}
                    onPress={() => setShowPassword(!showPassword)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={22} color="#6B9A9C" />
                  </TouchableOpacity>
                </View>
                {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
              </View>
            </Animated.View>

            {/* Confirm Password Input */}
            <Animated.View style={{ transform: [{ translateX: inputAnims[3] }] }}>
              <View style={styles.inputContainer}>
                <View style={styles.passwordContainer}>
                  <TextInput
                    ref={confirmPasswordInputRef}
                    style={[styles.passwordInput, focusedInput === "confirmPassword" && styles.inputFocused, errors.confirmPassword && styles.inputError]}
                    placeholder="Confirm Password"
                    secureTextEntry={!showPassword}
                    value={confirmPassword}
                    onChangeText={(text) => {
                      setConfirmPassword(text);
                      if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: "" });
                    }}
                    onFocus={() => setFocusedInput("confirmPassword")}
                    onBlur={() => setFocusedInput(null)}
                    placeholderTextColor="#8F8F8F"
                    autoCapitalize="none"
                    returnKeyType="done"
                    onSubmitEditing={handleSignUp}
                  />
                  <Ionicons name="lock-closed-outline" size={20} color="#6B9A9C" style={styles.icon} />
                  <TouchableOpacity
                    style={styles.eyeIcon}
                    onPress={() => setShowPassword(!showPassword)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={22} color="#6B9A9C" />
                  </TouchableOpacity>
                </View>
                {errors.confirmPassword ? <Text style={styles.errorText}>{errors.confirmPassword}</Text> : null}
              </View>
            </Animated.View>

            <Animated.View style={{ transform: [{ translateX: inputAnims[4] }] }}>
              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => {
                  setAgree(!agree);
                  if (errors.agree) setErrors({ ...errors, agree: "" });
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, agree && styles.checked]}>
                  {agree && <Ionicons name="checkmark" size={14} color="#fff" />}
                </View>
                <Text style={styles.checkboxText} numberOfLines={1}>
                  I agree to the Terms and Conditions
                </Text>
              </TouchableOpacity>
              {errors.agree ? <Text style={styles.errorText}>{errors.agree}</Text> : null}
            </Animated.View>

            <Animated.View style={{ transform: [{ scale: inputAnims[5] }], marginTop: 5 }}>
              <CustomButton
                title="Sign Up"
                variant="primary"
                onPress={handleSignUp}
                style={styles.signupBtnCustom}
                loading={isLoading}
              />
            </Animated.View>

            <View style={styles.dividerContainer}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.divider} />
            </View>

            <CustomButton
              title="Continue with Google"
              variant="google"
              icon="logo-google"
              onPress={() => console.log("Google Sign Up")}
              style={styles.googleButton}
            />

            <TouchableOpacity onPress={() => router.push("/log-in")} activeOpacity={0.7}>
              <Text style={styles.footerText}>
                Already have an account? <Text style={styles.footerLink}>Login</Text>
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#D8EEF0" },
  scrollContainer: { flexGrow: 1, paddingBottom: 40 },
  card: {
    backgroundColor: "transparent",
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: "hidden",
    elevation: 10,
    shadowColor: "#1E7C7E",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
  },
  gradientHeader: { paddingHorizontal: 24, paddingTop: 50, paddingBottom: 30, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  textContainer: { height: 100, justifyContent: "center" },
  heading: { color: "#fff", fontSize: 32, fontWeight: "700", lineHeight: 38 },
  subtitle: { color: "rgba(255, 255, 255, 0.7)", fontSize: 14, marginTop: 4 },
  form: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 30,
    padding: 24,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  inputContainer: { marginBottom: 15 },
  inputWrapper: { position: "relative" },
  input: {
    backgroundColor: "#EAF6F7",
    borderRadius: 25,
    paddingLeft: 40,
    paddingRight: 20,
    height: 52,
    borderWidth: 1,
    borderColor: "#9AC6C8",
    fontSize: 15,
    color: "#000",
  },
  inputError: { borderColor: "#FF5252", backgroundColor: "#FFF8F8" },
  passwordContainer: { position: "relative", width: "100%" },
  passwordInput: {
    width: "100%",
    backgroundColor: "#EAF6F7",
    borderRadius: 25,
    paddingLeft: 40,
    paddingRight: 50,
    height: 52,
    borderWidth: 1,
    borderColor: "#9AC6C8",
    fontSize: 15,
    color: "#000",
  },
  icon: { position: "absolute", left: 12, top: 16, zIndex: 10 },
  eyeIcon: { position: "absolute", right: 16, top: 16, zIndex: 999 },
  inputFocused: { borderColor: "#1E7C7E", borderWidth: 2 },
  errorText: { color: "#FF5252", fontSize: 12, marginTop: 4, marginLeft: 16 },
  checkboxContainer: { flexDirection: "row", alignItems: "center", marginBottom: 10, paddingLeft: 20 },
  checkbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 1.5, borderColor: "#6B9A9C", marginRight: 10, justifyContent: "center", alignItems: "center" },
  checked: { backgroundColor: "#1E7C7E", borderColor: "#1E7C7E" },
  checkboxText: { color: "#5A5A5A", fontSize: 14 },
  signupBtnCustom: { height: 52, borderRadius: 25 },
  dividerContainer: { flexDirection: "row", alignItems: "center", marginVertical: 20 },
  divider: { flex: 1, height: 1, backgroundColor: "#D0D0D0" },
  dividerText: { marginHorizontal: 15, color: "#8F8F8F", fontSize: 14, fontWeight: "500" },
  googleButton: { marginBottom: 10 },
  footerText: { textAlign: "center", color: "#5A5A5A", fontSize: 14, marginTop: 20 },
  footerLink: { fontWeight: "700", color: "#1E7C7E" },
});
