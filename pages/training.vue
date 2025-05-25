<!-- 训练页面 -->
<template>
  <div class="chat-container">
    <!-- 3D场景背景 -->
    <div class="scene-background">
      <ThreeDSceneLoaderWithConfig
        :config-id="sceneConfigId"
        :enable-controls="false"
      />
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
  if (!currentScene.value) return 'doctor-operating-room';
  
  // 根据场景内容确定配置ID
  const sceneText = ((currentScene.value.scene_title || '') + ' ' + 
                    (currentScene.value.scene_description_charactor || '') + ' ' + 
                    (currentScene.value.model_charactor || '')).toLowerCase();
  
  if (sceneText.includes('医生') || sceneText.includes('doctor') || sceneText.includes('医师')) {
    return 'doctor-operating-room';
  } else if (sceneText.includes('病人') || sceneText.includes('患者') || sceneText.includes('patient')) {
    return 'patient-operating-room';
  }
  
  return 'doctor-operating-room'; // 默认配置
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
    console.log('使用的配置ID:', sceneConfigId.value);
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
</style> 