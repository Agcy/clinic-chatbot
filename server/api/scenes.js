/**
 * @fileoverview 场景列表API
 */

import { Scene } from '../models/scene.js';
import { connectDB } from '../config/db.js';
import { getImageUrl } from '../utils/cos-url.js';

/**
 * 转换场景的图片路径为COS URL
 * @param {Object} scene - 场景对象
 * @returns {Object} 转换后的场景对象
 */
const transformSceneImageUrl = (scene) => {
    if (scene.card_img && typeof scene.card_img === 'string') {
        // 如果是本地路径（以/img/开头），转换为COS URL
        if (scene.card_img.startsWith('/img/')) {
            const imageName = scene.card_img.replace('/img/', '');
            scene.card_img = getImageUrl(imageName);
        } else if (!scene.card_img.startsWith('http')) {
            // 如果不是HTTP URL，也尝试转换
            const imageName = scene.card_img.replace(/^\/+/, ''); // 移除开头的斜杠
            scene.card_img = getImageUrl(imageName);
        }
    }
    return scene;
};

export default defineEventHandler(async (event) => {
    const method = getMethod(event);
    
    try {
        // 连接数据库
        await connectDB();

        if (method === 'GET') {
            // 获取所有场景列表
            const scenes = await Scene.find({});
            
            // 转换所有场景的图片URL
            const transformedScenes = scenes.map(scene => {
                const sceneObj = scene.toObject ? scene.toObject() : scene;
                return transformSceneImageUrl(sceneObj);
            });

            return {
                success: true,
                scenes: transformedScenes
            };
        } else if (method === 'POST') {
            // 获取特定场景的详细信息
            const body = await readBody(event);
            const { scene_id } = body;

            if (!scene_id) {
                return { error: '场景ID不能为空' };
            }

            const scene = await Scene.findOne({ scene_id });
            if (!scene) {
                return { error: '未找到指定场景' };
            }

            // 转换场景的图片URL
            const sceneObj = scene.toObject ? scene.toObject() : scene;
            const transformedScene = transformSceneImageUrl(sceneObj);

            return {
                success: true,
                scene: transformedScene
            };
        } else if (method === 'DELETE') {
            // 删除指定场景
            const body = await readBody(event);
            const { scene_id } = body;

            if (!scene_id) {
                return { 
                    success: false,
                    error: '场景ID不能为空' 
                };
            }

            const result = await Scene.findOneAndDelete({ scene_id });
            if (!result) {
                return { 
                    success: false,
                    error: '未找到指定场景' 
                };
            }

            return {
                success: true,
                message: '场景删除成功'
            };
        }

        return { 
            success: false,
            error: '不支持的请求方法' 
        };
    } catch (error) {
        console.error('场景操作失败:', error);
        return { 
            success: false,
            error: error.message 
        };
    }
}); 