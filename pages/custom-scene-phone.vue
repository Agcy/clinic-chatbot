<!-- 自定义电话场景页面 -->
<template>
  <div class="chat-container">
    <!-- 3D场景背景 -->
    <div class="scene-background">
      <CustomScenePhoneLoader :scene-id="sceneId" />
    </div>
    
    <!-- 加载状态 -->
    <div v-if="isLoading" class="loading-scene">
      <div class="loading-spinner"></div>
      <p>正在加载电话场景...</p>
    </div>
    
    <!-- 左侧卡片区域 -->
    <div class="left-cards-container">
      <!-- 角色提示卡片 -->
      <RolePromptCard
        :role-character="currentScene?.trainee_character || '医生'"
        :role-description="currentScene?.scene_description_charactor || '在这个电话场景中，您需要与患者或同事进行电话沟通。请根据情况做出适当的回应。'"
        :initial-collapsed="false"
      />
      
      <!-- 病人体征监测卡片 -->
      <PatientVitalsCard
        :vitals-data="currentScene?.patient_vitals || []"
        :initial-collapsed="false"
      />
    </div>
    
    <!-- 右下角聊天框 -->
    <div class="chat-box-container">
      <ChatBoxComponent 
        v-if="currentScene"
        :scene="currentScene"
        :is-training="true"
        :show-evaluation-summary="showEvaluationSummary"
        :evaluation-summary-data="evaluationSummaryData"
        @training-complete="handleTrainingComplete"
        @evaluation-complete="handleEvaluationComplete"
        @show-evaluation-card="handleShowEvaluationCard"
        @retry-training="handleRetryTraining"
        @go-home="handleGoHome"
      />
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
import EvaluationCard from '~/components/EvaluationCard.vue';
import RolePromptCard from "@/components/RolePromptCard.vue";
import PatientVitalsCard from "@/components/PatientVitalsCard.vue";

const router = useRouter();
const route = useRoute();

// 响应式数据
const isLoading = ref(true);
const currentScene = ref(null);
const sceneId = ref('patient_handover_001'); // 默认场景ID

// 评估卡片相关数据
const showEvaluationCard = ref(false);
const evaluationData = ref({});
const conversationData = ref([]);

// 评估摘要相关数据
const showEvaluationSummary = ref(false);
const evaluationSummaryData = ref(null);

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
  const urlSceneId = route.query.scene_id;
  if (urlSceneId) {
    console.log('🔍 从URL参数获取scene_id:', urlSceneId);
    sceneId.value = urlSceneId;
    // 可以在这里添加API调用来获取场景数据
  }
  
  // 如果没有场景数据，创建默认场景
  if (!currentScene.value) {
    console.log('⚠️ 未找到场景数据，使用默认配置');
    currentScene.value = {
      scene_id: 'patient_handover_001',
      scene_title: '脑外科电话咨询',
      trainee_character: '脑外科医生',
      scene_description_charactor: '您是一名经验丰富的脑外科医生，正在接听患者或同事的电话咨询。请根据对方的问题给出专业的医疗建议。',
      patient_vitals: []
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

.chat-box-container {
  position: absolute;
  bottom: 20px;
  right: 20px;
  z-index: 20;
  width: 400px;
  max-width: calc(100vw - 40px);
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
  
  .chat-box-container {
    width: 350px;
    bottom: 10px;
    right: 10px;
  }
  
  .loading-scene p {
    font-size: 13px;
  }
}

@media (max-width: 480px) {
  .left-cards-container {
    bottom: 55vh;
    gap: 6px;
  }
  
  .chat-box-container {
    width: calc(100vw - 20px);
    bottom: 10px;
    right: 10px;
  }
}
</style> 