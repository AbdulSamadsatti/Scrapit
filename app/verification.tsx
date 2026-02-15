import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { CustomButton } from "../components/ui/CustomButton";
import { ShuffleText } from "../components/ui/ShuffleText";

const { width } = Dimensions.get("window");

const AnimatedElement = ({
  children,
  index,
  fadeAnims,
  slideAnims,
}: {
  children: React.ReactNode;
  index: number;
  fadeAnims: Animated.Value[];
  slideAnims: Animated.Value[];
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
  const { phone } = useLocalSearchParams();
  const [code, setCode] = useState(["", "", "", ""]);
  const [timer, setTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [error, setError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  const fadeAnims = useRef([new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]).current;
  const slideAnims = useRef([new Animated.Value(20), new Animated.Value(20), new Animated.Value(20)]).current;
  const buttonScaleAnim = useRef(new Animated.Value(1)).current;
  const inputRefs = useRef<TextInput[]>([]);

  useEffect(() => {
    Animated.stagger(100, [
      ...fadeAnims.map((anim) =>
        Animated.timing(anim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        })
      ),
      ...slideAnims.map((anim) =>
        Animated.timing(anim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        })
      ),
    ]).start();

    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [fadeAnims, slideAnims]);

  const handleCodeChange = (text: string, index: number) => {
    if (text.length > 1) {
      text = text.slice(-1);
    }

    const newCode = [...code];
    newCode[index] = text;
    setCode(newCode);
    setError("");

    if (text && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
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

    setIsVerifying(true);
    try {
      // Simulate verification delay
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      console.log("Verification successful, navigating to home...");
      router.replace("/home");
    } catch (err) {
      console.error("Verification error:", err);
      setError("Verification failed. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSkip = () => {
    console.log("Skipping verification, navigating to home...");
    router.replace("/home");
  };

  const handleResend = () => {
    if (!canResend) return;
    setTimer(30);
    setCanResend(false);
    setCode(["", "", "", ""]);
    setError("");
    inputRefs.current[0]?.focus();
    // Logic to resend code would go here
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <LinearGradient
          colors={["#031d1e", "#063537", "#0D5A5B"]}
          style={styles.header}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <AnimatedElement
            index={0}
            fadeAnims={fadeAnims}
            slideAnims={slideAnims}
          >
            <ShuffleText text="Verification" delay={300} style={styles.title} />
            <Text style={styles.subtitle}>
              Enter the 4-digit code sent to{"\n"}
              {phone || "your phone"}
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
                  style={[styles.codeInput, error ? styles.codeInputError : null]}
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
                transform: [{ scale: buttonScaleAnim }],
                marginTop: 24,
              }}
            >
              <CustomButton
                title="Verify"
                loading={isVerifying}
                variant="primary"
                onPress={handleVerify}
              />
            </Animated.View>

            <TouchableOpacity
              onPress={handleSkip}
              style={styles.skipButton}
              activeOpacity={0.7}
            >
              <Text style={styles.skipText}>Skip for now</Text>
            </TouchableOpacity>

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
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    height: 280,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 40,
  },
  backButton: {
    position: "absolute",
    top: 50,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 36,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
    lineHeight: 24,
  },
  form: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    marginTop: -30,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 30,
    paddingTop: 40,
  },
  codeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  codeInput: {
    width: (width - 100) / 4,
    height: 70,
    backgroundColor: "#F8F9FA",
    borderRadius: 15,
    borderWidth: 2,
    borderColor: "#E9ECEF",
    fontSize: 28,
    fontWeight: "700",
    color: "#031d1e",
  },
  codeInputError: {
    borderColor: "#DC3545",
  },
  errorText: {
    color: "#DC3545",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 10,
  },
  skipButton: {
    alignItems: "center",
    marginTop: 16,
    paddingVertical: 8,
  },
  skipText: {
    color: "#1E7C7E",
    fontSize: 16,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  resendContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 30,
  },
  resendText: {
    color: "#6C757D",
    fontSize: 15,
  },
  resendLink: {
    color: "#1E7C7E",
    fontSize: 15,
    fontWeight: "700",
  },
  resendLinkDisabled: {
    color: "#B0B0B0",
  },
});
