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
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CustomButton } from "@/components/ui/CustomButton";
import { ShuffleText } from "@/components/ui/ShuffleText";

export default function AnimatedSignUpScreen() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [rePassword, setRePassword] = useState("");
  const [agree, setAgree] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, boolean>>({});

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

  const validatePassword = (pass: string) => {
    // Strong password: min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
    const strongRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return strongRegex.test(pass);
  };

  const handlePhoneChange = (text: string) => {
    // Remove all non-digits
    let digits = text.replace(/\D/g, "");

    // Handle country code 92
    if (digits.startsWith("92")) {
      digits = digits.slice(2);
    } else if (digits.startsWith("0")) {
      // If it starts with 0, remove it
      digits = digits.slice(1);
    }

    // Limit to 10 digits (Pakistani mobile format: 3XXXXXXXXX)
    digits = digits.slice(0, 10);

    const formattedPhone = digits.length > 0 ? "+92 " + digits : "";
    setPhone(formattedPhone);

    // REAL-TIME INVALID INPUT CHECK:
    // In Pakistan, mobile numbers MUST start with '3'
    if (digits.length > 0 && digits[0] !== "3") {
      setErrors((prev) => ({ ...prev, phone: true }));
    } else if (
      digits.length === 0 ||
      (digits.length > 0 && digits[0] === "3")
    ) {
      // Clear error while typing if user starts correcting or clears
      if (
        errors.phone &&
        (digits.length === 10 || digits.length === 0 || digits[0] === "3")
      ) {
        setErrors((prev) => ({ ...prev, phone: false }));
      }
    }
  };

  const handlePhoneBlur = () => {
    const cleanPhone = phone.replace(/\D/g, "");
    // Pakistani mobile number must be exactly 12 digits (+92 + 10 digits starting with 3)
    if (cleanPhone.length > 0) {
      if (cleanPhone.length !== 12 || cleanPhone[2] !== "3") {
        setErrors((prev) => ({ ...prev, phone: true }));
        triggerShake(1);
      } else {
        setErrors((prev) => ({ ...prev, phone: false }));
      }
    }
  };

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

  const handleSignUp = () => {
    const newErrors: Record<string, boolean> = {};

    if (!name.trim()) {
      newErrors.name = true;
      triggerShake(0);
    }

    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length !== 12) {
      // +92 is 2 digits + 10 digits = 12
      newErrors.phone = true;
      triggerShake(1);
    }

    if (!validatePassword(password)) {
      newErrors.password = true;
      triggerShake(2);
    }

    if (password !== rePassword || !rePassword) {
      newErrors.rePassword = true;
      triggerShake(3);
    }

    if (!agree) {
      newErrors.agree = true;
      triggerShake(4);
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      return;
    }

    // Pass phone number and fromSignUp flag to verification screen
    router.push({
      pathname: "/verification",
      params: { phone: phone, fromSignUp: "true" },
    });
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
                transform: [
                  { translateY: cardTranslateY },
                  { scale: cardScale },
                ],
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
            <Animated.View
              style={{ transform: [{ translateX: inputAnims[0] }] }}
            >
              <View style={styles.inputContainer}>
                <View style={styles.inputWrapper}>
                  <TextInput
                    ref={nameInputRef}
                    style={[
                      styles.input,
                      focusedInput === "name" && styles.inputFocused,
                      errors.name && styles.inputError,
                    ]}
                    placeholder="Full Name"
                    value={name}
                    onChangeText={(text) => {
                      setName(text);
                      if (errors.name) setErrors({ ...errors, name: false });
                    }}
                    onFocus={() => setFocusedInput("name")}
                    onBlur={() => setFocusedInput(null)}
                    placeholderTextColor="#8F8F8F"
                    autoCapitalize="words"
                    returnKeyType="next"
                    onSubmitEditing={() => phoneInputRef.current?.focus()}
                  />
                  <Ionicons
                    name="person-outline"
                    size={20}
                    color="#6B9A9C"
                    style={styles.icon}
                  />
                </View>
              </View>
            </Animated.View>

            <Animated.View
              style={{ transform: [{ translateX: inputAnims[1] }] }}
            >
              <View style={styles.inputContainer}>
                <View style={styles.inputWrapper}>
                  <TextInput
                    ref={phoneInputRef}
                    style={[
                      styles.input,
                      focusedInput === "phone" && styles.inputFocused,
                      errors.phone && styles.inputError,
                    ]}
                    placeholder="Phone Number"
                    value={phone}
                    onChangeText={(text) => {
                      handlePhoneChange(text);
                      if (errors.phone) setErrors({ ...errors, phone: false });
                    }}
                    onFocus={() => setFocusedInput("phone")}
                    onBlur={() => {
                      setFocusedInput(null);
                      handlePhoneBlur();
                    }}
                    placeholderTextColor="#8F8F8F"
                    keyboardType="phone-pad"
                    returnKeyType="next"
                    onSubmitEditing={() => passwordInputRef.current?.focus()}
                  />
                  <Ionicons
                    name="call-outline"
                    size={20}
                    color="#6B9A9C"
                    style={styles.icon}
                  />
                </View>
              </View>
            </Animated.View>

            <Animated.View
              style={{ transform: [{ translateX: inputAnims[2] }] }}
            >
              <View style={styles.inputContainer}>
                <View style={styles.passwordContainer}>
                  <TextInput
                    ref={passwordInputRef}
                    style={[
                      styles.passwordInput,
                      focusedInput === "password" && styles.inputFocused,
                      errors.password && styles.inputError,
                    ]}
                    placeholder="Password"
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={(text) => {
                      setPassword(text);
                      if (errors.password)
                        setErrors({ ...errors, password: false });
                    }}
                    onFocus={() => setFocusedInput("password")}
                    onBlur={() => setFocusedInput(null)}
                    placeholderTextColor="#8F8F8F"
                    autoCapitalize="none"
                    returnKeyType="next"
                    onSubmitEditing={() => rePasswordInputRef.current?.focus()}
                  />
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color="#6B9A9C"
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
                      color="#6B9A9C"
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </Animated.View>

            <Animated.View
              style={{ transform: [{ translateX: inputAnims[3] }] }}
            >
              <View style={styles.inputContainer}>
                <View style={styles.passwordContainer}>
                  <TextInput
                    ref={rePasswordInputRef}
                    style={[
                      styles.passwordInput,
                      focusedInput === "rePassword" && styles.inputFocused,
                      errors.rePassword && styles.inputError,
                    ]}
                    placeholder="Confirm Password"
                    secureTextEntry={!showPassword}
                    value={rePassword}
                    onChangeText={(text) => {
                      setRePassword(text);
                      if (errors.rePassword)
                        setErrors({ ...errors, rePassword: false });
                    }}
                    onFocus={() => setFocusedInput("rePassword")}
                    onBlur={() => setFocusedInput(null)}
                    placeholderTextColor="#8F8F8F"
                    autoCapitalize="none"
                    returnKeyType="done"
                    onSubmitEditing={handleSignUp}
                  />
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color="#6B9A9C"
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
                      color="#6B9A9C"
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </Animated.View>

            <Animated.View
              style={{ transform: [{ translateX: inputAnims[4] }] }}
            >
              <TouchableOpacity
                style={[
                  styles.checkboxContainer,
                  errors.agree && {
                    borderColor: "#FF5252",
                    borderWidth: 1,
                    borderRadius: 10,
                    padding: 5,
                    backgroundColor: "#FFF8F8",
                  },
                ]}
                onPress={() => {
                  setAgree(!agree);
                  if (errors.agree) setErrors({ ...errors, agree: false });
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, agree && styles.checked]}>
                  {agree && (
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  )}
                </View>
                <Text style={styles.checkboxText} numberOfLines={1}>
                  I agree to the Terms and Conditions
                </Text>
              </TouchableOpacity>
            </Animated.View>

            <Animated.View
              style={{
                transform: [{ scale: inputAnims[5] }],
                marginTop: 5,
              }}
            >
              <CustomButton
                title="Sign Up"
                variant="primary"
                onPress={handleSignUp}
                style={styles.signupBtnCustom}
              />
            </Animated.View>

            {/* Divider */}
            <View style={styles.dividerContainer}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.divider} />
            </View>

            {/* Google Login Button */}
            <CustomButton
              title="Continue with Google"
              variant="google"
              icon="logo-google"
              onPress={() => console.log("Google Sign Up")}
              style={styles.googleButton}
            />

            <TouchableOpacity
              onPress={() => router.push("/log-in")}
              activeOpacity={0.7}
            >
              <Text style={styles.footerText}>
                Already have an account?{" "}
                <Text style={styles.footerLink}>Login</Text>
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#D8EEF0",
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: "#1E7C7E",
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 20,
    shadowColor: "#1E7C7E",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
  },
  textContainer: {
    height: 100,
    justifyContent: "center",
  },
  heading: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "700",
    lineHeight: 38,
  },
  subtitle: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 14,
    marginTop: 4,
  },
  form: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 30,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  inputContainer: {
    marginBottom: 12,
  },
  inputWrapper: {
    position: "relative",
  },
  input: {
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
  inputError: {
    borderColor: "#FF5252",
    backgroundColor: "#FFF8F8",
  },
  passwordContainer: {
    position: "relative",
    width: "100%",
  },
  passwordInput: {
    width: "100%",
    backgroundColor: "#EAF6F7",
    borderRadius: 25,
    paddingLeft: 45,
    paddingRight: 50,
    height: 52,
    borderWidth: 1,
    borderColor: "#9AC6C8",
    fontSize: 15,
    color: "#000",
  },
  icon: {
    position: "absolute",
    left: 16,
    top: 16,
    zIndex: 10,
  },
  eyeIcon: {
    position: "absolute",
    right: 16,
    top: 16,
    zIndex: 999,
    elevation: 5,
  },
  inputFocused: {
    borderColor: "#1E7C7E",
    borderWidth: 2,
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
    marginTop: 5,
    paddingLeft: 0,
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
  checkboxText: {
    color: "#5A5A5A",
    fontSize: 14,
  },
  signupBtnCustom: {
    height: 52,
    borderRadius: 25,
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: "#D0D0D0",
  },
  dividerText: {
    marginHorizontal: 15,
    color: "#8F8F8F",
    fontSize: 14,
    fontWeight: "500",
  },
  googleButton: {
    marginBottom: 15,
    height: 52,
    borderRadius: 25,
  },
  footerText: {
    textAlign: "center",
    color: "#5A5A5A",
    fontSize: 14,
  },
  footerLink: {
    color: "#1E7C7E",
    fontWeight: "700",
  },
});
