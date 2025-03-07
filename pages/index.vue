<template>
  <div class="chat-container">
    <ThreeDCharacter ref="characterRef" />
    <ChatBoxComponent :character-ref="characterRef" />
  </div>
</template>

<script setup>
import { ref } from 'vue';
import ThreeDCharacter from "@/components/ThreeDCharacter.vue";
import ChatBoxComponent from "@/components/ChatBoxComponent.vue";

const characterRef = ref(null);
</script>

<style scoped>
.chat-container {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
}
</style>