<template>
  <div ref="sceneContainer" class="scene-container">
    <div v-if="loading" class="loading-overlay">
      <div class="loading-spinner"></div>
      <p>正在加载自定义3D场景...</p>
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

let scene, camera, renderer, mixerDoctor, mixerScene, clock, controls;
let sceneObj, doctorCharacter;
let isSceneReady = false;
let currentCharacterInfo = null;

// 自定义场景配置（硬编码，针对woman-operation-room-with-doctor场景）
const customSceneConfig = {
  "configId": "woman-operation-room-with-doctor",
  "name": "女病人手术进行场景",
  "description": "",
  "sceneModel": {
    "url": "https://ccts-1312877935.cos.ap-hongkong.myqcloud.com/model/operating_room_2.glb",
    "position": {
      "x": -0.4,
      "y": -0.7,
      "z": 1.1
    },
    "rotation": {
      "x": 0,
      "y": -1.3962634015954636,
      "z": 0
    },
    "scale": {
      "x": 1,
      "y": 1,
      "z": 1
    }
  },
  "characterModel": {
    "url": "https://ccts-1312877935.cos.ap-hongkong.myqcloud.com/model/doctor.glb",
    "position": {
      "x": -0.4,
      "y": -0.6,
      "z": 0.4
    },
    "rotation": {
      "x": 0,
      "y": 0.29670597283903605,
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
  if (!customSceneConfig?.characterModel?.url) {
    console.warn('场景配置中没有角色模型URL');
    return;
  }

  try {
    const characterUrl = customSceneConfig.characterModel.url;
    
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
  if (!customSceneConfig) {
    error.value = '场景配置未加载';
    return;
  }

  // 创建场景
  scene = new THREE.Scene();
  const { clientWidth: width, clientHeight: height } = container;

  // 设置背景
  if (customSceneConfig.background.type === 'color') {
    scene.background = new THREE.Color(customSceneConfig.background.value);
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
  if (customSceneConfig.renderer.toneMapping === 'ACESFilmicToneMapping') {
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
  }
  renderer.toneMappingExposure = customSceneConfig.renderer.toneMappingExposure;
  
  container.appendChild(renderer.domElement);

  // 相机配置
  const cameraConfig = customSceneConfig.camera;
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
  const lightingConfig = customSceneConfig.lighting;
  
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
 * 根据文件扩展名判断是否是FBX格式
 */
const isFbxFormat = (url) => {
  return url.toLowerCase().endsWith('.fbx');
};

/**
 * 加载3D场景（手术室场景2）
 */
const loadScene = async () => {
  if (!customSceneConfig) return;
  
  try {
    const sceneModelConfig = customSceneConfig.sceneModel;
    
    const loader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('/draco/');
    loader.setDRACOLoader(dracoLoader);
    
    // 加载手术室场景2模型
    const gltf = await loader.loadAsync(sceneModelConfig.url);
    sceneObj = gltf.scene;
    
    sceneObj.name = 'operating_room_2';
    
    // 应用位置和旋转配置（注意：配置文件中的旋转值已经是弧度）
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
    
    // 初始化场景动画系统（如果有动画的话）
    if (gltf.animations && gltf.animations.length > 0) {
      mixerScene = new THREE.AnimationMixer(sceneObj);
      
      // 查找并播放场景中的动画
      if (gltf.animations[0]) {
        const action = mixerScene.clipAction(gltf.animations[0]);
        action.setLoop(THREE.LoopRepeat);
        action.play();
        console.log('开始播放场景动画');
      }
    }
    
  } catch (err) {
    console.error('场景加载失败:', err);
    error.value = '场景加载失败: ' + err.message;
  }
};

/**
 * 加载3D角色（doctor）
 */
const loadCharacter = async () => {
  if (!customSceneConfig) return;
  
  try {
    const characterModelConfig = customSceneConfig.characterModel;
    
    const loader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('/draco/');
    loader.setDRACOLoader(dracoLoader);
    
    // 加载doctor模型
    const gltf = await loader.loadAsync(characterModelConfig.url);
    doctorCharacter = gltf.scene;
    
    // 应用位置和旋转配置（注意：配置文件中的旋转值已经是弧度）
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
    
    // 初始化doctor的动画系统
    if (gltf.animations && gltf.animations.length > 0) {
      mixerDoctor = new THREE.AnimationMixer(doctorCharacter);
      
      // 查找idle动画并播放
      const idleClip = THREE.AnimationClip.findByName(gltf.animations, 'idle');
      if (idleClip) {
        const idleAction = mixerDoctor.clipAction(idleClip);
        idleAction.setLoop(THREE.LoopRepeat);
        idleAction.play();
        console.log('开始播放doctor的idle动画');
      } else if (gltf.animations[0]) {
        // 如果没有idle动画，播放第一个动画
        const action = mixerDoctor.clipAction(gltf.animations[0]);
        action.setLoop(THREE.LoopRepeat);
        action.play();
      }
      
      // 暴露动画控制函数到全局
      window.playTalkAnimation = function(play) {
        if (!mixerDoctor) return;
        
        const talkClip = THREE.AnimationClip.findByName(gltf.animations, 'talk');
        const idleClip = THREE.AnimationClip.findByName(gltf.animations, 'idle');
        
        if (!talkClip || !idleClip) {
          console.warn("找不到talk或idle动画");
          return;
        }
        
        const talkAction = mixerDoctor.clipAction(talkClip);
        const idleAction = mixerDoctor.clipAction(idleClip);
        
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
    if (mixerDoctor) mixerDoctor.update(delta);
    if (mixerScene) mixerScene.update(delta);
    
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
 * 初始化整个自定义场景
 */
const initializeCustomScene = async () => {
  try {
    // 停止之前的动画循环
    stopAnimation();
    
    loading.value = true;
    error.value = '';
    isSceneReady = false;
    
    console.log(`正在初始化自定义场景，场景ID: ${props.sceneId}`);
    
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
    
    console.log('自定义场景初始化完成');
    
  } catch (err) {
    console.error('自定义场景初始化失败:', err);
    
    // 确保停止动画循环
    stopAnimation();
    
    loading.value = false;
    error.value = err.message || '自定义场景初始化失败';
    
    // 清理可能已创建的对象
    if (renderer) {
      renderer.clear();
    }
  }
};

// 生命周期管理
onMounted(() => {
  initializeCustomScene();
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
  if (mixerDoctor) {
    mixerDoctor.stopAllAction();
    mixerDoctor = null;
  }
  if (mixerScene) {
    mixerScene.stopAllAction();
    mixerScene = null;
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