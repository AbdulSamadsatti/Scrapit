import React from "react";
import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import SettingsScreen from "../components/SettingsScreen";

export default function Settings() {
  return (
    <SafeAreaView style={styles.container}>
      <SettingsScreen />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
});
