import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  resolve: {
    // server-only throws outside the React server build; tests run in Node.
    alias: { "server-only": new URL("./src/test/empty.ts", import.meta.url).pathname },
  },
  test: {
    // Node by default; component tests opt in with `// @vitest-environment jsdom`.
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["./src/test/setup.ts"],
    restoreMocks: true,
    coverage: {
      provider: "v8",
      // Capture screens (RP-4, RP-9). Browser-only I/O is covered by e2e/.
      include: [
        "src/lib/slots.ts",
        "src/lib/photoUrl.ts",
        "src/lib/hourMeter.ts",
        "src/lib/image/geometry.ts",
        "src/lib/capture/**",
        "src/lib/camera/cameraSupport.ts",
        "src/lib/client/**",
        "src/components/**",
        "src/app/checkout/**",
        "src/app/return/**",
      ],
      exclude: ["**/*.test.{ts,tsx}", "**/page.tsx"],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
});
