/**
 * @fileoverview 聊天框组件
 */

<template>
  <div class="chat-box fixed inset-x-0 bottom-0 p-4 pb-10 flex justify-center">
    <div class="w-[600px] rounded-2xl shadow-2xl overflow-visible bg-gradient-to-b from-white/90 to-white/80 backdrop-blur">
      <!-- 消息容器 -->
      <div class="messages-container h-[70vh] overflow-y-auto p-4 mb-2 rounded-t-2xl">
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
              class="message-content px-6 py-4 rounded-2xl max-w-[85%]"
              :class="msg.from === 'user' ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white' : 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800'"
            >
              {{ msg.text }}
            </div>
          </div>
        </transition-group>
        
        <!-- 评估结果显示区域 -->
        <div v-if="showEvaluation" class="evaluation-results bg-gradient-to-r from-yellow-50 to-orange-50 text-gray-800 rounded-2xl p-4 my-3 border border-yellow-200 shadow-lg">
          <h3 class="text-lg font-bold mb-3 text-yellow-700">訓練評估結果</h3>
          <div class="rating flex items-center mb-3">
            <span class="mr-2 font-medium">評分:</span>
            <div class="rating-stars flex items-center bg-white px-3 py-1 rounded-full shadow-sm">
              <span 
                v-for="i in 10" 
                :key="i" 
                :class="[
                  'transition-all duration-300 transform',
                  i <= evaluationRating ? 'text-yellow-400 scale-110' : 'text-gray-300'
                ]"
              >★</span>
              <span class="ml-2 font-bold text-yellow-600">{{ evaluationRating }}/10</span>
            </div>
          </div>
          <div class="evaluation-msg bg-white rounded-xl p-3 shadow-inner">
            <p class="text-sm font-medium text-gray-700 mb-1">改進建議:</p>
            <p class="text-sm text-gray-600 leading-relaxed">{{ evaluationMsg }}</p>
          </div>
        </div>
      </div>

      <!-- 输入区域 -->
      <div class="p-4 pt-2 pb-4 border-t border-gray-200/50">
        <form @submit.prevent="sendMessage" class="space-y-3">
          <div class="relative">
            <input
                v-model="userInput"
                type="text"
                placeholder="输入消息..."
                class="w-full px-6 py-4 bg-white/90 border border-gray-200 rounded-xl shadow-inner focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 outline-none"
                :disabled="trainingFinished"
            />
          </div>
          <div class="flex flex-wrap justify-center gap-3">
            <!-- 训练中按钮组 -->
            <template v-if="!trainingFinished">
              <button
                  type="button"
                  @click="startRecording"
                  :disabled="isRecording"
                  class="btn-primary bg-gradient-to-r from-green-500 to-green-600"
              >
                🎤 {{ isRecording ? "录音中" : "语音" }}
              </button>
              <button
                  type="button"
                  @click="stopRecording"
                  :disabled="!isRecording"
                  class="btn-primary bg-gradient-to-r from-red-500 to-red-600"
              >
                🛑 停止
              </button>
              <button
                  type="button"
                  @click="finishTraining"
                  :disabled="isEvaluating || messages.length === 0"
                  class="btn-primary bg-gradient-to-r from-purple-500 to-purple-600"
              >
                ✓ 完成训练
              </button>
            </template>
            
            <!-- 训练后按钮组 -->
            <template v-else>
              <button
                  v-if="!showEvaluation"
                  type="button"
                  @click="evaluateConversation"
                  :disabled="isEvaluating"
                  class="btn-primary bg-gradient-to-r from-blue-500 to-blue-600"
              >
                📝 {{ isEvaluating ? "評估中" : "評估" }}
              </button>
              <button
                  v-else
                  type="button"
                  @click="resetTraining"
                  class="btn-primary bg-gradient-to-r from-green-500 to-green-600 mr-2"
              >
                🔄 再次訓練
              </button>
              <button
                  v-if="showEvaluation"
                  type="button"
                  @click="goToHome"
                  class="btn-primary bg-gradient-to-r from-purple-500 to-purple-600"
              >
                🏠 回到主頁
              </button>
            </template>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, watch, onBeforeUnmount } from 'vue';
