<template>
  <div ref="characterContainer" class="character-container"></div>
</template>

<script setup>
import {onMounted, onUnmounted, ref} from "vue";
import {GLTFLoader} from "three/examples/jsm/loaders/GLTFLoader";
import {FBXLoader} from "three/examples/jsm/loaders/FBXLoader";
import {DRACOLoader} from "three/examples/jsm/loaders/DRACOLoader";
import * as THREE from "three";
import TWEEN from '@tweenjs/tween.js';

const characterContainer = ref(null);
let scene, camera, renderer, mixer, clock;
let character, mouth, head, hand;
let sceneObj;

// 初始化场景
const initScene = (container) => {
  scene = new THREE.Scene();
  const {clientWidth: width, clientHeight: height} = container;

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

  // 相机配置 - 降低相机高度
  camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
  camera.position.set(0, 2, 5); // 将z值从3增加到5，拉远相机距离
  camera.lookAt(new THREE.Vector3(0, 2, 0)); // 调整lookAt位置，使其对准人物脸部

  // 光源配置
  const ambientLight = new THREE.AmbientLight(0xffffff, 2);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
  directionalLight.position.set(0, 3, 5);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 1024;
  directionalLight.shadow.mapSize.height = 1024;
  scene.add(ambientLight, directionalLight);

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
 * @param {string} url - 场景URL
 */
const loadScene = async (url) => {
  // 如果URL为空，跳过场景加载
  if (!url || url.trim() === '') {
    console.log('场景URL为空，跳过场景加载');
    return;
  }
  
  try {
    console.log(`加载场景: ${url}`);
    
    if (isFbxFormat(url)) {
      // 使用FBX加载器
      const loader = new FBXLoader();
      sceneObj = await loader.loadAsync(url);
    } else {
      // 使用GLTF加载器
      const loader = new GLTFLoader();
      const dracoLoader = new DRACOLoader();
      dracoLoader.setDecoderPath('/draco/');
      loader.setDRACOLoader(dracoLoader);
      
      const gltf = await loader.loadAsync(url);
      sceneObj = gltf.scene;
    }
    
    // 根据模型调整位置和缩放
    sceneObj.scale.set(0.03, 0.03, 0.03);
    
    // 遍历场景中的所有对象，设置阴影
    sceneObj.traverse((node) => {
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });
    
    scene.add(sceneObj);
    console.log('场景加载成功');
  } catch (error) {
    console.error('场景加载失败:', error);
  }
};

/**
 * 加载3D角色
 * @param {string} url - 角色URL
 */
const loadCharacter = async (url) => {
  try {
    console.log(`加载角色: ${url}`);
    
    let characterObj, animations;
    
    if (isFbxFormat(url)) {
      // 使用FBX加载器
      const loader = new FBXLoader();
      characterObj = await loader.loadAsync(url);
      animations = characterObj.animations;
    } else {
      // 使用GLTF加载器
      const loader = new GLTFLoader();
      const dracoLoader = new DRACOLoader();
      dracoLoader.setDecoderPath('/draco/');
      loader.setDRACOLoader(dracoLoader);
      
      const gltf = await loader.loadAsync(url);
      characterObj = gltf.scene;
      animations = gltf.animations;
    }
    
    character = characterObj;
    
    // 根据模型URL调整缩放比例
    if (url.includes('patient.glb')) {
      // 为病人模型调整缩放比例
      character.scale.set(0.25, 0.25, 0.25);
      // 可能需要调整位置
      character.position.set(0, 0, 0);
    } else {
      // 其他模型使用默认缩放
      character.scale.set(0.2, 0.2, 0.2);
    }
    
    scene.add(character);

    // 获取模型部件
    mouth = character.getObjectByName("Mouth");
    head = character.getObjectByName("Head");
    hand = character.getObjectByName("Hand");

    // 初始化动画系统
    if (animations?.length) {
      mixer = new THREE.AnimationMixer(character);
      const action = mixer.clipAction(animations[0]);
      action.play();
    }

    // 启动随机动作
    startIdleMovements();
    
    console.log('角色加载成功');
  } catch (error) {
    console.error('角色加载失败:', error);
  }
};

// 自然空闲动作
const startIdleMovements = () => {
  if (!head) {
    console.error('头部模型未加载');
    return;
  }
  
  // 头部微动
  new TWEEN.Tween(head.rotation)
    .to({
      x: Math.sin(Date.now() * 0.002) * 0.1,
      y: Math.cos(Date.now() * 0.003) * 0.1
    }, 3000)
    .repeat(Infinity)
    .start();

  // 周期性眨眼
  setInterval(() => {
    if (mouth) {
      new TWEEN.Tween(mouth.morphTargetInfluences)
        .to([1], 200)
        .repeat(1)
        .yoyo(true)
        .start();
    }
  }, 5000);
};

// 语音驱动
const speak = (text) => {
  if ('speechSynthesis' in window) {
    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(text);

    utterance.onstart = () => {
      if (mouth) {
        mouth.morphTargetInfluences[0] = 0.8;
      }
    };

    utterance.onend = () => {
      if (mouth) {
        new TWEEN.Tween(mouth.morphTargetInfluences)
          .to([0], 500)
          .start();
      }
    };

    synth.speak(utterance);
  }
};

// 响应式布局
const handleResize = () => {
  if (!characterContainer.value) return;
  
  const container = characterContainer.value;
  const width = container.clientWidth;
  const height = container.clientHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
};

// 动画循环
const animate = () => {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  if (mixer) mixer.update(delta);
  TWEEN.update();

  renderer.render(scene, camera);
};

// 生命周期管理
onMounted(async () => {
  initScene(characterContainer.value);
  
  try {
    // 从API获取场景和角色URL
    const response = await fetch('/api/scene-card');
    if (!response.ok) {
      throw new Error('获取场景数据失败');
    }
    
    const { sceneUrl, characterUrl } = await response.json();
    console.log('获取到的URL:', { sceneUrl, characterUrl });
    
    // 检查场景URL是否为空
    if (!sceneUrl || sceneUrl.trim() === '') {
      console.log('场景URL为空，将只加载角色和地面');
      
      // 添加一个简单的地面
      const groundGeometry = new THREE.PlaneGeometry(20, 20);
      const groundMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xcccccc,
        roughness: 0.8
      });
      const ground = new THREE.Mesh(groundGeometry, groundMaterial);
      ground.rotation.x = -Math.PI / 2; // 使平面水平
      ground.position.y = 0;
      ground.receiveShadow = true;
      scene.add(ground);
    } else {
      // 加载场景
      await loadScene(sceneUrl);
    }
    
    // 加载角色
    if (characterUrl && characterUrl.trim() !== '') {
      await loadCharacter(characterUrl);
      
      // 如果没有场景，调整相机位置以对准角色
      if (!sceneUrl || sceneUrl.trim() === '') {
        // 获取角色的包围盒
        const box = new THREE.Box3().setFromObject(character);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        
        console.log('角色位置:', center);
        console.log('角色尺寸:', size);
        
        // 设置相机位置，调整高度以对准脸部
        // 假设模型的头部/脸部位于模型高度的70%-80%处
        const faceHeight = center.y + size.y * 0.3; // 调整这个系数可以更精确地定位脸部
        camera.position.set(0, faceHeight, 30); // 将z值从3增加到5，拉远相机距离
        camera.lookAt(new THREE.Vector3(center.x, faceHeight, center.z));
        console.log('已调整相机位置:', camera.position);
      }
    }
    
    // 开始动画循环
    animate();
  } catch (error) {
    console.error('初始化3D场景失败:', error);
  }
  
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  if (renderer) {
    renderer.dispose();
    renderer.forceContextLoss();
  }
});

defineExpose({speak});
</script>

<style scoped>
.character-container {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

.character-container canvas {
  display: block;
  width: 100% !important;
  height: 100% !important;
}
</style>