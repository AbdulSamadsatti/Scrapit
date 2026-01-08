import { useLocalSearchParams, useRouter } from "expo-router";
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

export default function VerificationForgotScreen() {
  const router = useRouter();
  const { phone } = useLocalSearchParams();
  const [code, setCode] = useState(["", "", "", ""]);
  const [error, setError] = useState("");
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  const inputs = useRef<(TextInput | null)[]>([]);

  // Animation values
  const cardScale = useRef(new Animated.Value(0.9)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslateY = useRef(new Animated.Value(-50)).current;

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

  const formOpacity = useRef(new Animated.Value(0)).current;
  const formTranslateY = useRef(new Animated.Value(30)).current;

  const inputAnims = useRef([
    new Animated.Value(-50), // Code Container
    new Animated.Value(-50), // Verify Button
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
      ])
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
    fadeAnims,
    slideAnims,
    buttonScaleAnim,
    formOpacity,
    formTranslateY,
    inputAnims,
  ]);

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
    const newCode = [...code];
    newCode[index] = text;
    setCode(newCode);

    if (text && index < 3) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (
    e: { nativeEvent: { key: string } },
    index: number
  ) => {
    if (e.nativeEvent.key === "Backspace" && !code[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handleVerify = () => {
    const fullCode = code.join("");
    if (fullCode.length !== 4) {
      setError("Please enter a 4-digit code");
      return;
    }

    router.push({
      pathname: "/reset-password",
      params: { phone, code: fullCode },
    });
  };

  const handleResend = () => {
    setTimer(60);
    setCanResend(false);
    setError("");
    console.log("Resend code");
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
            <ShuffleText
              text="Verification"
              delay={300}
              style={styles.welcomeText}
            />
            <ShuffleText text="Code" delay={600} style={styles.welcomeText} />
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
                text="Verification"
                delay={300}
                style={styles.title}
              />
            </View>
            <Text style={styles.subtitle}>
              Please enter the 4-digit code sent to{"\n"}Your Phone No. {phone}
            </Text>
          </AnimatedElement>

          <AnimatedElement
            index={1}
            fadeAnims={fadeAnims}
            slideAnims={slideAnims}
          >
            <Animated.View
              style={[
                styles.codeContainer,
                { transform: [{ translateX: inputAnims[0] }] },
              ]}
            >
              {code.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => {
                    inputs.current[index] = ref;
                  }}
                  style={[styles.codeInput, error ? styles.inputError : null]}
                  value={digit}
                  onChangeText={(text) => handleCodeChange(text, index)}
                  onKeyPress={(e) => handleKeyPress(e, index)}
                  keyboardType="number-pad"
                  maxLength={1}
                  textAlign="center"
                />
              ))}
            </Animated.View>
          </AnimatedElement>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <AnimatedElement
            index={2}
            fadeAnims={fadeAnims}
            slideAnims={slideAnims}
          >
            <View style={styles.resendContainer}>
              <Text style={styles.resendText}>Didn't receive the code? </Text>
              <TouchableOpacity
                onPress={canResend ? handleResend : undefined}
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

          <AnimatedElement
            index={3}
            fadeAnims={fadeAnims}
            slideAnims={slideAnims}
          >
            <Animated.View
              style={{
                transform: [
                  { translateX: inputAnims[1] },
                  { scale: buttonScaleAnim },
                ],
              }}
            >
              <TouchableOpacity
                style={styles.loginBtn}
                onPress={handleVerify}
                activeOpacity={0.8}
              >
                <Text style={styles.loginBtnText}>Verify Code</Text>
              </TouchableOpacity>
            </Animated.View>
          </AnimatedElement>

          <Animated.View style={{ opacity: inputAnims[2] }}>
            <TouchableOpacity
              onPress={() => router.push("/forgot-password")}
              activeOpacity={0.7}
              style={styles.backButton}
            >
              <Text style={styles.backButtonText}>Back to Forgot Password</Text>
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
    marginBottom: 24,
  },
  codeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  codeInput: {
    width: 50,
    height: 60,
    backgroundColor: "#EAF6F7",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#9AC6C8",
    fontSize: 24,
    fontWeight: "700",
    color: "#1E7C7E",
  },
  inputError: {
    borderColor: "#E74C3C",
    borderWidth: 1.5,
  },
  errorText: {
    color: "#E74C3C",
    fontSize: 13,
    marginBottom: 16,
    textAlign: "center",
  },
  resendContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
  },
  resendText: {
    color: "#4A7071",
    fontSize: 14,
    fontWeight: "400",
  },
  resendLink: {
    color: "#1E7C7E",
    fontSize: 14,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  resendLinkDisabled: {
    color: "rgba(30, 124, 126, 0.5)",
    textDecorationLine: "none",
  },
  loginBtn: {
    backgroundColor: "#1E7C7E",
    borderRadius: 25,
    height: 52,
    justifyContent: "center",
    alignItems: "center",
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
