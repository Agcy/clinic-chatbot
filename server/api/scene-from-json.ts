/**
 * 从JSON文件加载场景数据
 */
import { getModelUrl } from '../utils/cos-url';
import { H3Error } from 'h3';

export default defineEventHandler(async (event) => {
  try {
    // 获取查询参数
    const query = getQuery(event);
    const sceneId = query.sceneId as string;
    
    console.log('正在从JSON文件加载场景数据, sceneId:', sceneId);
    
    if (!sceneId) {
      throw createError({
        statusCode: 400,
        message: '缺少必要参数: sceneId'
      });
    }
    
    // 从JSON文件中读取数据
    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(process.cwd(), 'public', 'prompts', 'scene_json.json');
    
    if (!fs.existsSync(filePath)) {
      throw createError({
        statusCode: 404,
        message: '场景数据文件不存在'
      });
    }
    
    const sceneJsonContent = fs.readFileSync(filePath, 'utf8');
    const sceneJson = JSON.parse(sceneJsonContent);
    
    // 定义场景数据类型
    interface SceneData {
      scene_id: string;
      scene_url_3d: string;
      charactor_url_3d: string;
      scene_title: string;
      model_charactor: string;
      trainee_character: string;
      [key: string]: any;
    }
    
    // 查找指定的场景
    const sceneData = sceneJson.find((item: SceneData) => item.scene_id === sceneId);
    
    if (!sceneData) {
      throw createError({
        statusCode: 404,
        message: `未找到指定的场景: ${sceneId}`
      });
    }
    
    // 将本地路径转换为COS URL
    const sceneUrl = sceneData.scene_url_3d ? getModelUrl(sceneData.scene_url_3d.replace('/model/', '')) : '';
    const characterUrl = sceneData.charactor_url_3d ? getModelUrl(sceneData.charactor_url_3d.replace('/model/', '')) : getModelUrl('doctor.glb');
    
    console.log('从JSON文件中找到场景数据:', {
      sceneId: sceneData.scene_id,
      sceneUrl,
      characterUrl
    });
    
    // 返回场景数据
    return {
      sceneUrl,
      characterUrl,
      sceneId: sceneData.scene_id,
      sceneTitle: sceneData.scene_title,
      modelCharactor: sceneData.model_charactor,
      traineeCharacter: sceneData.trainee_character
    };
  } catch (error: unknown) {
    console.error('加载场景数据失败:', error);
    throw createError({
      statusCode: 500,
      message: `加载场景数据失败: ${error instanceof Error ? error.message : '未知错误'}`
    });
  }
}); 