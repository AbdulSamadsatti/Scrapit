import React from "react";
import { View, Text, Image, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

export type Job = {
  title: string;
  company: string;
  location: string;
  thumbnail?: string;
  apply_options?: any[];
  source?: string;
  job_id?: string;
  description?: string;
  link?: string;
};

const resolveImage = (u?: string, companyName?: string) =>
  u && /^https?:/.test(u)
    ? u
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(companyName || "Job")}&background=random&size=128&color=fff&bold=true`;

const JobCard: React.FC<{ job: Job }> = ({ job }) => {
  const router = useRouter();

  const handlePress = () => {
    router.push({
      pathname: "/product-details",
      params: {
        itemId: job.job_id || Math.random().toString(),
        category: "Jobs",
        title: job.title,
        price: job.source || "Apply Now",
        image: resolveImage(job.thumbnail, job.company),
        location: job.location,
        type: job.company,
        postedDate: "Recently",
        description: job.description || `This is a job opening for ${job.title} at ${job.company} located in ${job.location}. Sourced from ${job.source}.`,
        link: job.link || ""
      },
    });
  };

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={handlePress}
      style={styles.card}
    >
      <View style={styles.imageWrapper}>
        <Image
          source={{ uri: resolveImage(job.thumbnail, job.company) }}
          style={styles.image}
          resizeMode="cover"
        />
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{job.source || "Job"}</Text>
        </View>
      </View>
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>
          {job.title}
        </Text>
        <Text style={styles.company} numberOfLines={1}>
          {job.company}
        </Text>
        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={14} color="#666" />
          <Text style={styles.locationText} numberOfLines={1}>
            {job.location}
          </Text>
        </View>
      </View>
      <View style={styles.action}>
        <View style={styles.iconButton}>
          <Ionicons name="chevron-forward" size={20} color="#1E7C7E" />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    alignItems: "center",
  },
  imageWrapper: {
    width: 80,
    height: 80,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#F5F8F9",
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  badge: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingVertical: 2,
    alignItems: "center",
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  info: {
    flex: 1,
    marginLeft: 16,
    justifyContent: "center",
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1F2937",
    marginBottom: 4,
  },
  company: {
    fontSize: 14,
    color: "#1E7C7E",
    fontWeight: "600",
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  locationText: {
    fontSize: 13,
    color: "#6B7280",
    flex: 1,
  },
  action: {
    paddingLeft: 12,
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#EAF6F7",
    alignItems: "center",
    justifyContent: "center",
  },
});

export default JobCard;
