import React, { useState } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Product } from "../services/productApi";

const SOURCE_COLORS: Record<string, string> = {
    daraz: "#F85606",
    olx: "#002F34",
    priceoye: "#48AFF0",
    amazon: "#FF9900",
};

function sourceColor(source?: string) {
    return SOURCE_COLORS[(source || "").toLowerCase()] || "#1E7C7E";
}

function priceText(product: Product) {
    if (product.price) return product.price;
    if (product.price_amount) {
        return `${product.currency || "PKR"} ${product.price_amount.toLocaleString()}`;
    }
    return "Price not available";
}

function resolveImage(product: Product) {
    let uri = product.image_url || product.image || "";
    if (uri && uri.startsWith("//")) {
        uri = "https:" + uri;
    }
    return uri && /^https?:/.test(uri)
        ? uri
        : "https://placehold.co/400x300?text=Product";
}

export default function ProductCard({ product, onPress }: { product: Product; onPress?: () => void }) {
    const router = useRouter();
    const [imgErr, setImgErr] = useState(false);
    const color = sourceColor(product.source);
    const label = product.source_label || product.source || "Product";
    const imageUri = imgErr ? "https://placehold.co/400x300?text=Product" : resolveImage(product);

    function handlePress() {
        if (onPress) {
            onPress();
            return;
        }
        router.push({
            pathname: "/product-details",
            params: {
                id: product.id || product.product_url || product.title,
                title: product.title || "",
                price: priceText(product),
                image: resolveImage(product),
                location: product.location || product.availability || "Available",
                type: product.source_label || product.source || "Product",
                postedDate: product.availability || "Available",
                category: "E-Commerce",
                description: product.description || "",
                link: product.product_url || "",
                source: product.source || "",
                source_label: label,
                rating: product.rating || "",
                review_count: product.review_count || "",
                seller_name: product.seller_name || "",
                brand: product.brand || "",
            },
        });
    }

    return (
        <TouchableOpacity style={S.card} onPress={handlePress} activeOpacity={0.86}>
            <View style={S.imageWrap}>
                <Image source={{ uri: imageUri }} style={S.image} resizeMode="cover" onError={() => setImgErr(true)} />
            </View>

            <View style={S.info}>
                <View style={S.topRow}>
                    <Text style={S.title} numberOfLines={2}>{product.title}</Text>
                    <View style={[S.pill, { borderColor: color + "55", backgroundColor: color + "14" }]}>
                        <View style={[S.dot, { backgroundColor: color }]} />
                        <Text style={[S.pillText, { color }]}>{label}</Text>
                    </View>
                </View>

                <Text style={[S.price, { color }]} numberOfLines={1}>{priceText(product)}</Text>

                <View style={S.metaRow}>
                    <Ionicons name="storefront-outline" size={12} color="#777" />
                    <Text style={S.metaText} numberOfLines={1}>
                        {product.seller_name || product.availability || "Available"}
                    </Text>
                </View>

                {product.rating ? (
                    <View style={S.metaRow}>
                        <Ionicons name="star" size={12} color="#F5A623" />
                        <Text style={S.metaText} numberOfLines={1}>
                            {product.rating}{product.review_count ? ` (${product.review_count})` : ""}
                        </Text>
                    </View>
                ) : null}
            </View>

            <View style={S.chevronCircle}>
                <Ionicons name="chevron-forward" size={14} color="#1E7C7E" />
            </View>
        </TouchableOpacity>
    );
}

const S = StyleSheet.create({
    card: {
        backgroundColor: "#fff",
        borderRadius: 14,
        padding: 12,
        marginHorizontal: 16,
        marginBottom: 10,
        flexDirection: "row",
        gap: 12,
        elevation: 2,
        shadowColor: "#000",
        shadowOpacity: 0.07,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
    },
    imageWrap: {
        width: 64,
        height: 64,
        borderRadius: 12,
        overflow: "hidden",
        backgroundColor: "#EAF6F7",
    },
    image: { width: "100%", height: "100%" },
    info: { flex: 1, gap: 4 },
    topRow: { flexDirection: "row", gap: 6, alignItems: "flex-start" },
    title: { flex: 1, fontSize: 14, fontWeight: "800", color: "#1A1A2E", lineHeight: 19 },
    price: { fontSize: 13, fontWeight: "800" },
    pill: {
        flexDirection: "row",
        alignItems: "center",
        gap: 3,
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 6,
        paddingVertical: 2,
        maxWidth: 82,
    },
    dot: { width: 5, height: 5, borderRadius: 3 },
    pillText: { fontSize: 9, fontWeight: "800" },
    metaRow: { flexDirection: "row", alignItems: "center", gap: 4 },
    metaText: { flex: 1, fontSize: 12, color: "#777" },
    chevronCircle: {
        alignSelf: "center",
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: "#EAF6F7",
        alignItems: "center",
        justifyContent: "center",
    },
});