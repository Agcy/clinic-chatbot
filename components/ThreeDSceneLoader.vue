<template>
  <div ref="sceneContainer" class="scene-container"></div>
</template>

<script setup>
import { onMounted, onUnmounted, ref, defineProps } from "vue";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
import * as THREE from "three";
import TWEEN from '@tweenjs/tween.js';

/**
 * 组件的属性
 * @typedef {Object} Props
 * @property {string} sceneUrl - 3D场景的URL
 * @property {string} characterUrl - 3D角色的URL
 */
const props = defineProps({
  sceneUrl: {
    type: String,
    required: true
  },
  characterUrl: {
    type: String,
    required: true
  }
});

const sceneContainer = ref(null);
let scene, camera, renderer, mixer, clock;
let sceneObj, character;

/**
 * 初始化Three.js场景
 * @param {HTMLElement} container - 容器元素
 */
const initScene = (container) => {
  // 创建场景
  scene = new THREE.Scene();
  const { clientWidth: width, clientHeight: height } = container;

  // 渲染器配置
  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true
  });
  renderer.setSize(width, height);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  // 相机配置
  camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
  camera.position.set(0, 5, 10);
  camera.lookAt(new THREE.Vector3(0, 0, 0));

  // 光源配置
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(5, 10, 5);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 1024;
  directionalLight.shadow.mapSize.height = 1024;
  scene.add(directionalLight);

  // 初始化时钟
  clock = new THREE.Clock();
};

/**
 * 根据文件扩展名判断是否是FBX格式
 * @param {string} url - 文件URL
 * @returns {boolean} - 是否是FBX格式
 */
const isFbxFormat = (url) => {
  return url.toLowerCase().endsWith('.fbx');
};

/**
 * 加载3D场景
 */
const loadScene = async () => {
  try {
    
    if (isFbxFormat(props.sceneUrl)) {
      // 使用FBX加载器
      const loader = new FBXLoader();
      sceneObj = await loader.loadAsync(props.sceneUrl);
    } else {
      // 使用GLTF加载器
      const loader = new GLTFLoader();
      const dracoLoader = new DRACOLoader();
      dracoLoader.setDecoderPath('/draco/');
      loader.setDRACOLoader(dracoLoader);
      
      const gltf = await loader.loadAsync(props.sceneUrl);
      sceneObj = gltf.scene;
    }
    
    sceneObj.name = 'scene_card';
    
    // 根据模型调整位置和缩放
    sceneObj.scale.set(0.03, 0.03, 0.03); // FBX模型通常需要缩小
    
    // 遍历场景中的所有对象，设置接收阴影
    sceneObj.traverse((node) => {
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });
    
    scene.add(sceneObj);
  } catch (error) {
    console.error('场景加载失败:', error);
  }
};

/**
 * 加载3D角色
 */
const loadCharacter = async () => {
  try {
    
    let characterObj, animations;
    
    if (isFbxFormat(props.characterUrl)) {
      // 使用FBX加载器
      const loader = new FBXLoader();
      characterObj = await loader.loadAsync(props.characterUrl);
      animations = characterObj.animations;
    } else {
      // 使用GLTF加载器
      const loader = new GLTFLoader();
      const dracoLoader = new DRACOLoader();
      dracoLoader.setDecoderPath('/draco/');
      loader.setDRACOLoader(dracoLoader);
      
      const gltf = await loader.loadAsync(props.characterUrl);
      characterObj = gltf.scene;
      animations = gltf.animations;
    }
    
    character = characterObj;
    
    // 根据需要调整位置和缩放
    character.position.set(0, 0, 0);
    character.scale.set(1, 1, 1);
    
    // 遍历角色中的所有对象，设置投射阴影
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
      // 播放第一个动画
      const action = mixer.clipAction(animations[0]);
      action.play();
    }
    
  } catch (error) {
    console.error('角色加载失败:', error);
  }
};

/**
 * 处理窗口大小变化
 */
const handleResize = () => {
  if (!sceneContainer.value) return;
  
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

  renderer.render(scene, camera);
};

// 生命周期管理
onMounted(async () => {
  initScene(sceneContainer.value);
  await loadScene();
  await loadCharacter();
  animate();
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  if (renderer) {
    renderer.dispose();
    renderer.forceContextLoss();
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
</style> 