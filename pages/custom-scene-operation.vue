<!-- 自定义手术场景页面 -->
<template>
  <div class="chat-container">
    <!-- 3D场景背景 -->
    <div class="scene-background">
      <CustomSceneLoader
        v-if="sceneId"
        :scene-id="sceneId"
      />
      <div v-else class="loading-scene">
        <div class="loading-spinner"></div>
        <p>正在加载自定义场景...</p>
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
    
    <ChatBoxComponent 
      :show-evaluation-summary="showEvaluationSummary"
      :evaluation-summary-data="evaluationSummaryData"
      @evaluation-complete="handleEvaluationComplete"
      @show-evaluation-card="handleShowEvaluationCard"
      @retry-training="handleRetryTraining"
      @go-home="handleGoHome"
    />
    
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
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import ChatBoxComponent from "@/components/ChatBoxComponent.vue";
import CustomSceneLoader from "@/components/CustomSceneLoader.vue";
import ReturnHomeButton from "@/components/ReturnHomeButton.vue";
import EvaluationCard from "@/components/EvaluationCard.vue";

const router = useRouter();
const route = useRoute();
const currentScene = ref(null);
const isCardCollapsed = ref(false);
const sceneId = ref(null);

// 评估卡片相关数据
const showEvaluationCard = ref(false);
const evaluationData = ref({});
const conversationData = ref([]);

// 评估摘要相关数据
const showEvaluationSummary = ref(false);
const evaluationSummaryData = ref(null);

// 切换提示卡片的展开/收起状态
const toggleCard = () => {
  isCardCollapsed.value = !isCardCollapsed.value;
};

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
  // 从URL参数获取scene_id
  sceneId.value = route.query.scene_id;
  
  // 从localStorage获取当前场景信息
  const sceneData = localStorage.getItem('currentScene');
  if (!sceneData) {
    // 如果没有场景信息，返回场景选择页面
    router.push('/');
    return;
  }

  try {
    currentScene.value = JSON.parse(sceneData);
    console.log('当前自定义手术场景:', currentScene.value);
    console.log('场景ID:', sceneId.value);
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