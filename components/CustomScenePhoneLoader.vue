<template>
  <div ref="sceneContainer" class="scene-container">
    <div v-if="loading" class="loading-overlay">
      <div class="loading-spinner"></div>
      <p>正在加载自定义办公室电话场景...</p>
    </div>
    <div v-if="error" class="error-overlay">
      <p>{{ error }}</p>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from "vue";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
import * as THREE from "three";
import TWEEN from '@tweenjs/tween.js';

/**
 * 组件的属性
 */
const props = defineProps({
  sceneId: {
    type: String,
    required: true
  }
});

const sceneContainer = ref(null);
const loading = ref(true);
const error = ref('');

let scene, camera, renderer, mixer, clock, controls;
let sceneObj, doctorCharacter;
let isSceneReady = false;
let currentCharacterInfo = null;

// 动画相关变量
let currentAction = null;
let currentStage = 'none';  // none, takeup, waiting, talking, dropout, idle
let phoneTakeupClip = null;
let phoneTalkClip = null;
let phoneDropoutClip = null;
let idleClip = null;

// 自定义电话场景配置（硬编码，针对doctor-office-phone场景）
const customPhoneSceneConfig = {
  "configId": "doctor-office-phone",
  "name": "医生-办公室-打电话场景",
  "description": "",
  "sceneModel": {
    "url": "https://ccts-1312877935.cos.ap-hongkong.myqcloud.com/model/office_room.glb",
    "position": {
      "x": -0.2,
      "y": -0.9,
      "z": -0.2
    },
    "rotation": {
      "x": 0,
      "y": 0,
      "z": 0
    },
    "scale": {
      "x": 1,
      "y": 1,
      "z": 1
    }
  },
  "characterModel": {
    "url": "https://ccts-1312877935.cos.ap-hongkong.myqcloud.com/model/doctor_phone.glb",
    "position": {
      "x": 0,
      "y": -0.9,
      "z": 0
    },
    "rotation": {
      "x": 0,
      "y": 0,
      "z": 0
    },
    "scale": {
      "x": 1,
      "y": 1,
      "z": 1
    }
  },
  "camera": {
    "position": {
      "x": 0,
      "y": 0.6999999999999996,
      "z": 2
    },
    "lookAt": {
      "x": 0,
      "y": 0.7,
      "z": 0
    },
    "fov": 75,
    "near": 0.1,
    "far": 1000
  },
  "lighting": {
          "hemisphereLight": {
        "skyColor": "#ffffff",
        "groundColor": "#f0f0f0",
        "intensity": 0.6,
        "position": {
          "x": 0,
          "y": 10,
          "z": 0
        }
      },
          "directionalLight": {
        "color": "#ffffff",
        "intensity": 0.2,
        "position": {
          "x": 3,
          "y": 8,
          "z": 5
        },
        "castShadow": true
      },
                "ambientLight": {
        "color": "#ffffff",
        "intensity": 0.8
      }
  },
  "background": {
    "type": "color",
    "value": "#e0f4ff"
  },
  "renderer": {
    "toneMappingExposure": 1.0,
    "toneMapping": "ACESFilmicToneMapping"
  }
};

/**
 * 通过角色模型URL获取角色信息
 */
