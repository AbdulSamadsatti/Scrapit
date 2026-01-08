import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
});

export default [
  ...compat.extends("expo"),
  {
    rules: {
      // Add any specific rules here
    },
  },
];
