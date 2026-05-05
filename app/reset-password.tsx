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

import { ShuffleText } from "@/components/ui/ShuffleText";

const AnimatedElement = ({
  index,
  fadeAnims,
  slideAnims,
  children,
}: {
  index: number;
  fadeAnims: Animated.Value[];
  slideAnims: Animated.Value[];
  children: React.ReactNode;
}) => (
  <Animated.View
    style={{
      opacity: fadeAnims[index],
      transform: [{ translateY: slideAnims[index] }],
    }}
  >
    {children}
  </Animated.View>
);

export default function ResetPasswordScreen() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [newPasswordError, setNewPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  const confirmPasswordInputRef = useRef<TextInput>(null);

  // Animation values
  const cardScale = useRef(new Animated.Value(0.9)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslateY = useRef(new Animated.Value(-50)).current;

  const fadeAnims = useRef<Animated.Value[]>(
    Array(4)
      .fill(0)
      .map(() => new Animated.Value(0)),
  ).current;
  const slideAnims = useRef<Animated.Value[]>(
    Array(4)
      .fill(0)
      .map(() => new Animated.Value(30)),
  ).current;
  const buttonScaleAnim = useRef(new Animated.Value(0.8)).current;

  const formOpacity = useRef(new Animated.Value(0)).current;
  const formTranslateY = useRef(new Animated.Value(30)).current;

  const inputAnims = useRef([
    new Animated.Value(-50), // New Password Input
    new Animated.Value(-50), // Confirm Password Input
    new Animated.Value(-50), // Reset Button
    new Animated.Value(0), // Back link opacity
  ]).current;

  useEffect(() => {
    // Top card animations
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

    // Content staggered animations
    const animations = fadeAnims.map((anim, index) =>
      Animated.parallel([
        Animated.timing(anim, {
          toValue: 1,
          duration: 600,
          delay: index * 150,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnims[index], {
          toValue: 0,
          duration: 600,
          delay: index * 150,
          useNativeDriver: true,
        }),
      ]),
    );

    Animated.stagger(100, animations).start();

    Animated.spring(buttonScaleAnim, {
      toValue: 1,
      friction: 3,
      tension: 20,
      useNativeDriver: true,
    }).start();

    // Staggered slide-in for specific inputs
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
        Animated.timing(inputAnims[3], {
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
    fadeAnims,
    slideAnims,
    buttonScaleAnim,
    formOpacity,
    formTranslateY,
    inputAnims,
  ]);

  const handleReset = () => {
    setNewPasswordError("");
    setConfirmPasswordError("");
    let hasError = false;

    if (!newPassword) {
      setNewPasswordError("Please enter a new password");
      hasError = true;
    } else if (newPassword.length < 6) {
      setNewPasswordError("Password must be at least 6 characters");
      hasError = true;
    }

    if (!confirmPassword) {
      setConfirmPasswordError("Please confirm your password");
      hasError = true;
    } else if (newPassword !== confirmPassword) {
      setConfirmPasswordError("Passwords do not match");
      hasError = true;
    }

    if (!hasError) {
      // Since password reset is handled via Firebase email link,
      // this screen can be used for success feedback or if we had a custom token.
      // For now, we'll just navigate back to login.
      alert("Password has been reset successfully!");
      router.replace("/log-in");
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
            <ShuffleText text="Reset" delay={300} style={styles.welcomeText} />
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
          <AnimatedElement
            index={0}
            fadeAnims={fadeAnims}
            slideAnims={slideAnims}
          >
            <View style={styles.shuffleContainer}>
              <ShuffleText
                text="New Password"
                delay={300}
                style={styles.title}
              />
            </View>

            <Text style={styles.subtitle}>
              Enter your new password below{"\n"}to regain access
            </Text>
          </AnimatedElement>

          {/* New Password Input */}
          <AnimatedElement
            index={1}
            fadeAnims={fadeAnims}
            slideAnims={slideAnims}
          >
            <Animated.View
              style={[
                styles.inputWrapper,
                { transform: [{ translateX: inputAnims[0] }] },
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
                  focusedInput === "newPassword" && styles.inputFocused,
                  newPasswordError ? styles.inputError : null,
                ]}
                placeholder="New Password"
                value={newPassword}
                onChangeText={(text) => {
                  setNewPassword(text);
                  if (newPasswordError) setNewPasswordError("");
                }}
                onFocus={() => setFocusedInput("newPassword")}
                onBlur={() => setFocusedInput(null)}
                placeholderTextColor="#8F8F8F"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                returnKeyType="next"
                onSubmitEditing={() => confirmPasswordInputRef.current?.focus()}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color="#6B9A9C"
                />
              </TouchableOpacity>
            </Animated.View>
            {newPasswordError ? (
              <Text style={styles.errorText}>{newPasswordError}</Text>
            ) : null}
          </AnimatedElement>

          {/* Confirm Password Input */}
          <AnimatedElement
            index={2}
            fadeAnims={fadeAnims}
            slideAnims={slideAnims}
          >
            <Animated.View
              style={[
                styles.inputWrapper,
                { transform: [{ translateX: inputAnims[1] }] },
              ]}
            >
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color="#6B9A9C"
                style={styles.inputIcon}
              />
              <TextInput
                ref={confirmPasswordInputRef}
                style={[
                  styles.input,
                  focusedInput === "confirmPassword" && styles.inputFocused,
                  confirmPasswordError ? styles.inputError : null,
                ]}
                placeholder="Confirm Password"
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  if (confirmPasswordError) setConfirmPasswordError("");
                }}
                onFocus={() => setFocusedInput("confirmPassword")}
                onBlur={() => setFocusedInput(null)}
                placeholderTextColor="#8F8F8F"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                returnKeyType="done"
                onSubmitEditing={handleReset}
              />
            </Animated.View>
            {confirmPasswordError ? (
              <Text style={styles.errorText}>{confirmPasswordError}</Text>
            ) : null}
          </AnimatedElement>

          {/* Reset Button */}
          <AnimatedElement
            index={3}
            fadeAnims={fadeAnims}
            slideAnims={slideAnims}
          >
            <Animated.View
              style={{
                transform: [
                  { translateX: inputAnims[2] },
                  { scale: buttonScaleAnim },
                ],
              }}
            >
              <TouchableOpacity
                style={styles.loginBtn}
                onPress={handleReset}
                activeOpacity={0.8}
              >
                <Text style={styles.loginBtnText}>Reset Password</Text>
              </TouchableOpacity>
            </Animated.View>
          </AnimatedElement>

          {/* Back to Login */}
          <Animated.View style={{ opacity: inputAnims[3] }}>
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
    marginBottom: 12,
  },
  input: {
    flex: 1,
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
  inputIcon: {
    position: "absolute",
    left: 16,
    zIndex: 10,
  },
  eyeIcon: {
    position: "absolute",
    right: 16,
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
    marginTop: -8,
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
