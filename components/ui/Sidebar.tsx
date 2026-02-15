import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "expo-router";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Animated,
  Platform,
} from "react-native";
import {
  ChevronDown,
  LayoutGrid,
  MessageSquare,
  Bell,
  Heart,
  User,
  LogOut,
  ShoppingCart,
  X,
} from "lucide-react-native";
import LottieHamburger from "./Hamburger";

interface SidebarItemData {
  id: string;
  label: string;
  icon: React.ElementType;
  type: "page" | "submenu";
  children?: { id: string; label: string }[];
}

const SIDEBAR_ITEMS: SidebarItemData[] = [
  {
    id: "categories",
    label: "Categories",
    icon: LayoutGrid,
    type: "submenu",
    children: [
      { id: "cat-jobs", label: "Jobs" },
      { id: "cat-property", label: "Property" },
      { id: "cat-automobiles", label: "Automobiles" },
      { id: "cat-ecommerce", label: "E-Commerce" },
      { id: "cat-travel", label: "Travel" },
      { id: "cat-food", label: "Food" },
    ],
  },
  {
    id: "communication",
    label: "Communication",
    icon: MessageSquare,
    type: "submenu",
    children: [
      { id: "comm-chat", label: "Chat" },
      { id: "comm-support", label: "Support" },
    ],
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: Bell,
    type: "page",
  },
  {
    id: "favourites",
    label: "Favourites",
    icon: Heart,
    type: "page",
  },
  {
    id: "cart",
    label: "Cart",
    icon: ShoppingCart,
    type: "page",
  },
  {
    id: "account",
    label: "My Account",
    icon: User,
    type: "submenu",
    children: [
      { id: "acc-profile", label: "Profile" },
      { id: "acc-edit", label: "Edit Profile" },
      { id: "acc-security", label: "Security" },
    ],
  },
];

interface SubmenuProps {
  isOpen: boolean;
  activeItem: string | null;
  items: { id: string; label: string }[];
  onPageClick: (id: string) => void;
}