const getCharacterByUrl = async (characterUrl) => {
  try {
    const response = await $fetch('/api/characters');
    if (response.success) {
      const characters = response.data;
      // 通过URL或文件名匹配角色
      const character = characters.find(char => {
        const normalize = (url) => url.replace(/^\/public/, '').replace(/^\//, '');
        const charUrlNormalized = normalize(char.url);
        const targetUrlNormalized = normalize(characterUrl);
        const charFilename = charUrlNormalized.split('/').pop();
        const targetFilename = targetUrlNormalized.split('/').pop();
        return charUrlNormalized === targetUrlNormalized || char.url === characterUrl || charFilename === targetFilename;
      });
      
      if (character) {
        return character;
      }
    }
    console.warn('未找到匹配的角色，将使用默认音色');
    return null;
  } catch (error) {
    console.error('获取角色信息失败:', error);
    return null;
  }
};

/**
 * 预加载当前场景的角色信息
 */
const preloadCharacterInfo = async () => {
  if (!customPhoneSceneConfig?.characterModel?.url) {
    console.warn('场景配置中没有角色模型URL');
    return;
  }

  try {
    const characterUrl = customPhoneSceneConfig.characterModel.url;
    
    currentCharacterInfo = await getCharacterByUrl(characterUrl);
    
    if (currentCharacterInfo) {
      // 将角色信息暴露到全局，供ChatBoxComponent使用
      window.currentSceneCharacter = currentCharacterInfo;
      console.log(`角色信息已缓存: ${currentCharacterInfo.name} (${currentCharacterInfo.voice})`);
    } else {
      console.warn(`找不到模型URL为 ${characterUrl} 的角色配置，将使用默认设置`);
      // 提供默认角色信息
      window.currentSceneCharacter = {
        name: '医生',
        voice: 'zh-CN-YunyangNeural'
      };
    }
  } catch (error) {
    console.error('预加载角色信息失败:', error);
    // 提供默认角色信息
    window.currentSceneCharacter = {
      name: '医生', 
      voice: 'zh-CN-YunyangNeural'
    };
  }
};

/**
 * 初始化Three.js场景
 */
const initScene = (container) => {
  if (!customPhoneSceneConfig) {
    error.value = '场景配置未加载';
    return;
  }

  // 创建场景
  scene = new THREE.Scene();
  const { clientWidth: width, clientHeight: height } = container;

  // 设置背景
  if (customPhoneSceneConfig.background.type === 'color') {
    scene.background = new THREE.Color(customPhoneSceneConfig.background.value);
  }

  // 渲染器配置
  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true
  });
  renderer.setSize(width, height);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  
  // 优化阴影设置，减少过度黑暗
  renderer.shadowMap.autoUpdate = true;
  
  // 应用渲染器配置
  if (customPhoneSceneConfig.renderer.toneMapping === 'ACESFilmicToneMapping') {
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
  }
  renderer.toneMappingExposure = customPhoneSceneConfig.renderer.toneMappingExposure;
  
  container.appendChild(renderer.domElement);

  // 相机配置
  const cameraConfig = customPhoneSceneConfig.camera;
  camera = new THREE.PerspectiveCamera(
    cameraConfig.fov, 
    width / height, 
    cameraConfig.near, 
    cameraConfig.far
  );
  camera.position.set(
    cameraConfig.position.x,
    cameraConfig.position.y,
    cameraConfig.position.z
  );
  camera.lookAt(
    cameraConfig.lookAt.x,
    cameraConfig.lookAt.y,
    cameraConfig.lookAt.z
  );

  // 光源配置
  const lightingConfig = customPhoneSceneConfig.lighting;
  
  // 半球光
  const hemisphereLight = new THREE.HemisphereLight(
    lightingConfig.hemisphereLight.skyColor,
    lightingConfig.hemisphereLight.groundColor,
    lightingConfig.hemisphereLight.intensity
  );
  hemisphereLight.position.set(
    lightingConfig.hemisphereLight.position.x,
    lightingConfig.hemisphereLight.position.y,
    lightingConfig.hemisphereLight.position.z
  );
  scene.add(hemisphereLight);

  // 平行光
  const directionalLight = new THREE.DirectionalLight(
    lightingConfig.directionalLight.color,
    lightingConfig.directionalLight.intensity
  );
  directionalLight.position.set(
    lightingConfig.directionalLight.position.x,
    lightingConfig.directionalLight.position.y,
    lightingConfig.directionalLight.position.z
  );
  directionalLight.castShadow = lightingConfig.directionalLight.castShadow;
  
  // 优化阴影设置，减少阴影强度和对比度
  if (directionalLight.castShadow) {
    directionalLight.shadow.mapSize.width = 1024; // 降低阴影分辨率，减少锐利度
    directionalLight.shadow.mapSize.height = 1024;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -8; // 缩小阴影范围
    directionalLight.shadow.camera.right = 8;
    directionalLight.shadow.camera.top = 8;
    directionalLight.shadow.camera.bottom = -8;
    directionalLight.shadow.bias = -0.0005; // 调整偏移
    directionalLight.shadow.normalBias = 0.05; // 增加法线偏移，减少阴影强度
    directionalLight.shadow.radius = 12; // 增加阴影柔和度
    directionalLight.shadow.blurSamples = 15; // 适中的模糊采样
  }
  
  scene.add(directionalLight);

  // 环境光
  const ambientLight = new THREE.AmbientLight(
    lightingConfig.ambientLight.color,
    lightingConfig.ambientLight.intensity
  );
  scene.add(ambientLight);

  // 简化照明配置，只保留必要的光源，大幅降低强度
  try {
    // 主要天花板照明 - 提供房间基础照明
    const mainCeilingLight = new THREE.PointLight('#ffffff', 0.4, 12);
    mainCeilingLight.position.set(0, 3.5, 0);
    scene.add(mainCeilingLight);
    console.log('✨ 添加主要天花板照明');

    // 补充照明 - 确保房间角落有足够亮度
    const supplementLight = new THREE.PointLight('#fff8dc', 0.3, 8);
    supplementLight.position.set(2, 3, 2);
    scene.add(supplementLight);
    console.log('✨ 添加补充照明');

    // 柔和背景光 - 避免阴影过重
    const softBackLight = new THREE.PointLight('#f5f5f5', 0.2, 6);
    softBackLight.position.set(-1, 2.5, -1);
    scene.add(softBackLight);
    console.log('✨ 添加柔和背景光');
  } catch (error) {
    console.warn('添加点光源失败:', error);
  }

  // 初始化时钟
  clock = new THREE.Clock();
};

