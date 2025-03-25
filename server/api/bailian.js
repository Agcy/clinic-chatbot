/**
 * @fileoverview 自定义模型API接口
 */

import { defineEventHandler, readBody } from 'h3';
import { Conversation } from '../models/conversation';
import { connectDB, getConnectionStatus } from '../utils/db';

// 用于存储对话历史的Map
const conversationHistory = new Map();

export default defineEventHandler(async (event) => {
    const body = await readBody(event);
    
    console.log('Received request body:', JSON.stringify(body, null, 2));

    // 验证请求体是否有效
    if (!body) {
        console.error('No body provided');
        return { error: 'No body provided' };
    }

    let messages;
    const conversationId = body.conversationId || 'default';
    
    // 处理新旧两种格式
    if (body.messages && Array.isArray(body.messages)) {
        // 新格式：直接使用 messages 数组
        messages = body.messages;
    } else if (body.message) {
        // 获取或初始化对话历史
        let history = conversationHistory.get(conversationId) || [];
        
        // 如果是新对话，添加系统提示
        if (history.length === 0) {
            history.push({
                role: "system",
                content: body.systemPrompt || "你是一名經驗豐富的腦外科主刀醫生（程至美），正在進行一場高風險的腦部手術。你的助手（江医生）正在協助你完成手術。你的目標是確保手術順利進行，並適時指導助手提供器械或進行必要的協助。你應該保持專業、冷靜，並清晰地描述手術步驟。在助手詢問問題時，你可以耐心解釋，但要確保手術的精確性。請用粵語進行對話，並嚴格按照角色演繹。"
            });
        }

        // 添加用户新消息
        history.push({
            role: "user",
            content: body.message
        });

        // 更新对话历史
        conversationHistory.set(conversationId, history);
        messages = history;
    } else {
        console.error('Invalid request format');
        return { error: 'Invalid request format' };
    }

    // 验证消息格式
    if (messages.length === 0) {
        console.error('Messages array is empty');
        return { error: 'Messages array cannot be empty' };
    }

    for (let i = 0; i < messages.length; i++) {
        const msg = messages[i];
        if (!msg.role || !msg.content) {
            console.error(`Invalid message format at index ${i}:`, msg);
            return { error: `Invalid message format at index ${i}` };
        }
    }

    const { userId, scenarioId, shouldSave = false, rating = null } = body;

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
            
            // 保存后清除内存中的对话历史
            conversationHistory.delete(conversationId);
            
            return { success: true, message: '对话记录已保存' };
        }

        // 如果是普通的对话请求
        console.log('Sending messages to API:', JSON.stringify(messages, null, 2));
        
        // 构建请求体
        const requestBody = {
            model: "string", // 这里可以根据需要修改模型名称
            messages: messages,
            do_sample: true,
            temperature: 0.92,
            top_p: 0,
            n: 1,
            max_tokens: 512,
            stream: false
        };

        // 发送请求到自定义模型API
        const response = await fetch('http://117.50.34.201:8000/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }

        const completion = await response.json();
        const responseText = completion.choices[0].message.content;

        // 将AI的回复添加到对话历史中
        if (body.message) { // 只在旧格式下更新历史
            const history = conversationHistory.get(conversationId);
            if (history) {
                history.push({
                    role: "assistant",
                    content: responseText
                });
                conversationHistory.set(conversationId, history);
            }
        }

        return { 
            response: responseText,
            conversationId: conversationId // 返回会话ID，前端需要保存
        };
    } catch (error) {
        console.error('Error:', error);
        return { error: error.message };
    }
});