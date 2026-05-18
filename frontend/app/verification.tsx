import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { deleteDoc, doc, getDoc, getFirestore, setDoc, Timestamp } from "firebase/firestore";
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
import { CustomButton } from "../components/ui/CustomButton";
import { ShuffleText } from "../components/ui/ShuffleText";

const db = getFirestore();

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
  const { email } = useLocalSearchParams(); // Sirf email — OTP nahi
  const [timer, setTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [error, setError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  // OTP State (6 digits)
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  const fadeAnims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;
  const slideAnims = useRef([
    new Animated.Value(20),
    new Animated.Value(20),
    new Animated.Value(20),
    new Animated.Value(20),
  ]).current;
  const buttonScaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.stagger(100, [
      ...fadeAnims.map((anim) =>
        Animated.timing(anim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ),
      ...slideAnims.map((anim) =>
        Animated.timing(anim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
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

  const handleOtpChange = (text: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);

    // Auto-advance
    if (text.length === 1 && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Email ko Firestore key mein convert karo (dots replace karo)
  const getEmailKey = (emailStr: string) =>
    emailStr.trim().toLowerCase().replace(/\./g, "_");

  const handleResend = async () => {
    if (!canResend) return;
    try {
      setTimer(30);
      setCanResend(false);
      setError("");

      const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
      const emailKey = getEmailKey(email as string);

      // Firestore mein naya OTP save karo
      await setDoc(doc(db, "otps", emailKey), {
        otp: newOtp,
        createdAt: Timestamp.now(),
        expiresAt: Timestamp.fromMillis(Date.now() + 10 * 60 * 1000),
      });

      // Email bhejo
      const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service_id: "service_c44lf2l",
          template_id: "template_tdf9f4n",
          user_id: "x33s5G84zCeXfGG5W",
          accessToken: "uOA3Grq83yiDUTognUaZq",
          template_params: {
            email: email,
            passcode: newOtp,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`EmailJS Error: ${errorData}`);
      }

      // Input clear karo
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } catch {
      setError("Failed to resend. Try again.");
    }
  };

  const handleVerify = async () => {
    const otpString = otp.join("");
    if (otpString.length < 6) {
      setError("Please enter the 6-digit code.");
      return;
    }

    try {
      setIsVerifying(true);
      setError("");

      const emailKey = getEmailKey(email as string);

      // Firestore se OTP fetch karo
      const otpDoc = await getDoc(doc(db, "otps", emailKey));

      if (!otpDoc.exists()) {
        setError("OTP expired or not found. Please resend.");
        setIsVerifying(false);
        return;
      }

      const data = otpDoc.data();

      // Expiry check karo
      if (data.expiresAt.toMillis() < Date.now()) {
        await deleteDoc(doc(db, "otps", emailKey));
        setError("OTP expired. Please resend.");
        setIsVerifying(false);
        return;
      }

      // OTP match karo
      if (otpString === data.otp) {
        // OTP delete karo — ek baar use
        await deleteDoc(doc(db, "otps", emailKey));
        router.replace("/home"); // ✅
      } else {
        setError("Wrong OTP. Please try again.");
      }
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setIsVerifying(false);
    }
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
            <Text style={styles.subtitle}>Confirm your email to continue</Text>
          </AnimatedElement>
        </LinearGradient>

        <View style={styles.form}>
          <AnimatedElement
            index={1}
            fadeAnims={fadeAnims}
            slideAnims={slideAnims}
          >
            <View style={styles.iconContainer}>
              <Ionicons name="mail-outline" size={64} color="#1E7C7E" />
            </View>
            <Text style={styles.infoText}>OTP has been sent to:</Text>
            <Text style={styles.emailText}>{email || "your email"}</Text>
          </AnimatedElement>

          <AnimatedElement
            index={2}
            fadeAnims={fadeAnims}
            slideAnims={slideAnims}
          >
            <View style={styles.otpContainer}>
              {otp.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => { inputRefs.current[index] = ref; }}
                  style={[styles.otpInput, digit ? styles.otpInputFilled : null, error ? styles.otpInputError : null]}
                  value={digit}
                  onChangeText={(text) => handleOtpChange(text.replace(/[^0-9]/g, ""), index)}
                  onKeyPress={(e) => handleOtpKeyPress(e, index)}
                  keyboardType="numeric"
                  maxLength={1}
                  selectTextOnFocus
                />
              ))}
            </View>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </AnimatedElement>

          <AnimatedElement
            index={3}
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
                title="Verify OTP"
                loading={isVerifying}
                variant="primary"
                onPress={handleVerify}
              />
            </Animated.View>

            <TouchableOpacity
              onPress={handleResend}
              disabled={!canResend}
              style={styles.resendButton}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.resendLink,
                  !canResend && styles.resendLinkDisabled,
                ]}
              >
                {canResend ? "Resend OTP" : `Resend OTP in ${timer}s`}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleBack}
              style={styles.backLinkButton}
              activeOpacity={0.7}
            >
              <Text style={styles.backLinkText}>Back to Signup</Text>
            </TouchableOpacity>
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
  iconContainer: {
    alignItems: "center",
    marginBottom: 20,
    backgroundColor: "#EAF6F7",
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignSelf: "center",
  },
  infoText: {
    fontSize: 15,
    color: "#6C757D",
    textAlign: "center",
    marginTop: 8,
  },
  emailText: {
    fontSize: 18,
    color: "#031d1e",
    fontWeight: "700",
    textAlign: "center",
    marginTop: 6,
  },
  otpContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    marginTop: 30,
    marginBottom: 10,
  },
  otpInput: {
    width: 45,
    height: 50,
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
    textAlign: "center",
  },
  otpInputFilled: {
    borderColor: "#1E7C7E",
    backgroundColor: "#EAF6F7",
  },
  otpInputError: {
    borderColor: "#DC3545",
  },
  errorText: {
    color: "#DC3545",
    fontSize: 14,
    textAlign: "center",
    marginTop: 12,
  },
  resendButton: {
    alignItems: "center",
    marginTop: 20,
    paddingVertical: 8,
  },
  resendLink: {
    color: "#1E7C7E",
    fontSize: 15,
    fontWeight: "700",
  },
  resendLinkDisabled: {
    color: "#B0B0B0",
  },
  backLinkButton: {
    alignItems: "center",
    marginTop: 16,
    paddingVertical: 8,
  },
  backLinkText: {
    color: "#1E7C7E",
    fontSize: 15,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
});
