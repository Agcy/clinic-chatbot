<template>
  <div class="return-button-container" :data-position="position">
    <button 
      @click="handleReturn"
      class="return-button"
      :title="title"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
      <span>{{ text }}</span>
    </button>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';
import axios from 'axios';

const router = useRouter();

// 定义props
const props = defineProps({
  text: {
    type: String,
    default: '返回主页'
  },
  title: {
    type: String,
    default: '返回主页'
  },
  position: {
    type: String,
    default: 'top-right', // top-right, top-left, bottom-right, bottom-left
    validator: (value) => ['top-right', 'top-left', 'bottom-right', 'bottom-left'].includes(value)
  }
});

/**
 * 全面清理对话相关的缓存和状态
 */
const clearAllConversationData = async () => {
  console.log('🧹 开始全面清理对话缓存和状态...');

  try {
    // 1. 清理服务器端conversation_id
    await axios.post("/api/coze-conversation", {
      action: 'clearHistory',
      userId: 'default_user'
    });
    console.log('✅ 服务器端conversation_id已清理');
  } catch (error) {
    console.error('❌ 清理服务器端conversation_id失败:', error);
  }

  // 仅在客户端执行清理操作
  if (process.client) {
    try {
      // 2. 清理localStorage中的场景和对话相关数据
      const keysToRemove = [
        'currentScene',
        'conversationHistory',
        'trainingProgress',
        'evaluationData',
        'userPreferences'
      ];

      keysToRemove.forEach(key => {
        if (localStorage.getItem(key)) {
          localStorage.removeItem(key);
          console.log(`✅ 已清理localStorage: ${key}`);
        }
      });

      // 3. 清理sessionStorage
      sessionStorage.clear();
      console.log('✅ sessionStorage已清理');

      // 4. 清理全局状态和函数
      const globalKeysToClean = [
        'finishTraining',
        'playTalkAnimation',
        'onPhoneIdleStarted',
        'currentSceneCharacter',
        'currentAudioStream',
        'conversationComplete'
      ];

      globalKeysToClean.forEach(key => {
        if (window[key]) {
          delete window[key];
          console.log(`✅ 已清理全局变量: ${key}`);
        }
      });

      // 5. 停止所有可能的音频流
      if (window.currentAudioStream) {
        window.currentAudioStream.getTracks().forEach(track => track.stop());
        window.currentAudioStream = null;
        console.log('✅ 音频流已停止');
      }

      console.log('🎉 对话缓存和状态清理完成');

    } catch (error) {
      console.error('❌ 清理客户端数据时出错:', error);
    }
  }
};

// 处理返回操作
const handleReturn = async () => {
  console.log('🏠 用户点击返回主页按钮');

  // 先清理所有对话相关数据
  await clearAllConversationData();

  // 然后跳转到主页
  router.push('/');
};
</script>

<style scoped>
.return-button-container {
  position: absolute;
  z-index: 30;
}

/* 根据position属性设置位置 */
.return-button-container {
  top: 20px;
  right: 20px;
}

/* 可以通过CSS变量或类名来支持不同位置 */
.return-button-container[data-position="top-left"] {
  top: 20px;
  left: 20px;
  right: auto;
}

.return-button-container[data-position="bottom-right"] {
  bottom: 20px;
  right: 20px;
  top: auto;
}

.return-button-container[data-position="bottom-left"] {
  bottom: 20px;
  left: 20px;
  top: auto;
  right: auto;
}

.return-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 12px;
  color: #1e40af;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  user-select: none;
}

.return-button:hover {
  background: rgba(59, 130, 246, 0.1);
  border-color: #3b82f6;
  transform: translateY(-2px);
  box-shadow: 0 6px 25px rgba(0, 0, 0, 0.15);
}

.return-button:active {
  transform: translateY(0);
}

.return-button svg {
  flex-shrink: 0;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .return-button-container {
    top: 10px;
    right: 10px;
  }
  
  .return-button-container[data-position="top-left"] {
    top: 10px;
    left: 10px;
  }
  
  .return-button-container[data-position="bottom-right"] {
    bottom: 10px;
    right: 10px;
  }
  
  .return-button-container[data-position="bottom-left"] {
    bottom: 10px;
    left: 10px;
  }
  
  .return-button {
    padding: 10px 14px;
    font-size: 13px;
  }
}

@media (max-width: 480px) {
  .return-button span {
    display: none; /* 在小屏幕上只显示图标 */
  }
  
  .return-button {
    padding: 10px;
    border-radius: 50%;
    width: 44px;
    height: 44px;
    justify-content: center;
  }
}
</style> 