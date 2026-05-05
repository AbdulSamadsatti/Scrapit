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
import { LinearGradient } from "expo-linear-gradient";
import { CustomButton } from "@/components/ui/CustomButton";
import { ShuffleText } from "@/components/ui/ShuffleText";

export default function AnimatedSignUpScreen() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("+92 ");
  const [password, setPassword] = useState("");
  const [rePassword, setRePassword] = useState("");
  const [agree, setAgree] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Refs for TextInput focus management
  const nameInputRef = useRef<TextInput>(null);
  const emailInputRef = useRef<TextInput>(null);
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
    new Animated.Value(-50), // Email
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
            toValue: 0,
            friction: 7,
            tension: 40,
            useNativeDriver: true,
          }),
          Animated.spring(inputAnims[6], {
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

  const validatePassword = (pass: string): string => {
    // Strong password validation with specific error messages
    if (pass.length < 8) {
      return "Password must be at least 8 characters";
    } else if (!/[a-z]/.test(pass)) {
      return "Password must contain lowercase letter";
    } else if (!/[A-Z]/.test(pass)) {
      return "Password must contain uppercase letter";
    } else if (!/\d/.test(pass)) {
      return "Password must contain number";
    } else if (!/[@$!%*?&]/.test(pass)) {
      return "Password must contain special character";
    }
    return "";
  };

  const handlePhoneChange = (text: string) => {
    // Remove all non-digits
    let digits = text.replace(/\D/g, "");

    // Handle country code 92
    if (digits.startsWith("92")) {
      digits = digits.slice(2);
    } else if (digits.startsWith("0")) {
      digits = digits.slice(1);
    }

    // Limit to 10 digits
    digits = digits.slice(0, 10);

    const formattedPhone = digits.length > 0 ? "+92 " + digits : "";
    setPhone(formattedPhone);

    if (digits.length > 0 && digits[0] !== "3") {
      setErrors((prev) => ({
        ...prev,
        phone: "Invalid Pakistani mobile number - must start with 3",
      }));
      triggerShake(2); // Phone index
    } else {
      setErrors((prev) => ({ ...prev, phone: "" }));
    }
  };

  const handlePhoneBlur = () => {
    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length > 0 && cleanPhone !== "92") {
      if (cleanPhone.length !== 12) {
        setErrors((prev) => ({
          ...prev,
          phone: "Invalid phone number format",
        }));
        triggerShake(2);
      } else if (cleanPhone[2] !== "3") {
        setErrors((prev) => ({
          ...prev,
          phone: "Invalid mobile number: Must start with 3",
        }));
        triggerShake(2);
      } else {
        setErrors((prev) => ({ ...prev, phone: "" }));
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

  const handleSignUp = async () => {
    const newErrors: Record<string, string> = {};

    if (!email.trim()) {
      newErrors.email = "Email is required";
      triggerShake(0);
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Invalid email format";
      triggerShake(0);
    }

    if (!name.trim()) {
      newErrors.name = "Name is required";
      triggerShake(1);
    }

    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length === 0) {
      newErrors.phone = "Phone number is required";
      triggerShake(2);
    } else if (cleanPhone.length !== 12) {
      newErrors.phone = "Invalid phone number format";
      triggerShake(2);
    } else if (cleanPhone[2] !== "3") {
      newErrors.phone = "Invalid mobile number: Must start with 3";
      triggerShake(2);
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      newErrors.password = passwordError;
      triggerShake(3);
    }

    if (password !== rePassword || !rePassword) {
      newErrors.rePassword = "Passwords do not match";
      triggerShake(4);
    }

    if (!agree) {
      newErrors.agree = "You must agree to Terms and Conditions";
      triggerShake(5);
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      router.push("/verification");
    }, 1500);
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
            <LinearGradient
              colors={["#0D4C4E", "#1E7C7E", "#3A9EA0"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gradientHeader}
            >
              <View style={styles.textContainer}>
                <ShuffleText text="Create" delay={300} style={styles.heading} />
                <ShuffleText
                  text="Account"
                  delay={600}
                  style={styles.heading}
                />
                <ShuffleText
                  text="Sign up to get started"
                  delay={1000}
                  style={styles.subtitle}
                />
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
            <Animated.View
              style={{ transform: [{ translateX: inputAnims[0] }] }}
            >
              <View style={styles.inputContainer}>
                <View style={styles.inputWrapper}>
                  <TextInput
                    ref={emailInputRef}
                    style={[
                      styles.input,
                      focusedInput === "email" && styles.inputFocused,
                      errors.email && styles.inputError,
                    ]}
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
                    onSubmitEditing={() => nameInputRef.current?.focus()}
                  />
                  <Ionicons
                    name="mail-outline"
                    size={20}
                    color="#6B9A9C"
                    style={styles.icon}
                  />
                </View>
                {errors.email ? (
                  <Text style={styles.errorText}>{errors.email}</Text>
                ) : null}
              </View>
            </Animated.View>

            <Animated.View
              style={{ transform: [{ translateX: inputAnims[1] }] }}
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
                      if (errors.name) setErrors({ ...errors, name: "" });
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
                {errors.name ? (
                  <Text style={styles.errorText}>{errors.name}</Text>
                ) : null}
              </View>
            </Animated.View>

            <Animated.View
              style={{ transform: [{ translateX: inputAnims[2] }] }}
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
                      if (errors.phone) setErrors({ ...errors, phone: "" });
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
                {errors.phone ? (
                  <Text style={styles.errorText}>{errors.phone}</Text>
                ) : null}
              </View>
            </Animated.View>

            <Animated.View
              style={{ transform: [{ translateX: inputAnims[3] }] }}
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
                      if (text.length > 0) {
                        const passwordError = validatePassword(text);
                        if (passwordError) {
                          setErrors({ ...errors, password: passwordError });
                        } else {
                          setErrors({ ...errors, password: "" });
                        }
                      } else {
                        setErrors({ ...errors, password: "" });
                      }
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
                {errors.password ? (
                  <Text style={styles.errorText}>{errors.password}</Text>
                ) : null}
              </View>
            </Animated.View>

            <Animated.View
              style={{ transform: [{ translateX: inputAnims[4] }] }}
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
                      if (text.length > 0 && text !== password) {
                        setErrors({
                          ...errors,
                          rePassword: "Passwords do not match",
                        });
                      } else {
                        setErrors({ ...errors, rePassword: "" });
                      }
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
                {errors.rePassword ? (
                  <Text style={styles.errorText}>{errors.rePassword}</Text>
                ) : null}
              </View>
            </Animated.View>

            <Animated.View
              style={{ transform: [{ translateX: inputAnims[5] }] }}
            >
              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => {
                  setAgree(!agree);
                  if (errors.agree) setErrors({ ...errors, agree: "" });
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
              {errors.agree ? (
                <Text style={styles.errorText}>{errors.agree}</Text>
              ) : null}
            </Animated.View>

            <Animated.View
              style={{
                transform: [{ scale: inputAnims[6] }],
                marginTop: 5,
              }}
            >
              <CustomButton
                title="Sign Up"
                variant="primary"
                onPress={handleSignUp}
                style={styles.signupBtnCustom}
                loading={isLoading}
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
    backgroundColor: "transparent",
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#1E7C7E",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  gradientHeader: {
    paddingHorizontal: 24,
    paddingTop: 50,
    paddingBottom: 30,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
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
    marginTop: 20,
    borderRadius: 30,
    padding: 24,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  inputContainer: {
    marginBottom: 15,
  },
  inputWrapper: {
    position: "relative",
  },
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
    paddingLeft: 40,
    paddingRight: 50,
    height: 52,
    borderWidth: 1,
    borderColor: "#9AC6C8",
    fontSize: 15,
    color: "#000",
  },
  icon: {
    position: "absolute",
    left: 12,
    top: 16,
    zIndex: 10,
  },
  eyeIcon: {
    position: "absolute",
    right: 16,
    top: 16,
    zIndex: 999,
  },
  inputFocused: {
    borderColor: "#1E7C7E",
    borderWidth: 2,
  },
  errorText: {
    color: "#FF5252",
    fontSize: 12,
    marginTop: 4,
    marginLeft: 16,
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    paddingLeft: 20,
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
    marginBottom: 10,
  },
  footerText: {
    textAlign: "center",
    color: "#5A5A5A",
    fontSize: 14,
    marginTop: 20,
  },
  footerLink: {
    fontWeight: "700",
    color: "#1E7C7E",
  },
});
