import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import PropertyCard from "./Property-card";
import { Property } from "../services/propertyApi";

function Skeleton() {
    return (
        <View style={SK.card}>
            <View style={SK.image} />
            <View style={SK.lines}>
                <View style={[SK.bar, { width: "75%" }]} />
                <View style={[SK.bar, { width: "42%", marginTop: 8 }]} />
                <View style={[SK.bar, { width: "58%", marginTop: 6 }]} />
                <View style={[SK.bar, { width: "36%", marginTop: 6 }]} />
            </View>
        </View>
    );
}

function Empty({ msg }: { msg?: string }) {
    return (
        <View style={S.empty}>
            <Ionicons name="home-outline" size={46} color="#CCC" />
            <Text style={S.emptyTitle}>No properties found</Text>
            <Text style={S.emptyMsg}>{msg || "Try another city or search term."}</Text>
        </View>
    );
}

export default function PropertyList({
    properties,
    loading = false,
    maxItems,
    headerTitle,
    emptyMessage,
}: {
    properties: Property[];
    loading?: boolean;
    refreshing?: boolean;
    onRefresh?: () => void;
    maxItems?: number;
    headerTitle?: string;
    emptyMessage?: string;
}) {
    const list = maxItems ? properties.slice(0, maxItems) : properties;

    if (loading) {
        return (
            <View>
                {headerTitle ? <Text style={S.header}>{headerTitle}</Text> : null}
                <Skeleton />
                <Skeleton />
                <Skeleton />
            </View>
        );
    }

    if (!list?.length) {
        return <Empty msg={emptyMessage} />;
    }

    return (
        <View>
            {headerTitle ? <Text style={S.header}>{headerTitle}</Text> : null}
            {list.map((property, index) => (
                <PropertyCard
                    key={property.id || property.listing_url || `${property.title}-${index}`}
                    property={property}
                />
            ))}
        </View>
    );
}

const S = StyleSheet.create({
    header: {
        fontSize: 16,
        fontWeight: "800",
        color: "#1A1A2E",
        marginHorizontal: 16,
        marginBottom: 10,
        marginTop: 4,
    },
    empty: { alignItems: "center", paddingVertical: 40, paddingHorizontal: 24 },
    emptyTitle: { fontSize: 16, fontWeight: "800", color: "#1A1A2E", marginTop: 12, marginBottom: 6 },
    emptyMsg: { fontSize: 13, color: "#999", textAlign: "center", lineHeight: 20 },
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
    image: { width: 72, height: 72, borderRadius: 12, backgroundColor: "#EBEBEB" },
    lines: { flex: 1, justifyContent: "center" },
    bar: { height: 11, borderRadius: 6, backgroundColor: "#EBEBEB" },
});