/**
 * @fileoverview 文本转语音 API - 使用Edge TTS
 */

import { defineEventHandler, readBody } from 'h3';
import { exec } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { promisify } from 'util';
import { Character } from '../models/character';
import { connectDB, getConnectionStatus } from '../utils/db';

const execAsync = promisify(exec);

export default defineEventHandler(async (event) => {
    const body = await readBody(event);

    // 验证请求体中的消息是否有效
    if (!body || typeof body.text !== 'string' || body.text.trim() === '') {
        console.error('无效的文本内容');
        return { error: '无效的文本内容' };
    }

    const { text, characterName = 'patient' } = body;

    try {
        // 确保数据库已连接
        if (!getConnectionStatus()) {
            await connectDB();
        }

        // 获取角色信息
        let character = await Character.findOne({ name: characterName });
        
        // 如果数据库中没有角色信息，抛出错误
        if (!character) {
            console.error(`角色 ${characterName} 不存在于数据库中`);
            return { 
                error: `角色 ${characterName} 配置不存在，请检查数据库或character.json配置`,
                success: false
            };
        }

        // console.log(`使用音色: ${character.voice} 为角色 ${characterName} 生成语音`);

        // 创建临时文件路径
        const tempDir = path.join(process.cwd(), 'temp');
        await fs.mkdir(tempDir, { recursive: true });

        const timestamp = Date.now();
        const outputFile = path.join(tempDir, `tts_${timestamp}.mp3`);

        // 构建edge-tts命令
        const command = `edge-tts --voice "${character.voice}" --text "${text.replace(/"/g, '\\"')}" --write-media "${outputFile}" --rate=+10% --volume=+5% --pitch=-5Hz`;
        
        // console.log('执行TTS命令:', command);

        // 执行edge-tts命令
        await execAsync(command, {
            timeout: 30000 // 30秒超时
        });

        // 读取生成的音频文件
        const audioBuffer = await fs.readFile(outputFile);
        const audioContent = audioBuffer.toString('base64');

        // 清理临时文件
        try {
            await fs.unlink(outputFile);
        } catch (cleanupError) {
            console.error('清理临时文件失败:', cleanupError);
        }

        // console.log(`TTS生成成功，音频长度: ${audioBuffer.length} 字节`);

        return { 
            audioContent,
            characterName,
            voice: character.voice,
            success: true
        };

    } catch (error) {
        console.error('Edge TTS API 错误:', error);
        return { 
            error: `语音生成失败: ${error.message}`,
            success: false
        };
    }
});