/**
 * 加载3D场景（办公室）
 */
const loadScene = async () => {
  if (!customPhoneSceneConfig) return;
  
  try {
    const sceneModelConfig = customPhoneSceneConfig.sceneModel;
    
    const loader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('/draco/');
    loader.setDRACOLoader(dracoLoader);
    
    // 加载办公室模型
    const gltf = await loader.loadAsync(sceneModelConfig.url);
    sceneObj = gltf.scene;
    
    sceneObj.name = 'office_room';
    
    // 应用位置配置
    sceneObj.position.set(
      sceneModelConfig.position.x,
      sceneModelConfig.position.y,
      sceneModelConfig.position.z
    );
    sceneObj.rotation.set(
      sceneModelConfig.rotation.x,
      sceneModelConfig.rotation.y,
      sceneModelConfig.rotation.z
    );
    sceneObj.scale.set(
      sceneModelConfig.scale.x,
      sceneModelConfig.scale.y,
      sceneModelConfig.scale.z
    );
    
    // 设置阴影并优化材质亮度
    sceneObj.traverse((node) => {
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
        
        // 优化材质，极大减少反射亮度
        if (node.material) {
          try {
            if (node.material.type === 'MeshStandardMaterial' || node.material.type === 'MeshPhysicalMaterial') {
              node.material.envMapIntensity = 0.1; // 极大降低环境光反射
              // 增加粗糙度，减少反射
              if (node.material.roughness !== undefined) {
                node.material.roughness = Math.max(0.8, Math.min(1.0, node.material.roughness));
              }
              // 保持极低的金属度
              if (node.material.metalness !== undefined) {
                node.material.metalness = Math.max(0.0, Math.min(0.05, node.material.metalness));
              }
            }
          } catch (error) {
            console.warn('材质优化失败:', error);
          }
        }
      }
    });
    
    scene.add(sceneObj);
    
  } catch (err) {
    console.error('场景加载失败:', err);
    error.value = '场景加载失败: ' + err.message;
  }
};

/**
 * 加载3D角色（doctor）
 */
