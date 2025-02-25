<template>
  <div class="chat-container">
    <ThreeDCharacter ref="characterRef" />
    <ChatBoxComponent />
  </div>
</template>

<script setup>
import ThreeDCharacter from "@/components/ThreeDCharacter.vue";
import ChatBoxComponent from "@/components/ChatBoxComponent.vue";
</script>

<style scoped>
.chat-container {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
}
</style>