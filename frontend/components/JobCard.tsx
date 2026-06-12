/**
 * JobCard.tsx
 * Professional job listing card — LinkedIn/Indeed/Rozee style.
 * Self-navigates to product-details when pressed.
 */
import React, { useState } from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

// ── Exported Job type — import this in JobsList and other screens ──
export interface Job {
  id?: string;
  job_id?: string;
  title: string;
  company: string;
  location: string;
  salary?: string;
  snippet?: string;
  description?: string;
  logo?: string;
  image?: string;
  thumbnail?: string;
  source?: string;
  source_label?: string;
  posted_at?: string;
  apply_link?: string;
  link?: string;
  direct_url?: string;
  banner?: string;
}

// ── Brand colours per source ──────────────────────────────────────
const SOURCE_COLORS: Record<string, string> = {
  linkedin: "#0A66C2",
  careerokay: "#C8102E",
  google_jobs: "#4285F4",
};

const SOURCE_DISPLAY: Record<string, string> = {
  linkedin: "LinkedIn",
  careerokay: "CareerOkay",
  google_jobs: "Google Jobs",
};

// ── Salary guard ──────────────────────────────────────────────────
function safeSalary(raw?: string): string {
  if (!raw?.trim()) return "";
  const blocked = ["google_jobs", "google", "linkedin", "careerokay", "mustakbil", "n/a", "-"];
  if (blocked.includes(raw.trim().toLowerCase())) return "";
  if (!/\d/.test(raw)) return "";
  return raw.trim();
}

// ── Initials avatar ───────────────────────────────────────────────
// Updated Avatar to accept optional source
function Avatar({ name, source }: { name: string; source?: string }) {
  const color = SOURCE_COLORS[source ?? ""] || "#1E7C7E";
  const initials = (name || "?")
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("") || "?";
  return (
    <View style={[S.avatar, { backgroundColor: color + "18", borderColor: color + "60" }]}> 
      <Text style={[S.avatarTxt, { color }]}>{initials}</Text>
    </View>
  );
}

// Updated Pill to accept optional source
function Pill({ source, label }: { source?: string; label: string }) {
  const c = SOURCE_COLORS[source ?? ""] || "#777";
  return (
    <View style={[S.pill, { backgroundColor: c + "14", borderColor: c + "50" }]}> 
      <View style={[S.dot, { backgroundColor: c }]} />
      <Text style={[S.pillTxt, { color: c }]}>{label}</Text>
    </View>
  );
}

// Updated label computation with safe access

// ── Source pill ───────────────────────────────────────────────────

// ── Main card ─────────────────────────────────────────────────────
export default function JobCard({ job, onPress }: { job: Job; onPress?: () => void }) {
  const router = useRouter();
  const [err, setErr] = useState(false);

  let logoUri = job.logo || job.image || job.thumbnail || "";
  if (logoUri.startsWith("//")) logoUri = "https:" + logoUri;
  const showLogo = !!logoUri && /^https?:/.test(logoUri) && !err;
  const applyLink = job.apply_link || job.link || job.direct_url || "";
  const salary = safeSalary(job.salary);
  const label = job.source_label ?? (job.source ? SOURCE_DISPLAY[job.source] : "");

  function handlePress() {
    if (onPress) { onPress(); return; }
    router.push({
      pathname: "/product-details",
      params: {
        id: job.job_id || job.id || "",
        title: job.title || "",
        price: job.salary || "",
        image: logoUri || "",
        location: job.location || "Pakistan",
        type: job.company || "",
        company: job.company || "",
        postedDate: job.posted_at || "",
        category: "Jobs",
        description: job.description || job.snippet || "",
        link: applyLink || "",
        source: job.source || "",
        source_label: label || "",
        banner: job.banner || "",
      },
    });
  }

  return (
    <TouchableOpacity style={S.card} onPress={handlePress} activeOpacity={0.86}>

      {/* LEFT — logo / avatar */}
      <View style={S.logoCol}>
        {showLogo ? (
          <Image source={{ uri: logoUri }} style={S.logo} resizeMode="contain"
            onError={() => setErr(true)} />
        ) : (
          <Avatar name={job.company || job.title} source={job.source} />
        )}
      </View>

      {/* CENTRE — info */}
      <View style={S.info}>

        {/* title + source pill */}
        <View style={S.row}>
          <Text style={S.title} numberOfLines={2}>{job.title}</Text>
          {label ? <Pill source={job.source} label={label} /> : null}
        </View>

        {/* company */}
        <View style={S.metaRow}>
          <Ionicons name="business-outline" size={12} color="#999" />
          <Text style={S.company} numberOfLines={1}>{job.company || "—"}</Text>
        </View>

        {/* location */}
        <View style={S.metaRow}>
          <Ionicons name="location-outline" size={12} color="#999" />
          <Text style={S.location} numberOfLines={1}>{job.location || "Pakistan"}</Text>
        </View>

        {/* salary */}
        {salary ? <Text style={S.salary}>{salary}</Text> : null}

        {/* snippet */}
        {job.snippet ? (
          <Text style={S.snippet} numberOfLines={2}>{job.snippet}</Text>
        ) : null}

        {/* posted date */}
        {job.posted_at ? (
          <Text style={S.date}>{job.posted_at}</Text>
        ) : null}
      </View>

      {/* RIGHT — chevron */}
      <View style={S.chevronWrap}>
        <View style={S.chevronCircle}>
          <Ionicons name="chevron-forward" size={14} color="#1E7C7E" />
        </View>
      </View>

    </TouchableOpacity>
  );
}

// ── Styles ─────────────────────────────────────────────────────────
const S = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  // logo
  logoCol: { width: 52, paddingTop: 2 },
  logo: { width: 50, height: 50, borderRadius: 10, backgroundColor: "#f0f0f0" },
  avatar: {
    width: 50, height: 50, borderRadius: 10, borderWidth: 1.5,
    alignItems: "center", justifyContent: "center"
  },
  avatarTxt: { fontSize: 16, fontWeight: "800" },
  // info
  info: { flex: 1, gap: 3 },
  row: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "flex-start", gap: 6, marginBottom: 3
  },
  title: { flex: 1, fontSize: 14, fontWeight: "700", color: "#1A1A2E", lineHeight: 20 },
  // pill
  pill: {
    flexDirection: "row", alignItems: "center", gap: 3, borderWidth: 1,
    borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2, flexShrink: 0
  },
  dot: { width: 5, height: 5, borderRadius: 3 },
  pillTxt: { fontSize: 9, fontWeight: "700" },
  // meta
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  company: { fontSize: 12, fontWeight: "600", color: "#1E7C7E", flex: 1 },
  location: { fontSize: 12, color: "#777", flex: 1 },
  salary: { fontSize: 12, fontWeight: "700", color: "#1E7C7E", marginTop: 2 },
  snippet: { fontSize: 11, color: "#999", lineHeight: 16, marginTop: 2 },
  date: { fontSize: 10, color: "#bbb", marginTop: 3 },
  // chevron
  chevronWrap: { justifyContent: "center", paddingTop: 12 },
  chevronCircle: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: "#EAF6F7", alignItems: "center", justifyContent: "center"
  },
});