/**
 * @fileoverview 聊天框组件 - 使用扣子(Coze)工作流API，包含ISBAR雷达图评估
 */

<template>
  <div class="chat-box fixed right-0 top-0 bottom-0 p-4 flex items-center">
    <div class="w-[400px] h-[80vh] rounded-2xl shadow-2xl overflow-hidden bg-gradient-to-b from-black/20 to-black/30 backdrop-blur-sm border border-white/20 flex flex-col">
      <!-- 消息容器 -->
      <div class="messages-container flex-1 overflow-y-auto p-4 mb-2 rounded-t-2xl">
        <transition-group name="fade" tag="div" class="space-y-4">
          <div
              v-for="(msg, index) in messages"
              :key="msg.id"
              class="message p-4 rounded-2xl transform transition-all duration-300 hover:scale-[1.02] flex flex-col"
              :class="[
                msg.from === 'user' ? 'items-end' : 'items-start',
                'w-full'
              ]"
          >
            <div
              class="message-content px-4 py-3 rounded-xl max-w-[90%] text-sm"
              :class="msg.from === 'user' ? 'bg-gradient-to-r from-blue-500/80 to-blue-600/80 text-white backdrop-blur-sm' : 'bg-gradient-to-r from-white/80 to-gray-100/80 text-gray-800 backdrop-blur-sm'"
            >
              <!-- 用户消息直接显示 -->
              <template v-if="msg.from === 'user'">
                {{ msg.text }}
              </template>
              
              <!-- AI消息使用打字机效果 -->
              <template v-else>
                <!-- Thinking状态 -->
                <div v-if="msg.isThinking" class="thinking-indicator text-gray-500 italic">
                  <span class="thinking-dots">thinking</span>
                  <span class="thinking-animation">...</span>
                </div>
                
                <!-- 等待音频状态 -->
                <div v-else-if="msg.waitingForAudio" class="waiting-audio-indicator text-gray-400 italic">
                  <span class="waiting-dots">准备中</span>
                  <span class="waiting-animation">...</span>
                </div>

                <!-- 音频播放中，等待文本显示 -->
                <div v-else-if="msg.waitingForText" class="waiting-text-indicator text-blue-400 italic">
                  <span class="waiting-dots">🎵 语音播放中</span>
                  <span class="waiting-animation">...</span>
                </div>
                
                <!-- 打字机效果 -->
                <div v-else-if="msg.showTypewriter" class="typewriter-container">
                  <Typer 
                    :text="msg.text" 
                    :speed="msg.typeSpeed || 80"
                    :show-cursor="true"
                    @finished="onTypewriterFinished(msg)"
                    @typing="onTypewriterTyping(msg)"
                    ref="typerRefs"
                  />
                </div>
                
                <!-- 完成后的静态文本 -->
                <div v-else>
                  {{ msg.text }}
                </div>
              </template>
            </div>
          </div>
        </transition-group>
        

      </div>

      <!-- 输入区域 -->
      <div class="flex-shrink-0 p-4 pt-2 pb-4 border-t border-gray-200/50">
        <form @submit.prevent="sendMessage" class="space-y-3">
          <div class="relative flex gap-2">
            <textarea
                v-model="userInput"
                ref="textareaRef"
                placeholder="输入消息..."
                class="flex-1 px-4 py-3 bg-white/70 border border-gray-200/50 rounded-lg shadow-inner focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all duration-300 outline-none backdrop-blur-sm text-sm resize-none min-h-[3rem]"
                :disabled="trainingFinished"
                @input="adjustTextareaHeight"
                @keydown.enter.exact.prevent="handleEnterKey"
                @keydown.enter.shift.exact="insertNewline"
                @compositionstart="onCompositionStart"
                @compositionend="onCompositionEnd"
                rows="1"
            ></textarea>
            <button
                type="submit"
                :disabled="!userInput.trim() || trainingFinished"
                class="send-btn bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-3 rounded-lg shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[3rem] h-12 group"
                title="发送消息 (Enter)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 transition-transform duration-200 group-hover:translate-x-0.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            </button>
          </div>
          <div class="flex justify-center gap-3">
            <!-- 训练中按钮组 -->
            <template v-if="!trainingFinished">
              <button
                  type="button"
                  @mousedown="startPressToTalk"
                  @mouseup="stopPressToTalk"
                  @mouseleave="stopPressToTalk"
                  @touchstart.prevent="startPressToTalk"
                  @touchend.prevent="stopPressToTalk"
                  :class="[
                    'voice-btn relative overflow-hidden h-14 flex-1 min-w-[8rem]',
                    isRecording ? 'voice-btn-recording' : 'voice-btn-normal'
                  ]"
                  :disabled="trainingFinished"
              >
                <div class="voice-btn-content">
                  <div class="voice-icon">🎤</div>
                  <span class="voice-text">{{ isRecording ? "正在录音..." : "按住说话" }}</span>
                </div>
                
                <!-- 录音时的波纹效果 -->
                <div v-if="isRecording" class="voice-ripple"></div>
                <div v-if="isRecording" class="voice-ripple voice-ripple-delay"></div>
              </button>
              <button
                  type="button"
                  @click="finishTraining"
                  :disabled="isEvaluating || messages.length === 0"
                  class="btn-primary bg-gradient-to-r from-purple-500 to-purple-600 h-14 flex-1 min-w-[8rem]"
              >
                ✓ 完成训练
              </button>
            </template>
            
            <!-- 训练后按钮组 -->
            <template v-else>
              <!-- 显示评估按钮（评估前） -->
              <div v-if="!showEvaluation && !showEvaluationSummary" class="flex gap-3 w-full">
                <button
                    type="button"
                    @click="evaluateConversation"
                    :disabled="isEvaluating"
                    class="btn-primary bg-gradient-to-r from-blue-500 to-blue-600 h-14 flex-1 min-w-[8rem]"
                >
                  📊 {{ isEvaluating ? "ISBAR評估中..." : "ISBAR評估" }}
                </button>
              </div>

              <!-- 显示评估摘要和操作按钮（评估后） -->
              <div v-else-if="showEvaluationSummary && evaluationSummaryData" class="w-full space-y-3">
                <!-- 评估摘要卡片 -->
                <div 
                  @click="emit('show-evaluation-card')"
                  class="evaluation-summary-card bg-gradient-to-r from-purple-50/90 to-blue-50/90 backdrop-blur-sm border border-purple-200/50 rounded-xl p-4 cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-[1.02]"
                >
                  <div class="flex items-center justify-between mb-2">
                    <div class="flex items-center gap-2">
                      <span class="text-2xl">📊</span>
                      <span class="font-semibold text-gray-800">ISBAR評估結果</span>
                    </div>
                    <div class="flex items-center gap-1 text-purple-600">
                      <span class="text-sm">點擊查看詳情</span>
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                      </svg>
                    </div>
                  </div>
                  
                  <div class="space-y-2">
                    <!-- 总分显示 -->
                    <div class="flex items-center justify-between">
                      <span class="text-sm text-gray-600">總體評分:</span>
                      <div class="flex items-center gap-2">
                        <div class="flex">
                          <span v-for="i in 5" :key="i" class="text-lg">
                            {{ i <= Math.round((evaluationSummaryData?.rating || 0) / 2) ? '⭐' : '☆' }}
                          </span>
                        </div>
                        <span class="font-bold text-purple-600">{{ evaluationSummaryData?.rating || 0 }}/10</span>
                      </div>
                    </div>
                    
                    <!-- ISBAR各维度简要显示 -->
                    <div v-if="evaluationSummaryData?.sbarScores && Object.keys(evaluationSummaryData.sbarScores).length > 0" class="grid grid-cols-5 gap-2 mt-3">
                      <div 
                        v-for="(dimension, key) in evaluationSummaryData.sbarScores" 
                        :key="key"
                        class="text-center"
                      >
                        <div class="text-xs text-gray-500 mb-1">{{ getSbarLabel(key) }}</div>
                        <div 
                          class="text-sm font-semibold px-2 py-1 rounded-full"
                          :class="getSbarScoreColor(dimension?.rank || 0) === 'text-green-600' ? 'bg-green-100 text-green-700' :
                                 getSbarScoreColor(dimension?.rank || 0) === 'text-yellow-600' ? 'bg-yellow-100 text-yellow-700' :
                                 getSbarScoreColor(dimension?.rank || 0) === 'text-orange-600' ? 'bg-orange-100 text-orange-700' :
                                 'bg-red-100 text-red-700'"
                        >
                          {{ dimension?.rank || 0 }}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <!-- 操作按钮 -->
                <div class="flex gap-2">
                  <button
                    type="button"
                    @click="emit('retry-training')"
                    class="btn-secondary bg-gradient-to-r from-green-500 to-green-600 text-white h-12 flex-1 text-sm"
                  >
                    🔄 再次對話
                  </button>
                  <button
                    type="button"
                    @click="emit('go-home')"
                    class="btn-secondary bg-gradient-to-r from-gray-500 to-gray-600 text-white h-12 flex-1 text-sm"
                  >
                    🏠 回到主頁
                  </button>
                </div>
              </div>

            </template>
          </div>
        </form>
      </div>
    </div>
  </div>

  <!-- PDF预览内容（隐藏，用于html2canvas） -->
  <div id="pdf-content" ref="pdfContentRef" class="pdf-preview">
    <div class="pdf-title">ISBAR 醫療對話評估報告</div>
    
    <div class="pdf-info">
      <div><strong>場景名稱:</strong> {{ getCurrentSceneName() }}</div>
      <div v-if="getCurrentSceneDescription()"><strong>場景描述:</strong> {{ getCurrentSceneDescription() }}</div>
      <div><strong>生成時間:</strong> <span id="generation-time">{{ getCurrentDateTime() }}</span></div>
    </div>

    <div class="pdf-section">
      <div class="pdf-section-title">📊 總體評估結果</div>
      <div class="pdf-score">評分: {{ evaluationRating }}/10</div>
      <div><strong>改進建議:</strong></div>
      <div>{{ evaluationMsg }}</div>
    </div>

    <div v-if="sbarScores" class="pdf-section">
      <div class="pdf-section-title">🎯 ISBAR 各維度詳細評估</div>
      
      <div 
        v-for="(dimension, key) in sbarScores" 
        :key="key"
        class="sbar-dimension"
      >
        <div class="sbar-dimension-title">{{ getSbarLabel(key) }} - {{ getSbarFullName(key) }}</div>
        <div class="sbar-score" :style="{ color: getSbarScoreColorHex(dimension?.rank || 0) }">評分: {{ dimension?.rank || 0 }}/10</div>
        <div class="sbar-suggestion"><strong>💡 改進建議:</strong> {{ dimension?.message || '無' }}</div>
        <div class="sbar-reason"><strong>📝 評估理由:</strong> {{ dimension?.reason || '無' }}</div>
      </div>
    </div>

    <div v-if="evaluationReasoning" class="pdf-section">
      <div class="pdf-section-title">📋 總體評估詳細理由</div>
      <div class="pdf-reasoning">{{ evaluationReasoning }}</div>
    </div>

    <div v-if="getValidMessages().length > 0" class="pdf-section">
      <div class="pdf-section-title">💬 對話記錄</div>
      
      <div 
        v-for="(msg, index) in getValidMessages()" 
        :key="index"
        class="conversation-item"
        :class="msg.from === 'user' ? 'conversation-user' : 'conversation-ai'"
      >
        <div class="conversation-role">{{ msg.from === 'user' ? '👤 醫生:' : '🤖 病人:' }}</div>
        <div>{{ msg.text }}</div>
      </div>
    </div>

    <div class="pdf-footer">
      CCTS 醫療對話訓練系統 - 專業醫療溝通能力評估平台
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, watch, onBeforeUnmount, onErrorCaptured } from 'vue';
import axios from 'axios';
import { useRouter, useRoute } from 'vue-router';
import { Typer } from 'vue3-text-typer';

