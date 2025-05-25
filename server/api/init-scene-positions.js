/**
 * @fileoverview 初始化3D场景位置配置数据
 */

import { ScenePosition } from '../models/scenePosition.js';
import { connectDB } from '../config/db.js';

export default defineEventHandler(async (event) => {
  const method = getMethod(event);
  
  if (method !== 'POST') {
    throw createError({
      statusCode: 405,
      statusMessage: 'Method Not Allowed'
    });
  }
  
  try {
    // 连接数据库
    await connectDB();
    
    // 基于你的char_scene_test.html调试结果的配置
    const defaultConfigs = [
      {
        configId: 'doctor-operating-room',
        name: '医生-手术室场景',
        description: '医生在手术室的3D场景配置',
        sceneModel: {
          url: '/model/operation_room.glb',
          position: { x: 0, y: -0.5, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 }
        },
        characterModel: {
          url: '/model/doctor.glb',
          position: { x: 0, y: -0.5, z: 0 },
          rotation: { x: 0, y: 0, z: 0 }, // 可以根据需要调整旋转
          scale: { x: 1, y: 1, z: 1 }
        },
        camera: {
          position: { x: 0, y: 0.7, z: 2 },
          lookAt: { x: 0, y: 0.7, z: 2 },
          fov: 75,
          near: 0.1,
          far: 1000
        },
        lighting: {
          hemisphereLight: {
            skyColor: '#ffffff',
            groundColor: '#8d8d8d',
            intensity: 6.0,
            position: { x: 0, y: 10, z: 0 }
          },
          directionalLight: {
            color: '#ffffff',
            intensity: 3.0,
            position: { x: 5, y: 5, z: 2 },
            castShadow: true
          },
          ambientLight: {
            color: '#ffffff',
            intensity: 5.0
          }
        },
        background: {
          type: 'color',
          value: '#87CEEB'
        },
        renderer: {
          toneMappingExposure: 0.4,
          toneMapping: 'ACESFilmicToneMapping'
        }
      },
      {
        configId: 'patient-operating-room',
        name: '病人-手术室场景',
        description: '病人在手术室的3D场景配置',
        sceneModel: {
          url: '/model/operation_room.glb',
          position: { x: 0, y: -0.5, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 }
        },
        characterModel: {
          url: '/model/doctor.glb', // 暂时使用doctor模型
          position: { x: 0, y: -0.5, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 }
        },
        camera: {
          position: { x: 0, y: 0.7, z: 2 },
          lookAt: { x: 0, y: 0.7, z: 2 },
          fov: 75,
          near: 0.1,
          far: 1000
        },
        lighting: {
          hemisphereLight: {
            skyColor: '#ffffff',
            groundColor: '#8d8d8d',
            intensity: 6.0,
            position: { x: 0, y: 10, z: 0 }
          },
          directionalLight: {
            color: '#ffffff',
            intensity: 3.0,
            position: { x: 5, y: 5, z: 2 },
            castShadow: true
          },
          ambientLight: {
            color: '#ffffff',
            intensity: 5.0
          }
        },
        background: {
          type: 'color',
          value: '#87CEEB'
        },
        renderer: {
          toneMappingExposure: 0.4,
          toneMapping: 'ACESFilmicToneMapping'
        }
      }
    ];
    
    // 清除现有配置（可选）
    const body = await readBody(event);
    if (body.clearExisting) {
      await ScenePosition.deleteMany({});
      console.log('已清除现有场景位置配置');
    }
    
    // 插入新配置
    const results = [];
    for (const config of defaultConfigs) {
      try {
        // 检查是否已存在
        const existing = await ScenePosition.findOne({ configId: config.configId });
        if (existing) {
          // 更新现有配置
          const updated = await ScenePosition.findOneAndUpdate(
            { configId: config.configId },
            config,
            { new: true, runValidators: true }
          );
          results.push({ action: 'updated', config: updated });
        } else {
          // 创建新配置
          const newConfig = new ScenePosition(config);
          await newConfig.save();
          results.push({ action: 'created', config: newConfig });
        }
      } catch (error) {
        console.error(`处理配置 ${config.configId} 时出错:`, error);
        results.push({ action: 'error', configId: config.configId, error: error.message });
      }
    }
    
    return {
      success: true,
      message: '场景位置配置初始化完成',
      results
    };
    
  } catch (error) {
    console.error('初始化场景位置配置失败:', error);
    throw createError({
      statusCode: 500,
      statusMessage: '初始化失败: ' + error.message
    });
  }
}); 