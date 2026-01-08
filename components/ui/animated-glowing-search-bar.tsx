import React, { useState } from "react";
import { View, TextInput, StyleSheet, Animated, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

/**
 * Note: This component has been adapted for React Native from a Web Tailwind implementation.
 * To use standard Tailwind classes in React Native, you should set up NativeWind.
 */

const AnimatedGlowingSearchBar = () => {
  const [isFocused, setIsFocused] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  return (
    <View style={styles.outerContainer}>
      {/* Background Glow Effects (Simulating the conic-gradients from the web version) */}
      <View style={styles.glowContainer}>
        <LinearGradient
          colors={["#402fb5", "#cf30aa", "#402fb5"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.glowLayer,
            { opacity: isFocused ? 0.8 : 0.4, borderRadius: 12 },
          ]}
        />
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          placeholder="Search..."
          placeholderTextColor="#9ca3af"
          value={searchValue}
          onChangeText={setSearchValue}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={styles.input}
        />

        {/* Decorative masks (Simulated) */}
        {!isFocused && <View style={styles.inputMask} />}
        <View style={[styles.pinkMask, { opacity: isFocused ? 0 : 0.8 }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    width: 314,
    height: 70,
    alignSelf: "center",
  },
  glowContainer: {
    position: "absolute",
    zIndex: -1,
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  glowLayer: {
    width: 312,
    height: 65,
  },
  inputContainer: {
    position: "relative",
    width: 301,
    height: 56,
    backgroundColor: "#010201",
    borderRadius: 8,
    justifyContent: "center",
    overflow: "hidden",
  },
  input: {
    backgroundColor: "transparent",
    color: "#ffffff",
    paddingHorizontal: 59,
    fontSize: 18,
    height: "100%",
  },
  inputMask: {
    position: "absolute",
    width: 100,
    height: 20,
    backgroundColor: "transparent", // Would use a gradient here
    top: 18,
    left: 70,
  },
  pinkMask: {
    position: "absolute",
    width: 30,
    height: 20,
    backgroundColor: "#cf30aa",
    top: 10,
    left: 5,
    borderRadius: 15,
  },
});

export default AnimatedGlowingSearchBar;
