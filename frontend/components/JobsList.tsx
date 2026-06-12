/**
 * JobsList.tsx
 * Drop-in jobs list with skeleton loading + empty state.
 * Renders as flat View (no ScrollView) — must be placed inside a parent ScrollView.
 */
import React from "react";
import {
  View,
  Text,
  StyleSheet,
} from "react-native";
import JobCard, { Job } from "@/components/JobCard";

import InfinityLoader from "@/components/ui/InfinityLoader";

// ── Skeleton loader ───────────────────────────────────────────────
function Skeleton() {
  return (
    <View style={SK.card}>
      <View style={SK.logo} />
      <View style={SK.lines}>
        <View style={[SK.bar, { width: "68%" }]} />
        <View style={[SK.bar, { width: "44%", marginTop: 8 }]} />
        <View style={[SK.bar, { width: "56%", marginTop: 6 }]} />
        <View style={[SK.bar, { width: "32%", marginTop: 6 }]} />
      </View>
    </View>
  );
}
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
  logo: { width: 50, height: 50, borderRadius: 10, backgroundColor: "#EBEBEB" },
  lines: { flex: 1, justifyContent: "center" },
  bar: { height: 11, borderRadius: 6, backgroundColor: "#EBEBEB" },
});

// ── Empty state ───────────────────────────────────────────────────
function Empty({ msg }: { msg?: string }) {
  return (
    <View style={S.empty}>
      <Text style={S.emptyIcon}>🔍</Text>
      <Text style={S.emptyTitle}>No jobs found</Text>
      <Text style={S.emptyMsg}>{msg || "Try a different keyword."}</Text>
    </View>
  );
}

// ── Props ─────────────────────────────────────────────────────────
interface JobsListProps {
  jobs: Job[];
  loading?: boolean;
  emptyMessage?: string;
  /** Section heading shown above the list */
  headerTitle?: string;
  /** Limit visible items (home screen preview mode) */
  maxItems?: number;
  /** Whether data is currently being refreshed (shows loader) */
  refreshing?: boolean;
}

// ── Component ─────────────────────────────────────────────────────
const JobsList: React.FC<JobsListProps> = ({
  jobs,
  loading = false,
  emptyMessage,
  headerTitle,
  maxItems,
  refreshing = false,
}) => {
  // ── Loading state — show 3 skeleton cards ──────────────────────
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

  const list = maxItems ? jobs.slice(0, maxItems) : jobs;

  if (!list?.length) return <Empty msg={emptyMessage} />;

  // ── Loaded state ───────────────────────────────────────────────
  return (
    <View>
      {headerTitle ? <Text style={S.header}>{headerTitle}</Text> : null}

      {list.map((item, index) => (
        <JobCard
          key={item.job_id || item.id || `${item.title}-${index}`}
          job={item}
        />
      ))}
    </View>
  );
};

// ── Styles ─────────────────────────────────────────────────────────
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
  emptyIcon: { fontSize: 34, marginBottom: 10 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#1A1A2E", marginBottom: 6 },
  emptyMsg: { fontSize: 13, color: "#999", textAlign: "center", lineHeight: 20 },
  loaderWrapper: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
  },
});

export default JobsList;