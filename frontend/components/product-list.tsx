import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import InfinityLoader from "./ui/InfinityLoader";
import ProductCard from "./product-card";
import { Product } from "../services/productApi";

function Skeleton() {
    return (
        <View style={SK.card}>
            <View style={SK.image} />
            <View style={SK.lines}>
                <View style={[SK.bar, { width: "75%" }]} />
                <View style={[SK.bar, { width: "42%", marginTop: 8 }]} />
                <View style={[SK.bar, { width: "58%", marginTop: 6 }]} />
            </View>
        </View>
    );
}

function Empty({ msg }: { msg?: string }) {
    return (
        <View style={S.empty}>
            <Ionicons name="cube-outline" size={46} color="#CCC" />
            <Text style={S.emptyTitle}>No products found</Text>
            <Text style={S.emptyMsg}>{msg || "Try searching another product."}</Text>
        </View>
    );
}

export default function ProductsList({
    products,
    loading = false,
    refreshing = false,
    maxItems,
    emptyMessage,
}: {
    products: Product[];
    loading?: boolean;
    refreshing?: boolean;
    onRefresh?: () => void;
    maxItems?: number;
    emptyMessage?: string;
}) {
    const list = maxItems ? products.slice(0, maxItems) : products;

    if (loading) {
        return (
            <View>
                <Skeleton />
                <Skeleton />
                <Skeleton />
            </View>
        );
    }

    if (!list.length) {
        return <Empty msg={emptyMessage} />;
    }

    return (
        <View>
            {list.map((product, index) => (
                <ProductCard key={`${product.id || product.product_url || product.title}-${index}`} product={product} />
            ))}
        </View>
    );
}

const S = StyleSheet.create({
    empty: { alignItems: "center", paddingVertical: 40, paddingHorizontal: 24 },
    emptyTitle: { fontSize: 16, fontWeight: "800", color: "#1A1A2E", marginTop: 12, marginBottom: 6 },
    emptyMsg: { fontSize: 13, color: "#999", textAlign: "center", lineHeight: 20 },
    loaderWrapper: { alignItems: "center", justifyContent: "center", paddingVertical: 20 },
});

const SK = StyleSheet.create({
    card: {
        backgroundColor: "#fff",
        borderRadius: 14,
        padding: 14,
        marginHorizontal: 16,
        marginBottom: 10,
        flexDirection: "row",
        gap: 12,
        elevation: 1,
    },
    image: { width: 64, height: 64, borderRadius: 12, backgroundColor: "#EBEBEB" },
    lines: { flex: 1, justifyContent: "center" },
    bar: { height: 11, borderRadius: 6, backgroundColor: "#EBEBEB" },
});