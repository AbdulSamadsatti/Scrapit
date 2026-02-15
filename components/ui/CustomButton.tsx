import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  ViewStyle,
  Platform,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

interface CustomButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "google";
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
  disabled?: boolean;
  loading?: boolean;
}

export const CustomButton: React.FC<CustomButtonProps> = ({
  title,
  onPress,
  variant = "primary",
  icon,
  iconColor,
  style,
  textStyle,
  disabled = false,
  loading = false,
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

  const getLoaderColor = () => {
    switch (variant) {
      case "secondary":
        return "#1E7C7E";
      case "google":
        return "#757575";
      default:
        return "#FFFFFF";
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        getButtonStyle(),
        style,
        (disabled || loading) && styles.disabledButton,
      ]}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={disabled || loading}
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
        <ActivityIndicator color={getLoaderColor()} style={styles.loader} />
      ) : (
        <>
          {icon && (
            <Ionicons
              name={icon}
              size={20}
              color={iconColor || (variant === "google" ? "#DB4437" : "#E8F4F5")}
              style={styles.icon}
            />
          )}
          <Text style={[getTextStyle(), textStyle]}>{title}</Text>
        </>
      )}
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
  disabledButton: {
    opacity: 0.6,
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
        shadowRadius: 4.65,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  secondaryButton: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: "#1E7C7E",
  },
  googleButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  gradientFill: {
    ...StyleSheet.absoluteFillObject,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  secondaryButtonText: {
    color: "#1E7C7E",
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  googleButtonText: {
    color: "#757575",
    fontSize: 16,
    fontWeight: "600",
  },
  icon: {
    marginRight: 10,
  },
  loader: {
    marginRight: 0,
  },
});
