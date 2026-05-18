import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";
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

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [agreeError, setAgreeError] = useState("");
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Animation values
  const cardScale = useRef(new Animated.Value(0.9)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslateY = useRef(new Animated.Value(-50)).current;

  const formOpacity = useRef(new Animated.Value(0)).current;
  const formTranslateY = useRef(new Animated.Value(50)).current;

  const inputAnims = useRef([
    new Animated.Value(-50), // Email
    new Animated.Value(-50), // Password
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
    ]).start();

    Animated.sequence([
      Animated.delay(400),
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
      Animated.stagger(150, [
        Animated.spring(inputAnims[0], {
          toValue: 0,
          friction: 7,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.spring(inputAnims[1], {
          toValue: 0,
          friction: 7,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.spring(inputAnims[2], {
          toValue: 0,
          friction: 7,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.spring(inputAnims[3], {
          toValue: 1,
          friction: 3,
          tension: 20,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [
    cardOpacity,
    cardScale,
    cardTranslateY,
    formOpacity,
    formTranslateY,
    inputAnims,
  ]);

  const triggerShake = (index: number) => {
    Animated.sequence([
      Animated.timing(inputAnims[index], {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(inputAnims[index], {
        toValue: -10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(inputAnims[index], {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(inputAnims[index], {
        toValue: 0,
        duration: 50,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleLogin = async () => {
    setEmailError("");
    setPasswordError("");
    setAgreeError("");
    let hasError = false;

    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setEmailError("Valid email is required");
      triggerShake(0);
      hasError = true;
    }
    if (!password) {
      setPasswordError("Password is required");
      triggerShake(1);
      hasError = true;
    }
    if (!rememberMe) {
      setAgreeError("You must agree to Terms and Conditions");
      triggerShake(2);
      hasError = true;
    }

    if (hasError) return;

    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.replace("/home");
    } catch (error: any) {
      console.error(error);
      setEmailError("Invalid credentials or user not found");
      triggerShake(0);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={[
            styles.topCard,
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
              <ShuffleText text="Hey," delay={300} style={styles.greeting} />
              <ShuffleText
                text="Welcome"
                delay={600}
                style={styles.welcomeText}
              />
              <ShuffleText
                text="back"
                delay={1000}
                style={styles.welcomeText}
              />
            </View>
          </LinearGradient>
        </Animated.View>

        <Animated.View
          style={[
            styles.formContainer,
            {
              opacity: formOpacity,
              transform: [{ translateY: formTranslateY }],
            },
          ]}
        >
          {/* Email Input */}
          <Animated.View
            style={[
              styles.inputWrapper,
              {
                transform: [{ translateX: inputAnims[0] }],
                marginBottom: emailError ? 5 : 15,
              },
            ]}
          >
            <Ionicons
              name="mail-outline"
              size={20}
              color="#6B9A9C"
              style={styles.inputIcon}
            />
            <TextInput
              style={[
                styles.input,
                focusedInput === "email" && styles.inputFocused,
                emailError ? styles.inputError : null,
              ]}
              placeholder="Email Address"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setEmailError("");
              }}
              onFocus={() => setFocusedInput("email")}
              onBlur={() => setFocusedInput(null)}
              placeholderTextColor="#8F8F8F"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </Animated.View>
          {emailError ? (
            <Text style={styles.errorText}>{emailError}</Text>
          ) : null}

          {/* Password Input */}
          <Animated.View
            style={[
              styles.inputWrapper,
              {
                transform: [{ translateX: inputAnims[1] }],
                marginBottom: passwordError ? 5 : 15,
              },
            ]}
          >
            <Ionicons
              name="lock-closed-outline"
              size={20}
              color="#6B9A9C"
              style={styles.inputIcon}
            />
            <TextInput
              style={[
                styles.input,
                { paddingRight: 50 },
                focusedInput === "password" && styles.inputFocused,
                passwordError ? styles.inputError : null,
              ]}
              placeholder="Password"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                setPasswordError("");
              }}
              onFocus={() => setFocusedInput("password")}
              onBlur={() => setFocusedInput(null)}
              placeholderTextColor="#8F8F8F"
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowPassword(!showPassword)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={22}
                color="#6B9A9C"
              />
            </TouchableOpacity>
          </Animated.View>
          {passwordError ? (
            <Text style={styles.errorText}>{passwordError}</Text>
          ) : null}

          {/* Checkbox */}
          <Animated.View
            style={[
              styles.checkboxRow,
              {
                transform: [{ translateX: inputAnims[2] }],
                marginBottom: agreeError ? 5 : 20,
                paddingLeft: 20,
              },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.checkbox,
                rememberMe && styles.checked,
                agreeError ? styles.checkboxError : null,
              ]}
              onPress={() => {
                setRememberMe(!rememberMe);
                setAgreeError("");
              }}
              activeOpacity={0.7}
            >
              {rememberMe && (
                <Ionicons name="checkmark" size={14} color="#fff" />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setRememberMe(!rememberMe);
                setAgreeError("");
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.rememberText}>
                I agree to the Terms and Conditions
              </Text>
            </TouchableOpacity>
          </Animated.View>
          {agreeError ? (
            <Text style={[styles.errorText, { marginBottom: 15 }]}>
              {agreeError}
            </Text>
          ) : null}

          <Animated.View
            style={{ transform: [{ scale: inputAnims[3] }], marginTop: 10 }}
          >
            <CustomButton
              title="Login"
              variant="primary"
              onPress={handleLogin}
              style={styles.loginBtnCustom}
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
            onPress={() => console.log("Google Sign In")}
            style={styles.googleButton}
          />

          <View style={styles.footerLinks}>
            <TouchableOpacity
              onPress={() => router.push("/sign-up")}
              activeOpacity={0.7}
            >
              <Text style={styles.signupText}>
                Don't have an account?{" "}
                <Text style={styles.signupLink}>Sign Up</Text>
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push("/forgot-password")}
              activeOpacity={0.7}
              style={styles.forgotBottomContainer}
            >
              <Text style={styles.forgotBottomText}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#D8EEF0" },
  scrollContainer: { flexGrow: 1 },
  topCard: {
    backgroundColor: "#0D4C4E",
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: "hidden",
    elevation: 10,
    shadowColor: "#1E7C7E",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
  },
  gradientHeader: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 },
  textContainer: { height: 140, justifyContent: "center" },
  greeting: { color: "#fff", fontSize: 20, fontWeight: "300", marginBottom: 4 },
  welcomeText: {
    color: "#fff",
    fontSize: 42,
    fontWeight: "700",
    lineHeight: 48,
  },
  formContainer: {
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
  inputWrapper: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    flex: 1,
    backgroundColor: "#EAF6F7",
    borderRadius: 25,
    paddingLeft: 45,
    paddingRight: 20,
    height: 52,
    borderWidth: 1,
    borderColor: "#9AC6C8",
    fontSize: 15,
    color: "#000",
  },
  inputIcon: { position: "absolute", left: 16, zIndex: 10 },
  eyeIcon: { position: "absolute", right: 16, zIndex: 999, padding: 4 },
  inputError: { borderColor: "#E74C3C", borderWidth: 1.5 },
  inputFocused: { borderColor: "#1E7C7E", borderWidth: 2 },
  errorText: { color: "#E74C3C", fontSize: 12, marginTop: 4, marginLeft: 16 },
  checkboxRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: "#6B9A9C",
    marginRight: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  checked: { backgroundColor: "#1E7C7E", borderColor: "#1E7C7E" },
  checkboxError: { borderColor: "#E74C3C" },
  rememberText: { fontSize: 14, color: "#5A5A5A" },
  loginBtnCustom: { height: 52 },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },
  divider: { flex: 1, height: 1, backgroundColor: "#D0D0D0" },
  dividerText: {
    marginHorizontal: 15,
    color: "#8F8F8F",
    fontSize: 14,
    fontWeight: "500",
  },
  googleButton: { marginBottom: 10 },
  footerLinks: { marginTop: 20, alignItems: "center" },
  signupText: { color: "#5A5A5A", fontSize: 14 },
  signupLink: { fontWeight: "700", color: "#1E7C7E" },
  forgotBottomContainer: { marginTop: 12 },
  forgotBottomText: { fontSize: 14, fontWeight: "600", color: "#6B9A9C" },
});
