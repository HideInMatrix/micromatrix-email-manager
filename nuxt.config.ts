import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2026-07-05',
  devtools: { enabled: true },
  future: {
    compatibilityVersion: 4
  },
  css: ['~/assets/css/main.css'],
  vite: {
    plugins: [tailwindcss()]
  },
  runtimeConfig: {
    siteUrl: '',
    adminEmail: '',
    adminPassword: '',
    tokenEncryptionKey: '',
    public: {
      appName: 'micromatrix-email-manager'
    }
  }
})
