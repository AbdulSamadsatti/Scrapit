import React, { useRef, useEffect } from "react";
import LottieView from "lottie-react-native";
import { View, TouchableOpacity, StyleSheet } from "react-native";

// Note: The JSON provided was truncated. Using a high-quality filter animation placeholder
// until the full JSON is provided.
const FILTER_JSON = {
  v: "5.6.5",
  fr: 30,
  ip: 0,
  op: 60,
  w: 32,
  h: 32,
  nm: "filter",
  ddd: 0,
  assets: [],
  layers: [
    {
      ddd: 0,
      ind: 1,
      ty: 4,
      nm: "filter",
      sr: 1,
      ks: {
        o: { a: 0, k: 100, ix: 11 },
        r: { a: 0, k: 0, ix: 10 },
        p: { a: 0, k: [16, 16, 0], ix: 2 },
        a: { a: 0, k: [12, 12, 0], ix: 1 },
        s: { a: 0, k: [100, 100, 100], ix: 6 },
      },
      ao: 0,
      shapes: [
        {
          ty: "gr",
          it: [
            {
              ind: 0,
              ty: "sh",
              ix: 1,
              ks: {
                a: 0,
                k: {
                  i: [
                    [0, 0],
                    [0, 0],
                    [0, 0],
                    [0, 0],
                    [0, 0],
                    [0, 0],
                  ],
                  o: [
                    [0, 0],
                    [0, 0],
                    [0, 0],
                    [0, 0],
                    [0, 0],
                    [0, 0],
                  ],
                  v: [
                    [10, -9],
                    [-10, -9],
                    [-2, 0.46],
                    [-2, 7],
                    [2, 9],
                    [2, 0.46],
                  ],
                  c: true,
                },
                ix: 2,
              },
              nm: "Path 1",
              mn: "ADBE Vector Shape - Group",
              hd: false,
            },
            {
              ty: "st",
              c: { a: 0, k: [1, 1, 1, 1], ix: 3 }, // Changed to white
              o: { a: 0, k: 100, ix: 4 },
              w: { a: 0, k: 2, ix: 5 },
              lc: 2,
              lj: 2,
              bm: 0,
              nm: "Stroke 1",
              mn: "ADBE Vector Graphic - Stroke",
              hd: false,
            },
            {
              ty: "tr",
              p: { a: 0, k: [12, 12], ix: 2 },
              a: { a: 0, k: [0, 0], ix: 1 },
              s: { a: 0, k: [100, 100], ix: 3 },
              r: { a: 0, k: 0, ix: 6 },
              o: { a: 0, k: 100, ix: 7 },
              sk: { a: 0, k: 0, ix: 4 },
              sa: { a: 0, k: 0, ix: 5 },
              nm: "Transform",
            },
          ],
          nm: "filter",
          np: 2,
          cix: 2,
          bm: 0,
          ix: 1,
          mn: "ADBE Vector Group",
          hd: false,
        },
      ],
      ip: 0,
      op: 60,
      st: 0,
      bm: 0,
    },
  ],
};

interface LottieFilterProps {
  size?: number;
  onPress?: () => void;
}

const LottieFilter: React.FC<LottieFilterProps> = ({ size = 24, onPress }) => {
  const animationRef = useRef<LottieView>(null);

  const handlePress = () => {
    // Play full animation (0 to 60 frames)
    animationRef.current?.play(0, 60);
    onPress?.();
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      style={styles.container}
    >
      <View style={{ width: size, height: size }}>
        <LottieView
          ref={animationRef}
          source={FILTER_JSON}
          style={{ width: "100%", height: "100%" }}
          loop={false}
          autoPlay={false}
          speed={1.5} // Make it slightly faster for better feel
        />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 40,
    height: 40,
    borderRadius: 20,
  }
});

export default LottieFilter;
