import React, { useState, useEffect, useMemo } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  Platform,
} from "react-native";
import * as Haptics from "expo-haptics";
import {
  Home,
  ShoppingCart,
  Heart,
  MessageSquare,
  User,
} from "lucide-react-native";
import Animated, {
  useAnimatedStyle,
  withSpring,
  withTiming,
  useSharedValue,
} from "react-native-reanimated";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export interface InteractiveMenuItem {
  label: string;
  icon: React.ElementType;
}

export interface InteractiveMenuProps {
  items?: InteractiveMenuItem[];
  accentColor?: string;
  onItemPress?: (index: number) => void;
}

const defaultItems: InteractiveMenuItem[] = [
  { label: "home", icon: Home },
  { label: "cart", icon: ShoppingCart },
  { label: "chatbot", icon: MessageSquare },
  { label: "liked", icon: Heart },
  { label: "profile", icon: User },
];

const DEFAULT_ACCENT = "#FFFFFF"; // White for active items on dark background
const DEFAULT_INACTIVE = "rgba(255, 255, 255, 0.6)"; // Semi-transparent white for inactive items

const InteractiveMenu: React.FC<InteractiveMenuProps> = ({
  items,
  accentColor = DEFAULT_ACCENT,
  onItemPress,
}) => {
  const finalItems = useMemo(() => {
    const isValid =
      items && Array.isArray(items) && items.length >= 2 && items.length <= 5;
    if (!isValid) {
      return defaultItems;
    }
    return items;
  }, [items]);

  const [activeIndex, setActiveIndex] = useState(0);

  const handleItemClick = (index: number) => {
    if (index !== activeIndex) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setActiveIndex(index);
      if (onItemPress) onItemPress(index);
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.menu]}>
        {finalItems.map((item, index) => (
          <MenuItem
            key={item.label}
            item={item}
            isActive={index === activeIndex}
            onPress={() => handleItemClick(index)}
            accentColor={accentColor}
          />
        ))}
      </View>
    </View>
  );
};

const MenuItem = ({
  item,
  isActive,
  onPress,
  accentColor,
}: {
  item: InteractiveMenuItem;
  isActive: boolean;
  onPress: () => void;
  accentColor: string;
}) => {
  const IconComponent = item.icon;

  // Animation values
  const scale = useSharedValue(1);
  const translateY = useSharedValue(0);
  const glowOpacity = useSharedValue(0);
  const dotScale = useSharedValue(0);

  useEffect(() => {
    if (isActive) {
      // Snappier icon bounce
      translateY.value = withSpring(-6, { damping: 12, stiffness: 200 }, () => {
        translateY.value = withSpring(0, { damping: 12, stiffness: 200 });
      });
      scale.value = withSpring(1.2, { damping: 12, stiffness: 200 });
      glowOpacity.value = withTiming(1, { duration: 200 });
      dotScale.value = withSpring(1, { damping: 15, stiffness: 250 });
    } else {
      scale.value = withSpring(1, { damping: 15, stiffness: 200 });
      translateY.value = withSpring(0, { damping: 15, stiffness: 200 });
      glowOpacity.value = withTiming(0, { duration: 150 });
      dotScale.value = withSpring(0, { damping: 15, stiffness: 200 });
    }
  }, [isActive, translateY, scale, glowOpacity, dotScale]);

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));

  const animatedGlowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: withTiming(isActive ? 1.3 : 0.6, { duration: 250 }) }],
  }));

  const animatedDotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: dotScale.value }],
    opacity: dotScale.value,
  }));

  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.menuItem}
      activeOpacity={1}
    >
      <View style={styles.iconWrapper}>
        <Animated.View
          style={[
            styles.glowEffect,
            { backgroundColor: accentColor + "30" }, // Slightly more visible glow on dark background
            animatedGlowStyle,
          ]}
        />
        <Animated.View style={[styles.iconContainer, animatedIconStyle]}>
          <IconComponent
            size={24}
            color={isActive ? accentColor : DEFAULT_INACTIVE}
            strokeWidth={isActive ? 2.5 : 2}
          />
        </Animated.View>
      </View>

      <Text
        style={[
          styles.menuText,
          {
            color: isActive ? accentColor : DEFAULT_INACTIVE,
            fontWeight: isActive ? "700" : "500",
            marginTop: 4,
          },
        ]}
      >
        {item.label}
      </Text>

      <Animated.View
        style={[
          styles.activeDot,
          { backgroundColor: accentColor },
          animatedDotStyle,
        ]}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    width: SCREEN_WIDTH,
    alignItems: "center",
    zIndex: 1000,
  },
  menu: {
    flexDirection: "row",
    backgroundColor: "#1E7C7E", // Dark Teal Background
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: Platform.OS === "ios" ? 25 : 12,
    width: SCREEN_WIDTH,
    justifyContent: "space-around",
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
      },
      android: {
        elevation: 15,
      },
      web: {
        boxShadow: "0px -4px 10px rgba(0, 0, 0, 0.2)",
      },
    }),
  },
  menuItem: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 0,
    minWidth: 60,
  },
  iconContainer: {
    zIndex: 2,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  glowEffect: {
    position: "absolute",
    width: 32,
    height: 32,
    borderRadius: 16,
    zIndex: 1,
  },
  menuText: {
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 4,
  },
});

export { InteractiveMenu };
