// https://nuxt.com/docs/api/configuration/nuxt-config
import { defineNuxtConfig } from 'nuxt/config';
import type { Nitro } from 'nitropack';

export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  logLevel: 'info',
  runtimeConfig: {
    // 仅在服务器端可用的私有密钥
    tencentSecretId: process.env.TENCENT_SCERET_ID,
    tencentSecretKey: process.env.TENCENT_SCERET_KEY,
    mongodbUri: process.env.MONGODB_URI_NEW,
    
    // 可以暴露给客户端的公共配置
    public: {
      cosBaseUrl: 'https://ccts-1312877935.cos.ap-hongkong.myqcloud.com'
    }
  },
  hooks: {
    'nitro:init': (nitro: Nitro) => {
      // 设置MongoDB连接字符串环境变量
      if (!process.env.MONGODB_URI_NEW) {
        process.env.MONGODB_URI_NEW = 'mongodb://root:cjh13862968098@129.204.5.155:27017/ccts?authSource=admin';
      }
    }
  },
  modules: [
    '@nuxtjs/tailwindcss'
  ],
  // 添加路由规则
  routeRules: {
    '/.well-known/**': { 
      redirect: '/'
    }
  },
  // 配置 nitro
  nitro: {
    // 已移除devProxy，因为不再需要本地模型代理
  }
})
