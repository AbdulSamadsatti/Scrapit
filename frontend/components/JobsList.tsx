/**
 * JobsList.tsx
 * Drop-in jobs list with skeleton loading + empty state.
 * Use inside any ScrollView — it does NOT scroll itself.
 */
import React, { useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from "react-native";
import JobCard, { Job } from "@/components/JobCard";
import RefreshContext from "@/contexts/RefreshContext";
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
  /** Pull-to-refresh callback (optional — context refreshAll is used if omitted) */
  onRefresh?: () => void;
  /**
   * External refreshing state.
   * Renamed from `refreshing` to avoid conflict with context's `refreshing`.
   */
  externalRefreshing?: boolean;
}

// ── Component ─────────────────────────────────────────────────────
const JobsList: React.FC<JobsListProps> = ({
  jobs,
  loading = false,
  emptyMessage,
  headerTitle,
  maxItems,
  onRefresh,
  externalRefreshing = false,   // ← renamed prop (was `refreshing`)
}) => {
  // Pull refreshing + refreshAll from context
  const { refreshing: contextRefreshing, refreshAll } = useContext(RefreshContext);

  // Merge: either the external caller says we're refreshing, or the context says so
  const isRefreshing = externalRefreshing || contextRefreshing;

  const handleRefresh = React.useCallback(async () => {
    try {
      // Always call context refreshAll so DB results update
      await refreshAll();
      // Also call the parent's onRefresh if provided
      if (onRefresh) await onRefresh();
    } catch (e) {
      console.error("Refresh error:", e);
    }
  }, [refreshAll, onRefresh]);

  // ── Loading state — show 3 skeleton cards ──────────────────────
  if (loading) {
    return (
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="transparent"
            colors={["transparent"]}
          />
        }
      >
        {isRefreshing && (
          <View style={S.loaderWrapper}>
            <InfinityLoader color1="#4F63FF" color2="#A78BFA" size={0.6} />
          </View>
        )}
        {headerTitle ? <Text style={S.header}>{headerTitle}</Text> : null}
        <Skeleton />
        <Skeleton />
        <Skeleton />
      </ScrollView>
    );
  }

  const list = maxItems ? jobs.slice(0, maxItems) : jobs;

  if (!list?.length) return <Empty msg={emptyMessage} />;

  // ── Loaded state ───────────────────────────────────────────────
  return (
    <ScrollView
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor="transparent"
          colors={["transparent"]}
        />
      }
    >
      {/* Show InfinityLoader at top while refreshing */}
      {isRefreshing && (
        <View style={S.loaderWrapper}>
          <InfinityLoader color1="#4F63FF" color2="#A78BFA" size={0.6} />
        </View>
      )}

      {headerTitle ? <Text style={S.header}>{headerTitle}</Text> : null}

      {list.map((item, index) => (
        <JobCard
          key={item.job_id || item.id || `${item.title}-${index}`}
          job={item}
        />
      ))}
    </ScrollView>
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