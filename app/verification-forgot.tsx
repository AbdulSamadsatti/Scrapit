import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";

export default function VerificationForgotScreen() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/forgot-password");
  }, [router]);

  return (
    <View style={styles.container}>
      <Text style={styles.message}>Redirecting to Forgot Password...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#D8EEF0",
  },
  message: {
    color: "#1E7C7E",
    fontSize: 16,
    textAlign: "center",
    paddingHorizontal: 20,
  },
});
