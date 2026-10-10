import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    // server-only throws outside the React server build; tests run in Node.
    alias: { "server-only": new URL("./src/test/empty.ts", import.meta.url).pathname },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
