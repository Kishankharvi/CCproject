import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
   server: {
    proxy: {
      '/get-presigned-url': {
        target: 'http://13.234.114.45:3001', // Your backend port
        changeOrigin: true
      }
    }
  }
});
