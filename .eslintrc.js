module.exports = {
    extends: [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended",
        "plugin:@typescript-eslint/recommended-requiring-type-checking",
        "plugin:@typescript-eslint/strict",
    ],
    rules: {
        // What's the point of string interpolation if you use this rule?
        "@typescript-eslint/restrict-template-expressions": "off",

        // This rule doesn't seem to work well with @typescript-eslint/no-non-null-assertion
        "@typescript-eslint/non-nullable-type-assertion-style": "off",
    },
    parser: "@typescript-eslint/parser",
    plugins: ["@typescript-eslint"],
    root: true,
    parserOptions: {
        project: "./tsconfig.json",
    }
}