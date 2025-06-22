<!-- 病人病情监测卡片组件 -->
<template>
  <div class="patient-vitals-card" :class="{ 'collapsed': isCollapsed }">
    <div class="card-header" @click="toggleCard">
      <div class="header-left">
        <span class="card-icon">📊</span>
        <h3 class="card-title">病人監測</h3>
      </div>
      <span class="toggle-icon" :class="{ 'rotated': !isCollapsed }">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M7 10L12 15L17 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </span>
    </div>
    
    <transition name="card-content">
      <div class="card-content" v-if="!isCollapsed">
        <div v-if="vitalsData && vitalsData.length > 0">
          <div 
            v-for="(category, categoryIndex) in vitalsData" 
            :key="categoryIndex"
            class="vitals-category"
          >
            <div class="category-header">
              <h4 class="category-title">{{ category.category }}</h4>
              <div class="category-divider"></div>
            </div>
            
            <div class="vitals-grid">
              <div 
                v-for="(item, itemIndex) in category.items" 
                :key="itemIndex"
                class="vital-item"
                :class="getStatusClass(item.status)"
              >
                <div class="vital-header">
                  <span class="vital-name">{{ item.name }}</span>
                  <div class="vital-status" :class="getStatusClass(item.status)">
                    <span class="status-indicator"></span>
                    <span class="status-text">{{ item.status }}</span>
                  </div>
                </div>
                <div class="vital-value">{{ item.value }}</div>
              </div>
            </div>
          </div>
        </div>
        
        <div v-else class="no-data">
          <div class="no-data-text">暫無監測數據</div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref } from 'vue'

// 定義props
const props = defineProps({
  vitalsData: {
    type: Array,
    default: () => []
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

// 根據狀態獲取樣式類名
const getStatusClass = (status) => {
  const statusMap = {
    '正常': 'status-normal',
    '異常': 'status-abnormal',
    '危險': 'status-danger',
    '嚴重': 'status-danger',
    '高風險': 'status-danger',
    '需關注': 'status-warning',
    '輕微': 'status-warning',
    '偏低': 'status-warning',
    '偏高': 'status-warning',
    '偏快': 'status-warning',
    '升高': 'status-warning',
    '輕微升高': 'status-warning',
    '中等': 'status-warning',
    '適當': 'status-normal',
    '已確認': 'status-normal',
    '進行中': 'status-normal',
    '待安排': 'status-info',
    '尚未完成': 'status-info',
    '發燒': 'status-abnormal',
    '感染': 'status-danger',
    '炎症': 'status-warning',
    '貧血': 'status-abnormal',
    '便秘': 'status-warning'
  }
  return statusMap[status] || 'status-normal'
}
</script>

<style scoped>
.patient-vitals-card {
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
  height: 400px;
}

.patient-vitals-card.collapsed {
  min-width: 180px;
  height: auto;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 18px;
  background: #1a365d;
  color: white;
  cursor: pointer;
  user-select: none;
  transition: background-color 0.2s ease;
}

.card-header:hover {
  background: #153c5a;
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
  padding: 16px;
  height: 340px;
  overflow-y: scroll;
  overflow-x: hidden;
}

.card-content::-webkit-scrollbar {
  width: 8px;
}

.card-content::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 4px;
}

.card-content::-webkit-scrollbar-thumb {
  background: #94a3b8;
  border-radius: 4px;
  transition: background-color 0.2s ease;
}

.card-content::-webkit-scrollbar-thumb:hover {
  background: #64748b;
}

.vitals-category {
  margin-bottom: 20px;
}

.vitals-category:last-child {
  margin-bottom: 0;
}

.category-header {
  margin-bottom: 12px;
}

.category-title {
  font-size: 14px;
  font-weight: 600;
  color: #2d3748;
  margin: 0 0 6px 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.category-divider {
  height: 1px;
  background: #e2e8f0;
  border-radius: 1px;
}

.vitals-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 8px;
}

.vital-item {
  background: #f8fafc;
  border-radius: 6px;
  padding: 12px;
  border: 1px solid #e2e8f0;
  transition: all 0.2s ease;
  position: relative;
}

.vital-item:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}

.vital-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.vital-name {
  font-size: 13px;
  font-weight: 600;
  color: #4a5568;
}

.vital-value {
  font-size: 15px;
  font-weight: 700;
  color: #2d3748;
  word-break: break-word;
}

.vital-status {
  display: flex;
  align-items: center;
  gap: 4px;
}

.status-text {
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.status-indicator {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  display: inline-block;
}

/* 狀態樣式 */
.status-normal .status-indicator {
  background: #38a169;
}

.status-normal .status-text {
  color: #38a169;
}

.vital-item.status-normal {
  border-left: 3px solid #38a169;
}

.status-warning .status-indicator {
  background: #d69e2e;
}

.status-warning .status-text {
  color: #d69e2e;
}

.vital-item.status-warning {
  border-left: 3px solid #d69e2e;
}

.status-abnormal .status-indicator {
  background: #e53e3e;
}

.status-abnormal .status-text {
  color: #e53e3e;
}

.vital-item.status-abnormal {
  border-left: 3px solid #e53e3e;
}

.status-danger .status-indicator {
  background: #c53030;
  animation: pulse 2s infinite;
}

.status-danger .status-text {
  color: #c53030;
  font-weight: 600;
}

.vital-item.status-danger {
  border-left: 3px solid #c53030;
  background: #fed7d7;
}

.status-info .status-indicator {
  background: #3182ce;
}

.status-info .status-text {
  color: #3182ce;
}

.vital-item.status-info {
  border-left: 3px solid #3182ce;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}

.no-data {
  text-align: center;
  padding: 30px 20px;
  color: #a0aec0;
}

.no-data-text {
  font-size: 14px;
  font-weight: 500;
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
}

/* 響應式設計 */
@media (max-width: 768px) {
  .patient-vitals-card {
    border-radius: 6px;
    height: 300px;
  }
  
  .card-header {
    padding: 12px 16px;
  }
  
  .card-title {
    font-size: 15px;
  }
  
  .card-content {
    padding: 12px;
    height: 240px;
  }
  
  .vitals-grid {
    grid-template-columns: 1fr;
    gap: 6px;
  }
  
  .vital-item {
    padding: 10px;
  }
  
  .vital-value {
    font-size: 13px;
  }
  
  .category-title {
    font-size: 12px;
  }
}
</style> 