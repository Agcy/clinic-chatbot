<template>
  <div ref="sceneContainer" class="scene-container">
    <div v-if="loading" class="loading-overlay">
      <div class="loading-spinner"></div>
      <p>正在加载3D场景...</p>
    </div>
    <div v-if="error" class="error-overlay">
      <p>{{ error }}</p>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref, defineProps, watch } from "vue";
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
  configId: {
    type: String,
    required: true,
    default: 'doctor-operating-room'
  },
  enableControls: {
    type: Boolean,
    default: false
  }
});

const sceneContainer = ref(null);
const loading = ref(true);
const error = ref('');

let scene, camera, renderer, mixer, clock, controls;
let sceneObj, character;
let sceneConfig = null;
let currentCharacterInfo = null; // 缓存当前场景的角色信息

/**
 * 通过角色模型URL获取角色信息
 */
const getCharacterByUrl = async (characterUrl) => {
  try {
    const response = await $fetch('/api/characters');
    if (response.success) {
      const characters = response.data;
      // 通过URL匹配角色，考虑不同的URL格式
      const character = characters.find(char => {
        const charUrl = char.url.replace(/^\/public/, '').replace(/^\//, '');
        const targetUrl = characterUrl.replace(/^\/public/, '').replace(/^\//, '');
        return charUrl === targetUrl || char.url === characterUrl;
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
  if (!sceneConfig?.characterModel?.url) {
    console.warn('场景配置中没有角色模型URL');
    return;
  }

  try {
    const characterUrl = sceneConfig.characterModel.url;
    
    currentCharacterInfo = await getCharacterByUrl(characterUrl);
    
    if (currentCharacterInfo) {
      // 将角色信息暴露到全局，供ChatBoxComponent使用
      window.currentSceneCharacter = currentCharacterInfo;
      console.log(`角色信息已缓存: ${currentCharacterInfo.name} (${currentCharacterInfo.voice})`);
    } else {
      throw new Error(`找不到模型URL为 ${characterUrl} 的角色配置，请检查character.json或数据库中是否存在对应配置`);
    }
  } catch (error) {
    console.error('预加载角色信息失败:', error);
    throw error;
  }
};

/**
 * 从API获取场景配置
 */
const fetchSceneConfig = async () => {
  // 检查configId是否有效
  if (!props.configId) {
    throw new Error('configId为空，无法获取场景配置');
  }

  try {
    // 优先从 ScenePosition 数据表获取完整配置
    const response = await $fetch(`/api/scene-positions?configId=${props.configId}`);
    
    if (response.success && response.data) {
      sceneConfig = response.data;
      return;
    } else {
      throw new Error(response.error || '获取场景配置失败');
    }
  } catch (scenePositionError) {
    console.error('ScenePosition配置未找到，configId:', props.configId, '错误:', scenePositionError.message);
    throw new Error(`找不到configId=${props.configId}的场景配置，请检查数据库中是否存在对应配置`);
  }
};

/**
 * 初始化Three.js场景
 */
const initScene = (container) => {
  if (!sceneConfig) {
    error.value = '场景配置未加载';
    return;
  }

  // 创建场景
  scene = new THREE.Scene();
  const { clientWidth: width, clientHeight: height } = container;

  // 设置背景
  if (sceneConfig.background.type === 'color') {
    scene.background = new THREE.Color(sceneConfig.background.value);
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
  if (sceneConfig.renderer.toneMapping === 'ACESFilmicToneMapping') {
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
  }
  renderer.toneMappingExposure = sceneConfig.renderer.toneMappingExposure;
  
  container.appendChild(renderer.domElement);

  // 相机配置
  const cameraConfig = sceneConfig.camera;
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
  const lightingConfig = sceneConfig.lighting;
  
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

  // 控制器（可选）
  if (props.enableControls) {
    controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(
      cameraConfig.lookAt.x,
      cameraConfig.lookAt.y,
      cameraConfig.lookAt.z
    );
    controls.update();
  }

  // 初始化时钟
  clock = new THREE.Clock();
};

/**
 * 根据文件扩展名判断是否是FBX格式
 */
const isFbxFormat = (url) => {
  return url.toLowerCase().endsWith('.fbx');
};

/**
 * 加载3D场景
 */
const loadScene = async () => {
  if (!sceneConfig) return;
  
  try {
    const sceneModelConfig = sceneConfig.sceneModel;
    
    if (isFbxFormat(sceneModelConfig.url)) {
      const loader = new FBXLoader();
      sceneObj = await loader.loadAsync(sceneModelConfig.url);
    } else {
      const loader = new GLTFLoader();
      const dracoLoader = new DRACOLoader();
      dracoLoader.setDecoderPath('/draco/');
      loader.setDRACOLoader(dracoLoader);
      
      const gltf = await loader.loadAsync(sceneModelConfig.url);
      sceneObj = gltf.scene;
    }
    
    sceneObj.name = 'scene_model';
    
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
 * 加载3D角色
 */
const loadCharacter = async () => {
  if (!sceneConfig) return;
  
  try {
    const characterModelConfig = sceneConfig.characterModel;
    
    let characterObj, animations;
    
    if (isFbxFormat(characterModelConfig.url)) {
      const loader = new FBXLoader();
      characterObj = await loader.loadAsync(characterModelConfig.url);
      animations = characterObj.animations;
    } else {
      const loader = new GLTFLoader();
      const dracoLoader = new DRACOLoader();
      dracoLoader.setDecoderPath('/draco/');
      loader.setDRACOLoader(dracoLoader);
      
      const gltf = await loader.loadAsync(characterModelConfig.url);
      characterObj = gltf.scene;
      animations = gltf.animations;
    }
    
    character = characterObj;
    
    // 应用位置配置
    character.position.set(
      characterModelConfig.position.x,
      characterModelConfig.position.y,
      characterModelConfig.position.z
    );
    character.rotation.set(
      characterModelConfig.rotation.x,
      characterModelConfig.rotation.y,
      characterModelConfig.rotation.z
    );
    character.scale.set(
      characterModelConfig.scale.x,
      characterModelConfig.scale.y,
      characterModelConfig.scale.z
    );
    
    // 设置阴影
    character.traverse((node) => {
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });
    
    scene.add(character);
    
    // 初始化动画系统
    if (animations && animations.length > 0) {
      mixer = new THREE.AnimationMixer(character);
      
      // 查找idle动画并播放
      const idleClip = THREE.AnimationClip.findByName(animations, 'idle');
      if (idleClip) {
        const idleAction = mixer.clipAction(idleClip);
        idleAction.setLoop(THREE.LoopRepeat);
        idleAction.play();
      } else if (animations[0]) {
        // 如果没有idle动画，播放第一个动画
        const action = mixer.clipAction(animations[0]);
        action.play();
      }
      
      // 暴露动画控制函数到全局
      window.playTalkAnimation = function(play) {
        if (!mixer) return;
        
        const talkClip = THREE.AnimationClip.findByName(animations, 'talk');
        const idleClip = THREE.AnimationClip.findByName(animations, 'idle');
        
        if (!talkClip || !idleClip) {
          console.warn("找不到talk或idle动画");
          return;
        }
        
        const talkAction = mixer.clipAction(talkClip);
        const idleAction = mixer.clipAction(idleClip);
        
        if (play) {
          // 开始说话：淡出 idle，淡入 talk
          idleAction.fadeOut(0.5);
          talkAction.reset().fadeIn(0.5).play();
        } else {
          // 停止说话：淡出 talk，淡入 idle
          talkAction.fadeOut(0.5);
          idleAction.reset().fadeIn(0.5).play();
        }
      };
    }
    
  } catch (err) {
    console.error('角色加载失败:', err);
    error.value = '角色加载失败: ' + err.message;
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
let isSceneReady = false;

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
    if (mixer) mixer.update(delta);
    
    // 更新补间动画
    TWEEN.update();

    // 更新控制器
    if (controls) controls.update();

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
 * 初始化整个场景
 */
const initializeScene = async () => {
  try {
    // 停止之前的动画循环
    stopAnimation();
    
    loading.value = true;
    error.value = '';
    isSceneReady = false;
    
    // 获取场景配置
    await fetchSceneConfig();
    
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
    
  } catch (err) {
    console.error('场景初始化失败:', err);
    
    // 确保停止动画循环
    stopAnimation();
    
    loading.value = false;
    error.value = err.message || '场景初始化失败';
    
    // 清理可能已创建的对象
    if (renderer) {
      renderer.clear();
    }
  }
};

// 监听configId变化
watch(() => props.configId, (newConfigId) => {
  // 只有当configId有效且容器已准备好时才初始化场景
  if (newConfigId && sceneContainer.value) {
    // 清除旧的角色信息缓存
    currentCharacterInfo = null;
    window.currentSceneCharacter = null;
    console.log('场景变化，清除角色信息缓存');
    
    initializeScene();
  } else if (!newConfigId) {
    // 如果configId为null，停止当前渲染并显示加载状态
    stopAnimation();
    loading.value = true;
    error.value = '';
    console.log('configId为空，等待数据加载...');
  }
});

// 生命周期管理
onMounted(() => {
  // 只有当configId有效时才初始化场景
  if (props.configId) {
    initializeScene();
  } else {
    loading.value = true;
    console.log('组件挂载时configId为空，等待数据加载...');
  }
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