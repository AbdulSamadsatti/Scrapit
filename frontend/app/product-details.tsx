/**
 * product-details.tsx
 *
 * Two modes in one screen:
 *   category === "Jobs"  →  Professional Job Detail (LinkedIn-style)
 *   everything else      →  Original product detail (unchanged)
 */
import React, { useRef, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  StyleSheet, View, Text, TouchableOpacity,
  Animated, Image, Linking, Alert, ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useCart } from "../contexts/CartContext";

// ── Source config ─────────────────────────────────────────────────
const SOURCE_COLORS: Record<string, string> = {
  linkedin: "#0A66C2",
  careerokay: "#C8102E",
  mustakbil: "#1778F2",
  google_jobs: "#4285F4",
};
const SOURCE_LABELS: Record<string, string> = {
  linkedin: "LinkedIn",
  careerokay: "CareerOkay",
  mustakbil: "Mustakbil",
  google_jobs: "Google Jobs",
};

// ── Salary cleaner ────────────────────────────────────────────────
function cleanSalary(raw: string): string {
  if (!raw?.trim()) return "Salary not disclosed";
  const s = raw.trim();
  const blocked = ["google_jobs", "google", "linkedin", "careerokay", "n/a", "-"];
  if (blocked.includes(s.toLowerCase())) return "Salary not disclosed";
  if (!/\d/.test(s)) return "Salary not disclosed";
  return /^(rs\.?|pkr|usd|\$)/i.test(s) ? s : `Rs ${s}`;
}

// ── Company avatar ────────────────────────────────────────────────
function CompanyAvatar({ name, source, size = 100 }:
  { name: string; source: string; size?: number }) {
  const color = SOURCE_COLORS[source] || "#1E7C7E";
  const initials = (name || "?").split(" ").slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "").join("") || "?";
  return (
    <View style={[JD.avatarBox, {
      width: size, height: size, borderRadius: size * 0.18,
      backgroundColor: color + "18", borderColor: color + "55",
    }]}>
      <Text style={[JD.avatarTxt, { color, fontSize: size * 0.3 }]}>{initials}</Text>
    </View>
  );
}

// ── Source badge ──────────────────────────────────────────────────
function SourceBadge({ source, label }: { source: string; label: string }) {
  const c = SOURCE_COLORS[source] || "#777";
  if (!label) return null;
  return (
    <View style={[JD.badge, { backgroundColor: c + "14", borderColor: c + "55" }]}>
      <View style={[JD.badgeDot, { backgroundColor: c }]} />
      <Text style={[JD.badgeTxt, { color: c }]}>{label}</Text>
    </View>
  );
}

// ── Divider ───────────────────────────────────────────────────────
function Divider() {
  return <View style={{ height: 1, backgroundColor: "#F0F0F0", marginVertical: 12 }} />;
}

