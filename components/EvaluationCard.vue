/**
 * @fileoverview 评估结果卡片组件 - 从下而上升起的大卡片显示评估结果
 */

<template>
  <!-- 背景遮罩 -->
  <div 
    v-if="isVisible" 
    class="evaluation-overlay fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity duration-300"
    :class="{ 'opacity-100': showCard, 'opacity-0': !showCard }"
    @click="handleOverlayClick"
  >
    <!-- 评估卡片 -->
    <div 
      class="evaluation-card fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl transform transition-transform duration-500 ease-out max-h-[90vh] overflow-hidden flex flex-col"
      :class="{ 'translate-y-0': showCard, 'translate-y-full': !showCard }"
      @click.stop
    >
      <!-- 卡片拖拽指示器 -->
      <div class="card-handle w-12 h-1 bg-gray-300 rounded-full mx-auto mt-3 mb-4"></div>
      
      <!-- 卡片头部 -->
      <div class="card-header flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <h2 class="text-2xl font-bold text-gray-800 flex items-center gap-2">
          🎯 SBAR 訓練評估結果
        </h2>
        <button 
          @click="closeCard"
          class="text-gray-400 hover:text-gray-600 transition-colors p-2"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <!-- 卡片内容区域 - 可滚动 -->
      <div class="card-content flex-1 overflow-y-auto px-6 py-4">
        <!-- 总体评分区域 -->
        <div class="overall-rating bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-4 mb-6 border border-yellow-200">
          <div class="flex items-center justify-center mb-4">
            <div class="rating-display flex items-center bg-white px-6 py-3 rounded-full shadow-md">
              <span 
                v-for="i in 10" 
                :key="i" 
                :class="[
                  'text-2xl transition-all duration-300 transform',
                  i <= evaluationData.rating ? 'text-yellow-400 scale-110' : 'text-gray-300'
                ]"
              >★</span>
              <span class="ml-3 text-2xl font-bold text-yellow-600">{{ evaluationData.rating }}/10</span>
            </div>
          </div>
          
          <!-- 总体改进建议 -->
          <div class="improvement-suggestion bg-white rounded-xl p-4 shadow-inner">
            <h3 class="text-lg font-semibold text-gray-700 mb-2 flex items-center gap-2">
              💡 改進建議
            </h3>
            <p class="text-gray-600 leading-relaxed">{{ evaluationData.evaluation_msg }}</p>
          </div>
        </div>
        
        <!-- SBAR雷达图区域 -->
        <div v-if="evaluationData.sbar_scores" class="sbar-section bg-gray-50 rounded-xl p-4 mb-6">
          <h3 class="text-lg font-semibold text-gray-700 mb-4 text-center flex items-center justify-center gap-2">
            📊 SBAR 能力雷達圖
          </h3>
          
          <!-- 雷达图容器 -->
          <div class="radar-chart-container flex justify-center mb-4">
            <canvas ref="radarChartRef" width="350" height="350"></canvas>
          </div>
          
          <!-- SBAR维度详细评分 -->
          <div class="sbar-details grid grid-cols-1 gap-3">
            <div 
              v-for="(dimension, key) in evaluationData.sbar_scores" 
              :key="key"
              class="sbar-item bg-white rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
              @click="toggleSbarDetail(key)"
            >
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-3">
                  <span class="bg-blue-100 text-blue-600 font-bold px-3 py-1 rounded-full text-sm">
                    {{ getSbarLabel(key) }}
                  </span>
                  <span class="font-medium text-gray-700">{{ getSbarFullName(key) }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="font-bold text-xl" :class="getSbarScoreColor(dimension.rank)">
                    {{ dimension.rank }}/10
                  </span>
                  <svg 
                    :class="['w-5 h-5 transition-transform duration-200', expandedSbarItems.includes(key) ? 'rotate-180' : '']"
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              
              <!-- 展开的详细信息 -->
              <div v-show="expandedSbarItems.includes(key)" class="mt-4 pt-4 border-t border-gray-100 space-y-3">
                <div>
                  <p class="text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                    💡 改進建議:
                  </p>
                  <p class="text-sm text-gray-600 leading-relaxed bg-blue-50 p-3 rounded-lg">{{ dimension.message }}</p>
                </div>
                <div>
                  <p class="text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                    📝 評估理由:
                  </p>
                  <p class="text-sm text-gray-500 leading-relaxed bg-gray-50 p-3 rounded-lg">{{ dimension.reason }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 总体评估理由区域 -->
        <div v-if="evaluationData.reasoning" class="reasoning-section bg-blue-50 rounded-xl p-4 mb-6">
          <button 
            @click="showDetailedReasoning = !showDetailedReasoning"
            class="w-full text-left flex items-center justify-between p-2 hover:bg-blue-100 rounded-lg transition-colors"
          >
            <h3 class="text-lg font-semibold text-blue-700 flex items-center gap-2">
              📋 總體評估詳細理由
            </h3>
            <svg 
              :class="['w-5 h-5 transition-transform duration-200 text-blue-600', showDetailedReasoning ? 'rotate-180' : '']"
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <div 
            v-show="showDetailedReasoning" 
            class="reasoning-content bg-white rounded-lg p-4 mt-3 shadow-inner border border-blue-100 max-h-48 overflow-y-auto"
          >
            <pre class="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap font-mono">{{ evaluationData.reasoning }}</pre>
          </div>
        </div>
        
        <!-- 对话记录区域 -->
        <div v-if="conversationData && conversationData.length > 0" class="conversation-section bg-gray-50 rounded-xl p-4 mb-6">
          <h3 class="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
            💬 對話記錄
          </h3>
          <div class="conversation-list space-y-3 max-h-64 overflow-y-auto">
            <div 
              v-for="(msg, index) in conversationData" 
              :key="index"
              class="conversation-item p-3 rounded-lg"
              :class="msg.from === 'user' ? 'bg-blue-100 ml-6' : 'bg-white mr-6'"
            >
              <div class="flex items-center gap-2 mb-1">
                <span class="font-medium text-sm" :class="msg.from === 'user' ? 'text-blue-700' : 'text-gray-700'">
                  {{ msg.from === 'user' ? '👤 醫生' : '🤖 病人' }}
                </span>
                <span class="text-xs text-gray-500">
                  {{ formatMessageTime(msg.timestamp) }}
                </span>
              </div>
              <p class="text-sm text-gray-800 leading-relaxed">{{ msg.text }}</p>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 卡片底部按钮区域 -->
      <div class="card-footer bg-gray-50 px-6 py-4 border-t border-gray-200">
        <div class="flex gap-3 justify-center">
          <button
            @click="handleRetryTraining"
            class="btn-action bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-all duration-300 flex items-center gap-2"
          >
            🔄 再次對話
          </button>
          <button
            @click="handleGeneratePDF"
            class="btn-action bg-gradient-to-r from-orange-500 to-orange-600 text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-all duration-300 flex items-center gap-2"
          >
            📄 保存PDF
          </button>
          <button
            @click="handleGoHome"
            class="btn-action bg-gradient-to-r from-purple-500 to-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-all duration-300 flex items-center gap-2"
          >
            🏠 回到主頁
          </button>
        </div>
      </div>
    </div>
  </div>
  
  <!-- PDF预览内容（隐藏，用于生成PDF） -->
  <div id="pdf-content" ref="pdfContentRef" class="pdf-preview">
    <div class="pdf-title">SBAR 醫療對話評估報告</div>
    
    <div class="pdf-info">
      <div><strong>場景名稱:</strong> {{ getCurrentSceneName() }}</div>
      <div v-if="getCurrentSceneDescription()"><strong>場景描述:</strong> {{ getCurrentSceneDescription() }}</div>
      <div><strong>生成時間:</strong> {{ getCurrentDateTime() }}</div>
    </div>

    <div class="pdf-section">
      <div class="pdf-section-title">📊 總體評估結果</div>
      <div class="pdf-score">評分: {{ evaluationData.rating }}/10</div>
      <div><strong>改進建議:</strong></div>
      <div>{{ evaluationData.evaluation_msg }}</div>
    </div>

    <div v-if="evaluationData.sbar_scores" class="pdf-section">
      <div class="pdf-section-title">🎯 SBAR 各維度詳細評估</div>
      
      <!-- SBAR雷达图容器 -->
      <div class="pdf-radar-chart" style="text-align: center; margin: 20px 0;">
        <div style="font-weight: bold; margin-bottom: 10px; color: #2d3748;">📊 SBAR 能力雷達圖</div>
        <!-- 雷达图将通过JavaScript动态插入到这里 -->
      </div>
      
      <div 
        v-for="(dimension, key) in evaluationData.sbar_scores" 
        :key="key"
        class="sbar-dimension"
      >
        <div class="sbar-dimension-title">{{ getSbarLabel(key) }} - {{ getSbarFullName(key) }}</div>
        <div class="sbar-score" :style="{ color: getSbarScoreColorHex(dimension.rank) }">評分: {{ dimension.rank }}/10</div>
        <div class="sbar-suggestion"><strong>💡 改進建議:</strong> {{ dimension.message }}</div>
        <div class="sbar-reason"><strong>📝 評估理由:</strong> {{ dimension.reason }}</div>
      </div>
    </div>

    <div v-if="evaluationData.reasoning" class="pdf-section">
      <div class="pdf-section-title">📋 總體評估詳細理由</div>
      <div class="pdf-reasoning">{{ evaluationData.reasoning }}</div>
    </div>

    <div v-if="conversationData && conversationData.length > 0" class="pdf-section">
      <div class="pdf-section-title">💬 對話記錄</div>
      
      <div 
        v-for="(msg, index) in conversationData" 
        :key="index"
        class="conversation-item"
        :class="msg.from === 'user' ? 'conversation-user' : 'conversation-ai'"
      >
        <div class="conversation-role">{{ msg.from === 'user' ? '👤 醫生:' : '🤖 病人:' }}</div>
        <div>{{ msg.text }}</div>
      </div>
    </div>

    <div class="pdf-footer">
      SBAR 醫療對話訓練系統 - 專業醫療溝通能力評估平台
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, watch, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';

// 定义组件props
const props = defineProps({
  isVisible: {
    type: Boolean,
    default: false
  },
  evaluationData: {
    type: Object,
    required: true
  },
  conversationData: {
    type: Array,
    default: () => []
  }
});

// 定义组件事件
const emit = defineEmits(['close', 'retry-training', 'generate-pdf', 'go-home']);

const router = useRouter();

// 响应式数据
const showCard = ref(false);
const showDetailedReasoning = ref(false);
const expandedSbarItems = ref([]);
const radarChartRef = ref(null);
const pdfContentRef = ref(null);

// 动态导入PDF相关库
let jsPDF = null;
let html2canvas = null;
let radarChart = null; // Chart.js实例

// 监听可见性变化
watch(() => props.isVisible, (newVal) => {
  if (newVal) {
    // 延迟显示卡片以实现动画效果
    setTimeout(() => {
      showCard.value = true;
    }, 100);
    
    // 初始化雷达图
    if (props.evaluationData.sbar_scores) {
      nextTick(() => {
        initRadarChart();
      });
    }
  } else {
    showCard.value = false;
  }
});

// 动态加载Chart.js和PDF库
const loadLibraries = async () => {
  // 加载Chart.js
  if (typeof Chart === 'undefined') {
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.min.js';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
  
  // 加载PDF库
  if (typeof window !== 'undefined') {
    try {
      const jsPDFModule = await import('jspdf');
      jsPDF = jsPDFModule.jsPDF;
      
      const html2canvasModule = await import('html2canvas');
      html2canvas = html2canvasModule.default;
    } catch (error) {
      console.error('❌ PDF库加载失败:', error);
    }
  }
};

// SBAR相关辅助函数
const getSbarLabel = (key) => {
  const labels = {
    'Situation': 'S',
    'Background': 'B',
    'Assessment': 'A',
    'Recommendation': 'R'
  };
  return labels[key] || key;
};

const getSbarFullName = (key) => {
  const names = {
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

const getSbarScoreColorHex = (score) => {
  if (score >= 8) return '#16a34a'; // green-600
  if (score >= 6) return '#ca8a04'; // yellow-600
  if (score >= 4) return '#ea580c'; // orange-600
  return '#dc2626'; // red-600
};

// 时间格式化
const formatMessageTime = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
};

// 获取当前场景信息
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

const getCurrentDateTime = () => {
  return new Date().toLocaleString('zh-TW');
};

// 初始化雷达图
const initRadarChart = async () => {
  if (!radarChartRef.value || !props.evaluationData.sbar_scores) return;
  
  await loadLibraries();
  
  if (typeof Chart === 'undefined') {
    console.error('Chart.js未加载');
    return;
  }
  
  try {
    // 销毁现有图表
    if (radarChart) {
      radarChart.destroy();
    }
    
    const ctx = radarChartRef.value.getContext('2d');
    const sbarScores = props.evaluationData.sbar_scores;
    
    // 准备数据
    const labels = ['S (情況)', 'B (背景)', 'A (評估)', 'R (建議)'];
    const data = [
      sbarScores.Situation?.rank || 0,
      sbarScores.Background?.rank || 0,
      sbarScores.Assessment?.rank || 0,
      sbarScores.Recommendation?.rank || 0
    ];
    
    radarChart = new Chart(ctx, {
      type: 'radar',
      data: {
        labels: labels,
        datasets: [{
          label: 'SBAR 評分',
          data: data,
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 2,
          pointBackgroundColor: 'rgb(59, 130, 246)',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            display: false
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
                size: 12
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
              padding: 20,
              font: {
                size: 14,
                weight: 'bold'
              },
              color: '#4299e1'
            }
          }
        }
      }
    });
  } catch (error) {
    console.error('❌ 初始化雷达图失败:', error);
  }
};

// 切换SBAR详情展开/折叠
const toggleSbarDetail = (key) => {
  const index = expandedSbarItems.value.indexOf(key);
  if (index > -1) {
    expandedSbarItems.value.splice(index, 1);
  } else {
    expandedSbarItems.value.push(key);
  }
};

// 事件处理函数
const closeCard = () => {
  showCard.value = false;
  setTimeout(() => {
    emit('close');
  }, 500);
};

const handleOverlayClick = () => {
  closeCard();
};

const handleRetryTraining = () => {
  emit('retry-training');
  closeCard();
};

const handleGeneratePDF = async () => {
  await loadLibraries();
  
  if (!jsPDF || !html2canvas) {
    alert('PDF生成库未加载，请稍后再试');
    return;
  }
  
  try {
    console.log('🖼️ 正在生成PDF報告...');
    
    // 显示PDF内容用于截图
    const pdfContent = pdfContentRef.value;
    if (!pdfContent) {
      alert('PDF內容區域未找到，請重試');
      return;
    }
    
    // 临时显示PDF内容
    pdfContent.style.position = 'fixed';
    pdfContent.style.top = '0';
    pdfContent.style.left = '0';
    pdfContent.style.zIndex = '9999';
    pdfContent.style.backgroundColor = 'white';
    pdfContent.style.display = 'block';
    
    // 等待DOM更新和字体加载
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 如果有雷达图，先将其转换为图片并插入PDF内容中
    if (radarChart && props.evaluationData.sbar_scores) {
      const radarImageContainer = pdfContent.querySelector('.pdf-radar-chart');
      if (radarImageContainer) {
        try {
          // 获取雷达图的canvas
          const radarCanvas = radarChartRef.value;
          if (radarCanvas) {
            console.log('📊 正在处理雷达图...');
            
            // 创建雷达图的图片
            const radarImageData = radarCanvas.toDataURL('image/png');
            
            // 创建img元素并插入到PDF内容中
            const radarImg = document.createElement('img');
            radarImg.src = radarImageData;
            radarImg.style.width = '350px';
            radarImg.style.height = 'auto';
            radarImg.style.display = 'block';
            radarImg.style.margin = '0 auto';
            
            // 清空容器并插入图片
            radarImageContainer.innerHTML = '';
            radarImageContainer.appendChild(radarImg);
            
            // 等待图片加载
            await new Promise(resolve => {
              radarImg.onload = resolve;
              radarImg.onerror = resolve; // 即使失败也继续
            });
            
            console.log('✅ 雷达图已插入PDF内容');
          }
        } catch (radarError) {
          console.warn('⚠️ 雷达图处理失败，将跳过:', radarError);
        }
      }
    }
    
    // 再次等待确保所有内容都已渲染
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
    pdfContent.style.position = 'fixed';
    pdfContent.style.top = '-9999px';
    pdfContent.style.left = '-9999px';
    pdfContent.style.zIndex = '-1';
    
    // 创建PDF
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    // 调整边距，增加更多可用空间
    const margins = { top: 15, bottom: 15, left: 10, right: 10 };
    const imgWidth = pdfWidth - margins.left - margins.right;
    const availableHeight = pdfHeight - margins.top - margins.bottom;
    
    // 计算图片在PDF中的高度
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    console.log(`📐 PDF尺寸信息:`, {
      pdfWidth: pdfWidth.toFixed(2),
      pdfHeight: pdfHeight.toFixed(2),
      availableHeight: availableHeight.toFixed(2),
      imgWidth: imgWidth.toFixed(2),
      imgHeight: imgHeight.toFixed(2),
      canvasSize: `${canvas.width}x${canvas.height}`
    });
    
    // 如果内容高度小于等于一页可用高度，直接放在一页
    if (imgHeight <= availableHeight) {
      console.log('📄 单页PDF');
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', margins.left, margins.top, imgWidth, imgHeight);
    } else {
      console.log('📄 多页PDF');
      
      // 优化分页算法：确保页面充分利用
      const ratio = canvas.width / canvas.height;
      const maxCanvasHeightPerPage = (availableHeight * canvas.width) / imgWidth;
      
      // 计算最优的分页方案
      let canvasHeightPerPage = maxCanvasHeightPerPage;
      let totalPages = Math.ceil(canvas.height / canvasHeightPerPage);
      
      // 调整分页，确保页面利用率更高
      if (totalPages > 1) {
        const averageHeightPerPage = canvas.height / totalPages;
        if (averageHeightPerPage < canvasHeightPerPage * 0.7) {
          // 如果平均高度太小，减少页数
          totalPages = Math.max(1, totalPages - 1);
          canvasHeightPerPage = canvas.height / totalPages;
        }
      }
      
      console.log(`📄 分页信息: 总页数 ${totalPages}, 每页canvas高度 ${canvasHeightPerPage.toFixed(2)}, 最大高度 ${maxCanvasHeightPerPage.toFixed(2)}`);
      
      for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
        if (pageIndex > 0) {
          pdf.addPage();
        }
        
        // 计算当前页的源区域，确保精确分页
        let sourceY = Math.floor(pageIndex * canvasHeightPerPage);
        const remainingHeight = canvas.height - sourceY;
        let currentPageCanvasHeight = Math.min(canvasHeightPerPage, remainingHeight);
        
        // 智能分页：确保最后一页不会太小，避免浪费空间
        if (pageIndex === totalPages - 1) {
          currentPageCanvasHeight = remainingHeight;
        } else if (pageIndex === totalPages - 2 && remainingHeight < canvasHeightPerPage * 1.5) {
          // 如果倒数第二页和最后一页的总高度不大，合并到这一页
          currentPageCanvasHeight = remainingHeight;
        }
        
        // 确保不会超出原始canvas边界
        currentPageCanvasHeight = Math.min(currentPageCanvasHeight, canvas.height - sourceY);
        
        // 计算当前页在PDF中的高度
        const currentPagePdfHeight = (currentPageCanvasHeight * imgWidth) / canvas.width;
        
        // 确保不超过页面可用高度
        const finalPdfHeight = Math.min(currentPagePdfHeight, availableHeight);
        
        console.log(`📄 第${pageIndex + 1}页:`, {
          sourceY: sourceY.toFixed(2),
          currentPageCanvasHeight: currentPageCanvasHeight.toFixed(2),
          currentPagePdfHeight: currentPagePdfHeight.toFixed(2),
          finalPdfHeight: finalPdfHeight.toFixed(2)
        });
        
        // 创建临时canvas用于当前页
        const pageCanvas = document.createElement('canvas');
        const pageCtx = pageCanvas.getContext('2d');
        
        // 设置临时canvas的尺寸，使用高分辨率
        const scaleFactor = 2; // 提高分辨率避免模糊
        pageCanvas.width = canvas.width * scaleFactor;
        pageCanvas.height = currentPageCanvasHeight * scaleFactor;
        
        // 缩放上下文
        pageCtx.scale(scaleFactor, scaleFactor);
        
        // 填充白色背景
        pageCtx.fillStyle = '#ffffff';
        pageCtx.fillRect(0, 0, canvas.width, currentPageCanvasHeight);
        
        // 绘制当前页的内容，确保不会超出边界
        const actualSourceHeight = Math.min(currentPageCanvasHeight, canvas.height - sourceY);
        pageCtx.drawImage(
          canvas,
          0, sourceY, canvas.width, actualSourceHeight,  // 源区域
          0, 0, canvas.width, actualSourceHeight        // 目标区域
        );
        
        // 将当前页添加到PDF，使用finalPdfHeight
        const pageImageData = pageCanvas.toDataURL('image/png', 0.95);
        pdf.addImage(pageImageData, 'PNG', margins.left, margins.top, imgWidth, finalPdfHeight);
        
        // 清理临时canvas
        pageCanvas.remove();
      }
    }
    
    // 生成文件名
    const now = new Date();
    const sceneName = getCurrentSceneName();
    const fileName = `SBAR評估報告_${sceneName}_${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}.pdf`;
    
    // 保存PDF
    pdf.save(fileName);
    
    console.log('✅ PDF報告生成成功:', fileName);
    alert('📄 PDF評估報告已成功生成並下載！包含完整的SBAR雷達圖');
    
  } catch (error) {
    console.error('❌ 生成PDF報告失敗:', error);
    alert('生成PDF報告失敗：' + error.message);
    
    // 确保隐藏PDF内容
    if (pdfContentRef.value) {
      pdfContentRef.value.style.display = 'none';
      pdfContentRef.value.style.position = 'fixed';
      pdfContentRef.value.style.top = '-9999px';
      pdfContentRef.value.style.left = '-9999px';
      pdfContentRef.value.style.zIndex = '-1';
    }
  }
};

const handleGoHome = () => {
  emit('go-home');
  closeCard();
};

// 组件挂载时加载库
onMounted(() => {
  loadLibraries();
});

// 组件卸载时清理
onBeforeUnmount(() => {
  if (radarChart) {
    radarChart.destroy();
  }
});
</script>

<style scoped>
.evaluation-overlay {
  z-index: 1000;
}

.evaluation-card {
  max-width: 100vw;
  min-height: 60vh;
}

.card-content {
  scrollbar-width: thin;
  scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
}

.card-content::-webkit-scrollbar {
  width: 6px;
}

.card-content::-webkit-scrollbar-track {
  background: transparent;
}

.card-content::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 3px;
}

.btn-action {
  min-width: 120px;
  transition: all 0.3s ease;
}

.btn-action:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
}

