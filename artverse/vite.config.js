import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  // Only used by "npm run dev". Requests that start with /artverse are sent to the backend,
  // so the frontend never has to deal with CORS while developing.
  // The port must match PORT in backend/.env.
  server: {
    proxy: {
      "/artverse": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
    },
  },
});