// 定义组件props
const props = defineProps({
  scene: {
    type: Object,
    default: () => ({})
  },
  isTraining: {
    type: Boolean,
    default: false
  },
  showEvaluationSummary: {
    type: Boolean,
    default: false
  },
  evaluationSummaryData: {
    type: Object,
    default: () => null
  }
});

// 定义组件事件
const emit = defineEmits(['training-complete', 'evaluation-complete', 'show-evaluation-card', 'retry-training', 'go-home']);

// 动态导入PDF相关库
let jsPDF = null;
let html2canvas = null;

// 动态加载PDF库
const loadPDFLibraries = async () => {
  if (typeof window !== 'undefined') {
    try {
      const jsPDFModule = await import('jspdf');
      jsPDF = jsPDFModule.jsPDF;
      
      const html2canvasModule = await import('html2canvas');
      html2canvas = html2canvasModule.default;
      
      console.log('✅ PDF库加载成功');
      return true;
    } catch (error) {
      console.error('❌ PDF库加载失败:', error);
      return false;
    }
  }
  return false;
};

const router = useRouter();
const route = useRoute();

const messages = ref([]);
const userInput = ref("");
const textareaRef = ref(null);
const radarChartRef = ref(null); // 雷达图canvas引用
const pdfContentRef = ref(null); // PDF内容引用
const isRecording = ref(false);
const audioBlob = ref(null);
const trainingFinished = ref(false);
const isEvaluating = ref(false);
const showEvaluation = ref(false);
const evaluationRating = ref(0);
const evaluationMsg = ref("");
const evaluationReasoning = ref(""); // 评估理由
const showReasoning = ref(false); // 控制理由框的展开/折叠
const sbarScores = ref(null); // ISBAR各维度评分
const expandedSbarItems = ref([]); // 展开的ISBAR项目
const currentSceneId = ref(null);
const typerRefs = ref([]);

// 中文输入法状态管理
const isComposing = ref(false);

let mediaRecorder;
let audioChunks = [];
let sttSessionId = null;
let audioContext = null;
let processor = null;
let radarChart = null; // Chart.js实例

