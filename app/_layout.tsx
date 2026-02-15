import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import "react-native-reanimated";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { CartProvider } from "@/contexts/CartContext";
export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <CartProvider>
        <NavigationThemeProvider
          value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
        >
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="log-in" />
            <Stack.Screen name="sign-up" />
            <Stack.Screen name="verification" />
            <Stack.Screen name="forgot-password" />
            <Stack.Screen name="verification-forgot" />
            <Stack.Screen name="reset-password" />
            <Stack.Screen name="home" />
            <Stack.Screen name="category-details" />
            <Stack.Screen name="cart" />
            <Stack.Screen name="product-details" />
            <Stack.Screen name="liked" />
            <Stack.Screen name="settings" />
            <Stack.Screen name="chatbot" />
          </Stack>
          <StatusBar style="auto" />
        </NavigationThemeProvider>
      </CartProvider>
    </GestureHandlerRootView>
  );
}