const Submenu: React.FC<SubmenuProps> = ({
  isOpen,
  activeItem,
  items,
  onPageClick,
}) => {
  const [animatedHeight] = useState(new Animated.Value(0));

  useEffect(() => {
    Animated.timing(animatedHeight, {
      toValue: isOpen ? items.length * 44 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [isOpen, animatedHeight, items.length]);

  return (
    <Animated.View
      style={[styles.submenuContainer, { height: animatedHeight }]}
    >
      {items.map((child) => (
        <TouchableOpacity
          key={child.id}
          onPress={() => onPageClick(child.id)}
          style={[
            styles.submenuItem,
            activeItem === child.id && styles.activeSubmenuItem,
          ]}
        >
          <View
            style={[
              styles.submenuDot,
              {
                backgroundColor:
                  activeItem === child.id
                    ? "rgba(255, 255, 255, 0.9)"
                    : "rgba(255, 255, 255, 0.35)",
              },
            ]}
          />
          <Text style={styles.submenuText}>{child.label}</Text>
        </TouchableOpacity>
      ))}
    </Animated.View>
  );
};

interface SidebarItemProps {
  item: SidebarItemData;
  activeItem: string | null;
  isOpen: boolean;
  onPageClick: (id: string) => void;
  onSubmenuToggle: (id: string) => void;
}

const SidebarItem: React.FC<SidebarItemProps> = ({
  item,
  activeItem,
  isOpen,
  onPageClick,
  onSubmenuToggle,
}) => {
  const isActive =
    activeItem === item.id ||
    (item.children && item.children.some((c) => c.id === activeItem));
  const IconComponent = item.icon;

  return (
    <View>
      <TouchableOpacity
        onPress={() =>
          item.type === "page" ? onPageClick(item.id) : onSubmenuToggle(item.id)
        }
        style={[styles.sidebarItem, isActive && styles.activeSidebarItem]}
      >
        <IconComponent size={19} color="rgba(255, 255, 255, 0.95)" />
        <Text style={styles.sidebarItemText}>{item.label}</Text>
        {item.type === "submenu" && (
          <View
            style={{
              transform: [{ rotate: isOpen ? "180deg" : "0deg" }],
            }}
          >
            <ChevronDown size={18} color="rgba(255, 255, 255, 0.7)" />
          </View>
        )}
      </TouchableOpacity>
      {item.type === "submenu" && (
        <Submenu
          isOpen={isOpen}
          activeItem={activeItem}
          items={item.children || []}
          onPageClick={onPageClick}
        />
      )}
    </View>
  );
};

interface SidebarProps {
  isVisible: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isVisible, onClose }) => {
  const router = useRouter();
  const [activeItem, setActiveItem] = useState<string | null>(null);
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);
  const slideAnim = useRef(new Animated.Value(-280)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isVisible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -280,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isVisible, opacityAnim, slideAnim]);

  const handlePageClick = (id: string) => {
    setActiveItem(id);

    // Handle category navigation
    if (id.startsWith("cat-")) {
      const category = id.replace("cat-", "");
      // Convert ID to match the route params if needed (e.g., ecommerce -> E-Commerce)
      let categoryParam = category.charAt(0).toUpperCase() + category.slice(1);
      if (category === "ecommerce") categoryParam = "E-Commerce";

      router.push({
        pathname: "/category-details",
        params: { category: categoryParam },
      });
      onClose();
      return;
    }

    // Map menu items to settings tabs
    let tab = "account";
    let isSupport = false;

    switch (id) {
      case "acc-profile":
      case "acc-edit":
        tab = "account";
        break;
      case "acc-security":
        tab = "privacy";
        break;
      case "notifications":
        tab = "notifications";
        break;
      case "comm-chat":
        router.push("/chatbot");
        onClose();
        return;
      case "comm-support":
        isSupport = true;
        break;
      default:
        tab = "account";
    }

    // Navigate to support page if support is clicked
    if (isSupport) {
      // For now, let's use settings as support page until we create a dedicated support page
      router.push({
        pathname: "/settings",
        params: { tab: "help" },
      });
      onClose();
      return;
    }

    // Navigate to settings with the appropriate tab parameter
    if (id.startsWith("acc-") || id === "notifications") {
      router.push({
        pathname: "/settings",
        params: { tab },
      });
      onClose();
      return;
    }

    if (id === "comm-chat") {
      router.push("/chatbot");
      onClose();
      return;
    }

    if (id === "favourites") {
      router.push("/liked");
      onClose();
      return;
    }

    if (id === "cart") {
      router.push("/cart");
      onClose();
      return;
    }

    if (id === "logout") {
      alert("Logout coming soon!");
      onClose();
    }
  };

  const handleSubmenuToggle = (id: string) => {
    setOpenSubmenu(openSubmenu === id ? null : (id as string | null));

    setActiveItem(id);
  };

  return (
    <View style={styles.overlay} pointerEvents={isVisible ? "auto" : "none"}>
      <Animated.View style={[styles.backdrop, { opacity: opacityAnim }]}>
        <TouchableOpacity
          style={styles.backdropClickArea}
          activeOpacity={1}
          onPress={onClose}
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.sidebarContainer,
          { transform: [{ translateX: slideAnim }] },
        ]}
      >
        {/* Sidebar Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <LottieHamburger isOpen={isVisible} size={28} />
            <Text style={styles.headerTitle}>SCRAPIT</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <X size={20} color="rgba(255, 255, 255, 0.6)" />
          </TouchableOpacity>
        </View>

        {/* Menu Items */}
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingVertical: 8 }}
        >
          {SIDEBAR_ITEMS.map((item) => (
            <SidebarItem
              key={item.id}
              item={item as SidebarItemData}
              activeItem={activeItem}
              isOpen={openSubmenu === item.id}
              onPageClick={handlePageClick}
              onSubmenuToggle={handleSubmenuToggle}
            />
          ))}
        </ScrollView>

        {/* Sidebar Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.footerItem}
            onPress={() => handlePageClick("logout")}
          >
            <LogOut size={18} color="#FF5A5A" />
            <Text style={[styles.footerText, { color: "#FF5A5A" }]}>
              Logout
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  backdropClickArea: {
    flex: 1,
  },
  sidebarContainer: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 280,
    backgroundColor: "#1E7C7E", // Matching your Teal Theme
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
    paddingHorizontal: 16,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 4, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 24,
      },
    }),
  },
  header: {
    height: 100, // Increased height
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
    paddingTop: Platform.OS === "ios" ? 40 : 20, // Increased paddingTop
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: {
    color: "rgba(255, 255, 255, 0.95)",
    fontSize: 18,
    fontWeight: "600",
    marginLeft: 12,
  },
  closeBtn: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  sidebarItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    height: 50,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 4,
  },
  activeSidebarItem: {
    backgroundColor: "rgba(0, 0, 0, 0.18)",
  },
  sidebarItemText: {
    color: "rgba(255, 255, 255, 0.95)",
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  submenuContainer: {
    overflow: "hidden",
  },
  submenuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 48,
    height: 44,
    borderRadius: 8,
  },
  activeSubmenuItem: {
    backgroundColor: "rgba(0, 0, 0, 0.1)",
  },
  submenuDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginRight: 12,
    position: "absolute",
    left: 22,
  },
  submenuText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 13,
    fontWeight: "400",
  },
  footer: {
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.08)",
    marginBottom: Platform.OS === "ios" ? 30 : 10,
  },
  footerItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    height: 44,
    paddingHorizontal: 16,
  },
  footerText: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 14,
    fontWeight: "500",
  },
});
