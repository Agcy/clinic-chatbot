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
    
    // 修复JSON中的单引号问题 - 将单引号替换为双引号（但要小心处理字符串内容中的单引号）
    // 这是一个简化的处理方式，针对常见的JSON格式问题
    cleaned = cleaned.replace(/'/g, '"');
    
    // 修复可能的双重引号问题
    cleaned = cleaned.replace(/"""/g, '"');
    cleaned = cleaned.replace(/""/g, '"');
    
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

/**
 * 强力解析JSON字符串，处理各种格式问题
 * @param {string} jsonStr - 需要解析的JSON字符串
 * @returns {object|null} 解析后的对象或null
 */
function forceParseJson(jsonStr) {
  if (!jsonStr || typeof jsonStr !== 'string') return null;
  
  // 尝试多种解析策略
  const strategies = [
    // 策略1：直接解析
    (str) => JSON.parse(str),
    
    // 策略2：清理markdown后解析
    (str) => JSON.parse(cleanMarkdownJson(str)),
    
    // 策略3：智能修复引号问题
    (str) => {
      let fixed = str.trim();
      
      // 移除markdown标记
      fixed = fixed.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      
      // 处理混合引号问题 - 这是关键修复
      // 先找到所有字符串值的位置，然后统一处理引号
      
      // 方法：逐字符处理，跟踪是否在字符串内部
      let result = '';
      let inString = false;
      let stringChar = null; // 记录字符串开始的引号类型
      let escapeNext = false;
      
      for (let i = 0; i < fixed.length; i++) {
        const char = fixed[i];
        const prevChar = i > 0 ? fixed[i - 1] : '';
        
        if (escapeNext) {
          result += char;
          escapeNext = false;
          continue;
        }
        
        if (char === '\\') {
          result += char;
          escapeNext = true;
          continue;
        }
        
        if (!inString) {
          // 不在字符串内部
          if (char === '"' || char === "'") {
            // 开始一个字符串
            inString = true;
            stringChar = char;
            result += '"'; // 统一使用双引号
          } else {
            result += char;
          }
        } else {
          // 在字符串内部
          if (char === stringChar) {
            // 字符串结束
            inString = false;
            stringChar = null;
            result += '"'; // 统一使用双引号
          } else if (char === '"' && stringChar === "'") {
            // 在单引号字符串内遇到双引号，需要转义
            result += '\\"';
          } else {
            result += char;
          }
        }
      }
      
      return JSON.parse(result);
    },
    
    // 策略4：使用正则表达式分段处理
    (str) => {
      let fixed = str.trim();
      
      // 移除markdown标记
      fixed = fixed.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      
      // 分段处理：先处理字段名，再处理字符串值
      // 确保字段名有双引号
      fixed = fixed.replace(/(\w+)\s*:/g, '"$1":');
      
      // 处理字符串值 - 更精确的正则表达式
      // 匹配 : 后面的字符串值（可能是单引号或双引号）
      fixed = fixed.replace(/:\s*'([^'\\]*(\\.[^'\\]*)*)'/g, ': "$1"');
      
      return JSON.parse(fixed);
    },
    
    // 策略5：手动构建对象（最后的备用方案）
    (str) => {
      // 尝试从字符串中提取关键信息
      const result = {};
      
      // 提取rank
      const rankMatch = str.match(/"rank":\s*(\d+)/);
      if (rankMatch) result.rank = parseInt(rankMatch[1]);
      
      // 提取message
      const messageMatch = str.match(/"message":\s*"([^"]+)"/);
      if (messageMatch) result.message = messageMatch[1];
      
      // 提取reason
      const reasonMatch = str.match(/"reason":\s*"([^"]+)"/);
      if (reasonMatch) result.reason = reasonMatch[1];
      
      // 尝试提取SBAR_scores（简化版本）
      const sbarMatch = str.match(/"SBAR_scores":\s*\{([\s\S]*)\}\s*\}/);
      if (sbarMatch) {
        try {
          // 简化的SBAR解析
          result.SBAR_scores = {};
          const dimensions = ['Situation', 'Background', 'Assessment', 'Recommendation'];
          
          dimensions.forEach(dim => {
            const dimPattern = new RegExp(`"${dim}":\\s*\\{([^}]+)\\}`, 'g');
            const dimMatch = dimPattern.exec(str);
            if (dimMatch) {
              const dimData = {};
              const rankMatch = dimMatch[1].match(/"rank":\s*(\d+)/);
              if (rankMatch) dimData.rank = parseInt(rankMatch[1]);
              
              const msgMatch = dimMatch[1].match(/"message":\s*"([^"]+)"/);
              if (msgMatch) dimData.message = msgMatch[1];
              
              const reasonMatch = dimMatch[1].match(/"reason":\s*"([^"]+)"/);
              if (reasonMatch) dimData.reason = reasonMatch[1];
              
              if (Object.keys(dimData).length > 0) {
                result.SBAR_scores[dim] = dimData;
              }
            }
          });
        } catch (e) {
          console.log('SBAR手动解析失败:', e.message);
        }
      }
      
      if (Object.keys(result).length === 0) {
        throw new Error('手动解析也无法提取任何数据');
      }
      
      return result;
    }
  ];
  
  for (let i = 0; i < strategies.length; i++) {
    try {
      const result = strategies[i](jsonStr);
      console.log(`✅ JSON解析策略 ${i + 1} 成功`);
      return result;
    } catch (error) {
      console.log(`❌ JSON解析策略 ${i + 1} 失败:`, error.message);
      continue;
    }
  }
  
  console.log('❌ 所有JSON解析策略都失败了');
  return null;
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

    // 解析扣子返回的新JSON格式: {rank:xx, message:xx, reason:xx, SBAR_scores:xx}
    let rating = 7; // 默认评分
    let evaluation_msg = '评估完成';
    let reasoning = ''; // 评估理由
    let sbar_scores = null; // SBAR各维度评分

    try {
      let evalData;

      // 如果evaluationResult已经是对象，直接使用
      if (typeof evaluationResult === 'object' && evaluationResult !== null) {
        evalData = evaluationResult;
      } else if (typeof evaluationResult === 'string' && evaluationResult.trim()) {
        // 使用强力解析函数
        console.log('🔧 使用强力JSON解析...');
        evalData = forceParseJson(evaluationResult);
        
        if (!evalData) {
          // 如果强力解析也失败，尝试清理后再解析
          const cleanedResult = cleanMarkdownJson(evaluationResult);
          console.log('🔄 清理后的评估结果:', cleanedResult.substring(0, 200) + '...');
          evalData = forceParseJson(cleanedResult);
        }
        
        if (!evalData) {
          throw new Error(`所有JSON解析方法都失败了`);
        }
      } else {
        throw new Error(`evaluationResult格式不正确: ${typeof evaluationResult}, 值: ${evaluationResult}`);
      }

      if (evalData.rank !== undefined && evalData.rank !== null) {
        rating = parseInt(evalData.rank);
      }

      if (evalData.message) {
        evaluation_msg = evalData.message;
      }

      if (evalData.reason) {
        reasoning = evalData.reason;
      }

      // 解析SBAR评分数据
      if (evalData.SBAR_scores) {
        sbar_scores = evalData.SBAR_scores;
        console.log('✅ 成功解析SBAR评分数据');
        console.log('🎯 SBAR维度:', Object.keys(sbar_scores));
      } else {
        console.log('⚠️ 未找到SBAR_scores字段');
      }

    } catch (parseError) {
      console.error('❌ 解析评估结果失败:', parseError);
      console.log('原始evaluationResult:', evaluationResult);
      console.log('原始evaluationResult类型:', typeof evaluationResult);
      console.log('原始evaluationResult长度:', String(evaluationResult).length);

      // 如果解析失败，尝试备用方案
      const stringResult = String(evaluationResult);

      // 尝试从字符串中提取完整的JSON（包含SBAR_scores）
      const fullJsonMatch = stringResult.match(/\{[\s\S]*"SBAR_scores"[\s\S]*\}/);
      if (fullJsonMatch) {
        try {
          console.log('🔍 尝试从匹配的完整JSON片段中解析...');
          // 清理匹配到的JSON字符串
          const cleanedJson = cleanMarkdownJson(fullJsonMatch[0]);
          console.log('🧹 清理后的JSON:', cleanedJson.substring(0, 200) + '...');
          
          const partialData = JSON.parse(cleanedJson);
          if (partialData.rank) rating = parseInt(partialData.rank);
          if (partialData.message) evaluation_msg = partialData.message;
          if (partialData.reason) reasoning = partialData.reason;
          if (partialData.SBAR_scores) sbar_scores = partialData.SBAR_scores;
          console.log('✅ 备用方案成功提取完整数据');
          console.log('🎯 提取到的SBAR数据:', JSON.stringify(sbar_scores, null, 2));
        } catch (e) {
          console.log('❌ 备用JSON解析也失败:', e.message);
          
          // 最后的备用方案：尝试手动提取SBAR数据
          try {
            console.log('🔧 尝试手动提取SBAR数据...');
            const sbarMatch = stringResult.match(/"SBAR_scores":\s*\{[\s\S]*?\}\s*\}/);
            if (sbarMatch) {
              const sbarJsonStr = '{' + sbarMatch[0] + '}';
              const cleanedSbarJson = cleanMarkdownJson(sbarJsonStr);
              const sbarData = JSON.parse(cleanedSbarJson);
              if (sbarData.SBAR_scores) {
                sbar_scores = sbarData.SBAR_scores;
                console.log('✅ 手动提取SBAR数据成功');
              }
            }
          } catch (manualError) {
            console.log('❌ 手动提取SBAR数据也失败:', manualError.message);
          }
          
          // 尝试简单的JSON匹配
          const simpleJsonMatch = stringResult.match(/\{[^{}]*"rank"[^{}]*\}/);
          if (simpleJsonMatch) {
            try {
              const simpleData = JSON.parse(simpleJsonMatch[0]);
              if (simpleData.rank) rating = parseInt(simpleData.rank);
              if (simpleData.message) evaluation_msg = simpleData.message;
              if (simpleData.reason) reasoning = simpleData.reason;
            } catch (e2) {
              console.log('❌ 简单JSON解析也失败');
            }
          }
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

    console.log('📊 最终评估结果汇总:');
    console.log('- 评分:', rating);
    console.log('- 评估消息长度:', evaluation_msg.length);
    console.log('- 评估理由长度:', reasoning.length);
    console.log('- SBAR数据:', sbar_scores ? '已获取' : '未获取');
    if (sbar_scores) {
      console.log('- SBAR维度数量:', Object.keys(sbar_scores).length);
      console.log('- SBAR维度:', Object.keys(sbar_scores));
    }

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
        sbar_scores: sbar_scores, // 新增：保存SBAR评分数据
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
      reasoning: reasoning,
      sbar_scores: sbar_scores
    };
  } catch (error) {
    console.error('扣子评估对话失败:', error);
    
    return {
      success: false,
      error: error.message || '服务器内部错误'
    };
  }
}); 