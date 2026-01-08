import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  ViewStyle,
  Platform,
} from "react-native";

interface CustomButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "google";
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const CustomButton: React.FC<CustomButtonProps> = ({
  title,
  onPress,
  variant = "primary",
  icon,
  iconColor,
  style,
  textStyle,
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

  return (
    <TouchableOpacity
      style={[styles.button, getButtonStyle(), style]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {icon && (
        <Ionicons
          name={icon}
          size={20}
          color={iconColor || (variant === "google" ? "#DB4437" : "#E8F4F5")}
          style={styles.icon}
        />
      )}
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
  },
  primaryButton: {
    backgroundColor: "#1E7C7E",
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
});
