

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  server: {
    proxy: {
      // Any request starting with /artverse goes to your backend
      "/artverse": {
        target: "http://localhost:8080",  // your backend port
        changeOrigin: true,               // required for the proxy to work
      },
    },
  },
});
