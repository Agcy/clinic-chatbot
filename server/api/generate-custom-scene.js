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

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const { prompt } = body;

    if (!prompt) {
      return {
        success: false,
        error: '缺少必要的提示词参数'
      };
    }

    // 使用OpenAI客户端调用生成场景描述
    const completion = await openai.chat.completions.create({
      model: "qwen-plus",
      messages: [
        {
          role: 'system',
          content: `你是一个医疗场景设计专家，现在需要根据用户提供的要求，生成一个详细的医患对话场景描述。请生成一个完整的场景数据，包含以下字段：

1. scene_id: 自定义场景ID，以"custom_"开头，后跟字母和数字
2. scene_title: 场景标题，应当简洁明了
3. scene_description_model: 这段描述是写给AI模型的，告诉它如何扮演患者角色
4. scene_description_charactor: 这段描述是写给人类用户的，告诉他如何扮演医生角色
5. scene_type: 场景类型，如"医生对病人"
6. model_charactor: 固定为"患者"
7. trainee_character: 固定为"医生"

不要生成以下字段的值，它们将使用默认值：
- card_img: 应固定为"/assets/img.png"
- scene_url_3d: 应为null
- charactor_url_3d: 应为null

请使用以下格式返回JSON：
{
  "scene_id": "custom_xxxx",
  "scene_title": "场景标题",
  "scene_description_model": "患者角色描述...",
  "scene_description_charactor": "医生角色描述...",
  "scene_type": "医生对病人",
  "model_charactor": "患者",
  "trainee_character": "医生"
}

请注意：
- 描述应当符合医学专业性
- 请用粤语进行对话设定
- 医生和患者的角色要明确，互动要自然`
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
      // 尝试从字符串中提取JSON
      const jsonMatch = aiResponseContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        sceneData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('无法解析AI返回的JSON格式');
      }
    } catch (parseError) {
      console.error('解析AI响应失败:', parseError);
      console.log("aiResponseContent: "+aiResponseContent);
      
      return {
        success: false,
        error: '无法解析AI返回的场景描述'
      };
    }

    // 添加默认值
    const completeSceneData = {
      ...sceneData,
      card_img: "/assets/img.png",
      scene_url_3d: null,
      charactor_url_3d: null
    };

    // 确保数据库已连接
    if (!getConnectionStatus()) {
      console.log('MongoDB未连接，正在连接...');
      await connectDB();
    }

    try {
      // 将场景保存到数据库
      console.log('正在保存场景到MongoDB:', completeSceneData.scene_id);
      const scene = new Scene(completeSceneData);
      await scene.save();
      console.log('场景保存成功:', completeSceneData.scene_id);
    } catch (dbError) {
      console.error('保存场景到MongoDB失败:', dbError);
      // 如果是重复ID错误，生成一个新的ID
      if (dbError.code === 11000) {
        completeSceneData.scene_id = `custom_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        console.log('重新生成场景ID:', completeSceneData.scene_id);
        const scene = new Scene(completeSceneData);
        await scene.save();
        console.log('使用新ID保存场景成功');
      } else {
        throw dbError; // 其他错误重新抛出
      }
    }

    return {
      success: true,
      scene: completeSceneData
    };
  } catch (error) {
    console.error('生成自定义场景失败:', error);
    
    return {
      success: false,
      error: error.message || '服务器内部错误'
    };
  }
}); 