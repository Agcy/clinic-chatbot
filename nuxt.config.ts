// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  runtimeConfig: {
    googleApiKey: process.env.GOOGLE_API_KEY, // 让 Nuxt 访问 API Key
  },
  hooks: {
    'nitro:init': (nitro) => {
      process.env.GOOGLE_APPLICATION_CREDENTIALS = '/Users/lianghaopeng/work/clinic-chat-app/assets/gmail-login-421617-f23ce8ba70b9.json';
    }
  },
  modules: [
    '@nuxtjs/tailwindcss'
  ]
})
