import React, { useRef, useEffect, useState, useCallback } from "react";
import { useRouter } from "expo-router";
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  Dimensions,
  Animated,
  FlatList,
  Platform,
  StatusBar,
} from "react-native";
import { Sidebar } from "@/components/ui/Sidebar";
import Carousel3D from "@/components/ui/animated Carousels";
import LottieHamburger from "@/components/ui/Hamburger";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { InteractiveMenu } from "@/components/ui/modern-mobile-menu";
import InfinityLoader from "@/components/ui/InfinityLoader";
import { SearchBar } from "@/components/ui/search-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useCart } from "@/contexts/CartContext";
import {
  Home,
  ShoppingCart,
  MessageSquare,
  Heart,
  Settings,
} from "lucide-react-native";

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
      "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?q=80&w=200&auto=format&fit=crop",
  },
  {
    id: "5",
    name: "Travel",
    icon: "plane",
    image:
      "https://images.unsplash.com/photo-1606768666853-403c90a981ad?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8cGxhbmV8ZW58MHx8MHx8fDA%3",
  },
  {
    id: "6",
    name: "Food",
    icon: "food",
    image:
      "https://plus.unsplash.com/premium_photo-1673580742890-4af144293960?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTd8fGZvb2R8ZW58MHx8MHx8fDA%3D",
  },
];

const TRENDING_ITEMS = [
  {
    id: "1",
    title: "Mac Laptop",
    price: "Rs 234,560",
    image:
      "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=400&auto=format&fit=crop",
  },
  {
    id: "2",
    title: "Honda Civic",
    price: "Rs 3,234,560",
    image:
      "https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?q=80&w=400&auto=format&fit=crop",
  },
  {
    id: "3",
    title: "Nathia Gali",
    price: "Rs 12,345",
    image:
      "https://images.unsplash.com/photo-1591817505018-a9ba98f8f450?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8bmF0aGlhZ2FsbGl8ZW58MHx8MHx8fDA%3D",
  },
  {
    id: "4",
    title: "IT Job",
    price: "Rs 85,000",
    image:
      "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?q=80&w=400&auto=format&fit=crop",
  },
];

const HERO_ITEMS = [
  {
    id: "1",
    title: "Discover Where You Belong",
    image:
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=800&auto=format&fit=crop",
    subtitle: "Find your dream home today",
  },
  {
    id: "2",
    title: "Upgrade Your Tech",
    image:
      "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?q=80&w=800&auto=format&fit=crop",
    subtitle: "Latest gadgets at best prices",
  },
  {
    id: "3",
    title: "Find Your Dream Car",
    image:
      "https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=800&auto=format&fit=crop",
    subtitle: "Luxury & comfort combined",
  },
  {
    id: "4",
    title: "New Career Awaits",
    image:
      "https://images.unsplash.com/photo-1521737711867-e3b97375f902?q=80&w=800&auto=format&fit=crop",
    subtitle: "Explore thousands of job openings",
  },
  {
    id: "5",
    title: "Global Travel Deals",
    image:
      "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8dHJhdmVsfGVufDB8fDB8fHww",
    subtitle: "Unforgettable experiences await",
  },
];

interface CategoryItem {
  id: string;
  name: string;
  icon: string;
  image: string;
}

interface TrendingItem {
  id: string;
  title: string;
  price: string;
  image: string;
}

