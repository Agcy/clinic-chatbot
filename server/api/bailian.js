/**
 * @fileoverview 百炼API接口
 */

import { defineEventHandler, readBody } from 'h3';
import OpenAI from "openai";
import { Conversation } from '../models/conversation';
import { connectDB, getConnectionStatus } from '../utils/db';

const openai = new OpenAI({
    apiKey: process.env.ALIYUN_BAILIAN_API_KEY, // 确保设置了环境变量
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1'
});

export default defineEventHandler(async (event) => {
    const body = await readBody(event);

    // console.log('Received request with body:', body);

    // 验证请求体中的消息是否有效（除非是清除历史的特殊请求）
    if (!body || (typeof body.message !== 'string' || body.message.trim() === '')) {
        // 如果是清除历史的请求，允许通过
        if (body && body.action === 'clearHistory') {
            console.log('清除聊天历史请求');
            return { success: true, message: '聊天历史已清除' };
        }
        console.error('Invalid message provided');
        return { error: 'Invalid message provided' };
    }

    const { message, userId, scenarioId, shouldSave = false, messages = [], rating = null, systemPrompt } = body;

    try {
        // 如果是保存对话记录的请求
        if (shouldSave && messages.length > 0) {
            // 确保数据库已连接
            if (!getConnectionStatus()) {
                await connectDB();
            }

            const conversation = new Conversation({
                userId,
                scenarioId,
                messages: messages.map(msg => ({
                    role: msg.role,
                    content: msg.content,
                    timestamp: msg.timestamp || new Date()
                }))
            });

            if (rating !== null) {
                conversation.rating = rating;
            }

            await conversation.save();
            console.log('对话记录已保存');
            return { success: true, message: '对话记录已保存' };
        }

        // 如果是普通的对话请求
        const chatMessages = [];
        
        // 1. 添加系统提示作为第一条消息
        chatMessages.push({ 
            role: "system", 
            content: systemPrompt || "你是一个病人，你最近出现了头晕、头痛的症状，并且曾经历过一次交通意外。医生刚刚通过 MRI 发现你的脑部有一个血管瘤。你对自己的健康状况感到担忧，并且想要弄清楚医生的诊断结果。你可能会问医生更多关于病情、最坏情况和治疗方案的问题（如：'这个瘤会不会爆裂？'、'最坏的可能是什么？'）。请用粤语与医生交谈，并尽可能表现出真实病人的反应，例如焦虑、疑惑或希望得到更多信息。不要脱离角色，现在请开始你的第一句话。"
        });
        
        // 2. 添加历史对话记录(包含用户和AI的所有历史消息)
        if (messages && messages.length > 0) {
            // 过滤掉可能存在的system消息，因为我们已经在上面添加了
            const nonSystemMessages = messages.filter(msg => msg.role !== 'system');
            chatMessages.push(...nonSystemMessages);
        }
        
        // 3. 添加当前用户的新消息
        chatMessages.push({ role: "user", content: message });

        console.log('发送给模型的完整对话历史:', chatMessages);

        const completion = await openai.chat.completions.create({
            model: "qwen-plus", // 使用 qwen-plus 模型
            messages: chatMessages,
        });

        const responseText = completion.choices[0].message.content;
        
        // 将AI的回复添加到对话历史中
        const aiMessage = {
            role: "assistant",
            content: responseText
        };

        chatMessages.push(aiMessage);
        
        // 返回AI回复以及更新后的完整对话历史
        return { 
            response: responseText,
            aiMessage: aiMessage   // 返回AI消息对象，方便前端将其添加到对话历史中
        };
    } catch (error) {
        console.error('Error:', error);
        return { error: error.message };
    }
});