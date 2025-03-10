/**
 * @fileoverview 生成自定义场景描述API
 */

import { defineEventHandler, readBody } from 'h3';
import OpenAI from "openai";
import dotenv from 'dotenv';
import { Scene } from '../models/scene';
import { connectDB, getConnectionStatus } from '../utils/db';

dotenv.config();

// 创建OpenAI客户端实例
const openai = new OpenAI({
  apiKey: process.env.ALIYUN_BAILIAN_API_KEY,
  baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1'
});

// 生成唯一的场景ID
const generateUniqueSceneId = async () => {
  const timestamp = Date.now();
  const randomNum = Math.floor(Math.random() * 1000);
  const sceneId = `custom_${timestamp}_${randomNum}`;
  
  // 检查ID是否已存在
  const existingScene = await Scene.findOne({ scene_id: sceneId });
  if (existingScene) {
    // 如果已存在，递归调用重新生成
    return generateUniqueSceneId();
  }
  
  return sceneId;
};

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const { prompt, scene_type = "医生对病人" } = body;

    if (!prompt) {
      return {
        success: false,
        error: '缺少必要的提示词参数'
      };
    }

    // 确保数据库已连接
    if (!getConnectionStatus()) {
      console.log('MongoDB未连接，正在连接...');
      await connectDB();
    }

    // 根据场景类型设置角色
    let modelCharacter = "患者";
    let traineeCharacter = "医生";
    
    if (scene_type === "助理对医生") {
      modelCharacter = "医生";
      traineeCharacter = "助理";
    }

    // 使用OpenAI客户端调用生成场景描述
    const completion = await openai.chat.completions.create({
      model: "qwen-plus",
      messages: [
        {
          role: 'system',
          content: `你是一个医疗场景设计专家，现在需要根据用户提供的要求，生成一个详细的医患对话场景描述。请生成一个完整的场景数据，包含以下字段：

1. scene_title: 场景标题，应当简洁明了
2. scene_description_model: 这段描述是写给AI模型的，告诉它如何扮演${modelCharacter}角色
3. scene_description_charactor: 这段描述是写给人类用户的，告诉他如何扮演${traineeCharacter}角色
4. scene_type: 固定为"${scene_type}"

请使用以下格式返回JSON：
{
  "scene_title": "场景标题",
  "scene_description_model": "${modelCharacter}角色描述...",
  "scene_description_charactor": "${traineeCharacter}角色描述..."
}

请注意：
- 描述应当符合医学专业性
- 请用粤语进行对话设定
- ${modelCharacter}和${traineeCharacter}的角色要明确，互动要自然
- 场景描述应该包含足够的医学背景和情境细节`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    // 解析AI返回的结果
    const aiResponseContent = completion.choices[0].message.content;
    let sceneData;

    try {
      // 尝试解析JSON
      sceneData = JSON.parse(aiResponseContent);
    } catch (parseError) {
      console.error('解析AI响应失败:', parseError);
      console.log("aiResponseContent: " + aiResponseContent);
      
      return {
        success: false,
        error: '无法解析AI返回的场景描述'
      };
    }

    // 生成唯一的场景ID
    const uniqueSceneId = await generateUniqueSceneId();

    // 构建完整的场景数据
    const completeSceneData = {
      scene_id: uniqueSceneId,
      card_img: "/assets/img.png",
      ...sceneData,
      scene_type: scene_type,
      model_charactor: modelCharacter,
      trainee_character: traineeCharacter,
      scene_url_3d: null,
      charactor_url_3d: null
    };

    try {
      // 将场景保存到数据库
      console.log('正在保存场景到MongoDB:', completeSceneData.scene_id);
      const newScene = new Scene(completeSceneData);
      await newScene.save();
      console.log('场景保存成功:', completeSceneData);
      
      return {
        success: true,
        scene: completeSceneData
      };
    } catch (dbError) {
      console.error('保存场景到MongoDB失败:', dbError);
      return {
        success: false,
        error: '保存场景失败: ' + dbError.message
      };
    }
  } catch (error) {
    console.error('生成自定义场景失败:', error);
    
    return {
      success: false,
      error: error.message || '服务器内部错误'
    };
  }
}); 