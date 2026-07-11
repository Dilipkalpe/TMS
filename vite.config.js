import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const base = env.VITE_BASE_PATH || '/'
  const isProd = mode === 'production'

  return {
    base,
    plugins: [react(), tailwindcss()],
    build: {
      target: 'es2020',
      sourcemap: false,
      chunkSizeWarningLimit: 600,
      minify: 'esbuild',
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('leaflet') || id.includes('react-leaflet')) return 'maps'
              if (id.includes('react-dom') || id.includes('react-router')) return 'vendor-react'
              return 'vendor'
            }
            if (id.includes('/pages/accounting/')) return 'accounting'
            if (id.includes('/pages/reports/')) return 'reports'
            if (id.includes('/pages/gps/') || id.includes('/pages/routing/')) return 'maps-pages'
            if (id.includes('/pages/booking/') || id.includes('/pages/lr/')) return 'bookings'
            if (id.includes('/pages/customers/') || id.includes('/pages/vendors/')) return 'masters'
            if (id.includes('/pages/vehicles/') || id.includes('/pages/expenses/')) return 'fleet'
            if (id.includes('/pages/settings/')) return 'settings'
            if (id.includes('/pages/portal/')) return 'portal'
            if (id.includes('/pages/Dashboard')) return 'dashboard'
          },
        },
      },
    },
    esbuild: isProd ? { drop: ['console', 'debugger'] } : {},
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: 'http://localhost:5000',
          changeOrigin: true,
        },
      },
    },
  }
})
