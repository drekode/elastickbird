module.exports = {
  globalSetup: "./jest/global-setup.ts",
  globals: {
    ELASTICSEARCH_URL: "http://localhost:9201",
  },
  moduleNameMapper: {
    ".*.(css|less|png|svg)$": "<rootDir>/jest/staticImportStub.js",
  },
  setupFilesAfterEnv: ["<rootDir>/jest/setup.ts"],
  testRegex: ".+.test.(ts|tsx)$",
  transform: {
    ".+.(ts|tsx)$": "ts-jest",
  },
};
