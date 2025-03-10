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

        // 获取现有场景ID列表
        const existingScenes = await Scene.find({}, { scene_id: 1 });
        const existingSceneIds = existingScenes.map(scene => scene.scene_id);
        console.log(`数据库中存在 ${existingSceneIds.length} 个场景`);

        // 统计添加和更新的数量
        let addedCount = 0;
        let updatedCount = 0;

        // 遍历JSON文件中的场景数据
        for (const scene of scenes) {
            if (existingSceneIds.includes(scene.scene_id)) {
                // 如果场景ID已存在，则更新
                await Scene.findOneAndUpdate({ scene_id: scene.scene_id }, scene);
                updatedCount++;
            } else {
                // 如果场景ID不存在，则添加
                await Scene.create(scene);
                addedCount++;
            }
        }

        return {
            success: true,
            message: '场景数据初始化成功',
            added: addedCount,
            updated: updatedCount,
            total: existingScenes.length + addedCount
        };
    } catch (error) {
        console.error('初始化场景数据失败:', error);
        return { error: error.message };
    }
}); 