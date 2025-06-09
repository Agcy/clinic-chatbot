/**
 * @fileoverview 扣子(Coze)工作流API接口 - 使用conversation_id管理对话记忆
 */

import { defineEventHandler, readBody } from 'h3';
import { Conversation } from '../models/conversation';
import { connectDB, getConnectionStatus } from '../utils/db';

// 扣子API配置
const COZE_API_URL = 'https://api.coze.cn/v1/workflows/chat';
const COZE_API_TOKEN = process.env.COZE_API_TOKEN || 'pat_088HrAHRNL6GWNyG4e0O4K17lDYI2K1D13x1GKolnAANEZDKMlbMm7NV7CLHNyR7';
const WORKFLOW_ID = process.env.COZE_WORKFLOW_CONVERSATION_ID || '7512364746017407011';

// 内存中存储用户对话ID的映射
const userConversationMap = new Map();

/**
 * 清理最终内容，去掉控制信息和格式化问题
 * @param {string} content - 原始内容
 * @returns {string} 清理后的内容
 */
function cleanFinalContent(content) {
    if (!content) return '';
    
    // 去掉 JSON 控制信息
    let cleanContent = content.replace(/\{"msg_type":"generate_answer_finish".*?\}/g, '');
    
    // 去掉其他可能的控制信息
    cleanContent = cleanContent.replace(/\{".*?":\s*".*?".*?\}/g, '');
    
    // 去掉多余的空格和换行
    cleanContent = cleanContent.replace(/\s+/g, ' ').trim();
    
    // 去掉开头和结尾的特殊字符
    cleanContent = cleanContent.replace(/^[,\s]+|[,\s]+$/g, '');
    
    return cleanContent;
}

/**
 * 解析流式响应（Server-Sent Events格式）
 * @param {string} streamText - 流式响应文本
 * @returns {object} 解析后的数据对象
 */
function parseStreamResponse(streamText) {
    const lines = streamText.split('\n');
    let conversationId = null;
    let finalContent = '';
    let isCompleted = false;
    
    // console.log('开始解析流式响应，总行数:', lines.length);
    
    for (const line of lines) {
        const trimmedLine = line.trim();
        
        // 跳过空行和注释行
        if (!trimmedLine || trimmedLine.startsWith(':')) {
            continue;
        }
        
        if (trimmedLine.startsWith('data: ')) {
            const dataContent = trimmedLine.substring(6).trim();
            
            // 跳过 [DONE] 标记
            if (dataContent === '[DONE]') {
                isCompleted = true;
                continue;
            }
            
            try {
                const data = JSON.parse(dataContent);
                // console.log('解析到的数据块:', data);
                
                // 提取conversation_id
                if (data.conversation_id) {
                    conversationId = data.conversation_id;
                }
                
                // 只提取 type 为 'answer' 的内容，避免重复和控制信息
                if (data.type === 'answer' && data.content) {
                    // 清理内容：去掉控制信息和多余空格
                    let cleanContent = data.content;
                    
                    // 去掉 JSON 控制信息
                    const jsonControlRegex = /\{"msg_type":"generate_answer_finish".*?\}/g;
                    cleanContent = cleanContent.replace(jsonControlRegex, '');
                    
                    // 去掉多余的空格和换行
                    cleanContent = cleanContent.trim();
                    
                    // 如果内容不为空且不重复，才添加
                    if (cleanContent && !finalContent.includes(cleanContent)) {
                        finalContent = cleanContent;
                    }
                } else if (!data.type && data.content) {
                    // 兼容其他格式
                    finalContent += data.content;
                } else if (data.delta && data.delta.content) {
                    finalContent += data.delta.content;
                } else if (data.text) {
                    finalContent += data.text;
                } else if (data.message && data.message.content) {
                    finalContent += data.message.content;
                } else if (data.choices && data.choices[0] && data.choices[0].delta && data.choices[0].delta.content) {
                    finalContent += data.choices[0].delta.content;
                }
                
                // 检查是否完成
                if (data.finish_reason || data.done || data.status === 'completed') {
                    isCompleted = true;
                }
                
            } catch (parseError) {
                console.log('解析单行数据失败:', dataContent, parseError.message);
                // 如果JSON解析失败，可能是纯文本内容
                if (dataContent && !dataContent.startsWith('{')) {
                    finalContent += dataContent;
                }
            }
        }
    }
    
    // 最终内容清理
    finalContent = cleanFinalContent(finalContent);
    
    // 只在有错误时输出日志
    if (!finalContent && !conversationId) {
        console.log('流式解析完成但没有获取到内容和conversation_id');
    }
    
    // 构建响应数据，模拟标准格式
    return {
        conversation_id: conversationId,
        data: {
            outputs: [finalContent],
            output: finalContent,
            content: finalContent,
            status: isCompleted ? 'completed' : 'processing'
        }
    };
}

