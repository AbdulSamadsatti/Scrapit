import React, { useState } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Property } from "../services/propertyApi";

// ── Brand colours per source ──────────────────────────────────────
const SOURCE_COLORS: Record<string, string> = {
    zameen: "#1F9D55",
    graana: "#7C3AED",
    olx: "#002F34",
};

function sourceColor(source?: string) {
    return SOURCE_COLORS[(source || "").toLowerCase()] || "#1E7C7E";
}

function priceText(p: Property) {
    if (p.price) return p.price;
    if (p.price_amount) {
        return `${p.currency || "PKR"} ${p.price_amount.toLocaleString()}`;
    }
    return "Price on request";
}

function resolveImage(p: Property) {
    let uri = p.image_url || p.image || "";
    if (uri && uri.startsWith("//")) uri = "https:" + uri;
    return uri && /^https?:/.test(uri)
        ? uri
        : "https://placehold.co/400x300?text=Property";
}

function cap(s?: string) {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
}

function purposeLabel(p: Property) {
    if (p.purpose === "rent") return "For Rent";
    if (p.purpose === "sale") return "For Sale";
    return "";
}

export default function PropertyCard({ property, onPress }: { property: Property; onPress?: () => void }) {
    const router = useRouter();
    const [imgErr, setImgErr] = useState(false);
    const color = sourceColor(property.source);
    const label = property.source_label || property.source || "Property";
    const imageUri = imgErr ? "https://placehold.co/400x300?text=Property" : resolveImage(property);
    const purpose = purposeLabel(property);

    function handlePress() {
        if (onPress) {
            onPress();
            return;
        }
        router.push({
            pathname: "/product-details",
            params: {
                id: property.id || property.listing_url || property.title,
                title: property.title || "",
                price: priceText(property),
                image: resolveImage(property),
                location: property.location || "Pakistan",
                type: property.source_label || property.source || "Property",
                postedDate: property.posted_at || "",
                category: "Property",
                description: property.description || "",
                link: property.listing_url || "",
                source: property.source || "",
                source_label: label,
                // property-specific extras
                beds: property.beds || "",
                baths: property.baths || "",
                area: property.area || "",
                purpose: purpose,
                property_type: cap(property.property_type),
                seller_name: property.agent_name || "",
            },
        });
    }

    const hasMeta = !!(property.beds || property.baths || property.area);

    return (
        <TouchableOpacity style={S.card} onPress={handlePress} activeOpacity={0.86}>
            <View style={S.imageWrap}>
                <Image source={{ uri: imageUri }} style={S.image} resizeMode="cover" onError={() => setImgErr(true)} />
            </View>

            <View style={S.info}>
                <View style={S.topRow}>
                    <Text style={S.title} numberOfLines={2}>{property.title}</Text>
                    <View style={[S.pill, { borderColor: color + "55", backgroundColor: color + "14" }]}>
                        <View style={[S.dot, { backgroundColor: color }]} />
                        <Text style={[S.pillText, { color }]}>{label}</Text>
                    </View>
                </View>

                <View style={S.priceRow}>
                    <Text style={[S.price, { color }]} numberOfLines={1}>{priceText(property)}</Text>
                    {purpose ? <Text style={S.purpose}>{purpose}</Text> : null}
                </View>

                <View style={S.metaRow}>
                    <Ionicons name="location-outline" size={12} color="#777" />
                    <Text style={S.metaText} numberOfLines={1}>{property.location || "Pakistan"}</Text>
                </View>

                {hasMeta ? (
                    <View style={S.featRow}>
                        {property.beds ? (
                            <View style={S.feat}>
                                <Ionicons name="bed-outline" size={12} color="#1E7C7E" />
                                <Text style={S.featText} numberOfLines={1}>{property.beds}</Text>
                            </View>
                        ) : null}
                        {property.baths ? (
                            <View style={S.feat}>
                                <Ionicons name="water-outline" size={12} color="#1E7C7E" />
                                <Text style={S.featText} numberOfLines={1}>{property.baths}</Text>
                            </View>
                        ) : null}
                        {property.area ? (
                            <View style={S.feat}>
                                <Ionicons name="resize-outline" size={12} color="#1E7C7E" />
                                <Text style={S.featText} numberOfLines={1}>{property.area}</Text>
                            </View>
                        ) : null}
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
        width: 72,
        height: 72,
        borderRadius: 12,
        overflow: "hidden",
        backgroundColor: "#EAF6F7",
    },
    image: { width: "100%", height: "100%" },
    info: { flex: 1, gap: 4 },
    topRow: { flexDirection: "row", gap: 6, alignItems: "flex-start" },
    title: { flex: 1, fontSize: 14, fontWeight: "800", color: "#1A1A2E", lineHeight: 19 },
    priceRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    price: { fontSize: 13, fontWeight: "800" },
    purpose: {
        fontSize: 9,
        fontWeight: "800",
        color: "#1E7C7E",
        backgroundColor: "#EAF6F7",
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: 6,
        overflow: "hidden",
    },
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
    featRow: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 2 },
    feat: { flexDirection: "row", alignItems: "center", gap: 3 },
    featText: { fontSize: 11, color: "#555", fontWeight: "600" },
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