const loadCharacter = async () => {
  if (!customPhoneSceneConfig) return;
  
  try {
    const characterModelConfig = customPhoneSceneConfig.characterModel;
    
    const loader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('/draco/');
    loader.setDRACOLoader(dracoLoader);
    
    // 加载doctor模型
    const gltf = await loader.loadAsync(characterModelConfig.url);
    doctorCharacter = gltf.scene;
    
    // 应用位置配置
    doctorCharacter.position.set(
      characterModelConfig.position.x,
      characterModelConfig.position.y,
      characterModelConfig.position.z
    );
    doctorCharacter.rotation.set(
      characterModelConfig.rotation.x,
      characterModelConfig.rotation.y,
      characterModelConfig.rotation.z
    );
    doctorCharacter.scale.set(
      characterModelConfig.scale.x,
      characterModelConfig.scale.y,
      characterModelConfig.scale.z
    );
    
    // 设置阴影并优化材质亮度
    doctorCharacter.traverse((node) => {
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
        
        // 优化角色材质，极大减少反射亮度
        if (node.material) {
          try {
            if (node.material.type === 'MeshStandardMaterial' || node.material.type === 'MeshPhysicalMaterial') {
              node.material.envMapIntensity = 0.1; // 极大降低环境光反射
              // 大幅增加粗糙度，减少反射
              if (node.material.roughness !== undefined) {
                node.material.roughness = Math.max(0.9, Math.min(1.0, node.material.roughness));
              }
              // 保持极低金属度，适合人物皮肤和衣物
              if (node.material.metalness !== undefined) {
                node.material.metalness = Math.max(0.0, Math.min(0.02, node.material.metalness));
              }
            }
          } catch (error) {
            console.warn('角色材质优化失败:', error);
          }
        }
      }
    });
    
    scene.add(doctorCharacter);
    
    // 处理动画
    try {
      if (gltf.animations && gltf.animations.length > 0) {
        handleAnimations(gltf.animations);
      } else {
        console.warn('模型中没有找到动画数据');
      }
    } catch (error) {
      console.error('动画处理失败:', error);
    }
    
  } catch (err) {
    console.error('角色加载失败:', err);
    error.value = '角色加载失败: ' + err.message;
  }
};

/**
 * 处理动画（参考测试代码）
 */
const handleAnimations = (animationClips) => {
  if (!animationClips || !Array.isArray(animationClips)) {
    console.error('无效的动画数据');
    return;
  }

  console.log('🎬 开始处理电话动画...');
  console.log('发现动画数量:', animationClips.length);
  
  // 列出所有动画名称
  console.log('所有动画名称:');
  animationClips.forEach((clip, index) => {
    if (clip && clip.name && typeof clip.duration === 'number') {
      console.log(`  ${index + 1}. ${clip.name} (时长: ${clip.duration.toFixed(2)}s)`);
    }
  });
  
  // 查找需要的动画（优先查找电话专用动画，如果没有则使用替代动画）
  phoneTakeupClip = animationClips.find(clip => clip.name === 'phone_takeup');
  phoneTalkClip = animationClips.find(clip => clip.name === 'phone_talk') || animationClips.find(clip => clip.name === 'talk');
  phoneDropoutClip = animationClips.find(clip => clip.name === 'phone_dropout');
  idleClip = animationClips.find(clip => clip.name === 'idle');
  
  // 检查必要的动画是否找到
  const missingAnimations = [];
  if (!phoneTalkClip && !animationClips.find(clip => clip.name === 'talk')) {
    missingAnimations.push('phone_talk 或 talk');
  }
  if (!idleClip) missingAnimations.push('idle');
  
  if (missingAnimations.length > 0) {
    console.error('❌ 未找到以下关键动画:', missingAnimations);
    error.value = `未找到关键动画: ${missingAnimations.join(', ')}`;
    return;
  }
  
  // 如果没有电话专用动画，使用基础动画作为替代
  if (!phoneTakeupClip) {
    console.warn('⚠️ 未找到phone_takeup动画，将直接进入等待状态');
  }
  if (!phoneDropoutClip) {
    console.warn('⚠️ 未找到phone_dropout动画，将直接切换到idle');
  }
  
  if (phoneTakeupClip) {
    console.log(`📱 phone_takeup 时长: ${phoneTakeupClip.duration.toFixed(2)}秒`);
  }
  console.log(`📞 ${phoneTalkClip.name} 时长: ${phoneTalkClip.duration.toFixed(2)}秒`);
  if (phoneDropoutClip) {
    console.log(`📴 phone_dropout 时长: ${phoneDropoutClip.duration.toFixed(2)}秒`);
  }
  console.log(`😌 idle 时长: ${idleClip.duration.toFixed(2)}秒`);
  
  // 创建动画混合器
  if (doctorCharacter) {
    mixer = new THREE.AnimationMixer(doctorCharacter);
    
    // 设置全局动画控制函数
    setupGlobalAnimationControls();
    
    console.log('✅ 电话动画准备完成');
  } else {
    console.error('角色模型未准备就绪，无法创建动画混合器');
    return;
  }
  
  // 自动开始：播放phone_takeup动画（如果存在），否则直接进入等待状态
  setTimeout(() => {
    if (phoneTakeupClip) {
      playPhoneTakeupAnimation();
    } else {
      // 没有takeup动画，直接进入等待状态
      currentStage = 'waiting';
      console.log('📱 没有phone_takeup动画，直接进入等待状态');
    }
  }, 500);
};

