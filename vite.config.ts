import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// base './' + HashRouter => works on GitHub Pages (any repo name), Vercel and file hosting
export default defineConfig({ base: './', plugins: [react(), tailwindcss()],
  // host: true — слушать и IPv4, и IPv6 (иначе localhost в Edge/Chrome может не открыться)
  server: { host: true, port: 5180, strictPort: true },
})
