import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Animated,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  // Dimensions,
  TextStyle,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

interface ShuffleTextProps {
  text: string;
  delay?: number;
  style?: TextStyle | TextStyle[];
}

// Shuffle Text Component for React Native
const ShuffleText = ({ text, delay = 0, style = {} }: ShuffleTextProps) => {
  const [displayText, setDisplayText] = useState(text.split("").map(() => " "));
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ@#$%&*";
  const intervalRef = useRef<any>(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      let iteration = 0;

      intervalRef.current = setInterval(() => {
        setDisplayText((prev) =>
          text.split("").map((letter, index) => {
            if (letter === " " || letter === "\n") return letter;
            if (index < iteration) return text[index];
            return chars[Math.floor(Math.random() * chars.length)];
          })
        );

        iteration += 0.25;

        if (iteration >= text.length) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setDisplayText(text.split(""));
        }
      }, 30);
    }, delay);

    return () => {
      clearTimeout(timeout);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [text, delay]);

  return <Text style={style}>{displayText.join("")}</Text>;
};

export default function AnimatedLoginScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [phoneError, setPhoneError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  // Animation values
  const cardScale = useRef(new Animated.Value(0.9)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslateY = useRef(new Animated.Value(-50)).current;

  const formOpacity = useRef(new Animated.Value(0)).current;
  const formTranslateY = useRef(new Animated.Value(50)).current;

  const inputAnims = useRef([
    new Animated.Value(-50), // Phone
    new Animated.Value(-50), // Password
    new Animated.Value(-50), // Checkbox/Terms
    new Animated.Value(0.8), // Button (scale)
    new Animated.Value(0), // Sign up link opacity
  ]).current;

  useEffect(() => {
    // Sequence of animations
    Animated.parallel([
      // Top Card Animation
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

    // Form Container Animation
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
      // Input stagger
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
          friction: 8,
          tension: 50,
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

  const handlePhoneChange = (text: string) => {
    if (phoneError) setPhoneError("");

    // Remove all non-digits
    let digits = text.replace(/\D/g, "");

    // Normalize: if it starts with 92, treat it as the country code
    if (digits.startsWith("92")) {
      digits = digits.slice(2);
    }

    // If it starts with 0 (like 0300), remove the leading 0
    if (digits.startsWith("0")) {
      digits = digits.slice(1);
    }

    // Format as +92 + remaining digits
    if (digits.length > 0) {
      setPhone("+92" + digits);
    } else {
      setPhone("");
    }
  };

  const handleLogin = () => {
    setPhoneError("");
    setPasswordError("");
    let hasError = false;

    if (!phone) {
      setPhoneError("Phone number is required");
      hasError = true;
    } else if (phone.length < 13) {
      setPhoneError("Please enter a valid Pakistani phone number");
      hasError = true;
    }

    if (!password) {
      setPasswordError("Password is required");
      hasError = true;
    }

    if (hasError) return;
    router.push("/");
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
        {/* Top Card */}
        <Animated.View
          style={[
            styles.topCard,
            {
              opacity: cardOpacity,
              transform: [{ translateY: cardTranslateY }, { scale: cardScale }],
            },
          ]}
        >
          <View style={styles.textContainer}>
            <ShuffleText text="Hey," delay={300} style={styles.greeting} />
            <ShuffleText
              text="Welcome"
              delay={600}
              style={styles.welcomeText}
            />
            <ShuffleText text="back" delay={1000} style={styles.welcomeText} />
          </View>
        </Animated.View>

        {/* Form Container */}
        <Animated.View
          style={[
            styles.formContainer,
            {
              opacity: formOpacity,
              transform: [{ translateY: formTranslateY }],
            },
          ]}
        >
          {/* Phone Input */}
          <Animated.View style={{ transform: [{ translateX: inputAnims[0] }] }}>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="call-outline"
                size={20}
                color="#6B9A9C"
                style={styles.inputIcon}
              />
              <TextInput
                style={[
                  styles.input,
                  focusedInput === "phone" && styles.inputFocused,
                  phoneError ? styles.inputError : null,
                ]}
                placeholder="Phone No."
                value={phone}
                onChangeText={handlePhoneChange}
                onFocus={() => setFocusedInput("phone")}
                onBlur={() => setFocusedInput(null)}
                placeholderTextColor="#8F8F8F"
                keyboardType="phone-pad"
                maxLength={13}
              />
            </View>
            {phoneError ? (
              <Text style={styles.errorText}>{phoneError}</Text>
            ) : null}
          </Animated.View>

          {/* Password Input */}
          <Animated.View
            style={{
              transform: [{ translateX: inputAnims[1] }],
              marginTop: 16,
            }}
          >
            <View style={styles.inputWrapper}>
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
                  if (passwordError) setPasswordError("");
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
                  size={20}
                  color="#6B9A9C"
                />
              </TouchableOpacity>
            </View>
            {passwordError ? (
              <Text style={styles.errorText}>{passwordError}</Text>
            ) : null}
          </Animated.View>

          {/* Checkbox */}
          <Animated.View
            style={{
              transform: [{ translateX: inputAnims[2] }],
              marginTop: 20,
            }}
          >
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setRememberMe(!rememberMe)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, rememberMe && styles.checked]}>
                {rememberMe && (
                  <Ionicons name="checkmark" size={14} color="#fff" />
                )}
              </View>
              <Text style={styles.rememberText}>
                I agree to the Terms & Privacy
              </Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Login Button */}
          <Animated.View
            style={{
              transform: [
                {
                  scale: inputAnims[3],
                },
              ],
              marginTop: 10,
            }}
          >
            <TouchableOpacity
              style={styles.loginBtn}
              onPress={handleLogin}
              activeOpacity={0.8}
            >
              <Text style={styles.loginBtnText}>Login</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Sign Up Link */}
          <TouchableOpacity
            onPress={() => router.push("/sign-up")}
            activeOpacity={0.7}
            style={styles.signupContainer}
          >
            <Text style={styles.signupText}>
              Don&apos;t have an account?{" "}
              <Text style={styles.signupLink}>Sign Up</Text>
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#D8EEF0",
  },
  scrollContainer: {
    flexGrow: 1,
  },
  topCard: {
    backgroundColor: "#1E7C7E",
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
    shadowColor: "#1E7C7E",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
  },
  textContainer: {
    height: 140,
    justifyContent: "center",
  },
  greeting: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "300",
    marginBottom: 4,
  },
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
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
  inputIcon: {
    position: "absolute",
    left: 16,
    zIndex: 10,
  },
  eyeIcon: {
    position: "absolute",
    right: 16,
    zIndex: 10,
    padding: 4,
  },
  inputError: {
    borderColor: "#E74C3C",
    borderWidth: 1.5,
  },
  inputFocused: {
    borderColor: "#1E7C7E",
    borderWidth: 2,
    shadowColor: "#1E7C7E",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  errorText: {
    color: "#E74C3C",
    fontSize: 12,
    marginTop: 4,
    marginLeft: 16,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
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
  checked: {
    backgroundColor: "#1E7C7E",
    borderColor: "#1E7C7E",
  },
  rememberText: {
    fontSize: 14,
    color: "#5A5A5A",
  },
  loginBtn: {
    backgroundColor: "#1E7C7E",
    borderRadius: 25,
    height: 52,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#1E7C7E",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  loginBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 17,
  },
  signupContainer: {
    marginTop: 20,
    alignItems: "center",
  },
  signupText: {
    color: "#5A5A5A",
    fontSize: 14,
  },
  signupLink: {
    fontWeight: "700",
    color: "#1E7C7E",
  },
});
