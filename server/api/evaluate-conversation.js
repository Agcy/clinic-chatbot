/**
 * @fileoverview 对话评估 API - 使用扣子(Coze)工作流API
 */

import { defineEventHandler, readBody } from 'h3';
import { connectDB, getConnectionStatus } from '../utils/db';
import { Conversation } from '../models/conversation';
import { getConversationId } from '../utils/conversation-manager';

// 扣子API配置
const COZE_API_URL = 'https://api.coze.cn/v1/workflow/run';
const COZE_API_TOKEN = process.env.COZE_API_TOKEN || 'pat_088HrAHRNL6GWNyG4e0O4K17lDYI2K1D13x1GKolnAANEZDKMlbMm7NV7CLHNyR7';
const EVALUATION_WORKFLOW_ID = process.env.COZE_WORKFLOW_EVALUATION_ID || '7513826885483282472';

// conversation_id管理已移至 conversation-manager.js

/**
 * 清理markdown格式的JSON字符串
 * @param {string} text - 包含markdown格式的文本
 * @returns {string} 清理后的JSON字符串
 */
function cleanMarkdownJson(text) {
    if (!text || typeof text !== 'string') return text;
    
    // 去掉markdown代码块标记
    let cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    
    // 去掉开头和结尾的特殊字符
    cleaned = cleaned.trim();
    
    // 如果文本以 `` 开头和结尾，去掉它们
    if (cleaned.startsWith('``') && cleaned.endsWith('``')) {
        cleaned = cleaned.slice(2, -2).trim();
    }
    
    return cleaned;
}

/**
 * 解析流式响应（Server-Sent Events格式）
 * @param {string} streamText - 流式响应文本
 * @returns {object} 解析后的数据对象
 */
