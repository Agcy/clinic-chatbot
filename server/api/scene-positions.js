/**
 * @fileoverview 3D场景位置配置API接口
 */

import { defineEventHandler, getMethod, getQuery, readBody, createError } from 'h3';
import { ScenePosition } from '../models/scenePosition.js';
import { connectDB } from '../utils/db.js';

export default defineEventHandler(async (event) => {
  const method = getMethod(event);
  
  // 连接数据库
  await connectDB();
  
  try {
    switch (method) {
      case 'GET':
        return await handleGet(event);
      case 'POST':
        return await handlePost(event);
      case 'PUT':
        return await handlePut(event);
      case 'DELETE':
        return await handleDelete(event);
      default:
        throw createError({
          statusCode: 405,
          statusMessage: 'Method Not Allowed'
        });
    }
  } catch (error) {
    console.error('场景位置配置API错误:', error);
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || '服务器内部错误'
    });
  }
});

/**
 * 处理GET请求 - 获取场景位置配置
 */
async function handleGet(event) {
  const query = getQuery(event);
  const { configId } = query;
  
  if (configId) {
    // 获取特定配置
    const config = await ScenePosition.findOne({ configId });
    if (!config) {
      return {
        success: false,
        error: '配置未找到'
      };
    }
    return {
      success: true,
      data: config
    };
  } else {
    // 获取所有配置
    const configs = await ScenePosition.find().sort({ createdAt: -1 });
    return {
      success: true,
      data: configs
    };
  }
}

/**
 * 处理POST请求 - 创建新的场景位置配置
 */
async function handlePost(event) {
  const body = await readBody(event);
  
  // 验证必需字段
  if (!body.configId || !body.name || !body.sceneModel?.url || !body.characterModel?.url) {
    throw createError({
      statusCode: 400,
      statusMessage: '缺少必需字段'
    });
  }
  
  // 检查configId是否已存在
  const existingConfig = await ScenePosition.findOne({ configId: body.configId });
  if (existingConfig) {
    throw createError({
      statusCode: 409,
      statusMessage: '配置ID已存在'
    });
  }
  
  const newConfig = new ScenePosition(body);
  await newConfig.save();
  
  return {
    success: true,
    message: '场景位置配置创建成功',
    data: newConfig
  };
}

/**
 * 处理PUT请求 - 更新场景位置配置
 */
async function handlePut(event) {
  const body = await readBody(event);
  const { configId } = body;
  
  if (!configId) {
    throw createError({
      statusCode: 400,
      statusMessage: '缺少配置ID'
    });
  }
  
  const updatedConfig = await ScenePosition.findOneAndUpdate(
    { configId },
    body,
    { new: true, runValidators: true }
  );
  
  if (!updatedConfig) {
    throw createError({
      statusCode: 404,
      statusMessage: '配置未找到'
    });
  }
  
  return {
    success: true,
    message: '场景位置配置更新成功',
    data: updatedConfig
  };
}

/**
 * 处理DELETE请求 - 删除场景位置配置
 */
async function handleDelete(event) {
  const query = getQuery(event);
  const { configId } = query;
  
  if (!configId) {
    throw createError({
      statusCode: 400,
      statusMessage: '缺少配置ID'
    });
  }
  
  const deletedConfig = await ScenePosition.findOneAndDelete({ configId });
  
  if (!deletedConfig) {
    throw createError({
      statusCode: 404,
      statusMessage: '配置未找到'
    });
  }
  
  return {
    success: true,
    message: '场景位置配置删除成功'
  };
} 