module.exports = {
  globalSetup: "./jest/global-setup.ts",
  moduleNameMapper: {
    ".*.(css|less|png|svg)$": "<rootDir>/jest/staticImportStub.js",
  },
  setupFilesAfterEnv: ["<rootDir>/jest/setup.ts"],
  testRegex: ".+.test.(ts|tsx)$",
  transform: {
    ".+.(ts|tsx)$": "ts-jest",
  },
};
