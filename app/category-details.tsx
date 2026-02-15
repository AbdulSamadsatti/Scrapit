import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  FlatList,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Home,
  ShoppingCart,
  Heart,
  MessageSquare,
  Settings,
} from "lucide-react-native";
import InfinityLoader from "@/components/ui/InfinityLoader";
import { SearchBar } from "@/components/ui/search-bar";
import { InteractiveMenu } from "@/components/ui/modern-mobile-menu";
import { Sidebar } from "@/components/ui/Sidebar";
import LottieHamburger from "@/components/ui/Hamburger";
import { StatusBar } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useCart } from "../contexts/CartContext";

const { width } = Dimensions.get("window");

const CATEGORIES = [
  {
    id: "1",
    name: "Jobs",
    icon: "briefcase",
    image:
      "https://images.unsplash.com/photo-1586281380349-632531db7ed4?q=80&w=200&auto=format&fit=crop",
  },
  {
    id: "2",
    name: "Property",
    icon: "home",
    image:
      "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?q=80&w=200&auto=format&fit=crop",
  },
  {
    id: "3",
    name: "E-Commerce",
    icon: "cart",
    image:
      "https://images.unsplash.com/photo-1557821552-17105176677c?q=80&w=200&auto=format&fit=crop",
  },
  {
    id: "4",
    name: "Automobiles",
    icon: "car",
    image:
      "https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?q=80&w=200&auto=format&fit=crop",
  },
  {
    id: "5",
    name: "Travel",
    icon: "airplane",
    image:
      "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=200&auto=format&fit=crop",
  },
  {
    id: "6",
    name: "Food",
    icon: "restaurant",
    image:
      "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?q=80&w=200&auto=format&fit=crop",
  },
];

