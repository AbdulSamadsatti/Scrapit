import React, { useRef } from "react";
import {
  View,
  Text,
  Image,
  Dimensions,
  StyleSheet,
  Animated,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const ITEM_WIDTH = SCREEN_WIDTH * 0.72;
const ITEM_SPACING = (SCREEN_WIDTH - ITEM_WIDTH) / 2;
const CARD_HEIGHT = 220;

interface CarouselItem {
  id: string;
  title: string;
  image: string;
  subtitle?: string;
}

interface Carousel3DProps {
  data: CarouselItem[];
}

export default function Carousel3D({ data }: Carousel3DProps) {
  const scrollX = useRef(new Animated.Value(0)).current;

  if (!data || data.length === 0) return null;

  return (
    <View style={styles.container}>
      <Animated.FlatList
        data={data}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.flatListContent}
        snapToInterval={ITEM_WIDTH}
        decelerationRate={0.991}
        snapToAlignment="center"
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        renderItem={({ item, index }) => {
          const inputRange = [
            (index - 1) * ITEM_WIDTH,
            index * ITEM_WIDTH,
            (index + 1) * ITEM_WIDTH,
          ];

          const scale = scrollX.interpolate({
            inputRange,
            outputRange: [0.9, 1, 0.9],
            extrapolate: "clamp",
          });

          const rotateY = scrollX.interpolate({
            inputRange,
            outputRange: ["35deg", "0deg", "-35deg"],
            extrapolate: "clamp",
          });

          const translateX = scrollX.interpolate({
            inputRange,
            outputRange: [20, 0, -20],
            extrapolate: "clamp",
          });

          const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.8, 1, 0.8],
            extrapolate: "clamp",
          });

          const translateY = scrollX.interpolate({
            inputRange,
            outputRange: [10, 0, 10],
            extrapolate: "clamp",
          });

          return (
            <View style={styles.itemWrapper}>
              {/* Main Card */}
              <Animated.View
                style={[
                  styles.card,
                  {
                    opacity,
                    transform: [
                      { perspective: 1000 },
                      { scale },
                      { rotateY },
                      { translateX },
                      { translateY },
                    ],
                  },
                ]}
              >
                <View style={styles.imageContainer}>
                  <Image
                    source={{ uri: item.image }}
                    style={styles.cardImage}
                    resizeMode="cover"
                  />
                  <LinearGradient
                    colors={["transparent", "rgba(0, 0, 0, 0.8)"]}
                    style={styles.gradient}
                  />
                  <View style={styles.content}>
                    <Text style={styles.title} numberOfLines={1}>
                      {item.title}
                    </Text>
                    {item.subtitle && (
                      <Text style={styles.subtitle} numberOfLines={1}>
                        {item.subtitle}
                      </Text>
                    )}
                  </View>
                </View>
              </Animated.View>
            </View>
          );
        }}
      />

      {/* Pagination Dots */}
      <View style={styles.pagination}>
        {data.map((_, index) => {
          const inputRange = [
            (index - 1) * ITEM_WIDTH,
            index * ITEM_WIDTH,
            (index + 1) * ITEM_WIDTH,
          ];

          const scaleX = scrollX.interpolate({
            inputRange,
            outputRange: [1, 2.5, 1],
            extrapolate: "clamp",
          });

          const dotOpacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.3, 1, 0.3],
            extrapolate: "clamp",
          });

          return (
            <Animated.View
              key={index}
              style={[
                styles.dot,
                {
                  opacity: dotOpacity,
                  transform: [{ scaleX }],
                },
              ]}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 20,
    backgroundColor: "transparent",
  },
  flatListContent: {
    paddingHorizontal: ITEM_SPACING,
    paddingBottom: 5,
  },
  itemWrapper: {
    width: ITEM_WIDTH,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    width: ITEM_WIDTH - 20,
    height: CARD_HEIGHT,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#fff",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  imageContainer: {
    flex: 1,
    position: "relative",
  },
  cardImage: {
    width: "100%",
    height: "100%",
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
  },
  title: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  subtitle: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    fontWeight: "500",
    marginTop: 4,
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 15,
    marginBottom: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#1E7C7E",
    marginHorizontal: 3,
  },
});
