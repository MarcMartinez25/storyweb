import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5175,
    strictPort: true,
    // The Express + SQLite API runs separately in dev (npm run dev starts both).
    proxy: { '/api': 'http://localhost:3001' },
  },
})
