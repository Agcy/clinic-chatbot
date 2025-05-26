// https://nuxt.com/docs/api/configuration/nuxt-config
import path from 'path';
import { defineNuxtConfig } from 'nuxt/config';
import type { Nitro } from 'nitropack';

export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  logLevel: 'info',
  runtimeConfig: {
    googleApiKey: process.env.GOOGLE_API_KEY, // 让 Nuxt 访问 API Key
    mongodbUri: process.env.MONGODB_URI_NEW
  },
  hooks: {
    'nitro:init': (nitro: Nitro) => {
      process.env.GOOGLE_APPLICATION_CREDENTIALS = path.resolve(process.cwd(), 'assets/gmail-login-421617-f23ce8ba70b9.json');
      // 设置MongoDB连接字符串环境变量
      if (!process.env.MONGODB_URI_NEW) {
        process.env.MONGODB_URI_NEW = 'mongodb://root:cjh13862968098@129.204.5.155:27017/ccts?authSource=admin';
      }
    }
  },
  modules: [
    '@nuxtjs/tailwindcss'
  ]
})
