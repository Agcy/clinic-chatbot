/**
 * @fileoverview 角色管理 API
 */

import { defineEventHandler, getMethod, readBody } from 'h3';
import { Character } from '../models/character';
import { connectDB, getConnectionStatus } from '../utils/db';

export default defineEventHandler(async (event) => {
    const method = getMethod(event);

    // 确保数据库已连接
    if (!getConnectionStatus()) {
        await connectDB();
    }

    try {
        switch (method) {
            case 'GET':
                // 获取所有角色
                const characters = await Character.find();
                return {
                    success: true,
                    data: characters
                };

            case 'POST':
                const body = await readBody(event);
                
                if (body.action === 'initialize') {
                    // 初始化默认角色数据
                    const defaultCharacters = [
                        {
                            name: 'patient',
                            url: '/public/model/patient.glb',
                            animations: {
                                talk: 'talk',
                                idle: 'idle'
                            },
                            voice: 'zh-HK-HiuGaaiNeural',
                            gender: 'female',
                            description: '病人角色，使用女性粤语音色'
                        },
                        {
                            name: 'doctor',
                            url: '/public/model/doctor.glb',
                            animations: {
                                talk: 'talk',
                                idle: 'idle'
                            },
                            voice: 'zh-HK-WanLungNeural',
                            gender: 'male',
                            description: '医生角色，使用男性粤语音色'
                        }
                    ];

                    const results = [];
                    for (const charData of defaultCharacters) {
                        try {
                            // 使用 findOneAndUpdate 来更新或创建
                            const character = await Character.findOneAndUpdate(
                                { name: charData.name },
                                charData,
                                { 
                                    upsert: true, 
                                    new: true,
                                    runValidators: true
                                }
                            );
                            results.push(character);
                            console.log(`已添加/更新角色: ${charData.name}`);
                        } catch (error) {
                            console.error(`初始化角色 ${charData.name} 失败:`, error);
                        }
                    }

                    return {
                        success: true,
                        message: '角色数据初始化完成',
                        data: results
                    };
                } else {
                    // 创建新角色
                    const character = new Character(body);
                    await character.save();
                    
                    return {
                        success: true,
                        message: '角色创建成功',
                        data: character
                    };
                }

            case 'PUT':
                // 更新角色
                const updateBody = await readBody(event);
                const { name, ...updateData } = updateBody;
                
                const updatedCharacter = await Character.findOneAndUpdate(
                    { name },
                    updateData,
                    { new: true, runValidators: true }
                );

                if (!updatedCharacter) {
                    return {
                        success: false,
                        error: '角色不存在'
                    };
                }

                return {
                    success: true,
                    message: '角色更新成功',
                    data: updatedCharacter
                };

            case 'DELETE':
                // 删除角色
                const deleteBody = await readBody(event);
                const { name: deleteName } = deleteBody;
                
                const deletedCharacter = await Character.findOneAndDelete({ name: deleteName });

                if (!deletedCharacter) {
                    return {
                        success: false,
                        error: '角色不存在'
                    };
                }

                return {
                    success: true,
                    message: '角色删除成功',
                    data: deletedCharacter
                };

            default:
                return {
                    success: false,
                    error: '不支持的请求方法'
                };
        }
    } catch (error) {
        console.error('角色管理 API 错误:', error);
        return {
            success: false,
            error: error.message
        };
    }
}); 