import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import InfinityLoader from "@/components/ui/InfinityLoader";

type AppLoadingContextValue = {
  isLoading: boolean;
  message: string;
  showLoader: (message?: string) => void;
  hideLoader: () => void;
  runWithLoader: <T,>(task: () => Promise<T>, message?: string) => Promise<T>;
};

const AppLoadingContext = createContext<AppLoadingContextValue | null>(null);

export function AppLoadingProvider({ children }: { children: ReactNode }) {
  const [loadingCount, setLoadingCount] = useState(0);
  const [message, setMessage] = useState("Loading...");
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const isVisible = loadingCount > 0;

  // Smooth fade in/out using native driver
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: isVisible ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [isVisible, fadeAnim]);

  const showLoader = useCallback((nextMessage = "Loading...") => {
    setMessage(nextMessage);
    setLoadingCount((count) => count + 1);
  }, []);

  const hideLoader = useCallback(() => {
    setLoadingCount((count) => Math.max(0, count - 1));
  }, []);

  const runWithLoader = useCallback(
    async <T,>(task: () => Promise<T>, nextMessage = "Loading...") => {
      showLoader(nextMessage);
      try {
        return await task();
      } finally {
        hideLoader();
      }
    },
    [showLoader, hideLoader]
  );

  const value = useMemo(
    () => ({
      isLoading: loadingCount > 0,
      message,
      showLoader,
      hideLoader,
      runWithLoader,
    }),
    [loadingCount, message, showLoader, hideLoader, runWithLoader]
  );

  return (
    <AppLoadingContext.Provider value={value}>
      {children}

      {/* Always render but animate opacity for smooth transitions */}
      <Animated.View
        style={[styles.overlay, { opacity: fadeAnim }]}
        pointerEvents={isVisible ? "auto" : "none"}
      >
        <InfinityLoader color1="#4F63FF" color2="#A78BFA" size={0.9} />
      </Animated.View>
    </AppLoadingContext.Provider>
  );
}

export function useAppLoading() {
  const ctx = useContext(AppLoadingContext);
  if (!ctx) {
    throw new Error("useAppLoading must be used inside AppLoadingProvider");
  }
  return ctx;
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 9999,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    marginTop: 12,
    color: "#1A1A2E",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
});
