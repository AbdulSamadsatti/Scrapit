import React, { useState, useRef, useEffect } from "react";
import {
  StyleSheet,
  View,
  TextInput,
  Text,
  Platform,
  TouchableOpacity,
  Animated,
  Dimensions,
  ViewStyle,
  Modal,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Filter from "./Filter";

const THEME_COLOR = "#1E7C7E";
const SCREEN_WIDTH = Dimensions.get("window").width;

export interface SearchBarProps {
  placeholder?: string;
  value?: string;
  onChangeText?: (text: string) => void;
  onClear?: () => void;
  isLoading?: boolean;
  containerStyle?: ViewStyle | ViewStyle[];
  categories?: string[];
  onCategorySelect?: (category: string) => void;
  selectedCategory?: string;
}

export const SearchBar = ({
  placeholder = "Search perfect find...",
  value: propValue,
  onChangeText: propOnChangeText,
  onClear,
  containerStyle,
  categories = ["All", "Electronics", "Fashion", "Home", "Sports", "Beauty"],
  onCategorySelect,
  selectedCategory: propSelectedCategory,
}: SearchBarProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [internalValue, setInternalValue] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [internalSelectedCategory, setInternalSelectedCategory] =
    useState("All");
  const expandAnim = useRef(new Animated.Value(0)).current;
  const inputRef = useRef<TextInput>(null);

  const value = propValue !== undefined ? propValue : internalValue;
  const selectedCategory =
    propSelectedCategory !== undefined
      ? propSelectedCategory
      : internalSelectedCategory;

  const handleTextChange = (text: string) => {
    setInternalValue(text);
    if (propOnChangeText) propOnChangeText(text);
  };

  useEffect(() => {
    Animated.spring(expandAnim, {
      toValue: isExpanded ? 1 : 0,
      friction: 8,
      tension: 40,
      useNativeDriver: false,
    }).start();

    if (isExpanded) {
      inputRef.current?.focus();
    }
  }, [isExpanded]);

  const toggleSearch = () => {
    if (!isExpanded) {
      setIsExpanded(true);
      setShowDropdown(true); // Automatically open dropdown when expanding
    }
  };

  const handleClear = () => {
    setInternalValue("");
    if (onClear) {
      onClear();
    } else if (propOnChangeText) {
      propOnChangeText("");
    }
  };

  const handleClose = () => {
    setIsExpanded(false);
    setShowDropdown(false);
  };

  const barWidth = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [90, SCREEN_WIDTH - 80], // Increased collapsed width to fit both icons
  });

  const filterOpacity = expandAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 0, 0], // Hide when expanded
  });

  const opacity = expandAnim.interpolate({
    inputRange: [0, 0.2, 1], // Faster opacity fade in
    outputRange: [0, 1, 1],
  });

  const barBackground = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["rgba(255, 255, 255, 0.15)", "#FFFFFF"],
  });

  const handleCategorySelect = (category: string) => {
    setInternalSelectedCategory(category);
    setShowDropdown(false);
    if (onCategorySelect) onCategorySelect(category);
  };

  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
  };

  return (
    <View style={[styles.wrapper, containerStyle]}>
      <Animated.View
        style={[
          styles.container,
          {
            width: barWidth,
            borderRadius: 22,
            backgroundColor: barBackground,
            borderColor: isExpanded ? "#EEE" : "rgba(255,255,255,0.2)",
            borderWidth: 1,
          },
        ]}
      >
        {!isExpanded ? (
          <View style={styles.collapsedIconsContainer}>
            <TouchableOpacity
              style={styles.searchIconContainer}
              onPress={toggleSearch}
              activeOpacity={0.7}
            >
              <Ionicons name="search" size={20} color="#fff" />
            </TouchableOpacity>
            <View style={styles.iconDivider} />
            <Animated.View style={{ opacity: filterOpacity }}>
              <Filter size={20} onPress={() => setShowDropdown(true)} />
            </Animated.View>
          </View>
        ) : (
          <View style={styles.expandedContent}>
            <TouchableOpacity
              onPress={toggleDropdown}
              style={styles.categoryPicker}
              activeOpacity={0.7}
            >
              <Ionicons name="filter" size={18} color={THEME_COLOR} />
              <Text style={styles.categoryText} numberOfLines={1}>
                {selectedCategory}
              </Text>
              <Ionicons
                name={showDropdown ? "chevron-up" : "chevron-down"}
                size={14}
                color={THEME_COLOR}
              />
            </TouchableOpacity>

            <View style={styles.divider} />

            <Animated.View style={[styles.inputContainer, { opacity }]}>
              <TextInput
                ref={inputRef}
                style={styles.input}
                placeholder={placeholder}
                placeholderTextColor="#999"
                value={value}
                onChangeText={handleTextChange}
              />
            </Animated.View>

            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close-outline" size={22} color="#666" />
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>

      {showDropdown && isExpanded && (
        <Animated.View style={[styles.inlineDropdown, { opacity }]}>
          <View style={styles.dropdownInner}>
            {categories.map((item) => (
              <TouchableOpacity
                key={item}
                style={[
                  styles.dropdownItem,
                  selectedCategory === item && styles.selectedItem,
                ]}
                onPress={() => handleCategorySelect(item)}
              >
                <Text
                  style={[
                    styles.dropdownItemText,
                    selectedCategory === item && styles.selectedItemText,
                  ]}
                >
                  {item}
                </Text>
                {selectedCategory === item && (
                  <Ionicons
                    name="checkmark-circle"
                    size={18}
                    color={THEME_COLOR}
                  />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    height: 44,
    zIndex: 1000,
  },
  container: {
    height: 44,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.1)",
      },
    }),
  },
  searchIconContainer: {
    width: 42,
    height: 42,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
  },
  collapsedIconsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: "100%",
  },
  iconDivider: {
    width: 1,
    height: 16,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    marginHorizontal: 2,
  },
  expandedContent: {
    flexDirection: "row",
    alignItems: "center",
    height: "100%",
    paddingHorizontal: 12,
  },
  categoryPicker: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 8,
    minWidth: 70, // Reduced from 90 to give more space to input
    gap: 4,
  },
  categoryText: {
    fontSize: 12,
    color: THEME_COLOR,
    fontWeight: "700",
  },
  divider: {
    width: 1,
    height: 20,
    backgroundColor: "#EEE",
    marginHorizontal: 4,
  },
  inputContainer: {
    flex: 1,
  },
  input: {
    fontSize: 15,
    color: "#000000", // Forced solid black for better visibility
    paddingHorizontal: 8,
    height: "100%",
    minWidth: 100, // Ensure there's a minimum width
  },
  closeButton: {
    padding: 4,
    marginLeft: 4,
  },
  inlineDropdown: {
    position: "absolute",
    top: 50,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EEE",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: "0px 8px 24px rgba(0, 0, 0, 0.15)",
      },
    }),
  },
  dropdownInner: {
    padding: 8,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  selectedItem: {
    backgroundColor: "rgba(30, 124, 126, 0.05)",
  },
  dropdownItemText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  selectedItemText: {
    color: THEME_COLOR,
    fontWeight: "700",
  },
});
