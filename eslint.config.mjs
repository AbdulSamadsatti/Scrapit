import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
});

export default [
  ...compat.extends("expo"),
  {
    rules: {
      "import/no-unresolved": "off",
    },
  },
];