/**
 * 设置全局动画控制函数
 */
const setupGlobalAnimationControls = () => {
  console.log('🎭 设置全局动画控制函数...');
  
  // 暴露说话动画控制函数（特殊逻辑：一旦开始说话就一直循环phone_talk）
  window.playTalkAnimation = function(play) {
    console.log('🎭 电话场景动画控制 - playTalkAnimation:', play);
    
    if (play && currentStage === 'waiting') {
      // 第一次开始说话：切换到phone_talk循环
      playPhoneTalkAnimation();
    }
    // 注意：不管后续是否还在说话，都保持phone_talk循环，直到训练结束
  };
  
  // 暴露训练结束控制函数
  window.finishTraining = function() {
    console.log('🎭 训练结束');
    if (phoneDropoutClip) {
      console.log('🎭 开始phone_dropout动画');
      playPhoneDropoutAnimation();
    } else {
      console.log('🎭 没有phone_dropout动画，直接切换到idle');
      crossFadeToIdleSeamless();
    }
  };
  
  // 暴露动画状态查询函数
  window.getPhoneAnimationStage = function() {
    return currentStage;
  };
  
  console.log('✅ 全局动画控制函数设置完成');
  console.log('🔍 验证函数设置:', {
    playTalkAnimation: typeof window.playTalkAnimation,
    finishTraining: typeof window.finishTraining
  });
};

/**
 * 播放phone_takeup动画，停在最后一帧
 */
const playPhoneTakeupAnimation = () => {
  if (!phoneTakeupClip || !mixer) {
    console.error('❌ phone_takeup动画未准备就绪');
    return;
  }

  console.log('🎬 播放phone_takeup动画');
  
  currentStage = 'takeup';

  // 清理之前的事件监听器
  mixer.removeEventListener('finished', onTakeupFinished);

  // 停止当前动画
  if (currentAction) {
    currentAction.stop();
    currentAction = null;
  }

  // 播放phone_takeup动画，播放一次并停在最后一帧
  currentAction = mixer.clipAction(phoneTakeupClip);
  currentAction.reset();
  currentAction.setLoop(THREE.LoopOnce);
  currentAction.clampWhenFinished = true; // 停在最后一帧
  currentAction.play();

  console.log('▶️ phone_takeup动画开始播放');

  // 监听动画完成事件
  mixer.addEventListener('finished', onTakeupFinished);
};

/**
 * 播放phone_talk动画（循环）
 */