.conversation-list {
  scrollbar-width: thin;
  scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
}

.conversation-list::-webkit-scrollbar {
  width: 4px;
}

.conversation-list::-webkit-scrollbar-track {
  background: transparent;
}

.conversation-list::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 2px;
}

/* PDF样式 */
.pdf-preview {
  position: fixed;
  top: -9999px;
  left: -9999px;
  width: 800px;
  background: white;
  padding: 40px;
  font-family: 'Arial', sans-serif;
  line-height: 1.6;
  color: #333;
}

.pdf-title {
  text-align: center;
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 30px;
  color: #2d3748;
  border-bottom: 3px solid #4299e1;
  padding-bottom: 10px;
}

.pdf-info {
  background: #f7fafc;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 25px;
  border-left: 4px solid #4299e1;
}

.pdf-info > div {
  margin-bottom: 8px;
}

.pdf-section {
  margin-bottom: 25px;
  padding: 20px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

.pdf-section-title {
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 15px;
  color: #2d3748;
  border-bottom: 2px solid #e2e8f0;
  padding-bottom: 8px;
}

.pdf-score {
  font-size: 20px;
  font-weight: bold;
  color: #d69e2e;
  margin-bottom: 15px;
  text-align: center;
  background: #fffbeb;
  padding: 10px;
  border-radius: 6px;
}

.sbar-dimension {
  margin-bottom: 20px;
  padding: 15px;
  background: #f9f9f9;
  border-radius: 6px;
  border-left: 4px solid #4299e1;
}

.sbar-dimension-title {
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 8px;
  color: #2d3748;
}

.sbar-score {
  font-weight: bold;
  margin-bottom: 8px;
}

.sbar-suggestion, .sbar-reason {
  margin-bottom: 8px;
  font-size: 14px;
}

.pdf-reasoning {
  background: #f7fafc;
  padding: 15px;
  border-radius: 6px;
  font-family: monospace;
  white-space: pre-wrap;
  font-size: 12px;
  line-height: 1.4;
}

.conversation-item {
  margin-bottom: 15px;
  padding: 12px;
  border-radius: 6px;
}

.conversation-user {
  background: #ebf8ff;
  border-left: 4px solid #4299e1;
}

.conversation-ai {
  background: #f7fafc;
  border-left: 4px solid #718096;
}

.conversation-role {
  font-weight: bold;
  margin-bottom: 5px;
  color: #2d3748;
}

.pdf-footer {
  text-align: center;
  margin-top: 30px;
  padding-top: 20px;
  border-top: 2px solid #e2e8f0;
  color: #718096;
  font-size: 12px;
}

.pdf-radar-chart {
  margin: 25px 0;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.pdf-radar-chart img {
  max-width: 100%;
  height: auto;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .evaluation-card {
    border-radius: 20px 20px 0 0;
    max-height: 95vh;
  }
  
  .card-footer {
    padding: 16px;
  }
  
  .card-footer .btn-action {
    padding: 12px 16px;
    font-size: 14px;
    min-width: 100px;
  }
  
  .radar-chart-container canvas {
    max-width: 300px;
    max-height: 300px;
  }
}
</style>