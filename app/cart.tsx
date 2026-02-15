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
import { useCart } from "@/contexts/CartContext";

const CartScreen = () => {
  const router = useRouter();
  const { cartItems, updateQuantity, removeFromCart, clearCart, getTotal } =
    useCart();

  const handleQuantityChange = (id: string, change: number) => {
    updateQuantity(id, change);
  };

  const removeItem = (id: string) => {
    removeFromCart(id);
  };
  const resolveImage = (u: string) =>
    u && /^https?:/.test(u)
      ? u
      : "https://via.placeholder.com/300x300?text=Image";

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
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>My Cart</Text>
            <Text style={styles.itemCount}>({cartItems.length} items)</Text>
          </View>
          <TouchableOpacity
            onPress={clearCart}
            style={styles.clearCartButton}
            activeOpacity={0.8}
          >
            <Ionicons name="trash-outline" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.cartContent}
        showsVerticalScrollIndicator={false}
      >
        {cartItems.map((item) => {
          const itemPrice = parseFloat(
            (item.price || "0").replace(/[rs,\s]/gi, ""),
          );
          const subtotal = isNaN(itemPrice)
            ? "0"
            : (itemPrice * item.quantity).toLocaleString("en-PK");

          return (
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
              <View style={styles.cartItem}>
                <Image
                  source={{ uri: resolveImage(item.image) }}
                  style={styles.itemImage}
                />
                <View style={styles.itemInfo}>
                  <Text style={styles.itemTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.itemPrice}>Rs {itemPrice.toLocaleString("en-PK")}</Text>
                  <View style={styles.itemActions}>
                    <View style={styles.quantityControl}>
                      <TouchableOpacity
                        style={styles.quantityButton}
                        onPress={() => handleQuantityChange(item.id, -1)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="remove" size={16} color="#1E7C7E" />
                      </TouchableOpacity>
                      <Text style={styles.quantity}>{item.quantity}</Text>
                      <TouchableOpacity
                        style={styles.quantityButton}
                        onPress={() => handleQuantityChange(item.id, 1)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="add" size={16} color="#1E7C7E" />
                      </TouchableOpacity>
                    </View>
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => removeItem(item.id)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.removeButtonText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.itemSubtotal}>
                  <Text style={styles.subtotalLabel}>Subtotal</Text>
                  <Text style={styles.subtotalAmount}>Rs {subtotal}</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
        {cartItems.length === 0 && (
          <View style={styles.emptyCart}>
            <Ionicons name="cart-outline" size={48} color="#CCC" />
            <Text style={styles.emptyCartText}>Your cart is empty</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.checkoutSection}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total Amount</Text>
          <Text style={styles.totalAmount}>
            Rs {getTotal().toLocaleString("en-PK")}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.checkoutButton}
          activeOpacity={cartItems.length === 0 ? 1 : 0.8}
          disabled={cartItems.length === 0}
        >
          <Text style={styles.checkoutButtonText}>Proceed to Checkout</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F8F9",
  },
  header: {
    paddingVertical: 16,
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
  headerLeft: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
  },
  itemCount: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 14,
    marginTop: 2,
  },
  clearCartButton: {
    padding: 8,
  },
  cartContent: {
    flex: 1,
    padding: 12,
  },
  cartItem: {
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
  itemActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  quantityControl: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F8F9",
    borderRadius: 8,
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  quantityButton: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  quantity: {
    marginHorizontal: 12,
    fontWeight: "600",
    color: "#1F2937",
    minWidth: 20,
    textAlign: "center",
    backgroundColor: "#fff",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  removeButton: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
  },
  removeButtonText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  itemSubtotal: {
    alignItems: "flex-end",
    justifyContent: "flex-start",
    marginLeft: 16,
  },
  subtotalLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
  },
  subtotalAmount: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
  },
  emptyCart: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyCartText: {
    fontSize: 16,
    color: "#6B7280",
    fontWeight: "500",
    marginTop: 8,
  },
  checkoutSection: {
    backgroundColor: "white",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    padding: 16,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "800",
    color: "#EF4444",
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  checkoutButton: {
    backgroundColor: "#1E7C7E",
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
    opacity: 0.95,
  },
  checkoutButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});

export default CartScreen;