const playPhoneTalkAnimation = () => {
  if (!phoneTalkClip || !mixer) {
    console.error('❌ phone_talk动画未准备就绪');
    return;
  }

  console.log(`🎬 播放${phoneTalkClip.name}动画（循环）`);
  
  currentStage = 'talking';

  // 清理事件监听器
  mixer.removeEventListener('finished', onTakeupFinished);
  mixer.removeEventListener('finished', onDropoutFinished);

  // 停止当前动画
  if (currentAction) {
    currentAction.stop();
    currentAction = null;
  }

  // 播放talk动画，循环播放
  currentAction = mixer.clipAction(phoneTalkClip);
  currentAction.reset();
  currentAction.setLoop(THREE.LoopRepeat);
  currentAction.play();

  console.log(`🔄 ${phoneTalkClip.name}动画开始循环播放`);
};

/**
 * 播放phone_dropout动画，然后转idle
 */
const playPhoneDropoutAnimation = () => {
  if (!phoneDropoutClip || !mixer) {
    console.error('❌ phone_dropout动画未准备就绪');
    return;
  }

  console.log('🎬 播放phone_dropout动画');
  
  currentStage = 'dropout';

  // 清理之前的事件监听器
  mixer.removeEventListener('finished', onDropoutFinished);

  // 停止当前动画
  if (currentAction) {
    currentAction.stop();
    currentAction = null;
  }

  // 播放phone_dropout动画，播放一次
  currentAction = mixer.clipAction(phoneDropoutClip);
  currentAction.reset();
  currentAction.setLoop(THREE.LoopOnce);
  currentAction.clampWhenFinished = true;
  currentAction.play();
  
  // 在动画快要结束时准备idle过渡
  const animationDuration = phoneDropoutClip.duration;
  console.log(`🕐 dropout动画时长: ${animationDuration.toFixed(2)}s`);
  
  setTimeout(() => {
    if (currentStage === 'dropout') {
      console.log('🔄 dropout即将结束，开始预准备idle动画');
      prepareIdleTransition();
    }
  }, (animationDuration - 0.2) * 1000); // 提前0.2秒开始准备

  console.log('▶️ phone_dropout动画开始播放');

  // 监听动画完成事件
  mixer.addEventListener('finished', onDropoutFinished);
};

/**
 * phone_takeup动画完成后的处理
 */
const onTakeupFinished = (event) => {
  if (event.action === currentAction && currentStage === 'takeup') {
    console.log('✅ phone_takeup动画播放完成，停在最后一帧');
    
    // 移除事件监听器
    mixer.removeEventListener('finished', onTakeupFinished);
    
    // 更新状态
    currentStage = 'waiting';
    
    console.log('📱 等待用户开始对话...');
  }
};

/**
 * 预准备idle动画过渡
 */
const prepareIdleTransition = () => {
  if (!idleClip || !mixer) {
    console.error('❌ idle动画未准备就绪');
    return;
  }
  
  console.log('🎬 开始预准备idle过渡');
  
  // 创建idle动画action但不立即播放
  const idleAction = mixer.clipAction(idleClip);
  idleAction.reset();
  idleAction.setLoop(THREE.LoopRepeat);
  idleAction.setEffectiveWeight(0); // 权重为0，不影响当前动画
  idleAction.play(); // 开始播放但不可见
  
  // 等待一点时间让dropout稳定，然后开始过渡
  setTimeout(() => {
    if (currentStage === 'dropout' && currentAction) {
      console.log('🔄 开始dropout→idle过渡');
      
      // 非常短的过渡时间
      currentAction.fadeOut(0.1);
      idleAction.fadeIn(0.1);
      
      // 更新状态
      currentStage = 'idle';
      currentAction = idleAction;
      
      // 清理事件监听器
      mixer.removeEventListener('finished', onDropoutFinished);
      
      console.log('🎉 切换到idle循环完成');
      
      // 通知外部idle动画已开始
      if (window.onPhoneIdleStarted) {
        window.onPhoneIdleStarted();
      }
    }
  }, 150); // 150ms后开始过渡
};