import axios from 'axios';
import { useRouter, useRoute } from 'vue-router';

const router = useRouter();
const route = useRoute();

const messages = ref([]);
const userInput = ref("");
const isRecording = ref(false);
const audioBlob = ref(null);
const trainingFinished = ref(false);
const isEvaluating = ref(false);
const showEvaluation = ref(false);
const evaluationRating = ref(0);
const evaluationMsg = ref("");
const currentSceneId = ref(null);

let mediaRecorder;
let audioChunks = [];
let storageListener = null;

// 清空聊天记录
const clearChat = async () => {
  console.log('清空聊天记录');
  messages.value = [];
  userInput.value = "";
  isRecording.value = false;
  audioBlob.value = null;
  trainingFinished.value = false;
  isEvaluating.value = false;
  showEvaluation.value = false;
  evaluationRating.value = 0;
  evaluationMsg.value = "";
  audioChunks = [];
  
  // 停止录音（如果在录音中）
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
  }
  
  // 清除服务器端的对话历史
  await clearServerHistory();
};

// 清除服务器端对话历史
const clearServerHistory = async () => {
  if (process.client) {
    try {
      // 清除默认对话
      await axios.post("/api/bailian", { 
        action: 'clearHistory',
        conversationId: 'default'
      });
      console.log('服务器端对话历史已清除');
    } catch (error) {
      console.error('清除服务器端对话历史失败:', error);
    }
  }
};

// 检查场景是否改变
const checkSceneChange = async () => {
  try {
    // 确保只在客户端环境中访问localStorage
    if (process.client) {
      const sceneData = localStorage.getItem('currentScene');
      if (sceneData) {
        const scene = JSON.parse(sceneData);
        // 如果场景ID改变，则清空聊天
        if (scene._id !== currentSceneId.value) {
          currentSceneId.value = scene._id;
          await clearChat();
        }
      } else {
        // 如果没有场景数据，也清空聊天
        currentSceneId.value = null;
        await clearChat();
      }
    }
  } catch (error) {
    console.error('检查场景变化时出错:', error);
  }
};

// 监听localStorage变化
const setupStorageListener = () => {
  // 确保只在客户端环境中设置事件监听
  if (process.client) {
    storageListener = (event) => {
      if (event.key === 'currentScene') {
        checkSceneChange().catch(error => {
          console.error('Storage listener error:', error);
        });
      }
    };
    window.addEventListener('storage', storageListener);
  }
};

// 监听路由变化
watch(() => route.path, async () => {
  await clearChat();
  await checkSceneChange();
}, { immediate: true });

// 组件挂载时
onMounted(async () => {
  let intervalId = null;
  
  try {
    await clearChat();
    
    // 确保只在客户端环境中执行
    if (process.client) {
      await checkSceneChange();
      setupStorageListener();
      
      // 立即检查场景
      intervalId = setInterval(() => {
        checkSceneChange().catch(error => {
          console.error('Interval check error:', error);
        });
      }, 1000); // 每秒检查一次场景变化
    }
  } catch (error) {
    console.error('组件挂载时出错:', error);
  }
  
  // 组件卸载时清除定时器
  onBeforeUnmount(() => {
    if (intervalId) {
      clearInterval(intervalId);
    }
    if (storageListener && process.client) {
      window.removeEventListener('storage', storageListener);
    }
  });
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
          if (scene._id !== currentSceneId.value) {
            isNewScene = true;
            // 清空之前可能存在的对话历史
            await axios.post("/api/bailian", { 
              action: 'clearHistory',
              conversationId: 'default'
            });
          }
          
          // 更新当前场景ID
          sceneId = scene._id;
          currentSceneId.value = scene._id;
        } catch (error) {
          console.error('解析场景数据失败:', error);
        }
      }
    }

    console.log('Sending message to API:', userMessage);
    const aiResponse = await axios.post("/api/bailian", { 
        message: userMessage,
        systemPrompt: systemPrompt,
        sceneId: sceneId,
        newScene: isNewScene
    });
    const reply = aiResponse?.data?.response || "I didn't understand that.";
    const aiMessage = {
      id: Date.now(),
      text: reply,
      from: 'ai'
    };
    messages.value.push(aiMessage);

    // Convert AI response to speech
    const speechResponse = await axios.post("/api/text-to-speech", { text: reply });
    const audioContent = speechResponse.data.audioContent;

    // Play the audio
    const audioBlob = new Blob([Uint8Array.from(atob(audioContent), c => c.charCodeAt(0))], { type: 'audio/mp3' });
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    audio.play();
  } catch (error) {
    console.error('Error sending message:', error);
    alert('發送消息失敗：' + error.message);
  }
};

