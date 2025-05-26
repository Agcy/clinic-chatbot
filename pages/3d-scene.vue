<template>
  <div class="scene-page">
    <ThreeDSceneLoaderWithConfig
      :config-id="selectedConfigId"
      :enable-controls="enableControls"
    />
    
    <div class="controls">
      <h2>3D场景控制器</h2>
      
      <div class="control-group">
        <label>选择场景配置：</label>
        <select v-model="selectedConfigId" @change="onConfigChange">
          <option v-for="config in availableConfigs" :key="config.configId" :value="config.configId">
            {{ config.name }}
          </option>
        </select>
      </div>
      
      <div class="control-group">
        <label>
          <input type="checkbox" v-model="enableControls" />
          启用相机控制器
        </label>
      </div>
      
      <div class="control-group" v-if="currentConfig">
        <h3>当前配置信息</h3>
        <div class="config-info">
          <p><strong>名称:</strong> {{ currentConfig.name }}</p>
          <p><strong>描述:</strong> {{ currentConfig.description }}</p>
          <p><strong>场景模型:</strong> {{ currentConfig.sceneModel.url }}</p>
          <p><strong>角色模型:</strong> {{ currentConfig.characterModel.url }}</p>
        </div>
      </div>
      
      <div class="control-group">
        <h3>动画测试</h3>
        <button @click="testTalkAnimation(true)" class="test-btn">开始说话</button>
        <button @click="testTalkAnimation(false)" class="test-btn">停止说话</button>
      </div>
      
      <div class="control-group">
        <button @click="generateShareLink" class="share-btn">生成分享链接</button>
        <div v-if="shareLink" class="share-link">
          <input type="text" readonly :value="shareLink" @click="copyToClipboard" />
          <span v-if="copied" class="copied-notification">已复制！</span>
        </div>
      </div>
      
      <div class="control-group">
        <button @click="refreshConfigs" class="refresh-btn">刷新配置列表</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import ThreeDSceneLoaderWithConfig from '~/components/ThreeDSceneLoaderWithConfig.vue';
import { useRoute, useRouter } from 'vue-router';

// 获取路由对象
const route = useRoute();
const router = useRouter();

// 响应式数据
const selectedConfigId = ref('doctor-operating-room');
const enableControls = ref(false);
const availableConfigs = ref([]);
const shareLink = ref('');
const copied = ref(false);

// 计算当前配置
const currentConfig = computed(() => {
  return availableConfigs.value.find(config => config.configId === selectedConfigId.value);
});

/**
 * 获取可用的配置列表
 */
