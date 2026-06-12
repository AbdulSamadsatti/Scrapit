export const getBaseUrl = (): string => {
  // Use BACKEND_URL env var if set, otherwise default to local network IP for Expo
  const baseUrl = process.env.BACKEND_URL || "http://192.168.0.101:8000";
  return baseUrl;
};
