# 3D场景配置系统

## 概述

这个系统允许你将3D场景的位置配置（包括模型位置、摄像头位置、光照设置等）存储在MongoDB数据库中，并通过API接口进行管理。

## 功能特性

- 🎯 **精确位置控制**: 存储和管理3D模型的位置、旋转、缩放
- 📷 **摄像头配置**: 自定义摄像头位置和参数
- 💡 **光照设置**: 配置环境光、平行光、半球光
- 🎨 **渲染参数**: 调整色调映射、曝光度等渲染设置
- 🔄 **动态切换**: 支持运行时切换不同的场景配置
- 🔗 **分享链接**: 生成包含配置参数的分享链接

## 数据库模型

### ScenePosition 模型结构

```javascript
{
  configId: String,           // 配置唯一标识符
  name: String,              // 配置名称
  description: String,       // 配置描述
  
  sceneModel: {              // 场景模型配置
    url: String,             // 模型文件URL
    position: {x, y, z},     // 位置
    rotation: {x, y, z},     // 旋转
    scale: {x, y, z}         // 缩放
  },
  
  characterModel: {          // 角色模型配置
    url: String,             // 模型文件URL
    position: {x, y, z},     // 位置
    rotation: {x, y, z},     // 旋转
    scale: {x, y, z}         // 缩放
  },
  
  camera: {                  // 摄像头配置
    position: {x, y, z},     // 摄像头位置
    lookAt: {x, y, z},       // 摄像头朝向
    fov: Number,             // 视野角度
    near: Number,            // 近裁剪面
    far: Number              // 远裁剪面
  },
  
  lighting: {                // 光照配置
    hemisphereLight: {...},  // 半球光设置
    directionalLight: {...}, // 平行光设置
    ambientLight: {...}      // 环境光设置
  },
  
  background: {              // 背景配置
    type: String,            // 'color' 或 'texture'
    value: String            // 颜色值或纹理URL
  },
  
  renderer: {                // 渲染器配置
    toneMappingExposure: Number,
    toneMapping: String
  }
}
```

## API接口

### 1. 获取所有配置
```http
GET /api/scene-positions
```

### 2. 获取特定配置
```http
GET /api/scene-positions?configId=doctor-operating-room
```

### 3. 创建新配置
```http
POST /api/scene-positions
Content-Type: application/json

{
  "configId": "my-config",
  "name": "我的配置",
  // ... 其他配置参数
}
```

### 4. 更新配置
```http
PUT /api/scene-positions
Content-Type: application/json

{
  "configId": "my-config",
  // ... 更新的配置参数
}
```

### 5. 删除配置
```http
DELETE /api/scene-positions?configId=my-config
```

### 6. 初始化默认配置
```http
POST /api/init-scene-positions
Content-Type: application/json

{
  "clearExisting": false
}
```

## 使用方法

### 1. 初始化配置数据

首次使用时，需要初始化默认配置：

```javascript
// 调用初始化API
const response = await fetch('/api/init-scene-positions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ clearExisting: false })
});
```

### 2. 在Vue组件中使用

```vue
<template>
  <ThreeDSceneLoaderWithConfig
    :config-id="selectedConfigId"
    :enable-controls="true"
  />
</template>

<script setup>
import ThreeDSceneLoaderWithConfig from '~/components/ThreeDSceneLoaderWithConfig.vue';

const selectedConfigId = ref('doctor-operating-room');
</script>
```

### 3. 动态切换配置

```javascript
// 获取可用配置列表
const configs = await $fetch('/api/scene-positions');

// 切换到不同配置
selectedConfigId.value = 'patient-operating-room';
```

### 4. 生成分享链接

```javascript
const shareUrl = `${window.location.origin}/3d-scene?configId=${configId}&controls=true`;
```

## 预设配置

系统包含以下预设配置：

### doctor-operating-room
- **场景**: 手术室环境
- **角色**: 医生模型 (doctor.glb)
- **用途**: 医疗对话场景

### patient-operating-room
- **场景**: 手术室环境
- **角色**: 病人模型 (patient.glb)
- **用途**: 病人视角场景

## 调试和测试

### 1. 使用测试页面

访问 `/test/test-scene-config.html` 来测试API功能：

1. 初始化配置数据
2. 获取配置列表
3. 测试特定配置
4. 打开3D场景页面

### 2. 浏览器控制台测试

```javascript
// 在浏览器控制台中运行
runScenePositionTests();
```

### 3. 动画测试

在3D场景页面中，可以测试角色动画：

```javascript
// 开始说话动画
window.playTalkAnimation(true);

// 停止说话动画
window.playTalkAnimation(false);
```

## 配置调试流程

1. **使用char_scene_test.html调试**: 在独立的HTML文件中调试模型位置
2. **记录最佳参数**: 记录调试好的位置、旋转、缩放参数
3. **更新数据库配置**: 通过API更新数据库中的配置
4. **在项目中应用**: 使用新的配置系统渲染场景

## 故障排除

### 常见问题

1. **配置未找到**: 确保configId正确，并且配置已初始化
2. **模型加载失败**: 检查模型文件路径是否正确
3. **动画不工作**: 确保模型包含idle和talk动画
4. **数据库连接失败**: 检查MongoDB连接字符串

### 调试技巧

1. 打开浏览器开发者工具查看控制台日志
2. 使用网络面板检查API请求
3. 在3D场景页面启用相机控制器进行调试
4. 使用测试页面验证API功能

## 扩展功能

### 添加新的配置类型

1. 修改 `ScenePosition` 模型
2. 更新API接口
3. 修改前端组件
4. 添加相应的测试

### 自定义渲染参数

可以通过配置调整：
- 色调映射类型
- 曝光度
- 阴影设置
- 抗锯齿参数

### 动画配置

支持配置：
- 默认动画
- 动画过渡时间
- 动画循环设置 