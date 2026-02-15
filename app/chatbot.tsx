import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";

interface Message {
  id: string;
  text: string;
  sender: "user" | "bot";
  timestamp: Date;
  suggestions?: string[];
}

export default function ChatbotScreen() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Hello! I am ScrapBot. How can I assist you with your search today?",
      sender: "bot",
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [serverIp, setServerIp] = useState("10.18.220.102");
  const [serverPort, setServerPort] = useState("8000");
  const flatListRef = useRef<FlatList>(null);

  const handleSuggestionPress = (suggestion: string) => {
    sendMessage(suggestion);
  };

  const testConnection = async () => {
    setIsLoading(true);
    const apiUrl = `http://${serverIp}:${serverPort}/chat`;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      // Try with a simple POST or GET if OPTIONS is not supported
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "ping" }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.ok || response.status === 405 || response.status === 422) {
        // 405 Method Not Allowed or 422 Unprocessable Entity often means the endpoint exists
        const successMsg: Message = {
          id: Date.now().toString(),
          text: `✅ Connection Successful to ${apiUrl}!`,
          sender: "bot",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, successMsg]);
        setShowConfig(false);
      } else {
        throw new Error(`Status: ${response.status}`);
      }
    } catch (error) {
      console.error("Connection failed:", error);
      const failMsg: Message = {
        id: Date.now().toString(),
        text: `❌ Connection Failed to ${apiUrl}. Check if your FastAPI server is running with --host 0.0.0.0 and your IP is correct.`,
        sender: "bot",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, failMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async (overrideText?: string) => {
    const textToSend =
      typeof overrideText === "string"
        ? overrideText
        : typeof inputText === "string"
          ? inputText
          : "";

    if (!textToSend || textToSend.trim() === "" || isLoading) return;

    const trimmedText = textToSend.trim();

    const userMessage: Message = {
      id: Date.now().toString(),
      text: trimmedText,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (typeof overrideText !== "string") setInputText("");
    setIsLoading(true);

    try {
      const apiUrl = `http://${serverIp}:${serverPort}/chat`;

      console.log(`Attempting to connect to chatbot at: ${apiUrl}`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      try {
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: trimmedText,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`Server error: ${response.status}`);
        }

        const data = await response.json();

        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          text:
            data.reply ||
            "Sorry, I couldn't understand that response from the server.",
          sender: "bot",
          timestamp: new Date(),
          suggestions: data.suggestions || [],
        };

        setMessages((prev) => [...prev, botMessage]);
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        throw fetchError;
      }
    } catch (error: any) {
      console.error("Chatbot Error:", error);
      let errorMessageText = "⚠️ Connection Error\n\n";

      if (error.name === "AbortError") {
        errorMessageText += `The request timed out (12s). The server at ${serverIp}:${serverPort} is taking too long to respond.`;
      } else {
        errorMessageText += `Could not connect to ScrapBot server at ${serverIp}:${serverPort}`;
      }

      errorMessageText +=
        "\n\nHow to fix this:\n" +
        "1. Ensure your FastAPI server is running (`uvicorn main:app --reload`)\n" +
        `2. Check if your laptop IP is still ${serverIp}\n` +
        "3. Make sure your laptop and mobile are on the SAME Wi-Fi.\n" +
        `4. Run your server with: \`uvicorn main:app --host 0.0.0.0 --port ${serverPort}\``;

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: errorMessageText,
        sender: "bot",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (flatListRef.current) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const renderMessage = ({ item }: { item: Message }) => (
    <View style={styles.messageWrapper}>
      <View
        style={[
          styles.messageContainer,
          item.sender === "user" ? styles.userMessage : styles.botMessage,
        ]}
      >
        <Text
          style={[
            styles.messageText,
            item.sender === "user"
              ? styles.userMessageText
              : styles.botMessageText,
          ]}
        >
          {item.text}
        </Text>
        <Text
          style={[
            styles.timestamp,
            item.sender === "user"
              ? { color: "rgba(255, 255, 255, 0.7)" }
              : { color: "rgba(0, 0, 0, 0.4)" },
          ]}
        >
          {item.timestamp.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>
      </View>

      {item.suggestions &&
        item.suggestions.length > 0 &&
        item.sender === "bot" && (
          <View style={styles.suggestionsContainer}>
            {item.suggestions.map((suggestion, idx) => (
              <TouchableOpacity
                key={`${item.id}-sug-${idx}`}
                style={styles.suggestionBubble}
                onPress={() => handleSuggestionPress(suggestion)}
              >
                <Text style={styles.suggestionText}>{suggestion}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={["#063537", "#0D5A5B", "#1E7C7E", "#2D9294"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>ScrapBot Assistant</Text>
          <View style={styles.onlineIndicatorContainer}>
            <View style={styles.onlineDot} />
            <Text style={styles.onlineText}>Active</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => setShowConfig(!showConfig)}
        >
          <Ionicons name="settings-outline" size={24} color="white" />
        </TouchableOpacity>
      </LinearGradient>

      {showConfig && (
        <View style={styles.configPanel}>
          <Text style={styles.configTitle}>Server Settings</Text>
          <View style={styles.configInputRow}>
            <View style={{ flex: 2 }}>
              <Text style={styles.configLabel}>IP Address</Text>
              <TextInput
                style={styles.configInput}
                value={serverIp}
                onChangeText={setServerIp}
                placeholder="10.0.2.2"
              />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.configLabel}>Port</Text>
              <TextInput
                style={styles.configInput}
                value={serverPort}
                onChangeText={setServerPort}
                keyboardType="numeric"
                placeholder="8000"
              />
            </View>
          </View>
          <TouchableOpacity
            style={styles.testButton}
            onPress={testConnection}
            disabled={isLoading}
          >
            <Text style={styles.testButtonText}>
              {isLoading ? "Testing..." : "Test Connection"}
            </Text>
          </TouchableOpacity>
          <Text style={styles.configNote}>
            * Emulator: 10.0.2.2 | Real Device: Your PC's Local IP
          </Text>
        </View>
      )}

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: true })
        }
      />

      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#1E7C7E" />
          <Text style={styles.loadingText}>ScrapBot is thinking...</Text>
        </View>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Ask ScrapBot anything..."
            value={inputText}
            onChangeText={setInputText}
            multiline
            editable={!isLoading}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (isLoading || inputText.trim() === "") && { opacity: 0.6 },
            ]}
            onPress={() => sendMessage()}
            disabled={isLoading || inputText.trim() === ""}
          >
            <LinearGradient
              colors={["#063537", "#1E7C7E"]}
              style={styles.sendButtonGradient}
            >
              <Ionicons name="send" size={20} color="white" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F8F9",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    paddingTop: Platform.OS === "android" ? 45 : 16,
  },
  backButton: {
    padding: 4,
  },
  headerTitleContainer: {
    marginLeft: 16,
    flex: 1,
  },
  headerTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
  },
  settingsButton: {
    padding: 4,
  },
  configPanel: {
    backgroundColor: "white",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  configTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  configInputRow: {
    flexDirection: "row",
    marginBottom: 12,
  },
  configLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  configInput: {
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 8,
    padding: 8,
    fontSize: 14,
    backgroundColor: "#F9F9F9",
  },
  testButton: {
    backgroundColor: "#1E7C7E",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  testButtonText: {
    color: "white",
    fontWeight: "600",
  },
  messageWrapper: {
    marginBottom: 8,
  },
  suggestionsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    marginTop: 4,
    marginBottom: 8,
  },
  suggestionBubble: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#1E7C7E",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  suggestionText: {
    color: "#1E7C7E",
    fontSize: 12,
    fontWeight: "500",
  },
  configNote: {
    fontSize: 11,
    color: "#999",
    marginTop: 8,
    textAlign: "center",
  },
  onlineIndicatorContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#4CAF50",
    marginRight: 4,
  },
  onlineText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 12,
  },
  messageList: {
    padding: 16,
    paddingBottom: 20,
  },
  messageContainer: {
    maxWidth: "80%",
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
  },
  userMessage: {
    alignSelf: "flex-end",
    backgroundColor: "#1E7C7E",
    borderBottomRightRadius: 4,
  },
  botMessage: {
    alignSelf: "flex-start",
    backgroundColor: "white",
    borderBottomLeftRadius: 4,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  userMessageText: {
    color: "white",
  },
  botMessageText: {
    color: "#333",
  },
  timestamp: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: "flex-end",
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 12,
    color: "#666",
    fontStyle: "italic",
  },
  inputContainer: {
    flexDirection: "row",
    padding: 12,
    backgroundColor: "white",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#EEE",
  },
  input: {
    flex: 1,
    backgroundColor: "#F5F8F9",
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    fontSize: 15,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: "hidden",
  },
  sendButtonGradient: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
});
