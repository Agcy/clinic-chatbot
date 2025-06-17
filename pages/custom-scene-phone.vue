<!-- 自定义电话场景页面 -->
<template>
  <div class="chat-container">
    <!-- 3D场景背景 -->
    <div class="scene-background">
      <CustomScenePhoneLoader />
    </div>
    
    <!-- 加载状态 -->
    <div v-if="isLoading" class="loading-scene">
      <div class="loading-spinner"></div>
      <p>正在加载电话场景...</p>
    </div>
    
    <!-- 左上角场景提示卡片 -->
    <div class="prompt-card-container" :class="{ collapsed: isPromptCollapsed }">
      <div class="prompt-card">
        <div class="prompt-card-header" @click="togglePromptCard">
          <h3 class="prompt-card-title">{{ isPromptCollapsed ? '场景信息' : '电话场景训练' }}</h3>
          <span class="prompt-card-toggle">{{ isPromptCollapsed ? '▼' : '▲' }}</span>
        </div>
        <div v-if="!isPromptCollapsed" class="prompt-card-content">
          <div class="prompt-card-role">
            <span>您的角色:</span> {{ currentScene?.trainee_character || '医生' }}
          </div>
          <div class="prompt-card-description">
            {{ currentScene?.scene_description_charactor || '在这个电话场景中，您需要与患者或同事进行电话沟通。请根据情况做出适当的回应。' }}
          </div>
        </div>
      </div>
    </div>
    
    <!-- 右下角聊天框 -->
    <div class="chat-box-container">
      <ChatBoxComponent 
        v-if="currentScene"
        :scene="currentScene"
        :is-training="true"
        @training-complete="handleTrainingComplete"
      />
    </div>
    
    <!-- 右上角返回按钮 -->
    <ReturnHomeButton />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import CustomScenePhoneLoader from '~/components/CustomScenePhoneLoader.vue';
import ChatBoxComponent from '~/components/ChatBoxComponent.vue';
import ReturnHomeButton from '~/components/ReturnHomeButton.vue';

const router = useRouter();
const route = useRoute();

// 响应式数据
const isLoading = ref(true);
const currentScene = ref(null);
const isPromptCollapsed = ref(false);

/**
 * 切换提示卡片的展开/收起状态
 */
const togglePromptCard = () => {
  isPromptCollapsed.value = !isPromptCollapsed.value;
};

/**
 * 初始化场景数据
 */
const initializeScene = () => {
  console.log('🎬 初始化电话场景...');
  
  // 从localStorage获取场景数据
  const sceneData = localStorage.getItem('currentScene');
  if (sceneData) {
    try {
      currentScene.value = JSON.parse(sceneData);
      console.log('✅ 场景数据加载成功:', currentScene.value);
    } catch (error) {
      console.error('❌ 解析场景数据失败:', error);
    }
  }
  
  // 从URL参数获取scene_id（备用）
  const sceneId = route.query.scene_id;
  if (sceneId && !currentScene.value) {
    console.log('🔍 从URL参数获取scene_id:', sceneId);
    // 可以在这里添加API调用来获取场景数据
  }
  
  // 如果没有场景数据，创建默认场景
  if (!currentScene.value) {
    console.log('⚠️ 未找到场景数据，使用默认配置');
    currentScene.value = {
      scene_id: 'brain_surgery_003',
      scene_title: '脑外科电话咨询',
      trainee_character: '脑外科医生',
      scene_description_charactor: '您是一名经验丰富的脑外科医生，正在接听患者或同事的电话咨询。请根据对方的问题给出专业的医疗建议。'
    };
  }
  
  // 场景加载完成
  setTimeout(() => {
    isLoading.value = false;
    console.log('🎉 电话场景初始化完成');
  }, 1000);
};

/**
 * 处理训练完成
 */
const handleTrainingComplete = () => {
  console.log('🎉 电话场景训练完成！');
  console.log('🔍 检查window.finishTraining是否存在:', typeof window.finishTraining);
  
  // 调用全局的训练结束函数（触发phone_dropout动画）
  if (window.finishTraining) {
    console.log('✅ 调用window.finishTraining()');
    window.finishTraining();
    
    // 设置idle动画开始的回调 - 只是记录，不跳转
    window.onPhoneIdleStarted = () => {
      console.log('🎭 idle动画已开始，将持续循环播放...');
      console.log('🏠 训练已完成，idle动画将持续播放，用户可手动返回主页');
    };
    
  } else {
    console.error('❌ window.finishTraining函数不存在！');
    console.log('🔍 当前window对象上的相关函数:', {
      finishTraining: window.finishTraining,
      playTalkAnimation: window.playTalkAnimation,
      currentSceneCharacter: window.currentSceneCharacter
    });
  }
};

/**
 * 组件挂载时初始化
 */
onMounted(() => {
  console.log('📱 电话场景页面挂载');
  initializeScene();
});

/**
 * 组件卸载时清理
 */
onUnmounted(() => {
  console.log('📱 电话场景页面卸载，清理全局状态');
  
  // 清理全局函数和状态
  if (window.finishTraining) {
    delete window.finishTraining;
  }
  if (window.playTalkAnimation) {
    delete window.playTalkAnimation;
  }
  if (window.onPhoneIdleStarted) {
    delete window.onPhoneIdleStarted;
  }
  if (window.currentSceneCharacter) {
    delete window.currentSceneCharacter;
  }
});

// 设置页面标题
useHead({
  title: '自定义电话场景 - 医疗训练系统'
});
</script>

<style scoped>
.chat-container {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

.scene-background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
}

.loading-scene {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  color: white;
  z-index: 10;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.prompt-card-container {
  position: absolute;
  top: 20px;
  left: 20px;
  z-index: 20;
  width: 300px;
  transition: all 0.3s ease;
}

.prompt-card-container.collapsed {
  width: 200px;
}

.prompt-card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  overflow: hidden;
}

.prompt-card-header {
  padding: 15px 20px;
  background: rgba(66, 153, 225, 0.9);
  color: white;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  user-select: none;
  transition: background-color 0.3s ease;
}

.prompt-card-header:hover {
  background: rgba(66, 153, 225, 1);
}

.prompt-card-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.prompt-card-toggle {
  font-size: 12px;
  opacity: 0.8;
}

.prompt-card-content {
  padding: 20px;
  max-height: 400px;
  overflow-y: auto;
}

.prompt-card-role {
  margin-bottom: 15px;
  font-size: 14px;
  color: #2d3748;
}

.prompt-card-role span {
  font-weight: 600;
  color: #2b6cb0;
}

.prompt-card-description {
  font-size: 13px;
  line-height: 1.6;
  color: #4a5568;
  background: #f7fafc;
  padding: 15px;
  border-radius: 8px;
  border-left: 4px solid #4299e1;
}

.chat-box-container {
  position: absolute;
  bottom: 20px;
  right: 20px;
  z-index: 20;
  width: 400px;
  max-width: calc(100vw - 40px);
}



/* 响应式设计 */
@media (max-width: 768px) {
  .prompt-card-container {
    width: 250px;
    top: 10px;
    left: 10px;
  }
  
  .prompt-card-container.collapsed {
    width: 180px;
  }
  
  .chat-box-container {
    width: 350px;
    bottom: 10px;
    right: 10px;
  }
}

@media (max-width: 480px) {
  .prompt-card-container {
    width: calc(100vw - 20px);
    top: 10px;
    left: 10px;
  }
  
  .prompt-card-container.collapsed {
    width: 200px;
  }
  
  .chat-box-container {
    width: calc(100vw - 20px);
    bottom: 10px;
    right: 10px;
  }
  

}
</style> 