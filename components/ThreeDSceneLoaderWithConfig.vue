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

/**
 * 从API获取场景配置
 */
const fetchSceneConfig = async () => {
  try {
    // 首先尝试从新的ScenePosition配置获取
    try {
      const response = await $fetch(`/api/scene-positions?configId=${props.configId}`);
      sceneConfig = response;
      console.log('从ScenePosition获取到场景配置:', sceneConfig);
      return;
    } catch (scenePositionError) {
      console.log('ScenePosition配置未找到，尝试从Scene数据获取:', scenePositionError.message);
    }
    
    // 如果ScenePosition配置不存在，尝试从现有Scene数据获取
    const scenesResponse = await $fetch('/api/scenes');
    if (scenesResponse.success && scenesResponse.scenes && scenesResponse.scenes.length > 0) {
      // 查找匹配的场景
      let matchedScene = null;
      
             // 根据configId查找对应的场景
       if (props.configId.includes('doctor')) {
         matchedScene = scenesResponse.scenes.find(scene => 
           (scene.scene_title || '').toLowerCase().includes('医生') || 
           (scene.model_charactor || '').toLowerCase().includes('医生') ||
           (scene.scene_title || '').toLowerCase().includes('doctor')
         );
       } else if (props.configId.includes('patient')) {
         matchedScene = scenesResponse.scenes.find(scene => 
           (scene.scene_title || '').toLowerCase().includes('病人') || 
           (scene.model_charactor || '').toLowerCase().includes('病人') ||
           (scene.scene_title || '').toLowerCase().includes('patient')
         );
       }
      
      // 如果没找到匹配的，使用第一个场景
      if (!matchedScene && scenesResponse.scenes.length > 0) {
        matchedScene = scenesResponse.scenes[0];
      }
      
      if (matchedScene) {
        // 构建兼容的配置对象
        sceneConfig = {
          configId: props.configId,
          name: matchedScene.scene_title || '默认场景',
          description: matchedScene.scene_description_model || '',
          sceneModel: {
            url: matchedScene.scene_url_3d || '/model/operation_room.glb',
            position: { x: 0, y: -0.5, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 }
          },
          characterModel: {
            url: matchedScene.charactor_url_3d || '/model/doctor.glb',
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
        
        console.log('从Scene数据构建的配置:', sceneConfig);
        return;
      }
    }
    
    // 如果都没有找到，抛出错误
    throw new Error('未找到场景配置数据');
    
  } catch (err) {
    console.error('获取场景配置失败:', err);
    error.value = '获取场景配置失败: ' + err.message;
    throw err;
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
    console.log(`加载场景: ${sceneModelConfig.url}`);
    
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
    console.log('场景加载成功');
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
    console.log(`加载角色: ${characterModelConfig.url}`);
    
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
    
    console.log('角色加载成功');
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

/**
 * 动画循环
 */
const animate = () => {
  requestAnimationFrame(animate);

  // 更新动画
  const delta = clock.getDelta();
  if (mixer) mixer.update(delta);
  
  // 更新补间动画
  TWEEN.update();

  // 更新控制器
  if (controls) controls.update();

  if (renderer && scene && camera) {
    renderer.render(scene, camera);
  }
};

/**
 * 初始化整个场景
 */
const initializeScene = async () => {
  try {
    loading.value = true;
    error.value = '';
    
    // 获取场景配置
    await fetchSceneConfig();
    
    // 初始化Three.js场景
    initScene(sceneContainer.value);
    
    // 加载模型
    await Promise.all([
      loadScene(),
      loadCharacter()
    ]);
    
    // 开始动画循环
    animate();
    
    loading.value = false;
  } catch (err) {
    console.error('场景初始化失败:', err);
    loading.value = false;
    error.value = err.message || '场景初始化失败';
  }
};

// 监听configId变化
watch(() => props.configId, () => {
  if (sceneContainer.value) {
    initializeScene();
  }
});

// 生命周期管理
onMounted(() => {
  initializeScene();
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  if (renderer) {
    renderer.dispose();
    renderer.forceContextLoss();
  }
  if (controls) {
    controls.dispose();
  }
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