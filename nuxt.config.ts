// https://nuxt.com/docs/api/configuration/nuxt-config
import path from 'path';

export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  logLevel: 'info',
  runtimeConfig: {
    googleApiKey: process.env.GOOGLE_API_KEY, // 让 Nuxt 访问 API Key
  },
  hooks: {
    'nitro:init': (nitro) => {
      process.env.GOOGLE_APPLICATION_CREDENTIALS = path.resolve(process.cwd(), 'assets/gmail-login-421617-f23ce8ba70b9.json');
    }
  },
  modules: [
    '@nuxtjs/tailwindcss'
  ],
  payload: {
    // 自定义序列化处理
    stringify: (value: any) => {
      try {
        return JSON.stringify(value);
      } catch {
        return '[Unserializable Value]';
      }
    }
  }
})
