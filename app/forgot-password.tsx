import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
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

import { ShuffleText } from "../components/ui/ShuffleText";
import { CustomButton } from "@/components/ui/CustomButton";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [authError, setAuthError] = useState("");

  // Shake animation value
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Animation values
  const cardScale = useRef(new Animated.Value(0.9)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslateY = useRef(new Animated.Value(-50)).current;

  const formOpacity = useRef(new Animated.Value(0)).current;
  const formTranslateY = useRef(new Animated.Value(30)).current;

  const inputAnims = useRef([
    new Animated.Value(-50), // Phone Input
    new Animated.Value(-50), // Reset Button
    new Animated.Value(0), // Back link opacity
  ]).current;

  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(inputAnims[0], {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(inputAnims[0], {
        toValue: -10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(inputAnims[0], {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(inputAnims[0], {
        toValue: 0,
        duration: 50,
        useNativeDriver: true,
      }),
    ]).start();
  };

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
        Animated.timing(inputAnims[2], {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [
    cardOpacity,
    cardTranslateY,
    cardScale,
    formOpacity,
    formTranslateY,
    inputAnims,
  ]);

  const handlePhoneChange = (text: string) => {
    let digits = text.replace(/\D/g, "");
    if (digits.startsWith("92")) digits = digits.slice(2);
    else if (digits.startsWith("0")) digits = digits.slice(1);
    digits = digits.slice(0, 10);
    const formattedPhone = digits.length > 0 ? "+92 " + digits : "";
    setPhone(formattedPhone);

    // Show error message and shake if user is typing invalid Pakistani mobile number
    if (digits.length > 0 && digits[0] !== "3") {
      setPhoneError("Invalid Pakistani mobile number - must start with 3");
      triggerShake(); // Shake the phone input field immediately
    } else {
      setPhoneError("");
    }
  };

  const handlePhoneBlur = () => {
    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length > 0) {
      if (cleanPhone.length !== 12 || cleanPhone[2] !== "3") {
        setPhoneError("Invalid Pakistani phone number");
        triggerShake();
      } else {
        setPhoneError("");
      }
    }
  };

  const handleResetPassword = async () => {
    setEmailError("");
    setPhoneError("");
    setAuthError("");
    setSuccessMessage("");
    let hasError = false;

    if (!email.trim()) {
      setEmailError("Email is required");
      hasError = true;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError("Invalid email format");
      hasError = true;
    }

    const cleanPhone = phone.replace(/\D/g, "");
    if (!phone || cleanPhone.length !== 12 || cleanPhone[2] !== "3") {
      setPhoneError("Valid Pakistani phone number is required");
      triggerShake();
      hasError = true;
    }

    if (hasError) return;

    setIsLoading(true);
    // Simulate reset delay
    setTimeout(() => {
      console.log("Simulated password reset email sent");
      setSuccessMessage("Password reset email sent! Please check your inbox.");
      setIsLoading(false);
    }, 1500);
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
            <ShuffleText text="Forgot" delay={300} style={styles.welcomeText} />
            <ShuffleText
              text="Password"
              delay={600}
              style={styles.welcomeText}
            />
          </View>
        </Animated.View>

        <Animated.View
          style={[
            styles.content,
            {
              opacity: formOpacity,
              transform: [{ translateY: formTranslateY }],
            },
          ]}
        >
          <View style={styles.shuffleContainer}>
            <ShuffleText
              text="Reset Password"
              delay={300}
              style={styles.title}
            />
          </View>

          <Text style={styles.subtitle}>
            No worries, we'll send you{"\n"}reset instructions
          </Text>

          {/* Email Input */}
          <Animated.View
            style={[
              styles.inputWrapper,
              {
                transform: [{ translateX: inputAnims[0] }],
                marginBottom: 15,
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
                if (emailError) setEmailError("");
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

          {/* Phone Input */}
          <Animated.View
            style={[
              styles.inputWrapper,
              {
                transform: [
                  { translateX: inputAnims[0] },
                  { translateX: shakeAnim },
                ],
                marginBottom: 15,
              },
            ]}
          >
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
              placeholder="Phone No. (+92 3XXXXXXXXX)"
              value={phone}
              onChangeText={handlePhoneChange}
              onFocus={() => setFocusedInput("phone")}
              onBlur={() => {
                setFocusedInput(null);
                handlePhoneBlur();
              }}
              placeholderTextColor="#8F8F8F"
              keyboardType="phone-pad"
              maxLength={14}
            />
          </Animated.View>
          {phoneError ? (
            <Text style={styles.errorText}>{phoneError}</Text>
          ) : null}

          {successMessage ? (
            <Text style={[styles.successText, { textAlign: 'center', marginBottom: 10 }]}>{successMessage}</Text>
          ) : null}

          {authError ? (
            <Text style={[styles.errorText, { textAlign: 'center', marginBottom: 10 }]}>{authError}</Text>
          ) : null}

          {/* Reset Password Button */}
          <Animated.View
            style={{
              transform: [{ translateX: inputAnims[1] }],
              marginTop: 10,
            }}
          >
            <CustomButton
              title="Reset Password"
              variant="primary"
              onPress={handleResetPassword}
              loading={isLoading}
            />
          </Animated.View>

          {/* Back to Login */}
          <Animated.View style={{ opacity: inputAnims[2] }}>
            <TouchableOpacity
              onPress={() => router.push("/log-in")}
              activeOpacity={0.7}
              style={styles.backButton}
            >
              <Text style={styles.backButtonText}>Back to Login</Text>
            </TouchableOpacity>
          </Animated.View>
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
    height: 100,
    justifyContent: "center",
  },
  welcomeText: {
    color: "#fff",
    fontSize: 42,
    fontWeight: "700",
    lineHeight: 48,
  },
  content: {
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
  shuffleContainer: {
    marginBottom: 10,
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1E7C7E",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    fontWeight: "400",
    color: "#4A7071",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
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
    paddingLeft: 35,
    paddingRight: 20,
    height: 52,
    borderWidth: 1,
    borderColor: "#9AC6C8",
    fontSize: 15,
    color: "#000",
  },
  inputIcon: {
    position: "absolute",
    left: 12,
    zIndex: 10,
  },
  inputFocused: {
    borderColor: "#1E7C7E",
    borderWidth: 2,
  },
  inputError: {
    borderColor: "#E74C3C",
    borderWidth: 1.5,
  },
  errorText: {
    color: "#E74C3C",
    fontSize: 12,
    marginTop: 2,
    marginLeft: 12,
    marginBottom: 6,
  },
  successText: {
    color: "#2ECC71",
    fontSize: 14,
    fontWeight: "600",
  },

  backButton: {
    marginTop: 24,
    alignItems: "center",
  },
  backButtonText: {
    color: "#1E7C7E",
    fontSize: 14,
    fontWeight: "700",
  },
});