const ITEMS_DATA = {
  Jobs: [
    {
      id: "1",
      title: "Software Developer",
      price: "Rs 85,000",
      location: "Islamabad",
      image:
        "https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=400&auto=format&fit=crop",
      type: "Full-time",
      postedDate: "2 days ago",
    },
    {
      id: "2",
      title: "Marketing Manager",
      price: "Rs 75,000",
      location: "Karachi",
      image:
        "https://images.unsplash.com/photo-1557804506-669a67965ba0?q=80&w=400&auto=format&fit=crop",
      type: "Full-time",
      postedDate: "1 week ago",
    },
    {
      id: "3",
      title: "UI/UX Designer",
      price: "Rs 65,000",
      location: "Lahore",
      image:
        "https://images.unsplash.com/photo-1561070791-2526d30994b5?q=80&w=400&auto=format&fit=crop",
      type: "Remote",
      postedDate: "3 days ago",
    },
    {
      id: "4",
      title: "Sales Executive",
      price: "Rs 45,000",
      location: "Rawalpindi",
      image:
        "https://images.unsplash.com/photo-1552581234-26160f608093?q=80&w=400&auto=format&fit=crop",
      type: "Full-time",
      postedDate: "Today",
    },
  ],
  Property: [
    {
      id: "1",
      title: "5 Marla House",
      price: "Rs 15,000,000",
      location: "DHA, Lahore",
      image:
        "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?q=80&w=400&auto=format&fit=crop",
      type: "For Sale",
      postedDate: "1 day ago",
    },
    {
      id: "2",
      title: "10 Marla Plot",
      price: "Rs 8,500,000",
      location: "Bahria Town, Islamabad",
      image:
        "https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=400&auto=format&fit=crop",
      type: "For Sale",
      postedDate: "3 days ago",
    },
    {
      id: "3",
      title: "1 Bedroom Apartment",
      price: "Rs 45,000",
      location: "Gulshan, Karachi",
      image:
        "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=400&auto=format&fit=crop",
      type: "For Rent",
      postedDate: "Yesterday",
    },
    {
      id: "4",
      title: "Commercial Shop",
      price: "Rs 12,000,000",
      location: "Peshawar",
      image:
        "https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=400&auto=format&fit=crop",
      type: "For Sale",
      postedDate: "5 days ago",
    },
  ],
  "E-Commerce": [
    {
      id: "1",
      title: "iPhone 15 Pro",
      price: "Rs 350,000",
      location: "Lahore",
      image:
        "https://images.unsplash.com/photo-1695048133142-1a20484d2569?q=80&w=400&auto=format&fit=crop",
      type: "Used",
      postedDate: "Today",
    },
    {
      id: "2",
      title: "Gaming Laptop",
      price: "Rs 180,000",
      location: "Karachi",
      image:
        "https://images.unsplash.com/photo-1603302576837-37561b2e2302?q=80&w=400&auto=format&fit=crop",
      type: "New",
      postedDate: "Yesterday",
    },
    {
      id: "3",
      title: "DSLR Camera",
      price: "Rs 120,000",
      location: "Islamabad",
      image:
        "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=400&auto=format&fit=crop",
      type: "Used",
      postedDate: "2 days ago",
    },
    {
      id: "4",
      title: "Smart Watch",
      price: "Rs 15,000",
      location: "Multan",
      image:
        "https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=400&auto=format&fit=crop",
      type: "New",
      postedDate: "4 days ago",
    },
  ],
  Automobiles: [
    {
      id: "1",
      title: "Honda Civic 2023",
      price: "Rs 8,500,000",
      location: "Lahore",
      image:
        "https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?q=80&w=400&auto=format&fit=crop",
      type: "Used",
      postedDate: "1 day ago",
    },
    {
      id: "2",
      title: "Toyota Corolla",
      price: "Rs 6,500,000",
      location: "Islamabad",
      image:
        "https://images.unsplash.com/photo-1623860841539-1e8406375d72?q=80&w=400&auto=format&fit=crop",
      type: "Used",
      postedDate: "Today",
    },
    {
      id: "3",
      title: "Suzuki Alto",
      price: "Rs 2,500,000",
      location: "Karachi",
      image:
        "https://images.unsplash.com/photo-1619682817481-e994891cd1f5?q=80&w=400&auto=format&fit=crop",
      type: "Used",
      postedDate: "Yesterday",
    },
    {
      id: "4",
      title: "Yamaha YBR 125",
      price: "Rs 450,000",
      location: "Rawalpindi",
      image:
        "https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?q=80&w=400&auto=format&fit=crop",
      type: "New",
      postedDate: "3 days ago",
    },
  ],
  Travel: [
    {
      id: "1",
      title: "Nathia Gali Trip",
      price: "Rs 15,000",
      location: "Nathia Gali",
      image:
        "https://images.unsplash.com/photo-1591817505018-a9ba98f8f450?q=80&w=400&auto=format&fit=crop",
      type: "Package",
      postedDate: "1 day ago",
    },
    {
      id: "2",
      title: "Hunza Valley Tour",
      price: "rs 50,000",
      location: "Hunza",
      image:
        "https://images.unsplash.com/photo-1609137144813-7d9921338f24?q=80&w=400&auto=format&fit=crop",
      type: "Package",
      postedDate: "3 days ago",
    },
    {
      id: "3",
      title: "Skardu Adventure",
      price: "rs 45,000",
      location: "Skardu",
      image:
        "https://images.unsplash.com/photo-1589308078059-be1415eab4c3?q=80&w=400&auto=format&fit=crop",
      type: "Package",
      postedDate: "1 week ago",
    },
    {
      id: "4",
      title: "Murree Weekend",
      price: "rs 10,000",
      location: "Murree",
      image:
        "https://images.unsplash.com/photo-1622144415781-67f1b7b7528e?q=80&w=400&auto=format&fit=crop",
      type: "Package",
      postedDate: "Today",
    },
  ],
  Food: [
    {
      id: "1",
      title: "Biryani Platter",
      price: "rs 1,299",
      location: "Karachi",
      image:
        "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?q=80&w=400&auto=format&fit=crop",
      type: "Pakistani",
      postedDate: "Today",
    },
    {
      id: "2",
      title: "Pizza Margherita",
      price: "rs 1,599",
      location: "Islamabad",
      image:
        "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?q=80&w=400&auto=format&fit=crop",
      type: "Italian",
      postedDate: "Today",
    },
    {
      id: "3",
      title: "Gourmet Burger",
      price: "rs 1,050",
      location: "Lahore",
      image:
        "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=400&auto=format&fit=crop",
      type: "Fast Food",
      postedDate: "Yesterday",
    },
    {
      id: "4",
      title: "Chicken Karahi",
      price: "rs 1,800",
      location: "Peshawar",
      image:
        "https://images.unsplash.com/photo-1606471191009-63994c53433b?q=80&w=400&auto=format&fit=crop",
      type: "Pakistani",
      postedDate: "2 days ago",
    },
  ],
};

