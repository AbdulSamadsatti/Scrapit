import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  Platform,
  Animated,
} from "react-native";
import * as Haptics from "expo-haptics";
import {
  Home,
  ShoppingCart,
  Heart,
  MessageSquare,
  User,
} from "lucide-react-native";

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

const DEFAULT_ACCENT = "#FFFFFF";
const DEFAULT_INACTIVE = "rgba(255, 255, 255, 0.6)";

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

  // Animation values using standard Animated
  const scale = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const dotScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isActive) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: -6,
          friction: 4,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1.2,
          friction: 4,
          useNativeDriver: true,
        }),
        Animated.timing(glowOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(dotScale, {
          toValue: 1,
          friction: 4,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          friction: 4,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 4,
          useNativeDriver: true,
        }),
        Animated.timing(glowOpacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.spring(dotScale, {
          toValue: 0,
          friction: 4,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isActive]);

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
            { 
              backgroundColor: accentColor + "30",
              opacity: glowOpacity,
              transform: [{ scale: isActive ? 1.3 : 0.6 }] 
            },
          ]}
        />
        <Animated.View style={[styles.iconContainer, { transform: [{ translateY }, { scale }] }]}>
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
          { 
            backgroundColor: accentColor,
            opacity: dotScale,
            transform: [{ scale: dotScale }] 
          },
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
    backgroundColor: "#1E7C7E",
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
