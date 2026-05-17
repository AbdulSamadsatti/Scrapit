import React, { useState, useRef, useEffect } from "react";
import {
  StyleSheet,
  View,
  TextInput,
  Platform,
  TouchableOpacity,
  Animated,
  Dimensions,
  ViewStyle,
  FlatList,
  Text,
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
  onFilterToggle?: (isOpen: boolean) => void;
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
  onFilterToggle,
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
  }, [isExpanded, expandAnim]);

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
    outputRange: [44, SCREEN_WIDTH - 120], // Adjusted to leave room for filter
  });

  const filterOpacity = 1; // Always visible

  const filterTranslateX = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0], // Don't move the filter
  });

  const opacity = expandAnim.interpolate({
    inputRange: [0, 0.2, 1],
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
      <View style={styles.row}>
        <Animated.View
          style={[
            styles.container,
            {
              width: barWidth,
              borderRadius: 22,
              backgroundColor: barBackground,
              borderColor: isExpanded ? "#EEE" : "rgba(255,255,255,0.2)",
              borderWidth: 1,
              overflow: isExpanded ? "visible" : "hidden",
            },
          ]}
        >
          {isExpanded ? (
            <Animated.View style={[styles.expandedContent, { opacity }]}>
              <TouchableOpacity
                style={styles.categoryPicker}
                onPress={toggleDropdown}
                activeOpacity={0.7}
              >
                <Text style={styles.categoryText} numberOfLines={1}>
                  {selectedCategory}
                </Text>
                <Ionicons name="chevron-down" size={14} color={THEME_COLOR} />
              </TouchableOpacity>

              <View style={styles.inputContainer}>
                <TextInput
                  ref={inputRef}
                  style={styles.input}
                  placeholder={placeholder}
                  value={value}
                  onChangeText={handleTextChange}
                  placeholderTextColor="#999"
                  returnKeyType="search"
                />
              </View>

              {value.length > 0 && (
                <TouchableOpacity
                  onPress={handleClear}
                  style={styles.clearIcon}
                >
                  <Ionicons name="close-circle" size={18} color="#999" />
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={handleClose}
                style={styles.closeButton}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={24} color={THEME_COLOR} />
              </TouchableOpacity>

              {showDropdown && (
                <Animated.View style={[styles.dropdown, { opacity }]}>
                  <View style={styles.dropdownContent}>
                    <FlatList
                      data={categories}
                      keyExtractor={(item) => item}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          style={[
                            styles.dropdownItem,
                            selectedCategory === item && styles.selectedItem,
                          ]}
                          onPress={() => handleCategorySelect(item)}
                        >
                          <Text
                            style={[
                              styles.dropdownItemText,
                              selectedCategory === item &&
                                styles.selectedItemText,
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
                      )}
                    />
                  </View>
                </Animated.View>
              )}
            </Animated.View>
          ) : (
            <TouchableOpacity
              style={styles.searchIconContainer}
              onPress={toggleSearch}
              activeOpacity={0.7}
            >
              <Ionicons name="search" size={20} color="#fff" />
            </TouchableOpacity>
          )}
        </Animated.View>

        <Animated.View
          style={[
            styles.filterCircle,
            {
              opacity: filterOpacity,
              transform: [{ translateX: filterTranslateX }],
            },
          ]}
        >
          <Filter onPress={() => onFilterToggle?.(true)} />
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
    zIndex: 3000,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 6, // Reduced gap from 12 to 6
  },
  container: {
    height: 44,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.1)",
      },
    }),
  },
  searchIconContainer: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
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
    borderRightWidth: 1,
    borderRightColor: "#EEE",
    marginRight: 8,
  },
  categoryText: {
    fontSize: 13,
    color: "#333",
    fontWeight: "500",
    marginRight: 4,
  },
  inputContainer: {
    flex: 1,
  },
  input: {
    fontSize: 14,
    color: "#333",
    padding: 0,
    height: "100%",
  },
  clearIcon: {
    padding: 4,
    marginRight: 4,
  },
  closeButton: {
    padding: 4,
  },
  filterCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  dropdown: {
    position: "absolute",
    top: 45,
    left: 0,
    right: 0, // Make it span the full width of the search bar container
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginTop: 4,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
    zIndex: 9999,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#EEE",
  },
  dropdownContent: {
    padding: 8,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  selectedItem: {
    backgroundColor: "#F0F9F9",
  },
  dropdownItemText: {
    fontSize: 14,
    color: "#444",
  },
  selectedItemText: {
    color: THEME_COLOR,
    fontWeight: "600",
  },
});
