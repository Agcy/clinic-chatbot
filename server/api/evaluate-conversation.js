/**
 * @fileoverview 评估对话API
 */

import { defineEventHandler, readBody } from 'h3';
import OpenAI from "openai";
import { Conversation } from '../models/conversation';
import { connectDB, getConnectionStatus } from '../utils/db';

const openai = new OpenAI({
    apiKey: process.env.ALIYUN_BAILIAN_API_KEY,
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1'
});

/**
 * 将对话内容格式化为评估指令
 * @param {Array} messages - 对话消息数组
 * @returns {string} 格式化后的评估指令
 */
function formatConversationForEvaluation(messages) {
    let formattedConversation = "以下是医患对话训练的记录，请你从医学专业角度评估训练者(trainee)的表现:\n\n";
    
    messages.forEach(msg => {
        const role = msg.role === 'trainer' ? '模拟病人' : '医生(训练者)';
        formattedConversation += `${role}: ${msg.content}\n\n`;
    });
    
    formattedConversation += "\n请对医生(trainee)的表现进行评分(0-10分)并给出改进建议。请以JSON格式返回，包含rating(0-10的数字)和evaluation_msg(改进建议文本)两个字段。";
    
    return formattedConversation;
}

export default defineEventHandler(async (event) => {
    try {
        const body = await readBody(event);
        const { userId, scenarioId, messages } = body;
        
        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return { error: '无效的对话内容' };
        }
        
        // 确保数据库已连接
        if (!getConnectionStatus()) {
            await connectDB();
        }
        
        // 格式化对话内容用于评估
        const evaluationPrompt = formatConversationForEvaluation(messages);
        
        // 调用大模型API进行评估
        const completion = await openai.chat.completions.create({
            model: "qwen-plus",
            messages: [
                { role: "system", content: "你是一个专业的医学教育评估专家，负责评估医患沟通训练的效果。" },
                { role: "user", content: evaluationPrompt }
            ],
            temperature: 0.7,
        });
        
        const responseText = completion.choices[0].message.content;
        
        // 解析JSON响应
        let evaluationResult;
        try {
            // 尝试提取JSON部分
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            const jsonString = jsonMatch ? jsonMatch[0] : responseText;
            evaluationResult = JSON.parse(jsonString);
        } catch (error) {
            console.error('解析评估结果失败:', error);
            // 如果解析失败，尝试使用正则表达式提取评分和评估信息
            const ratingMatch = responseText.match(/rating["']?\s*:\s*(\d+)/i);
            const evaluationMatch = responseText.match(/evaluation_msg["']?\s*:\s*["']([^"']+)["']/i);
            
            evaluationResult = {
                rating: ratingMatch ? parseInt(ratingMatch[1]) : 5,
                evaluation_msg: evaluationMatch ? evaluationMatch[1] : responseText
            };
        }
        
        // 确保评分在有效范围内
        const rating = Math.min(Math.max(evaluationResult.rating || 0, 0), 10);
        const evaluation_msg = evaluationResult.evaluation_msg || '无评估信息';
        
        // 保存对话记录和评估结果
        const conversation = new Conversation({
            userId,
            scenarioId,
            messages: messages.map(msg => ({
                role: msg.role,
                content: msg.content,
                timestamp: msg.timestamp || new Date()
            })),
            rating,
            evaluation_msg
        });
        
        await conversation.save();
        
        return {
            success: true,
            rating,
            evaluation_msg
        };
    } catch (error) {
        console.error('评估对话时出错:', error);
        return { error: error.message };
    }
}); 