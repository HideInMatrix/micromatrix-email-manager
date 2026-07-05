export default defineNuxtConfig({
  compatibilityDate: '2026-07-05',
  devtools: { enabled: true },
  future: {
    compatibilityVersion: 4
  },
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    siteUrl: process.env.SITE_URL || '',
    adminEmail: process.env.ADMIN_EMAIL || '',
    adminPassword: process.env.ADMIN_PASSWORD || '',
    tokenEncryptionKey: process.env.TOKEN_ENCRYPTION_KEY || '',
    public: {
      appName: 'micromatrix-email-manager'
    }
  }
})
