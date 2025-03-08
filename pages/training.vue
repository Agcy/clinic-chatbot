<!-- 训练页面 -->
<template>
  <div class="chat-container">
    <ThreeDCharacter ref="characterRef" />
    <ChatBoxComponent :character-ref="characterRef" :current-scene="currentScene" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import ThreeDCharacter from "@/components/ThreeDCharacter.vue";
import ChatBoxComponent from "@/components/ChatBoxComponent.vue";

const router = useRouter();
const characterRef = ref(null);
const currentScene = ref(null);

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
</style> 