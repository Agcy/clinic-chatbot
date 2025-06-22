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
    
    <!-- 左侧卡片区域 -->
    <div class="left-cards-container">
      <!-- 角色提示卡片 -->
      <RolePromptCard
        :role-character="currentScene?.trainee_character || '醫生'"
        :role-description="currentScene?.scene_description_charactor || '加載中...'"
        :initial-collapsed="false"
      />
      
      <!-- 病人体征监测卡片 -->
      <PatientVitalsCard
        :vitals-data="currentScene?.patient_vitals || []"
        :initial-collapsed="false"
      />
    </div>
    
    <ChatBoxComponent 
      v-if="currentScene"
      :scene="currentScene"
      :show-evaluation-summary="showEvaluationSummary"
      :evaluation-summary-data="evaluationSummaryData"
      @evaluation-complete="handleEvaluationComplete"
      @show-evaluation-card="handleShowEvaluationCard"
      @retry-training="handleRetryTraining"
      @go-home="handleGoHome"
    />
    
    <!-- 加载状态 -->
    <div v-else class="loading-chat-box">
      <div class="loading-spinner"></div>
      <p>正在加载聊天组件...</p>
    </div>
    
    <!-- 评估卡片组件 -->
    <EvaluationCard
      :is-visible="showEvaluationCard"
      :evaluation-data="evaluationData"
      :conversation-data="conversationData"
      @close="handleCloseEvaluationCard"
      @retry-training="handleRetryTraining"
      @generate-pdf="handleGeneratePDF"
      @go-home="handleGoHome"
    />
    
    <!-- 返回主页按钮 -->
    <ReturnHomeButton />
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import ChatBoxComponent from "@/components/ChatBoxComponent.vue";
import ThreeDSceneLoaderWithConfig from "@/components/ThreeDSceneLoaderWithConfig.vue";
import ReturnHomeButton from "@/components/ReturnHomeButton.vue";
import EvaluationCard from "@/components/EvaluationCard.vue";
import RolePromptCard from "@/components/RolePromptCard.vue";
import PatientVitalsCard from "@/components/PatientVitalsCard.vue";

const router = useRouter();
const currentScene = ref(null);

// 评估卡片相关数据
const showEvaluationCard = ref(false);
const evaluationData = ref({});
const conversationData = ref([]);

// 评估摘要相关数据
const showEvaluationSummary = ref(false);
const evaluationSummaryData = ref(null);

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

/**
 * 处理评估完成
 */
const handleEvaluationComplete = (data) => {
  console.log('🎯 评估完成，显示评估卡片');
  console.log('评估数据:', data);
  
  evaluationData.value = data.evaluationData;
  conversationData.value = data.conversationData;
  showEvaluationCard.value = true;
};

/**
 * 显示评估卡片（从摘要点击）
 */
const handleShowEvaluationCard = () => {
  console.log('📊 从摘要打开评估卡片');
  showEvaluationCard.value = true;
};

/**
 * 关闭评估卡片
 */
const handleCloseEvaluationCard = () => {
  console.log('❌ 关闭评估卡片，显示评估摘要');
  showEvaluationCard.value = false;
  
  // 显示评估摘要，但先检查数据是否存在
  if (evaluationData.value && Object.keys(evaluationData.value).length > 0) {
    showEvaluationSummary.value = true;
    evaluationSummaryData.value = {
      rating: evaluationData.value.rating || 0,
      message: evaluationData.value.message || '',
      sbarScores: evaluationData.value.sbarScores || null,
      reasoning: evaluationData.value.reasoning || ''
    };
  } else {
    console.warn('⚠️ 评估数据为空，无法显示摘要');
  }
};

/**
 * 重新开始训练
 */
const handleRetryTraining = () => {
  console.log('🔄 重新开始训练');
  showEvaluationCard.value = false;
  showEvaluationSummary.value = false;
  evaluationSummaryData.value = null;
  // 重新加载页面或重置状态
  window.location.reload();
};

/**
 * 生成PDF报告
 */
const handleGeneratePDF = () => {
  console.log('📄 生成PDF报告');
  // 通过EvaluationCard组件内部的PDF生成功能处理
  // 这个事件已经在EvaluationCard组件内部处理了
};

/**
 * 回到主页
 */
const handleGoHome = () => {
  console.log('🏠 回到主页');
  router.push('/');
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

.left-cards-container {
  position: fixed;
  top: 20px;
  left: 20px;
  bottom: 40px;
  width: 360px;
  z-index: 100;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 8px;
  padding-bottom: 20px;
}

.left-cards-container::-webkit-scrollbar {
  width: 6px;
}

.left-cards-container::-webkit-scrollbar-track {
  background: rgba(226, 232, 240, 0.3);
  border-radius: 3px;
}

.left-cards-container::-webkit-scrollbar-thumb {
  background: rgba(45, 55, 72, 0.4);
  border-radius: 3px;
  transition: background-color 0.2s ease;
}

.left-cards-container::-webkit-scrollbar-thumb:hover {
  background: rgba(45, 55, 72, 0.6);
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
  width: 40px;
  height: 40px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid #ffffff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

.loading-chat-box {
  position: fixed;
  right: 20px;
  top: 50%;
  transform: translateY(-50%);
  text-align: center;
  color: white;
  z-index: 100;
  background: rgba(0, 0, 0, 0.7);
  padding: 16px;
  border-radius: 8px;
  backdrop-filter: blur(10px);
}

.loading-chat-box .loading-spinner {
  width: 24px;
  height: 24px;
  border-width: 2px;
  margin-bottom: 8px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 響應式設計 */
@media (max-width: 1200px) {
  .left-cards-container {
    width: 300px;
  }
}

@media (max-width: 768px) {
  .left-cards-container {
    position: fixed;
    top: 10px;
    left: 10px;
    right: 10px;
    bottom: 50vh;
    width: auto;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(15px);
    border-radius: 8px;
    padding: 8px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
    gap: 8px;
  }
  
  .loading-scene p,
  .loading-chat-box p {
    font-size: 13px;
  }
}

@media (max-width: 480px) {
  .left-cards-container {
    bottom: 55vh;
    gap: 6px;
  }
}
</style> 