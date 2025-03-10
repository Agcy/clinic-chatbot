<template>
  <div class="chat-box fixed inset-x-0 bottom-0 bg-transparent p-4 pb-10">
    <div class="max-w-md mx-auto bg-transparent rounded-lg shadow-none overflow-visible">
      <div class="p-3 pb-2">
        <transition-group name="fade" tag="div">
          <div
              v-for="(msg, index) in visibleMessages"
              :key="msg.id"
              class="message mb-3 p-2 rounded-lg"
              :class="msg.from === 'user' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'"
          >
            {{ msg.text }}
          </div>
        </transition-group>
        
        <!-- 评估结果显示区域 -->
        <div v-if="showEvaluation" class="evaluation-results bg-yellow-50 text-gray-800 rounded-lg p-3 my-2 border border-yellow-200">
          <h3 class="text-lg font-semibold mb-2">訓練評估結果</h3>
          <div class="rating flex items-center mb-2">
            <span class="mr-2">評分:</span>
            <div class="rating-stars flex">
              <span 
                v-for="i in 10" 
                :key="i" 
                :class="i <= evaluationRating ? 'text-yellow-500' : 'text-gray-300'"
              >★</span>
              <span class="ml-2 font-bold">{{ evaluationRating }}/10</span>
            </div>
          </div>
          <div class="evaluation-msg">
            <p class="text-sm font-medium">改進建議:</p>
            <p class="text-sm">{{ evaluationMsg }}</p>
          </div>
        </div>
      </div>
      <div class="bg-transparent p-3 pt-2 pb-8">
        <form @submit.prevent="sendMessage">
          <div class="flex flex-col md:flex-row items-center gap-3">
            <input
                v-model="userInput"
                type="text"
                placeholder="Type a message"
                class="w-full md:flex-1 border border-gray-300 rounded-full px-4 py-2"
                :disabled="trainingFinished"
            />
            <div class="flex flex-wrap justify-center gap-2 w-full md:w-auto">
              <!-- 训练中按钮组 -->
              <template v-if="!trainingFinished">
                <button
                    type="button"
                    @click="startRecording"
                    :disabled="isRecording"
                    class="h-12 min-w-[4.5rem] bg-green-500 text-white px-2 rounded-full flex items-center justify-center text-sm whitespace-nowrap shadow-md"
                >
                  🎤 {{ isRecording ? "录音中" : "语音" }}
                </button>
                <button
                    type="button"
                    @click="stopRecording"
                    :disabled="!isRecording"
                    class="h-12 min-w-[4.5rem] bg-red-500 text-white px-2 rounded-full flex items-center justify-center text-sm whitespace-nowrap shadow-md"
                >
                  🛑 停止
                </button>
                <button
                    type="button"
                    @click="finishTraining"
                    :disabled="isEvaluating || messages.length === 0"
                    class="h-12 min-w-[6rem] bg-purple-500 text-white px-2 rounded-full flex items-center justify-center text-sm whitespace-nowrap shadow-md"
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
                    class="h-12 min-w-[6rem] bg-blue-500 text-white px-2 rounded-full flex items-center justify-center text-sm whitespace-nowrap shadow-md"
                >
                  📝 {{ isEvaluating ? "評估中" : "評估" }}
                </button>
                <button
                    v-else
                    type="button"
                    @click="resetTraining"
                    class="h-12 min-w-[6rem] bg-green-500 text-white px-2 rounded-full flex items-center justify-center text-sm whitespace-nowrap shadow-md mr-2"
                >
                  🔄 再次訓練
                </button>
                <button
                    v-if="showEvaluation"
                    type="button"
                    @click="goToHome"
                    class="h-12 min-w-[6rem] bg-purple-500 text-white px-2 rounded-full flex items-center justify-center text-sm whitespace-nowrap shadow-md"
                >
                  🏠 回到主頁
                </button>
              </template>
            </div>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import axios from 'axios';
import ThreeDCharacter from '@/components/ThreeDCharacter.vue';
import { useRouter } from 'vue-router';

// 定义props接收父组件传来的characterRef和currentScene
const props = defineProps({
  characterRef: {
    type: Object,
    default: null
  },
  currentScene: {
    type: Object,
    required: true
  }
});

const router = useRouter();

const messages = ref([]);
const userInput = ref("");
const isRecording = ref(false);
const audioBlob = ref(null);
const trainingFinished = ref(false);
const isEvaluating = ref(false);
const showEvaluation = ref(false);
const evaluationRating = ref(0);
const evaluationMsg = ref("");

let mediaRecorder;
let audioChunks = [];

const visibleMessages = ref([]);

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
  visibleMessages.value.push(newMessage);

  if (visibleMessages.value.length > 2) {
    visibleMessages.value.shift();
  }

  userInput.value = "";

  try {
    console.log('Sending message to API:', userMessage);
    const aiResponse = await axios.post("/api/bailian", { 
        message: userMessage,
        systemPrompt: props.currentScene.scene_description_model
    });
    const reply = aiResponse?.data?.response || "I didn't understand that.";
    const aiMessage = {
      id: Date.now(),
      text: reply,
      from: 'ai'
    };
    messages.value.push(aiMessage);
    visibleMessages.value.push(aiMessage);

    // Convert AI response to speech
    const speechResponse = await axios.post("/api/text-to-speech", { text: reply });
    const audioContent = speechResponse.data.audioContent;

    // Play the audio
    const audioBlob = new Blob([Uint8Array.from(atob(audioContent), c => c.charCodeAt(0))], { type: 'audio/mp3' });
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    audio.play();

    // Trigger speaking animation
    if (props.characterRef?.value) {
      props.characterRef.value.speak(reply);
    }
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
const resetTraining = () => {
  messages.value = [];
  visibleMessages.value = [];
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
  z-index: 2; /* 确保聊天框在3D模型之上 */
  backdrop-filter: blur(10px); /* 添加模糊效果 */
  padding-bottom: 4rem; /* 增加底部间距，确保按钮完全可见 */
  margin-bottom: 1.5rem; /* 添加外边距，防止内容被底部导航栏遮挡 */
}

.message {
  transition: opacity 0.5s ease; /* 淡入淡出效果 */
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.5s ease;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

.evaluation-results {
  animation: fadeIn 0.5s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* 移动设备上的响应式调整 */
@media (max-width: 640px) {
  .chat-box {
    padding-bottom: 5rem;
    margin-bottom: 2rem;
  }
}
</style>