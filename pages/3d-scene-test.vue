<template>
  <div class="scene-page">
    <ThreeDCharacter />
    
    <div class="debug-panel">
      <h2>调试面板</h2>
      <div v-if="loading">正在加载数据...</div>
      <div v-else>
        <div class="scene-info">
          <h3>当前场景信息</h3>
          <div><strong>场景ID:</strong> {{ sceneData.sceneId || '未设置' }}</div>
          <div><strong>场景标题:</strong> {{ sceneData.sceneTitle || '未设置' }}</div>
          <div><strong>场景URL:</strong> {{ sceneData.sceneUrl || '未设置' }}</div>
          <div><strong>角色URL:</strong> {{ sceneData.characterUrl || '未设置' }}</div>
        </div>
        
        <div class="scene-selector">
          <h3>场景选择</h3>
          <select v-model="selectedSceneId" @change="loadScene">
            <option v-for="scene in sceneList" :key="scene.scene_id" :value="scene.scene_id">
              {{ scene.scene_title }}
            </option>
          </select>
        </div>
        
        <div class="debug-actions">
          <h3>调试操作</h3>
          <button @click="clearSceneUrl">清空场景URL</button>
          <button @click="resetScene">重置场景</button>
          <button @click="refreshPage">刷新页面</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import ThreeDCharacter from '~/components/ThreeDCharacter.vue';

const route = useRoute();
const router = useRouter();

const loading = ref(true);
const sceneData = ref({});
const sceneList = ref([]);
const selectedSceneId = ref('');

// 加载场景列表
const loadSceneList = async () => {
  try {
    // 从scene_json.json加载场景列表
    const response = await fetch('/prompts/scene_json.json');
    if (!response.ok) {
      throw new Error('加载场景列表失败');
    }
    
    sceneList.value = await response.json();
    console.log('加载场景列表成功:', sceneList.value);
  } catch (error) {
    console.error('加载场景列表失败:', error);
  }
};

// 加载指定场景
const loadScene = async () => {
  loading.value = true;
  
  try {
    const sceneId = selectedSceneId.value || route.query.sceneId;
    
    if (!sceneId) {
      // 加载数据库中的场景
      const response = await fetch('/api/check-scene-urls');
      if (!response.ok) {
        throw new Error('加载场景数据失败');
      }
      
      const data = await response.json();
      sceneData.value = data.fromDatabase || {};
    } else {
      // 从JSON文件加载指定场景
      const response = await fetch(`/api/scene-from-json?sceneId=${sceneId}`);
      if (!response.ok) {
        throw new Error('加载场景数据失败');
      }
      
      sceneData.value = await response.json();
      
      // 更新数据库中的场景数据
      await fetch('/api/update-scene-card', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sceneUrl: sceneData.value.sceneUrl,
          characterUrl: sceneData.value.characterUrl
        })
      });
      
      // 更新URL，不刷新页面
      router.replace({ query: { sceneId } });
    }
    
    console.log('当前场景数据:', sceneData.value);
  } catch (error) {
    console.error('加载场景失败:', error);
  } finally {
    loading.value = false;
  }
};

// 清空场景URL
const clearSceneUrl = async () => {
  try {
    const response = await fetch('/api/update-scene-card', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sceneUrl: '',
        characterUrl: sceneData.value.characterUrl || '/model/doctor.glb'
      })
    });
    
    if (!response.ok) {
      throw new Error('更新场景数据失败');
    }
    
    const result = await response.json();
    console.log('清空场景URL成功:', result);
    
    // 刷新页面
    window.location.reload();
  } catch (error) {
    console.error('清空场景URL失败:', error);
  }
};

// 重置场景
const resetScene = async () => {
  try {
    const sceneId = selectedSceneId.value || route.query.sceneId;
    
    if (!sceneId) {
      alert('请先选择一个场景');
      return;
    }
    
    // 从JSON文件加载指定场景
    const response = await fetch(`/api/scene-from-json?sceneId=${sceneId}`);
    if (!response.ok) {
      throw new Error('加载场景数据失败');
    }
    
    const data = await response.json();
    
    // 更新数据库中的场景数据
    await fetch('/api/update-scene-card', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sceneUrl: data.sceneUrl,
        characterUrl: data.characterUrl
      })
    });
    
    console.log('重置场景成功');
    
    // 刷新页面
    window.location.reload();
  } catch (error) {
    console.error('重置场景失败:', error);
  }
};

// 刷新页面
const refreshPage = () => {
  window.location.reload();
};

onMounted(async () => {
  await loadSceneList();
  await loadScene();
  
  // 如果URL中有sceneId，则设置选中的场景
  if (route.query.sceneId) {
    selectedSceneId.value = route.query.sceneId;
  }
});
</script>

<style scoped>
.scene-page {
  width: 100%;
  height: 100vh;
  overflow: hidden;
  position: relative;
}

.debug-panel {
  position: absolute;
  top: 20px;
  right: 20px;
  background-color: rgba(255, 255, 255, 0.8);
  padding: 15px;
  border-radius: 10px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.2);
  width: 300px;
  max-height: 80vh;
  overflow-y: auto;
  z-index: 1000;
}

.debug-panel h2 {
  margin-top: 0;
  margin-bottom: 15px;
  font-size: 18px;
}

.debug-panel h3 {
  margin-top: 15px;
  margin-bottom: 10px;
  font-size: 16px;
}

.scene-info,
.scene-selector,
.debug-actions {
  margin-bottom: 20px;
}

.scene-info div {
  margin-bottom: 5px;
}

.scene-selector select {
  width: 100%;
  padding: 8px;
  border-radius: 5px;
  border: 1px solid #ccc;
}

.debug-actions button {
  background-color: #4CAF50;
  color: white;
  padding: 8px 12px;
  margin-right: 10px;
  margin-bottom: 10px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}

.debug-actions button:hover {
  background-color: #45a049;
}
</style> 