function parseStreamResponse(streamText) {
  const lines = streamText.split('\n');
  let finalContent = '';
  let isCompleted = false;

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

        // 只提取 type 为 'answer' 的内容
        if (data.type === 'answer' && data.content) {
          let cleanContent = data.content.trim();

          // 去掉 JSON 控制信息
          const jsonControlRegex = /\{"msg_type":"generate_answer_finish".*?\}/g;
          cleanContent = cleanContent.replace(jsonControlRegex, '');
          cleanContent = cleanContent.trim();

          // 如果内容不为空且不重复，才添加
          if (cleanContent && !finalContent.includes(cleanContent)) {
            finalContent = cleanContent;
          }
        }

        // 检查是否完成
        if (data.finish_reason || data.done || data.status === 'completed') {
          isCompleted = true;
        }

      } catch (parseError) {
        console.log('解析评估数据失败:', dataContent, parseError.message);
      }
    }
  }

  return {
    data: {
      output: finalContent,
      status: isCompleted ? 'completed' : 'processing'
    }
  };
}

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const { userId, scenarioId, messages, sceneData } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return {
        success: false,
        error: '缺少有效的对话消息'
      };
    }

    if (!sceneData) {
      return {
        success: false,
        error: '缺少场景数据'
      };
    }

    // 确保数据库已连接
    if (!getConnectionStatus()) {
      await connectDB();
    }

    // 将messages格式化为扣子API期望的CHAT_RECORD格式
    const chatRecord = JSON.stringify(messages.map(msg => ({
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp || new Date().toISOString()
    })), null, 4);

    // 构建扣子API请求体
    const cozeRequestBody = {
      parameters: {
        AI_prompt: sceneData.scene_description_model || "你是一个病人，请根据场景描述进行对话。",
        user_prompt: sceneData.scene_description_charactor || "你是一名医生，请与病人进行专业的医疗对话。",
        CHAT_RECORD: chatRecord
      },
      workflow_id: EVALUATION_WORKFLOW_ID
    };

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
      console.error('扣子评估API错误:', response.status, errorText);
      throw new Error(`扣子评估API请求失败: ${response.status} - ${errorText}`);
    }

    // 处理响应（自动检测JSON或流式）
    const rawResponseText = await response.text();

    let responseData;
    try {
      // 尝试直接解析JSON
      responseData = JSON.parse(rawResponseText);
    } catch (parseError) {
      // 如果是流式响应，解析流式数据
      responseData = parseStreamResponse(rawResponseText);
    }

    // 提取评估结果 - 参考coze-conversation.js的处理方式
    let evaluationResult = '';

    // 处理扣子工作流的嵌套JSON结构
    if (responseData.data) {
      try {
        let dataObj;

        // 如果data是字符串，先解析为JSON对象
        if (typeof responseData.data === 'string') {
          dataObj = JSON.parse(responseData.data);
        } else {
          dataObj = responseData.data;
        }

        // 从dataObj中提取output
        if (dataObj.output) {
          evaluationResult = dataObj.output;
        } else if (dataObj.outputs && Array.isArray(dataObj.outputs)) {
          evaluationResult = dataObj.outputs
            .filter(output => output && typeof output === 'string')
            .join('\n');
        } else if (dataObj.content) {
          evaluationResult = dataObj.content;
        }

      } catch (parseError) {
        console.error('❌ 解析responseData.data失败:', parseError);
        evaluationResult = responseData.data;
      }
    } else if (responseData.output) {
      evaluationResult = responseData.output;
    }

    console.log('扣子评估结果:', evaluationResult);
    console.log('evaluationResult类型:', typeof evaluationResult);

    // 解析扣子返回的新JSON格式: {rank:xx, message:xx, reason:xx}
    let rating = 7; // 默认评分
    let evaluation_msg = '评估完成';
    let reasoning = ''; // 评估理由

    try {
      let evalData;

      // 如果evaluationResult已经是对象，直接使用
      if (typeof evaluationResult === 'object' && evaluationResult !== null) {
        evalData = evaluationResult;
      } else if (typeof evaluationResult === 'string' && evaluationResult.trim()) {
        // 如果是字符串且不为空，先清理markdown格式，再解析为JSON
        const cleanedResult = cleanMarkdownJson(evaluationResult);
        console.log('🔄 清理后的评估结果:', cleanedResult);
        evalData = JSON.parse(cleanedResult);
      } else {
        throw new Error(`evaluationResult格式不正确: ${typeof evaluationResult}, 值: ${evaluationResult}`);
      }

      if (evalData.rank !== undefined && evalData.rank !== null) {
        rating = parseInt(evalData.rank);
      } else {
      }

      if (evalData.message) {
        evaluation_msg = evalData.message;
      } else {
      }

      if (evalData.reason) {
        reasoning = evalData.reason;
      }

    } catch (parseError) {
      console.error('❌ 解析评估结果失败:', parseError);
      console.log('原始evaluationResult:', evaluationResult);
      console.log('原始evaluationResult类型:', typeof evaluationResult);
      console.log('原始evaluationResult长度:', String(evaluationResult).length);

      // 如果解析失败，尝试备用方案
      const stringResult = String(evaluationResult);

      // 尝试从字符串中提取JSON
      const jsonMatch = stringResult.match(/\{[^{}]*"rank"[^{}]*\}/);
      if (jsonMatch) {
        try {
          console.log('🔍 尝试从匹配的JSON片段中解析...');
          const partialData = JSON.parse(jsonMatch[0]);
          if (partialData.rank) rating = parseInt(partialData.rank);
          if (partialData.message) evaluation_msg = partialData.message;
          if (partialData.reason) reasoning = partialData.reason;
          console.log('✅ 备用方案成功提取数据');
        } catch (e) {
          console.log('❌ 备用JSON解析也失败');
        }
      }

      // 最后的备用方案：从字符串中提取数字
      if (rating === 7) { // 如果还是默认值
        const ratingMatch = stringResult.match(/(\d+)(?:\s*分|\/10|分)/);
        if (ratingMatch) {
          rating = parseInt(ratingMatch[1]);
          console.log('🔢 从字符串中提取到评分:', rating);
        }
      }

      if (evaluation_msg === '评估完成') { // 如果还是默认值
        evaluation_msg = stringResult.substring(0, 200) || '评估完成';
        console.log('📝 使用截断的评估消息');
    }
    }

    // 确保评分在有效范围内
    rating = Math.max(1, Math.min(10, rating));

    // 保存评估结果到数据库
    try {
      // 获取用户的conversation_id（如果存在的话）
      const conversationId = getConversationId(userId);
      
      console.log('💾 准备保存评估结果到数据库:');
      console.log('userId:', userId);
      console.log('scenarioId:', scenarioId);
      console.log('conversationId:', conversationId);
      console.log('rating:', rating);
      console.log('evaluation_msg:', evaluation_msg.substring(0, 50) + '...');
      
      const conversation = new Conversation({
        userId,
        scenarioId,
        conversationId: conversationId, // 添加conversationId字段
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp || new Date()
        })),
        rating: rating,
        evaluation_msg: evaluation_msg,
        reasoning: reasoning, // 新增：保存评估理由
        createdAt: new Date()
      });
      
      await conversation.save();
      console.log('✅ 评估结果已成功保存到数据库');
      console.log('保存的记录ID:', conversation._id);
    } catch (dbError) {
      console.error('❌ 保存评估结果失败:', dbError);
      // 继续返回评估结果，即使保存失败
    }

    return {
      success: true,
      rating: rating,
      evaluation_msg: evaluation_msg,
      reasoning: reasoning
    };
  } catch (error) {
    console.error('扣子评估对话失败:', error);
    
    return {
      success: false,
      error: error.message || '服务器内部错误'
    };
  }
}); 