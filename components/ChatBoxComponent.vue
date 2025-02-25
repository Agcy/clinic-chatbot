<template>
  <div class="chat-box fixed inset-x-0 bottom-0 bg-transparent p-4">
    <div class="max-w-md mx-auto bg-transparent rounded-lg shadow-none overflow-hidden">
      <div class="p-4">
        <transition-group name="fade" tag="div">
          <div
              v-for="(msg, index) in visibleMessages"
              :key="msg.id"
              class="message mb-4 p-2 rounded-lg"
              :class="msg.from === 'user' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'"
          >
            {{ msg.text }}
          </div>
        </transition-group>
      </div>
      <div class="bg-transparent p-4">
        <form @submit.prevent="sendMessage">
          <div class="flex items-center">
            <input
                v-model="userInput"
                type="text"
                placeholder="Type a message"
                class="flex-1 border border-gray-300 rounded-full px-4 py-2 mr-2"
            />
            <button
                type="button"
                @click="startRecording"
                :disabled="isRecording"
                class="bg-green-500 text-white px-4 py-2 rounded-full"
            >
              🎤 {{ isRecording ? "Listening..." : "Speak" }}
            </button>
            <button
                type="button"
                @click="stopRecording"
                :disabled="!isRecording"
                class="bg-red-500 text-white px-4 py-2 rounded-full ml-2"
            >
              🛑 Stop
            </button>
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

const messages = ref([]);
const userInput = ref("");
const isRecording = ref(false);
const audioBlob = ref(null);

let mediaRecorder;
let audioChunks = [];

const visibleMessages = ref([]);

const characterRef = ref(null);

const sendMessage = async () => {
  const userMessage = userInput.value.trim();
  if (!userMessage) {
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
    const aiResponse = await axios.post("/api/bailian1", { message: userMessage });
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
    characterRef.value.speak(reply);
  } catch (error) {
    console.error('Error sending message:', error);
    messages.value.push({ id: Date.now(), text: "Error: Failed to send message.", from: 'user' });
  }
};

const startRecording = async () => {
  isRecording.value = true;
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

  const mimeType = getSupportedContentMimeType();
  if (!mimeType) {
    console.error('当前浏览器不支持任何音频格式');
    return;
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
          messages.value.push({ id: Date.now(), text: "Error: Speech recognition failed.", from: 'user' });
          return;
        }

        userInput.value = response.data;
        sendMessage();
      } catch (error) {
        console.error('Error processing audio:', error);
      }
    };

    reader.readAsDataURL(blob);
  };

  mediaRecorder.start();
};

const stopRecording = () => {
  if (!mediaRecorder) {
    console.error('mediaRecorder未初始化');
    return;
  }

  isRecording.value = false;
  mediaRecorder.stop();
};

// const downloadAudio = ()```vue
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
</script>

<style scoped>
.chat-box {
  z-index: 2; /* 确保聊天框在3D模型之上 */
  //backdrop-filter: blur(10px); /* 添加模糊效果 */
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
</style>