// ── Detail row ────────────────────────────────────────────────────
function DetailRow({ icon, label, value }: { icon: any; label: string; value: string }) {
  if (!value) return null;
  return (
    <View style={JD.detailRow}>
      <View style={JD.detailLeft}>
        <Ionicons name={icon} size={16} color="#1E7C7E" />
        <Text style={JD.detailLabel}>{label}</Text>
      </View>
      <Text style={JD.detailValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

// ════════════════════════════════════════════════════════════════════
//  JOB DETAIL — full screen for a single job listing
// ════════════════════════════════════════════════════════════════════
function JobDetail({
  title, company, location, salary, description, logo, applyLink,
  source, sourceLabel, postedDate, banner, onBack, onLike, liked,
}: {
  title: string; company: string; location: string; salary: string;
  description: string; logo: string; applyLink: string;
  source: string; sourceLabel: string; postedDate: string; banner: string;
  onBack: () => void; onLike: () => void; liked: boolean;
}) {
  const [logoErr, setLogoErr] = useState(false);
  const [bannerErr, setBannerErr] = useState(false);
  const showLogo = !!logo && /^https?:/.test(logo) && !logoErr;
  const showBanner = !!banner && /^https?:/.test(banner) && !bannerErr;
  const accentColor = SOURCE_COLORS[source] || "#1E7C7E";

  function handleApply() {
    if (!applyLink) { Alert.alert("No Link", "Apply link is not available."); return; }
    Linking.openURL(applyLink).catch(() => Alert.alert("Error", "Could not open link."));
  }

  // Split description into paragraphs for nice rendering
  const paragraphs = description
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F5F8F9" }}>

      {/* ── Header ── */}
      <LinearGradient
        colors={["#031d1e", "#063537", "#0D5A5B", "#1E7C7E"]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={S.header}
      >
        <View style={S.headerRow}>
          <TouchableOpacity onPress={onBack} style={S.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={S.headerTitle}>Job Details</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}>

        {/* ── Logo card ── */}
        <View style={JD.logoCard}>
          {showLogo ? (
            <Image source={{ uri: logo }} style={JD.logoImg}
              resizeMode="contain" onError={() => setLogoErr(true)} />
          ) : (
            <CompanyAvatar name={company || title} source={source} size={100} />
          )}
          {postedDate ? (
            <View style={JD.postedBadge}>
              <Ionicons name="time-outline" size={11} color="#fff" />
              <Text style={JD.postedTxt}>{postedDate}</Text>
            </View>
          ) : null}
        </View>

        {/* ── Info card ── */}
        <View style={S.card}>

          {/* Source badge */}
          {sourceLabel ? <SourceBadge source={source} label={sourceLabel} /> : null}

          {/* Job title */}
          <Text style={JD.jobTitle}>{title}</Text>

          {/* Salary */}
          <Text style={[JD.salaryText, { color: accentColor }]}>{salary}</Text>

          <Divider />

          {/* Details grid */}
          <DetailRow icon="business-outline" label="Company" value={company} />
          <DetailRow icon="location-outline" label="Location" value={location} />
          {sourceLabel
            ? <DetailRow icon="globe-outline" label="Source" value={sourceLabel} />
            : null}

          <Divider />

          {/* Action buttons */}
          <View style={JD.btnRow}>
            <TouchableOpacity
              style={[JD.applyBtn, !applyLink && JD.applyBtnDisabled]}
              onPress={handleApply} activeOpacity={0.86} disabled={!applyLink}
            >
              <Ionicons name="open-outline" size={18} color="#fff" />
              <Text style={JD.applyTxt}>Apply Now</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[JD.saveBtn, liked && JD.saveBtnLiked]}
              onPress={onLike} activeOpacity={0.86}
            >
              <Ionicons
                name={liked ? "heart" : "heart-outline"}
                size={18}
                color={liked ? "#E53935" : "#1E7C7E"}
              />
              <Text style={[JD.saveTxt, liked && { color: "#E53935" }]}>
                {liked ? "Saved" : "Save Job"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Visual Banner Ad Flyer ── */}
        {showBanner ? (
          <View style={[PD.imgWrapper, { marginTop: 12, marginBottom: 0, height: 280, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e0e0e0" }]}>
            <Image source={{ uri: banner }} style={PD.img} resizeMode="contain" onError={() => setBannerErr(true)} />
          </View>
        ) : null}

        {/* ── Description card ── */}
        {description ? (
          <View style={[S.card, { marginTop: 12 }]}>
            <Text style={JD.sectionTitle}>Job Description</Text>
            {paragraphs.length > 0 ? (
              paragraphs.map((para, i) => (
                <Text key={i} style={JD.descPara}>{para}</Text>
              ))
            ) : (
              <Text style={JD.descPara}>{description}</Text>
            )}
          </View>
        ) : null}

        {/* ── View on source link ── */}
        {applyLink ? (
          <TouchableOpacity style={JD.extLink} onPress={handleApply}>
            <Text style={JD.extLinkTxt}>
              View full posting on {sourceLabel || "job site"} ↗
            </Text>
          </TouchableOpacity>
        ) : null}

      </ScrollView>
    </SafeAreaView>
  );
}

// ════════════════════════════════════════════════════════════════════
//  PRODUCT DETAIL — original product screen (unchanged logic)
// ════════════════════════════════════════════════════════════════════
function ProductDetail({
  id, title, rawPrice, image, location, type, postedDate,
  category, description, productLink, sourceLabel, rating, reviewCount, sellerName, brand, onBack,
  addToCart, toggleLike, isLiked,
  beds, baths, area, purpose, propertyType,
}: any) {
  const scrollY = useRef(new Animated.Value(0)).current;
  const liked = isLiked(id);

  const formatPrice = (p: string) => {
    if (!p?.trim()) return "";
    const s = p.trim();
    if (/^(pkr|rs|usd|\$)/i.test(s)) return s;
    return `Rs ${s}`;
  };
  const resolveImage = (u: string) => {
    let uri = u || "";
    if (uri.startsWith("//")) uri = "https:" + uri;
    return uri && /^https?:/.test(uri)
      ? uri
      : "https://images.unsplash.com/photo-1553275100-834bb1406c43?q=80&w=800&auto=format&fit=crop";
  };

  const autoDescription = description ||
    `${title} — ${type} available in ${location}. Posted ${postedDate}.`;

  const highlights = ["Trusted seller", "Fast response", "Secure payment", "Quality checked"];
  const itemPayload = { id, title, price: rawPrice, image, location, type, postedDate, category, link: productLink };

  function handleOpenProduct() {
    if (!productLink) {
      Alert.alert("No Link", "Product link is not available.");
      return;
    }
    Linking.openURL(productLink).catch(() => Alert.alert("Error", "Could not open product link."));
  }

  return (
    <SafeAreaView style={S.container}>
      <LinearGradient
        colors={["#031d1e", "#063537", "#0D5A5B", "#1E7C7E"]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={S.header}
      >
        <View style={S.headerRow}>
          <TouchableOpacity onPress={onBack} style={S.backBtn}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={S.headerTitle}>{category === "Property" ? "Property Details" : "Product Details"}</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <Animated.ScrollView style={{ flex: 1, padding: 16 }}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        {/* Hero image */}
        <View style={PD.imgWrapper}>
          <Animated.Image
            source={{ uri: resolveImage(image) }}
            style={[PD.img, {
              transform: [
                { translateY: scrollY.interpolate({ inputRange: [-100, 0, 300], outputRange: [20, 0, -50], extrapolateLeft: "extend", extrapolateRight: "clamp" }) },
                { scale: scrollY.interpolate({ inputRange: [-120, 0], outputRange: [1.1, 1], extrapolateLeft: "extend", extrapolateRight: "clamp" }) },
              ]
            }]}
            resizeMode="cover"
          />
          <LinearGradient colors={["rgba(0,0,0,0.0)", "rgba(0,0,0,0.25)"]}
            start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={PD.imgOverlay} />
          <View style={PD.imgBadge}>
            <Text style={PD.imgBadgeTxt}>{postedDate}</Text>
          </View>
        </View>

        {/* Info */}
        <View style={S.card}>
          <Text style={PD.title} numberOfLines={2}>{title}</Text>
          <Text style={PD.price}>{formatPrice(rawPrice)}</Text>
          <View style={PD.metaRow}>
            <View style={PD.metaItem}>
              <Ionicons name="location-outline" size={16} color="#1E7C7E" />
              <Text style={PD.metaTxt} numberOfLines={1}>{location}</Text>
            </View>
            <View style={PD.metaItem}>
              <Ionicons name="storefront-outline" size={16} color="#1E7C7E" />
              <Text style={PD.metaTxt} numberOfLines={1}>{type}</Text>
            </View>
          </View>
          {rating || sellerName ? (
            <View style={PD.metaRow}>
              {rating ? (
                <View style={PD.metaItem}>
                  <Ionicons name="star" size={16} color="#F5A623" />
                  <Text style={PD.metaTxt} numberOfLines={1}>
                    {rating}{reviewCount ? ` (${reviewCount})` : ""}
                  </Text>
                </View>
              ) : null}
              {sellerName ? (
                <View style={PD.metaItem}>
                  <Ionicons name="person-circle-outline" size={16} color="#1E7C7E" />
                  <Text style={PD.metaTxt} numberOfLines={1}>{sellerName}</Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {/* Property Features */}
          {category === "Property" && (beds || baths || area) ? (
            <View style={PD.propertyFeaturesRow}>
              {beds ? (
                <View style={PD.propertyFeature}>
                  <Ionicons name="bed-outline" size={18} color="#1E7C7E" />
                  <Text style={PD.propertyFeatureText}>{beds} Beds</Text>
                </View>
              ) : null}
              {baths ? (
                <View style={PD.propertyFeature}>
                  <Ionicons name="water-outline" size={18} color="#1E7C7E" />
                  <Text style={PD.propertyFeatureText}>{baths} Baths</Text>
                </View>
              ) : null}
              {area ? (
                <View style={PD.propertyFeature}>
                  <Ionicons name="resize-outline" size={18} color="#1E7C7E" />
                  <Text style={PD.propertyFeatureText}>{area}</Text>
                </View>
              ) : null}
            </View>
          ) : null}

          <View style={PD.actionsRow}>
            <TouchableOpacity style={PD.primaryBtn} onPress={handleOpenProduct}>
              <Ionicons name="open-outline" size={20} color="#fff" />
              <Text style={PD.primaryTxt}>{category === "Property" ? "View Listing" : "View Product"}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[PD.secondaryBtn, liked && PD.secondaryBtnActive]}
              onPress={() => toggleLike(itemPayload)}
            >
              <Ionicons name={liked ? "heart" : "heart-outline"} size={20}
                color={liked ? "#FF4B6E" : "#1E7C7E"} />
              <Text style={[PD.secondaryTxt, liked && PD.secondaryTxtActive]}>
                {liked ? "Liked" : "Like"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Description */}
        <View style={[S.card, { marginTop: 12 }]}>
          <Text style={PD.sectionTitle}>Description</Text>
          <Text style={PD.descTxt}>{autoDescription}</Text>
          <View style={PD.chipsRow}>
            {highlights.map((h) => (
              <View key={h} style={PD.chip}>
                <Ionicons name="checkmark-circle" size={14} color="#1E7C7E" />
                <Text style={PD.chipTxt}>{h}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Details */}
        <View style={[S.card, { marginTop: 12, marginBottom: 30 }]}>
          <Text style={PD.sectionTitle}>Details</Text>
          {[
            ["Category", category],
            ["Source", sourceLabel || type],
            ["Availability", postedDate],
            ["Location", location],
            ["Brand", brand],
            ["Seller", sellerName],
          ].map(([l, v]) => (
            v ? <View key={l} style={PD.detailRow}>
              <Text style={PD.detailLabel}>{l}</Text>
              <Text style={PD.detailValue}>{v}</Text>
            </View> : null
          ))}
        </View>
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

// ════════════════════════════════════════════════════════════════════
//  MAIN EXPORT — routes between Job and Product mode
// ════════════════════════════════════════════════════════════════════
export default function ProductDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { addToCart, toggleLike, isLiked } = useCart();

  const id = (params.itemId as string) || (params.id as string) || "";
  const title = (params.title as string) || "Product";
  const rawPrice = (params.price as string) || "";
  const image = (params.image as string) || "";
  const location = (params.location as string) || "Pakistan";
  const type = (params.type as string) || "General";
  const postedDate = (params.postedDate as string) || "";
  const category = (params.category as string) || "All";
  const description = (params.description as string) || "";
  const linkParam = (params.link as string) || "";
  const source = (params.source as string) || "";
  const sourceLabelP = (params.source_label as string) || "";
  const company = (params.company as string) || type;
  const banner = (params.banner as string) || "";
  const rating = (params.rating as string) || "";
  const reviewCount = (params.review_count as string) || "";
  const sellerName = (params.seller_name as string) || "";
  const brand = (params.brand as string) || "";

  // Property specific fields
  const beds = (params.beds as string) || "";
  const baths = (params.baths as string) || "";
  const area = (params.area as string) || "";
  const purpose = (params.purpose as string) || "";
  const propertyType = (params.property_type as string) || "";

  const isJob = category === "Jobs";

  if (isJob) {
    return (
      <JobDetail
        title={title}
        company={company}
        location={location}
        salary={cleanSalary(rawPrice)}
        description={description}
        logo={image}
        applyLink={linkParam}
        source={source}
        sourceLabel={sourceLabelP || SOURCE_LABELS[source] || ""}
        postedDate={postedDate}
        banner={banner}
        onBack={() => router.back()}
        onLike={() => toggleLike({ id, title, price: rawPrice, image, location, type, postedDate, category, banner, link: linkParam, source, source_label: sourceLabelP })}
        liked={isLiked(id)}
      />
    );
  }

  return (
    <ProductDetail
      id={id} title={title} rawPrice={rawPrice} image={image}
      location={location} type={type} postedDate={postedDate}
      category={category} description={description}
      productLink={linkParam} sourceLabel={sourceLabelP} rating={rating}
      reviewCount={reviewCount} sellerName={sellerName} brand={brand}
      onBack={() => router.back()}
      addToCart={addToCart} toggleLike={toggleLike} isLiked={isLiked}
      beds={beds} baths={baths} area={area} purpose={purpose} propertyType={propertyType}
    />
  );
}

// ════════════════════════════════════════════════════════════════════
//  STYLES
// ════════════════════════════════════════════════════════════════════

// Shared
const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F8F9" },
  header: { paddingVertical: 12 },
  headerRow: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", paddingHorizontal: 16
  },
  backBtn: { padding: 4 },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },
  card: {
    backgroundColor: "#fff", borderRadius: 16, padding: 16,
    elevation: 2, shadowColor: "#000", shadowOpacity: 0.06,
    shadowRadius: 8, shadowOffset: { width: 0, height: 2 }
  },
});

// Job Detail
const JD = StyleSheet.create({
  // logo card
  logoCard: {
    backgroundColor: "#fff", borderRadius: 16, alignItems: "center",
    justifyContent: "center", paddingVertical: 32, marginBottom: 12,
    position: "relative", elevation: 2, shadowColor: "#000",
    shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }
  },
  logoImg: { width: 110, height: 110, borderRadius: 14, backgroundColor: "#f4f4f4" },
  avatarBox: { alignItems: "center", justifyContent: "center", borderWidth: 1.5 },
  avatarTxt: { fontWeight: "800" },
  postedBadge: {
    position: "absolute", bottom: 12, left: 12,
    backgroundColor: "rgba(0,0,0,0.55)", borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4,
    flexDirection: "row", alignItems: "center", gap: 4
  },
  postedTxt: { color: "#fff", fontSize: 11, fontWeight: "600" },

  // source badge
  badge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    alignSelf: "flex-start", borderWidth: 1, borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4, marginBottom: 10
  },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeTxt: { fontSize: 11, fontWeight: "700" },

  // text
  jobTitle: { fontSize: 20, fontWeight: "800", color: "#1A1A2E", lineHeight: 26, marginBottom: 4 },
  salaryText: { fontSize: 17, fontWeight: "700", marginBottom: 4 },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#1A1A2E", marginBottom: 10 },
  descPara: { fontSize: 14, color: "#374151", lineHeight: 22, marginBottom: 8 },

  // details
  detailRow: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "flex-start", paddingVertical: 9,
    borderBottomWidth: 1, borderBottomColor: "#F0F0F0"
  },
  detailLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  detailLabel: { fontSize: 13, color: "#6B7280", fontWeight: "600" },
  detailValue: {
    fontSize: 13, color: "#1A1A2E", fontWeight: "700",
    maxWidth: "55%", textAlign: "right"
  },

  // buttons
  btnRow: { flexDirection: "row", gap: 12, marginTop: 4 },
  applyBtn: {
    flex: 1, backgroundColor: "#1E7C7E", paddingVertical: 14,
    borderRadius: 12, flexDirection: "row", alignItems: "center",
    justifyContent: "center", gap: 8
  },
  applyBtnDisabled: { backgroundColor: "#9bb8b8" },
  applyTxt: { color: "#fff", fontSize: 15, fontWeight: "700" },
  saveBtn: {
    flex: 1, backgroundColor: "#EAF6F7", paddingVertical: 14,
    borderRadius: 12, flexDirection: "row", alignItems: "center",
    justifyContent: "center", gap: 8,
    borderWidth: 1.5, borderColor: "#C3E8EA"
  },
  saveBtnLiked: { backgroundColor: "#FFF0F0", borderColor: "#FFB3B3" },
  saveTxt: { fontSize: 15, fontWeight: "700", color: "#1E7C7E" },

  // ext link
  extLink: { alignItems: "center", paddingVertical: 14 },
  extLinkTxt: {
    color: "#1E7C7E", fontSize: 13, fontWeight: "600",
    textDecorationLine: "underline"
  },
});

// Product Detail
const PD = StyleSheet.create({
  imgWrapper: {
    height: 260, borderRadius: 16, overflow: "hidden",
    backgroundColor: "#EAF6F7", marginBottom: 12, position: "relative"
  },
  img: { width: "100%", height: "100%" },
  imgOverlay: { position: "absolute", left: 0, right: 0, bottom: 0, height: 70 },
  imgBadge: {
    position: "absolute", bottom: 10, left: 10,
    backgroundColor: "rgba(0,0,0,0.55)", paddingHorizontal: 8,
    paddingVertical: 4, borderRadius: 8
  },
  imgBadgeTxt: { color: "#fff", fontSize: 12, fontWeight: "600" },

  title: { fontSize: 18, fontWeight: "800", color: "#1F2937", marginBottom: 4 },
  price: { fontSize: 19, fontWeight: "800", color: "#1E7C7E", marginBottom: 12 },
  metaRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 5, flex: 1 },
  metaTxt: { fontSize: 13, color: "#6B7280", flexShrink: 1 },
  actionsRow: { flexDirection: "row", gap: 12, marginTop: 14 },

  propertyFeaturesRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    paddingTop: 12,
  },
  propertyFeature: {
    flex: 1,
    backgroundColor: "#EAF6F7",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  propertyFeatureText: {
    fontSize: 12,
    color: "#1E7C7E",
    fontWeight: "700",
  },

  primaryBtn: {
    flex: 1, backgroundColor: "#1E7C7E", paddingVertical: 14,
    borderRadius: 10, flexDirection: "row", alignItems: "center",
    justifyContent: "center", gap: 8
  },
  primaryTxt: { color: "#fff", fontSize: 15, fontWeight: "700" },
  secondaryBtn: {
    flex: 1, backgroundColor: "#EAF6F7", paddingVertical: 14,
    borderRadius: 10, flexDirection: "row", alignItems: "center",
    justifyContent: "center", gap: 8, borderWidth: 1, borderColor: "#C3E8EA"
  },
  secondaryBtnActive: { backgroundColor: "#FFEFF3", borderColor: "#FFD4DE" },
  secondaryTxt: { color: "#1E7C7E", fontSize: 15, fontWeight: "700" },
  secondaryTxtActive: { color: "#FF4B6E" },

  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#1F2937", marginBottom: 8 },
  descTxt: { fontSize: 14, color: "#374151", lineHeight: 21 },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  chip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "#EAF6F7", borderRadius: 20, paddingHorizontal: 10,
    paddingVertical: 6, borderWidth: 1, borderColor: "#C3E8EA"
  },
  chipTxt: { fontSize: 12, color: "#1E7C7E", fontWeight: "700" },
  detailRow: {
    flexDirection: "row", justifyContent: "space-between",
    paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: "#F0F0F0"
  },
  detailLabel: { fontSize: 13, color: "#6B7280", fontWeight: "600" },
  detailValue: { fontSize: 13, color: "#1F2937", fontWeight: "700" },
});
