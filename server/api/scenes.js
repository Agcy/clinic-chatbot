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