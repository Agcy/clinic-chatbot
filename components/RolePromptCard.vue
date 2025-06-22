<!-- 角色提示卡片组件 -->
<template>
  <div class="role-prompt-card" :class="{ 'collapsed': isCollapsed }">
    <div class="card-header" @click="toggleCard">
      <div class="header-left">
        <span class="card-icon">👤</span>
        <h3 class="card-title">角色提示</h3>
      </div>
      <span class="toggle-icon" :class="{ 'rotated': !isCollapsed }">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M7 10L12 15L17 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </span>
    </div>
    
    <transition name="card-content">
      <div class="card-content" v-if="!isCollapsed">
        <div class="role-info">
          <div class="role-label">您的角色</div>
          <div class="role-name">{{ roleCharacter || '醫生' }}</div>
        </div>
        
        <div class="description-content">
          <div class="description-label">角色描述</div>
          <div class="description-text">{{ roleDescription || '加載中...' }}</div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref } from 'vue'

// 定義props
const props = defineProps({
  roleCharacter: {
    type: String,
    default: '醫生'
  },
  roleDescription: {
    type: String,
    default: '加載中...'
  },
  initialCollapsed: {
    type: Boolean,
    default: false
  }
})

// 響應式數據
const isCollapsed = ref(props.initialCollapsed)

// 切換卡片展開/收起狀態
const toggleCard = () => {
  isCollapsed.value = !isCollapsed.value
}
</script>

<style scoped>
.role-prompt-card {
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: 8px;
  box-shadow: 
    0 2px 8px rgba(0, 0, 0, 0.1),
    0 1px 3px rgba(0, 0, 0, 0.05);
  border: 1px solid rgba(226, 232, 240, 0.8);
  overflow: hidden;
  transition: all 0.2s ease;
  max-width: 100%;
  max-height: 300px;
}

.role-prompt-card.collapsed {
  min-width: 180px;
  max-height: 60px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 18px;
  background: #2c5282;
  color: white;
  cursor: pointer;
  user-select: none;
  transition: background-color 0.2s ease;
}

.card-header:hover {
  background: #2a4f7a;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.card-icon {
  font-size: 16px;
  opacity: 0.9;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
  letter-spacing: 0.3px;
}

.toggle-icon {
  transition: transform 0.2s ease;
  opacity: 0.8;
}

.toggle-icon.rotated {
  transform: rotate(180deg);
}

.card-content {
  padding: 20px;
  max-height: 240px;
  overflow-y: auto;
  overflow-x: hidden;
}

.card-content::-webkit-scrollbar {
  width: 6px;
}

.card-content::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 3px;
}

.card-content::-webkit-scrollbar-thumb {
  background: #94a3b8;
  border-radius: 3px;
  transition: background-color 0.2s ease;
}

.card-content::-webkit-scrollbar-thumb:hover {
  background: #64748b;
}

.role-info {
  margin-bottom: 18px;
  padding: 14px 16px;
  background: #f7fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  border-left: 4px solid #2c5282;
}

.role-label {
  font-size: 12px;
  font-weight: 600;
  color: #4a5568;
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.8px;
}

.role-name {
  font-size: 18px;
  font-weight: 700;
  color: #2d3748;
}

.description-content {
  color: #2d3748;
}

.description-label {
  font-size: 12px;
  font-weight: 600;
  color: #4a5568;
  margin-bottom: 10px;
  text-transform: uppercase;
  letter-spacing: 0.8px;
}

.description-text {
  font-size: 14px;
  line-height: 1.6;
  color: #2d3748;
  white-space: pre-wrap;
  background: #f7fafc;
  padding: 14px;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  border-left: 4px solid #718096;
}

/* 動畫效果 */
.card-content-enter-active, .card-content-leave-active {
  transition: all 0.2s ease;
  transform-origin: top;
}

.card-content-enter-from, .card-content-leave-to {
  opacity: 0;
  transform: scaleY(0.8);
  max-height: 0;
}

.card-content-enter-to, .card-content-leave-from {
  opacity: 1;
  transform: scaleY(1);
  max-height: 800px;
}

/* 響應式設計 */
@media (max-width: 768px) {
  .role-prompt-card {
    border-radius: 6px;
  }
  
  .card-header {
    padding: 12px 16px;
  }
  
  .card-title {
    font-size: 15px;
  }
  
  .card-content {
    padding: 16px;
  }
  
  .role-name {
    font-size: 16px;
  }
  
  .description-text {
    font-size: 13px;
  }
}
</style> 