const fetchAvailableConfigs = async () => {
  try {
    // 首先尝试从ScenePosition获取配置
    try {
      const configs = await $fetch('/api/scene-positions');
      if (configs && configs.length > 0) {
        availableConfigs.value = configs;
        console.log('从ScenePosition获取到配置列表:', configs);
        return;
      }
    } catch (scenePositionError) {
      console.log('ScenePosition配置为空，尝试从Scene数据获取');
    }
    
    // 如果ScenePosition为空，从现有Scene数据构建配置列表
    const scenesResponse = await $fetch('/api/scenes');
    if (scenesResponse.success && scenesResponse.scenes && scenesResponse.scenes.length > 0) {
      const sceneConfigs = scenesResponse.scenes.map(scene => {
        // 优先使用场景中定义的 config_id
        const configId = scene.config_id || ('scene-' + scene.scene_id);
        
        return {
          configId: configId,
          name: scene.scene_title || '未命名场景',
          description: scene.scene_description_model || '',
          sceneModel: {
            url: '/model/operation_room.glb',
            position: { x: 0, y: -0.5, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 }
          },
          characterModel: {
            url: '/model/doctor.glb',
            position: { x: 0, y: -0.5, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 }
          },
          camera: {
            position: { x: 0, y: 0.7, z: 2 },
            lookAt: { x: 0, y: 0.7, z: 2 },
            fov: 75,
            near: 0.1,
            far: 1000
          },
          lighting: {
            hemisphereLight: {
              skyColor: '#ffffff',
              groundColor: '#8d8d8d',
              intensity: 6.0,
              position: { x: 0, y: 10, z: 0 }
            },
            directionalLight: {
              color: '#ffffff',
              intensity: 3.0,
              position: { x: 5, y: 5, z: 2 },
              castShadow: true
            },
            ambientLight: {
              color: '#ffffff',
              intensity: 5.0
            }
          },
          background: {
            type: 'color',
            value: '#87CEEB'
          },
          renderer: {
            toneMappingExposure: 0.4,
            toneMapping: 'ACESFilmicToneMapping'
          }
        };
      });
      
      availableConfigs.value = sceneConfigs;
      console.log('从Scene数据构建的配置列表:', sceneConfigs);
      return;
    }
    
    // 如果都没有，使用默认配置
    availableConfigs.value = [
      {
        configId: 'doctor-operating-room',
        name: '医生-手术室场景',
        description: '医生在手术室的3D场景配置',
        sceneModel: { 
          url: '/model/operation_room.glb',
          position: { x: 0, y: -0.5, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 }
        },
        characterModel: { 
          url: '/model/doctor.glb',
          position: { x: 0, y: -0.5, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 }
        },
        camera: {
          position: { x: 0, y: 0.7, z: 2 },
          lookAt: { x: 0, y: 0.7, z: 2 },
          fov: 75,
          near: 0.1,
          far: 1000
        },
        lighting: {
          hemisphereLight: {
            skyColor: '#ffffff',
            groundColor: '#8d8d8d',
            intensity: 6.0,
            position: { x: 0, y: 10, z: 0 }
          },
          directionalLight: {
            color: '#ffffff',
            intensity: 3.0,
            position: { x: 5, y: 5, z: 2 },
            castShadow: true
          },
          ambientLight: {
            color: '#ffffff',
            intensity: 5.0
          }
        },
        background: {
          type: 'color',
          value: '#87CEEB'
        },
        renderer: {
          toneMappingExposure: 0.4,
          toneMapping: 'ACESFilmicToneMapping'
        }
      }
    ];
    console.log('使用默认配置');
    
  } catch (error) {
    console.error('获取配置列表失败:', error);
    // 如果获取失败，使用默认配置
    availableConfigs.value = [
      {
        configId: 'doctor-operating-room',
        name: '医生-手术室场景',
        description: '医生在手术室的3D场景配置',
        sceneModel: { 
          url: '/model/operation_room.glb',
          position: { x: 0, y: -0.5, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 }
        },
        characterModel: { 
          url: '/model/doctor.glb',
          position: { x: 0, y: -0.5, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 }
        },
        camera: {
          position: { x: 0, y: 0.7, z: 2 },
          lookAt: { x: 0, y: 0.7, z: 2 },
          fov: 75,
          near: 0.1,
          far: 1000
        },
        lighting: {
          hemisphereLight: {
            skyColor: '#ffffff',
            groundColor: '#8d8d8d',
            intensity: 6.0,
            position: { x: 0, y: 10, z: 0 }
          },
          directionalLight: {
            color: '#ffffff',
            intensity: 3.0,
            position: { x: 5, y: 5, z: 2 },
            castShadow: true
          },
          ambientLight: {
            color: '#ffffff',
            intensity: 5.0
          }
        },
        background: {
          type: 'color',
          value: '#87CEEB'
        },
        renderer: {
          toneMappingExposure: 0.4,
          toneMapping: 'ACESFilmicToneMapping'
        }
      }
    ];
  }
};

/**
 * 从URL参数中获取配置
 */
const loadFromUrlParams = () => {
  const urlConfigId = route.query.configId;
  const urlControls = route.query.controls;
  
  if (urlConfigId) {
    selectedConfigId.value = decodeURIComponent(urlConfigId);
  }
  
  if (urlControls) {
    enableControls.value = urlControls === 'true';
  }
};

/**
 * 配置变化处理
 */
const onConfigChange = () => {
  // 更新URL参数
  updateUrlParams();
};

/**
 * 更新URL参数
 */
