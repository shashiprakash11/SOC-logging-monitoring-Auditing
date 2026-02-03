module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["<rootDir>/tests/**/*.test.ts"],
  modulePathIgnorePatterns: ["<rootDir>/frontend"],
  globals: {
    "ts-jest": {
      tsconfig: "<rootDir>/backend/tsconfig.json"
    }
  }
};
