/**
 * @fileoverview 对话评估 API
 */

import { defineEventHandler, readBody } from 'h3';
import OpenAI from "openai";
import { connectDB, getConnectionStatus } from '../utils/db';
import { cleanMarkdownJson } from '../utils/openai-helpers';
import { Conversation } from '../models/conversation';

const openai = new OpenAI({
  apiKey: process.env.ALIYUN_BAILIAN_API_KEY,
  baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1'
});

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const { userId, scenarioId, messages } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return {
        success: false,
        error: '缺少有效的对话消息'
      };
    }

    // 确保数据库已连接
    if (!getConnectionStatus()) {
      await connectDB();
    }

    // 将对话转换为评估所需的格式
    const conversationText = messages.map(msg => 
      `${msg.role === 'user' ? '医生' : '病人'}: ${msg.content}`
    ).join('\n\n');

    // 使用 OpenAI 评估对话
    const completion = await openai.chat.completions.create({
      model: "qwen-plus",
      messages: [
        {
          role: 'system',
          content: `你是一个专业的医患沟通评估专家。请评估以下医生与病人的对话质量。
评估应该考虑以下几点：
1. 医生的专业性
2. 沟通的清晰度
3. 共情能力
4. 信息传达的准确性
5. 解决问题的能力

请提供 1-10 分的评分（10分为最高），并提供简短的评价和改进建议。

请使用以下 JSON 格式返回结果：
{
  "rating": 分数,
  "evaluation_msg": "评价和建议"
}
`
        },
        {
          role: 'user',
          content: conversationText
        }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    // 解析响应
    const aiResponseContent = completion.choices[0].message.content;
    let evaluationData;

    try {
      // 使用辅助函数清理并解析 JSON 响应
      const cleanedContent = cleanMarkdownJson(aiResponseContent);
      evaluationData = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('解析评估响应失败:', parseError);
      console.log("原始响应内容:", aiResponseContent);
      
      return {
        success: false,
        error: '无法解析评估结果'
      };
    }

    // 保存评估结果到数据库
    try {
      const conversation = new Conversation({
        userId,
        scenarioId,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp || new Date()
        })),
        rating: evaluationData.rating,
        evaluation_msg: evaluationData.evaluation_msg,  // 保存评估消息
        createdAt: new Date()
      });
      
      await conversation.save();
      console.log('对话评估已保存到数据库，评估消息:', evaluationData.evaluation_msg);
    } catch (dbError) {
      console.error('保存评估结果失败:', dbError);
      console.error('详细错误信息:', dbError.message);
      // 继续返回评估结果，即使保存失败
    }

    return {
      success: true,
      rating: evaluationData.rating,
      evaluation_msg: evaluationData.evaluation_msg
    };
  } catch (error) {
    console.error('评估对话失败:', error);
    
    return {
      success: false,
      error: error.message || '服务器内部错误'
    };
  }
}); 