export default function HomeScreen() {
  const router = useRouter();
  const { addToCart, toggleLike, isLiked } = useCart();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMenuVisualOpen, setIsMenuVisualOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
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
  const scrollY = useRef(new Animated.Value(0)).current;
  const categoriesAnim = useRef(new Animated.Value(0)).current;
  const trendingAnim = useRef(new Animated.Value(0)).current;
  const filterMoveAnim = useRef(new Animated.Value(0)).current;
  const filterPanelAnim = useRef(new Animated.Value(0)).current;
  const formatPrice = (p: string) => {
    if (!p) return "Rs 0";
    const numericPrice = p.replace(/^(rs|RS)\s*/i, "").replace(/,/g, "");
    return `Rs ${numericPrice.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
  };
  const resolveImage = (u: string) =>
    u && /^https?:/.test(u)
      ? u
      : "https://via.placeholder.com/400x300?text=Image";

  const getFilterPanelHeight = useCallback(() => {
    if (!isFilterOpen) return 0;
    // Increased fixed height for 3 rows of filters
    return 165;
  }, [isFilterOpen]);

  useEffect(() => {
    Animated.spring(filterMoveAnim, {
      toValue: isFilterOpen ? 1 : 0,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();

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
    filterMoveAnim,
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

  const handleMenuPress = () => {
    if (!isSidebarOpen) {
      // Start hamburger animation first
      setIsMenuVisualOpen(true);
      // Delay sidebar opening by 300ms
      setTimeout(() => {
        setIsSidebarOpen(true);
      }, 300);
    } else {
      // Close everything together
      setIsSidebarOpen(false);
      setIsMenuVisualOpen(false);
    }
  };

  const handleSidebarClose = () => {
    setIsSidebarOpen(false);
    setIsMenuVisualOpen(false);
  };

  const filteredTrendingItems = React.useMemo(() => {
    return TRENDING_ITEMS.filter((item) => {
      const matchesSearch = item.title
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesCategory =
        selectedCategory === "All" ||
        (selectedCategory === "E-Commerce" &&
          (item.title.toLowerCase().includes("laptop") ||
            item.title.toLowerCase().includes("gadget") ||
            item.title.toLowerCase().includes("mac"))) ||
        (selectedCategory === "Automobiles" &&
          (item.title.toLowerCase().includes("honda") ||
            item.title.toLowerCase().includes("car") ||
            item.title.toLowerCase().includes("civic"))) ||
        (selectedCategory === "Travel" &&
          (item.title.toLowerCase().includes("gali") ||
            item.title.toLowerCase().includes("trip") ||
            item.title.toLowerCase().includes("nathia"))) ||
        (selectedCategory === "Jobs" &&
          (item.title.toLowerCase().includes("job") ||
            item.title.toLowerCase().includes("career"))) ||
        (selectedCategory === "Property" &&
          (item.title.toLowerCase().includes("home") ||
            item.title.toLowerCase().includes("house") ||
            item.title.toLowerCase().includes("apartment"))) ||
        (selectedCategory === "Food" &&
          (item.title.toLowerCase().includes("food") ||
            item.title.toLowerCase().includes("meal") ||
            item.title.toLowerCase().includes("restaurant")));

      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  useEffect(() => {
    // Entrance animations
    Animated.parallel([
      Animated.spring(categoriesAnim, {
        toValue: 1,
        tension: 20,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.spring(trendingAnim, {
        toValue: 1,
        tension: 20,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, [categoriesAnim, trendingAnim]);

  // addToCart function is now provided by the CartContext

  const renderCategory = ({
    item,
    index,
  }: {
    item: CategoryItem;
    index: number;
  }) => {
    if (!item) return null;
    const translateX = categoriesAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [50 * (index + 1), 0],
    });

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() =>
          router.push({
            pathname: "/category-details",
            params: { category: item.name },
          })
        }
      >
        <Animated.View
          style={[
            styles.categoryContainer,
            {
              transform: [{ translateX }],
              opacity: categoriesAnim,
            },
          ]}
        >
          <View style={styles.categoryCard}>
            <Image
              source={{ uri: resolveImage(item.image) }}
              style={styles.categoryImage}
              resizeMode="cover"
            />
          </View>
          <View style={styles.categoryTextContainer}>
            <Text style={styles.categoryLabel}>{item.name}</Text>
          </View>
        </Animated.View>
      </TouchableOpacity>
    );
  };

  const renderTrendingItem = ({
    item,
    index,
  }: {
    item: TrendingItem;
    index: number;
  }) => {
    if (!item) return null;
    const isItemLiked = isLiked(item.id);

    // Entrance animation on mount
    const mountOpacity = trendingAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    });

    const mountTranslateY = trendingAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [30 * (index + 1), 0],
    });

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => {
          router.push({
            pathname: "/product-details",
            params: {
              id: item.id,
              title: item.title,
              price: item.price,
              image: item.image,
              location: "Available",
              type: "Trending",
              postedDate: "New",
            },
          });
        }}
      >
        <Animated.View
          style={[
            styles.trendingCard,
            {
              opacity: mountOpacity,
              transform: [{ translateY: mountTranslateY }],
            },
          ]}
        >
          <View style={styles.trendingImageWrapper}>
            <Image
              source={{ uri: resolveImage(item.image) }}
              style={styles.trendingImage}
              resizeMode="cover"
            />
            <TouchableOpacity
              style={styles.heartButton}
              activeOpacity={0.7}
              onPress={(e) => {
                e.stopPropagation();
                toggleLike({
                  id: item.id,
                  title: item.title,
                  price: item.price,
                  image: item.image,
                  location: "Available",
                  type: "Trending",
                  postedDate: "New",
                });
              }}
            >
              <Ionicons
                name={isItemLiked ? "heart" : "heart-outline"}
                size={20}
                color={isItemLiked ? "#FF4B6E" : "#fff"}
              />
            </TouchableOpacity>
          </View>
          <View style={styles.trendingInfo}>
            <Text style={styles.trendingTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.trendingPrice}>{formatPrice(item.price)}</Text>
            <TouchableOpacity
              style={styles.addButton}
              activeOpacity={0.7}
              onPress={(e) => {
                e.stopPropagation();
                addToCart({
                  id: item.id,
                  title: item.title,
                  price: item.price,
                  image: item.image,
                  location: "Available",
                  type: "Trending",
                  postedDate: "New",
                });
              }}
            >
              <Ionicons name="add" size={22} color="#1E7C7E" />
            </TouchableOpacity>
          </View>
        </Animated.View>
      </TouchableOpacity>
    );
  };

  const menuItems = [
    { icon: Home, label: "Home", path: "/home" },
    { icon: ShoppingCart, label: "Cart", path: "/cart" },
    { icon: MessageSquare, label: "Chatbot", path: "/chatbot" },
    { icon: Heart, label: "Liked", path: "/liked" },
    { icon: Settings, label: "Settings", path: "/settings" },
  ];

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

  return (
    <SafeAreaView style={styles.container}>
      <Sidebar isVisible={isSidebarOpen} onClose={handleSidebarClose} />
      <StatusBar barStyle="light-content" />

      {/* Header */}
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
              <InfinityLoader size={0.7} />
            </View>
            <Text style={styles.logoText}>SCRAPIT</Text>
          </View>

          <View style={styles.searchWrapper}>
            <SearchBar
              placeholder="Search..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              onCategorySelect={setSelectedCategory}
              selectedCategory={selectedCategory}
              onFilterToggle={() => setIsFilterOpen(!isFilterOpen)}
              categories={[
                "All",
                "Jobs",
                "Property",
                "E-Commerce",
                "Automobiles",
                "Travel",
                "Food",
              ]}
            />
          </View>
        </View>
      </LinearGradient>

      {/* Independent Filter Panel below Header */}
      <Animated.View
        style={[
          styles.filterPanel,
          {
            height: filterPanelAnim,
            opacity: isFilterOpen ? 1 : 0,
            marginBottom: isFilterOpen ? 10 : 0,
            zIndex: 1000,
            overflow: "visible", // Allow dropdowns to overflow
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

          <View style={[styles.filterRow, { zIndex: 0 }]}>
            <TouchableOpacity
              style={[styles.filterItem, styles.resetButton]}
              onPress={() => {
                setSelectedFilters({
                  price: "All",
                  location: "All",
                  date: "All",
                  time: "Any Time",
                });
                setIsFilterOpen(false);
              }}
            >
              <Text style={styles.resetText}>Reset Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true },
        )}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: 60, flexGrow: 1 }}
      >
        <Animated.View
          style={{
            transform: [
              {
                translateY: filterMoveAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 0], // Content no longer needs to move down manually, as it's below the expanding panel
                }),
              },
            ],
          }}
        >
          {/* Hero Carousel - 3D Animated */}
          <Carousel3D data={HERO_ITEMS} />

          {/* Categories Section */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Categories</Text>
            <TouchableOpacity activeOpacity={0.7}>
              <Text style={styles.seeMore}>See more {">"}</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={CATEGORIES}
            renderItem={renderCategory}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesList}
          />

          {/* Trending Now Section */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Trending Now</Text>
            <TouchableOpacity activeOpacity={0.7}>
              <Text style={styles.seeMore}>See more {">"}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.trendingGrid}>
            {filteredTrendingItems.map((item, index) => (
              <React.Fragment key={item.id}>
                {renderTrendingItem({ item, index })}
              </React.Fragment>
            ))}
            {filteredTrendingItems.length === 0 && (
              <View style={styles.noResults}>
                <Ionicons name="search-outline" size={48} color="#CCC" />
                <Text style={styles.noResultsText}>No items found</Text>
              </View>
            )}
          </View>
        </Animated.View>
      </Animated.ScrollView>

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
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
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
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  logoText: {
    color: "#ffffff",
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 1,
    marginLeft: -15, // Slight negative margin to bring text closer to infinity loader
  },
  searchWrapper: {
    zIndex: 102,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    flex: 1,
    marginRight: -10,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginTop: 0,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#000",
  },
  seeMore: {
    fontSize: 14,
    color: "#8F8F8F",
  },
  categoriesList: {
    paddingLeft: 16,
    paddingBottom: 0,
  },
  categoryContainer: {
    width: 100,
    marginRight: 16,
    alignItems: "center",
  },
  categoryCard: {
    width: 80,
    height: 80,
    borderRadius: 40,
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
  categoryImage: {
    width: "100%",
    height: "100%",
  },
  categoryTextContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  categoryLabel: {
    color: "#1E7C7E",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 0.3,
  },
  trendingGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    justifyContent: "space-between",
    width: "100%",
    paddingBottom: 20,
  },
  filterPanel: {
    backgroundColor: "#FFFFFF",
    width: "100%",
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
    maxHeight: 200, // Limit height if many options
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
  filterLabel: {
    fontSize: 12,
    color: "#444",
    fontWeight: "500",
  },
  resetButton: {
    backgroundColor: "#FFEBEB",
    borderColor: "#FFD6D6",
    justifyContent: "center",
  },
  resetText: {
    color: "#FF4444",
    fontSize: 12,
    fontWeight: "600",
  },
  trendingCard: {
    width: (width - 44) / 2, // 16*2 padding + 12 gap = 44
    backgroundColor: "#fff",
    borderRadius: 20,
    marginBottom: 16,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  trendingImageWrapper: {
    height: 180,
    width: "100%",
    padding: 6,
  },
  trendingImage: {
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
  trendingInfo: {
    padding: 10,
    backgroundColor: "#1E7C7E",
    marginHorizontal: 6,
    marginBottom: 6,
    borderRadius: 12,
  },
  trendingTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 2,
  },
  noResults: {
    width: "100%",
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  noResultsText: {
    marginTop: 12,
    fontSize: 16,
    color: "#8F8F8F",
    fontWeight: "500",
  },
  trendingPrice: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 12,
    fontWeight: "600",
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
});
