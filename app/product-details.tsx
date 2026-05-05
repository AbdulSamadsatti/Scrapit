import React, { useRef } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useCart } from "@/contexts/CartContext";

export default function ProductDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { addToCart, toggleLike, isLiked } = useCart();
  const scrollY = useRef(new Animated.Value(0)).current;

  const id = (params.itemId as string) || (params.id as string) || "";
  const title = (params.title as string) || "Product";
  const rawPrice = (params.price as string) || "0";
  const image =
    (params.image as string) ||
    "https://images.unsplash.com/photo-1553275100-834bb1406c43?q=80&w=800&auto=format&fit=crop";
  const location = (params.location as string) || "Available";
  const type = (params.type as string) || "General";
  const postedDate = (params.postedDate as string) || "New";
  const category = (params.category as string) || "All";
  const descriptionParam = (params.description as string) || "";

  const formatPrice = (p: string) =>
    `Rs ${(p || "").replace(/^(rs|RS)\s*/i, "")}`;
  const resolveImage = (u: string) =>
    u && /^https?:/.test(u)
      ? u
      : "https://via.placeholder.com/800x600?text=Image";
  const liked = isLiked(id);
  const autoDescription =
    descriptionParam ||
    `${title} ${type} available in ${location}. Premium choice with reliable performance and modern design. Verified listing posted ${postedDate} with clear pricing and transparent details. Suitable for daily use and fits a wide range of requirements. Add to cart or like to keep track.`;
  const highlights = [
    "Trusted seller",
    "Fast response",
    "Secure payment",
    "Quality checked",
  ];

  const itemPayload = {
    id,
    title,
    price: rawPrice,
    image,
    location,
    type,
    postedDate,
    category,
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={["#031d1e", "#063537", "#0D5A5B", "#1E7C7E"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Product Details</Text>
          <View style={styles.headerRight} />
        </View>
      </LinearGradient>

      <Animated.ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true },
        )}
        scrollEventThrottle={16}
      >
        <View style={styles.imageWrapper}>
          <Animated.Image
            source={{ uri: resolveImage(image as string) }}
            style={[
              styles.image,
              {
                transform: [
                  {
                    translateY: scrollY.interpolate({
                      inputRange: [-100, 0, 300],
                      outputRange: [20, 0, -50],
                      extrapolateLeft: "extend",
                      extrapolateRight: "clamp",
                    }),
                  },
                  {
                    scale: scrollY.interpolate({
                      inputRange: [-120, 0],
                      outputRange: [1.1, 1],
                      extrapolateLeft: "extend",
                      extrapolateRight: "clamp",
                    }),
                  },
                ],
              },
            ]}
            resizeMode="cover"
          />
          <LinearGradient
            colors={["rgba(0,0,0,0.0)", "rgba(0,0,0,0.25)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.imageOverlay}
          />
          <View style={styles.imageBadge}>
            <Text style={styles.imageBadgeText}>{postedDate}</Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={2}>
              {title}
            </Text>
          </View>
          <Text style={styles.price}>{formatPrice(rawPrice)}</Text>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={18} color="#1E7C7E" />
              <Text style={styles.metaText} numberOfLines={1}>
                {location}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="pricetag-outline" size={18} color="#1E7C7E" />
              <Text style={styles.metaText} numberOfLines={1}>
                {type}
              </Text>
            </View>
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.primaryButton}
              activeOpacity={0.85}
              onPress={() => addToCart(itemPayload)}
            >
              <Ionicons name="cart" size={20} color="#fff" />
              <Text style={styles.primaryButtonText}>Add to Cart</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.secondaryButton,
                liked && styles.secondaryButtonActive,
              ]}
              activeOpacity={0.85}
              onPress={() => toggleLike(itemPayload)}
            >
              <Ionicons
                name={liked ? "heart" : "heart-outline"}
                size={20}
                color={liked ? "#FF4B6E" : "#1E7C7E"}
              />
              <Text
                style={[
                  styles.secondaryButtonText,
                  liked && styles.secondaryButtonTextActive,
                ]}
              >
                {liked ? "Liked" : "Like"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.descriptionCard}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.descriptionText}>{autoDescription}</Text>
          <View style={styles.chipsRow}>
            {highlights.map((h) => (
              <View key={h} style={styles.chip}>
                <Ionicons name="checkmark-circle" size={16} color="#1E7C7E" />
                <Text style={styles.chipText}>{h}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>Details</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Category</Text>
            <Text style={styles.detailValue}>{category}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Posted</Text>
            <Text style={styles.detailValue}>{postedDate}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Location</Text>
            <Text style={styles.detailValue}>{location}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Type</Text>
            <Text style={styles.detailValue}>{type}</Text>
          </View>
        </View>
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F8F9",
  },
  header: {
    paddingVertical: 12,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
  },
  headerRight: {
    width: 40,
    height: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  imageWrapper: {
    height: 280,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#EAF6F7",
    marginBottom: 16,
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imageOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 80,
  },
  imageBadge: {
    position: "absolute",
    bottom: 10,
    left: 10,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  imageBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1F2937",
  },
  price: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1E7C7E",
    marginTop: 4,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  metaText: {
    fontSize: 13,
    color: "#6B7280",
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: "#1E7C7E",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: "#EAF6F7",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    borderWidth: 1,
    borderColor: "#D6EEEF",
  },
  secondaryButtonActive: {
    backgroundColor: "#FFEFF3",
    borderColor: "#FFD4DE",
  },
  secondaryButtonText: {
    color: "#1E7C7E",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButtonTextActive: {
    color: "#FF4B6E",
  },
  descriptionCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  detailsCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1F2937",
    marginBottom: 10,
  },
  descriptionText: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 20,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EAF6F7",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#D6EEEF",
  },
  chipText: {
    fontSize: 12,
    color: "#1E7C7E",
    fontWeight: "700",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  detailLabel: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "600",
  },
  detailValue: {
    fontSize: 13,
    color: "#1F2937",
    fontWeight: "700",
  },
});
