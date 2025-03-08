<!-- 场景选择页面 -->
<template>
  <div class="min-h-screen bg-gray-100 py-8 px-4">
    <div class="max-w-6xl mx-auto">
      <h1 class="text-3xl font-bold text-center mb-8 text-gray-800">选择训练场景</h1>
      
      <!-- 场景卡片网格 -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div 
          v-for="scene in scenes" 
          :key="scene.scene_id"
          class="bg-white rounded-lg shadow-lg overflow-hidden cursor-pointer transform transition-transform hover:scale-105"
          @click="selectScene(scene.scene_id)"
        >
          <!-- 场景图片 -->
          <div class="h-48 bg-gray-200">
            <img 
              :src="scene.card_img" 
              :alt="scene.scene_title"
              class="w-full h-full object-cover"
              @error="handleImageError"
              onerror="this.onerror=null; this.src='/default-scene.jpg';"
            >
          </div>
          
          <!-- 场景信息 -->
          <div class="p-4">
            <h3 class="text-xl font-semibold text-gray-800 mb-2">{{ scene.scene_title }}</h3>
            <div class="flex items-center justify-between">
              <span class="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                {{ scene.scene_type }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';

const router = useRouter();
const scenes = ref([]);

// 获取场景列表
const fetchScenes = async () => {
  try {
    const response = await axios.get('/api/scenes');
    if (response.data.success) {
      scenes.value = response.data.scenes;
      console.log('获取到的场景列表:', scenes.value);
    } else {
      console.error('获取场景列表失败:', response.data.error);
    }
  } catch (error) {
    console.error('获取场景列表出错:', error);
  }
};

// 选择场景
const selectScene = async (sceneId) => {
  try {
    const response = await axios.post('/api/scenes', { scene_id: sceneId });
    if (response.data.success) {
      // 将场景信息存储到localStorage
      localStorage.setItem('currentScene', JSON.stringify(response.data.scene));
      // 跳转到训练页面
      router.push('/training');
    } else {
      console.error('获取场景详情失败:', response.data.error);
    }
  } catch (error) {
    console.error('选择场景出错:', error);
  }
};

// 处理图片加载错误
const handleImageError = (event) => {
  console.log('图片加载失败，使用默认图片');
  event.target.src = '/default-scene.jpg';
};

// 页面加载时初始化场景数据
onMounted(async () => {
  // 初始化场景数据
  try {
    await axios.get('/api/init-scenes');
    await fetchScenes();
  } catch (error) {
    console.error('初始化场景数据失败:', error);
  }
});
</script>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

@media (max-width: 640px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
</style>