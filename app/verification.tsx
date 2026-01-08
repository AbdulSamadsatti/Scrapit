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
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

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

export default function VerificationScreen() {
  const router = useRouter();
  const { phone } = useLocalSearchParams();
  const [code, setCode] = useState(["", "", "", ""]);
  const [error, setError] = useState("");
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  const inputRefs = useRef<TextInput[]>([]);

  // Animation values
  const fadeAnims = useRef<Animated.Value[]>(
    Array(4)
      .fill(0)
      .map(() => new Animated.Value(0))
  ).current;
  const slideAnims = useRef<Animated.Value[]>(
    Array(4)
      .fill(0)
      .map(() => new Animated.Value(30))
  ).current;
  const buttonScaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
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
      ])
    );

    Animated.stagger(100, animations).start();

    Animated.spring(buttonScaleAnim, {
      toValue: 1,
      friction: 3,
      tension: 20,
      useNativeDriver: true,
    }).start();
  }, [fadeAnims, slideAnims, buttonScaleAnim]);

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setCanResend(true);
    }
  }, [timer]);

  const handleCodeChange = (text: string, index: number) => {
    if (text.length <= 1) {
      const newCode = [...code];
      newCode[index] = text;
      setCode(newCode);
      setError("");

      if (text && index < 3) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleKeyPress = (
    e: { nativeEvent: { key: string } },
    index: number
  ) => {
    if (e.nativeEvent.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const verificationCode = code.join("");
    if (verificationCode.length !== 4) {
      setError("Please enter a 4-digit code");
      return;
    }

    try {
      const response = await fetch("https://your-api.com/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone,
          code: verificationCode,
        }),
      });

      if (response.ok) {
        // Navigate to home screen after successful verification
        router.replace("/home");
      } else {
        setError("Invalid verification code");
      }
    } catch {
      setError("Network error. Please try again.");
    }
  };

  const handleResend = async () => {
    try {
      const response = await fetch("https://your-api.com/resend-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone }),
      });

      if (response.ok) {
        setTimer(60);
        setCanResend(false);
        setError("");
        Alert.alert(
          "Code Resent",
          "A new verification code has been sent to your phone."
        );
      } else {
        setError("Failed to resend code");
      }
    } catch {
      setError("Network error. Please try again.");
    }
  };

  const handleBackToSignUp = () => {
    router.push("/sign-up");
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
        <LinearGradient colors={["#0E5F63", "#1E7C7E"]} style={styles.card}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBackToSignUp}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <AnimatedElement
            index={0}
            fadeAnims={fadeAnims}
            slideAnims={slideAnims}
          >
            <ShuffleText text="Verification" delay={300} style={styles.title} />
            <Text style={styles.subtitle}>
              Enter the 4-digit code sent to{"\n"}
              {phone}
            </Text>
          </AnimatedElement>
        </LinearGradient>

        <View style={styles.form}>
          <AnimatedElement
            index={1}
            fadeAnims={fadeAnims}
            slideAnims={slideAnims}
          >
            <View style={styles.codeContainer}>
              {code.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => {
                    if (ref) inputRefs.current[index] = ref;
                  }}
                  style={[styles.codeInput, error && styles.codeInputError]}
                  value={digit}
                  onChangeText={(text) => handleCodeChange(text, index)}
                  onKeyPress={(e) => handleKeyPress(e, index)}
                  placeholder="0"
                  placeholderTextColor="#B0B0B0"
                  keyboardType="number-pad"
                  maxLength={1}
                  textAlign="center"
                  selectionColor="#1E7C7E"
                />
              ))}
            </View>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </AnimatedElement>

          <AnimatedElement
            index={2}
            fadeAnims={fadeAnims}
            slideAnims={slideAnims}
          >
            <Animated.View
              style={{
                transform: [
                  {
                    scale: buttonScaleAnim,
                  },
                ],
                marginTop: 24,
              }}
            >
              <TouchableOpacity
                style={styles.verifyButton}
                onPress={handleVerify}
                activeOpacity={0.8}
              >
                <Text style={styles.verifyButtonText}>Verify</Text>
              </TouchableOpacity>
            </Animated.View>

            <View style={styles.resendContainer}>
              <Text style={styles.resendText}>
                Didn&apos;t receive the code?{" "}
              </Text>
              <TouchableOpacity
                onPress={handleResend}
                disabled={!canResend}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.resendLink,
                    !canResend && styles.resendLinkDisabled,
                  ]}
                >
                  {canResend ? "Resend" : `Resend in ${timer}s`}
                </Text>
              </TouchableOpacity>
            </View>
          </AnimatedElement>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  scrollContainer: {
    flexGrow: 1,
  },
  card: {
    height: 220,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 50,
    paddingBottom: 30,
    justifyContent: "space-between",
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: -8,
  },
  title: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "700",
    lineHeight: 38,
    marginTop: 10,
    marginBottom: 8,
  },
  subtitle: {
    color: "#B8E6E8",
    fontSize: 14,
    fontWeight: "400",
    lineHeight: 20,
  },
  form: {
    padding: 28,
    paddingTop: 36,
  },
  codeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  codeInput: {
    width: 60,
    height: 60,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    fontSize: 24,
    fontWeight: "600",
    color: "#333",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.1)",
      },
    }),
  },
  codeInputError: {
    borderColor: "#E74C3C",
    borderWidth: 1.5,
  },
  errorText: {
    color: "#E74C3C",
    fontSize: 12,
    marginTop: 4,
    textAlign: "center",
  },
  verifyButton: {
    backgroundColor: "#1E7C7E",
    borderRadius: 25,
    height: 52,
    justifyContent: "center",
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#1E7C7E",
        shadowOffset: {
          width: 0,
          height: 6,
        },
        shadowOpacity: 0.4,
        shadowRadius: 8,
      },
      android: {
        elevation: 12,
      },
      web: {
        boxShadow: "0px 6px 8px rgba(30, 124, 126, 0.4)",
      },
    }),
    marginTop: 24,
  },
  verifyButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  resendContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
  },
  resendText: {
    color: "#666",
    fontSize: 14,
    fontWeight: "400",
  },
  resendLink: {
    color: "#1E7C7E",
    fontSize: 14,
    fontWeight: "600",
  },
  resendLinkDisabled: {
    color: "#999",
  },
});
