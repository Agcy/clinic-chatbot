/**
 * 路由守卫插件 - 处理页面切换时的数据清理
 * 仅在客户端运行
 */

export default defineNuxtPlugin((nuxtApp) => {
  // 仅在客户端运行
  if (process.server) return;

  const router = nuxtApp.$router;

  /**
   * 清理对话相关的缓存数据
   */
  const clearConversationCache = async () => {
    console.log('🧹 路由守卫: 开始清理对话缓存...');
    
    try {
      // 清理服务器端conversation_id
      await $fetch('/api/coze-conversation', {
        method: 'POST',
        body: {
          action: 'clearHistory',
          userId: 'default_user'
        }
      });
      console.log('✅ 路由守卫: 服务器端conversation_id已清理');
    } catch (error) {
      console.error('❌ 路由守卫: 清理服务器端conversation_id失败:', error);
    }
    
    // 清理localStorage中的对话相关数据（保留场景信息）
    const conversationKeys = [
      'conversationHistory',
      'trainingProgress', 
      'evaluationData'
    ];
    
    conversationKeys.forEach(key => {
      if (localStorage.getItem(key)) {
        localStorage.removeItem(key);
        console.log(`✅ 路由守卫: 已清理localStorage: ${key}`);
      }
    });
    
    // 清理全局对话状态
    const globalKeysToClean = [
      'finishTraining',
      'playTalkAnimation',
      'onPhoneIdleStarted', 
      'conversationComplete'
    ];
    
    globalKeysToClean.forEach(key => {
      if (window[key]) {
        delete window[key];
        console.log(`✅ 路由守卫: 已清理全局变量: ${key}`);
      }
    });
    
    console.log('✅ 路由守卫: 对话缓存清理完成');
  };

  /**
   * 判断是否需要清理缓存
   * @param {string} from - 来源路由
   * @param {string} to - 目标路由
   * @returns {boolean}
   */
  const shouldClearCache = (from, to) => {
    // 训练相关页面离开时需要清理
    const trainingPages = [
      '/training',
      '/custom-scene-operation', 
      '/custom-scene-phone'
    ];
    
    // 如果从训练页面离开，需要清理
    if (from && trainingPages.some(page => from.startsWith(page))) {
      return true;
    }
    
    // 如果跳转到主页，需要清理
    if (to === '/') {
      return true;
    }
    
    return false;
  };

  // 添加全局前置守卫
  router.beforeEach(async (to, from) => {
    console.log(`🚦 路由守卫: ${from?.path || 'unknown'} -> ${to.path}`);
    
    // 判断是否需要清理缓存
    if (shouldClearCache(from?.path, to.path)) {
      console.log('🧹 路由守卫: 检测到需要清理缓存的路由切换');
      await clearConversationCache();
    }
    
    return true;
  });

  // 添加全局后置守卫
  router.afterEach((to, from) => {
    console.log(`✅ 路由守卫: 路由切换完成 ${from?.path || 'unknown'} -> ${to.path}`);
  });

  console.log('🚦 路由守卫插件已初始化');
});
