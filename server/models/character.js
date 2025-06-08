/**
 * @fileoverview 角色信息数据模型
 */

import mongoose from 'mongoose';

const characterSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  url: {
    type: String,
    required: true,
    description: '3D模型文件路径'
  },
  animations: {
    talk: {
      type: String,
      default: 'talk',
      description: '说话动画名称'
    },
    idle: {
      type: String,
      default: 'idle', 
      description: '待机动画名称'
    }
  },
  voice: {
    type: String,
    required: true,
    description: 'Edge-TTS语音音色'
  },
  gender: {
    type: String,
    enum: ['male', 'female'],
    required: true
  },
  description: {
    type: String,
    description: '角色描述'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export const Character = mongoose.model('Character', characterSchema); 