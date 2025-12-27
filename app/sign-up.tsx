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

export default function AnimatedSignUpScreen() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [rePassword, setRePassword] = useState("");
  const [agree, setAgree] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  // Validation error states
  const [nameError, setNameError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [rePasswordError, setRePasswordError] = useState<string | null>(null);
  const [agreeError, setAgreeError] = useState<string | null>(null);

  // Refs for TextInput focus management
  const nameInputRef = useRef<TextInput>(null);
  const phoneInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const rePasswordInputRef = useRef<TextInput>(null);

  // Animation values
  const cardScale = useRef(new Animated.Value(0.9)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslateY = useRef(new Animated.Value(-50)).current;

  const formOpacity = useRef(new Animated.Value(0)).current;
  const formTranslateY = useRef(new Animated.Value(50)).current;

  const inputAnims = useRef([
    new Animated.Value(-50), // Name
    new Animated.Value(-50), // Phone
    new Animated.Value(-50), // Password
    new Animated.Value(-50), // Re-Password
    new Animated.Value(-50), // Checkbox/Terms
    new Animated.Value(0.5), // Button (scale)
  ]).current;

  useEffect(() => {
    // Start all animations in parallel for a more fluid feel
    Animated.parallel([
      // 1. Top Card Animations (Start immediately)
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

      // 2. Form Container Animations (Start after 300ms)
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

      // 3. Inputs Stagger (Start after 500ms)
      Animated.sequence([
        Animated.delay(500),
        Animated.stagger(80, [
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
            toValue: 0,
            friction: 7,
            tension: 40,
            useNativeDriver: true,
          }),
          Animated.spring(inputAnims[4], {
            toValue: 0,
            friction: 7,
            tension: 40,
            useNativeDriver: true,
          }),
          Animated.spring(inputAnims[5], {
            toValue: 1,
            friction: 3,
            tension: 20,
            useNativeDriver: true,
          }),
        ]),
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

  const handleSignUp = () => {
    // Reset all errors
    setNameError(null);
    setPhoneError(null);
    setPasswordError(null);
    setRePasswordError(null);
    setAgreeError(null);

    let hasError = false;

    if (!name.trim()) {
      setNameError("Please enter your full name");
      hasError = true;
    }

    if (!phone.trim()) {
      setPhoneError("Please enter your phone number");
      hasError = true;
    }

    if (phone.length < 13) {
      setPhoneError("Please enter a valid phone number (+92XXXXXXXXXX)");
      hasError = true;
    }

    if (!password) {
      setPasswordError("Please enter a password");
      hasError = true;
    }

    if (password.length < 6) {
      setPasswordError("Password must be at least 6 characters long");
      hasError = true;
    }

    if (password !== rePassword) {
      setRePasswordError("Passwords do not match");
      hasError = true;
    }

    if (!agree) {
      setAgreeError("Please agree to the terms and conditions");
      hasError = true;
    }

    if (hasError) {
      return;
    }

    // If all validations pass, navigate to verification
    router.push({
      pathname: "/verification",
      params: { phone: phone, fromSignUp: "true" },
    });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
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
          <View style={styles.textContainer}>
            <ShuffleText text="Create" delay={300} style={styles.heading} />
            <ShuffleText text="Account" delay={600} style={styles.heading} />
            <ShuffleText
              text="Sign up to get started"
              delay={1000}
              style={styles.subtitle}
            />
          </View>
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
          <Animated.View style={{ transform: [{ translateX: inputAnims[0] }] }}>
            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <TextInput
                  ref={nameInputRef}
                  style={[
                    styles.input,
                    focusedInput === "name" && styles.inputFocused,
                    nameError && styles.inputError,
                  ]}
                  placeholder="Full Name"
                  value={name}
                  onChangeText={(text) => {
                    setName(text);
                    setNameError(null); // Clear error on change
                  }}
                  onFocus={() => setFocusedInput("name")}
                  onBlur={() => setFocusedInput(null)}
                  placeholderTextColor="#8F8F8F"
                  autoCapitalize="words"
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => phoneInputRef.current?.focus()}
                />
                {nameError && <Text style={styles.errorText}>{nameError}</Text>}
                <Ionicons
                  name="person-outline"
                  size={20}
                  color="#1E7C7E"
                  style={styles.icon}
                />
              </View>
            </View>
          </Animated.View>

          <Animated.View style={{ transform: [{ translateX: inputAnims[1] }] }}>
            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <TextInput
                  ref={phoneInputRef}
                  style={[
                    styles.input,
                    focusedInput === "phone" && styles.inputFocused,
                    phoneError && styles.inputError,
                  ]}
                  placeholder="Phone No. (+92XXXXXXXXXX)"
                  value={phone}
                  onChangeText={(text) => {
                    handlePhoneChange(text);
                    setPhoneError(null); // Clear error on change
                  }}
                  onFocus={() => setFocusedInput("phone")}
                  onBlur={() => setFocusedInput(null)}
                  placeholderTextColor="#8F8F8F"
                  keyboardType="phone-pad"
                  maxLength={13}
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => passwordInputRef.current?.focus()}
                />
                {phoneError && (
                  <Text style={styles.errorText}>{phoneError}</Text>
                )}
                <Ionicons
                  name="call-outline"
                  size={20}
                  color="#1E7C7E"
                  style={styles.icon}
                />
              </View>
            </View>
          </Animated.View>

          <Animated.View style={{ transform: [{ translateX: inputAnims[2] }] }}>
            <View style={styles.inputContainer}>
              <View style={styles.passwordContainer}>
                <TextInput
                  ref={passwordInputRef}
                  style={[
                    styles.passwordInput,
                    focusedInput === "password" && styles.inputFocused,
                    passwordError && styles.inputError,
                  ]}
                  placeholder="Password"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    setPasswordError(null); // Clear error on change
                  }}
                  onFocus={() => setFocusedInput("password")}
                  onBlur={() => setFocusedInput(null)}
                  placeholderTextColor="#8F8F8F"
                  autoCapitalize="none"
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => rePasswordInputRef.current?.focus()}
                />
                {passwordError && (
                  <Text style={styles.errorText}>{passwordError}</Text>
                )}
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color="#1E7C7E"
                  style={styles.icon}
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowPassword(!showPassword)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={22}
                    color="#1E7C7E"
                  />
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>

          <Animated.View style={{ transform: [{ translateX: inputAnims[3] }] }}>
            <View style={styles.inputContainer}>
              <View style={styles.passwordContainer}>
                <TextInput
                  ref={rePasswordInputRef}
                  style={[
                    styles.passwordInput,
                    focusedInput === "rePassword" && styles.inputFocused,
                    rePasswordError && styles.inputError,
                  ]}
                  placeholder="Retype Password"
                  secureTextEntry={!showPassword}
                  value={rePassword}
                  onChangeText={(text) => {
                    setRePassword(text);
                    setRePasswordError(null); // Clear error on change
                  }}
                  onFocus={() => setFocusedInput("rePassword")}
                  onBlur={() => setFocusedInput(null)}
                  placeholderTextColor="#8F8F8F"
                  autoCapitalize="none"
                  returnKeyType="done"
                  blurOnSubmit={true}
                  onSubmitEditing={() => handleSignUp()}
                />
                {rePasswordError && (
                  <Text style={styles.errorText}>{rePasswordError}</Text>
                )}
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color="#1E7C7E"
                  style={styles.icon}
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowPassword(!showPassword)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={22}
                    color="#1E7C7E"
                  />
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>

          <Animated.View style={{ transform: [{ translateX: inputAnims[4] }] }}>
            <View style={styles.checkboxContainer}>
              <TouchableOpacity
                style={[
                  styles.checkbox,
                  agree && styles.checked,
                  agreeError && styles.checkboxError,
                ]}
                onPress={() => {
                  setAgree(!agree);
                  setAgreeError(null); // Clear error on change
                }}
                activeOpacity={0.7}
              >
                {agree && <Ionicons name="checkmark" size={14} color="#fff" />}
              </TouchableOpacity>
              <Text style={styles.checkboxText}>
                I agree to the Terms and Conditions
              </Text>
            </View>
            {agreeError && <Text style={styles.errorText}>{agreeError}</Text>}
          </Animated.View>

          <Animated.View
            style={{
              transform: [
                {
                  scale: inputAnims[5],
                },
              ],
              marginTop: 10,
            }}
          >
            <TouchableOpacity
              style={styles.signupBtn}
              onPress={handleSignUp}
              activeOpacity={0.8}
            >
              <Text style={styles.signupBtnText}>Sign Up</Text>
            </TouchableOpacity>
          </Animated.View>

          <TouchableOpacity
            onPress={() => router.push("/log-in")}
            activeOpacity={0.7}
          >
            <Text style={styles.signupText}>
              Already have an account?{" "}
              <Text style={styles.signupLink}>Login</Text>
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
  card: {
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
    overflow: "hidden",
  },
  textContainer: {
    height: 140,
    justifyContent: "center",
  },
  heading: {
    color: "#fff",
    fontSize: 42,
    fontWeight: "700",
    lineHeight: 48,
  },
  subtitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "300",
    marginTop: 8,
  },
  form: {
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
  inputContainer: {
    marginBottom: 18,
  },
  inputWrapper: {
    position: "relative",
  },
  input: {
    backgroundColor: "#EAF6F7",
    borderRadius: 30,
    paddingLeft: 50,
    paddingRight: 20,
    height: 50,
    borderWidth: 1,
    borderColor: "#9AC6C8",
    color: "#000",
  },
  passwordContainer: {
    position: "relative",
  },
  passwordInput: {
    backgroundColor: "#EAF6F7",
    borderRadius: 30,
    paddingLeft: 50,
    paddingRight: 50,
    height: 50,
    borderWidth: 1,
    borderColor: "#9AC6C8",
    color: "#000",
  },
  icon: {
    position: "absolute",
    left: 18,
    top: 15,
    zIndex: 10,
  },
  eyeIcon: {
    position: "absolute",
    right: 18,
    top: 13,
    zIndex: 10,
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
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    marginTop: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: "#1E7C7E",
    marginRight: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  checked: {
    backgroundColor: "#1E7C7E",
    borderColor: "#1E7C7E",
  },
  checkboxText: {
    color: "#5A5A5A",
    fontSize: 14,
    fontWeight: "400",
    flex: 1,
  },
  signupText: {
    textAlign: "center",
    marginTop: 20,
    color: "#5A5A5A",
    fontSize: 14,
  },
  signupLink: {
    color: "#1E7C7E",
    fontWeight: "700",
  },
  inputError: {
    borderColor: "#FF6B6B",
    borderWidth: 2,
  },
  checkboxError: {
    borderColor: "#FF6B6B",
    borderWidth: 2,
  },
  errorText: {
    color: "#FF6B6B",
    fontSize: 12,
    marginTop: 5,
    marginLeft: 5,
  },
  signupBtn: {
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
  signupBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 17,
  },
});
