/**
 * @fileoverview 场景列表API
 */

import { Scene } from '../models/scene.js';
import { connectDB } from '../config/db.js';

export default defineEventHandler(async (event) => {
    const method = getMethod(event);
    
    try {
        // 连接数据库
        await connectDB();

        if (method === 'GET') {
            // 获取所有场景列表
            const scenes = await Scene.find({});

            return {
                success: true,
                scenes
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

            return {
                success: true,
                scene
            };
        }

        return { error: '不支持的请求方法' };
    } catch (error) {
        console.error('获取场景数据失败:', error);
        return { error: error.message };
    }
}); 