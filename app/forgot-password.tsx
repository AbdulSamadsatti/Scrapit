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

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

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
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
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

    if (digits.length > 0 && digits[0] !== "3") {
      setPhoneError("Invalid Pakistani mobile number");
    } else if (
      digits.length === 0 ||
      (digits.length > 0 && digits[0] === "3")
    ) {
      if (
        phoneError === "Invalid Pakistani mobile number" ||
        digits.length === 10
      ) {
        setPhoneError("");
      }
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

  const handleResetPassword = () => {
    setPhoneError("");
    const cleanPhone = phone.replace(/\D/g, "");
    if (!phone || cleanPhone.length !== 12 || cleanPhone[2] !== "3") {
      setPhoneError("Valid Pakistani phone number is required");
      triggerShake();
      return;
    }
    router.push({
      pathname: "/verification-forgot",
      params: { phone },
    });
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

          {/* Phone Input */}
          <Animated.View
            style={[
              styles.inputWrapper,
              {
                transform: [
                  { translateX: inputAnims[0] },
                  { translateX: shakeAnim },
                ],
                marginBottom: 20,
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

          {/* Reset Password Button */}
          <Animated.View style={{ transform: [{ translateX: inputAnims[1] }] }}>
            <TouchableOpacity
              style={styles.loginBtn}
              onPress={handleResetPassword}
              activeOpacity={0.8}
            >
              <Text style={styles.loginBtnText}>Reset Password</Text>
            </TouchableOpacity>
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
    marginTop: 4,
    marginLeft: 16,
    marginBottom: 10,
  },
  loginBtn: {
    backgroundColor: "#1E7C7E",
    borderRadius: 25,
    height: 52,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
    ...Platform.select({
      ios: {
        shadowColor: "#1E7C7E",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: "0px 4px 5px rgba(30, 124, 126, 0.3)",
      },
    }),
  },
  loginBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 17,
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