const updateUrlParams = () => {
  const query = {
    configId: encodeURIComponent(selectedConfigId.value),
    controls: enableControls.value.toString()
  };
  
  router.replace({ query });
};

/**
 * 生成分享链接
 */
const generateShareLink = () => {
  const baseUrl = window.location.origin + window.location.pathname;
  const queryParams = new URLSearchParams();
  queryParams.set('configId', encodeURIComponent(selectedConfigId.value));
  queryParams.set('controls', enableControls.value.toString());
  
  shareLink.value = `${baseUrl}?${queryParams.toString()}`;
  updateUrlParams();
};

/**
 * 复制链接到剪贴板
 */
const copyToClipboard = () => {
  navigator.clipboard.writeText(shareLink.value).then(() => {
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  });
};

/**
 * 测试说话动画
 */
const testTalkAnimation = (play) => {
  if (window.playTalkAnimation) {
    window.playTalkAnimation(play);
  } else {
    console.warn('动画控制函数未准备好');
  }
};

/**
 * 刷新配置列表
 */
const refreshConfigs = async () => {
  await fetchAvailableConfigs();
};

/**
 * 初始化场景位置配置数据
 */
const initializeScenePositions = async () => {
  try {
    const response = await $fetch('/api/init-scene-positions', {
      method: 'POST',
      body: { clearExisting: false }
    });
    console.log('场景位置配置初始化结果:', response);
    await fetchAvailableConfigs();
  } catch (error) {
    console.error('初始化场景位置配置失败:', error);
  }
};

// 生命周期
onMounted(async () => {
  // 首先尝试初始化配置数据
  await initializeScenePositions();
  
  // 从URL参数加载配置
  loadFromUrlParams();
  
  // 确保选择的配置存在
  if (!availableConfigs.value.find(config => config.configId === selectedConfigId.value)) {
    selectedConfigId.value = availableConfigs.value[0]?.configId || 'doctor-operating-room';
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

.controls {
  position: absolute;
  top: 20px;
  right: 20px;
  background-color: rgba(255, 255, 255, 0.9);
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  z-index: 10;
  max-width: 350px;
  max-height: 80vh;
  overflow-y: auto;
}

.controls h2 {
  margin-top: 0;
  margin-bottom: 15px;
  font-size: 18px;
  color: #333;
}

.controls h3 {
  margin-top: 15px;
  margin-bottom: 10px;
  font-size: 14px;
  color: #555;
}

.control-group {
  margin-bottom: 15px;
}

.control-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
  color: #333;
}

.control-group select {
  width: 100%;
  padding: 8px;
  border-radius: 5px;
  border: 1px solid #ccc;
  background-color: white;
}

.control-group input[type="checkbox"] {
  margin-right: 8px;
}

.config-info {
  background-color: #f5f5f5;
  padding: 10px;
  border-radius: 5px;
  font-size: 12px;
}

.config-info p {
  margin: 5px 0;
  word-break: break-all;
}

.test-btn {
  background-color: #2196F3;
  color: white;
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-right: 8px;
  margin-bottom: 5px;
  font-size: 12px;
}

.test-btn:hover {
  background-color: #1976D2;
}

.share-btn {
  background-color: #4CAF50;
  color: white;
  padding: 8px 12px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  width: 100%;
  font-weight: bold;
}

.share-btn:hover {
  background-color: #45a049;
}

.refresh-btn {
  background-color: #FF9800;
  color: white;
  padding: 8px 12px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  width: 100%;
  font-weight: bold;
}

.refresh-btn:hover {
  background-color: #F57C00;
}

.share-link {
  margin-top: 10px;
  position: relative;
}

.share-link input {
  width: 100%;
  padding: 8px;
  border-radius: 5px;
  border: 1px solid #ccc;
  cursor: pointer;
  font-size: 12px;
}

.copied-notification {
  position: absolute;
  right: 5px;
  top: 8px;
  background-color: #333;
  color: white;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 10px;
}

/* 滚动条样式 */
.controls::-webkit-scrollbar {
  width: 6px;
}

.controls::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.controls::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 3px;
}

.controls::-webkit-scrollbar-thumb:hover {
  background: #555;
}
</style> 