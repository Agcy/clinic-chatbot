/**
 * @fileoverview 场景数据模型
 */

import mongoose from 'mongoose';

const sceneSchema = new mongoose.Schema({
  scene_id: {
    type: String,
    required: true,
    unique: true
  },
  card_img: {
    type: String,
    required: true
  },
  scene_title: {
    type: String,
    required: true
  },
  scene_description_model: {
    type: String,
    required: true
  },
  scene_description_charactor: {
    type: String,
    required: true
  },
  model_charactor: {
    type: String,
    required: true
  },
  trainee_character: {
    type: String,
    required: true
  },
  scene_type: {
    type: String,
    required: true
  },
  config_id: {
    type: String,
    required: false
  },
  patient_vitals: {
    type: Array,
    required: false,
    default: []
  }
});

// export const Scene = mongoose.model('Scene', sceneSchema);
export const Scene = mongoose.models.Scene || mongoose.model('Scene', sceneSchema); 