import Constants from "expo-constants";
import { Platform } from "react-native";

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

export function getApiBaseUrl() {
  const configuredUrl = process.env.EXPO_PUBLIC_API_URL;
  if (configuredUrl) return trimTrailingSlash(configuredUrl);

  if (Platform.OS === "web") {
    return "http://127.0.0.1:8000";
  }

  const constantsAny = Constants as any;
  const hostUri =
    Constants.expoConfig?.hostUri ||
    constantsAny.manifest?.debuggerHost ||
    constantsAny.manifest2?.extra?.expoClient?.hostUri;
  const host = typeof hostUri === "string" ? hostUri.split(":")[0] : "";

  return host ? `http://${host}:8000` : "http://127.0.0.1:8000";
}
