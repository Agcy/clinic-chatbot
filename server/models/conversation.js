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
  messages: [{
    role: {
      type: String,
      enum: ['trainer', 'trainee'],
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
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export const Conversation = mongoose.model('Conversation', conversationSchema); 