/**
 * phone_dropout动画完成后的处理（备用）
 */
const onDropoutFinished = (event) => {
  if (event.action === currentAction && currentStage === 'dropout') {
    console.log('✅ phone_dropout动画播放完成（备用处理）');
    
    // 如果预准备没有工作，使用备用方案
    if (currentStage === 'dropout') {
      // 移除事件监听器
      mixer.removeEventListener('finished', onDropoutFinished);
      
      // 立即切换到idle
      crossFadeToIdleSeamless();
    }
  }
};

/**
 * 无缝切换到idle动画
 */
const crossFadeToIdleSeamless = () => {
  if (!idleClip || !mixer) {
    console.error('❌ idle动画未准备就绪');
    return;
  }

  console.log('🔄 开始无缝切换到idle动画');
  
  currentStage = 'idle';

  // 清理事件监听器
  mixer.removeEventListener('finished', onTakeupFinished);
  mixer.removeEventListener('finished', onDropoutFinished);

  // 预创建idle动画action并设置好
  const idleAction = mixer.clipAction(idleClip);
  idleAction.reset();
  idleAction.setLoop(THREE.LoopRepeat);
  idleAction.setEffectiveWeight(0); // 初始权重为0
  
  // 立即开始播放但权重为0（不可见）
  idleAction.play();
  
  console.log('🎬 idle动画已准备，开始权重过渡');
  
  // 检查当前动画状态
  if (currentAction) {
    console.log(`当前动画权重: ${currentAction.getEffectiveWeight()}`);
    console.log(`当前动画运行状态: ${currentAction.isRunning()}`);
    
    // 确保当前动画有正确的权重
    if (currentAction.getEffectiveWeight() === 0) {
      currentAction.setEffectiveWeight(1);
    }
    
    // 非常快的淡出淡入，减少间隙
    currentAction.fadeOut(0.15);
    idleAction.fadeIn(0.15);
    
    console.log('🔄 使用快速fade过渡 (0.15s)');
  } else {
    // 没有当前动画，直接设置权重
    idleAction.setEffectiveWeight(1);
    console.log('🎬 直接播放idle动画');
  }
  
  // 更新当前动画引用
  currentAction = idleAction;

  console.log('🎉 无缝切换到idle循环完成');
  
  // 通知外部idle动画已开始
  if (window.onPhoneIdleStarted) {
    window.onPhoneIdleStarted();
  }
};

/**
 * 处理窗口大小变化
 */
const handleResize = () => {
  if (!sceneContainer.value || !camera || !renderer) return;
  
  const container = sceneContainer.value;
  const width = container.clientWidth;
  const height = container.clientHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
};

// 动画循环控制
let animationId = null;

/**
 * 动画循环
 */
const animate = () => {
  // 只有在场景准备就绪且没有错误时才继续动画循环
  if (!isSceneReady || error.value) {
    console.log('场景未准备就绪或存在错误，停止动画循环');
    return;
  }

  animationId = requestAnimationFrame(animate);

  // 安全检查：确保所有必要对象都存在
  if (!renderer || !scene || !camera || !clock) {
    console.warn('缺少必要的渲染对象，跳过此帧');
    return;
  }

  try {
    // 更新动画
    const delta = clock.getDelta();
    if (mixer && typeof mixer.update === 'function') {
      mixer.update(delta);
      
      // 防止T-pose：确保始终有足够的动画权重
      try {
        let totalWeight = 0;

        if (mixer._actions && Array.isArray(mixer._actions)) {
          mixer._actions.forEach(action => {
            if (action && typeof action.getEffectiveWeight === 'function' && typeof action.isRunning === 'function') {
              const weight = action.getEffectiveWeight();
              if (weight > 0.001 && action.isRunning()) {
                totalWeight += weight;
              }
            }
          });
          
          // 如果总权重太小，强制当前动画权重为1
          if (totalWeight < 0.8 && currentAction && 
              typeof currentAction.isRunning === 'function' && currentAction.isRunning() &&
              typeof currentAction.getEffectiveWeight === 'function' && 
              typeof currentAction.setEffectiveWeight === 'function') {
            const currentWeight = currentAction.getEffectiveWeight();
            if (currentWeight < 0.8) {
              currentAction.setEffectiveWeight(Math.max(0.8, currentWeight));
            }
          }
        }
      } catch (weightError) {
        console.warn('动画权重检查失败:', weightError);
      }
    }
    
    // 更新补间动画
    try {
      TWEEN.update();
    } catch (tweenError) {
      // 忽略TWEEN更新错误，避免影响渲染
    }

    // 渲染场景
    renderer.render(scene, camera);
  } catch (renderError) {
    console.error('渲染过程中发生错误:', renderError);
    isSceneReady = false;
    error.value = '渲染错误: ' + renderError.message;
  }
};

