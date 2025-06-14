// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  
  // 网页标题和图标配置
  app: {
    head: {
      title: '医疗培训聊天机器人',
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/medical_mask.svg' }
      ]
    }
  },
  
  runtimeConfig: {
    // 可以暴露给客户端的公共配置
    public: {
      cosBaseUrl: 'https://ccts-1312877935.cos.ap-hongkong.myqcloud.com'
    }
  },
  
  modules: [
    '@nuxtjs/tailwindcss'
  ],
  
  // 解决Three.js服务器端渲染问题
  build: {
    transpile: ['three']
  },
  
  // 添加路由规则
  routeRules: {
    '/.well-known/**': { 
      redirect: '/'
    }
  },
  
  // Vite配置 - 解决Three.js导入问题
  vite: {
    optimizeDeps: {
      include: [
        'three',
        'three/examples/jsm/loaders/GLTFLoader',
        'three/examples/jsm/loaders/FBXLoader',
        'three/examples/jsm/loaders/DRACOLoader',
        'three/examples/jsm/controls/OrbitControls'
      ]
    },
    ssr: {
      noExternal: ['three']
    }
  }
})
