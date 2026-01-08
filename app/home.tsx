import React, { useRef, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Image,
  Dimensions,
  Animated,
  FlatList,
  Platform,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { InteractiveMenu } from "../components/ui/modern-mobile-menu";
import InfinityLoader from "../components/ui/InfinityLoader";
import { SearchBar } from "../components/ui/search-bar";
import {
  Home,
  ShoppingCart,
  User,
  MessageSquare,
  Heart,
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
    price: "$ 1,234.56",
    image:
      "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=400&auto=format&fit=crop",
  },
  {
    id: "2",
    title: "Honda Civic",
    price: "$ 1,234.56",
    image:
      "https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?q=80&w=400&auto=format&fit=crop",
  },
  {
    id: "3",
    title: "Nathia Gali",
    price: "$ 1,234.56",
    image:
      "https://images.unsplash.com/photo-1591817505018-a9ba98f8f450?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8bmF0aGlhZ2FsbGl8ZW58MHx8MHx8fDA%3D",
  },
  {
    id: "4",
    title: "IT Job",
    price: "$ 1,234.56",
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

interface HeroItem {
  id: string;
  title: string;
  image: string;
  subtitle: string;
}

export default function HomePage() {
  const scrollY = useRef(new Animated.Value(0)).current;
  const categoriesAnim = useRef(new Animated.Value(0)).current;
  const trendingAnim = useRef(new Animated.Value(0)).current;
  const heroFlatListRef = useRef<FlatList>(null);
  const [activeHeroIndex, setActiveHeroIndex] = React.useState(0);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState("All");
  const [likedItems, setLikedItems] = React.useState<{
    [key: string]: boolean;
  }>({});

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

  const toggleLike = (id: string) => {
    setLikedItems((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

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
        delay: 400,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto-play hero carousel
    const interval = setInterval(() => {
      setActiveHeroIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % HERO_ITEMS.length;
        heroFlatListRef.current?.scrollToIndex({
          index: nextIndex,
          animated: true,
        });
        return nextIndex;
      });
    }, 4000);

    return () => clearInterval(interval);
  }, [categoriesAnim, trendingAnim, heroFlatListRef]);

  const renderHeroItem = ({ item }: { item: HeroItem }) => (
    <View style={styles.heroItem}>
      <Image source={{ uri: item.image }} style={styles.heroImage} />
      <View style={styles.heroOverlay}>
        <Text style={styles.heroTitle}>{item.title}</Text>
        <Text style={styles.heroSubtitle}>{item.subtitle}</Text>
      </View>
    </View>
  );

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
            source={{ uri: item.image }}
            style={styles.categoryImage}
            resizeMode="cover"
          />
        </View>
        <View style={styles.categoryTextContainer}>
          <Text style={styles.categoryLabel}>{item.name}</Text>
        </View>
      </Animated.View>
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
    const isLiked = likedItems[item.id];

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
            source={{ uri: item.image }}
            style={styles.trendingImage}
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
        </View>
        <View style={styles.trendingInfo}>
          <Text style={styles.trendingTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.trendingPrice}>{item.price}</Text>
          <TouchableOpacity style={styles.addButton} activeOpacity={0.7}>
            <Ionicons name="add" size={22} color="#1E7C7E" />
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  const menuItems = [
    {
      icon: Home,
      label: "Home",
      onClick: () => alert("Home!"),
    },
    {
      icon: ShoppingCart,
      label: "Cart",
      onClick: () => alert("Cart!"),
    },
    {
      icon: MessageSquare,
      label: "Chatbot",
      onClick: () => alert("Chatbot!"),
    },
    {
      icon: Heart,
      label: "Liked",
      onClick: () => alert("Liked!"),
    },
    {
      icon: User,
      label: "Profile",
      onClick: () => alert("Profile!"),
    },
  ];

  const handleMenuItemPress = (index: number) => {
    switch (index) {
      case 0:
        // Already on home
        break;
      case 1:
        alert("Cart coming soon!");
        break;
      case 2:
        alert("Chatbot coming soon!");
        break;
      case 3:
        alert("Liked coming soon!");
        break;
      case 4:
        alert("Profile coming soon!");
        break;
      default:
        break;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.logoContainer}>
            <InfinityLoader size={0.9} />
            <Text style={styles.logoText}>SCRAPIT</Text>
          </View>

          <SearchBar
            containerStyle={styles.searchContainer}
            placeholder="Search your perfect find..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onCategorySelect={setSelectedCategory}
            selectedCategory={selectedCategory}
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

          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => {}}
          >
            <Ionicons name="options-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: 80 }}
      >
        {/* Hero Carousel */}
        <View style={styles.heroContainer}>
          <FlatList
            ref={heroFlatListRef}
            data={HERO_ITEMS}
            renderItem={renderHeroItem}
            keyExtractor={(item) => item.id}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(event) => {
              const index = Math.round(
                event.nativeEvent.contentOffset.x / (width - 32)
              );
              setActiveHeroIndex(index);
            }}
          />
          <View style={styles.pagination}>
            {HERO_ITEMS.map((_, i) => (
              <View
                key={i}
                style={[styles.dot, i === activeHeroIndex && styles.activeDot]}
              />
            ))}
          </View>
        </View>

        {/* Categories Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <TouchableOpacity>
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
          <TouchableOpacity>
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
    paddingBottom: 20,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    height: 60,
    position: "relative",
    paddingHorizontal: 0,
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    zIndex: 1,
    position: "absolute",
    left: 10,
    top: 6,
  },
  logoText: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 1,
    marginLeft: 10,
  },
  searchContainer: {
    position: "absolute",
    right: 58,
    top: 6,
    zIndex: 10,
  },
  filterButton: {
    width: 42,
    height: 42,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 21,
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
    right: 10,
    top: 6,
  },
  heroContainer: {
    margin: 16,
    height: 200,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#ddd",
    position: "relative",
  },
  heroItem: {
    width: width - 32,
    height: 200,
    position: "relative",
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  heroOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  heroTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 4,
  },
  heroSubtitle: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 14,
    fontWeight: "500",
  },
  pagination: {
    position: "absolute",
    bottom: 12,
    right: 20,
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
  },
  activeDot: {
    backgroundColor: "#fff",
    width: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginTop: 10,
    marginBottom: 15,
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
    paddingBottom: 10,
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(30, 124, 126, 0.08)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
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
    paddingHorizontal: 8,
    justifyContent: "space-between",
    paddingBottom: 0,
  },
  trendingCard: {
    width: (width - 48) / 2,
    backgroundColor: "#fff",
    borderRadius: 20,
    marginHorizontal: 8,
    marginBottom: 12,
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