/**
 * 停止动画循环
 */
const stopAnimation = () => {
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
  isSceneReady = false;
};

/**
 * 初始化整个自定义办公室电话场景
 */
const initializeCustomPhoneScene = async () => {
  try {
    // 停止之前的动画循环
    stopAnimation();
    
    loading.value = true;
    error.value = '';
    isSceneReady = false;
    
    console.log(`正在初始化自定义办公室电话场景，场景ID: ${props.sceneId}`);
    
    // 初始化Three.js场景
    initScene(sceneContainer.value);
    
    // 加载模型
    await Promise.all([
      loadScene(),
      loadCharacter()
    ]);

    // 预加载角色信息（用于TTS）
    await preloadCharacterInfo();
    
    // 所有步骤成功完成，标记场景为准备就绪
    isSceneReady = true;
    loading.value = false;
    
    // 开始动画循环
    animate();
    
    console.log('自定义办公室电话场景初始化完成');
    
  } catch (err) {
    console.error('自定义办公室电话场景初始化失败:', err);
    
    // 确保停止动画循环
    stopAnimation();
    
    loading.value = false;
    error.value = err.message || '自定义办公室电话场景初始化失败';
    
    // 清理可能已创建的对象
    if (renderer) {
      renderer.clear();
    }
  }
};

// 生命周期管理
onMounted(() => {
  initializeCustomPhoneScene();
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  
  // 停止动画循环
  stopAnimation();
  
  // 清理事件监听器
  window.removeEventListener('resize', handleResize);
  
  // 清理Three.js对象
  try {
    if (renderer) {
      if (typeof renderer.dispose === 'function') renderer.dispose();
      if (typeof renderer.forceContextLoss === 'function') renderer.forceContextLoss();
      renderer = null;
    }
    if (controls) {
      if (typeof controls.dispose === 'function') controls.dispose();
      controls = null;
    }
    if (scene) {
      if (typeof scene.clear === 'function') scene.clear();
      scene = null;
    }
    if (camera) {
      camera = null;
    }
    if (mixer) {
      if (typeof mixer.stopAllAction === 'function') mixer.stopAllAction();
      mixer = null;
    }
  } catch (cleanupError) {
    console.warn('清理资源时出错:', cleanupError);
  }
  
  // 清理全局动画函数
  try {
    if (typeof window !== 'undefined') {
      if (window.playTalkAnimation) {
        window.playTalkAnimation = null;
      }
      if (window.finishTraining) {
        window.finishTraining = null;
      }
      if (window.currentSceneCharacter) {
        window.currentSceneCharacter = null;
      }
    }
  } catch (globalCleanupError) {
    console.warn('清理全局函数时出错:', globalCleanupError);
  }
  
  // 清理角色信息缓存
  currentCharacterInfo = null;
});
</script>

<style scoped>
.scene-container {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
}

.scene-container canvas {
  display: block;
  width: 100% !important;
  height: 100% !important;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: white;
  z-index: 10;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: rgba(255, 0, 0, 0.8);
  color: white;
  padding: 20px;
  border-radius: 10px;
  text-align: center;
  z-index: 10;
}
</style> 