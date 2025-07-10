<!-- 场景选择页面 -->
<template>
  <div class="min-h-screen bg-gray-100 py-8 px-4">
    <div class="max-w-6xl mx-auto">
      <h1 class="text-3xl font-bold text-center mb-8 text-gray-800">選擇訓練場景</h1>
      
      <!-- 管理操作 -->
      <div class="flex justify-end mb-4 gap-2">
        <button 
          @click="isDeleteMode = !isDeleteMode" 
          class="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded text-sm"
          :class="{ 'bg-gray-500 hover:bg-gray-700': isDeleteMode }"
        >
          {{ isDeleteMode ? '完成' : '刪除場景' }}
        </button>
        <!-- 
        <button 
          @click="showDebug = !showDebug" 
          class="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded text-sm"
        >
          {{ showDebug ? '關閉調試' : '開啟調試' }}
        </button>
        -->
      </div>
      
      <!-- 自定义场景卡片 - 已隐藏 -->
      <!-- 
      <div class="mb-8">
        <div 
          class="bg-white rounded-lg shadow-lg overflow-hidden cursor-pointer transform transition-transform hover:scale-105 border-2 border-dashed border-blue-400"
          @click="showCustomSceneModal = true"
        >
          <div class="p-8 flex flex-col items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 text-blue-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <h3 class="text-xl font-semibold text-gray-800 mb-2">創建自定義場景</h3>
            <p class="text-gray-600 text-center">根據您的需求定制專屬訓練場景</p>
          </div>
        </div>
      </div>
      -->
      
      <!-- 场景卡片网格 -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div 
          v-for="scene in scenes" 
          :key="scene.scene_id"
          class="scene-card bg-white rounded-lg shadow-lg overflow-hidden cursor-pointer transform transition-transform hover:scale-105 relative"
          @click="isDeleteMode ? null : selectScene(scene.scene_id)"
        >
          <!-- 删除按钮 -->
          <div 
            v-if="isDeleteMode"
            @click.stop="confirmDeleteScene(scene)"
            class="absolute left-2 top-2 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white cursor-pointer z-30 animate-bounce-once"
          >
            ❌
          </div>
          
          <!-- 场景图片 -->
          <div class="h-48 bg-gray-200">
            <img 
              :src="scene.card_img" 
              :alt="scene.scene_title"
              class="w-full h-full object-cover"
              @error="handleImageError"
            >
          </div>
          
          <!-- 场景信息 -->
          <div class="p-4">
            <h3 class="text-xl font-semibold text-gray-800 mb-2">{{ scene.scene_title }}</h3>
            <div class="flex items-center justify-between">
              <span 
                class="inline-block px-3 py-1 rounded-full text-sm font-medium"
                :style="{ 
                  backgroundColor: getTypeTagColor(scene.scene_type), 
                  color: getTypeTagTextColor(scene.scene_type) 
                }"
              >
                {{ scene.scene_type }}
              </span>
              <button 
                @click.stop="viewRoleDetails(scene)" 
                class="text-xs text-blue-600 hover:text-blue-800 underline"
              >
                檢視角色
              </button>
            </div>
            <!-- 调试信息 - 已隐藏 -->
            <!-- 
            <div v-if="showDebug" class="mt-2 text-xs text-gray-500">
              <div>角色: <span class="font-mono">{{ scene.trainee_character || '未定義' }}</span></div>
              <div>角色描述: <span class="font-mono">{{ scene.scene_description_charactor ? '有' : '無' }}</span></div>
              <div>颜色: <span class="font-mono">{{ scene.type_color || '未设置' }}</span></div>
            </div>
            -->
          </div>
          
          <!-- 角色描述悬浮提示 -->
          <div 
            v-if="!isDeleteMode" 
            class="scene-tooltip absolute inset-0 bg-white bg-opacity-98 p-4 overflow-auto flex flex-col z-20 shadow-lg"
          >
            <h4 
              class="text-lg font-semibold mb-2 sticky top-0 bg-white py-1"
              :style="{ color: getTypeTagTextColor(scene.scene_type) }"
            >
              您將扮演: {{ scene.trainee_character || '醫生' }}
            </h4>
            <div class="text-sm text-gray-700 flex-grow overflow-auto">
              <p v-if="scene.scene_description_charactor && scene.scene_description_charactor.trim()">
                {{ scene.scene_description_charactor }}
              </p>
              <p v-else class="italic text-gray-500">
                暫無角色描述，請點擊"檢視角色"按鈕獲取詳情。
              </p>
            </div>
            <div 
              class="mt-2 text-xs text-center sticky bottom-0 bg-white py-1"
              :style="{ color: getTypeTagTextColor(scene.scene_type) }"
            >
              點擊開始訓練
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 自定义场景模态框 - 已隐藏 -->
    <!-- 
    <div v-if="showCustomSceneModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-auto">
        <div class="p-6">
          <div class="flex justify-between items-center mb-6">
            <h2 class="text-2xl font-bold text-gray-800">創建自定義場景</h2>
            <button @click="showCustomSceneModal = false" class="text-gray-500 hover:text-gray-700">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <form @submit.prevent="generateCustomScene">
            <div class="mb-4">
              <label class="block text-gray-700 text-sm font-bold mb-2">場景類型</label>
              <div class="flex flex-wrap gap-2">
                <div 
                  v-for="type in customSceneOptions.types" 
                  :key="type.value"
                  @click="customScene.type = type.value"
                  :class="[
                    'px-4 py-2 rounded-full cursor-pointer border transition-colors',
                    customScene.type === type.value 
                      ? 'bg-blue-500 text-white border-blue-500' 
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                  ]"
                >
                  {{ type.label }}
                </div>
              </div>
            </div>
            
            <div class="mb-4">
              <label class="block text-gray-700 text-sm font-bold mb-2">角色類型</label>
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
            
            <div class="mb-4" v-if="customScene.type">
              <label class="block text-gray-700 text-sm font-bold mb-2">
                {{ customScene.type === 'assistant_doctor' ? '情境' : '患者症状' }}
              </label>
              <div class="flex flex-wrap gap-2">
                <div 
                  v-for="symptom in customSceneOptions.symptoms[customScene.type]" 
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
            
            <div class="mb-4" v-if="customScene.type">
              <label class="block text-gray-700 text-sm font-bold mb-2">
                {{ customScene.type === 'assistant_doctor' ? '紧急程度' : '症状严重程度' }}
              </label>
              <div class="flex flex-wrap gap-2">
                <div 
                  v-for="severity in customSceneOptions.severities[customScene.type]" 
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
            
            <div class="mb-4" v-if="customScene.type">
              <label class="block text-gray-700 text-sm font-bold mb-2">
                {{ customScene.type === 'assistant_doctor' ? '医生态度' : '患者情绪' }}
              </label>
              <div class="flex flex-wrap gap-2">
                <div 
                  v-for="emotion in customSceneOptions.emotions[customScene.type]" 
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
            
            <div class="mb-6">
              <label class="block text-gray-700 text-sm font-bold mb-2">其他備註 (可選)</label>
              <textarea 
                v-model="customScene.notes"
                class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                rows="3"
                placeholder="添加任何其他詳細信息或特殊要求..."
              ></textarea>
            </div>
            
            <div class="flex justify-end">
              <button
                type="submit"
                class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg focus:outline-none focus:shadow-outline"
                :disabled="isGenerating"
              >
                {{ isGenerating ? '生成中...' : '開始訓練' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
    -->
    
    <!-- 角色详情弹窗 -->
    <div v-if="showRoleModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-lg w-full max-w-lg">
        <div class="p-6">
          <div class="flex justify-between items-center mb-6">
            <h2 class="text-2xl font-bold text-gray-800">角色詳情</h2>
            <button @click="showRoleModal = false" class="text-gray-500 hover:text-gray-700">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div v-if="selectedScene">
            <div class="mb-4">
              <h3 class="text-lg font-medium text-gray-700">場景標題</h3>
              <p class="mt-1">{{ selectedScene.scene_title }}</p>
            </div>
            
            <div class="mb-4">
              <h3 class="text-lg font-medium text-gray-700">您的角色</h3>
              <p class="mt-1">{{ selectedScene.trainee_character || '醫生' }}</p>
            </div>
            
            <div class="mb-4">
              <h3 class="text-lg font-medium text-gray-700">角色描述</h3>
              <pre class="mt-1 bg-gray-100 p-3 rounded text-sm overflow-auto max-h-60 whitespace-pre-wrap">{{ selectedScene.scene_description_charactor || '暫無描述' }}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 删除确认弹窗 -->
    <div v-if="showDeleteModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-lg w-full max-w-md">
        <div class="p-6">
          <div class="flex justify-between items-center mb-6">
            <h2 class="text-2xl font-bold text-gray-800">確認刪除</h2>
            <button @click="showDeleteModal = false" class="text-gray-500 hover:text-gray-700">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div v-if="sceneToDelete" class="mb-6">
            <p class="text-gray-700 mb-4">您確定要刪除以下場景嗎？</p>
            <div class="bg-gray-100 p-4 rounded">
              <p class="font-semibold">{{ sceneToDelete.scene_title }}</p>
              <p class="text-sm text-gray-600">{{ sceneToDelete.scene_type }}</p>
            </div>
            <p class="text-red-600 text-sm mt-4">此操作無法撤銷</p>
          </div>
          
          <div class="flex justify-end gap-4">
            <button
              @click="showDeleteModal = false"
              class="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
            >
              取消
            </button>
            <button
              @click="deleteScene"
              class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 font-medium"
            >
              確認刪除
            </button>
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
// const showCustomSceneModal = ref(false);  // 已隐藏自定义场景功能
// const isGenerating = ref(false);          // 已隐藏自定义场景功能
const hoveredScene = ref(null);
const showRoleModal = ref(false);
const selectedScene = ref(null);
// const showDebug = ref(false);             // 已隐藏调试功能
const showDeleteModal = ref(false);
const sceneToDelete = ref(null);
const isDeleteMode = ref(false);

/* 已隐藏自定义场景功能
// 自定义场景选项
const customSceneOptions = {
  types: [
    { label: '医生对病人', value: 'doctor_patient' },
    { label: '助理对医生', value: 'assistant_doctor' },
  ],
  roles: [
    { label: '脑外科医生', value: 'brain_surgeon' },
    { label: '急诊科医生', value: 'emergency_doctor' },
    { label: '妇产科医生', value: 'gynecologist' },
    { label: '麻醉师', value: 'anesthesiologist' },
  ],
  symptoms: {
    doctor_patient: [
      { label: '头痛', value: 'headache' },
      { label: '头晕', value: 'dizziness' },
      { label: '恶心', value: 'nausea' },
      { label: '腹痛', value: 'abdominal_pain' },
      { label: '出血', value: 'bleeding' },
      { label: '发热', value: 'fever' },
      { label: '视力模糊', value: 'blurred_vision' },
    ],
    assistant_doctor: [
      { label: '手术准备', value: 'surgery_prep' },
      { label: '术中配合', value: 'during_surgery' },
      { label: '紧急护理', value: 'emergency_care' },
      { label: '病例讨论', value: 'case_discussion' },
      { label: '病房巡诊', value: 'ward_rounds' },
      { label: '医技配合', value: 'technical_support' },
    ]
  },
  severities: {
    doctor_patient: [
      { label: '轻微', value: 'mild' },
      { label: '中等', value: 'moderate' },
      { label: '严重', value: 'severe' },
      { label: '紧急', value: 'emergency' },
    ],
    assistant_doctor: [
      { label: '常规', value: 'routine' },
      { label: '急诊', value: 'urgent' },
      { label: '危重', value: 'critical' },
      { label: '教学', value: 'teaching' },
    ]
  },
  emotions: {
    doctor_patient: [
      { label: '平静', value: 'calm' },
      { label: '焦虑', value: 'anxious' },
      { label: '恐惧', value: 'fearful' },
      { label: '愤怒', value: 'angry' },
      { label: '悲伤', value: 'sad' },
    ],
    assistant_doctor: [
      { label: '专业严肃', value: 'professional' },
      { label: '耐心指导', value: 'patient' },
      { label: '紧急催促', value: 'urgent' },
      { label: '严厉批评', value: 'strict' },
      { label: '和蔼亲切', value: 'friendly' },
    ]
  },
};

// 自定义场景数据
const customScene = ref({
  type: '',
  role: '',
  symptoms: [],
  severity: '',
  emotion: '',
  notes: '',
});
*/

/* 已隐藏自定义场景功能
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
  if (!customScene.value.type || !customScene.value.role || customScene.value.symptoms.length === 0 || !customScene.value.severity || !customScene.value.emotion) {
    alert('請完善場景信息');
    return;
  }
  
  isGenerating.value = true;
  
  try {
    // 映射场景类型值到API使用的类型
    const sceneTypeMap = {
      'doctor_patient': '医生对病人',
      'assistant_doctor': '助理对医生'
    };
    
    // 构建提示词
    const prompt = `生成一个${customScene.value.type === 'assistant_doctor' ? '医助交互' : '医患对话'}场景，设定如下：
      - 医生角色：${getLabelByValue(customSceneOptions.roles, customScene.value.role)}
      - ${customScene.value.type === 'assistant_doctor' ? '情境' : '患者症状'}：${customScene.value.symptoms.map(s => getLabelByValue(customSceneOptions.symptoms[customScene.value.type], s)).join('、')}
      - ${customScene.value.type === 'assistant_doctor' ? '紧急程度' : '症状严重程度'}：${getLabelByValue(customSceneOptions.severities[customScene.value.type], customScene.value.severity)}
      - ${customScene.value.type === 'assistant_doctor' ? '医生态度' : '患者情绪'}：${getLabelByValue(customSceneOptions.emotions[customScene.value.type], customScene.value.emotion)}
      ${customScene.value.notes ? `- 其他备注：${customScene.value.notes}` : ''}
    `;
    
    // 调用API生成场景描述
    const response = await axios.post('/api/generate-custom-scene', { 
      prompt,
      scene_type: sceneTypeMap[customScene.value.type] || '医生对病人'
    });
    
    if (response.data.success) {
      // 获取生成的场景数据
      const customSceneData = response.data.scene;
      
      // 将新场景添加到场景列表
      scenes.value.unshift(customSceneData);
      
      // 关闭模态框
      showCustomSceneModal.value = false;
      
      // 重置表单
      customScene.value = {
        type: '',
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
*/

// 根据场景类型获取标签背景颜色
const getTypeTagColor = (sceneType) => {
  const colorMap = {
    '助手对医生': '#E3F2FD', // 淡蓝色
    '医生对病人': '#E8F5E8'  // 淡绿色
  };
  return colorMap[sceneType] || '#F5F5F5'; // 默认浅灰色
};

// 根据场景类型获取标签文字颜色
const getTypeTagTextColor = (sceneType) => {
  const colorMap = {
    '助手对医生': '#1976D2', // 蓝色文字
    '医生对病人': '#388E3C'  // 绿色文字
  };
  return colorMap[sceneType] || '#616161'; // 默认灰色文字
};

// 获取场景列表
const fetchScenes = async () => {
  try {
    const response = await axios.get('/api/scenes');
    if (response.data.success) {
      scenes.value = response.data.scenes;
      
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

/**
 * 清理之前的对话数据
 */
const clearPreviousConversationData = async () => {
  console.log('🧹 主页: 清理之前的对话数据...');

  try {
    // 清理服务器端conversation_id
    await axios.post("/api/coze-conversation", {
      action: 'clearHistory',
      userId: 'default_user'
    });
    console.log('✅ 主页: 服务器端conversation_id已清理');
  } catch (error) {
    console.error('❌ 主页: 清理服务器端conversation_id失败:', error);
  }

  // 仅在客户端清理
  if (process.client) {
    // 清理对话相关的localStorage数据（保留用户偏好）
    const keysToRemove = [
      'conversationHistory',
      'trainingProgress',
      'evaluationData'
    ];

    keysToRemove.forEach(key => {
      if (localStorage.getItem(key)) {
        localStorage.removeItem(key);
        console.log(`✅ 主页: 已清理localStorage: ${key}`);
      }
    });

    // 清理全局对话状态
    const globalKeysToClean = [
      'finishTraining',
      'playTalkAnimation',
      'onPhoneIdleStarted',
      'conversationComplete'
    ];

    globalKeysToClean.forEach(key => {
      if (window[key]) {
        delete window[key];
        console.log(`✅ 主页: 已清理全局变量: ${key}`);
      }
    });
  }

  console.log('✅ 主页: 对话数据清理完成');
};

// 选择场景
const selectScene = async (sceneId) => {
  console.log('选择场景:', sceneId);

  // 先清理之前的对话数据
  await clearPreviousConversationData();

  try {
    const response = await axios.post('/api/scenes', { scene_id: sceneId });
    if (response.data.success) {
      const scene = response.data.scene;

      // 检查是否为自定义场景
      if (scene.config_id === 'custom') {
        // 将场景信息存储到localStorage，包含scene_id（仅在客户端）
        if (process.client) {
          localStorage.setItem('currentScene', JSON.stringify(scene));
        }

        // 根据scene_id跳转到不同的自定义场景
        if (sceneId === 'brain_surgery_002') {
          // 跳转到自定义手术场景页面
          router.push(`/custom-scene-operation?scene_id=${sceneId}`);
        } else if (sceneId === 'patient_handover_001') {
          // 跳转到自定义电话场景页面
          router.push(`/custom-scene-phone?scene_id=${sceneId}`);
        } else {
          // 默认跳转到手术场景
          router.push(`/custom-scene-operation?scene_id=${sceneId}`);
        }
      } else {
        // 将场景信息存储到localStorage（仅在客户端）
        if (process.client) {
          localStorage.setItem('currentScene', JSON.stringify(scene));
        }
        // 跳转到训练页面
        router.push('/training');
      }
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
  event.target.src = '/custom-scene.jpg';
};

// 查看角色详情
const viewRoleDetails = (scene) => {
  selectedScene.value = scene;
  showRoleModal.value = true;
};

// 确认删除场景
const confirmDeleteScene = (scene) => {
  sceneToDelete.value = scene;
  showDeleteModal.value = true;
};

// 删除场景
const deleteScene = async () => {
  if (!sceneToDelete.value) return;
  
  try {
    const response = await axios.delete('/api/scenes', {
      data: { scene_id: sceneToDelete.value.scene_id }
    });
    
    if (response.data.success) {
      // 从列表中移除场景
      scenes.value = scenes.value.filter(s => s.scene_id !== sceneToDelete.value.scene_id);
      showDeleteModal.value = false;
      sceneToDelete.value = null;
    } else {
      throw new Error(response.data.error || '删除场景失败');
    }
  } catch (error) {
    console.error('删除场景失败:', error);
    alert('删除场景失败: ' + error.message);
  }
};

// 页面加载时初始化场景数据
onMounted(async () => {
  // 页面加载时清理之前的对话数据
  await clearPreviousConversationData();

  // 初始化场景数据 - 不再需要调用 /api/init-scenes
  try {
    await fetchScenes(); // 保留 fetchScenes 以加载列表
  } catch (error) {
    console.error('获取场景列表失败:', error); // 更新错误消息
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

.animate-bounce-once {
  animation: bounce 0.5s;
}

@keyframes bounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-5px);
  }
}
</style>