const startRecording = async () => {
  if (trainingFinished.value) return;
  
  try {
    // 检查浏览器是否支持媒体设备API
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('您的瀏覽器不支持音頻錄製功能');
    }

    isRecording.value = true;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    const mimeType = getSupportedContentMimeType();
    if (!mimeType) {
      throw new Error('當前瀏覽器不支持任何音頻格式');
    }

    mediaRecorder = new MediaRecorder(stream, { mimeType });

    mediaRecorder.ondataavailable = (event) => {
      audioChunks.push(event.data);
    };

    mediaRecorder.onstop = async () => {
      const blob = new Blob(audioChunks, { type: mimeType });
      audioBlob.value = blob;
      audioChunks = [];

      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64Audio = reader.result.split(",")[1];
          const response = await axios.post("/api/speech-to-text", {
            audioData: base64Audio,
            mimeType: mimeType
          }, {
            headers: {
              'Content-Type': 'application/json'
            }
          });

          if (response.error) {
            console.error('语音识别失败:', response.error);
            return;
          }

          // 确保response.data是字符串类型
          const recognizedText = typeof response.data === 'string' ? response.data : 
                               response.data?.text || response.data?.transcription || 
                               String(response.data);
          
          userInput.value = recognizedText;
          if (recognizedText.trim()) {
            await sendMessage();
          }
        } catch (error) {
          console.error('处理音频时出错:', error);
        }
      };

      reader.readAsDataURL(blob);
    };

    mediaRecorder.start();
  } catch (error) {
    console.error('启动录音失败:', error);
    isRecording.value = false;
    alert(error.message || '無法訪問麥克風，請檢查權限設置');
  }
};

const stopRecording = () => {
  if (!mediaRecorder) {
    console.error('mediaRecorder未初始化');
    return;
  }

  isRecording.value = false;
  mediaRecorder.stop();
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
  return MediaRecorder.isTypeSupported('audio/webm')
      ? 'audio/webm'
      : MediaRecorder.isTypeSupported('audio/ogg')
          ? 'audio/ogg'
          : MediaRecorder.isTypeSupported('audio/mp4')
              ? 'audio/mp4'
              : null;
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
    // 过滤掉错误消息
    const validMessages = messages.value.filter(msg => msg.text !== "Error: Failed to send message.");

    // 准备对话数据
    const conversationData = {
      userId: 'root',
      scenarioId: 'vascular_tumor_001',
      messages: validMessages.map(msg => ({
        role: msg.from === 'user' ? 'trainer' : 'trainee',
        content: msg.text,
        timestamp: new Date()
      }))
    };

    // 调用评估API
    const response = await axios.post("/api/evaluate-conversation", conversationData);
    
    if (response.data.error) {
      throw new Error(response.data.error);
    }

    // 显示评估结果
    evaluationRating.value = response.data.rating;
    evaluationMsg.value = response.data.evaluation_msg;
    showEvaluation.value = true;

    console.log('评估成功：', response.data);
  } catch (error) {
    console.error('评估失败:', error);
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
};

const goToHome = () => {
  // 实现回到主页的逻辑
  console.log('回到主页');
  router.push('/');
};
</script>

<style scoped>
.chat-box {
  z-index: 2;
  padding-bottom: 4rem;
  margin-bottom: 1.5rem;
}

/* 添加响应式样式 */
@media (max-width: 768px) {
  .chat-box {
    padding: 0.5rem;
  }
  
  .chat-box > div {
    width: 100%;
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
  @apply h-10 min-w-[4.5rem] text-white px-4 rounded-xl flex items-center justify-center text-sm font-medium shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed;
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
</style>