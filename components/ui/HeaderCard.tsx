import React from "react";
import { StyleSheet, Text, View, Platform } from "react-native";

interface HeaderCardProps {
  title: string[];
  variant?: "light" | "dark";
}

export const HeaderCard: React.FC<HeaderCardProps> = ({
  title,
  variant = "dark",
}) => {
  const isDark = variant === "dark";

  return (
    <View style={[styles.topCard, isDark ? styles.darkCard : styles.lightCard]}>
      <View style={styles.textContainer}>
        {title.map((text, index) => (
          <Text
            key={index}
            style={[
              styles.welcomeText,
              isDark ? styles.darkText : styles.lightText,
            ]}
          >
            {text}
          </Text>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  topCard: {
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  darkCard: {
    backgroundColor: "#1E7C7E",
    ...Platform.select({
      ios: {
        shadowColor: "#1E7C7E",
      },
      web: {
        boxShadow: "0px 10px 15px rgba(30, 124, 126, 0.3)",
      },
    }),
  },
  lightCard: {
    backgroundColor: "#FFFFFF",
    ...Platform.select({
      ios: {
        shadowColor: "#000000",
      },
      web: {
        boxShadow: "0px 10px 15px rgba(0, 0, 0, 0.3)",
      },
    }),
  },
  textContainer: {
    justifyContent: "center",
  },
  welcomeText: {
    fontSize: 42,
    fontWeight: "700",
    lineHeight: 48,
  },
  darkText: {
    color: "#FFFFFF",
  },
  lightText: {
    color: "#1E7C7E",
  },
});
