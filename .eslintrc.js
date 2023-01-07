module.exports = {
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "plugin:@typescript-eslint/strict",
    "prettier",
  ],
  rules: {
    // This rule doesn't seem to work well with @typescript-eslint/no-non-null-assertion
    "@typescript-eslint/non-nullable-type-assertion-style": "off",
  },
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  root: true,
  parserOptions: {
    project: "./tsconfig.json",
  },
}
