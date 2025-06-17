# ReturnHomeButton 组件使用说明

## 概述
`ReturnHomeButton` 是一个可复用的返回主页按钮组件，提供了一致的样式和行为，可以在不同的页面中使用。

## 功能特点
- 🎨 统一的视觉设计和交互效果
- 📱 响应式设计，适配不同屏幕尺寸
- 🎯 支持多种位置设置
- 🔧 可自定义按钮文本和提示信息
- ⚡ 自动路由跳转功能

## 使用方法

### 基本用法
```vue
<template>
  <div>
    <!-- 默认位置（右上角） -->
    <ReturnHomeButton />
  </div>
</template>

<script setup>
import ReturnHomeButton from '~/components/ReturnHomeButton.vue';
</script>
```

### 自定义位置
```vue
<template>
  <div>
    <!-- 左上角 -->
    <ReturnHomeButton position="top-left" />
    
    <!-- 右下角 -->
    <ReturnHomeButton position="bottom-right" />
    
    <!-- 左下角 -->
    <ReturnHomeButton position="bottom-left" />
  </div>
</template>
```

### 自定义文本
```vue
<template>
  <div>
    <ReturnHomeButton 
      text="回到首页" 
      title="点击返回到场景选择页面"
    />
  </div>
</template>
```

## Props 属性

| 属性名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `text` | String | `'返回主页'` | 按钮显示的文本 |
| `title` | String | `'返回主页'` | 鼠标悬停时显示的提示信息 |
| `position` | String | `'top-right'` | 按钮位置，可选值见下表 |

### position 可选值

| 值 | 说明 |
|----|------|
| `'top-right'` | 右上角（默认） |
| `'top-left'` | 左上角 |
| `'bottom-right'` | 右下角 |
| `'bottom-left'` | 左下角 |

## 样式特点

### 视觉效果
- 半透明白色背景，带有毛玻璃效果
- 蓝色边框和文字
- 悬停时有颜色变化和阴影效果
- 点击时有轻微的位移反馈

### 响应式设计
- **桌面端**: 显示图标和文字
- **平板端**: 适当缩小尺寸
- **手机端**: 只显示图标，变为圆形按钮

## 使用场景

### 已集成的页面
- ✅ `/training` - 训练页面
- ✅ `/custom-scene-operation` - 自定义手术场景
- ✅ `/custom-scene-phone` - 自定义电话场景  
- ✅ `/3d-scene` - 3D场景展示页面
- ✅ `/3d-scene-test` - 3D场景测试页面

### 推荐使用场景
- 训练页面
- 测试页面
- 独立的功能页面
- 需要快速返回主页的任何页面

## 技术实现

### 核心功能
```javascript
// 处理返回操作
const handleReturn = () => {
  console.log('🏠 用户点击返回主页按钮');
  router.push('/');
};
```

### 位置控制
通过 `data-position` 属性和 CSS 选择器实现不同位置的布局：

```css
.return-button-container[data-position="top-left"] {
  top: 20px;
  left: 20px;
  right: auto;
}
```

## 注意事项

1. **z-index 层级**: 组件使用 `z-index: 30`，确保在大多数元素之上
2. **位置冲突**: 注意避免与其他固定定位元素的位置冲突
3. **移动端适配**: 在小屏幕上会自动隐藏文字，只显示图标
4. **路由依赖**: 组件依赖 Vue Router，确保在正确的路由环境中使用

## 测试页面

访问 `/return-button-test` 可以查看不同位置的按钮效果。

## 更新日志

- **v1.0.0**: 初始版本，支持基本的返回功能
- **v1.1.0**: 添加位置自定义功能
- **v1.2.0**: 优化响应式设计，添加移动端适配 