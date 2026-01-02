const js = require("@eslint/js");
const { defineConfig } = require("eslint/config");

module.exports = defineConfig([
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "script",
      globals: {
        console: "readonly",
        module: "readonly",
        process: "readonly",
        require: "readonly",
        setInterval: "readonly",
        setTimeout: "readonly"
      }
    }
  }
]);