export default defineEventHandler(async (event) => {
    const body = await readBody(event);

    // 验证请求体中的消息是否有效（除非是清除历史的特殊请求）
    if (!body || (typeof body.message !== 'string' || body.message.trim() === '')) {
        // 如果是清除历史的请求，允许通过
        if (body && body.action === 'clearHistory') {
            console.log('清除聊天历史请求');
            const { userId } = body;
            if (userId && userConversationMap.has(userId)) {
                userConversationMap.delete(userId);
                console.log(`已清除用户 ${userId} 的conversation_id`);
            }
            return { success: true, message: '聊天历史已清除' };
        }
        console.error('无效的消息内容');
        return { error: '无效的消息内容' };
    }

    const { message, userId = 'default_user', scenarioId, shouldSave = false, rating = null, systemPrompt } = body;

    try {
        // 获取或创建用户的conversation_id
        let conversationId = userConversationMap.get(userId);
        
        // 构建扣子API请求体
        const cozeRequestBody = {
            parameters: {
                AI_prompt: systemPrompt || "你是一个病人，你最近出现了头晕、头痛的症状，并且曾经历过一次交通意外。医生刚刚通过 MRI 发现你的脑部有一个血管瘤。你对自己的健康状况感到担忧，并且想要弄清楚医生的诊断结果。你可能会问医生更多关于病情、最坏情况和治疗方案的问题（如：'这个瘤会不会爆裂？'、'最坏的可能是什么？'）。请用粤语与医生交谈，并尽可能表现出真实病人的反应，例如焦虑、疑惑或希望得到更多信息。不要脱离角色。"
            },
            workflow_id: WORKFLOW_ID,
            additional_messages: [
                {
                    content: message,
                    content_type: "text",
                    role: "user"
                }
            ],
            stream: false // 明确指定非流式输出
        };

        // 如果有conversation_id，添加到请求中
        if (conversationId) {
            cozeRequestBody.conversation_id = conversationId;
        }

        // console.log('发送给扣子API的请求体:', JSON.stringify(cozeRequestBody, null, 2));

        // 调用扣子API
        const response = await fetch(COZE_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${COZE_API_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(cozeRequestBody)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('扣子API错误:', response.status, errorText);
            throw new Error(`扣子API请求失败: ${response.status} - ${errorText}`);
        }

        // 处理响应（自动检测JSON或流式）
        const rawResponseText = await response.text();
        // console.log('扣子API原始响应:', rawResponseText.substring(0, 200) + '...');

        let responseData;
        try {
            // 尝试直接解析JSON
            responseData = JSON.parse(rawResponseText);
            // console.log('成功解析为JSON响应');
        } catch (parseError) {
            // 如果是流式响应（Server-Sent Events格式），解析流式数据
            // console.log('检测到流式响应，开始解析...');
            responseData = parseStreamResponse(rawResponseText);
        }
        
        // console.log('解析后的扣子API响应:', responseData);

        // 提取conversation_id并存储
        if (responseData.conversation_id || responseData.data?.conversation_id) {
            const newConversationId = responseData.conversation_id || responseData.data.conversation_id;
            userConversationMap.set(userId, newConversationId);
            // console.log(`已更新用户 ${userId} 的conversation_id: ${newConversationId}`);
        }

        // 处理扣子API的响应
        let responseText = '';
        let conversationComplete = false;
        
        // 解析扣子工作流的输出格式
        if (responseData.data) {
            if (responseData.data.outputs && Array.isArray(responseData.data.outputs)) {
                // 处理outputs数组
                responseText = responseData.data.outputs
                    .filter(output => output && typeof output === 'string')
                    .join('\n');
            } else if (responseData.data.output) {
                responseText = responseData.data.output;
            } else if (responseData.data.content) {
                responseText = responseData.data.content;
            }
            
            // 检查对话是否完成
            conversationComplete = responseData.data.status === 'completed' || 
                                 responseData.data.finish_reason === 'stop';
        } else if (responseData.outputs) {
            responseText = Array.isArray(responseData.outputs) ? 
                         responseData.outputs.join('\n') : responseData.outputs;
        } else if (responseData.message) {
            responseText = responseData.message;
        } else {
            responseText = JSON.stringify(responseData);
        }

        // 创建AI回复消息对象
        const aiMessage = {
            role: "assistant",
            content: responseText,
            timestamp: new Date()
        };

        // 如果对话完成且需要保存，保存到数据库
        if (shouldSave && conversationComplete) {
            try {
                // 确保数据库已连接
                if (!getConnectionStatus()) {
                    await connectDB();
                }

                // 构建对话记录
                const conversationRecord = new Conversation({
                    userId,
                    scenarioId,
                    conversationId: userConversationMap.get(userId),
                    messages: [
                        {
                            role: 'user',
                            content: message,
                            timestamp: new Date()
                        },
                        aiMessage
                    ]
                });

                if (rating !== null) {
                    conversationRecord.rating = rating;
                }

                await conversationRecord.save();
                console.log('对话记录已保存到数据库');
            } catch (dbError) {
                console.error('保存对话记录失败:', dbError);
                // 不中断主流程，只记录错误
            }
        }

        // 返回AI回复以及相关信息
        return { 
            response: responseText,
            aiMessage: aiMessage,
            conversationId: userConversationMap.get(userId),
            conversationComplete: conversationComplete
        };
        
    } catch (error) {
        console.error('扣子API调用错误:', error);
        return { error: error.message };
    }
}); 