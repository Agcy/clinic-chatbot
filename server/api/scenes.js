/**
 * @fileoverview 场景列表API
 */

import { defineEventHandler, readBody } from 'h3';
import { Scene } from '../models/scene';
import { connectDB, getConnectionStatus } from '../utils/db';

export default defineEventHandler(async (event) => {
    try {
        // 确保数据库已连接
        if (!getConnectionStatus()) {
            await connectDB();
        }

        if (event.method === 'GET') {
            // 获取所有场景列表
            const scenes = await Scene.find({}, {
                scene_id: 1,
                card_img: 1,
                scene_title: 1,
                scene_type: 1
            });

            return {
                success: true,
                scenes
            };
        } else if (event.method === 'POST') {
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