<!-- 场景选择页面 -->
<template>
  <div class="min-h-screen bg-gray-100 py-8 px-4">
    <div class="max-w-6xl mx-auto">
      <h1 class="text-3xl font-bold text-center mb-8 text-gray-800">选择训练场景</h1>
      
      <!-- 管理操作 -->
      <div class="flex justify-end mb-4 gap-2">
        <button 
          @click="showDebug = !showDebug" 
          class="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded text-sm"
        >
          {{ showDebug ? '关闭调试' : '开启调试' }}
        </button>
        <button 
          @click="initScenes" 
          class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded text-sm"
          :disabled="isInitializing"
        >
          {{ isInitializing ? '初始化中...' : '重新初始化场景' }}
        </button>
      </div>
      
      <!-- 自定义场景卡片 -->
      <div class="mb-8">
        <div 
          class="bg-white rounded-lg shadow-lg overflow-hidden cursor-pointer transform transition-transform hover:scale-105 border-2 border-dashed border-blue-400"
          @click="showCustomSceneModal = true"
        >
          <div class="p-8 flex flex-col items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 text-blue-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <h3 class="text-xl font-semibold text-gray-800 mb-2">创建自定义场景</h3>
            <p class="text-gray-600 text-center">根据您的需求定制专属训练场景</p>
          </div>
        </div>
      </div>
      
      <!-- 场景卡片网格 -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div 
          v-for="scene in scenes" 
          :key="scene.scene_id"
          class="scene-card bg-white rounded-lg shadow-lg overflow-hidden cursor-pointer transform transition-transform hover:scale-105 relative"
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
              <!-- 查看角色按钮 -->
              <button 
                @click.stop="viewRoleDetails(scene)" 
                class="text-xs text-blue-600 hover:text-blue-800 underline"
              >
                查看角色
              </button>
            </div>
            <!-- 调试信息 -->
            <div v-if="showDebug" class="mt-2 text-xs text-gray-500">
              <div>角色: <span class="font-mono">{{ scene.trainee_character || '未定义' }}</span></div>
              <div>角色描述: <span class="font-mono">{{ scene.scene_description_charactor ? '有' : '无' }}</span></div>
            </div>
          </div>
          
          <!-- 角色描述悬浮提示 -->
          <div class="scene-tooltip absolute inset-0 bg-white bg-opacity-98 p-4 overflow-auto flex flex-col z-20 shadow-lg">
            <h4 class="text-lg font-semibold text-blue-600 mb-2 sticky top-0 bg-white py-1">您将扮演: {{ scene.trainee_character || '医生' }}</h4>
            <div class="text-sm text-gray-700 flex-grow overflow-auto">
              <p v-if="scene.scene_description_charactor && scene.scene_description_charactor.trim()">
                {{ scene.scene_description_charactor }}
              </p>
              <p v-else class="italic text-gray-500">
                暂无角色描述，请点击"查看角色"按钮获取详情。
              </p>
            </div>
            <div class="mt-2 text-xs text-blue-500 text-center sticky bottom-0 bg-white py-1">点击开始训练</div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 自定义场景模态框 -->
    <div v-if="showCustomSceneModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-auto">
        <div class="p-6">
          <div class="flex justify-between items-center mb-6">
            <h2 class="text-2xl font-bold text-gray-800">创建自定义场景</h2>
            <button @click="showCustomSceneModal = false" class="text-gray-500 hover:text-gray-700">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <form @submit.prevent="generateCustomScene">
            <!-- 角色选择 -->
            <div class="mb-4">
              <label class="block text-gray-700 text-sm font-bold mb-2">角色类型</label>
              <div class="flex flex-wrap gap-2">
                <div 
                  v-for="role in customSceneOptions.roles" 
                  :key="role.value"
                  @click="customScene.role = role.value"
                  :class="[
                    'px-4 py-2 rounded-full cursor-pointer border transition-colors',
                    customScene.role === role.value 
                      ? 'bg-blue-500 text-white border-blue-500' 
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                  ]"
                >
                  {{ role.label }}
                </div>
              </div>
            </div>
            
            <!-- 症状选择 -->
            <div class="mb-4">
              <label class="block text-gray-700 text-sm font-bold mb-2">主要症状</label>
              <div class="flex flex-wrap gap-2">
                <div 
                  v-for="symptom in customSceneOptions.symptoms" 
                  :key="symptom.value"
                  @click="toggleSymptom(symptom.value)"
                  :class="[
                    'px-4 py-2 rounded-full cursor-pointer border transition-colors',
                    customScene.symptoms.includes(symptom.value) 
                      ? 'bg-blue-500 text-white border-blue-500' 
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                  ]"
                >
                  {{ symptom.label }}
                </div>
              </div>
            </div>
            
            <!-- 病情程度 -->
            <div class="mb-4">
              <label class="block text-gray-700 text-sm font-bold mb-2">病情程度</label>
              <div class="flex flex-wrap gap-2">
                <div 
                  v-for="severity in customSceneOptions.severities" 
                  :key="severity.value"
                  @click="customScene.severity = severity.value"
                  :class="[
                    'px-4 py-2 rounded-full cursor-pointer border transition-colors',
                    customScene.severity === severity.value 
                      ? 'bg-blue-500 text-white border-blue-500' 
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                  ]"
                >
                  {{ severity.label }}
                </div>
              </div>
            </div>
            
            <!-- 患者情绪 -->
            <div class="mb-4">
              <label class="block text-gray-700 text-sm font-bold mb-2">患者情绪</label>
              <div class="flex flex-wrap gap-2">
                <div 
                  v-for="emotion in customSceneOptions.emotions" 
                  :key="emotion.value"
                  @click="customScene.emotion = emotion.value"
                  :class="[
                    'px-4 py-2 rounded-full cursor-pointer border transition-colors',
                    customScene.emotion === emotion.value 
                      ? 'bg-blue-500 text-white border-blue-500' 
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                  ]"
                >
                  {{ emotion.label }}
                </div>
              </div>
            </div>
            
            <!-- 自定义备注 -->
            <div class="mb-6">
              <label class="block text-gray-700 text-sm font-bold mb-2">其他备注 (可选)</label>
              <textarea 
                v-model="customScene.notes"
                class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                rows="3"
                placeholder="添加任何其他详细信息或特殊要求..."
              ></textarea>
            </div>
            
            <div class="flex justify-end">
              <button
                type="submit"
                class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg focus:outline-none focus:shadow-outline"
                :disabled="isGenerating"
              >
                {{ isGenerating ? '生成中...' : '开始训练' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
    
    <!-- 角色详情弹窗 -->
    <div v-if="showRoleModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-lg w-full max-w-lg">
        <div class="p-6">
          <div class="flex justify-between items-center mb-6">
            <h2 class="text-2xl font-bold text-gray-800">角色详情</h2>
            <button @click="showRoleModal = false" class="text-gray-500 hover:text-gray-700">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div v-if="selectedScene">
            <div class="mb-4">
              <h3 class="text-lg font-medium text-gray-700">场景标题</h3>
              <p class="mt-1">{{ selectedScene.scene_title }}</p>
            </div>
            
            <div class="mb-4">
              <h3 class="text-lg font-medium text-gray-700">您的角色</h3>
              <p class="mt-1">{{ selectedScene.trainee_character || '医生' }}</p>
            </div>
            
            <div class="mb-4">
              <h3 class="text-lg font-medium text-gray-700">角色描述</h3>
              <pre class="mt-1 bg-gray-100 p-3 rounded text-sm overflow-auto max-h-60 whitespace-pre-wrap">{{ selectedScene.scene_description_charactor || '暂无描述' }}</pre>
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
const showCustomSceneModal = ref(false);
const isGenerating = ref(false);
const hoveredScene = ref(null);
const showRoleModal = ref(false);
const selectedScene = ref(null);
const isInitializing = ref(false);
const showDebug = ref(false); // 调试模式

// 自定义场景选项
const customSceneOptions = {
  roles: [
    { label: '脑外科医生', value: 'brain_surgeon' },
    { label: '急诊科医生', value: 'emergency_doctor' },
    { label: '妇产科医生', value: 'gynecologist' },
    { label: '麻醉师', value: 'anesthesiologist' },
  ],
  symptoms: [
    { label: '头痛', value: 'headache' },
    { label: '头晕', value: 'dizziness' },
    { label: '恶心', value: 'nausea' },
    { label: '腹痛', value: 'abdominal_pain' },
    { label: '出血', value: 'bleeding' },
    { label: '发热', value: 'fever' },
    { label: '视力模糊', value: 'blurred_vision' },
  ],
  severities: [
    { label: '轻微', value: 'mild' },
    { label: '中等', value: 'moderate' },
    { label: '严重', value: 'severe' },
    { label: '紧急', value: 'emergency' },
  ],
  emotions: [
    { label: '平静', value: 'calm' },
    { label: '焦虑', value: 'anxious' },
    { label: '恐惧', value: 'fearful' },
    { label: '愤怒', value: 'angry' },
    { label: '悲伤', value: 'sad' },
  ],
};

// 自定义场景数据
const customScene = ref({
  role: '',
  symptoms: [],
  severity: '',
  emotion: '',
  notes: '',
});

// 添加/移除症状
const toggleSymptom = (symptom) => {
  if (customScene.value.symptoms.includes(symptom)) {
    customScene.value.symptoms = customScene.value.symptoms.filter(s => s !== symptom);
  } else {
    customScene.value.symptoms.push(symptom);
  }
};

// 生成自定义场景并添加到列表
const generateCustomScene = async () => {
  if (!customScene.value.role || customScene.value.symptoms.length === 0 || !customScene.value.severity || !customScene.value.emotion) {
    alert('请完善场景信息');
    return;
  }
  
  isGenerating.value = true;
  
  try {
    // 构建提示词
    const prompt = `生成一个医患对话场景，设定如下：
      - 医生角色：${getLabelByValue(customSceneOptions.roles, customScene.value.role)}
      - 患者症状：${customScene.value.symptoms.map(s => getLabelByValue(customSceneOptions.symptoms, s)).join('、')}
      - 症状严重程度：${getLabelByValue(customSceneOptions.severities, customScene.value.severity)}
      - 患者情绪：${getLabelByValue(customSceneOptions.emotions, customScene.value.emotion)}
      ${customScene.value.notes ? `- 其他备注：${customScene.value.notes}` : ''}
    `;
    
    // 调用API生成场景描述
    const response = await axios.post('/api/generate-custom-scene', { prompt });
    
    if (response.data.success) {
      // 获取生成的场景数据
      const customSceneData = response.data.scene;
      
      // 将新场景添加到场景列表
      scenes.value.unshift(customSceneData);
      
      // 关闭模态框
      showCustomSceneModal.value = false;
      
      // 重置表单
      customScene.value = {
        role: '',
        symptoms: [],
        severity: '',
        emotion: '',
        notes: ''
      };
    } else {
      throw new Error(response.data.error || '生成场景失败');
    }
  } catch (error) {
    console.error('生成自定义场景失败:', error);
    alert('生成场景失败: ' + error.message);
  } finally {
    isGenerating.value = false;
  }
};

// 根据值获取标签
const getLabelByValue = (options, value) => {
  const option = options.find(opt => opt.value === value);
  return option ? option.label : value;
};

// 获取场景列表
const fetchScenes = async () => {
  try {
    const response = await axios.get('/api/scenes');
    if (response.data.success) {
      scenes.value = response.data.scenes;
      console.log('获取到的场景列表:', scenes.value);
      
      // 检查每个场景的scene_description_charactor数据
      scenes.value.forEach((scene, index) => {
        console.log(`场景${index+1} ${scene.scene_title}:`, {
          id: scene.scene_id,
          title: scene.scene_title,
          role: scene.trainee_character,
          hasDescription: !!scene.scene_description_charactor,
          description: scene.scene_description_charactor 
            ? scene.scene_description_charactor.substring(0, 50) + '...' 
            : '无描述'
        });
      });
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

// 查看角色详情
const viewRoleDetails = (scene) => {
  selectedScene.value = scene;
  showRoleModal.value = true;
};

// 初始化场景数据
const initScenes = async () => {
  if (isInitializing.value) return;
  
  isInitializing.value = true;
  
  try {
    const response = await axios.get('/api/init-scenes');
    console.log('初始化场景结果:', response.data);
    await fetchScenes();
    alert('场景初始化成功!');
  } catch (error) {
    console.error('初始化场景数据失败:', error);
    alert('初始化场景失败: ' + error.message);
  } finally {
    isInitializing.value = false;
  }
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

.scene-tooltip {
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s;
  max-height: 100%;
  overflow-y: auto;
  background-color: rgba(255, 255, 255, 0.98);
  border: 1px solid #e2e8f0;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06);
}

.scene-card:hover .scene-tooltip {
  opacity: 1;
  pointer-events: auto;
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
</style>