<template>
  <div ref="sceneContainer" class="scene-container">
    <div v-if="loading" class="loading-overlay">
      <div class="loading-spinner"></div>
      <p>正在加载自定义电话场景...</p>
    </div>
    <div v-if="error" class="error-overlay">
      <p>{{ error }}</p>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref, defineProps } from "vue";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
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

// 自定义电话场景配置（硬编码，针对brain_surgery_003场景）
const customPhoneSceneConfig = {
  "sceneModel": {
    "url": "https://ccts-1312877935.cos.ap-hongkong.myqcloud.com/model/operation_room.glb",
    "position": {
      "x": 6.5,
      "y": -0.9,
      "z": 1.2
    },
    "rotation": {
      "x": 0,
      "y": -1.5882496193148399,
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
      "x": -0.1,
      "y": -0.9,
      "z": 0.2
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
      "x": -0.009127693255195298,
      "y": 0.6057360704658799,
      "z": 1.9834296257478115
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
      "groundColor": "#8d8d8d",
      "intensity": 6,
      "position": {
        "x": 0,
        "y": 10,
        "z": 0
      }
    },
    "directionalLight": {
      "color": "#ffffff",
      "intensity": 3,
      "position": {
        "x": 5,
        "y": 5,
        "z": 2
      },
      "castShadow": true
    },
    "ambientLight": {
      "color": "#ffffff",
      "intensity": 5
    }
  },
  "background": {
    "type": "color",
    "value": "#87ceeb"
  },
  "renderer": {
    "toneMappingExposure": 0.4,
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
  scene.add(directionalLight);

  // 环境光
  const ambientLight = new THREE.AmbientLight(
    lightingConfig.ambientLight.color,
    lightingConfig.ambientLight.intensity
  );
  scene.add(ambientLight);

  // 初始化时钟
  clock = new THREE.Clock();
};

/**
 * 加载3D场景（手术室）
 */
const loadScene = async () => {
  if (!customPhoneSceneConfig) return;
  
  try {
    const sceneModelConfig = customPhoneSceneConfig.sceneModel;
    
    const loader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('/draco/');
    loader.setDRACOLoader(dracoLoader);
    
    // 加载手术室模型
    const gltf = await loader.loadAsync(sceneModelConfig.url);
    sceneObj = gltf.scene;
    
    sceneObj.name = 'operation_room';
    
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
    
    // 设置阴影
    sceneObj.traverse((node) => {
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });
    
    scene.add(sceneObj);
    
  } catch (err) {
    console.error('场景加载失败:', err);
    error.value = '场景加载失败: ' + err.message;
  }
};

/**
 * 加载3D角色（doctor_phone）
 */
const loadCharacter = async () => {
  if (!customPhoneSceneConfig) return;
  
  try {
    const characterModelConfig = customPhoneSceneConfig.characterModel;
    
    const loader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('/draco/');
    loader.setDRACOLoader(dracoLoader);
    
    // 加载doctor_phone模型
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
    
    // 设置阴影
    doctorCharacter.traverse((node) => {
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });
    
    scene.add(doctorCharacter);
    
    // 处理动画
    if (gltf.animations && gltf.animations.length > 0) {
      handleAnimations(gltf.animations);
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
  console.log('🎬 开始处理电话动画...');
  console.log('发现动画数量:', animationClips.length);
  
  // 列出所有动画名称
  console.log('所有动画名称:');
  animationClips.forEach((clip, index) => {
    console.log(`  ${index + 1}. ${clip.name} (时长: ${clip.duration.toFixed(2)}s)`);
  });
  
  // 查找需要的动画
  phoneTakeupClip = animationClips.find(clip => clip.name === 'phone_takeup');
  phoneTalkClip = animationClips.find(clip => clip.name === 'phone_talk');
  phoneDropoutClip = animationClips.find(clip => clip.name === 'phone_dropout');
  idleClip = animationClips.find(clip => clip.name === 'idle');
  
  // 检查动画是否找到
  const missingAnimations = [];
  if (!phoneTakeupClip) missingAnimations.push('phone_takeup');
  if (!phoneTalkClip) missingAnimations.push('phone_talk');
  if (!phoneDropoutClip) missingAnimations.push('phone_dropout');
  if (!idleClip) missingAnimations.push('idle');
  
  if (missingAnimations.length > 0) {
    console.error('❌ 未找到以下动画:', missingAnimations);
    error.value = `未找到动画: ${missingAnimations.join(', ')}`;
    return;
  }
  
  console.log(`📱 phone_takeup 时长: ${phoneTakeupClip.duration.toFixed(2)}秒`);
  console.log(`📞 phone_talk 时长: ${phoneTalkClip.duration.toFixed(2)}秒`);
  console.log(`📴 phone_dropout 时长: ${phoneDropoutClip.duration.toFixed(2)}秒`);
  console.log(`😌 idle 时长: ${idleClip.duration.toFixed(2)}秒`);
  
  // 创建动画混合器
  mixer = new THREE.AnimationMixer(doctorCharacter);
  
  // 设置全局动画控制函数
  setupGlobalAnimationControls();
  
  console.log('✅ 电话动画准备完成');
  
  // 自动开始：播放phone_takeup动画
  setTimeout(() => {
    playPhoneTakeupAnimation();
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
    console.log('🎭 训练结束 - 开始phone_dropout动画');
    playPhoneDropoutAnimation();
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

  console.log('🎬 播放phone_talk动画（循环）');
  
  currentStage = 'talking';

  // 清理事件监听器
  mixer.removeEventListener('finished', onTakeupFinished);
  mixer.removeEventListener('finished', onDropoutFinished);

  // 停止当前动画
  if (currentAction) {
    currentAction.stop();
    currentAction = null;
  }

  // 播放phone_talk动画，循环播放
  currentAction = mixer.clipAction(phoneTalkClip);
  currentAction.reset();
  currentAction.setLoop(THREE.LoopRepeat);
  currentAction.play();

  console.log('🔄 phone_talk动画开始循环播放');
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
    if (mixer) {
      mixer.update(delta);
      
      // 防止T-pose：确保始终有足够的动画权重
      let totalWeight = 0;
      let mainActiveAction = null;
      
      mixer._actions.forEach(action => {
        const weight = action.getEffectiveWeight();
        if (weight > 0.001 && action.isRunning()) {
          totalWeight += weight;
          if (weight > 0.5) { // 主要动画
            mainActiveAction = action;
          }
        }
      });
      
      // 如果总权重太小，强制当前动画权重为1
      if (totalWeight < 0.8 && currentAction && currentAction.isRunning()) {
        const currentWeight = currentAction.getEffectiveWeight();
        if (currentWeight < 0.8) {
          currentAction.setEffectiveWeight(Math.max(0.8, currentWeight));
        }
      }
    }
    
    // 更新补间动画
    TWEEN.update();

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
 * 初始化整个自定义电话场景
 */
const initializeCustomPhoneScene = async () => {
  try {
    // 停止之前的动画循环
    stopAnimation();
    
    loading.value = true;
    error.value = '';
    isSceneReady = false;
    
    console.log(`正在初始化自定义电话场景，场景ID: ${props.sceneId}`);
    
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
    
    console.log('自定义电话场景初始化完成');
    
  } catch (err) {
    console.error('自定义电话场景初始化失败:', err);
    
    // 确保停止动画循环
    stopAnimation();
    
    loading.value = false;
    error.value = err.message || '自定义电话场景初始化失败';
    
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
  if (renderer) {
    renderer.dispose();
    renderer.forceContextLoss();
    renderer = null;
  }
  if (controls) {
    controls.dispose();
    controls = null;
  }
  if (scene) {
    scene.clear();
    scene = null;
  }
  if (camera) {
    camera = null;
  }
  if (mixer) {
    mixer.stopAllAction();
    mixer = null;
  }
  
  // 清理全局动画函数
  if (window.playTalkAnimation) {
    window.playTalkAnimation = null;
  }
  if (window.finishTraining) {
    window.finishTraining = null;
  }
  
  // 清理角色信息缓存
  currentCharacterInfo = null;
  window.currentSceneCharacter = null;
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