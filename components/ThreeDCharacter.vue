<template>
  <div ref="characterContainer" class="character-container"></div>
</template>

<script setup>
import {onMounted, onUnmounted, ref} from "vue";
import {GLTFLoader} from "three/examples/jsm/loaders/GLTFLoader";
import {DRACOLoader} from "three/examples/jsm/loaders/DRACOLoader";
import * as THREE from "three";
import TWEEN from '@tweenjs/tween.js';

const characterContainer = ref(null);
let scene, camera, renderer, mixer, clock;
let character, mouth, head, hand;

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
  container.appendChild(renderer.domElement);

  // 相机配置
  camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
  camera.position.set(0, 16, 11);
  // camera.lookAt(0, 1, 0);
  camera.lookAt(new THREE.Vector3(0, 13.9, 0));

  // 光源配置
  const ambientLight = new THREE.AmbientLight(0xffffff, 2);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
  directionalLight.position.set(0, 3, 5);
  scene.add(ambientLight, directionalLight);
};

// 加载模型
const loadModel = async () => {
  const loader = new GLTFLoader();
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath('/draco/');
  loader.setDRACOLoader(dracoLoader);

  // loader.load('/model/surgeon_female/surgical-doctor-female-ready-for-animation-162.gltf', (gltf) => {
  //   gltf.scene.traverse((node) => {
  //     console.log('模型节点:', node.name); // 打印所有节点名称
  //   });
  // });

  try {
    const gltf = await loader.loadAsync('/model/surgeon_female/surgical-doctor-female-ready-for-animation-162.gltf');
    character = gltf.scene;
    // 绕X轴旋转-90度（修正Z轴朝向）
    // character.rotation.x = -Math.PI/2;
    // character.translateY(-50)
    // 绕Y轴旋转180度（修正面向方向）
    // character.rotation.y = Math.PI;
    character.scale.set(0.1, 0.1, 0.1);
    scene.add(character);

    // 获取模型部件
    mouth = character.getObjectByName("Mouth");
    head = character.getObjectByName("Head");
    hand = character.getObjectByName("Hand");

    // 初始化动画系统
    mixer = new THREE.AnimationMixer(character);
    clock = new THREE.Clock();

    // 自动播放动画
    if (gltf.animations?.length) {
      mixer.clipAction(gltf.animations[0]).play();
    }

    // 启动随机动作
    startIdleMovements();
  } catch (error) {
    console.error('模型加载失败:', error);
  }
};

// 自然空闲动作
const startIdleMovements = () => {
  if (!head) { // 新增校验
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
      mouth.morphTargetInfluences[0] = 0.8;
    };

    utterance.onend = () => {
      new TWEEN.Tween(mouth.morphTargetInfluences)
          .to([0], 500)
          .start();
    };

    synth.speak(utterance);
  }
};

// 响应式布局
const handleResize = () => {
  const container = characterContainer.value;
  const width = container.clientWidth;
  const height = container.clientHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
};

// 动画循环
// const animate = () => {
//   requestAnimationFrame(animate);

//   const delta = clock.getDelta();
//   if (mixer) mixer.update(delta);
//   TWEEN.update();

//   renderer.render(scene, camera);
// };

// 生命周期管理
onMounted(async () => {
  initScene(characterContainer.value);
  await loadModel();
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