interface ItemData {
  id: string;
  title: string;
  price: string;
  location: string;
  image: string;
  type: string;
  postedDate: string;
}

export default function CategoryDetailScreen() {
  const router = useRouter();
  const { addToCart } = useCart();
  const params = useLocalSearchParams();
  const categoryName = (params.category as string) || "Jobs";
  const formatPrice = (p: string) => `Rs ${p.replace(/^(rs|RS)\s*/i, "")}`;
  const resolveImage = (u: string) =>
    u && /^https?:/.test(u)
      ? u
      : "https://via.placeholder.com/400x300?text=Image";

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(categoryName);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [likedItems, setLikedItems] = useState<{ [key: string]: boolean }>({});
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMenuVisualOpen, setIsMenuVisualOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeFilterDropdown, setActiveFilterDropdown] = useState<
    string | null
  >(null);
  const [selectedFilters, setSelectedFilters] = useState({
    price: "All",
    location: "All",
    date: "All",
    time: "Any Time",
  });

  const filterPanelAnim = useRef(new Animated.Value(0)).current;

  const getFilterPanelHeight = React.useCallback(() => {
    if (!isFilterOpen) return 0;
    return 220; // Increased to accommodate buttons
  }, [isFilterOpen]);

  useEffect(() => {
    Animated.timing(filterPanelAnim, {
      toValue: getFilterPanelHeight(),
      duration: 200,
      useNativeDriver: false,
    }).start();

    if (!isFilterOpen) {
      setActiveFilterDropdown(null);
    }
  }, [
    isFilterOpen,
    activeFilterDropdown,
    filterPanelAnim,
    getFilterPanelHeight,
  ]);

  const FILTER_OPTIONS = {
    price: ["All", "Low to High", "High to Low"],
    location: ["All", "Nearby", "Remote"],
    date: ["All", "Today", "Yesterday", "This Week", "This Month"],
    time: ["Any Time", "Morning", "Afternoon", "Evening", "Night"],
  };

  const handleFilterSelect = (type: string, value: string) => {
    setSelectedFilters((prev) => ({ ...prev, [type]: value }));
    setActiveFilterDropdown(null);
  };

  const handleClearFilters = () => {
    setSelectedFilters({
      price: "All",
      location: "All",
      date: "All",
      time: "Any Time",
    });
    setActiveFilterDropdown(null);
  };

  const menuItems = [
    { icon: Home, label: "Home", path: "/home" },
    { icon: ShoppingCart, label: "Cart", path: "/cart" },
    { icon: MessageSquare, label: "Chat", path: "/chatbot" },
    { icon: Heart, label: "Liked", path: "/liked" },
    { icon: Settings, label: "Settings", path: "/settings" },
  ];

  const handleMenuPress = () => {
    if (!isSidebarOpen) {
      setIsMenuVisualOpen(true);
      setTimeout(() => {
        setIsSidebarOpen(true);
      }, 300);
    } else {
      setIsSidebarOpen(false);
      setIsMenuVisualOpen(false);
    }
  };

  const handleSidebarClose = () => {
    setIsSidebarOpen(false);
    setIsMenuVisualOpen(false);
  };

  const handleMenuItemPress = (index: number) => {
    switch (index) {
      case 0:
        router.push("/home");
        break;
      case 1:
        router.push("/cart");
        break;
      case 2:
        router.push("/chatbot");
        break;
      case 3:
        router.push("/liked");
        break;
      case 4:
        router.push("/settings");
        break;
      default:
        break;
    }
  };

  const categories = [
    "All",
    "Jobs",
    "Property",
    "E-Commerce",
    "Automobiles",
    "Travel",
    "Food",
  ];

  const items = React.useMemo(() => {
    if (selectedCategory === "All") {
      return Object.values(ITEMS_DATA).flat() as ItemData[];
    }
    const k = selectedCategory as keyof typeof ITEMS_DATA;
    const arr = ITEMS_DATA[k] as ItemData[] | undefined;
    return arr && arr.length > 0
      ? arr
      : (Object.values(ITEMS_DATA).flat() as ItemData[]);
  }, [selectedCategory]);

  // Animation values
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(-30)).current;
  const itemsOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(headerOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(headerTranslateY, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(itemsOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, [headerOpacity, headerTranslateY, itemsOpacity]);

  const toggleLike = (id: string) => {
    setLikedItems((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleCategorySelect = (category: string) => {
    if (category !== "All" && category !== selectedCategory) {
      router.push({
        pathname: "/category-details",
        params: { category },
      });
    }
    setSelectedCategory(category);
  };

  const filteredItems = React.useMemo(() => {
    let result = [...items];

    // Apply search query
    if (searchQuery) {
      result = result.filter((item) =>
        item.title.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }

    // Apply location filter
    if (selectedFilters.location !== "All") {
      result = result.filter((item) => {
        if (selectedFilters.location === "Remote") {
          return (
            item.location.toLowerCase().includes("remote") ||
            item.location.toLowerCase().includes("available")
          );
        }
        return (
          item.location.toLowerCase() === selectedFilters.location.toLowerCase()
        );
      });
    }

    // Apply price sorting
    if (selectedFilters.price !== "All") {
      result.sort((a, b) => {
        const priceA = parseFloat(a.price.replace(/[^\d.]/g, ""));
        const priceB = parseFloat(b.price.replace(/[^\d.]/g, ""));
        return selectedFilters.price === "Low to High"
          ? priceA - priceB
          : priceB - priceA;
      });
    }

    // Apply date filter
    if (selectedFilters.date !== "All") {
      result = result.filter((item) => {
        const dateStr = item.postedDate.toLowerCase();
        switch (selectedFilters.date) {
          case "Today":
            return dateStr === "today" || dateStr === "new";
          case "Yesterday":
            return dateStr === "yesterday" || dateStr.includes("1 day ago");
          case "This Week":
            return (
              dateStr.includes("day ago") ||
              dateStr === "today" ||
              dateStr === "yesterday" ||
              dateStr === "new"
            );
          default:
            return true;
        }
      });
    }

    return result;
  }, [items, searchQuery, selectedFilters]);

  const renderGridItem = ({
    item,
    index,
  }: {
    item: ItemData;
    index: number;
  }) => {
    const isLiked = likedItems[item.id];

    return (
      <Animated.View
        style={[
          styles.gridCard,
          {
            opacity: itemsOpacity,
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => {
            router.push({
              pathname: "/product-details",
              params: {
                itemId: item.id,
                category: selectedCategory,
                title: item.title,
                price: item.price,
                image: item.image,
                location: item.location,
                type: item.type,
                postedDate: item.postedDate,
              },
            });
          }}
        >
          <View style={styles.gridImageWrapper}>
            <Image
              source={{ uri: resolveImage(item.image) }}
              style={styles.gridImage}
              resizeMode="cover"
            />
            <TouchableOpacity
              style={styles.heartButton}
              activeOpacity={0.7}
              onPress={() => toggleLike(item.id)}
            >
              <Ionicons
                name={isLiked ? "heart" : "heart-outline"}
                size={20}
                color={isLiked ? "#FF4B6E" : "#fff"}
              />
            </TouchableOpacity>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.postedDate}</Text>
            </View>
          </View>
          <View style={styles.gridInfo}>
            <Text style={styles.gridTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.gridPrice}>{formatPrice(item.price)}</Text>
            <View style={styles.gridLocation}>
              <Ionicons
                name="location-outline"
                size={14}
                color="rgba(255, 255, 255, 0.9)"
              />
              <Text style={styles.gridLocationText} numberOfLines={1}>
                {item.location}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.addButton}
              activeOpacity={0.7}
              onPress={() => addToCart(item)}
            >
              <Ionicons name="add" size={22} color="#1E7C7E" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderListItem = ({
    item,
    index,
  }: {
    item: ItemData;
    index: number;
  }) => {
    const isLiked = likedItems[item.id];

    return (
      <Animated.View
        style={[
          styles.listCard,
          {
            opacity: itemsOpacity,
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => {
            router.push({
              pathname: "/product-details",
              params: {
                itemId: item.id,
                category: selectedCategory,
                title: item.title,
                price: item.price,
                image: item.image,
                location: item.location,
                type: item.type,
                postedDate: item.postedDate,
              },
            });
          }}
          style={styles.listCardContent}
        >
          <View style={styles.listImageWrapper}>
            <Image
              source={{ uri: resolveImage(item.image) }}
              style={styles.listImage}
              resizeMode="cover"
            />
            <View style={styles.listBadge}>
              <Text style={styles.listBadgeText}>{item.postedDate}</Text>
            </View>
          </View>
          <View style={styles.listInfo}>
            <Text style={styles.listTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.listPrice}>{formatPrice(item.price)}</Text>
            <View style={styles.listMeta}>
              <Ionicons name="location-outline" size={14} color="#666" />
              <Text style={styles.listLocationText} numberOfLines={1}>
                {item.location}
              </Text>
            </View>
            <View style={styles.listType}>
              <Text style={styles.listTypeText}>{item.type}</Text>
            </View>
          </View>
          <View style={styles.listActions}>
            <TouchableOpacity
              style={styles.listHeartButton}
              activeOpacity={0.7}
              onPress={() => toggleLike(item.id)}
            >
              <Ionicons
                name={isLiked ? "heart" : "heart-outline"}
                size={24}
                color={isLiked ? "#FF4B6E" : "#666"}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.listAddButton}
              activeOpacity={0.7}
              onPress={() => addToCart(item)}
            >
              <Ionicons name="add" size={24} color="#1E7C7E" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Sidebar isVisible={isSidebarOpen} onClose={handleSidebarClose} />
      <StatusBar barStyle="light-content" />

      {/* Header - Same as Home */}
      <Animated.View
        style={[
          {
            opacity: headerOpacity,
            transform: [{ translateY: headerTranslateY }],
          },
        ]}
      >
        <LinearGradient
          colors={["#031d1e", "#063537", "#0D5A5B", "#1E7C7E"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <View style={styles.headerTop}>
            <TouchableOpacity
              onPress={handleMenuPress}
              style={styles.menuButton}
              hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
              activeOpacity={0.7}
            >
              <LottieHamburger isOpen={isMenuVisualOpen} size={36} />
            </TouchableOpacity>

            <View style={styles.logoContainer}>
              <View style={{ paddingRight: 8 }}>
                <InfinityLoader size={0.6} />
              </View>
              <Text style={styles.logoText}>SCRAPIT</Text>
            </View>
            <View style={styles.searchWrapper}>
              <SearchBar
                placeholder="Search..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                onCategorySelect={handleCategorySelect}
                selectedCategory={selectedCategory}
                onFilterToggle={() => setIsFilterOpen((prev) => !prev)}
                categories={categories}
              />
            </View>
          </View>
        </LinearGradient>
      </Animated.View>

      {/* Filter Panel (Identical to Home page structure) */}
      <Animated.View
        style={[
          styles.filterPanel,
          {
            height: filterPanelAnim,
            opacity: isFilterOpen ? 1 : 0,
            marginBottom: isFilterOpen ? 10 : 0,
            zIndex: 1000,
            overflow: "visible",
          },
        ]}
      >
        <View style={styles.filterContainer}>
          <View
            style={[
              styles.filterRow,
              {
                zIndex:
                  activeFilterDropdown === "price" ||
                  activeFilterDropdown === "location"
                    ? 3000
                    : 1000,
              },
            ]}
          >
            <View
              style={[
                styles.filterItemContainer,
                { zIndex: activeFilterDropdown === "price" ? 3001 : 1001 },
              ]}
            >
              <TouchableOpacity
                style={styles.filterItem}
                onPress={() =>
                  setActiveFilterDropdown(
                    activeFilterDropdown === "price" ? null : "price",
                  )
                }
              >
                <Text style={styles.filterLabel} numberOfLines={1}>
                  Price: {selectedFilters.price}
                </Text>
                <Ionicons
                  name={
                    activeFilterDropdown === "price"
                      ? "chevron-up"
                      : "chevron-down"
                  }
                  size={14}
                  color="#666"
                />
              </TouchableOpacity>
              {activeFilterDropdown === "price" && (
                <View style={styles.filterDropdown}>
                  {FILTER_OPTIONS.price.map((opt) => (
                    <TouchableOpacity
                      key={opt}
                      style={styles.dropdownOption}
                      onPress={() => handleFilterSelect("price", opt)}
                    >
                      <Text style={styles.dropdownOptionText}>{opt}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <View
              style={[
                styles.filterItemContainer,
                { zIndex: activeFilterDropdown === "location" ? 3001 : 1001 },
              ]}
            >
              <TouchableOpacity
                style={styles.filterItem}
                onPress={() =>
                  setActiveFilterDropdown(
                    activeFilterDropdown === "location" ? null : "location",
                  )
                }
              >
                <Text style={styles.filterLabel} numberOfLines={1}>
                  Loc: {selectedFilters.location}
                </Text>
                <Ionicons
                  name={
                    activeFilterDropdown === "location"
                      ? "chevron-up"
                      : "chevron-down"
                  }
                  size={14}
                  color="#666"
                />
              </TouchableOpacity>
              {activeFilterDropdown === "location" && (
                <View style={styles.filterDropdown}>
                  {FILTER_OPTIONS.location.map((opt) => (
                    <TouchableOpacity
                      key={opt}
                      style={styles.dropdownOption}
                      onPress={() => handleFilterSelect("location", opt)}
                    >
                      <Text style={styles.dropdownOptionText}>{opt}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>

          <View
            style={[
              styles.filterRow,
              {
                zIndex:
                  activeFilterDropdown === "date" ||
                  activeFilterDropdown === "time"
                    ? 2000
                    : 500,
              },
            ]}
          >
            <View
              style={[
                styles.filterItemContainer,
                { zIndex: activeFilterDropdown === "date" ? 2001 : 501 },
              ]}
            >
              <TouchableOpacity
                style={styles.filterItem}
                onPress={() =>
                  setActiveFilterDropdown(
                    activeFilterDropdown === "date" ? null : "date",
                  )
                }
              >
                <Text style={styles.filterLabel} numberOfLines={1}>
                  Date: {selectedFilters.date}
                </Text>
                <Ionicons
                  name={
                    activeFilterDropdown === "date"
                      ? "chevron-up"
                      : "chevron-down"
                  }
                  size={14}
                  color="#666"
                />
              </TouchableOpacity>
              {activeFilterDropdown === "date" && (
                <View style={styles.filterDropdown}>
                  {FILTER_OPTIONS.date.map((opt) => (
                    <TouchableOpacity
                      key={opt}
                      style={styles.dropdownOption}
                      onPress={() => handleFilterSelect("date", opt)}
                    >
                      <Text style={styles.dropdownOptionText}>{opt}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <View
              style={[
                styles.filterItemContainer,
                { zIndex: activeFilterDropdown === "time" ? 2001 : 501 },
              ]}
            >
              <TouchableOpacity
                style={styles.filterItem}
                onPress={() =>
                  setActiveFilterDropdown(
                    activeFilterDropdown === "time" ? null : "time",
                  )
                }
              >
                <Text style={styles.filterLabel} numberOfLines={1}>
                  Time: {selectedFilters.time}
                </Text>
                <Ionicons
                  name={
                    activeFilterDropdown === "time"
                      ? "chevron-up"
                      : "chevron-down"
                  }
                  size={14}
                  color="#666"
                />
              </TouchableOpacity>
              {activeFilterDropdown === "time" && (
                <View style={styles.filterDropdown}>
                  {FILTER_OPTIONS.time.map((opt) => (
                    <TouchableOpacity
                      key={opt}
                      style={styles.dropdownOption}
                      onPress={() => handleFilterSelect("time", opt)}
                    >
                      <Text style={styles.dropdownOptionText}>{opt}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>
          <TouchableOpacity
            style={styles.clearFiltersButton}
            onPress={handleClearFilters}
          >
            <Text style={styles.clearFiltersText}>Clear All Filters</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* View Toggle */}
      <View style={[styles.viewToggleContainer, { zIndex: 10 }]}>
        <View style={styles.resultsCount}>
          <Text style={styles.resultsCountText}>
            {filteredItems.length} {selectedCategory} Found
          </Text>
        </View>

        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[
              styles.viewButton,
              viewMode === "grid" && styles.viewButtonActive,
            ]}
            onPress={() => setViewMode("grid")}
            activeOpacity={0.7}
          >
            <Ionicons
              name="grid-outline"
              size={20}
              color={viewMode === "grid" ? "#1E7C7E" : "#666"}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.viewButton,
              viewMode === "list" && styles.viewButtonActive,
            ]}
            onPress={() => setViewMode("list")}
            activeOpacity={0.7}
          >
            <Ionicons
              name="list-outline"
              size={20}
              color={viewMode === "list" ? "#1E7C7E" : "#666"}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Categories Selector */}
      <View style={styles.categoriesWrapper}>
        <FlatList
          data={CATEGORIES}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.categoriesList}
          renderItem={({ item, index }) => {
            const isSelected = selectedCategory === item.name;
            return (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => handleCategorySelect(item.name)}
              >
                <View style={styles.categoryContainer}>
                  <View
                    style={[
                      styles.categoryCard,
                      isSelected && styles.categoryCardActive,
                    ]}
                  >
                    <Image
                      source={{ uri: resolveImage(item.image) }}
                      style={styles.categoryImage}
                      resizeMode="cover"
                    />
                  </View>
                  <View style={styles.categoryTextContainer}>
                    <Text
                      style={[
                        styles.categoryLabel,
                        isSelected && styles.categoryLabelActive,
                      ]}
                    >
                      {item.name}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Items List/Grid */}
      <FlatList
        data={filteredItems}
        renderItem={viewMode === "grid" ? renderGridItem : renderListItem}
        keyExtractor={(item) => item.id}
        numColumns={viewMode === "grid" ? 2 : 1}
        key={viewMode}
        contentContainerStyle={styles.itemsList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={64} color="#CCC" />
            <Text style={styles.emptyStateTitle}>No Items Found</Text>
            <Text style={styles.emptyStateText}>
              Try adjusting your search terms
            </Text>
          </View>
        }
      />

      <InteractiveMenu items={menuItems} onItemPress={handleMenuItemPress} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F8F9",
  },
  header: {
    backgroundColor: "#1E7C7E",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 0 : 10,
    paddingBottom: 5,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: 70,
    marginTop: Platform.OS === "ios" ? 0 : 10,
    position: "relative",
    zIndex: 100,
    paddingBottom: 2,
  },
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 101,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    position: "absolute",
    left: -25,
    top: -25,
    justifyContent: "center",
    zIndex: 1,
  },
  logoText: {
    color: "#ffffff",
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 1,
    marginLeft: -15,
  },
  searchWrapper: {
    zIndex: 102,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    flex: 1,
    marginRight: -10,
  },
  filterPanel: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
    overflow: "hidden",
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  filterRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
    position: "relative",
  },
  filterItemContainer: {
    flex: 1,
    position: "relative",
  },
  filterItem: {
    height: 40,
    backgroundColor: "#F5F5F5",
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#EEE",
  },
  filterLabel: {
    fontSize: 12,
    color: "#444",
    fontWeight: "500",
  },
  filterDropdown: {
    position: "absolute",
    top: 45,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 5,
    zIndex: 9999,
    elevation: 10,
    borderWidth: 1,
    borderColor: "#EEE",
    maxHeight: 200,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  dropdownOption: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 5,
  },
  dropdownOptionText: {
    fontSize: 13,
    color: "#333",
  },
  clearFiltersButton: {
    marginTop: 12,
    height: 40,
    backgroundColor: "#FFEBEB",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FFD6D6",
  },
  clearFiltersText: {
    color: "#FF4444",
    fontSize: 12,
    fontWeight: "600",
  },
  viewToggleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  resultsCount: {
    flex: 1,
  },
  resultsCountText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
  },
  viewToggle: {
    flexDirection: "row",
    backgroundColor: "#F5F5F5",
    borderRadius: 20,
    padding: 4,
  },
  viewButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  viewButtonActive: {
    backgroundColor: "#fff",
  },
  itemsList: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 100,
  },
  categoriesWrapper: {
    paddingVertical: 0,
    backgroundColor: "#fff",
  },
  categoriesList: {
    paddingLeft: 12,
    paddingBottom: 0,
  },
  categoryContainer: {
    width: 88,
    marginRight: 12,
    alignItems: "center",
  },
  categoryCard: {
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: "hidden",
    backgroundColor: "#fff",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.15)",
      },
    }),
    marginBottom: 8,
    borderWidth: 2,
    borderColor: "#fff",
  },
  categoryCardActive: {
    borderColor: "#1E7C7E",
    transform: [{ scale: 1.05 }],
  },
  categoryImage: {
    width: "100%",
    height: "100%",
  },
  categoryTextContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  searchContentWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  categoryLabel: {
    color: "#1E7C7E",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 0.3,
  },
  categoryLabelActive: {
    color: "#1E7C7E",
    fontWeight: "700",
  },
  gridCard: {
    width: (width - 40) / 2, // Adjusted for 16px padding on sides and 8px gap between cards
    backgroundColor: "#fff",
    borderRadius: 20,
    marginBottom: 16,
    overflow: "hidden",
    marginHorizontal: 4, // 4px on each side = 8px gap between cards
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
        boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.1)",
      },
    }),
  },
  gridImageWrapper: {
    height: 180,
    width: "100%",
    padding: 6,
    position: "relative",
  },
  gridImage: {
    width: "100%",
    height: "100%",
    borderRadius: 15,
  },
  heartButton: {
    position: "absolute",
    top: 15,
    right: 15,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  badge: {
    position: "absolute",
    bottom: 15,
    left: 15,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
  },
  gridInfo: {
    padding: 12,
    backgroundColor: "#1E7C7E",
    marginHorizontal: 6,
    marginBottom: 6,
    borderRadius: 12,
  },
  gridTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 4,
  },
  gridPrice: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
  },
  gridLocation: {
    flexDirection: "row",
    alignItems: "center",
  },
  gridLocationText: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 12,
    marginLeft: 4,
    fontWeight: "500",
  },
  addButton: {
    position: "absolute",
    bottom: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: "0px 2px 3px rgba(0, 0, 0, 0.1)",
      },
    }),
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  listCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    marginBottom: 16,
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
        boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.1)",
      },
    }),
  },
  listCardContent: {
    flexDirection: "row",
    padding: 12,
  },
  listImageWrapper: {
    width: 120,
    height: 120,
    borderRadius: 15,
    overflow: "hidden",
    position: "relative",
  },
  listImage: {
    width: "100%",
    height: "100%",
  },
  listBadge: {
    position: "absolute",
    bottom: 8,
    left: 8,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  listBadgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "600",
  },
  listInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: "center",
  },
  listTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginBottom: 4,
  },
  listPrice: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1E7C7E",
    marginBottom: 6,
  },
  listMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  listLocationText: {
    fontSize: 12,
    color: "#666",
    marginLeft: 4,
  },
  listType: {
    alignSelf: "flex-start",
    backgroundColor: "#F0F7F7",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  listTypeText: {
    fontSize: 11,
    color: "#1E7C7E",
    fontWeight: "600",
  },
  listActions: {
    justifyContent: "space-between",
    alignItems: "center",
    paddingLeft: 8,
  },
  listHeartButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
  },
  listAddButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F0F7F7",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E0EFEF",
  },
  emptyState: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginTop: 16,
  },
  emptyStateText: {
    fontSize: 14,
    color: "#666",
    marginTop: 8,
    textAlign: "center",
  },
});
