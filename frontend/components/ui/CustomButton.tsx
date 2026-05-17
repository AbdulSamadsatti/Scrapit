import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  ViewStyle,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

export interface CustomButtonProps {
  title: string;
  onPress: () => void | Promise<void>;
  variant?: "primary" | "secondary" | "google";
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
  loading?: boolean;
  disabled?: boolean;
}

export const CustomButton: React.FC<CustomButtonProps> = ({
  title,
  onPress,
  variant = "primary",
  icon,
  iconColor,
  style,
  textStyle,
  loading = false,
  disabled = false,
}) => {
  const getButtonStyle = () => {
    switch (variant) {
      case "secondary":
        return styles.secondaryButton;
      case "google":
        return styles.googleButton;
      default:
        return styles.primaryButton;
    }
  };

  const getTextStyle = () => {
    switch (variant) {
      case "secondary":
        return styles.secondaryButtonText;
      case "google":
        return styles.googleButtonText;
      default:
        return styles.primaryButtonText;
    }
  };

  const spinnerColor =
    iconColor || (variant === "google" ? "#DB4437" : "#E8F4F5");

  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      style={[
        styles.button,
        getButtonStyle(),
        isDisabled ? styles.disabled : null,
        style,
      ]}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={isDisabled}
    >
      {variant === "primary" && (
        <LinearGradient
          colors={["#031d1e", "#063537", "#0D5A5B", "#1E7C7E"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradientFill}
          pointerEvents="none"
        />
      )}
      {loading ? (
        <ActivityIndicator
          size="small"
          color={spinnerColor}
          style={styles.icon}
        />
      ) : icon ? (
        <Ionicons
          name={icon}
          size={20}
          color={iconColor || (variant === "google" ? "#DB4437" : "#E8F4F5")}
          style={styles.icon}
        />
      ) : null}
      <Text style={[getTextStyle(), textStyle]}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 30,
    height: 56,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    marginBottom: 18,
    overflow: "hidden",
  },
  primaryButton: {
    ...Platform.select({
      ios: {
        shadowColor: "#1E7C7E",
        shadowOffset: {
          width: 0,
          height: 4,
        },
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
  secondaryButton: {
    backgroundColor: "#E8F4F5",
  },
  googleButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D0D0D0",
  },
  primaryButtonText: {
    color: "#E8F4F5",
    fontSize: 17,
    fontWeight: "700",
  },
  secondaryButtonText: {
    color: "#1E7C7E",
    fontSize: 17,
    fontWeight: "700",
  },
  googleButtonText: {
    color: "#5A5A5A",
    fontSize: 16,
    fontWeight: "500",
  },
  icon: {
    marginRight: 12,
  },
  gradientFill: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  disabled: {
    opacity: 0.7,
  },
});
