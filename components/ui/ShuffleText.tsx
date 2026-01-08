import React, { useEffect, useRef, useState } from "react";
import { Text, TextStyle } from "react-native";

interface ShuffleTextProps {
  text: string;
  delay?: number;
  style?: TextStyle | TextStyle[];
}

export const ShuffleText = ({
  text,
  delay = 0,
  style = {},
}: ShuffleTextProps) => {
  const [displayText, setDisplayText] = useState(text.split("").map(() => " "));
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ@#$%&*";
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      let iteration = 0;
      const totalSteps = text.length;

      intervalRef.current = setInterval(() => {
        setDisplayText(() =>
          text.split("").map((letter, index) => {
            if (letter === " " || letter === "\n") return letter;
            if (index < iteration) return text[index];
            return chars[Math.floor(Math.random() * chars.length)];
          })
        );

        iteration += 0.5;

        if (iteration >= totalSteps) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setDisplayText(text.split(""));
        }
      }, 25);
    }, delay);

    return () => {
      clearTimeout(timeout);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [text, delay]);

  return <Text style={style}>{displayText.join("")}</Text>;
};
