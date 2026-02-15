import React, { useRef, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  Animated,
  Dimensions,
  AppState,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import InfinityLoader from "@/components/ui/InfinityLoader";

const { width } = Dimensions.get("window");

export default function CinematicSplash() {
  const floatAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim1 = useRef(new Animated.Value(0)).current;
  const rotateAnim2 = useRef(new Animated.Value(0)).current;
  const breatheAnim = useRef(new Animated.Value(1)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleScale = useRef(new Animated.Value(0.9)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const loadingOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Function to start all animations
    const startAnimations = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(floatAnim, {
            toValue: 1,
            duration: 4000,
            useNativeDriver: true,
          }),
          Animated.timing(floatAnim, {
            toValue: 0,
            duration: 4000,
            useNativeDriver: true,
          }),
        ]),
      ).start();

      Animated.loop(
        Animated.timing(rotateAnim1, {
          toValue: 1,
          duration: 10000,
          useNativeDriver: true,
        }),
      ).start();

      // Rotate ring 2 (reverse)
      Animated.loop(
        Animated.timing(rotateAnim2, {
          toValue: 1,
          duration: 15000,
          useNativeDriver: true,
        }),
      ).start();

      // Breathe animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(breatheAnim, {
            toValue: 1.1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(breatheAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
        ]),
      ).start();

      // Title entrance
      Animated.parallel([
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 1200,
          delay: 200,
          useNativeDriver: true,
        }),
        Animated.timing(titleScale, {
          toValue: 1,
          duration: 1200,
          delay: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Tagline entrance
      Animated.timing(taglineOpacity, {
        toValue: 1,
        duration: 1000,
        delay: 500,
        useNativeDriver: true,
      }).start();

      // Loading entrance
      Animated.timing(loadingOpacity, {
        toValue: 1,
        duration: 800,
        delay: 1200,
        useNativeDriver: true,
      }).start();
    };

    // Reset function to restart splash animation
    const resetSplash = () => {
      // Reset all animation values
      floatAnim.setValue(0);
      rotateAnim1.setValue(0);
      rotateAnim2.setValue(0);
      breatheAnim.setValue(1);
      titleOpacity.setValue(0);
      titleScale.setValue(0.9);
      taglineOpacity.setValue(0);
      loadingOpacity.setValue(0);
    };

    // Handle app state changes
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        // App became active - reset splash
        resetSplash();
        // Restart animations
        startAnimations();
      }
    });

    // Navigate to login after splash animation
    const timer = setTimeout(() => {
      router.replace("/log-in");
    }, 5000);

    // Start animations initially
    startAnimations();

    return () => {
      clearTimeout(timer);
      subscription.remove();
    };
  }, [
    floatAnim,
    rotateAnim1,
    rotateAnim2,
    breatheAnim,
    titleOpacity,
    titleScale,
    taglineOpacity,
    loadingOpacity,
  ]);

  const floatInterpolate = floatAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, -15, 0],
  });

  const rotateInterpolate1 = rotateAnim1.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const rotateInterpolate2 = rotateAnim2.interpolate({
    inputRange: [0, 1],
    outputRange: ["360deg", "0deg"],
  });

  return (
    <LinearGradient
      colors={["#050505", "#0a0a0a", "#050505"]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.container}
    >
      <View
        style={[
          styles.topGlow,
          Platform.select({
            ios: {
              shadowColor: "#22c55e",
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.15,
              shadowRadius: 120,
            },
            web: {
              boxShadow: "0px 0px 120px rgba(34, 197, 94, 0.15)",
            },
          }),
        ]}
      />

      <View
        style={[
          styles.bottomGlow,
          Platform.select({
            ios: {
              shadowColor: "#047857",
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.1,
              shadowRadius: 100,
            },
            web: {
              boxShadow: "0px 0px 100px rgba(4, 120, 87, 0.1)",
            },
          }),
        ]}
      />

      <View style={styles.mainContainer}>
        <Animated.View
          style={[
            styles.logoWrapper,
            {
              transform: [{ translateY: floatInterpolate }],
            },
          ]}
        >
          <Animated.View
            style={[
              styles.ring1,
              {
                transform: [{ rotate: rotateInterpolate1 }],
              },
            ]}
          />

          <Animated.View
            style={[
              styles.ring2,
              {
                transform: [{ rotate: rotateInterpolate2 }],
              },
            ]}
          />

          <Animated.View
            style={[
              styles.glowOrb,
              {
                transform: [{ scale: breatheAnim }],
              },
            ]}
          />

          <View style={styles.logoBox}>
            <View style={styles.reflection} />

            <Ionicons
              name="infinite"
              size={80}
              color="#4ade80"
              style={Platform.select({
                ios: {
                  textShadowColor: "rgba(74, 222, 128, 0.6)",
                  textShadowOffset: { width: 0, height: 0 },
                  textShadowRadius: 15,
                },
                web: {
                  textShadow: "0px 0px 15px rgba(74, 222, 128, 0.6)",
                },
              })}
            />
          </View>
        </Animated.View>

        <Animated.View
          style={[
            styles.textContainer,
            {
              opacity: titleOpacity,
              transform: [
                {
                  scale: titleScale,
                },
              ],
            },
          ]}
        >
          <Text style={styles.title}>Scrapit</Text>
        </Animated.View>

        <Animated.View
          style={[
            styles.taglineContainer,
            {
              opacity: taglineOpacity,
            },
          ]}
        >
          <Text style={styles.tagline}>Search less, Get more</Text>
        </Animated.View>
      </View>

      <Animated.View
        style={[
          styles.loadingContainer,
          {
            opacity: loadingOpacity,
          },
        ]}
      >
        <InfinityLoader size={0.6} />
        <Text style={styles.loadingText}>INITIALIZING</Text>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#050505",
  },

  topGlow: {
    position: "absolute",
    top: -100,
    left: width / 2 - 400,
    width: 800,
    height: 600,
    backgroundColor: "rgba(34, 197, 94, 0.08)",
    borderRadius: 400,
  },

  bottomGlow: {
    position: "absolute",
    bottom: -100,
    left: width / 2 - 300,
    width: 600,
    height: 400,
    backgroundColor: "rgba(4, 120, 87, 0.1)",
    borderRadius: 300,
  },

  mainContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },

  logoWrapper: {
    width: 160,
    height: 160,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 40,
  },

  ring1: {
    position: "absolute",
    width: 160,
    height: 80,
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.2)",
    borderRadius: 80,
    top: 40,
  },

  ring2: {
    position: "absolute",
    width: 200,
    height: 100,
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.1)",
    borderRadius: 100,
    top: 30,
  },

  glowOrb: {
    position: "absolute",
    width: 160,
    height: 160,
    backgroundColor: "rgba(34, 197, 94, 0.1)",
    borderRadius: 80,
  },

  logoBox: {
    width: 160,
    height: 160,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderRadius: 32,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#4ade80",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 30,
      },
      android: {
        elevation: 15,
      },
      web: {
        boxShadow: "0px 0px 30px rgba(74, 222, 128, 0.3)",
      },
    }),
    zIndex: 5,
  },

  reflection: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(9, 120, 142, 0.05)",
    borderRadius: 32,
  },

  textContainer: {
    alignItems: "center",
    marginBottom: 12,
  },

  title: {
    fontSize: 48,
    fontWeight: "600",
    color: "#ffffff",
    letterSpacing: -1,
    textAlign: "center",
  },

  taglineContainer: {
    marginBottom: 60,
  },

  tagline: {
    fontSize: 14,
    fontWeight: "500",
    color: "rgba(74, 222, 128, 0.6)",
    letterSpacing: 2,
    textTransform: "uppercase",
    textAlign: "center",
  },

  loadingContainer: {
    position: "absolute",
    bottom: 48,
    alignItems: "center",
    zIndex: 10,
  },

  loadingText: {
    fontSize: 10,
    fontWeight: "400",
    color: "rgba(64, 64, 64, 0.8)",
    letterSpacing: 2,
    marginTop: 4,
  },
});
