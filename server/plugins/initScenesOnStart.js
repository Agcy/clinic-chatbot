/**
 * @fileoverview 启动时自动初始化场景数据和3D配置的插件
 */

import { defineNitroPlugin } from 'nitropack/runtime';
import { Scene } from '~/server/models/scene.js';
import { ScenePosition } from '~/server/models/scenePosition.js';
import { Character } from '~/server/models/character.js';
import { connectDB } from '~/server/utils/db.js';
import { getImageUrl } from '~/server/utils/cos-url.js';
import fs from 'fs';
import path from 'path';

/**
 * 转换场景的图片路径为COS URL
 * @param {Object} sceneData - 场景数据对象
 * @returns {Object} 转换后的场景数据对象
 */
const transformSceneImageUrl = (sceneData) => {
  if (sceneData.card_img && typeof sceneData.card_img === 'string') {
    // 如果是本地路径（以/img/开头），转换为COS URL
    if (sceneData.card_img.startsWith('/img/')) {
      const imageName = sceneData.card_img.replace('/img/', '');
      sceneData.card_img = getImageUrl(imageName);
    } else if (!sceneData.card_img.startsWith('http')) {
      // 如果不是HTTP URL，也尝试转换
      const imageName = sceneData.card_img.replace(/^\/+/, ''); // 移除开头的斜杠
      sceneData.card_img = getImageUrl(imageName);
    }
  }
  return sceneData;
};

export default defineNitroPlugin(async (nitroApp) => {
  try {
    console.log('启动时初始化数据...');
    await connectDB();

    // 1. 初始化 ScenePosition (3D场景配置)
    const scene3DConfigPath = path.join(process.cwd(), 'public', 'prompts', 'scene_3d_config.json');
    if (fs.existsSync(scene3DConfigPath)) {
      const scene3DConfigsData = JSON.parse(fs.readFileSync(scene3DConfigPath, 'utf8'));
      let scenePositionCount = 0;
      for (const config of scene3DConfigsData) {
        try {
          await ScenePosition.findOneAndUpdate(
            { configId: config.configId },
            config,
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );
          scenePositionCount++;
          console.log(`已添加/更新 ScenePosition: ${config.configId}`);
        } catch (error) {
          console.error(`处理 ScenePosition ${config.configId} 失败:`, error.message);
        }
      }
      console.log(`ScenePosition 初始化完成，共处理 ${scenePositionCount} 个3D配置。`);
    } else {
      console.warn('scene_3d_config.json 未找到，跳过 ScenePosition 初始化。');
    }

    // 2. 初始化 Scene (场景卡片)
    const scenesJsonPath = path.join(process.cwd(), 'public', 'prompts', 'scene_json.json');
    if (fs.existsSync(scenesJsonPath)) {
      const scenesData = JSON.parse(fs.readFileSync(scenesJsonPath, 'utf8'));
      let sceneCardCount = 0;
      for (const sceneCard of scenesData) {
        try {
          // 确保 scene_id 存在
          if (!sceneCard.scene_id) {
            console.warn('发现缺少 scene_id 的场景卡片，跳过处理:', sceneCard.scene_title);
            continue;
          }
          // 确保 config_id 存在，必须明确指定
          if (!sceneCard.config_id) {
            console.error(`场景卡片 ${sceneCard.scene_id} 缺少必需的 config_id 字段，跳过处理`);
            continue;
          }
          const configIdToUse = sceneCard.config_id;
          
          // 转换图片URL为COS URL
          const transformedSceneCard = transformSceneImageUrl({ ...sceneCard });

          await Scene.findOneAndUpdate(
            { scene_id: sceneCard.scene_id },
            { ...transformedSceneCard, config_id: configIdToUse, updated_at: new Date() },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );
          sceneCardCount++;
          console.log(`已添加/更新 Scene (卡片): ${sceneCard.scene_id} -> 链接到 ${configIdToUse}`);
        } catch (error) {
          console.error(`处理 Scene (卡片) ${sceneCard.scene_id} 失败:`, error.message);
        }
      }
      console.log(`Scene (卡片) 初始化完成，共处理 ${sceneCardCount} 个场景卡片。`);
    } else {
      console.warn('scene_json.json 未找到，跳过 Scene (卡片) 初始化。');
    }

    // 3. 初始化 Character (角色数据)
    const characterJsonPath = path.join(process.cwd(), 'public', 'prompts', 'character.json');
    if (fs.existsSync(characterJsonPath)) {
      const charactersData = JSON.parse(fs.readFileSync(characterJsonPath, 'utf8'));
      let characterCount = 0;
      for (const charData of charactersData) {
        try {
          await Character.findOneAndUpdate(
            { name: charData.name },
            charData,
            { 
              upsert: true, 
              new: true,
              runValidators: true
            }
          );
          characterCount++;
          console.log(`已添加/更新 Character: ${charData.name} (${charData.voice})`);
        } catch (error) {
          console.error(`初始化角色 ${charData.name} 失败:`, error.message);
        }
      }
      console.log(`Character 初始化完成，共处理 ${characterCount} 个角色。`);
    } else {
      console.warn('character.json 未找到，跳过 Character 初始化。');
    }

    console.log('数据初始化流程完成。');

  } catch (error) {
    console.error('启动时初始化数据失败:', error);
    // 不抛出错误，避免影响应用启动
  }
}); 