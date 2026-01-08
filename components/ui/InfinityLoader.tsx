import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated } from "react-native";
import Svg, { Path, Defs, LinearGradient, Stop } from "react-native-svg";

const AnimatedPath = Animated.createAnimatedComponent(Path);

interface InfinityLoaderProps {
  color1?: string;
  color2?: string;
  size?: number;
}

export default function InfinityLoader({
  color1 = "#FFFFFF",
  color2 = "#FFFFFF",
  size = 0.3,
}: InfinityLoaderProps) {
  const dashOffset = useRef(new Animated.Value(192)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(dashOffset, {
        toValue: 1,
        duration: 1800,
        useNativeDriver: false,
      })
    ).start();
  }, [dashOffset]);

  return (
    <View style={styles.loaderContainer}>
      <Svg width={100 * size} height={60 * size} viewBox="0 0 187.3 93.7">
        <Defs>
          <LinearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor={color1} />
            <Stop offset="100%" stopColor={color2} />
          </LinearGradient>
        </Defs>
        <AnimatedPath
          d="M93.9,46.4c9.3,9.5,13.8,17.9,23.5,17.9s17.5-7.8,17.5-17.5s-7.8-17.6-17.5-17.5c-9.7,0.1-13.3,7.2-22.1,17.1c-8.9,8.8-15.7,17.9-25.4,17.9s-17.5-7.8-17.5-17.5s7.8-17.5,17.5-17.5S86.2,38.6,93.9,46.4z"
          stroke="url(#gradient)"
          strokeWidth="8"
          fill="none"
          strokeDasharray="50, 14"
          strokeDashoffset={dashOffset}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  loaderContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
});
