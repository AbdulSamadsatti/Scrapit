import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { sendPasswordResetEmail } from "firebase/auth";
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
import { ShuffleText } from "../components/ui/ShuffleText";
import { CustomButton } from "@/components/ui/CustomButton";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const cardScale = useRef(new Animated.Value(0.9)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslateY = useRef(new Animated.Value(-50)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;
  const formTranslateY = useRef(new Animated.Value(30)).current;
  const inputAnims = useRef([
    new Animated.Value(-50),
    new Animated.Value(-50),
    new Animated.Value(0),
  ]).current;

  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(inputAnims[0], { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(inputAnims[0], { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(inputAnims[0], { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(inputAnims[0], { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  useEffect(() => {
    Animated.parallel([
      Animated.timing(cardOpacity, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(cardTranslateY, { toValue: 0, duration: 800, useNativeDriver: true }),
      Animated.spring(cardScale, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true }),
    ]).start();

    Animated.sequence([
      Animated.delay(400),
      Animated.parallel([
        Animated.timing(formOpacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(formTranslateY, { toValue: 0, duration: 800, useNativeDriver: true }),
      ]),
      Animated.stagger(150, [
        Animated.spring(inputAnims[0], { toValue: 0, friction: 7, tension: 40, useNativeDriver: true }),
        Animated.spring(inputAnims[1], { toValue: 0, friction: 7, tension: 40, useNativeDriver: true }),
        Animated.timing(inputAnims[2], { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  const handleResetPassword = async () => {
    setEmailError("");
    setSuccessMessage("");

    if (!email.trim()) {
      setEmailError("Email is required");
      triggerShake();
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError("Invalid email format");
      triggerShake();
      return;
    }

    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setSuccessMessage("Password reset email sent! Please check your inbox.");
    } catch (error: any) {
      const code = error?.code;
      if (code === "auth/user-not-found") {
        setEmailError("No account found with this email");
      } else if (code === "auth/invalid-email") {
        setEmailError("Invalid email address");
      } else {
        setEmailError("Something went wrong. Try again.");
      }
      triggerShake();
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
            { opacity: cardOpacity, transform: [{ translateY: cardTranslateY }, { scale: cardScale }] },
          ]}
        >
          <LinearGradient
            colors={["#031d1e", "#063537", "#0D5A5B"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientHeader}
          >
            <View style={styles.textContainer}>
              <ShuffleText text="Forgot" delay={300} style={styles.welcomeText} />
              <ShuffleText text="Password" delay={600} style={styles.welcomeText} />
            </View>
          </LinearGradient>
        </Animated.View>

        <Animated.View
          style={[
            styles.content,
            { opacity: formOpacity, transform: [{ translateY: formTranslateY }] },
          ]}
        >
          <View style={styles.shuffleContainer}>
            <ShuffleText text="Reset Password" delay={300} style={styles.title} />
          </View>

          <Text style={styles.subtitle}>
            No worries, we'll send you{"\n"}reset instructions
          </Text>

          <Animated.View
            style={[
              styles.inputWrapper,
              { transform: [{ translateX: inputAnims[0] }], marginBottom: 15 },
            ]}
          >
            <Ionicons name="mail-outline" size={20} color="#6B9A9C" style={styles.inputIcon} />
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
                if (successMessage) setSuccessMessage("");
              }}
              onFocus={() => setFocusedInput("email")}
              onBlur={() => setFocusedInput(null)}
              placeholderTextColor="#8F8F8F"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </Animated.View>

          {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
          {successMessage ? <Text style={styles.successText}>{successMessage}</Text> : null}

          <Animated.View style={{ transform: [{ translateX: inputAnims[1] }], marginTop: 10 }}>
            <CustomButton
              title="Reset Password"
              variant="primary"
              onPress={handleResetPassword}
              loading={isLoading}
            />
          </Animated.View>

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
  container: { flex: 1, backgroundColor: "#D8EEF0" },
  scrollContainer: { flexGrow: 1 },
  topCard: {
    backgroundColor: "transparent",
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: "hidden",
    shadowColor: "#1E7C7E",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
  },
  gradientHeader: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 },
  textContainer: { height: 100, justifyContent: "center" },
  welcomeText: { color: "#fff", fontSize: 42, fontWeight: "700", lineHeight: 48 },
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
  shuffleContainer: { marginBottom: 10, alignItems: "center" },
  title: { fontSize: 28, fontWeight: "700", color: "#1E7C7E", textAlign: "center" },
  subtitle: { fontSize: 15, color: "#4A7071", textAlign: "center", lineHeight: 22, marginBottom: 32 },
  inputWrapper: { position: "relative", flexDirection: "row", alignItems: "center" },
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
  inputFocused: { borderColor: "#1E7C7E", borderWidth: 2 },
  inputError: { borderColor: "#E74C3C", borderWidth: 1.5 },
  errorText: { color: "#E74C3C", fontSize: 12, marginTop: 2, marginLeft: 12, marginBottom: 6 },
  successText: { color: "#2ECC71", fontSize: 14, fontWeight: "600", textAlign: "center", marginBottom: 10 },
  backButton: { marginTop: 24, alignItems: "center" },
  backButtonText: { color: "#1E7C7E", fontSize: 14, fontWeight: "700" },
});