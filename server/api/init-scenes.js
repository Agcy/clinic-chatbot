/**
 * @fileoverview 场景初始化API，用于将场景数据导入数据库
 */

import { defineEventHandler } from 'h3';
import { Scene } from '../models/scene';
import { connectDB, getConnectionStatus } from '../utils/db';
import scenes from '../../public/prompts/scene_json.json';

export default defineEventHandler(async (event) => {
    try {
        // 确保数据库已连接
        if (!getConnectionStatus()) {
            await connectDB();
        }

        // 清空现有场景数据
        await Scene.deleteMany({});

        // 导入新的场景数据
        const insertedScenes = await Scene.insertMany(scenes);

        return {
            success: true,
            message: '场景数据初始化成功',
            count: insertedScenes.length
        };
    } catch (error) {
        console.error('初始化场景数据失败:', error);
        return { error: error.message };
    }
}); 