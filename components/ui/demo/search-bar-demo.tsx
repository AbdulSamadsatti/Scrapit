import React, { useState } from "react";
import { View, StyleSheet, Text } from "react-native";
import { SearchBar } from "../search-bar";

export const SearchBarDemo = () => {
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSearch = (text: string) => {
    setSearch(text);
    if (text.length > 0) {
      setLoading(true);
      setTimeout(() => setLoading(false), 1500);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Search Bar Demo</Text>
      
      <View style={styles.section}>
        <Text style={styles.label}>Default Search Bar</Text>
        <SearchBar
          value={search}
          onChangeText={handleSearch}
          isLoading={loading}
          placeholder="Search items..."
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Custom Placeholder</Text>
        <SearchBar
          placeholder="Search jobs, property..."
          containerStyle={styles.customStyle}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: "#F8F9FA",
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#1E7C7E",
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
    fontWeight: "500",
  },
  customStyle: {
    backgroundColor: "#EAF6F7",
    borderColor: "#9AC6C8",
  },
});
