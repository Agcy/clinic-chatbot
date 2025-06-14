/**
 * @fileoverview 对话记录数据模型
 */

import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },
  scenarioId: {
    type: String,
    required: true,
  },
  conversationId: {
    type: String,
    default: null, // 扣子API返回的conversation_id
    index: true
  },
  messages: [{
    role: {
      type: String,
      enum: ['user', 'assistant', 'system'],
      required: true
    },
    content: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  rating: {
    type: Number,
    min: 0,
    max: 10,
    default: null
  },
  evaluation_msg: {
    type: String,
    default: null
  },
  reasoning: {
    type: String,
    default: null
  },
  sbar_scores: {
    type: mongoose.Schema.Types.Mixed, // 存储SBAR评分的复杂对象
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// 为用户ID和对话ID创建复合索引
conversationSchema.index({ userId: 1, conversationId: 1 });

export const Conversation = mongoose.model('Conversation', conversationSchema); 