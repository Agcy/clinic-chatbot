<template>
  <div class="scene-page">
    <ThreeDSceneLoader
      :scene-url="sceneUrl"
      :character-url="characterUrl"
    />
    
    <div class="controls">
      <h2>场景控制器</h2>
      <div class="control-group">
        <label>选择场景：</label>
        <select v-model="sceneUrl">
          <option value="/model/operating-room.fbx">手术室场景</option>
        </select>
      </div>
      
      <div class="control-group">
        <label>选择角色：</label>
        <select v-model="characterUrl">
          <option value="/model/doctor.glb">医生</option>
          <option value="/model/patient.glb">病人</option>
          <option value="/model/sasuke_fre_fire.glb">角色1</option>
          <option value="/model/Technoblade.glb">角色2</option>
        </select>
      </div>
      
      <div class="control-group">
        <button @click="generateShareLink" class="share-btn">生成分享链接</button>
        <div v-if="shareLink" class="share-link">
          <input type="text" readonly :value="shareLink" @click="copyToClipboard" />
          <span v-if="copied" class="copied-notification">已复制！</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import ThreeDSceneLoader from '~/components/ThreeDSceneLoader.vue';
import { useRoute, useRouter } from 'vue-router';

// 获取路由对象
const route = useRoute();
const router = useRouter();

/**
 * 场景和角色模型的URL
 * @description 默认使用医生模型作为角色，手术室作为场景
 */
const sceneUrl = ref('/model/operating-room.fbx');
const characterUrl = ref('/model/doctor.glb');

// 分享链接
const shareLink = ref('');
const copied = ref(false);

/**
 * 从URL参数中获取场景和角色URL
 */
onMounted(() => {
  // 检查URL参数
  const urlScene = route.query.scene;
  const urlCharacter = route.query.character;
  
  // 如果URL参数存在，使用URL参数
  if (urlScene) {
    sceneUrl.value = decodeURIComponent(urlScene);
  }
  
  if (urlCharacter) {
    characterUrl.value = decodeURIComponent(urlCharacter);
  }
});

/**
 * 生成分享链接
 */
const generateShareLink = () => {
  // 构建URL
  const baseUrl = window.location.origin + window.location.pathname;
  const queryParams = new URLSearchParams();
  queryParams.set('scene', encodeURIComponent(sceneUrl.value));
  queryParams.set('character', encodeURIComponent(characterUrl.value));
  
  // 设置分享链接
  shareLink.value = `${baseUrl}?${queryParams.toString()}`;
  
  // 更新浏览器URL，不刷新页面
  router.replace({ query: { 
    scene: encodeURIComponent(sceneUrl.value),
    character: encodeURIComponent(characterUrl.value)
  }});
};

/**
 * 复制链接到剪贴板
 */
const copyToClipboard = () => {
  navigator.clipboard.writeText(shareLink.value).then(() => {
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  });
};
</script>

<style scoped>
.scene-page {
  width: 100%;
  height: 100vh;
  overflow: hidden;
  position: relative;
}

.controls {
  position: absolute;
  top: 20px;
  right: 20px;
  background-color: rgba(255, 255, 255, 0.8);
  padding: 15px;
  border-radius: 10px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.2);
  z-index: 10;
}

.controls h2 {
  margin-top: 0;
  margin-bottom: 15px;
  font-size: 18px;
}

.control-group {
  margin-bottom: 15px;
}

.control-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}

.control-group select {
  width: 100%;
  padding: 8px;
  border-radius: 5px;
  border: 1px solid #ccc;
}

.share-btn {
  background-color: #4CAF50;
  color: white;
  padding: 8px 12px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  width: 100%;
  font-weight: bold;
}

.share-btn:hover {
  background-color: #45a049;
}

.share-link {
  margin-top: 10px;
  position: relative;
}

.share-link input {
  width: 100%;
  padding: 8px;
  border-radius: 5px;
  border: 1px solid #ccc;
  cursor: pointer;
}

.copied-notification {
  position: absolute;
  right: 5px;
  top: 8px;
  background-color: #333;
  color: white;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 12px;
}
</style> 