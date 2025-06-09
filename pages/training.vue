<!-- 训练页面 -->
<template>
  <div class="chat-container">
    <!-- 3D场景背景 -->
    <div class="scene-background">
      <ThreeDSceneLoaderWithConfig
        v-if="sceneConfigId"
        :config-id="sceneConfigId"
        :enable-controls="false"
      />
      <div v-else class="loading-scene">
        <div class="loading-spinner"></div>
        <p>正在加载场景配置...</p>
      </div>
    </div>
    
    <!-- 左侧提示卡片 -->
    <div class="prompt-card-container" :class="{ 'collapsed': isCardCollapsed }">
      <div class="prompt-card">
        <div class="prompt-card-header" @click="toggleCard">
          <h3 class="prompt-card-title">角色提示</h3>
          <span class="prompt-card-toggle">
            {{ isCardCollapsed ? '展開 ▼' : '收起 ▲' }}
          </span>
        </div>
        <div class="prompt-card-content" v-if="!isCardCollapsed">
          <div class="prompt-card-role">您的角色: <span>{{ currentScene?.trainee_character || '醫生' }}</span></div>
          <div class="prompt-card-description">
            {{ currentScene?.scene_description_charactor || '加載中...' }}
          </div>
        </div>
      </div>
    </div>
    
    <ChatBoxComponent />
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import ChatBoxComponent from "@/components/ChatBoxComponent.vue";
import ThreeDSceneLoaderWithConfig from "@/components/ThreeDSceneLoaderWithConfig.vue";

const router = useRouter();
const currentScene = ref(null);
const isCardCollapsed = ref(false);

// 根据当前场景确定配置ID
const sceneConfigId = computed(() => {
  // 如果场景数据还未加载，返回null（ThreeDSceneLoaderWithConfig会处理这种情况）
  if (!currentScene.value) {
    return null;
  }
  
  // 直接使用场景数据中的config_id字段
  const configId = currentScene.value.config_id;
  
  if (!configId) {
    console.error(`场景 ${currentScene.value.scene_id} 缺少config_id配置`);
    return null;
  }
  
  console.log(`场景 ${currentScene.value.scene_id} 使用配置ID: ${configId}`);
  return configId;
});

// 切换提示卡片的展开/收起状态
const toggleCard = () => {
  isCardCollapsed.value = !isCardCollapsed.value;
};

onMounted(() => {
  // 从localStorage获取当前场景信息
  const sceneData = localStorage.getItem('currentScene');
  if (!sceneData) {
    // 如果没有场景信息，返回场景选择页面
    router.push('/');
    return;
  }

  try {
    currentScene.value = JSON.parse(sceneData);
    console.log('当前场景:', currentScene.value);
  } catch (error) {
    console.error('解析场景数据失败:', error);
    router.push('/');
  }
});
</script>

<style scoped>
.chat-container {
  position: relative;
  width: 100%;
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

.prompt-card-container {
  position: fixed;
  top: 20px;
  left: 20px;
  width: 350px;
  z-index: 100;
  transition: all 0.3s ease;
}

.prompt-card-container.collapsed {
  width: 180px;
}

.prompt-card {
  background-color: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  max-width: 100%;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.prompt-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background-color: rgba(66, 153, 225, 0.9);
  color: white;
  cursor: pointer;
  user-select: none;
}

.prompt-card-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
}

.prompt-card-toggle {
  font-size: 14px;
}

.prompt-card-content {
  padding: 16px;
}

.prompt-card-role {
  margin-bottom: 8px;
  font-weight: 600;
  color: #4a5568;
}

.prompt-card-role span {
  color: #2b6cb0;
}

.prompt-card-description {
  font-size: 14px;
  line-height: 1.5;
  color: #4a5568;
  white-space: pre-wrap;
}

.loading-scene {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
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
</style> 