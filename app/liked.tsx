import React from "react";
import { useRouter } from "expo-router";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { InteractiveMenu } from "../components/ui/modern-mobile-menu";
import { useCart } from "@/contexts/CartContext";

const LikedScreen = () => {
  const router = useRouter();
  const { likedItems } = useCart();
  const formatPrice = (p: string) =>
    `Rs ${(p || "").replace(/^(rs|RS)\s*/i, "")}`;

  return (
    <SafeAreaView style={styles.container}>
      {/* Minimal Header */}
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
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Liked Items</Text>
          <View style={styles.placeholderButton} />
        </View>
      </LinearGradient>

      {/* Liked Items List */}
      <ScrollView
        style={styles.likedContent}
        showsVerticalScrollIndicator={false}
      >
        {likedItems.length > 0 ? (
          likedItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.9}
              onPress={() => {
                router.push({
                  pathname: "/product-details",
                  params: {
                    itemId: item.id,
                    category: item.category,
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
              <View style={styles.likedItem}>
                <Image source={{ uri: item.image }} style={styles.itemImage} />
                <View style={styles.itemInfo}>
                  <Text style={styles.itemTitle}>{item.title}</Text>
                  <Text style={styles.itemPrice}>
                    {formatPrice(item.price)}
                  </Text>
                  <View style={styles.itemMeta}>
                    <Ionicons name="location-outline" size={14} color="#666" />
                    <Text style={styles.itemLocation}>{item.location}</Text>
                    <Text style={styles.itemType}>{item.type}</Text>
                  </View>
                </View>
                <Ionicons name="heart" size={24} color="#FF4B6E" />
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="heart-outline" size={64} color="#CCC" />
            <Text style={styles.emptyStateTitle}>No Liked Items</Text>
            <Text style={styles.emptyStateText}>
              Start liking products to see them here
            </Text>
          </View>
        )}
      </ScrollView>

      <InteractiveMenu
        onItemPress={(index) => {
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
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F8F9",
  },
  header: {
    paddingVertical: 12,
    height: 60,
    justifyContent: "center",
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
    textAlign: "center",
  },
  placeholderButton: {
    width: 40,
    height: 40,
  },
  likedContent: {
    flex: 1,
    padding: 16,
  },
  likedItem: {
    flexDirection: "row",
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: "#F0F0F0",
  },
  itemInfo: {
    flex: 1,
    marginLeft: 16,
    justifyContent: "space-between",
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E7C7E",
    marginBottom: 8,
  },
  itemMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  itemLocation: {
    fontSize: 12,
    color: "#6B7280",
  },
  itemType: {
    fontSize: 12,
    color: "#6B7280",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  emptyState: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
  },
});

export default LikedScreen;
