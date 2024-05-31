import type { Config } from "@jest/types"
// Sync object
const config: Config.InitialOptions = {
  verbose: true,
  transform: {
    "^.+\\.tsx?$": "ts-jest",
  },
  coveragePathIgnorePatterns: ["/src/config/", "/src/blockchain.ts"],
}

export default config
