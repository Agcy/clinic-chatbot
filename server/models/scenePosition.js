/**
 * @fileoverview 3D场景位置配置数据模型
 */

import mongoose from 'mongoose';

// 位置和旋转的子模式
const positionSchema = new mongoose.Schema({
  x: { type: Number, default: 0 },
  y: { type: Number, default: 0 },
  z: { type: Number, default: 0 }
}, { _id: false });

const rotationSchema = new mongoose.Schema({
  x: { type: Number, default: 0 },
  y: { type: Number, default: 0 },
  z: { type: Number, default: 0 }
}, { _id: false });

const scaleSchema = new mongoose.Schema({
  x: { type: Number, default: 1 },
  y: { type: Number, default: 1 },
  z: { type: Number, default: 1 }
}, { _id: false });

// 摄像头配置
const cameraConfigSchema = new mongoose.Schema({
  position: positionSchema,
  lookAt: positionSchema,
  fov: { type: Number, default: 75 },
  near: { type: Number, default: 0.1 },
  far: { type: Number, default: 1000 }
}, { _id: false });

// 光照配置
const lightingConfigSchema = new mongoose.Schema({
  hemisphereLight: {
    skyColor: { type: String, default: '#ffffff' },
    groundColor: { type: String, default: '#8d8d8d' },
    intensity: { type: Number, default: 6.0 },
    position: positionSchema
  },
  directionalLight: {
    color: { type: String, default: '#ffffff' },
    intensity: { type: Number, default: 3.0 },
    position: positionSchema,
    castShadow: { type: Boolean, default: true }
  },
  ambientLight: {
    color: { type: String, default: '#ffffff' },
    intensity: { type: Number, default: 5.0 }
  }
}, { _id: false });

// 主要的场景位置配置模式
const scenePositionSchema = new mongoose.Schema({
  // 配置标识符
  configId: {
    type: String,
    required: true,
    unique: true
  },
  
  // 配置名称和描述
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  
  // 场景模型配置
  sceneModel: {
    url: { type: String, required: true },
    position: positionSchema,
    rotation: rotationSchema,
    scale: scaleSchema
  },
  
  // 角色模型配置
  characterModel: {
    url: { type: String, required: true },
    position: positionSchema,
    rotation: rotationSchema,
    scale: scaleSchema
  },
  
  // 摄像头配置
  camera: cameraConfigSchema,
  
  // 光照配置
  lighting: lightingConfigSchema,
  
  // 场景背景配置
  background: {
    type: { type: String, enum: ['color', 'texture'], default: 'color' },
    value: { type: String, default: '#87CEEB' } // 默认天蓝色
  },
  
  // 渲染器配置
  renderer: {
    toneMappingExposure: { type: Number, default: 0.4 },
    toneMapping: { type: String, default: 'ACESFilmicToneMapping' }
  },
  
  // 创建和更新时间
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// 更新时间中间件
scenePositionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

export const ScenePosition = mongoose.model('ScenePosition', scenePositionSchema); 