// 动态加载Chart.js
const loadChartJS = async () => {
  if (typeof Chart !== 'undefined') {
    return; // 已经加载
  }
  
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.min.js';
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

// ISBAR相关辅助函数
const getSbarLabel = (key) => {
  const labels = {
    'Introduction': 'I',
    'Situation': 'S',
    'Background': 'B',
    'Assessment': 'A',
    'Recommendation': 'R'
  };
  return labels[key] || key;
};

const getSbarFullName = (key) => {
  const names = {
    'Introduction': '自我介紹',
    'Situation': '情況描述',
    'Background': '背景收集',
    'Assessment': '評估分析',
    'Recommendation': '建議方案'
  };
  return names[key] || key;
};

const getSbarScoreColor = (score) => {
  if (score >= 8) return 'text-green-600';
  if (score >= 6) return 'text-yellow-600';
  if (score >= 4) return 'text-orange-600';
  return 'text-red-600';
};

// 获取ISBAR评分颜色的十六进制值（用于PDF）
const getSbarScoreColorHex = (score) => {
  if (score >= 8) return '#16a34a'; // green-600
  if (score >= 6) return '#ca8a04'; // yellow-600
  if (score >= 4) return '#ea580c'; // orange-600
  return '#dc2626'; // red-600
};

// 获取当前场景名称
const getCurrentSceneName = () => {
  if (process.client) {
    try {
      const sceneData = localStorage.getItem('currentScene');
      if (sceneData) {
        const scene = JSON.parse(sceneData);
        return scene.scene_name || '醫療對話訓練';
      }
    } catch (error) {
      console.error('獲取場景名稱失敗:', error);
    }
  }
  return '醫療對話訓練';
};

// 获取当前场景描述
const getCurrentSceneDescription = () => {
  if (process.client) {
    try {
      const sceneData = localStorage.getItem('currentScene');
      if (sceneData) {
        const scene = JSON.parse(sceneData);
        return scene.scene_description || '';
      }
    } catch (error) {
      console.error('獲取場景描述失敗:', error);
    }
  }
  return '';
};

// 打字机完成回调
const onTypewriterFinished = (msg) => {
  console.log('🎯 打字机效果完成:', msg.text.substring(0, 50) + '...');
  // 打字机完成后，将消息标记为静态显示
  msg.showTypewriter = false;
  msg.isThinking = false;
  msg.waitingForAudio = false;
  msg.waitingForText = false;

  // 清理动态属性
  delete msg.typeSpeed;
  delete msg.audioDuration;
};

// 打字机正在打字回调
const onTypewriterTyping = (msg) => {
  // console.log('正在打字:', msg.text.substring(0, 20) + '...');
  // 可以在这里添加其他逻辑，比如滚动到底部
  scrollToBottom();
};

// 获取当前日期时间
const getCurrentDateTime = () => {
  const now = new Date();
  return `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 ${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;
};

// 获取有效的消息列表
const getValidMessages = () => {
  return messages.value.filter(msg => 
    msg.text !== "Error: Failed to send message." && 
    !msg.text.includes("正在進行 ISBAR 評估分析")
  );
};

const toggleSbarDetail = (key) => {
  const index = expandedSbarItems.value.indexOf(key);
  if (index > -1) {
    expandedSbarItems.value.splice(index, 1);
  } else {
    expandedSbarItems.value.push(key);
  }
};

// 初始化雷达图
const initRadarChart = async () => {
  console.log('🎯 initRadarChart 函数开始执行...');
  console.log('📊 radarChartRef.value:', radarChartRef.value);
  console.log('📊 sbarScores.value:', sbarScores.value);
  
  if (!radarChartRef.value || !sbarScores.value) {
    console.log('❌ 雷达图初始化失败：缺少必要条件');
    console.log('- radarChartRef.value 存在:', !!radarChartRef.value);
    console.log('- sbarScores.value 存在:', !!sbarScores.value);
    return;
  }
  
  try {
    console.log('📦 开始加载Chart.js...');
    await loadChartJS();
    console.log('✅ Chart.js加载完成');
    
    const ctx = radarChartRef.value.getContext('2d');
    console.log('🎨 获取Canvas上下文:', !!ctx);
    
    // 如果已存在图表，先销毁
    if (radarChart) {
      console.log('🗑️ 销毁现有雷达图...');
      radarChart.destroy();
    }
    
    const scores = [
      sbarScores.value.Introduction?.rank || 0,
      sbarScores.value.Situation?.rank || 0,
      sbarScores.value.Background?.rank || 0,
      sbarScores.value.Assessment?.rank || 0,
      sbarScores.value.Recommendation?.rank || 0
    ];

    console.log('📊 提取的ISBAR评分:', scores);
    console.log('📊 ISBAR数据详情:', {
      Introduction: sbarScores.value.Introduction,
      Situation: sbarScores.value.Situation,
      Background: sbarScores.value.Background,
      Assessment: sbarScores.value.Assessment,
      Recommendation: sbarScores.value.Recommendation
    });
    
    console.log('🎨 开始创建Chart.js雷达图...');
    radarChart = new Chart(ctx, {
      type: 'radar',
      data: {
        labels: ['I', 'S', 'B', 'A', 'R'],
        datasets: [{
          label: 'ISBAR 評分',
          data: scores,
          borderColor: 'rgb(74, 144, 226)',
          backgroundColor: 'rgba(74, 144, 226, 0.2)',
          borderWidth: 3,
          pointBackgroundColor: 'rgb(74, 144, 226)',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 6,
          pointHoverRadius: 8,
          pointHoverBackgroundColor: 'rgb(49, 130, 206)',
          pointHoverBorderColor: '#fff',
          pointHoverBorderWidth: 3,
          tension: 0.1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              title: function(context) {
                const labelMap = {
                  'S': 'Situation (情況描述)',
                  'B': 'Background (背景收集)',
                  'A': 'Assessment (評估分析)',
                  'R': 'Recommendation (建議方案)'
                };
                return labelMap[context[0].label] || context[0].label;
              },
              label: function(context) {
                const score = context.raw;
                return `評分: ${score}/10`;
              }
            },
            displayColors: false,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: '#fff',
            bodyColor: '#fff',
            borderColor: 'rgba(74, 144, 226, 0.8)',
            borderWidth: 1,
            cornerRadius: 8,
            padding: 12
          }
        },
        scales: {
          r: {
            beginAtZero: true,
            min: 0,
            max: 10,
            ticks: {
              stepSize: 2,
              color: '#718096',
              font: {
                size: 10
              }
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.1)',
              lineWidth: 1
            },
            angleLines: {
              color: 'rgba(0, 0, 0, 0.1)',
              lineWidth: 1
            },
            pointLabels: {
              display: true,
              padding: 15,
              font: {
                size: 12,
                weight: 'bold'
              },
              color: '#4299e1'
            }
          }
        }
      }
    });
    
    console.log('✅ 雷达图创建成功:', !!radarChart);
  } catch (error) {
    console.error('❌ 初始化雷达图失败:', error);
    console.error('错误详情:', error.stack);
  }
};

// 清空聊天记录
const clearChat = async () => {
  // console.log('清空聊天记录');
  
  try {
    // 调用API清除conversation_id
    await axios.post("/api/coze-conversation", {
      action: 'clearHistory',
      userId: 'default_user'
    });
  } catch (error) {
    console.error('清除对话历史失败:', error);
  }
  
  messages.value = [];
  userInput.value = "";
  isRecording.value = false;
  audioBlob.value = null;
  trainingFinished.value = false;
  isEvaluating.value = false;
  showEvaluation.value = false;
  evaluationRating.value = 0;
  evaluationMsg.value = "";
  evaluationReasoning.value = "";
  sbarScores.value = null;
  expandedSbarItems.value = [];
  showReasoning.value = false;
  audioChunks = [];
  
  // 销毁雷达图
  if (radarChart) {
    radarChart.destroy();
    radarChart = null;
  }
  
  // 停止录音（如果在录音中）
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
  }
};

// 初始化当前场景ID
const initCurrentScene = () => {
  try {
    if (process.client) {
      const sceneData = localStorage.getItem('currentScene');
      if (sceneData) {
        const scene = JSON.parse(sceneData);
        currentSceneId.value = scene.scene_id; // 使用scene_id字段，如 'vascular_tumor_001'
      }
    }
  } catch (error) {
    console.error('初始化场景时出错:', error);
  }
};

// 获取预加载的角色信息
const getCurrentSceneCharacter = () => {
  // 直接从全局变量获取预加载的角色信息
  if (window.currentSceneCharacter) {
    // console.log(`使用预加载的角色信息: ${window.currentSceneCharacter.name} (${window.currentSceneCharacter.voice})`);
    return window.currentSceneCharacter;
  }
  
  // 如果没有预加载信息，抛出错误
  console.error('未找到预加载的角色信息，无法继续');
  throw new Error('角色信息未预加载，请确认场景配置正确');
};

// 组件挂载时
onMounted(() => {
  try {
    // 初始化当前场景ID
    initCurrentScene();
    // 初始化textarea高度
    nextTick(() => {
      adjustTextareaHeight();
    });
  } catch (error) {
    console.error('组件挂载时出错:', error);
  }
});

// 滚动到底部
const scrollToBottom = async () => {
  await nextTick();
  const container = document.querySelector('.messages-container');
  if (container) {
    container.scrollTop = container.scrollHeight;
  }
};

// 监听消息变化，自动滚动到底部
watch(messages, () => {
  scrollToBottom();
}, { deep: true });

// 中文输入法事件处理
const onCompositionStart = () => {
  isComposing.value = true;
};

const onCompositionEnd = () => {
  isComposing.value = false;
};

// 处理回车键事件
const handleEnterKey = (event) => {
  // 如果正在使用中文输入法，则不发送消息
  if (isComposing.value) {
    return;
  }
  
  // 检查是否有文本内容
  if (!userInput.value.trim()) {
    console.log('📝 输入为空，跳过发送');
    return;
  }
  
  console.log('⌨️ 回车发送消息:', userInput.value);
  sendMessage();
};

const sendMessage = async () => {
  const userMessage = userInput.value.trim();
  if (!userMessage || trainingFinished.value) {
    return;
  }

  const newMessage = {
    id: Date.now(),
    text: userMessage,
    from: 'user'
  };

  messages.value.push(newMessage);
  userInput.value = "";

  // 重置textarea高度
  nextTick(() => {
    adjustTextareaHeight();
  });

  // 添加thinking状态的AI消息
  const thinkingMessage = {
    id: Date.now() + 1, // 确保ID唯一
    text: '',
    from: 'ai',
    isThinking: true,
    showTypewriter: false
  };
  messages.value.push(thinkingMessage);

  try {
    // 从localStorage获取当前场景信息
    let systemPrompt = "你是一位经验丰富的医生，正在接受培训者的问诊训练。请根据培训者的问题，给出专业、耐心的回答。";
    let sceneId = null;
    let isNewScene = false;
    
    if (process.client) {
      const sceneData = localStorage.getItem('currentScene');
      if (sceneData) {
        try {
          const scene = JSON.parse(sceneData);
          if (scene.scene_description_model) {
            systemPrompt = scene.scene_description_model;
          }
          
          // 检查场景是否变更
          if (scene.scene_id !== currentSceneId.value) {
            isNewScene = true;
            // 更新当前场景ID
            currentSceneId.value = scene.scene_id;
          }
          
          sceneId = scene.scene_id; // 使用scene_id字段，如 'vascular_tumor_001'
        } catch (error) {
          console.error('解析场景数据失败:', error);
        }
      }
    }

    // console.log('Sending message to API:', userMessage);
    const aiResponse = await axios.post("/api/coze-conversation", { 
        message: userMessage,
        systemPrompt: systemPrompt,
        userId: 'default_user', // 或者使用实际的用户ID
        scenarioId: sceneId,
        shouldSave: false // 训练过程中不保存，完成后再保存
    });
    
    if (aiResponse?.data?.error) {
      throw new Error(aiResponse.data.error);
    }
    
    const reply = aiResponse?.data?.response || "I didn't understand that.";
    
    // 找到thinking消息并准备更新
    const thinkingIndex = messages.value.findIndex(msg => msg.isThinking);
    let targetMessage = null;
    
    if (thinkingIndex !== -1) {
      // 更新thinking消息的文本，但先不启动打字机
      messages.value[thinkingIndex].text = reply;
      messages.value[thinkingIndex].isThinking = false;
      messages.value[thinkingIndex].showTypewriter = false; // 先不显示打字机
      messages.value[thinkingIndex].waitingForAudio = true; // 等待音频
      messages.value[thinkingIndex].waitingForText = false; // 还未到文本显示阶段
      targetMessage = messages.value[thinkingIndex];
    } else {
      // 如果没找到thinking消息，直接添加新消息（备用方案）
      const aiMessage = {
        id: Date.now(),
        text: reply,
        from: 'ai',
        isThinking: false,
        showTypewriter: false, // 先不显示打字机
        waitingForAudio: true, // 等待音频
        waitingForText: false // 还未到文本显示阶段
      };
      messages.value.push(aiMessage);
      targetMessage = aiMessage;
    }

    // 转换AI回复为语音并播放，实现文本与语音同步
    try {
      // 获取预加载的角色信息（无需异步调用）
      const currentCharacter = getCurrentSceneCharacter();
      const characterName = currentCharacter.name;

      console.log('🎵 开始生成语音...');
      // 调用新的Edge TTS API，传入角色名称
      const speechResponse = await axios.post("/api/text-to-speech", {
        text: reply,
        characterName: characterName
      });

      if (!speechResponse.data.success) {
        throw new Error(speechResponse.data.error || '语音生成失败');
      }

      const audioContent = speechResponse.data.audioContent;
      console.log(`✅ 语音生成完成，使用音色: ${speechResponse.data.voice}`);

      // 创建音频对象
      const audioBlob = new Blob([Uint8Array.from(atob(audioContent), c => c.charCodeAt(0))], { type: 'audio/mp3' });
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      // 设置音频加载完成后的处理
      audio.addEventListener('loadedmetadata', () => {
        const audioDuration = audio.duration * 1000; // 转换为毫秒
        console.log(`🎵 音频时长: ${audioDuration}ms`);

        // 存储音频时长到消息对象中，供后续使用
        if (targetMessage) {
          targetMessage.audioDuration = audioDuration;
        }
      });

      // 监听音频开始播放，启动说话动画
      audio.addEventListener('play', () => {
        if (window.playTalkAnimation) {
          window.playTalkAnimation(true);
          console.log('🎭 语音开始播放，启动说话动画');
        }

        // 实现延迟显示文本的逻辑
        if (targetMessage && targetMessage.waitingForAudio) {
          // 切换到等待文本显示状态
          targetMessage.waitingForAudio = false;
          targetMessage.waitingForText = true;

          const textLength = reply.length;
          const audioDuration = targetMessage.audioDuration || (textLength / 3.5 * 1000); // 使用实际时长或估算

          // 设置延迟时间（2-5秒，根据文本长度动态调整）
          const delayTime = Math.min(5000, Math.max(2000, Math.min(textLength * 30, 4000))); // 2-5秒之间
          console.log(`⏰ 文本将在 ${delayTime}ms 后开始显示`);

          // 延迟后开始显示文本
          setTimeout(() => {
            if (targetMessage && targetMessage.waitingForText) {
              targetMessage.waitingForText = false;
              targetMessage.showTypewriter = true;

              // 计算剩余的音频播放时间
              const currentTime = audio.currentTime * 1000; // 当前播放位置（毫秒）
              const remainingTime = Math.max(1000, audioDuration - currentTime); // 剩余播放时间，至少1秒

              // 根据剩余时间和文本长度计算打字速度，确保文本和语音同时结束
              const typeSpeed = Math.max(30, Math.min(200, remainingTime / textLength));

              targetMessage.typeSpeed = Math.round(typeSpeed);
              console.log(`🎯 文本长度: ${textLength}, 音频总时长: ${audioDuration}ms, 延迟: ${delayTime}ms, 剩余时间: ${remainingTime}ms, 打字速度: ${typeSpeed}ms/字符`);
            }
          }, delayTime);
        }
      });

        // 监听音频播放结束，停止说话动画
        audio.addEventListener('ended', () => {
          if (window.playTalkAnimation) {
            window.playTalkAnimation(false);
            console.log('🎭 语音播放结束，停止说话动画');
          }
          URL.revokeObjectURL(audioUrl); // 清理URL对象

          // 确保文本显示完成
          if (targetMessage && targetMessage.showTypewriter) {
            console.log('🎯 音频播放结束，确保文本显示完成');
          }
        });

        // 监听音频播放错误，实现fallback机制
        audio.addEventListener('error', (e) => {
          console.error('❌ 音频播放失败:', e);
          if (window.playTalkAnimation) {
            window.playTalkAnimation(false);
            console.log('🎭 音频播放失败，停止说话动画');
          }
          URL.revokeObjectURL(audioUrl);

          // Fallback: 如果音频播放失败，立即显示文本
          if (targetMessage && (targetMessage.waitingForAudio || targetMessage.waitingForText)) {
            targetMessage.waitingForAudio = false;
            targetMessage.waitingForText = false;
            targetMessage.showTypewriter = true;
            targetMessage.typeSpeed = 80; // 使用默认速度
            console.log('🔄 音频播放失败，立即显示文本');
          }
        });

        // 监听音频暂停（以防万一）
        audio.addEventListener('pause', () => {
          if (window.playTalkAnimation) {
            window.playTalkAnimation(false);
            console.log('⏸️ 语音播放暂停，停止说话动画');
          }
        });

        // 监听音频加载错误
        audio.addEventListener('loadstart', () => {
          console.log('🎵 开始加载音频...');
        });

        audio.addEventListener('canplay', () => {
          console.log('✅ 音频可以播放');
        });

        // 开始播放音频（此时会触发play事件，启动动画）
        console.log('🎵 准备播放语音...');

        // 设置播放超时，防止音频加载过久
        const playTimeout = setTimeout(() => {
          console.warn('⚠️ 音频播放超时，使用fallback机制');
          if (targetMessage && (targetMessage.waitingForAudio || targetMessage.waitingForText)) {
            targetMessage.waitingForAudio = false;
            targetMessage.waitingForText = false;
            targetMessage.showTypewriter = true;
            targetMessage.typeSpeed = 80;
            console.log('🔄 播放超时，立即显示文本');
          }
        }, 10000); // 10秒超时

        // 播放音频
        audio.play().then(() => {
          clearTimeout(playTimeout);
          console.log('✅ 音频开始播放');
        }).catch((playError) => {
          clearTimeout(playTimeout);
          console.error('❌ 音频播放失败:', playError);
          // Fallback: 播放失败时立即显示文本
          if (targetMessage && (targetMessage.waitingForAudio || targetMessage.waitingForText)) {
            targetMessage.waitingForAudio = false;
            targetMessage.waitingForText = false;
            targetMessage.showTypewriter = true;
            targetMessage.typeSpeed = 80;
            console.log('🔄 播放失败，立即显示文本');
          }
        });

    } catch (ttsError) {
      console.error('❌ TTS处理失败:', ttsError);
      // TTS失败时，直接显示打字机效果（不等待音频）
      if (targetMessage && (targetMessage.waitingForAudio || targetMessage.waitingForText)) {
        targetMessage.waitingForAudio = false;
        targetMessage.waitingForText = false;
        targetMessage.showTypewriter = true;
        targetMessage.typeSpeed = 80; // 使用默认速度
        console.log('🔄 TTS失败，使用默认打字机效果');
      }
    }
  } catch (error) {
    console.error('Error sending message:', error);
    
    // 清除thinking状态和等待状态
    const thinkingIndex = messages.value.findIndex(msg => msg.isThinking || msg.waitingForAudio || msg.waitingForText);
    if (thinkingIndex !== -1) {
      messages.value.splice(thinkingIndex, 1);
    }
    
    alert('發送消息失敗：' + error.message);
  }
};

// 按住说话 - 开始
const startPressToTalk = async (event) => {
  if (trainingFinished.value || isRecording.value) return;
  
  // 防止默认行为和事件冒泡
  event.preventDefault();
  event.stopPropagation();
  
  try {
    await startRecording();
  } catch (error) {
    console.error('开始录音失败:', error);
  }
};

// 按住说话 - 结束
const stopPressToTalk = async (event) => {
  if (trainingFinished.value || !isRecording.value) return;
  
  // 防止默认行为和事件冒泡
  event.preventDefault();
  event.stopPropagation();
  
  try {
    await stopRecording();
  } catch (error) {
    console.error('停止录音失败:', error);
  }
};

const startRecording = async () => {
  if (trainingFinished.value) return;
  
  try {
    // 检查浏览器是否支持媒体设备API
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('您的瀏覽器不支持音頻錄製功能');
    }

    // console.log('🎤 开始流式录音...');
    isRecording.value = true;
    
    const stream = await navigator.mediaDevices.getUserMedia({ 
      audio: {
        sampleRate: 16000,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true
      }
    });
    
    // 保存stream引用用于停止时清理
    window.currentAudioStream = stream;

    // 创建音频上下文
    audioContext = new (window.AudioContext || window.webkitAudioContext)({
      sampleRate: 16000
    });
    
    const source = audioContext.createMediaStreamSource(stream);
    
    // 使用现代的AudioWorklet或降级到ScriptProcessor
    let audioBuffer = [];
    
    // 将audioBuffer保存到window对象供停止录音时访问
    window.audioBufferData = audioBuffer;
    
    // 初始化STT会话
    await initSTTSession();
    
    // 尝试使用AudioWorklet，如果不支持则降级到ScriptProcessor
    try {
      // 检查是否支持AudioWorklet
      if (audioContext.audioWorklet && typeof audioContext.audioWorklet.addModule === 'function') {
        // 创建内联AudioWorklet处理器
        const workletCode = `
          class AudioProcessor extends AudioWorkletProcessor {
            constructor() {
              super();
              this.bufferSize = 4096;
              this.buffer = new Float32Array(this.bufferSize);
              this.bufferIndex = 0;
            }
            
            process(inputs, outputs, parameters) {
              const input = inputs[0];
              if (input.length > 0) {
                const inputChannel = input[0];
                
                for (let i = 0; i < inputChannel.length; i++) {
                  this.buffer[this.bufferIndex] = inputChannel[i];
                  this.bufferIndex++;
                  
                  if (this.bufferIndex >= this.bufferSize) {
                    // 发送音频数据到主线程
                    this.port.postMessage({
                      type: 'audioData',
                      data: Array.from(this.buffer)
                    });
                    this.bufferIndex = 0;
                  }
                }
              }
              return true;
            }
          }
          
          registerProcessor('audio-processor', AudioProcessor);
        `;
        
        // 创建Blob URL用于AudioWorklet
        const blob = new Blob([workletCode], { type: 'application/javascript' });
        const workletUrl = URL.createObjectURL(blob);
        
        await audioContext.audioWorklet.addModule(workletUrl);
        processor = new AudioWorkletNode(audioContext, 'audio-processor');
        
        // 监听AudioWorklet消息
        processor.port.onmessage = async (event) => {
          if (event.data.type === 'audioData' && isRecording.value && sttSessionId) {
            const inputData = new Float32Array(event.data.data);
            
            // 转换为16位PCM（小端序）
            const pcmData = new Int16Array(inputData.length);
            for (let i = 0; i < inputData.length; i++) {
              // 确保样本在[-1, 1]范围内
              const sample = Math.max(-1, Math.min(1, inputData[i]));
              // 转换为16位整数
              pcmData[i] = sample < 0 ? Math.floor(sample * 0x8000) : Math.floor(sample * 0x7FFF);
            }
            
            // 转换为字节数组（小端序）
            const bytes = new Uint8Array(pcmData.buffer);
            audioBuffer.push(...bytes);
            
            // 每200ms发送一次数据 (16000 * 2 * 0.2 = 6400 bytes)
            if (audioBuffer.length >= 6400) {
              const chunkData = new Uint8Array(audioBuffer.splice(0, 6400));
              await sendAudioData(chunkData, false);
            }
          }
        };
        
        // 清理Blob URL
        URL.revokeObjectURL(workletUrl);
        
        console.log('✅ 使用现代AudioWorklet进行音频处理');
      } else {
        throw new Error('AudioWorklet不支持，降级到ScriptProcessor');
      }
    } catch (workletError) {
      console.warn('AudioWorklet初始化失败，降级到ScriptProcessor:', workletError.message);
      
      // 降级到ScriptProcessor（已弃用但兼容性好）
      processor = audioContext.createScriptProcessor(4096, 1, 1);
      
      processor.onaudioprocess = async (e) => {
        if (!isRecording.value || !sttSessionId) return;
        
        const inputBuffer = e.inputBuffer;
        const inputData = inputBuffer.getChannelData(0);
        
        // 转换为16位PCM（小端序）
        const pcmData = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          // 确保样本在[-1, 1]范围内
          const sample = Math.max(-1, Math.min(1, inputData[i]));
          // 转换为16位整数
          pcmData[i] = sample < 0 ? Math.floor(sample * 0x8000) : Math.floor(sample * 0x7FFF);
        }
        
        // 转换为字节数组（小端序）
        const bytes = new Uint8Array(pcmData.buffer);
        audioBuffer.push(...bytes);
        
        // 每200ms发送一次数据 (16000 * 2 * 0.2 = 6400 bytes)
        if (audioBuffer.length >= 6400) {
          const chunkData = new Uint8Array(audioBuffer.splice(0, 6400));
          await sendAudioData(chunkData, false);
        }
      };
      
      console.log('⚠️ 使用ScriptProcessor进行音频处理（已弃用）');
    }
    
    source.connect(processor);
    processor.connect(audioContext.destination);
    
    // console.log('✅ 流式录音已开始');

  } catch (error) {
    console.error('启动录音失败:', error);
    isRecording.value = false;
    alert(error.message || '無法訪問麥克風，請檢查權限設置');
  }
};

const stopRecording = async () => {
  if (!isRecording.value) return;
  
  // console.log('🛑 停止流式录音...');
  isRecording.value = false;
  
  // 发送剩余的音频数据（如果有的话）
  if (sttSessionId && processor) {
    // 获取当前audioBuffer中的剩余数据
    const audioBufferData = window.audioBufferData || [];
    if (audioBufferData.length > 0) {
      // console.log(`📤 发送剩余音频数据: ${audioBufferData.length} bytes`);
      await sendAudioData(new Uint8Array(audioBufferData), false);
      window.audioBufferData = [];
    }
    
    // 发送结束标记
    await sendAudioData(new Uint8Array(0), true);
  }
  
  // 清理音频处理
  if (processor) {
    processor.disconnect();
    processor = null;
  }
  
  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }
  
  // 停止音频流
  if (window.currentAudioStream) {
    window.currentAudioStream.getTracks().forEach(track => {
      track.stop();
      // console.log('🔇 停止音频轨道:', track.kind);
    });
    window.currentAudioStream = null;
  }
  
  // 关闭STT会话
  if (sttSessionId) {
    try {
      await axios.post("/api/speech-to-text-stream", {
        action: 'close',
        sessionId: sttSessionId
      });
    } catch (error) {
      console.error('关闭STT会话失败:', error);
    }
    sttSessionId = null;
  }
};

// 初始化STT会话
const initSTTSession = async () => {
  try {
    // console.log('🔗 初始化流式STT会话...');
    
    const response = await axios.post("/api/speech-to-text-stream", {
      action: 'init'
    });
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'STT会话初始化失败');
    }
    
    sttSessionId = response.data.sessionId;
    // console.log('✅ STT会话初始化成功:', sttSessionId);
    
  } catch (error) {
    console.error('初始化STT会话失败:', error);
    throw error;
  }
};

// 发送音频数据
const sendAudioData = async (audioData, isLast) => {
  if (!sttSessionId) {
    console.warn('STT会话未初始化');
    return;
  }

  try {
    const response = await axios.post("/api/speech-to-text-stream", {
      action: 'sendAudio',
      sessionId: sttSessionId,
      audioData: Array.from(audioData),
      isLast: isLast
    });
    
    if (response.data.success) {
      const result = response.data.result;
      
      if (result && result.trim()) {
        // console.log('🎯 识别结果:', result);
        userInput.value = result;
        
        // 只显示在文本框中，不自动发送
      }
    }
    
  } catch (error) {
    console.error('发送音频数据失败:', error);
  }
};

const downloadAudio = () => {
  if (!audioBlob.value) {
    return;
  }

  const link = document.createElement('a');
  link.href = URL.createObjectURL(audioBlob.value);
  link.download = 'recorded_audio.wav';
  link.click();
  URL.revokeObjectURL(link.href);
};

const getSupportedContentMimeType = () => {
  // 不再需要MediaRecorder的MIME类型检查，因为我们使用PCM格式
  return 'audio/pcm';
};

/**
 * 完成训练，准备评估
 */
const finishTraining = () => {
  if (messages.value.length === 0) {
    alert('還沒有對話內容可以評估！');
    return;
  }
  
  trainingFinished.value = true;
  
  // 发射训练完成事件（供自定义场景使用）
  if (emit) {
    try {
      emit('training-complete');
    } catch (error) {
      console.log('发射training-complete事件时出错（这个错误可以忽略）:', error);
    }
  }
};

/**
 * 评估对话
 */
const evaluateConversation = async () => {
  if (messages.value.length === 0) {
    alert('還沒有對話內容可以評估！');
    return;
  }

  isEvaluating.value = true;

  try {
    // 显示评估进度提示
    const evaluatingMessage = {
      id: Date.now(),
      text: "🔄 正在進行 ISBAR 評估分析，預計需要 1-2 分鐘，請稍候...",
      from: 'ai'
    };
    messages.value.push(evaluatingMessage);

    // 过滤掉错误消息和评估提示消息
    const validMessages = messages.value.filter(msg => 
      msg.text !== "Error: Failed to send message." && 
      !msg.text.includes("正在進行 ISBAR 評估分析")
    );

    // 获取当前场景ID（必须有效）
    let sceneId = null;
    if (process.client) {
      try {
        const sceneData = localStorage.getItem('currentScene');
        if (sceneData) {
          const scene = JSON.parse(sceneData);
          sceneId = scene.scene_id; // 使用scene_id字段，如 'vascular_tumor_001'
        }
      } catch (error) {
        console.error('获取场景ID失败:', error);
      }
    }
    
    if (!sceneId) {
      throw new Error('场景ID未找到，无法评估对话');
    }

    // 获取当前场景的完整数据
    let sceneData = null;
    if (process.client) {
      try {
        const storedSceneData = localStorage.getItem('currentScene');
        if (storedSceneData) {
          sceneData = JSON.parse(storedSceneData);
        }
      } catch (error) {
        console.error('获取场景数据失败:', error);
      }
    }

    if (!sceneData) {
      throw new Error('场景数据未找到，无法进行评估');
    }

    // 准备对话数据
    const evaluationRequest = {
      userId: 'default_user',  // 使用与其他API一致的用户ID
      scenarioId: sceneId,
      messages: validMessages.map(msg => ({
        role: msg.from === 'user' ? 'user' : 'assistant',
        content: msg.text,
        timestamp: new Date()
      })),
      sceneData: sceneData  // 传递完整的场景数据
    };

    console.log('发送评估请求:', evaluationRequest);
    console.log('场景数据:', {
      scene_id: sceneData.scene_id,
      scene_description_model: sceneData.scene_description_model?.substring(0, 100) + '...',
      scene_description_charactor: sceneData.scene_description_charactor?.substring(0, 100) + '...'
    });

    // 调用评估API
    const response = await axios.post("/api/evaluate-conversation", evaluationRequest);
    
    console.log('评估API响应:', response.data);
    
    if (response.data.error) {
      throw new Error(response.data.error);
    }

    if (!response.data.success) {
      throw new Error('评估失败：' + (response.data.error || '未知错误'));
    }

    // 移除评估进度提示消息
    const messageIndex = messages.value.findIndex(msg => msg.text.includes("正在進行 ISBAR 評估分析"));
    if (messageIndex > -1) {
      messages.value.splice(messageIndex, 1);
    }

    // 保存评估结果
    evaluationRating.value = response.data.rating;
    evaluationMsg.value = response.data.evaluation_msg;
    evaluationReasoning.value = response.data.reasoning || ''; // 保存评估理由
    sbarScores.value = response.data.sbar_scores || null; // 保存ISBAR评分数据

    console.log('评估成功，评分:', response.data.rating, '评估消息:', response.data.evaluation_msg);
    console.log('评估理由:', response.data.reasoning?.substring(0, 100) + '...');
    console.log('ISBAR评分:', response.data.sbar_scores);

    // 准备评估数据
    const evaluationData = {
      rating: response.data.rating,
      evaluation_msg: response.data.evaluation_msg,
      reasoning: response.data.reasoning,
      sbar_scores: response.data.sbar_scores
    };

    // 准备对话数据
    const conversationMessages = getValidMessages();

    // 发射评估完成事件
    emit('evaluation-complete', {
      evaluationData,
      conversationData: conversationMessages
    });
  } catch (error) {
    console.error('评估失败:', error);
    
    // 移除评估进度提示消息
    const messageIndex = messages.value.findIndex(msg => msg.text.includes("正在進行 ISBAR 評估分析"));
    if (messageIndex > -1) {
      messages.value.splice(messageIndex, 1);
    }
    
    alert('對話評估失敗：' + error.message);
  } finally {
    isEvaluating.value = false;
  }
};

/**
 * 重置训练，开始新一轮
 */
const resetTraining = async () => {
  await clearChat();
  trainingFinished.value = false;
  showEvaluation.value = false;
  evaluationRating.value = 0;
  evaluationMsg.value = "";
  evaluationReasoning.value = "";
  sbarScores.value = null;
  expandedSbarItems.value = [];
  showReasoning.value = false;
};

const goToHome = () => {
  // 实现回到主页的逻辑
  console.log('回到主页');
  router.push('/');
};

// 组件销毁时清理
onBeforeUnmount(async () => {
  // 停止录音
  if (isRecording.value) {
    await stopRecording();
  }
  
  // 停止音频流
  if (window.currentAudioStream) {
    window.currentAudioStream.getTracks().forEach(track => track.stop());
    window.currentAudioStream = null;
  }
  
  // 关闭STT会话
  if (sttSessionId) {
    try {
      await axios.post("/api/speech-to-text-stream", {
        action: 'close',
        sessionId: sttSessionId
      });
    } catch (error) {
      console.error('关闭STT会话失败:', error);
    }
  }
  
  // 销毁雷达图
  if (radarChart) {
    radarChart.destroy();
    radarChart = null;
  }
});

// 自动调整textarea高度
const adjustTextareaHeight = () => {
  const textarea = textareaRef.value;
  if (!textarea) return;
  
  // 重置高度以获取正确的scrollHeight
  textarea.style.height = 'auto';
  textarea.style.overflowY = 'hidden';
  
  // 计算行高和最大行数
  const lineHeight = 24; // 1.5 * 16px (text-sm的line-height)
  const padding = 24; // 上下padding各12px
  const minHeight = 48;  // 对应 min-h-[3rem] (3rem = 48px)
  const maxLines = 3;
  const maxHeight = padding + (lineHeight * maxLines); // 96px for 3 lines
  
  // 计算所需高度
  const scrollHeight = textarea.scrollHeight;
  const newHeight = Math.max(minHeight, scrollHeight);
  
  if (newHeight <= maxHeight) {
    // 在最大行数内，自动调整高度，不显示滚动条
    textarea.style.height = newHeight + 'px';
    textarea.style.overflowY = 'hidden';
  } else {
    // 超过最大行数，固定高度并显示滚动条
    textarea.style.height = maxHeight + 'px';
    textarea.style.overflowY = 'auto';
  }
};

// 插入换行符（Shift+Enter）
const insertNewline = () => {
  const textarea = textareaRef.value;
  if (!textarea) return;
  
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const value = userInput.value;
  
  userInput.value = value.substring(0, start) + '\n' + value.substring(end);
  
  // 下一帧设置光标位置和调整高度
  nextTick(() => {
    textarea.selectionStart = textarea.selectionEnd = start + 1;
    adjustTextareaHeight();
  });
};

// 生成PDF评估报告（使用HTML转图像方案，完美支持中文）
const generatePDFReport = async () => {
  try {
    // 确保PDF库已加载
    const librariesLoaded = await loadPDFLibraries();
    if (!librariesLoaded) {
      alert('PDF庫加載失敗，請重試');
      return;
    }

    console.log('🖼️ 正在生成PDF報告...');
    
    // 显示PDF内容用于截图
    const pdfContent = pdfContentRef.value;
    if (!pdfContent) {
      alert('PDF內容區域未找到，請重試');
      return;
    }
    
    pdfContent.style.display = 'block';
    
    // 等待DOM更新和字体加载
    await nextTick();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 使用html2canvas截图
    const canvas = await html2canvas(pdfContent, {
      scale: 2, // 提高清晰度
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      width: pdfContent.scrollWidth,
      height: pdfContent.scrollHeight,
      logging: false // 关闭日志
    });
    
    // 隐藏PDF内容
    pdfContent.style.display = 'none';
    
    // 创建PDF
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    const imgWidth = pdfWidth - 20; // 留边距
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    // 如果内容高度超过一页，需要分页
    if (imgHeight <= pdfHeight - 20) {
      // 单页
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 10, 10, imgWidth, imgHeight);
    } else {
      // 多页处理
      const pageHeight = pdfHeight - 20;
      const totalPages = Math.ceil(imgHeight / pageHeight);
      
      for (let i = 0; i < totalPages; i++) {
        if (i > 0) pdf.addPage();
        
        const sourceY = i * (canvas.height / totalPages);
        const sourceHeight = canvas.height / totalPages;
        
        // 创建临时canvas用于分页
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = canvas.width;
        tempCanvas.height = sourceHeight;
        
        tempCtx.drawImage(canvas, 0, sourceY, canvas.width, sourceHeight, 0, 0, canvas.width, sourceHeight);
        
        const tempImgHeight = (sourceHeight * imgWidth) / canvas.width;
        pdf.addImage(tempCanvas.toDataURL('image/png'), 'PNG', 10, 10, imgWidth, tempImgHeight);
      }
    }
    
    // 生成文件名
    const now = new Date();
    const sceneName = getCurrentSceneName();
    const fileName = `ISBAR評估報告_${sceneName}_${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}.pdf`;
    
    // 保存PDF
    pdf.save(fileName);
    
    console.log('✅ PDF報告生成成功:', fileName);
    alert('📄 PDF評估報告已成功生成並下載！支持完整中文顯示');
    
  } catch (error) {
    console.error('❌ 生成PDF報告失敗:', error);
    alert('生成PDF報告失敗：' + error.message);
    
    // 确保隐藏PDF内容
    if (pdfContentRef.value) {
      pdfContentRef.value.style.display = 'none';
    }
  }
};

// 错误捕获
onErrorCaptured((error, instance, info) => {
  console.error('❌ ChatBoxComponent 捕获到错误:', error);
  console.error('🔍 错误信息:', info);
  console.error('📍 错误实例:', instance);
  
  // 防止错误继续传播
  return false;
});


</script>

<style scoped>
.chat-box {
  z-index: 10;
  pointer-events: none; /* 让背景可以点击 */
}

.chat-box > div {
  pointer-events: auto; /* 恢复聊天框的点击事件 */
}

/* 添加响应式样式 */
@media (max-width: 768px) {
  .chat-box {
    position: fixed;
    right: 0;
    bottom: 0;
    top: auto;
    left: 0;
    padding: 0.5rem;
    align-items: flex-end;
  }
  
  .chat-box > div {
    width: 100%;
    height: 60vh;
  }
}

.messages-container {
  scrollbar-width: thin;
  scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
}

.messages-container::-webkit-scrollbar {
  width: 4px;
}

.messages-container::-webkit-scrollbar-track {
  background: transparent;
}

.messages-container::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.1);
  border-radius: 2px;
}

.message {
  transition: all 0.3s ease;
  word-wrap: break-word;
}

.message-content {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.btn-primary {
  /* height由h-14类控制，与语音按钮保持一致 */
  min-width: 4.5rem;
  color: white;
  padding-left: 1rem;
  padding-right: 1rem;
  border-radius: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  font-weight: 500;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
}

.btn-primary:hover {
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  transform: scale(1.05);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.fade-enter-active,
.fade-leave-active {
  transition: all 0.3s ease;
}

.fade-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.fade-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

.evaluation-results {
  animation: slideIn 0.5s ease;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 添加鼠标悬停效果 */
.message-content:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

/* 输入框激活状态 */
input:focus {
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

/* 发送按钮样式 */
.send-btn {
  border: none;
  cursor: pointer;
}

.send-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
}

.send-btn:active:not(:disabled) {
  transform: scale(0.95);
}

.send-btn:disabled {
  background: #9ca3af;
  transform: none;
}

/* 语音按钮样式 */
.voice-btn {
  position: relative;
  /* height由h-14类控制，确保与其他按钮一致 */
  border: none;
  border-radius: 1.5rem;
  font-weight: 600;
  font-size: 0.875rem;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
}

.voice-btn-normal {
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  box-shadow: 0 4px 14px 0 rgba(16, 185, 129, 0.4);
}

.voice-btn-normal:hover {
  background: linear-gradient(135deg, #059669, #047857);
  box-shadow: 0 6px 20px 0 rgba(16, 185, 129, 0.6);
  transform: translateY(-1px);
}

.voice-btn-normal:active {
  transform: scale(1.1) translateY(-2px);
  box-shadow: 0 8px 25px 0 rgba(16, 185, 129, 0.8);
}

.voice-btn-recording {
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: white;
  transform: scale(1.15);
  box-shadow: 0 8px 30px 0 rgba(239, 68, 68, 0.7);
  animation: pulse-recording 1.5s ease-in-out infinite;
}

.voice-btn-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  position: relative;
  z-index: 2;
}

.voice-icon {
  font-size: 1.25rem;
  display: block;
  line-height: 1;
}

.voice-text {
  font-size: 0.75rem;
  font-weight: 500;
  opacity: 0.9;
  line-height: 1;
  margin-top: 2px;
}

/* 波纹效果 */
.voice-ripple {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  transform: translate(-50%, -50%) scale(0);
  animation: ripple 2s linear infinite;
  z-index: 1;
}

.voice-ripple-delay {
  animation-delay: 1s;
}

@keyframes pulse-recording {
  0%, 100% {
    box-shadow: 0 8px 30px 0 rgba(239, 68, 68, 0.7);
  }
  50% {
    box-shadow: 0 12px 40px 0 rgba(239, 68, 68, 0.9);
  }
}

@keyframes ripple {
  0% {
    transform: translate(-50%, -50%) scale(0);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -50%) scale(2);
    opacity: 0;
  }
}

/* 禁用状态 */
.voice-btn:disabled {
  background: #9ca3af !important;
  transform: none !important;
  cursor: not-allowed;
  box-shadow: none !important;
  animation: none !important;
}

.voice-btn:disabled .voice-ripple {
  display: none;
}

/* 响应式输入框布局 */
@media (max-width: 640px) {
  .send-btn {
    min-width: 2.5rem;
    padding-left: 0.75rem;
    padding-right: 0.75rem;
  }
  
  .voice-btn {
    height: 3.5rem; /* 明确设置高度，与h-14类一致 */
  }
  
  .voice-icon {
    font-size: 1.1rem;
  }
  
  .voice-text {
    font-size: 0.7rem;
  }
  
  textarea {
    font-size: 0.875rem;
  }
  
  .chat-box > div {
    width: 100%;
    height: 70vh;
  }
}

/* Textarea样式增强 */
textarea {
  line-height: 1.5;
  word-wrap: break-word;
  white-space: pre-wrap;
  transition: height 0.15s ease-out;
}

textarea::placeholder {
  color: #9ca3af;
  opacity: 1;
}

textarea:focus::placeholder {
  opacity: 0.5;
}

/* 自定义滚动条样式 */
textarea::-webkit-scrollbar {
  width: 6px;
}

textarea::-webkit-scrollbar-track {
  background: transparent;
}

textarea::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 3px;
}

textarea::-webkit-scrollbar-thumb:hover {
  background-color: rgba(0, 0, 0, 0.3);
}

/* ISBAR雷达图样式 */
.radar-chart-container {
  height: 250px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sbar-radar-section {
  animation: slideInUp 0.5s ease-out;
}

.sbar-item {
  transition: all 0.2s ease;
}

.sbar-item:hover {
  transform: translateX(2px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.sbar-legend {
  background: rgba(249, 250, 251, 0.8);
  border-radius: 8px;
  padding: 8px;
}

@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 响应式调整 */
@media (max-width: 640px) {
  .radar-chart-container {
    height: 200px;
  }
  
  .sbar-legend {
    font-size: 0.7rem;
  }
  
  .sbar-item {
    padding: 0.5rem;
  }
}

/* PDF预览样式 */
.pdf-preview {
  display: none;
  background: white;
  padding: 40px;
  margin: 20px 0;
  font-family: 'Microsoft YaHei', 'SimHei', sans-serif;
  line-height: 1.6;
  color: #333;
  max-width: 800px;
}

.pdf-title {
  font-size: 24px;
  font-weight: bold;
  text-align: center;
  color: #2c3e50;
  margin-bottom: 30px;
  border-bottom: 2px solid #3498db;
  padding-bottom: 10px;
}

.pdf-section {
  margin-bottom: 25px;
}

.pdf-section-title {
  font-size: 18px;
  font-weight: bold;
  color: #e74c3c;
  margin-bottom: 10px;
}

.pdf-info {
  background: #f8f9fa;
  padding: 15px;
  border-radius: 5px;
  margin-bottom: 15px;
}

.pdf-score {
  font-size: 20px;
  font-weight: bold;
  color: #e74c3c;
  text-align: center;
  margin: 20px 0;
}

.sbar-dimension {
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 5px;
  padding: 15px;
  margin-bottom: 15px;
}

.sbar-dimension-title {
  font-size: 16px;
  font-weight: bold;
  color: #3498db;
  margin-bottom: 8px;
}

.sbar-score {
  font-weight: bold;
  margin-bottom: 8px;
}

.sbar-suggestion {
  color: #555;
  margin-bottom: 8px;
}

.sbar-reason {
  color: #777;
  font-style: italic;
  font-size: 14px;
}

.pdf-reasoning {
  background: #f8f9fa;
  padding: 15px;
  border-radius: 5px;
  white-space: pre-wrap;
  font-family: monospace;
  font-size: 14px;
  line-height: 1.4;
}

.conversation-item {
  margin-bottom: 15px;
  padding: 10px;
  border-radius: 5px;
}

.conversation-user {
  background: #e3f2fd;
  border-left: 4px solid #2196f3;
}

.conversation-ai {
  background: #f1f8e9;
  border-left: 4px solid #4caf50;
}

.conversation-role {
  font-weight: bold;
  margin-bottom: 5px;
}

.pdf-footer {
  text-align: center;
  margin-top: 30px;
  color: #7f8c8d;
  font-size: 12px;
  border-top: 1px solid #ecf0f1;
  padding-top: 15px;
}

/* 打字机和thinking效果样式 */
.thinking-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.thinking-dots {
  opacity: 0.7;
}

.thinking-animation {
  animation: thinking-pulse 1.5s ease-in-out infinite;
}

/* 等待音频状态样式 */
.waiting-audio-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.waiting-dots {
  opacity: 0.6;
}

.waiting-animation {
  animation: waiting-pulse 1.2s ease-in-out infinite;
}

@keyframes thinking-pulse {
  0%, 60%, 100% {
    opacity: 0.3;
  }
  30% {
    opacity: 1;
  }
}

@keyframes waiting-pulse {
  0%, 60%, 100% {
    opacity: 0.2;
  }
  30% {
    opacity: 0.8;
  }
}

/* 等待文本显示状态样式 */
.waiting-text-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #3b82f6 !important; /* 蓝色 */
}

.waiting-text-indicator .waiting-dots {
  opacity: 0.8;
  font-weight: 500;
}

.waiting-text-indicator .waiting-animation {
  animation: audio-playing-pulse 1s ease-in-out infinite;
}

@keyframes audio-playing-pulse {
  0%, 100% {
    opacity: 0.6;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.1);
  }
}

/* 打字机容器样式 */
.typewriter-container {
  min-height: 1.2em; /* 确保有最小高度 */
}

/* 打字机光标样式 */
.typewriter-container ::v-deep(.cursor) {
  animation: blink 1s infinite;
  color: #6b7280;
}

@keyframes blink {
  0%, 50% {
    opacity: 1;
  }
  51%, 100% {
    opacity: 0;
  }
}

/* 消息淡入动画 */
.fade-enter-active, .fade-leave-active {
  transition: all 0.3s ease;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

/* 评估摘要卡片样式 */
.evaluation-summary-card {
  position: relative;
  overflow: hidden;
}

.evaluation-summary-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  transition: left 0.5s ease;
}

.evaluation-summary-card:hover::before {
  left: 100%;
}

/* 按钮样式 */
.btn-primary {
  padding: 1rem 1rem;
  border-radius: 0.5rem;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
  opacity: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 500;
  color: white;
}

.btn-primary:hover {
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  transform: scale(1.05);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  transition: all 0.3s ease;
  opacity: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 500;
}

.btn-secondary:hover {
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  transform: scale(1.05);
}

.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>