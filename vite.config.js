import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
   server: {
    proxy: {
      '/get-presigned-url': {
        target: 'https://13.127.253.123:3001', // Your backend port
        changeOrigin: true
      }
    }
  }
});
